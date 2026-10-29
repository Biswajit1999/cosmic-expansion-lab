# From observations to expansion

## Three connected measurements

Redshift and standard candles are complementary ingredients, not three independent estimates of H₀. A spectrum estimates redshift. A calibrated candle estimates luminosity distance. A cosmological model links the two. Geometric anchors and Cepheid period–luminosity calibration enter here through the released host distance moduli.

For a wavelength feature, `z = λobs / λrest − 1`. Pure radial motion in special relativity would give `v/c = ((1+z)²−1)/((1+z)²+1)`. Cosmological redshift instead obeys `1+z = aobs/aemit`; the special-relativistic formula is not a general conversion to cosmic recession velocity. `v ≈ cz` is a low-redshift approximation, and peculiar velocities matter for nearby objects. Our spectral lines are a visualization of this relation; no observed spectra are included.

For a flat matter + Λ cosmology, neglecting radiation:

```text
E(z) = sqrt[Ωm (1+z)^3 + 1 − Ωm]
dL(zHD,zHEL) = (c/H0) (1+zHEL) integral_0^zHD dz/E(z)
μ = 5 log10(dL/Mpc) + 25
mB_model = M_B + μ
```

For calibrator rows, replace theoretical μ with `CEPH_DIST` (which is a distance modulus, despite its column name). The observed vector is `m_b_corr`. The published standardized magnitudes already include light-curve, color, selection and other release corrections; do not reapply them.

## Covariance and fitting

We preserve release row order and repeated observations. Apply the same boolean selection to both covariance axes and the measurement vector. The full `STAT+SYS` covariance contains correlations between repeated light curves, systematics and Cepheid host distances. It has tiny decimal serialization asymmetry (maximum 3e-8); we validate this bound and use `(C+Cᵀ)/2`.

For residual `r = m_obs − m_model`, factor `C = LLᵀ` and solve `u = L⁻¹r`. Minimize `uᵀu` with bounded nonlinear least squares. Never replace the supplied matrix with tabulated diagonal uncertainties. The covariance is treated as fixed, so its determinant is a constant in this fit.

The Jacobian is the derivative of the whitened residual. The reported parameter covariance is `(JᵀJ)⁻¹` and the 1σ errors are square roots of its diagonal. These estimates assume a locally Gaussian likelihood; no posterior sampling, selection reanalysis or alternative calibration uncertainty model is claimed.

Bounds are H₀ ∈ [40,100], M_B ∈ [−21,−17], Ωₘ ∈ [0.05,0.95]. The local fit fixes Ωₘ = 0.3 and uses the release's Hubble-flow selection flags, rather than recreating those flags from rounded redshifts.

Without calibrators, changing H₀ can be compensated exactly by changing M_B. The browser deliberately holds fitted M_B fixed when moving H₀; it is a prediction explorer, not a new statistical fit. Its curve uses zHEL = zHD; individual residuals use each object's actual zHEL. Diagonal point uncertainties in the exported figure are for visualization only. The page's μ catalog column is `m_b_corr − fitted M_B`; calibrators additionally expose their independently supplied Cepheid-host modulus.

## Numerical checks

- 64-node Gauss–Legendre integration is checked against independent adaptive quadrature across the data redshift range.
- Verify the low-z Hubble-law limit and heliocentric prefactor.
- Verify the H₀ / absolute-magnitude degeneracy.
- Verify analytic age limits and special-relativistic velocity bounds.
- Verify input hashes, row counts, covariance shape, positive-definite Cholesky and optimizer convergence.
- Check exported catalog, sample selection, fit degrees of freedom, and consistency of μ with the fitted absolute magnitude.

The browser uses an independent 96-step Simpson rule for interactive previews. Its expansion visualization uses the analytic matter+Λ age relation and advances uniformly in cosmic time; manual slider positions control a, not elapsed time. Bound galaxy sizes remain fixed while their separation changes. Radiation is negligible over the displayed a ∈ [0.25,2] interval; the animation is not a model of inflation or recombination.

## Interpretation

The two fits are correlated and are not independent confirmation of one another. Our reduced compressed-product analysis differs from the full original SH0ES model, and the local fixed-Ωₘ fit differs from its baseline cosmographic fit. Reference results must retain their years and assumptions. The Planck reference is an early-universe inference conditional on ΛCDM, not a direct nearby recession measurement. The SN-only fitted age is model-dependent and is not presented as the consensus age of the universe.

Potential extensions include raw Cepheid period–luminosity fitting, observed galaxy spectra, BAO with the sound-horizon calibration made explicit, and standard sirens with event-level likelihoods. None are represented as implemented measurements in this version.
