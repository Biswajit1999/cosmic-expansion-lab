# Great Attractor simulation: model, validation and reuse

Released 30 October 2026 · simulation model **1.0.0** · project release **v3.0.0**

[Open the public simulation](https://biswajit1999.github.io/cosmic-expansion-lab/great-attractor.html)

## Purpose and scientific status

This reproducible browser experiment illustrates the coexistence of background expansion and gravitationally induced peculiar motion. It integrates **massless test particles in two prescribed excess-mass potentials** within a flat matter + cosmological-constant background. It is useful for explaining coordinate frames, testing a numerical implementation, and exploring conditional predictions.

It is **not** a constrained reconstruction of the real Great Attractor, a self-consistent N-body simulation, a measurement of its mass, or a validated forecast of the Local Group's future. No observational likelihood is fitted. The particles, initial conditions and source parameters are synthetic. Numerical accuracy does not remove these modeling limitations.

The next empirical milestone is specified in the [research proposal](GREAT_ATTRACTOR_RESEARCH_PLAN.md): obtain independent distance tracers, resolve overlaps and calibration, audit velocity corrections, and compare held-out predictions for competing local/external-flow models. This release completes the simulation demonstrator and numerical verification, not that observational experiment.

## Equations and units

The implementation uses comoving coordinates **x** in Mpc, physical peculiar velocity **u** in Mpc/Gyr, dimensionless scale factor a, and time t in Gyr. The initial scale factor is 1. The spatial axes are arbitrary Cartesian axes, **not Galactic or supergalactic coordinates**.

\[
\mathbf r=a\mathbf x,\qquad
H(a)=H_0\sqrt{\Omega_m a^{-3}+1-\Omega_m},
\]
\[
\dot a=aH(a),\qquad
\dot{\mathbf x}=\mathbf u/a,\qquad
\dot{\mathbf u}=\mathbf g-H(a)\mathbf u.
\]

H₀ is converted from km/s/Mpc to Gyr⁻¹ before integration. The conversion is 1 km/s = 0.001022712165045695 Mpc/Gyr (Julian year). The adopted constant is G = 4.30091727003628 × 10⁻⁹ Mpc (km/s)² M☉⁻¹, converted to the integration units.

Each source has a Plummer potential, with physical displacement Δ**r** = a(**x** − **x**source):

\[
\Phi=-\frac{GM}{\sqrt{|\Delta\mathbf r|^2+b^2}},\qquad
\mathbf g=-\sum_s\frac{GM_s\Delta\mathbf r_s}
{(|\Delta\mathbf r_s|^2+b_s^2)^{3/2}}.
\]

The softened force is finite at the centre. The background matter density is already represented by H(a); the sources represent additional, localized **excess mass**, not a second summation of the homogeneous background. This finite open domain is not a periodic cosmological box and does not impose a compensating underdensity.

The comoving equations are standard cosmological test-particle dynamics; see the gravitational-acceleration discussion in [Martinez-Vaquero, Yepes & Hoffman (2007)](https://academic.oup.com/mnras/article/378/4/1601/1050715). The implemented source potential follows the [Plummer potential definition](https://docs.galpy.org/en/latest/reference/potentialplummer.html). Neither source validates the particular synthetic configuration chosen here.

## Prescribed sources and initial conditions

| Quantity | Default | Interactive range |
| --- | --- | --- |
| H₀ at a = 1 | 70 km/s/Mpc | 55–85 |
| Ωₘ at a = 1 | 0.30 | 0.20–0.40 |
| Local excess mass | 5 × 10¹⁶ M☉ | 0–10 × 10¹⁶ M☉ |
| Local source centre | (70, 0, 0) comoving Mpc | x = 40–100 Mpc |
| Local physical Plummer radius b | 12 Mpc | 5–25 Mpc |
| Distant excess mass | 10 × 10¹⁶ M☉ | 0–30 × 10¹⁶ M☉ |
| Distant source centre | (180, 60, 25) comoving Mpc | fixed |
| Distant physical Plummer radius | 25 Mpc | fixed |
| Seed | 2026 | integer 1–2,147,483,647 |

These are experiment settings, not estimates or uncertainty ranges. A local distance of 70 Mpc is motivated as a useful scale by the [2026 convergence preprint](https://arxiv.org/abs/2604.02470v2); the synthetic mass, shape, orientation and velocities are **not calibrated to that paper**. The distant source is not a measured representation of Shapley or another named supercluster.

Source centres stay fixed in comoving coordinates, while their physical Plummer radii and masses remain constant. Thus source separations expand as a(t). Source trajectories are externally prescribed; they do not respond to mutual attraction. The force field is time-dependent. Conservation of the isolated particles' Newtonian energy or total momentum is consequently not an appropriate test of this driven model.

There are 522 integrated particles:

- Index 0: a freely moving observer, initially at (0, 0, 0).
- Indices 1–480: tracers sampled uniformly in a rectangular comoving volume, x ∈ [−100, 210), y,z ∈ [−85, 85) Mpc.
- Indices 481–521: 41 probes initially along the x axis, at x = 10 + 3j Mpc, j = 0…40.

Every particle starts with **zero peculiar velocity**, so initial physical motion is pure Hubble flow. These are deliberately simple initial conditions, not a realization of the primordial power spectrum and not growing-mode initial conditions for a cosmological structure-formation simulation. The default page shows the model after 3 Gyr of evolution; time is elapsed from these initial conditions, not a reconstructed lookback time or the age of the Universe.

The deterministic generator is a 32-bit linear congruential generator, n ← (1664525n + 1013904223) mod 2³², returning n/2³². It controls sampling only; all forces are deterministic. Test particles exert no forces on each other or on the sources. No gas, galaxy formation, radiation, source accretion, relativistic corrections or observational selection is modeled.

## Interpreting the displays

The main view is an orthographic projection of a 3D configuration. Rotation and tilt change the camera only. Grid axes refer to arbitrary background coordinates. Physical mode displays a**x**; comoving mode displays **x**. A source circle represents its Plummer scale radius in the displayed coordinates, not a measured halo edge or a turnaround radius.

Peculiar arrows use **u** in the background frame. Total arrows use H**r** + **u** relative to the fixed background origin. They are direction indicators: their common nonlinear length mapping is 5 ln(1 + speed/100 km/s) display-coordinate Mpc before projection. This is deliberately compressed to keep both small and large velocities visible. Do not read numerical velocities from arrow length. Trails join stored positions at 0.1 Gyr intervals (plus the current endpoint).

The profile and probe readouts instead use the **moving observer**. Define **R** = a(**x**i − **x**o) and D = |**R**|. Then

\[
v_{\rm expansion}=H D,\quad
v_{\rm pec,rad}=\hat{\mathbf R}\cdot(\mathbf u_i-\mathbf u_o),\quad
\dot D=H D+v_{\rm pec,rad}.
\]

All three are displayed in km/s. Positive total radial motion means separation from this observer is increasing. A negative peculiar component can coexist with positive total motion. The profile connects the evolving axis probes ordered by their current observer distance; it is not an observational fit or an estimate of a convergence surface. The three-dimensional probes can leave their original line.

The observer speed metric is |**u**o| in the synthetic background frame. It is not the measured CMB dipole velocity of the Solar System or the Local Group. The cleaned Planck map is not loaded or fitted. A kSZ comparison requires gas, beam, mask, noise and foreground modeling beyond this release; see the [research proposal](GREAT_ATTRACTOR_RESEARCH_PLAN.md).

## Numerical verification

The shared browser/Node solver uses classic fourth-order Runge–Kutta, Δt = 0.01 Gyr, for 600 steps. It integrates a and particle phase-space coordinates at consistent RK stages. There are 121 snapshots, from 0 through 6 Gyr every 0.05 Gyr. Playback selects these snapshots; it does not change the integration step. Changing parameters recomputes the trajectories from the same seeded initial positions.

The Node tests cover:

1. Scale-factor evolution against the analytic flat matter + Λ solution.
2. Fixed comoving positions and zero peculiar velocities with both source masses zero.
3. Conservation of a**u** for an unforced particle with nonzero initial peculiar velocity.
4. Plummer force magnitude, symmetry and finite central force.
5. Force against an independently evaluated finite-difference potential gradient.
6. Timestep convergence near the strongest allowed local source.
7. Seed determinism, observer-velocity subtraction, parameter validation and export row semantics.

An additional [Python comparison](../analysis/validate_attractor.py) integrates 25 selected particle trajectories across five configurations with independently written SciPy DOP853 equations (rtol = 2 × 10⁻¹², atol = 10⁻¹³). It compares those endpoints with the browser RK4 solver at 6 Gyr. The [versioned numerical report](../results/attractor-validation.json) records errors for default, zero-force and extreme parameter configurations. Acceptance thresholds are 10⁻⁴ Mpc per position component, 10⁻³ km/s per peculiar-velocity component and 10⁻⁹ in scale factor.

These checks validate numerical implementation for the tested cases, not the chosen mass distribution, initial conditions or cosmology against observations. They are not an exhaustive error guarantee for every trajectory and parameter combination.

Reproduce the checks:

```sh
python -m pip install -r requirements.txt
node --test tests/attractor-model.test.cjs
python analysis/validate_attractor.py --check
python -m unittest discover -s tests
```

If Node is not on PATH, supply `--node /absolute/path/to/node`. Omit `--check` to regenerate the numerical report. Both GitHub scientific checks and the Pages deployment run the simulation tests and independent comparison before publication.

## Sharing, export and exact reproduction

Use **Copy experiment link** to copy a URL encoding the model settings, seed, time, selected probe, coordinates and camera. The fragment version `v=1` identifies this model family. The link encodes no private data. Unsupported fragment versions are rejected in favour of defaults with a message. As with any live website, archive the state and software release for long-term reproduction.

**JSON:** schema `cosmic-expansion-attractor/snapshot-v1`; model version, parameter units, source positions, numerical settings, time, scale factor, view, experiment URL and all 522 particle rows. Comoving positions are absolute background coordinates in Mpc; exported u components are physical peculiar velocities in km/s. The radial columns use the moving observer as above.

**CSV:** the same particle rows, preceded by `#` comment lines containing model version, URL, time and scale factor. Use `pandas.read_csv(path, comment='#')`. Save the JSON alongside the CSV for full structured provenance.

**PNG:** the current projected scene, with model version, key settings, time and a synthetic-data label. It is a visualization rather than a sufficient standalone numerical record; share the experiment link and JSON with it.

For exact implementation provenance, check out project release **v3.0.0**, whose simulation model is **1.0.0**. Reproduce a downloaded JSON without opening a browser:

```sh
git checkout v3.0.0
node scripts/run_attractor.cjs great-attractor-state.json reproduced.json
```

The CLI refuses unsupported versions, invalid parameters and an existing output path. Particle rows should match within floating-point precision on a supported JavaScript runtime. Creation timestamps and platform-dependent metadata are not scientific results. The application is buildless and needs no server-side processing or third-party JavaScript libraries. The optional Google Fonts request has local fallbacks.

## Suggested citation and community description

Cite **Biswajit Jana, Cosmic Expansion Lab, v3.0.0, Great Attractor simulation model 1.0.0 (2026)**, with the repository URL and exact release or commit. The repository includes `CITATION.cff`; no DOI has been minted. Original implementation is MIT licensed. Cite the scientific papers separately when discussing their results.

Suggested description when sharing:

> An open, reproducible Great Attractor dynamics sandbox: test particles evolve in an expanding ΛCDM background with adjustable local and distant excess-mass potentials. It separates Hubble expansion from peculiar motion, provides numerical checks, and exports parameterized links, particle snapshots and figures. This is a synthetic model experiment, not an observational reconstruction. Feedback on model assumptions and the proposed independent-tracer validation is welcome.
