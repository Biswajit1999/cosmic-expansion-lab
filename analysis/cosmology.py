"""Flat matter + cosmological constant cosmology; radiation neglected."""
import numpy as np
from scipy.special import roots_legendre

C = 299792.458  # km/s
HUBBLE_GYR = 977.79222168  # Hubble time [Gyr] = this / H0 [km/s/Mpc]
NODES, WEIGHTS = roots_legendre(64)


def luminosity_distance(z, h0=70.0, omega_m=0.3, zhel=None):
    """Mpc. Integrate at zHD; use heliocentric redshift in photon prefactor."""
    z = np.asarray(z, dtype=float)
    if np.any(z <= 0) or h0 <= 0 or not 0 < omega_m <= 1:
        raise ValueError('Require z > 0, H0 > 0 and 0 < Omega_m <= 1')
    sample = z[..., None] * (NODES + 1) / 2
    integral = z / 2 * np.sum(WEIGHTS / np.sqrt(omega_m * (1 + sample)**3 + 1 - omega_m), axis=-1)
    return C / h0 * (1 + (z if zhel is None else np.asarray(zhel))) * integral


def distance_modulus(z, h0=70.0, omega_m=0.3, zhel=None):
    return 5 * np.log10(luminosity_distance(z, h0, omega_m, zhel)) + 25


def age_at_scale(a, h0=70.0, omega_m=0.3):
    if omega_m == 1:
        return 2 / 3 * HUBBLE_GYR / h0 * np.asarray(a)**1.5
    return 2 * HUBBLE_GYR / (3 * h0 * np.sqrt(1 - omega_m)) * np.arcsinh(np.sqrt((1 - omega_m) / omega_m) * np.asarray(a)**1.5)


def doppler_velocity(z):
    """Special-relativistic radial Doppler equivalent, NOT cosmic recession."""
    return C * ((1 + np.asarray(z))**2 - 1) / ((1 + np.asarray(z))**2 + 1)
