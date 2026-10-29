import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = json.loads((ROOT / 'web/data/supernovae.json').read_text())
        cls.results = json.loads((ROOT / 'web/data/results.json').read_text())

    def test_catalog_identity(self):
        self.assertEqual(len(self.rows), 1701)
        self.assertEqual(len({row['cid'] for row in self.rows}), 1543)
        self.assertEqual([r['index'] for r in self.rows], list(range(1701)))

    def test_covariance_fit_selections(self):
        full = [r for r in self.rows if r['calibrator'] or r['z'] > .01]
        local = [r for r in self.rows if r['calibrator'] or r['hubble_flow']]
        self.assertEqual(len(full), self.results['full']['rows'])
        self.assertEqual(len(local), self.results['local']['rows'])
        self.assertEqual(self.results['full']['dof'], len(full)-3)
        self.assertEqual(self.results['local']['dof'], len(local)-2)

    def test_calibrated_moduli(self):
        absolute = self.results['full']['absolute_magnitude']
        for row in self.rows:
            self.assertAlmostEqual(row['mu'], row['mb']-absolute)
            self.assertGreater(row['sigma'], 0)
            self.assertEqual(row['cepheid_mu'] is not None, row['calibrator'])


if __name__ == '__main__':
    unittest.main()
