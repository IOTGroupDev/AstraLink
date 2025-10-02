'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.LUNAR_ENERGY_COLORS =
  exports.formatLunarDay =
  exports.formatMoonPhase =
  exports.isFullMoon =
  exports.isNewMoon =
  exports.isWaning =
  exports.isWaxing =
  exports.getMoonPhaseColor =
  exports.getMoonPhaseIcon =
    void 0;
const getMoonPhaseIcon = (phase) => {
  if (phase < 0.03) return '🌑';
  if (phase < 0.22) return '🌒';
  if (phase < 0.28) return '🌓';
  if (phase < 0.47) return '🌔';
  if (phase < 0.53) return '🌕';
  if (phase < 0.72) return '🌖';
  if (phase < 0.78) return '🌗';
  if (phase < 0.97) return '🌘';
  return '🌑';
};
exports.getMoonPhaseIcon = getMoonPhaseIcon;
const getMoonPhaseColor = (phase) => {
  if (phase < 0.25) return '#8B5CF6';
  if (phase < 0.5) return '#EC4899';
  if (phase < 0.75) return '#3B82F6';
  return '#6366F1';
};
exports.getMoonPhaseColor = getMoonPhaseColor;
const isWaxing = (phase) => {
  return phase > 0 && phase < 0.5;
};
exports.isWaxing = isWaxing;
const isWaning = (phase) => {
  return phase >= 0.5 && phase < 1;
};
exports.isWaning = isWaning;
const isNewMoon = (phase) => {
  return phase < 0.03 || phase > 0.97;
};
exports.isNewMoon = isNewMoon;
const isFullMoon = (phase) => {
  return phase >= 0.47 && phase <= 0.53;
};
exports.isFullMoon = isFullMoon;
const formatMoonPhase = (moonPhase) => {
  return `${moonPhase.phaseName} (${moonPhase.illumination}%)`;
};
exports.formatMoonPhase = formatMoonPhase;
const formatLunarDay = (lunarDay) => {
  return `${lunarDay.number}-й лунный день: ${lunarDay.name}`;
};
exports.formatLunarDay = formatLunarDay;
exports.LUNAR_ENERGY_COLORS = {
  positive: '#10B981',
  neutral: '#8B5CF6',
  challenging: '#EF4444',
};
//# sourceMappingURL=lunar.js.map
