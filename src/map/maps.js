/**
 * Meteoron — Map
 * MapLibre GL JS initialisation, marker placement, coordinate bar,
 * map toggle panel, and click-to-query.
 */

import { S }              from '../core/state.js';
import { on, emit }       from '../core/state.js';
import { OFM_STYLES }     from '../core/config.js';
import { fetchWT, esc }   from '../core/utils.js';
import { NOMINATIM_API }  from '../core/config.js';
import { fetchWeatherData } from '../weather/forecast.js';
import { addOWMSource, updateLegend, initLayerChips } from './layers.js';

// ── Toggle panel ──────────────────────────────────────────────────────────

const mapToggleBtn   = document.getElementById('mapToggleBtn');
const mapPanel       = document.getElementById('mapPanel');
const mapToggleLabel = document.getElementById('mapToggleLabel');

mapToggleBtn.addEventListener('click', () => {
  const open = mapPanel.classList.toggle('open');
  mapToggleBtn.classList.toggle('open', open);
  mapToggleLabel.textContent = open ? 'Hide Map' : 'Show Map';

  if (open && !S.map.initialised) {
    // Delay ensures container has rendered dimensions
    setTimeout(initMap, 80);
  } else if (open && S.map.instance) {
    S.map.instance.resize();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────

function initMap() {
  S.map.initialised = true;

  S.map.instance = new maplibregl.Map({
    container: 'map',
    style:     OFM_STYLES[S.user.theme] ?? OFM_STYLES.light,
    center:    [0, 20],
    zoom:      1.8,
    attributionControl: true,
  });

  S.map.instance.on('error', e => {
    console.warn('MapLibre:', e.error?.message ?? e);
    if (e.error?.message?.includes('style') || e.error?.status === 404) {
      S.map.instance.setStyle(OFM_STYLES.light);
    }
  });

  S.map.instance.addControl(
    new maplibregl.NavigationControl({ showCompass: false }), 'top-right'
  );
  S.map.instance.getCanvas().style.cursor = 'crosshair';

  S.map.instance.on('load', () => {
    addOWMSource(S.map.activeLayer);
    updateLegend(S.map.activeLayer);
  });

  S.map.instance.on('click', async e => {
    const { lng: lon, lat } = e.lngLat;
    placeMarker(lat, lon);
    updateCoordBar(lat, lon);

    let name = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
    try {
      const d = await fetchWT(`${NOMINATIM_API}?lat=${lat}&lon=${lon}&format=json`, 5000);
      const p = d.address?.city ?? d.address?.town ?? d.address?.village ?? d.address?.county;
      if (p) name = p + (d.address?.country ? ', ' + d.address.country : '');
    } catch {}

    fetchWeatherData(lat, lon, name);
  });

  initLayerChips();
}

// ── Marker ────────────────────────────────────────────────────────────────

export function placeMarker(lat, lon) {
  if (!S.map.instance) return;

  if (!S.map.marker) {
    const el = Object.assign(document.createElement('div'), { className: 'met-marker' });
    S.map.popup  = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '220px' });
    S.map.marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lon, lat])
      .setPopup(S.map.popup)
      .addTo(S.map.instance);
  } else {
    S.map.marker.setLngLat([lon, lat]);
  }

  S.map.popup.setHTML(
    `<b>Selected location</b><br>Lat: <b>${lat.toFixed(5)}</b><br>Lon: <b>${lon.toFixed(5)}</b>`
  );
  if (!S.map.popup.isOpen()) S.map.marker.togglePopup();

  S.map.instance.flyTo({
    center: [lon, lat], zoom: Math.max(S.map.instance.getZoom(), 6),
    duration: 800, essential: true,
  });
}

// ── Coord bar ─────────────────────────────────────────────────────────────

export function updateCoordBar(lat, lon) {
  document.getElementById('mapCoordDisplay').innerHTML =
    `Lat: <strong>${lat.toFixed(5)}</strong> &nbsp; Lon: <strong>${lon.toFixed(5)}</strong>`;
}

// ── Sync from weather load ────────────────────────────────────────────────

on('weather:ready', ({ city, lat, lon }) => {
  if (!S.map.initialised) return;
  placeMarker(lat, lon);
  updateCoordBar(lat, lon);
  if (S.map.popup) {
    S.map.popup.setHTML(
      `<b>${esc(city)}</b><br>Lat: <b>${lat.toFixed(5)}</b><br>Lon: <b>${lon.toFixed(5)}</b>`
    );
  }
});