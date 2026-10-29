import sys
from pathlib import Path
import unittest
import numpy as np
from scipy.integrate import quad
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'analysis'))
from cosmology import C, luminosity_distance, distance_modulus, age_at_scale, doppler_velocity


class CosmologyTests(unittest.TestCase):
    def test_small_redshift_hubble_law(self):
        self.assertAlmostEqual(float(luminosity_distance(1e-7)*70/(C*1e-7)), 1, places=6)

    def test_quadrature_against_independent_integration(self):
        for z in [.01, .1, 1., 2.3]:
            integral = quad(lambda x: 1/np.sqrt(.3*(1+x)**3+.7), 0, z, epsabs=1e-12)[0]
            self.assertAlmostEqual(float(luminosity_distance(z)), C/70*(1+z)*integral, places=7)

    def test_heliocentric_prefactor(self):
        self.assertAlmostEqual(float(luminosity_distance(.1,zhel=.12)/luminosity_distance(.1)), 1.12/1.1)

    def test_absolute_scale_degeneracy(self):
        shift = distance_modulus(np.array([.1,1]), 75)-distance_modulus(np.array([.1,1]), 70)
        np.testing.assert_allclose(shift, -5*np.log10(75/70))

    def test_age_and_doppler_limits(self):
        self.assertAlmostEqual(float(age_at_scale(1,67.4,.315)), 13.796, places=2)
        self.assertLess(float(doppler_velocity(10)), C)
        self.assertAlmostEqual(float(doppler_velocity(1e-7))/(C*1e-7), 1, places=6)

    def test_invalid_redshift(self):
        with self.assertRaises(ValueError):
            luminosity_distance(0)


if __name__ == '__main__':
    unittest.main()
