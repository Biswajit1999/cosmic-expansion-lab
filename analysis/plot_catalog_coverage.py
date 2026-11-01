"""Standalone research figure from real catalog counts, not a website screenshot."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LogNorm

ROOT=Path(__file__).resolve().parents[1]
desi=json.loads((ROOT/'web/data/catalogs/desi-bins.json').read_text())['rows']
cf4=np.array(json.loads((ROOT/'web/data/catalogs/cf4.json').read_text())['rows'])
first=np.zeros((36,72))
for a,b,z,n in desi:
    if z==0:first[b,a]+=n
d=10**((cf4[:,8]-25)/5)
local=cf4[(d>=40)&(d<=100)]
second,_,_=np.histogram2d(local[:,6],local[:,5],bins=[np.linspace(-90,90,37),np.linspace(0,360,73)])
fig,axes=plt.subplots(2,1,figsize=(12,8.5),layout='constrained')
for ax,counts,title in zip(axes,[first,second],[f'DESI DR1: 0 < z < 0.05 | {int(first.sum()):,} selected primary galaxy spectra',f'Cosmicflows-4: 40–100 Mpc | {len(local):,} individual distance records']):
    im=ax.pcolormesh(np.linspace(0,360,73),np.linspace(-90,90,37),np.ma.masked_equal(counts,0),cmap='viridis',norm=LogNorm(vmin=1,vmax=max(2,counts.max())),shading='flat')
    ax.set(xlim=(360,0),ylim=(-90,90),xlabel='Galactic longitude l (degrees)',ylabel='Galactic latitude b (degrees)',title=title)
    ax.set_xticks(np.arange(0,361,60));ax.set_yticks(np.arange(-90,91,30));ax.grid(alpha=.2)
    for b in [-10,10]:ax.axhline(b,color='gray',ls='--',lw=.8)
    ax.plot(325,-7,marker='+',color='red',ms=10,mew=1.5);ax.annotate('Norma reference',(325,-7),xytext=(275,-35),arrowprops={'arrowstyle':'-','color':'red'},color='darkred',fontsize=9,bbox={'facecolor':'white','edgecolor':'none','alpha':.9,'pad':3})
    fig.colorbar(im,ax=ax,label='Count per 5° × 5° cell (log scale)')
fig.suptitle('Redshift coverage is not independent-distance coverage',fontsize=17)
fig.supxlabel('Snapshot 2026-10-31 · DESI / NOIRLab; Tully et al. (2023)\nSeparate count scales; survey selection and unequal cell areas apply. Blank ≠ empty space. No flow fit.',fontsize=10)
fig.savefig(ROOT/'results/catalog-coverage.png',dpi=180)
fig.savefig(ROOT/'results/catalog-coverage.pdf')
print('Saved catalog-coverage.png and .pdf; DESI low-z count:',int(first.sum()),'; CF4 distance-shell count:',len(local))
