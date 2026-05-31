/**
 * Meteoron — Layers
 * OWM raster layer switching, legend updates, and map:restore-layer handler.
 */

import { S }        from '../core/state.js';
import { on, emit } from '../core/state.js';
import { LEGENDS, OWM_PROXY } from '../core/config.js';
import { loadWindAnimation, stopWindAnimation } from './particles.js';

// ── OWM source setup ──────────────────────────────────────────────────────

export function addOWMSource(layerName) {
  if (!S.map.instance) return;
  if (S.map.instance.getSource('owm-weather')) return;

  S.map.instance.addSource('owm-weather', {
    type: 'raster',
    tiles: [`${OWM_PROXY}/map/${layerName}/{z}/{x}/{y}.png`],
    tileSize: 256,
    attribution: '© OpenWeatherMap',
  });
  S.map.instance.addLayer({
    id: 'owm-weather-layer',
    type: 'raster',
    source: 'owm-weather',
    paint: { 'raster-opacity': 0.95 },
  });
}

// ── Layer switching ───────────────────────────────────────────────────────

export function setOWMLayer(layerName) {
  S.map.activeLayer = layerName;

  if (layerName !== 'wind_new') stopWindAnimation();

  if (!S.map.instance?.getSource('owm-weather')) return;

  S.map.instance.getSource('owm-weather').setTiles(
    [`${OWM_PROXY}/map/${layerName}/{z}/{x}/{y}.png`]
  );
  S.map.instance.setPaintProperty('owm-weather-layer', 'raster-opacity', 0.95);

  updateLegend(layerName);

  if (layerName === 'wind_new' && S.runtime.lat != null) {
    loadWindAnimation(S.runtime.lat, S.runtime.lon);
  }
}

// ── Legend ────────────────────────────────────────────────────────────────

export function updateLegend(layerName) {
  const legend = document.getElementById('mapLegend');
  const data   = LEGENDS[layerName];
  if (!data) { legend.classList.remove('show'); return; }

  document.getElementById('legendTitle').textContent = data.title;
  document.getElementById('legendBar').style.background = data.gradient;
  document.getElementById('legendMin').textContent = data.min;
  document.getElementById('legendMid').textContent = data.mid;
  document.getElementById('legendMax').textContent = data.max;
  legend.classList.add('show');
}

// ── Chip listeners ────────────────────────────────────────────────────────

export function initLayerChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      setOWMLayer(chip.dataset.layer);
    });
  });
}

// ── Restore OWM layer after style swap ───────────────────────────────────

on('map:restore-layer', () => {
  addOWMSource(S.map.activeLayer);
  updateLegend(S.map.activeLayer);
});