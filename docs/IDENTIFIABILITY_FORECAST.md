# A conditional Great Attractor identifiability forecast

4 November 2026 · **survey-design calculation, not a measured flow**

## Question and outcome

The [catalog inventory](CATALOGS.md) establishes how many redshifts and distance estimates we have. This experiment asks a narrower question: **if** a predeclared localized inward-flow pattern exists near the Norma direction, how precisely could the current Cosmicflows-4 (CF4) distance footprint measure its amplitude after allowing a coherent external bulk flow, shear and a distance-scale offset? It uses real positions and quoted marginal distance-modulus errors. It never fits measured velocity residuals or infers a mass.

The fiducial conditional one-sigma error is **98.14 km/s** on the amplitude of the chosen spatial template. This is an *optimistic design sensitivity*, not an observed amplitude or evidence of attraction. Its numerical value changes with the assumed centre and width (see [the figure](../results/identifiability-forecast.pdf) and [machine-readable grid](../web/data/identifiability-forecast.json)). The underlying template is an illustrative Gaussian-gradient field, not a density-derived reconstruction.

## Frozen input and window

- Source: the complete individual-galaxy CF4 Table 2 parsed in `web/data/catalogs/cf4.json`, from the pinned journal download documented in [data provenance](../data/catalog-provenance.json).
- Keep records with **40 ≤ 10^((μ−25)/5) ≤ 100 Mpc** and positive reported σμ: **8,861** records. This observed-modulus selection is only a conditional design window; a final likelihood must model the selection.
- For the primary calculation, choose the smallest-σμ galaxy per published `group_pgc` reference, breaking ties by PGC identifier: **6,777** representatives. This is a conservative response to repeated group membership, but does not make different groups statistically independent. It also discards useful within-group information.
- Within 20° of the fixed `(l,b)=(325°,−7°)` direction, the primary sample contains **86** representatives: **49** on the 40–70 Mpc side and **37** on the 70–100 Mpc side. These are positions in a predeclared cone, not a detected convergence surface.
- DESI's **14,140,375** selected spectra inform the broad redshift inventory but are not inserted into this Fisher calculation. We have no matched individual DESI redshift/distance likelihood here. CF4 already provides CMB-frame systemic velocities; the forecast conditions on them without treating `Vcmb` as a peculiar velocity.

## Model and calculation

Let **n** be the unit sightline, `d` the transformed CF4 distance, **c** = `d_c` **n**₀ the hypothetical centre, and `w` a chosen spatial width. The trial inward velocity field has radial response

```text
f_i = -[(d_i n_i - c) · n_i / w] exp[1/2 - |d_i n_i - c|²/(2w²)].
```

The free amplitude `A` in km/s multiplies `f_i`. Along the exact axis its peak speed is `|A|` one width from the centre, and its radial sign reverses across the centre. This shape is a *hypothesis for survey design*. It is not the measured Great Attractor field and does not include other resolved density structures.

At fixed CMB-frame redshift and fiducial `H₀=70 km/s/Mpc`, the first-order low-redshift modulus response to a radial velocity perturbation is

```text
δμ_i ≈ −(5/ln 10) δu_i/(H₀ d_i).
```

The nuisance design spans a constant three-component bulk velocity, five independent components of a symmetric trace-free shear (`nᵀ S r`, with distances divided by 100 Mpc), and an unrestricted common modulus offset. The latter absorbs a global distance-scale change. The assumed diagonal noise is `sqrt(σμ_i² + [(5/ln10)×250/(H₀d_i)]²)` mag. The 250 km/s term represents **assumed** independent small-scale scatter, not an estimated CF4 value. The target's weighted design vector is projected orthogonally to the nuisance columns. The inverse square root of the remaining Fisher information is the conditional `σ_A`.

| Fiducial centre 70 Mpc, width 30 Mpc | Conditional σA, km/s |
| --- | ---: |
| One per group, local template only | 94.78 |
| One per group, plus bulk and scale | 97.95 |
| One per group, plus bulk, shear and scale | **98.14** |
| All 8,861 rows treated independently, plus bulk, shear and scale | 85.65 — **naive comparison only** |

The relative deterioration is small for this particular toy shape and window. It is not evidence that external flow is negligible for the real Universe: a different density template or spatial covariance can change the degeneracy. The naive full-row number illustrates false precision from duplicated group information. The graph varies the hypothetical centre (50–90 Mpc) and width (20, 30, 40 Mpc); the resulting conditional σA ranges approximately **59.7–246.9 km/s**. Comparing the smallest number across all scanned hypotheses as though it were prespecified would introduce a look-elsewhere problem.

Holding the fiducial shape fixed while changing the assumed independent small-scale scatter from **150 → 250 → 400 km/s** moves the conditional σA from **92.89 → 98.14 → 107.53 km/s**. This is a sensitivity check on one noise assumption, not a calibrated model for spatial covariance or shared distance anchors.

The information also depends on which distance-method populations cover the field. Excluding representatives whose method mask includes Fundamental Plane leaves **5,254** rows and gives **115.28 km/s**. Excluding those with Tully–Fisher leaves **1,730** and gives **168.20 km/s**. Keeping only representatives with an SN Ia flag leaves **272** and gives **341.32 km/s**. These are *coverage stress tests*. The CF4 modulus is a published combined quantity, so a method-presence flag does not make that modulus an independent method-specific distance. The subsets differ in sky position, distance and error; the numbers are not a clean ranking of method quality.

## What this cannot establish

The Fisher calculation uses **no observed residuals**. It supplies no fitted `A`, no likelihood ratio, no confidence interval for the actual attractor, no detection, no mass, no velocity-field map, and no constraint on dark energy. Its uncertainty is conditional on the assumed H₀, template, one-row-per-group reduction and independent marginal errors. Shared method calibration, correlated spatial velocities, redshift errors, selection/Malmquist effects, group-centre uncertainty, other density fields and template uncertainty remain unpropagated. Because the shell was cut on observed μ, fitting actual outcomes with this same window without a selection model would be biased.

The Planck oval temperature map is not a nearby mass map. CF4's `Vcmb` already uses a CMB reference frame, so comparing a flow inferred from it with the same dipole does not provide an independent confirmation. A kSZ test would need a separate microwave map, gas optical-depth model, beam, mask and foreground covariance. This forecast neither downloads nor fits Planck data.

## Next test required for a research claim

1. Replace the Gaussian-gradient toy with one or more fixed density-derived templates, including resolved nearby structure and external alternatives. Freeze angular/radial searches before examining held-out outcomes.
2. Reconcile groups, methods and shared anchors. Use the native distance-indicator observables and a selection-aware, forward likelihood in modulus with a coherent redshift frame.
3. Inject local and external flow alternatives through the actual survey window, correlated errors and selection. Measure bias, coverage, false-attractor frequency and power.
4. Hold out complete group and calibration blocks. Compare predictive log density of the independent observables, and rank new distance targets by expected information gain **after** marginalizing nuisance and model uncertainty.

This is a concrete step toward the [predeclared research question](GREAT_ATTRACTOR_RESEARCH_PLAN.md), not a priority claim. Related published work already uses CF4 forward modelling, bulk-flow estimators and density/velocity reconstructions. See [Tully et al. (2023)](https://arxiv.org/abs/2209.11238), [Laniakea (2014)](https://www.nature.com/articles/nature13674), [CF4 forward modelling (2026)](https://doi.org/10.1051/0004-6361/202556645), and [2MRS–CF4 comparison (2026)](https://doi.org/10.3847/1538-4357/ae8a4c).

## Reproduce

From the repository root after checking out the pinned catalog products:

```sh
python analysis/forecast_identifiability.py
python -m unittest discover -s tests
```

The script writes `web/data/identifiability-forecast.json` and PNG/PDF figures in both `results/` and `web/assets/`. The JSON records the SHA-256 hash of the normalized input, every scenario and the limitations. All reported numbers are recomputed directly from the checked-in individual CF4 rows. No network query or random draw is involved.
