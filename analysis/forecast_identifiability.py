"""Conditional Fisher forecast on the published CF4 distance footprint.

Uses positions and quoted marginal errors, never the measured velocity residuals.
The toy local template is not a fitted matter-density reconstruction.
"""
import json
import hashlib
import shutil
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
H0 = 70.0  # km/s/Mpc: conditional design choice, not an estimate
SIGMA_V = 250.0  # km/s: assumed independent small-scale scatter
NORM_L, NORM_B = 325.0, -7.0  # reference direction in Galactic coordinates
CENTERS = (50.0, 60.0, 70.0, 80.0, 90.0)
WIDTHS = (20.0, 30.0, 40.0)
K = 5.0 / np.log(10.0)


def shell_rows(records):
    """Conditional footprint: observed modulus distances in [40,100] Mpc."""
    a = np.asarray(records, dtype=float)
    d = 10 ** ((a[:, 8] - 25.0) / 5.0)
    good = (d >= 40) & (d <= 100) & (a[:, 9] > 0)
    return a[good]


def group_representatives(rows):
    """One lowest quoted-error row per published group-reference PGC.

    This avoids pretending members are independent. It does not resolve
    correlations between different groups or between distance methods.
    """
    ordered = np.lexsort((rows[:, 0], rows[:, 9], rows[:, 1]))
    sorted_rows = rows[ordered]
    _, first = np.unique(sorted_rows[:, 1], return_index=True)
    return sorted_rows[np.sort(first)]


def geometry(rows):
    lon, lat = np.deg2rad(rows[:, 5]), np.deg2rad(rows[:, 6])
    n = np.column_stack((np.cos(lat) * np.cos(lon),
                         np.cos(lat) * np.sin(lon), np.sin(lat)))
    d = 10 ** ((rows[:, 8] - 25.0) / 5.0)
    l0, b0 = np.deg2rad((NORM_L, NORM_B))
    direction = np.array((np.cos(b0) * np.cos(l0),
                          np.cos(b0) * np.sin(l0), np.sin(b0)))
    return n, d, direction


def local_template(n, d, direction, center=70.0, width=30.0):
    """Radial projection of a prescribed 3D Gaussian-gradient inward flow.

    A=1 km/s is the axial peak response at one width from the centre.
    The response changes sign across the centre on the exact axis.
    """
    cos_angle = n @ direction
    separation2 = d*d + center*center - 2*d*center*cos_angle
    return -(d-center*cos_angle)/width * np.exp(.5-separation2/(2*width*width))


def design(rows, center=70.0, width=30.0, sigma_v=SIGMA_V):
    n, d, direction = geometry(rows)
    factor = -K/(H0*d)  # first-order derivative of modulus wrt radial km/s
    local = local_template(n, d, direction, center, width)
    nx, ny, nz = n.T
    # Five independent symmetric trace-free shear columns, each per 100 Mpc.
    shear = (d/100.0)[:, None] * np.column_stack((
        nx*nx-nz*nz, ny*ny-nz*nz, 2*nx*ny, 2*nx*nz, 2*ny*nz))
    nuisance = np.column_stack((n, shear)) * factor[:, None]
    nuisance = np.column_stack((nuisance, np.ones(len(d))))
    sigma = np.hypot(rows[:, 9], abs(factor)*sigma_v)
    return local*factor, nuisance, sigma


def forecast(rows, center=70.0, width=30.0, nuisance='bulk_shear_scale', sigma_v=SIGMA_V):
    target, other, sigma = design(rows, center, width, sigma_v)
    if nuisance == 'none':
        other = other[:, :0]
    elif nuisance == 'bulk_scale':
        other = other[:, [0, 1, 2, 8]]
    elif nuisance != 'bulk_shear_scale':
        raise ValueError('Unknown nuisance model')
    a = target/sigma
    raw_information = float(a @ a)
    if other.shape[1]:
        z = other/sigma[:, None]
        if np.linalg.matrix_rank(z) != z.shape[1]:
            raise ValueError('Nuisance design is rank deficient')
        residual = a-z @ np.linalg.lstsq(z, a, rcond=None)[0]
    else:
        residual = a
    information = float(residual @ residual)
    if information <= 1e-12:
        raise ValueError('Local template is not identifiable on this footprint')
    return {'sigma_amplitude_kms': 1/np.sqrt(information),
            'retained_information_fraction': information/raw_information,
            'raw_information_inverse_kms2': raw_information,
            'marginal_information_inverse_kms2': information}


def produce():
    source_path = ROOT/'web/data/catalogs/cf4.json'
    source = json.loads(source_path.read_text())
    rows = shell_rows(source['rows'])
    grouped = group_representatives(rows)
    n, d, direction = geometry(grouped)
    cone = n @ direction >= np.cos(np.deg2rad(20))
    cases = {}
    for label, sample in [('group_representatives', grouped), ('all_records_naive', rows)]:
        cases[label] = {
            name: forecast(sample, nuisance=name)
            for name in ('none', 'bulk_scale', 'bulk_shear_scale')}
    grid = []
    for width in WIDTHS:
        for center in CENTERS:
            grid.append({'center_mpc': center, 'width_mpc': width,
                         **forecast(grouped, center, width)})
    method_mask = grouped[:, 10].astype(int)
    method_samples = [('exclude_FP_present', grouped[(method_mask & 4) == 0]),
                      ('exclude_TF_present', grouped[(method_mask & 2) == 0]),
                      ('SN_Ia_present_only', grouped[(method_mask & 1) != 0])]
    result = {
        'status': 'Conditional footprint forecast only; no observed flow amplitude fitted',
        'source': 'Cosmicflows-4 individual-galaxy Table 2; same pinned release as catalogs.html',
        'source_snapshot': '2026-10-31',
        'source_normalized_cf4_sha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
        'selection': '40 <= 10**((mu-25)/5) <= 100 Mpc; one smallest-sigma_mu galaxy per group-reference PGC for primary forecast',
        'counts': {'shell_records': len(rows), 'group_representatives': len(grouped),
                   'representatives_in_20deg_cone': int(cone.sum()),
                   'cone_near_40_70_mpc': int((cone & (d < 70)).sum()),
                   'cone_far_70_100_mpc': int((cone & (d >= 70)).sum())},
        'assumptions': {'H0_kms_mpc': H0, 'sigma_v_kms': SIGMA_V,
                        'norma_direction_galactic_deg': [NORM_L, NORM_B],
                        'fiducial_center_mpc': 70, 'fiducial_width_mpc': 30,
                        'local_template': '3D Gaussian-gradient inward flow, projected radially; amplitude is axial peak speed at one width',
                        'nuisance': '3-component constant bulk velocity; 5-component symmetric trace-free shear per 100 Mpc; unrestricted global distance-modulus offset',
                        'modulus_linearization': 'dmu/dv = -(5/ln10)/(H0*D) at fixed CMB-frame systemic velocity; first-order low-z approximation',
                        'noise': 'quoted marginal sigma_mu in quadrature with 250 km/s dispersion transformed to modulus; rows treated independent after one-per-group thinning'},
        'fiducial_cases': cases, 'geometry_sensitivity': grid,
        'scatter_sensitivity': [
            {'sigma_v_kms': value, **forecast(grouped, sigma_v=value)}
            for value in (150.0, 250.0, 400.0)],
        'method_coverage_sensitivity': [
            {'selection': label, 'representatives': len(sample), **forecast(sample)}
            for label, sample in method_samples],
        'limitations': [
            'No measured peculiar velocities, attractor amplitude, mass, density template or statistical significance have been inferred.',
            'The Gaussian-gradient local template is an illustrative spatial hypothesis, not a reconstruction of the Great Attractor.',
            'The one-row-per-group rule discards information and still ignores inter-group calibration and spatial covariance; reported errors are conditional and may be optimistic.',
            'Selecting the shell using observed moduli is unsuitable as a final likelihood selection without a survey selection model.',
            'Absolute calibration, method-specific shifts, redshift uncertainty, nonlinear flow and template uncertainty are not propagated.',
            'Method-presence cuts are footprint stress tests; the quoted combined moduli are not independent method-specific distances.',
            'The all-records-naive case deliberately shows the effect of treating group members as independent; it is not an acceptable inference.'
        ]}
    target = ROOT/'web/data/identifiability-forecast.json'
    target.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')

    fig, ax = plt.subplots(figsize=(10, 6))
    fig.subplots_adjust(left=.12, right=.98, top=.89, bottom=.25)
    colors = ('#1a6a67', '#b34d35', '#444e81')
    for color, width in zip(colors, WIDTHS):
        points = [v for v in grid if v['width_mpc'] == width]
        ax.plot([p['center_mpc'] for p in points],
                [p['sigma_amplitude_kms'] for p in points],
                marker='o', lw=2.5, color=color, label=f'Width {int(width)} Mpc')
    ax.set(xlabel='Assumed centre distance along Norma direction (Mpc)',
           ylabel='Conditional 1σ error on local-template amplitude (km/s)',
           title='Can this distance footprint distinguish a local flow?')
    ax.grid(alpha=.22); ax.legend(frameon=False)
    fig.text(.12, .045,
             f'CF4 40–100 Mpc · {len(grouped):,} one-per-group representatives · bulk + shear + scale marginalized\n'
             'Illustrative template and independent-error assumption. No flow fit or detection.',
             ha='left', va='bottom', fontsize=9)
    for extension in ('png', 'pdf'):
        output = ROOT/f'results/identifiability-forecast.{extension}'
        fig.savefig(output, dpi=180)
        shutil.copyfile(output, ROOT/f'web/assets/identifiability-forecast.{extension}')
    plt.close(fig)
    print(f'Wrote forecast for {len(rows):,} CF4 records and {len(grouped):,} group representatives')
    print('Fiducial conditional sigma_A (grouped/full nuisance):',
          round(cases['group_representatives']['bulk_shear_scale']['sigma_amplitude_kms'], 2), 'km/s')


if __name__ == '__main__':
    produce()
