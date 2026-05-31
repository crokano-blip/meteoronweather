/**
 * Meteoron — Particles
 * Canvas-based wind particle animation overlay.
 * Fetches U/V components from Open-Meteo for the current location.
 */

import { S }         from '../core/state.js';
import { fetchWT }   from '../core/utils.js';
import { OPEN_METEO_FORECAST } from '../core/config.js';

let windCanvas   = null;
let windCtx      = null;
let windAnim     = null;
let windParticles = [];

// ── Public API ────────────────────────────────────────────────────────────

export async function loadWindAnimation(lat, lon) {
  stopWindAnimation();

  try {
    const params = new URLSearchParams({
      latitude:  lat,
      longitude: lon,
      hourly:    'wind_u_component_10m,wind_v_component_10m',
      timezone:  'auto',
      forecast_days: 1,
    });

    const d = await fetchWT(`${OPEN_METEO_FORECAST}?${params}`, 8000);
    const now = new Date();
    let idx = 0;
    for (let i = 0; i < d.hourly.time.length; i++) {
      if (new Date(d.hourly.time[i]) >= now) { idx = i; break; }
    }

    const uVal  = d.hourly.wind_u_component_10m[idx] ?? 0;
    const vVal  = d.hourly.wind_v_component_10m[idx] ?? 0;
    const speed = Math.sqrt(uVal * uVal + vVal * vVal); // m/s

    const mapEl = document.getElementById('map');
    windCanvas  = document.createElement('canvas');
    windCanvas.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
    windCanvas.width  = mapEl.offsetWidth;
    windCanvas.height = mapEl.offsetHeight;
    mapEl.style.position = 'relative';
    mapEl.appendChild(windCanvas);
    windCtx = windCanvas.getContext('2d');

    const count   = Math.min(150, Math.max(60, Math.round(speed * 12)));
    const speedPx = Math.max(0.5, speed * 1.8);
    const col     = windColour(speed);
    const W = windCanvas.width, H = windCanvas.height;

    const mag = Math.sqrt(uVal * uVal + vVal * vVal) || 0.001;
    const dx  =  uVal / mag;
    const dy  = -vVal / mag; // canvas Y is inverted

    windParticles = Array.from({ length: count }, () => ({
      x:      Math.random() * W,
      y:      Math.random() * H,
      age:    Math.random() * 120,
      maxAge: 80 + Math.random() * 80,
      len:    3 + Math.random() * 6,
    }));

    function drawFrame() {
      windCtx.clearRect(0, 0, W, H);

      for (const p of windParticles) {
        const alpha = Math.sin((p.age / p.maxAge) * Math.PI);
        windCtx.beginPath();
        windCtx.moveTo(p.x, p.y);
        windCtx.lineTo(p.x - dx * p.len, p.y - dy * p.len);
        windCtx.strokeStyle = col.replace(/[\d.]+\)$/, `${(alpha * 0.85).toFixed(2)})`);
        windCtx.lineWidth   = 1.2;
        windCtx.lineCap     = 'round';
        windCtx.stroke();

        p.x += dx * speedPx * 0.5;
        p.y += dy * speedPx * 0.5;
        p.age++;

        if (p.age > p.maxAge || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
          p.x    = Math.random() * W;
          p.y    = Math.random() * H;
          p.age  = 0;
          p.maxAge = 80 + Math.random() * 80;
        }
      }

      windAnim = requestAnimationFrame(drawFrame);
    }

    drawFrame();

  } catch (e) {
    console.warn('Wind animation unavailable:', e);
  }
}

export function stopWindAnimation() {
  if (windAnim)   { cancelAnimationFrame(windAnim); windAnim = null; }
  if (windCanvas?.parentNode) { windCanvas.parentNode.removeChild(windCanvas); }
  windCanvas = null;
  windCtx    = null;
  windParticles = [];
}

// ── Colour scale ──────────────────────────────────────────────────────────

function windColour(spd) {
  if (spd < 1)  return 'rgba(255,255,255,0.7)';
  if (spd < 3)  return 'rgba(212,245,212,0.75)';
  if (spd < 6)  return 'rgba(168,230,168,0.8)';
  if (spd < 10) return 'rgba(255,255,100,0.8)';
  if (spd < 15) return 'rgba(255,200,0,0.85)';
  if (spd < 20) return 'rgba(255,140,0,0.85)';
  return 'rgba(255,80,0,0.9)';
}