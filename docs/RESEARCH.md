# Research investigations, version 2

## What is new?

The baseline fit is now accompanied by a profile-likelihood surface, three redshift-threshold fits, an uncalibrated supernova-only fit, and a constant-w extension. They all use the matching full statistical-plus-systematic covariance submatrix. This is a deliberately bounded research exercise: the new tests probe specific assumptions, not every possible source of uncertainty.

Run `python analysis/fit.py` followed by `python analysis/research.py`. The second script writes `web/data/research.json` and four new figures in SVG, PNG and PDF formats. The executed [worked notebook](../notebooks/expansion-investigations.ipynb) repeats the numerical investigations rather than merely loading their displayed values.

## 1. Profile the absolute magnitude

At fixed Ωₘ, write the predicted magnitude vector as

$$m_{\rm model}=b(\Omega_m)+M_B\mathbf{1}+q\mathbf{f},\qquad q=-5\log_{10}(H_0/70).$$

For non-calibrators, b contains the model distance modulus evaluated at H₀=70 and f=1. For calibrators, b contains the supplied Cepheid-host modulus and f=0. With covariance C=LLᵀ, define y=L⁻¹(m_obs−b−qf) and u=L⁻¹1. Then

$$\widehat M_B = (u^Ty)/(u^Tu),\qquad \chi^2_{\rm prof}=\|y-\widehat M_Bu\|^2.$$

This is exact profiling of the linear nuisance parameter at each grid point, not a Gaussian approximation to the shape of the grid and not Bayesian marginalization. We evaluate 65 H₀ values by 57 Ωₘ values, subtract the continuous baseline minimum, and display contours at Δχ²=2.30 and 6.18. Interpreting these as joint 68.3% and 95.4% confidence regions uses the usual regularity assumptions of Wilks' theorem. The website reads the nearest grid cell rather than pretending to perform a new likelihood solve in JavaScript.

## 2. Change the nearby-supernova cut

| Minimum zHD for non-calibrators | Retained light curves | H₀ (km/s/Mpc) | Ωₘ |
| --- | ---: | ---: | ---: |
| 0.010 | 1657 | 73.533 ± 1.017 | 0.3318 ± 0.0180 |
| 0.023 | 1448 | 73.694 ± 1.026 | 0.3282 ± 0.0184 |
| 0.050 | 1133 | 73.594 ± 1.063 | 0.3325 ± 0.0213 |

All calibrators are retained in every case. Nearby peculiar velocities can make up a substantial fraction of a galaxy's observed redshift, motivating a cut sensitivity check. These results are stable under these particular cuts within the displayed uncertainty scale. That is not proof that every systematic error is negligible. Calibration and much of the sample are shared, so the estimates are correlated. Do not combine them by inverse-variance averaging. Do not compare their raw χ² or AIC as if the different rows were the same experiment.

## 3. Remove calibrators

Exclude all rows flagged as calibrators, retain non-calibrators with zHD>0.01, and profile the magnitude offset while optimizing Ωₘ. The remaining 1,580 rows give Ωₘ=0.3326 ± 0.0182 under flat ΛCDM. No H₀ value is reported.

For any chosen H₀, a compensating shift of the absolute magnitude leaves all apparent magnitudes unchanged. The fit uses H₀=70 only to name a nuisance offset; this is a coordinate convention on a degeneracy, not an external prior or measurement. This exercise is a useful safeguard against accidentally claiming an absolute expansion rate from uncalibrated candles.

## 4. Fit constant-w dark energy

The extension uses

$$E(z)^2=\Omega_m(1+z)^3+(1-\Omega_m)(1+z)^{3(1+w)}.$$

It assumes a flat universe, negligible radiation, and a constant w. The same 1,657 rows yield:

- H₀ = 73.439 ± 1.028 km/s/Mpc.
- Ωₘ = 0.2965 ± 0.0680.
- w = −0.9119 ± 0.1491.
- χ² = 1451.691 with 1653 degrees of freedom.

The errors come from local likelihood curvature. They are not MCMC intervals and can miss non-Gaussian tails and degeneracies. The fit is not on a bound, but its result remains conditional on the parameter domain and model.

For this fixed-covariance, same-data comparison, AIC=χ²+2k differs by +1.675 for wCDM relative to ΛCDM. The modest improvement in fit does not overcome the simple extra-parameter penalty. This is not a probability of a model being true, and it is not a new detection of evolving dark energy. The matter-only curve shown in the comparison figure is a fixed-H₀ illustration, not another optimized likelihood fit.

## 5. Keep distance definitions straight

The browser's distance workbench assumes zHEL=zHD for an ideal comoving object. It integrates 1/E(z) for comoving distance and 1/[(1+z)E(z)] for lookback time. In a flat, transparent universe:

$$D_L=(1+z)D_C,\qquad D_A=D_C/(1+z).$$

The reciprocity relation D_L=(1+z)²D_A therefore holds. The lookback time is not D_C/c because the scale factor changes along the light's path. At z=1, the default H₀=67.4, Ωₘ=0.315 model gives D_C≈3.401 Gpc, D_L≈6.803 Gpc, D_A≈1.701 Gpc, and lookback≈7.95 Gyr. The SN fit and matter-only choices expose the model dependence of these conversions.

## Data identity and source accounting

The release contains 1,701 light-curve rows. Counting the literal `CID` strings in the pinned input gives 1,543 labels, whereas the Pantheon+ paper describes a 1,550-object compilation. This project has not performed an independent cross-identification of objects across catalog aliases. Thus `unique_sne` in the original JSON is operationally a distinct-string count, not a newly validated astronomical census. The website explains this distinction.

Telescope images are credited contextual observations. They are not used as measurement inputs. RS Puppis illustrates the Cepheid class but is not represented as an individual fitted Cepheid in this compressed-data analysis. SN 1994D is searchable in the release, while the release's masks determine whether its rows enter a fit. BAO, CMB and gravitational-wave sirens are explained as complementary methods; their raw likelihoods are not fitted.

## Validation and limits

Tests compare luminosity-distance integration against independent adaptive quadrature, including constant w; verify baseline agreement; check sample selection and degrees of freedom; validate finite profile grids and interior minima; enforce an unidentifiable H₀ for the SN-only output; and compare AIC only on the same observations. Browser checks cover the distance workbench, tab independence, profile readouts, image loading, catalog links and responsive layout.

Further work could add posterior sampling, survey-residual diagnostics, raw Cepheid photometry or observed spectra. Each would require an explicit measurement model and source provenance. Adding more probes without their calibration assumptions would make the project look broader while making its inference less reliable.
