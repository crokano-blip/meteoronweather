/**
 * Meteoron — Settings
 * Settings drawer, preference persistence, theme switching.
 * Emits 'prefs:changed' when any setting changes so cards can re-render.
 */

import { S }         from '../core/state.js';
import { emit }      from '../core/state.js';
import { savePrefs } from '../core/cache.js';
import { trapFocus, releaseFocus } from '../core/utils.js';
import { OFM_STYLES } from '../core/config.js';

// ── Elements ──────────────────────────────────────────────────────────────
const drawer      = document.getElementById('settingsDrawer');
const scrim       = document.getElementById('settingsScrim');
const settingsBtn = document.getElementById('settingsBtn');
const closeBtn    = document.getElementById('settingsCloseBtn');
const themeBtn    = document.getElementById('themeToggleBtn');
const themeIcon   = document.getElementById('themeIcon');

// ── Open / close ──────────────────────────────────────────────────────────

export function openSettings() {
  drawer.classList.add('open');
  scrim.classList.add('open');
  settingsBtn.classList.add('active');
  trapFocus(drawer);
}

function closeSettings() {
  drawer.classList.remove('open');
  scrim.classList.remove('open');
  releaseFocus(drawer, settingsBtn);
  settingsBtn.classList.remove('active');
}

settingsBtn.addEventListener('click', openSettings);
closeBtn.addEventListener('click', closeSettings);
scrim.addEventListener('click', closeSettings);
drawer.addEventListener('keydown', e => { if (e.key === 'Escape') closeSettings(); });

// ── Segmented button helper ───────────────────────────────────────────────

export function setSegActive(groupId, value) {
  document.querySelectorAll(`#${groupId} .seg-btn`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === value);
  });
}

// ── Apply theme ───────────────────────────────────────────────────────────

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';

  if (S.map.initialised && S.map.instance) {
    swapMapStyle(theme);
  }
}

function swapMapStyle(theme) {
  const styleUrl = OFM_STYLES[theme] ?? OFM_STYLES.light;
  S.map.instance.setStyle(styleUrl);
  // Re-add OWM source after style swap
  S.map.instance.once('styledata', () => {
    if (!S.map.instance.getSource('owm-weather')) {
      emit('map:restore-layer');
    }
  });
}

// ── Apply preferences to UI ───────────────────────────────────────────────

export function applyPrefsToUI() {
  setSegActive('tempUnitGroup',  S.user.tempUnit);
  setSegActive('windUnitGroup',  S.user.windUnit);
  setSegActive('distUnitGroup',  S.user.distUnit);
  setSegActive('themeGroup',     S.user.theme);
  setSegActive('profileGroup',   S.user.aviationManual ? 'aviation' : 'auto');
  document.getElementById('aviationLevelWrap').style.display =
    S.user.aviationManual ? '' : 'none';
  applyTheme(S.user.theme);
}

// ── Segmented button listeners ────────────────────────────────────────────

// Unit + theme groups
[
  ['tempUnitGroup', 'tempUnit'],
  ['windUnitGroup', 'windUnit'],
  ['distUnitGroup', 'distUnit'],
  ['themeGroup',    'theme'],
].forEach(([groupId, key]) => {
  document.querySelectorAll(`#${groupId} .seg-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      S.user[key] = btn.dataset.val;
      setSegActive(groupId, btn.dataset.val);
      savePrefs();
      if (key === 'theme') applyTheme(btn.dataset.val);
      emit('prefs:changed', { key });
    });
  });
});

// Theme toggle button in app bar
themeBtn.addEventListener('click', () => {
  S.user.theme = S.user.theme === 'dark' ? 'light' : 'dark';
  applyTheme(S.user.theme);
  setSegActive('themeGroup', S.user.theme);
  savePrefs();
});

// Profile override — Aviation manual toggle
document.querySelectorAll('#profileGroup .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    S.user.aviationManual = btn.dataset.val === 'aviation';
    setSegActive('profileGroup', btn.dataset.val);
    document.getElementById('aviationLevelWrap').style.display =
      S.user.aviationManual ? '' : 'none';
    savePrefs();
    emit('prefs:aviation-changed');
  });
});

// Aviation flight level sub-selector
document.querySelectorAll('#aviationLevelGroup .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setSegActive('aviationLevelGroup', btn.dataset.val);
    if (S.user.aviationManual) {
      S.ui.subProfile = btn.dataset.val;
      emit('prefs:changed', { key: 'aviationLevel' });
    }
  });
});