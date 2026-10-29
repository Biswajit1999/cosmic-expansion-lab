"""Profile likelihood, sample-cut robustness, SN-only shape and constant-w fits.

Run after fit.py. Every fit uses the matching FULL STAT+SYS submatrix.
"""
import json
import shutil
from pathlib import Path
import numpy as np
from scipy.linalg import cholesky, solve_triangular
from scipy.optimize import least_squares, minimize_scalar
from cosmology import distance_modulus, age_at_scale
from fit import load

ROOT = Path(__file__).resolve().parents[1]


def selected(data, covariance, zmin=.01, calibrate=True):
    cal = data['IS_CALIBRATOR'].astype(bool)
    mask = (cal | (data['zHD'] > zmin)) if calibrate else (~cal & (data['zHD'] > zmin))
    rows = data[mask]
    lower = cholesky(covariance[np.ix_(mask,mask)], lower=True)
    return rows, lambda x: solve_triangular(lower, x, lower=True, check_finite=False)


def fit_variant(data, covariance, zmin=.01, free_w=False):
    rows, whiten = selected(data,covariance,zmin)
    cal = rows['IS_CALIBRATOR'].astype(bool)
    def residual(p):
        h0, absolute, om = p[:3]
        w = p[3] if free_w else -1
        model = distance_modulus(rows['zHD'],h0,om,rows['zHEL'],w)
        model[cal] = rows['CEPH_DIST'][cal]
        return whiten(rows['m_b_corr']-absolute-model)
    start=[73.5,-19.24,.33]+([-1.] if free_w else [])
    bounds=([40,-21,.05]+([-2.5] if free_w else []),[100,-17,.95]+([-.3] if free_w else []))
    fit=least_squares(residual,start,bounds=bounds,ftol=1e-11,xtol=1e-11,gtol=1e-9)
    if not fit.success: raise RuntimeError(fit.message)
    errors=np.sqrt(np.diag(np.linalg.inv(fit.jac.T@fit.jac)))
    result=dict(zmin=zmin,rows=len(rows),h0=float(fit.x[0]),h0_error=float(errors[0]),
                absolute_magnitude=float(fit.x[1]),omega_m=float(fit.x[2]),omega_m_error=float(errors[2]),
                w=float(fit.x[3]) if free_w else -1.,w_error=float(errors[3]) if free_w else None,
                chi2=float(fit.fun@fit.fun),dof=len(rows)-len(start),parameters=len(start),
                at_bound=bool(np.any(fit.active_mask)))
    result['aic']=result['chi2']+2*len(start)
    return result


def sn_only(data,covariance):
    rows,whiten=selected(data,covariance,calibrate=False)
    one=whiten(np.ones(len(rows)))
    def projected(om):
        residual=whiten(rows['m_b_corr']-distance_modulus(rows['zHD'],70,om,rows['zHEL']))
        offset=(one@residual)/(one@one)
        return residual-offset*one,offset
    fit=minimize_scalar(lambda om:np.sum(projected(om)[0]**2),bounds=(.05,.95),method='bounded',options={'xatol':1e-10})
    if not fit.success: raise RuntimeError(fit.message)
    derivative=(projected(fit.x+1e-5)[0]-projected(fit.x-1e-5)[0])/2e-5
    return dict(omega_m=float(fit.x),omega_m_error=float(1/np.linalg.norm(derivative)),
                chi2=float(fit.fun),rows=len(rows),dof=len(rows)-2,
                nuisance_offset_at_h0_70=float(projected(fit.x)[1]),h0=None,
                explanation='H0 is unidentifiable without an absolute calibration. H0=70 is a gauge for the nuisance offset, not a measurement.')


def profile_grid(data,covariance,baseline):
    rows,whiten=selected(data,covariance)
    cal=rows['IS_CALIBRATOR'].astype(bool)
    one=whiten(np.ones(len(rows)))
    flow=whiten((~cal).astype(float))
    hgrid=np.linspace(69,78,65); omgrid=np.linspace(.25,.42,57)
    chi=np.empty((len(omgrid),len(hgrid)))
    for i,om in enumerate(omgrid):
        base=distance_modulus(rows['zHD'],70,om,rows['zHEL'])
        base[cal]=rows['CEPH_DIST'][cal]
        y=whiten(rows['m_b_corr']-base)
        for j,h0 in enumerate(hgrid):
            r=y+5*np.log10(h0/70)*flow
            r-=one*((one@r)/(one@one))  # profile absolute magnitude analytically
            chi[i,j]=r@r
    delta=chi-baseline['chi2']
    if delta.min() < -1e-4: raise ValueError('Grid beats baseline minimum unexpectedly')
    return dict(h0=hgrid.tolist(),omega_m=omgrid.tolist(),delta_chi2=delta.tolist(),
                thresholds=[2.30,6.18],meaning='Joint 68.3% and 95.4% approximate confidence contours for two parameters using Wilks thresholds; M_B profiled, not marginalized.')


def figures(report):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.rcParams.update({'font.size':11,'axes.spines.top':False,'axes.spines.right':False,
                         'figure.facecolor':'#f3f2ec','axes.facecolor':'#f3f2ec','axes.labelcolor':'#243336'})
    dest=ROOT/'web/assets';dest.mkdir(exist_ok=True)
    def save(fig,name):
        fig.tight_layout()
        fig.savefig(dest/f'{name}.svg',bbox_inches='tight')
        fig.savefig(ROOT/f'results/{name}.png',dpi=180,bbox_inches='tight')
        fig.savefig(ROOT/f'results/{name}.pdf',bbox_inches='tight')
        plt.close(fig)
    grid=report['profile']; base=report['baseline']
    fig,ax=plt.subplots(figsize=(8,5))
    contours=ax.contour(grid['h0'],grid['omega_m'],grid['delta_chi2'],levels=[2.30,6.18],colors=['#247b77','#aa492f'],linewidths=2)
    ax.clabel(contours,fmt={2.30:'68.3%',6.18:'95.4%'},fontsize=10)
    ax.plot(base['h0'],base['omega_m'],'+',color='#182e35',ms=12,mew=2)
    ax.set(xlabel='H₀ (km s⁻¹ Mpc⁻¹)',ylabel='Matter density fraction Ωₘ',title='Which parameter combinations fit?')
    ax.text(.02,.02,'Full covariance · M_B profiled · two-parameter confidence regions',transform=ax.transAxes,fontsize=8)
    save(fig,'likelihood-contours')
    fig,ax=plt.subplots(figsize=(8,4.5)); variants=report['sensitivity']
    ax.axvspan(base['h0']-base['h0_error'],base['h0']+base['h0_error'],color='#247b77',alpha=.1)
    ax.axvline(base['h0'],color='#247b77',lw=1)
    for i,r in enumerate(variants):ax.errorbar(r['h0'],i,xerr=r['h0_error'],fmt='o',color='#aa492f',capsize=5)
    ax.set(yticks=range(len(variants)),yticklabels=[f"zHD > {r['zmin']:.3f} + calibrators\n{r['rows']} light curves" for r in variants],xlabel='H₀ (km s⁻¹ Mpc⁻¹)',title='Does removing nearby supernovae change the fit?')
    ax.invert_yaxis();save(fig,'redshift-sensitivity')
    fig,(a,b)=plt.subplots(1,2,figsize=(10,4.5)); scale=np.linspace(.05,2,300)
    for om,label,color in [(.315,'Matter + Λ','#247b77'),(1.,'Matter only','#aa492f')]:
        a.plot(age_at_scale(scale,67.4,om),scale,label=label,color=color,lw=2)
        b.plot(scale,67.4*np.sqrt(om/scale**3+1-om),label=label,color=color,lw=2)
    a.set(xlabel='Cosmic time (Gyr)',ylabel='Scale factor a',xlim=(0,30),ylim=(0,2),title='Accelerating scale factor')
    b.set(xlabel='Scale factor a',ylabel='H(a) (km s⁻¹ Mpc⁻¹)',xlim=(.25,2),ylim=(0,300),title='Yet H(a) decreases')
    a.axhline(1,color='#7b8980',ls=':',lw=1);a.legend(fontsize=9);b.legend(fontsize=9);save(fig,'expansion-history')
    fig,ax=plt.subplots(figsize=(8,4.5));z=np.geomspace(.01,2.3,250)
    ref=distance_modulus(z,base['h0'],base['omega_m'])
    for om,w,label,color in [(1,-1,'Matter only, same H₀','#aa492f'),(base['omega_m'],-1,'Best-fit ΛCDM','#247b77'),(report['wcdm']['omega_m'],report['wcdm']['w'],'Best-fit constant-w','#735d91')]:
        h0=report['wcdm']['h0'] if label=='Best-fit constant-w' else base['h0']
        ax.plot(z,distance_modulus(z,h0,om,w=w)-ref,label=label,color=color,lw=2)
    ax.set(xscale='log',xlabel='Redshift z (zHEL = zHD)',ylabel='Δ distance modulus relative to ΛCDM (mag)',title='Expansion histories leave different brightness patterns')
    ax.legend(fontsize=9);save(fig,'model-comparison')
    shutil.copy2(ROOT/'results/hubble-diagram.png',dest/'hubble-diagram.png')


def main():
    data,covariance=load()
    baseline=fit_variant(data,covariance)
    report=dict(baseline=baseline,sensitivity=[baseline],sn_only=sn_only(data,covariance))
    for cut in [.023,.05]:report['sensitivity'].append(fit_variant(data,covariance,zmin=cut))
    report['wcdm']=fit_variant(data,covariance,free_w=True)
    report['wcdm']['delta_aic_vs_lcdm']=report['wcdm']['aic']-baseline['aic']
    report['profile']=profile_grid(data,covariance,baseline)
    report['cautions']=['Sensitivity fits overlap and are correlated; do not average them.',
        'AIC is compared only for models fit to the same rows; it is not a detection significance.',
        'Constant-w uncertainties are local Gaussian approximations, not posterior intervals.',
        'The downloadable figures are computed from this pinned release, not copied from published papers.']
    (ROOT/'web/data/research.json').write_text(json.dumps(report,indent=2)+'\n')
    figures(report)
    print(json.dumps({k:v for k,v in report.items() if k!='profile'},indent=2))


if __name__=='__main__':main()
