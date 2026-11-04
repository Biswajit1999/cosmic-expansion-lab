import json
import hashlib
import sys
from pathlib import Path
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'analysis'))
from forecast_identifiability import (forecast, geometry, group_representatives,
                                      local_template, shell_rows)


class IdentifiabilityForecastTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = shell_rows(json.loads((ROOT/'web/data/catalogs/cf4.json').read_text())['rows'])
        cls.grouped = group_representatives(cls.rows)
        cls.saved = json.loads((ROOT/'web/data/identifiability-forecast.json').read_text())

    def test_one_representative_per_group_and_saved_counts(self):
        self.assertEqual(len(self.rows), 8861)
        self.assertEqual(len(self.grouped), 6777)
        self.assertEqual(len(set(self.grouped[:, 1])), len(self.grouped))
        self.assertEqual(self.saved['counts']['shell_records'], len(self.rows))
        self.assertEqual(self.saved['counts']['group_representatives'], len(self.grouped))
        for group in (1, 2, 3000):
            members = self.rows[self.rows[:, 1] == group]
            chosen = self.grouped[self.grouped[:, 1] == group]
            if len(members):
                self.assertEqual(chosen[0, 9], members[:, 9].min())

    def test_inward_template_changes_radial_sign_across_center(self):
        _, _, direction = geometry(self.grouped)
        axis = np.vstack((direction, direction))
        radial = local_template(axis, np.array([60.0, 80.0]), direction)
        self.assertGreater(radial[0], 0)
        self.assertLess(radial[1], 0)
        self.assertAlmostEqual(abs(radial[0]), abs(radial[1]))

    def test_nuisance_and_grouping_reduce_information(self):
        names = ('none', 'bulk_scale', 'bulk_shear_scale')
        values = [forecast(self.grouped, nuisance=name)['sigma_amplitude_kms'] for name in names]
        self.assertLessEqual(values[0], values[1])
        self.assertLessEqual(values[1], values[2])
        self.assertGreater(values[2], forecast(self.rows)['sigma_amplitude_kms'])
        self.assertAlmostEqual(values[2],
            self.saved['fiducial_cases']['group_representatives']['bulk_shear_scale']['sigma_amplitude_kms'], places=7)

    def test_forecast_grid_reproduces_and_is_not_a_detection(self):
        self.assertEqual(self.saved['source_normalized_cf4_sha256'],
                         hashlib.sha256((ROOT/'web/data/catalogs/cf4.json').read_bytes()).hexdigest())
        self.assertEqual(len(self.saved['geometry_sensitivity']), 15)
        for point in self.saved['geometry_sensitivity']:
            recomputed = forecast(self.grouped, point['center_mpc'], point['width_mpc'])
            self.assertAlmostEqual(point['sigma_amplitude_kms'], recomputed['sigma_amplitude_kms'], places=7)
            self.assertTrue(0 < point['retained_information_fraction'] <= 1)
        self.assertNotIn('observed_amplitude_kms', self.saved)

    def test_more_assumed_scatter_reduces_precision(self):
        values = self.saved['scatter_sensitivity']
        self.assertEqual([v['sigma_v_kms'] for v in values], [150, 250, 400])
        self.assertLess(values[0]['sigma_amplitude_kms'], values[1]['sigma_amplitude_kms'])
        self.assertLess(values[1]['sigma_amplitude_kms'], values[2]['sigma_amplitude_kms'])
        for value in values:
            self.assertAlmostEqual(value['sigma_amplitude_kms'],
                forecast(self.grouped, sigma_v=value['sigma_v_kms'])['sigma_amplitude_kms'], places=7)

    def test_method_population_coverage_sensitivity(self):
        choices = self.saved['method_coverage_sensitivity']
        mask = self.grouped[:, 10].astype(int)
        selected = (self.grouped[(mask & 4) == 0],
                    self.grouped[(mask & 2) == 0],
                    self.grouped[(mask & 1) != 0])
        for row, sample in zip(choices, selected):
            self.assertEqual(row['representatives'], len(sample))
            self.assertAlmostEqual(row['sigma_amplitude_kms'],
                                   forecast(sample)['sigma_amplitude_kms'], places=7)


if __name__ == '__main__':
    unittest.main()
