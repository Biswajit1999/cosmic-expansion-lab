"""Inventory the pinned SN catalog for a future flow analysis; no velocity fit."""
from pathlib import Path
import hashlib
import json

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def main():
    path = ROOT / 'data' / 'Pantheon+SH0ES.dat'
    provenance = json.loads((ROOT / 'data' / 'provenance.json').read_text())
    expected = next(f['sha256'] for f in provenance['files'] if f['name'] == path.name)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected:
        raise ValueError('Catalog checksum does not match the pinned release')
    table = np.genfromtxt(path, names=True, dtype=None, encoding='utf-8')
    coords = (np.isfinite(table['RA']) & np.isfinite(table['DEC']) &
              (table['RA'] >= 0) & (table['RA'] < 360) & (abs(table['DEC']) <= 90))
    selected = coords & (table['zCMB'] > .005) & (table['zCMB'] < .05) & (table['IS_CALIBRATOR'] == 0)
    rows = table[selected]
    ids, counts = np.unique(rows['IDSURVEY'], return_counts=True)
    edges = [.005, .01, .02, .03, .05]
    radial_counts, _ = np.histogram(rows['zCMB'], bins=edges)
    # These are catalog corrections, not velocities measured independently here.
    delta_z = (1 + rows['zCMB']) / (1 + rows['zHD']) - 1
    equivalent = 299792.458 * delta_z
    audit = {
        'status': 'input inventory only; no Great Attractor or CMB inference',
        'input_commit': provenance['commit'], 'input_sha256': digest,
        'selection': 'valid RA/DEC AND 0.005 < zCMB < 0.05 AND IS_CALIBRATOR == 0',
        'selection_purpose': 'exploratory inventory, not a preregistered science sample',
        'total_light_curve_rows': int(len(table)),
        'valid_coordinate_rows': int(coords.sum()),
        'selected_light_curve_rows': int(len(rows)),
        'selected_distinct_literal_CID': int(len(np.unique(rows['CID']))),
        'selected_survey_ids': {str(int(i)): int(n) for i, n in zip(ids, counts)},
        'redshift_bin_edges': edges, 'redshift_bin_rows': radial_counts.tolist(),
        'catalog_applied_source_correction': {
            'definition': 'c * ((1+zCMB)/(1+zHD)-1); first-order velocity equivalent, km/s',
            'absolute_percentiles_16_50_84': np.percentile(abs(equivalent), [16, 50, 84]).tolist(),
            'interpretation': 'Describes an existing model-based correction, not a new flow measurement.'
        },
        'limitations': [
            'Repeated light curves, host/group overlaps and shared calibrations are not independent.',
            'Literal CID labels do not resolve physical supernova or host identity.',
            'zCMB is observer-motion corrected; zHD also includes source-flow corrections.',
            'The sky footprint is not a measured completeness or selection function.',
            'No Cosmicflows distances, density reconstruction or Planck FITS maps are analyzed here.'
        ]
    }
    out = ROOT / 'results'
    out.mkdir(exist_ok=True)
    (out / 'flow-input-audit.json').write_text(json.dumps(audit, indent=2) + '\n', encoding='utf-8')

    plt.rcParams.update({'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False})
    fig = plt.figure(figsize=(12, 8), facecolor='white')
    grid = fig.add_gridspec(2, 2, height_ratios=[2.3, 1], hspace=.52, wspace=.3)
    ax = fig.add_subplot(grid[0, :], projection='mollweide')
    # Equatorial longitude: central meridian RA=180 deg, RA increases leftward.
    longitude = np.deg2rad(180 - rows['RA'])
    points = ax.scatter(longitude, np.deg2rad(rows['DEC']), c=rows['zCMB'],
                        cmap='viridis', s=13, alpha=.75, linewidths=0)
    ticks = np.arange(-150, 180, 30)
    ax.set_xticks(np.deg2rad(ticks))
    ax.set_xticklabels([f'{(180-t)%360}\N{DEGREE SIGN}' for t in ticks])
    ax.grid(alpha=.25)
    ax.set_title('Where the nearby supernova records actually sample the sky', pad=18)
    ax.set_xlabel('Right ascension (equatorial coordinates; increases leftward)')
    ax.set_ylabel('Declination')
    fig.colorbar(points, ax=ax, shrink=.7, pad=.04, label='Catalog zCMB')

    axz = fig.add_subplot(grid[1, 0])
    axz.hist(rows['zCMB'], bins=edges, color='#236e83', edgecolor='white')
    axz.set(xlabel='Catalog zCMB', ylabel='Light-curve records', title='Radial sampling (not distances)')
    axs = fig.add_subplot(grid[1, 1])
    axs.bar([str(int(i)) for i in ids], counts, color='#566279')
    axs.set(xlabel='Catalog survey ID', ylabel='Light-curve records', title='Survey composition')
    axs.tick_params(axis='x', labelsize=8)
    fig.suptitle(f'Flow-data readiness audit | {len(rows)} records, {len(np.unique(rows["CID"]))} literal CID labels',
                 fontsize=15, y=.99)
    fig.text(.5, .015, '0.005 < zCMB < 0.05; non-calibrators. Repeated records overlap. '
             'This is a sampling map, not a CMB or velocity map.', ha='center', fontsize=9)
    fig.subplots_adjust(top=.89, bottom=.11)
    for extension in ['png', 'pdf']:
        fig.savefig(out / f'flow-input-footprint.{extension}', dpi=180)
    plt.close(fig)
    print(json.dumps(audit, indent=2))


if __name__ == '__main__':
    main()
