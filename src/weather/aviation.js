/**
 * Meteoron — Aviation
 * Stub module. Aviation-specific data fetching and processing
 * will be built here when the aviation feature set is finalised.
 *
 * Planned:
 * - Pressure-level wind data at 925, 850, 700, 500 hPa
 * - CAPE (convective available potential energy)
 * - Cloud base approximation
 * - Icing risk proxy (temp + humidity at altitude)
 * - Thermal index (temperature lapse rate) for gliders
 *
 * Satellite message format for Aviation is also pending design.
 *
 * See meteoron-profile-reference.md — Aviation Profile section.
 */

export function fetchAviationData(_lat, _lon) {
  // TODO: implement aviation pressure-level fetch
  return Promise.resolve(null);
}