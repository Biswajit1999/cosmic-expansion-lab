"""Full-covariance SN + compressed Cepheid-distance fits and browser export."""
from pathlib import Path
import json
import csv
import numpy as np
from scipy.linalg import cholesky, solve_triangular
from scipy.optimize import least_squares
from cosmology import distance_modulus, age_at_scale
from download_data import main as download

ROOT = Path(__file__).resolve().parents[1]


def load():
    download()
    data = np.genfromtxt(ROOT / 'data/Pantheon+SH0ES.dat', names=True, dtype=None, encoding='utf8')
    flat = np.loadtxt(ROOT / 'data/Pantheon+SH0ES_STAT+SYS.cov')
    n = int(flat[0])
    assert n == len(data) and len(flat) == n*n + 1
    covariance = flat[1:].reshape(n, n)
    # Upstream decimal serialization differs by at most 3e-8 across triangles.
    assert np.max(np.abs(covariance-covariance.T)) < 1e-7
    covariance = (covariance + covariance.T) / 2
    return data, covariance


def fit(data, covariance, local=False):
    calibrators = data['IS_CALIBRATOR'].astype(bool)
    mask = calibrators | (data['USED_IN_SH0ES_HF'].astype(bool) if local else data['zHD'] > 0.01)
    sample = data[mask]
    is_cal = sample['IS_CALIBRATOR'].astype(bool)
    lower = cholesky(covariance[np.ix_(mask, mask)], lower=True)

    def residual(params):
        h0, absolute = params[:2]
        omega = 0.3 if local else params[2]
        mu = distance_modulus(sample['zHD'], h0, omega, sample['zHEL'])
        mu[is_cal] = sample['CEPH_DIST'][is_cal]
        return solve_triangular(lower, sample['m_b_corr'] - absolute - mu, lower=True, check_finite=False)

    start = [73., -19.25] if local else [73., -19.25, 0.33]
    bounds = ([40, -21], [100, -17]) if local else ([40, -21, 0.05], [100, -17, 0.95])
    result = least_squares(residual, start, bounds=bounds, xtol=1e-11, ftol=1e-11, gtol=1e-9)
    if not result.success:
        raise RuntimeError(result.message)
    parameter_cov = np.linalg.inv(result.jac.T @ result.jac)
    errors = np.sqrt(np.diag(parameter_cov))
    return dict(h0=float(result.x[0]), h0_error=float(errors[0]), absolute_magnitude=float(result.x[1]),
                absolute_magnitude_error=float(errors[1]), omega_m=0.3 if local else float(result.x[2]),
                omega_m_error=None if local else float(errors[2]), chi2=float(result.fun @ result.fun),
                dof=int(len(sample)-len(result.x)), rows=len(sample), unique_sne=len(set(sample['CID'])),
                calibrator_rows=int(sum(is_cal)), parameter_covariance=parameter_cov.tolist(),
                selection='IS_CALIBRATOR or USED_IN_SH0ES_HF' if local else 'IS_CALIBRATOR or zHD > 0.01',
                uncertainty='Local Gaussian curvature, full supplied STAT+SYS covariance; no reduced-chi-square rescaling')


def main():
    data, covariance = load()
    full = fit(data, covariance)
    local = fit(data, covariance, local=True)
    results = dict(full=full, local=local, total_rows=len(data), unique_sne=len(set(data['CID'])),
                   age_gyr=float(age_at_scale(1, full['h0'], full['omega_m'])),
                   model='Flat LambdaCDM; negligible radiation; compressed Cepheid-host calibration',
                   caveat='This is a fit to released SN and Cepheid-host products, not a refit of raw Cepheid photometry or the complete SH0ES likelihood.',
                   references=[dict(label='SH0ES 2022 (published)', h0=73.04, error=1.04, url='https://arxiv.org/abs/2112.04510'),
                               dict(label='Planck 2018 flat LambdaCDM (published)', h0=67.4, error=0.5, url='https://arxiv.org/abs/1807.06209')])
    out = ROOT / 'web/data'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    rows = []
    for i, row in enumerate(data):
        rows.append(dict(index=i, cid=str(row['CID']), survey=int(row['IDSURVEY']), z=float(row['zHD']), zhel=float(row['zHEL']),
                         mb=float(row['m_b_corr']), mu=float(row['m_b_corr']-full['absolute_magnitude']),
                         sigma=float(np.sqrt(covariance[i,i])), calibrator=bool(row['IS_CALIBRATOR']),
                         cepheid_mu=float(row['CEPH_DIST']) if row['IS_CALIBRATOR'] else None,
                         hubble_flow=bool(row['USED_IN_SH0ES_HF'])))
    (out / 'supernovae.json').write_text(json.dumps(rows, separators=(',', ':')) + '\n')
    with (out / 'supernovae.csv').open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps(results, indent=2))
    # Standalone scientific figure for export, independent of the browser UI.
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    mask = (data['zHD'] > 0.01) & ~data['IS_CALIBRATOR'].astype(bool)
    z = data['zHD'][mask]
    mu = data['m_b_corr'][mask] - full['absolute_magnitude']
    model = distance_modulus(z, full['h0'], full['omega_m'], data['zHEL'][mask])
    fig, axes = plt.subplots(2, 1, figsize=(9, 7), sharex=True, gridspec_kw={'height_ratios':[3,1]})
    axes[0].errorbar(z, mu, yerr=np.sqrt(np.diag(covariance))[mask], fmt='.', ms=2, alpha=.3, color='#22787b', lw=.4)
    grid = np.geomspace(.01, 2.4, 300)
    axes[0].plot(grid, distance_modulus(grid, full['h0'], full['omega_m']), color='#b65336', label='Best-fit flat LambdaCDM (zHEL = zHD curve)')
    axes[0].set(ylabel='Calibrated distance modulus (mag)', title='Pantheon+ / SH0ES: full-covariance fit')
    axes[0].legend(fontsize=8)
    axes[1].scatter(z, mu-model, s=3, alpha=.4, color='#22787b')
    axes[1].axhline(0, color='#b65336')
    axes[1].set(xlabel='Flow-corrected redshift zHD', ylabel='Residual (mag)', xscale='log')
    fig.tight_layout()
    (ROOT / 'results').mkdir(exist_ok=True)
    fig.savefig(ROOT / 'results/hubble-diagram.png', dpi=180)
    fig.savefig(ROOT / 'results/hubble-diagram.pdf')


if __name__ == '__main__':
    main()
