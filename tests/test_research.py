import json
import sys
from pathlib import Path
import unittest
import numpy as np
from scipy.integrate import quad
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'analysis'))
from cosmology import luminosity_distance, C


class ResearchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.research=json.loads((ROOT/'web/data/research.json').read_text())
        cls.catalog=json.loads((ROOT/'web/data/supernovae.json').read_text())

    def test_constant_w_against_independent_integrator(self):
        for w in [-1.3,-1,-.7]:
            for z in [.1,1.,2.3]:
                expected=C/70*(1+z)*quad(lambda x:1/np.sqrt(.3*(1+x)**3+.7*(1+x)**(3*(1+w))),0,z)[0]
                self.assertAlmostEqual(float(luminosity_distance(z,w=w)),expected,places=7)

    def test_baseline_reproduces_original_fit(self):
        original=json.loads((ROOT/'web/data/results.json').read_text())['full']
        self.assertAlmostEqual(original['h0'],self.research['baseline']['h0'],places=4)
        self.assertAlmostEqual(original['chi2'],self.research['baseline']['chi2'],places=5)

    def test_sample_cuts_keep_calibrators(self):
        for item in self.research['sensitivity']:
            rows=[r for r in self.catalog if r['calibrator'] or r['z']>item['zmin']]
            self.assertEqual(len(rows),item['rows'])
            self.assertEqual(item['dof'],len(rows)-3)

    def test_profile_grid_has_finite_interior_minimum(self):
        grid=self.research['profile'];values=np.array(grid['delta_chi2'])
        self.assertEqual(values.shape,(len(grid['omega_m']),len(grid['h0'])))
        self.assertTrue(np.isfinite(values).all())
        self.assertGreaterEqual(values.min(),-1e-4)
        self.assertLess(values.min(),.05)
        i,j=np.unravel_index(np.argmin(values),values.shape)
        self.assertTrue(0<i<values.shape[0]-1 and 0<j<values.shape[1]-1)

    def test_sn_only_does_not_claim_h0(self):
        self.assertIsNone(self.research['sn_only']['h0'])
        self.assertEqual(self.research['sn_only']['rows'],sum(not r['calibrator'] and r['z']>.01 for r in self.catalog))

    def test_model_comparison_same_rows_and_aic(self):
        base=self.research['baseline'];w=self.research['wcdm']
        self.assertEqual(base['rows'],w['rows'])
        self.assertAlmostEqual(w['delta_aic_vs_lcdm'],w['chi2']-base['chi2']+2)
        self.assertFalse(w['at_bound'])


if __name__=='__main__':unittest.main()
