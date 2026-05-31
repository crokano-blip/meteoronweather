/**
 * Meteoron — Utils
 * Pure utility functions: string escaping, debounce, focus management.
 * No imports from other Meteoron modules — keep this dependency-free.
 */

/**
 * HTML-escape a string to prevent XSS in innerHTML contexts.
 * @param {*} s
 * @returns {string}
 */
export const esc = s =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Fetch with a hard timeout and basic HTTP error handling.
 * @param {string} url
 * @param {number} [timeout=10000]
 * @returns {Promise<any>}
 */
export async function fetchWT(url, timeout = 10000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(id);
  }
}

// ── Focus management (modal / drawer accessibility) ──────────────────────

/**
 * Trap keyboard focus within an element.
 * Stores the handler on the element as `_trapHandler` for later removal.
 * @param {HTMLElement} element
 */
export function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  element._trapHandler = e => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
    }
  };

  element.addEventListener('keydown', element._trapHandler);
  first?.focus();
}

/**
 * Release the focus trap and return focus to a prior element.
 * @param {HTMLElement} element
 * @param {HTMLElement|null} [returnTo]
 */
export function releaseFocus(element, returnTo = null) {
  if (element._trapHandler) {
    element.removeEventListener('keydown', element._trapHandler);
    delete element._trapHandler;
  }
  returnTo?.focus();
}