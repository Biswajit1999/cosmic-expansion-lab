# From telescope images to a falsifiable flow experiment

Version 3.1 adds an observation workbench to the [public Great Attractor page](https://biswajit1999.github.io/cosmic-expansion-lab/great-attractor.html#observations). Its four systems and eight image views are real publisher-rendered observations, with an explicitly identified inferred-mass overlay. No generated galaxy imagery is used.

## What has actually been implemented

Release 3.2 also displays a credited historical Laniakea reconstruction, with its [own provenance record](../web/data/reconstruction.json) and original paper link. It is separate from the eight telescope-image views. The numeric reconstructed field and its uncertainties have not been ingested. A golden rendering of the existing model shows integrated trajectories, not a reproduction of that published field.

- Norma / Abell 3627: a Hubble ACS view containing ESO 137-002 and an ESO WFI view of the wider environment.
- Abell 2744: Hubble and JWST views of a distant gravitational lens. They differ in field, orientation, filters and processing; they are not registered overlays.
- Bullet Cluster: JWST starlight, Chandra hot-gas emission, and the publisher's combined image including a **lensing-inferred** mass distribution. The standalone X-ray JPEG has a different crop. No cross-frame offset measurement is supported.
- SN 1994D: an observational illustration of the distance-indicator method, linked to the existing population analysis. This image has not been matched to a Pantheon+ catalog row or used to fit a light curve.

Each view records instrument, wavelengths where supplied, sky reference, field of view, publication date, source, usage terms, exact credit, file size, pixel dimensions and SHA-256. The original JPEG bytes are retained. The images are rendered with `object-fit: contain`; blank margins preserve full frames. Colour can represent wavelength or inference rather than human-eye colour. The Bullet sky coordinates are the publisher's object reference, not independently checked image-centre astrometry. Release dates do not establish observing epochs.

The JSON download captures the selected view, all layers of that object and interpretation limits. A query URL such as `?target=bullet&layer=composite#observations` restores the selection. Observation sharing does not modify simulation parameters. The simulation's numerical model remains version 1.0.0, pinned to its independently validated v3.0.0 implementation.

## The real problem we propose to test

**Which independent distance measurements would most strongly distinguish a local convergence component near the Norma / Great Attractor region from a more extended gravitational field and survey-calibration errors?**

This is a proposed inference and observation-design experiment, not an achieved discovery. Universal expansion and local peculiar motion are already compatible in cosmology. “Why does everything go toward the Great Attractor?” is therefore not the right premise: not everything does, and inward peculiar motion does not by itself mean decreasing physical separation.

The potentially useful contribution is a reproducible chain from catalog identity and measurement uncertainty to held-out predictions and a ranked follow-up observing strategy. The image atlas provides context for that chain. It does not establish novelty or constrain a flow by itself.

### Competing explanations

1. **Local + external field:** a localized convergence component together with a large-scale field.
2. **External field alone:** a flexible large-scale velocity field that can explain apparent local convergence without the added localized component.
3. **Calibration / selection explanation:** the same alternatives with survey offsets, distance-indicator calibration correlations, extinction and selection effects modeled explicitly.

Use the same data, masks and nuisance-parameter treatment across comparisons. Fixing nuisance parameters only in the preferred model would make the comparison misleading. The current two-potential particle demo is not an adequate likelihood model for these alternatives and must not be presented as their posterior.

### Minimum evidence and the present status

| Requirement | Why it matters | Status in this release |
| --- | --- | --- |
| Galaxy identities, positions and group membership | Prevent duplicate objects and mismatched distance/redshift records | Nearby SN label inventory exists; cross-catalog identity/group joins are pending |
| Redshifts in a documented frame | Separate observer motion from source motion | Pantheon+ table is pinned; a flow likelihood using appropriate uncorrected source redshifts is pending |
| Independent distances and covariance | Infer peculiar velocities without fitting redshift-derived distances to themselves | SN distance-ladder analysis exists; independent cross-tracer local-flow fit is pending |
| Survey selection and Galactic extinction | Avoid mistaking an observing gap for missing structure | Not implemented for the flow inference |
| Alternative density/velocity reconstructions | Test dependence on the assumed mass field | Not ingested into the particle simulation |
| Lensing mass and gas posteriors | Quantify a cluster mass/gas offset | Display images only; no numerical Bullet or Abell 2744 mass posterior ingested |
| Microwave maps and gas optical-depth model | Predict a kinetic Sunyaev–Zeldovich signal | Not ingested or fitted |

“Pending” describes this repository, not the state of astronomy. Published reconstructions, catalogs and lens models already address many of these measurements. In particular, a zHD value already corrected for a modeled source flow cannot independently validate that same correction. See the [input audit and research plan](GREAT_ATTRACTOR_RESEARCH_PLAN.md).

### An execution plan with a result that could fail

1. Freeze catalog versions, coordinate/frame conventions, duplicate rules and covariance construction. Record each object's provenance. Fit distance-indicator observables in their native error model; do not assume transformed distance errors are symmetric Gaussian velocity errors.
2. Write the forward model for measured redshift and distance indicator, including observer-frame conversion and survey calibration. At low redshift, the familiar `v_pec ≈ cz − H₀d` is an intuition, not a substitute for that likelihood. Apply consistent observer treatment to every candidate field.
3. Generate mock catalogs under each hypothesis with the actual sky mask, distance errors and correlated calibration. Check parameter recovery and false detections of a localized component. Include a no-local-component mock as a negative control.
4. Hold out whole spatial groups and whole tracer/survey subsets. Randomly splitting repeated light curves of the same object would leak information. Compare held-out predictive log densities with uncertainty; also inspect sky-patterned residuals and calibration sensitivity.
5. Only if the local component predicts held-out measurements better across these tests, report evidence for that component **within the tested model family**. A result that disappears when calibrations or external fields vary is evidence of non-identifiability, not a mass detection.
6. For a candidate follow-up object, simulate possible independent distance measurements under the fitted competing models. Estimate the expected reduction in model uncertainty, including feasible measurement precision and correlated errors. Rank candidates by expected information per observing cost. Validate this ranking on simulated catalogs before recommending real observing time.

The output should include negative results, posterior predictive checks, sensitivity to masks/calibration, and a statement of which observations can or cannot distinguish the models. This decision pipeline has not yet been implemented; the current release supplies the observational context and reproducible model demonstrator.

## How Planck and dark energy enter

The cleaned oval Planck temperature map is not a map of the current Great Attractor mass. Its dominant motion-induced dipole has been removed. A local-flow connection would require a defined observable—such as a kSZ prediction from moving electrons—plus gas, foreground, beam and noise modeling. Visual alignment of features on two maps is not a detection. See [Planck map processing](https://doi.org/10.1051/0004-6361/201525936) and the [Planck kSZ analysis](https://arxiv.org/abs/1504.03339).

Dark energy is constrained through effects on expansion and structure; it is not visible in the galaxy photographs. The existing expansion analysis fits supernova population measurements. The SN 1994D image is explanatory context. [NASA's dark-energy overview](https://science.nasa.gov/dark-energy/) describes the distinction.

## Novelty check and existing work

Interactive astronomical image atlases are established tools: [Aladin](https://aladin.cds.unistra.fr/) already connects survey imagery and catalogs. Lensing-based dark-matter mapping is also established. For example, the [2026 Bullet Cluster analysis](https://doi.org/10.1051/0004-6361/202659214) uses JWST imaging and spectroscopy; it is a different study from the **2025** publisher image set displayed here. We do not label the 2025 overlay as a result of the 2026 paper.

The [Great Attractor research plan](GREAT_ATTRACTOR_RESEARCH_PLAN.md) reviews prior flow and basin reconstructions. Neither that bounded review nor this interface proves that the proposed experiment is unprecedented. A stronger novelty claim requires a targeted literature review of cross-tracer validation and optimal distance-observation design, plus results that outperform established baselines. That claim is deliberately left open.

## Reuse and verification

- Image metadata: [observations.json](../web/data/observations.json); [credits and usage](../web/assets/CREDITS.md). The repository's MIT software license does not replace third-party image terms.
- Verify/recover pinned JPEGs: `python scripts/fetch_observation_images.py`. Existing files are hash-checked without a network request; missing files are fetched and checked before saving. If a publisher changes a file, the check fails instead of silently accepting it.
- `--record` deliberately re-curates hashes and dimensions using Pillow. It is a maintainer operation, not the default verification mode. Review all changed metadata before committing.
- Run asset and existing scientific checks: `python -m unittest discover -s tests`; `node --check web/observations.js`; `node --test tests/attractor-model.test.cjs`.
- Report issues and suggestions in the [public repository](https://github.com/Biswajit1999/cosmic-expansion-lab/issues). No claims or messages have been submitted to researchers on the user's behalf.
