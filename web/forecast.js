(() => {
  'use strict';
  const center = document.getElementById('center-choice');
  const width = document.getElementById('width-choice');
  const status = document.getElementById('forecast-status');
  let grid;
  function render() {
    if (!grid) return;
    const row = grid.find(p => p.center_mpc === Number(center.value) && p.width_mpc === Number(width.value));
    if (!row) return;
    document.getElementById('sigma-readout').innerHTML = `${row.sigma_amplitude_kms.toFixed(2)} <small>km/s</small>`;
    document.getElementById('information-readout').textContent = `${(100*row.retained_information_fraction).toFixed(1)}% of raw template information remains after projection onto nuisance motions.`;
    const url = new URL(location.href);
    url.searchParams.set('center', center.value);
    url.searchParams.set('width', width.value);
    history.replaceState(null, '', url);
  }
  fetch('data/identifiability-forecast.json').then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }).then(data => {
    if (data.counts.group_representatives !== 6777 || data.geometry_sensitivity.length !== 15) throw new Error('Forecast provenance check failed');
    grid = data.geometry_sensitivity;
    const query = new URLSearchParams(location.search);
    for (const [key, select] of [['center', center], ['width', width]]) {
      const value = query.get(key);
      if ([...select.options].some(option => option.value === value)) select.value = value;
      select.addEventListener('change', render);
    }
    status.textContent = 'Showing the pinned conditional design grid. No observed flow has been fitted.';
    render();
  }).catch(error => { status.textContent = `Interactive grid unavailable (${error.message}). The figure and PDF remain available.`; });
})();
