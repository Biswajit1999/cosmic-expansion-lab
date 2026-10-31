/* Real observation viewer. It does not alter the simulation or fit image pixels. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let catalog, target, layer;
  const kindLabels = {observed_light: 'OBSERVED LIGHT', observations_plus_inference: 'LIGHT + INFERRED MASS'};
  function text(id, value) { $(id).textContent = value; }
  function link(id, href) { $(id).href = href; }
  function shareURL() {
    const url = new URL(location.href);
    url.searchParams.set('target', target.id);
    url.searchParams.set('layer', layer.id);
    url.hash = 'observations';
    return url.href;
  }
  function imageStatus() {
    const img = $('obs-image');
    text('obs-status', img.naturalWidth ? `${target.object} — ${layer.label}. ${kindLabels[layer.kind].toLowerCase()}.` : 'The image could not load. Open the original release using the source link below.');
  }
  function selectLayer(id) {
    layer = target.layers.find(item => item.id === id) || target.layers.find(item => item.id === target.default_layer);
    document.querySelectorAll('[data-obs-layer]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.obsLayer === layer.id)));
    const img = $('obs-image');
    text('obs-status', 'Loading the observation…');
    img.alt = layer.alt;
    img.width = layer.width;
    img.height = layer.height;
    img.parentElement.classList.toggle('wide', layer.width / layer.height > 1.8);
    img.src = layer.file;
    if (img.complete) imageStatus();
    text('obs-kind', kindLabels[layer.kind]);
    $('obs-kind').classList.toggle('inferred', layer.kind !== 'observed_light');
    text('obs-instrument', layer.instrument);
    text('obs-caption', layer.interpretation);
    text('obs-credit', layer.credit);
    text('obs-bands', layer.bands);
    text('obs-field', layer.field);
    text('obs-centre', layer.centre);
    text('obs-date', layer.released);
    text('obs-pixels', `${layer.width} × ${layer.height} pixels · ${Math.round(layer.bytes / 1024)} KB`);
    text('obs-license', layer.license);
    link('obs-source', layer.source);
    link('obs-usage', layer.usage);
    link('obs-original', layer.download);
    $('obs-url').value = shareURL();
    text('obs-share-status', 'Link includes the selected object and image layer.');
  }
  function selectTarget(id, layerId) {
    target = catalog.targets.find(item => item.id === id) || catalog.targets[0];
    document.querySelectorAll('[data-obs-target]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.obsTarget === target.id)));
    text('obs-category', target.category);
    text('obs-object', target.object);
    text('obs-title', target.title);
    text('obs-context', target.context);
    text('obs-question', target.question);
    text('obs-observed', target.observed);
    text('obs-inferred', target.inferred);
    text('obs-next', target.next);
    text('obs-comparison', target.comparison);
    link('obs-research', target.research_link);
    text('obs-research', target.research_label + ' ↗');
    $('obs-layers').replaceChildren(...target.layers.map(item => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.obsLayer = item.id;
      button.textContent = item.label;
      button.addEventListener('click', () => selectLayer(item.id));
      return button;
    }));
    selectLayer(layerId);
  }
  $('obs-image').addEventListener('load', imageStatus);
  $('obs-image').addEventListener('error', imageStatus);
  $('obs-copy').addEventListener('click', async () => {
    const url = shareURL();
    try {
      await navigator.clipboard.writeText(url);
      text('obs-share-status', 'Observation link copied.');
    } catch {
      $('obs-url').focus(); $('obs-url').select();
      text('obs-share-status', 'Select and copy the observation URL above.');
    }
  });
  $('obs-export').addEventListener('click', () => {
    const record = {schema_version: catalog.schema_version, release: catalog.release, curated_on: catalog.curated_on, scope: catalog.scope,
      observation_url: shareURL(), selected_target: target.id, selected_layer: layer.id, target};
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2) + '\n'], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = `observation-${target.id}-${layer.id}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    text('obs-share-status', 'Provenance JSON exported with image sources, credits, checksums and interpretation limits.');
  });
  async function init() {
    const response = await fetch('data/observations.json');
    if (!response.ok) throw new Error(`Manifest request failed (${response.status}).`);
    catalog = await response.json();
    $('obs-targets').replaceChildren(...catalog.targets.map((item, i) => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.obsTarget = item.id;
      const number = document.createElement('span'); number.textContent = `0${i + 1}`;
      const name = document.createElement('strong'); name.textContent = item.object;
      button.append(number, name); button.addEventListener('click', () => selectTarget(item.id));
      return button;
    }));
    const query = new URLSearchParams(location.search);
    selectTarget(query.get('target'), query.get('layer'));
    $('obs-workbench').hidden = false;
    $('obs-loading').hidden = true;
    $('obs-copy').disabled = false; $('obs-export').disabled = false;
  }
  init().catch(error => { text('obs-loading', 'The observation catalog could not load. Reload to retry, or use the source manifest below. ' + error.message); });
})();
