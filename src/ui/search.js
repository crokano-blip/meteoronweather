/**
 * Meteoron — Search
 * City autocomplete, coordinate input, GPS geolocation.
 * Calls fetchWeatherData on successful location resolution.
 */

import { debounce, fetchWT, esc } from '../core/utils.js';
import { GEOCODING_API, NOMINATIM_API } from '../core/config.js';
import { fetchWeatherData }        from '../weather/forecast.js';

// ── Elements ──────────────────────────────────────────────────────────────
const tabCity    = document.getElementById('tabCity');
const tabCoords  = document.getElementById('tabCoords');
const cityRow    = document.getElementById('cityRow');
const coordRow   = document.getElementById('coordRow');
const coordHint  = document.getElementById('coordHint');
const cityInput  = document.getElementById('cityInput');
const suggestBox = document.getElementById('suggestions');
const latInput   = document.getElementById('latInput');
const lonInput   = document.getElementById('lonInput');

// ── Tab switching ─────────────────────────────────────────────────────────

tabCity.addEventListener('click', () => {
  tabCity.classList.add('active');
  tabCoords.classList.remove('active');
  cityRow.classList.remove('hidden');
  coordRow.classList.add('hidden');
  coordHint.classList.add('hidden');
  suggestBox.classList.remove('show');
});

tabCoords.addEventListener('click', () => {
  tabCoords.classList.add('active');
  tabCity.classList.remove('active');
  coordRow.classList.remove('hidden');
  coordHint.classList.remove('hidden');
  cityRow.classList.add('hidden');
  suggestBox.classList.remove('show');
});

// ── City autocomplete ─────────────────────────────────────────────────────

const doGeocode = debounce(async q => {
  if (q.length < 2) { suggestBox.innerHTML = ''; suggestBox.classList.remove('show'); return; }
  try {
    const d = await fetchWT(
      `${GEOCODING_API}?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
      5000
    );
    if (!d.results?.length) { suggestBox.innerHTML = ''; suggestBox.classList.remove('show'); return; }

    suggestBox.innerHTML = d.results.map(loc =>
      `<div class="sug-item"
         data-lat="${loc.latitude}" data-lon="${loc.longitude}"
         data-name="${esc(loc.name)}" data-country="${esc(loc.country ?? '')}">
        <span>${esc(loc.name)}${loc.admin1 ? ', ' + esc(loc.admin1) : ''}</span>
        <span class="country">${esc(loc.country ?? '')}</span>
      </div>`
    ).join('');
    suggestBox.classList.add('show');

    suggestBox.querySelectorAll('.sug-item').forEach(el => {
      el.addEventListener('click', () => {
        cityInput.value = el.dataset.name;
        suggestBox.classList.remove('show');
        const name = el.dataset.name + (el.dataset.country ? ', ' + el.dataset.country : '');
        fetchWeatherData(parseFloat(el.dataset.lat), parseFloat(el.dataset.lon), name);
      });
    });
  } catch {}
}, 300);

cityInput.addEventListener('input', () => doGeocode(cityInput.value.trim()));
cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { suggestBox.classList.remove('show'); doSearch(); }
});
document.addEventListener('click', e => {
  if (!e.target.closest('.search-field')) suggestBox.classList.remove('show');
});

// ── City search ───────────────────────────────────────────────────────────

document.getElementById('searchBtn').addEventListener('click', doSearch);

async function doSearch() {
  const q = cityInput.value.trim();
  if (!q) return;
  showSearchMsg('Finding location…');
  try {
    const d = await fetchWT(
      `${GEOCODING_API}?name=${encodeURIComponent(q)}&count=1&language=en&format=json`,
      5000
    );
    if (!d.results?.length) {
      showSearchMsg(null); // Let weather:error handler show the message
      return;
    }
    const loc = d.results[0];
    fetchWeatherData(loc.latitude, loc.longitude, loc.name + (loc.country ? ', ' + loc.country : ''));
  } catch {
    showSearchMsg(null);
  }
}

// ── GPS locate ────────────────────────────────────────────────────────────

document.getElementById('locBtn').addEventListener('click', useLocation);

async function useLocation() {
  if (!navigator.geolocation) return;
  showSearchMsg('Detecting location…');

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      let name = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
      try {
        const d = await fetchWT(`${NOMINATIM_API}?lat=${lat}&lon=${lon}&format=json`, 5000);
        const p = d.address?.city ?? d.address?.town ?? d.address?.village ?? d.address?.county;
        if (p) name = p + (d.address?.country ? ', ' + d.address.country : '');
      } catch {}
      fetchWeatherData(lat, lon, name);
    },
    () => showSearchMsg(null)
  );
}

// ── Coordinate input ──────────────────────────────────────────────────────

document.getElementById('coordBtn').addEventListener('click', doCoordSearch);
[latInput, lonInput].forEach(i => {
  i.addEventListener('keydown', e => { if (e.key === 'Enter') doCoordSearch(); });
  i.addEventListener('input', () => i.classList.remove('error'));
});

async function doCoordSearch() {
  const latRaw = latInput.value.trim().replace(',', '.');
  const lonRaw = lonInput.value.trim().replace(',', '.');
  const lat = parseFloat(latRaw);
  const lon = parseFloat(lonRaw);
  let ok = true;
  if (isNaN(lat) || lat < -90  || lat > 90)  { latInput.classList.add('error'); ok = false; }
  if (isNaN(lon) || lon < -180 || lon > 180) { lonInput.classList.add('error'); ok = false; }
  if (!ok) return;

  showSearchMsg('Resolving location…');
  let name = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  try {
    const d = await fetchWT(`${NOMINATIM_API}?lat=${lat}&lon=${lon}&format=json`, 5000);
    const p = d.address?.city ?? d.address?.town ?? d.address?.village
            ?? d.address?.county ?? d.address?.state;
    if (p) name = p + (d.address?.country ? ', ' + d.address.country : '');
  } catch {}
  fetchWeatherData(lat, lon, name);
}

// ── Message helper (delegates to main showMsg via event) ──────────────────

function showSearchMsg(text) {
  if (text) {
    document.getElementById('message').style.display = 'block';
    document.getElementById('weather').classList.remove('visible');
    document.getElementById('message').innerHTML =
      `<div style="padding:40px 0;color:var(--on-surface-dim)">${esc(text)}</div>`;
  }
}