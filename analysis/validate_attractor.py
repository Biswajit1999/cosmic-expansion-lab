"""Compare the browser RK4 model with an independent SciPy DOP853 integration."""
import argparse
import json
from pathlib import Path
import subprocess

import numpy as np
from scipy.integrate import solve_ivp

ROOT = Path(__file__).resolve().parents[1]
CONVERSION = 31557600e9 / 3.0856775814913673e19
G = 4.30091727003628e-9 * CONVERSION ** 2


def reference(initial, config):
    """Independently written ODE in physical peculiar velocity and comoving position."""
    masses = np.array([config['mass'], config['external']]) * 1e16
    centers = np.array([[config['distance'], 0, 0], [180, 60, 25]])
    radii = np.array([config['soft'], 25])

    def rhs(t, state):
        a, xyz, velocity = state[0], state[1:4], state[4:7]
        h = config['h0'] * CONVERSION * np.sqrt(config['omega'] / a**3 + 1 - config['omega'])
        separation = a * (xyz - centers)
        denom = (np.sum(separation**2, axis=1) + radii**2)**1.5
        force = np.sum(-G * masses[:, None] * separation / denom[:, None], axis=0)
        return np.r_[a*h, velocity/a, force - h*velocity]

    result = solve_ivp(rhs, (0, 6), np.r_[1., initial], method='DOP853', rtol=2e-12, atol=1e-13)
    if not result.success:
        raise RuntimeError(result.message)
    return result.y[:, -1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', default='node')
    parser.add_argument('--check', action='store_true', help='Validate without writing the report')
    args = parser.parse_args()
    code = """
const M=require('./web/attractor-model.js');
const configs=[{}, {mass:0,external:0}, {mass:10,external:30,soft:5},
 {mass:0,external:30,h0:55,omega:.4}, {mass:10,external:0,h0:85,omega:.2,distance:40}];
const rows=configs.map(c=>{
 const s=M.create(c),initial=s.p.slice(),ids=[0,1,100,M.PROBE_START+8,M.PROBE_START+20];
 for(let i=0;i<600;i++)M.step(s);
 return {config:s.c,a:s.a,particles:ids.map(i=>({id:i,initial:Array.from(initial.slice(i*6,i*6+6)),final:Array.from(s.p.slice(i*6,i*6+6))}))};
});
console.log(JSON.stringify({version:M.VERSION,rows}));
"""
    output = subprocess.run([args.node, '-e', code], cwd=ROOT, check=True, capture_output=True, text=True)
    payload = json.loads(output.stdout)
    reports = []
    for case in payload['rows']:
        position_error, velocity_error, scale_error = [], [], []
        for particle in case['particles']:
            solution = reference(particle['initial'], case['config'])
            actual = np.array(particle['final'])
            scale_error.append(abs(case['a'] - solution[0]))
            position_error.append(float(np.max(abs(actual[:3]-solution[1:4]))))
            velocity_error.append(float(np.max(abs(actual[3:]-solution[4:7]))/CONVERSION))
        reports.append(dict(parameters=case['config'], tested_particles=len(position_error),
                            max_position_component_error_mpc=max(position_error),
                            max_velocity_component_error_kms=max(velocity_error),
                            max_scale_factor_error=max(scale_error)))
    passed = all(r['max_position_component_error_mpc'] < 1e-4 and
                 r['max_velocity_component_error_kms'] < 1e-3 and
                 r['max_scale_factor_error'] < 1e-9 for r in reports)
    report = dict(model_version=payload['version'], status='pass' if passed else 'fail',
                  comparison='JavaScript RK4 dt=0.01 Gyr against independent SciPy DOP853, rtol=2e-12, atol=1e-13',
                  interval_gyr=[0, 6], cases=reports,
                  interpretation='Numerical agreement for these test cases only; not observational validation.')
    if not passed:
        raise AssertionError(json.dumps(report, indent=2))
    if not args.check:
        (ROOT / 'results' / 'attractor-validation.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
