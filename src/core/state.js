/**
 * Meteoron — State
 * S singleton. Namespaced per the 2026-05-26 refactor.
 * All modules import S and mutate it directly.
 * A lightweight pub/sub is provided for cross-module reactivity.
 */

export const S = {
  user: {
    tempUnit:      'celsius',
    windUnit:      'kn',
    distUnit:      'km',
    theme:         'light',
    aviationManual: false,
  },

  data: {
    weather: null,   // Open-Meteo /forecast response
    marine:  null,   // Open-Meteo /marine response
  },

  ui: {
    context:    'general', // 'marine' | 'alpine' | 'fire' | 'general'
    profile:    'overland',
    subProfile: 'lowland',
  },

  map: {
    instance:    null,         // maplibregl.Map
    initialised: false,
    activeLayer: 'temp_new',
    marker:      null,
    popup:       null,
  },

  runtime: {
    lat:       null,
    lon:       null,
    city:      null,
    elevation: 0,
    isLand:    true,
  },
};

// ── Minimal pub/sub ──────────────────────────────────────────────────────
const _listeners = {};

/**
 * Subscribe to a named event.
 * @param {string} event
 * @param {Function} fn
 */
export function on(event, fn) {
  (_listeners[event] = _listeners[event] || []).push(fn);
}

/**
 * Emit a named event, passing optional payload to all subscribers.
 * @param {string} event
 * @param {*} payload
 */
export function emit(event, payload) {
  (_listeners[event] || []).forEach(fn => fn(payload));
}