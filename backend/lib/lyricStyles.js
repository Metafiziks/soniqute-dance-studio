'use strict';

const VALID_LYRIC_STYLES = ['neon','glitch','kin','wave','tremor','chrom','term','rise'];

// Full vertical position config — align.vertical positions text in the full-frame rich-text box
// offset.y nudges the full-frame clip so text clears the frame edge (~6%)
// Shotstack offset: positive y = UP (clip moves toward top), negative y = DOWN
// For top:    offset.y -0.05 pushes clip DOWN so text lands ~96px from frame top
// For bottom: offset.y +0.05 pushes clip UP so text lands ~96px from frame bottom
const POS_CONFIG = {
  top:    { vertAlign: 'top',    offset: { x: 0, y: -0.05 } },
  middle: { vertAlign: 'center', offset: { x: 0, y:  0    } },
  bottom: { vertAlign: 'bottom', offset: { x: 0, y:  0.05 } },
};

// Full visual effects per style using Shotstack rich-text capabilities:
//   font.color, style.textTransform/letterSpacing, shadow (glow), stroke (outline),
//   animation.preset (shift/ascend/typewriter) with style:'character'|'word' + direction
const STYLE_CONFIGS = {

  // ── Neon Burn — hot pink per-character cascade with glow ─────────────────
  neon: {
    font:      { family: 'Montserrat', size: 72, weight: 800, color: '#ff2d9b' },
    style:     { textTransform: 'uppercase', letterSpacing: 3 },
    shadow:    { offsetX: 0, offsetY: 0, blur: 16, color: '#ff2d9b', opacity: 0.8 },
    animation: { preset: 'shift', duration: 0.5, style: 'character', direction: 'up' },
  },

  // ── Glitch — white with cyan outline + red channel-split shadow ───────────
  glitch: {
    font:      { family: 'Montserrat', size: 66, weight: 800, color: '#ffffff' },
    style:     { textTransform: 'uppercase', letterSpacing: 5 },
    stroke:    { width: 2, color: '#00ffff', opacity: 0.85 },
    shadow:    { offsetX: 6, offsetY: 0, blur: 6, color: '#ff0000', opacity: 0.75 },
    animation: { preset: 'shift', duration: 0.4, style: 'character', direction: 'left' },
  },

  // ── Kinetic Pop — gold per-word bounce with drop shadow ─────────────────
  kin: {
    font:      { family: 'Montserrat', size: 76, weight: 800, color: '#FFD700' },
    style:     { textTransform: 'uppercase', letterSpacing: 2 },
    shadow:    { offsetX: 3, offsetY: 4, blur: 8, color: '#000000', opacity: 0.5 },
    animation: { preset: 'shift', duration: 0.7, style: 'word', direction: 'up' },
  },

  // ── Wave — mint green per-character ascend with soft glow ───────────────
  wave: {
    font:      { family: 'Montserrat', size: 68, weight: 700, color: '#e0ffe8' },
    style:     { textTransform: 'uppercase', letterSpacing: 3 },
    shadow:    { offsetX: 0, offsetY: 3, blur: 12, color: '#00ff88', opacity: 0.5 },
    animation: { preset: 'ascend', duration: 0.6 },
  },

  // ── Tremor — white with orange outline, characters shift down then settle ─
  tremor: {
    font:      { family: 'Montserrat', size: 72, weight: 800, color: '#ffffff' },
    style:     { textTransform: 'uppercase', letterSpacing: 2 },
    stroke:    { width: 3, color: '#ff8c00', opacity: 0.7 },
    shadow:    { offsetX: 2, offsetY: 3, blur: 6, color: '#000000', opacity: 0.5 },
    animation: { preset: 'shift', duration: 0.5, style: 'character', direction: 'down' },
  },

  // ── Chromatic — white with red+cyan channel separation, word-level ────────
  chrom: {
    font:      { family: 'Montserrat', size: 68, weight: 800, color: '#ffffff' },
    style:     { textTransform: 'uppercase', letterSpacing: 4 },
    stroke:    { width: 1, color: '#00ffff', opacity: 0.6 },
    shadow:    { offsetX: -8, offsetY: 0, blur: 4, color: '#ff0000', opacity: 0.7 },
    animation: { preset: 'shift', duration: 0.6, style: 'word', direction: 'up' },
  },

  // ── Terminal — green typewriter with console glow ────────────────────────
  term: {
    font:      { family: 'Montserrat', size: 58, weight: 700, color: '#00ff88' },
    style:     { letterSpacing: 2 },
    shadow:    { offsetX: 0, offsetY: 0, blur: 14, color: '#00ff88', opacity: 0.6 },
    animation: { preset: 'typewriter', duration: 1.0, style: 'character' },
  },

  // ── Rise — lavender words float up with purple glow ──────────────────────
  rise: {
    font:      { family: 'Montserrat', size: 66, weight: 700, color: '#c8aaff' },
    style:     { textTransform: 'uppercase', letterSpacing: 10 },
    shadow:    { offsetX: 0, offsetY: 4, blur: 16, color: '#8b5cf6', opacity: 0.6 },
    animation: { preset: 'ascend', duration: 0.9 },
  },
};

function buildLyricClips(lyrics, lyricStyle, lyricPosition, totalDuration) {
  if (!lyrics?.length || !lyricStyle || lyricStyle === 'none') return [];
  const config = STYLE_CONFIGS[lyricStyle];
  if (!config) { console.warn(`[lyricStyles] Unknown style "${lyricStyle}"`); return []; }

  const posConfig = POS_CONFIG[lyricPosition] || POS_CONFIG.bottom;
  const vertAlign = posConfig.vertAlign;
  console.log(`[lyricStyles] buildLyricClips: style=${lyricStyle} position=${lyricPosition} → vertAlign=${vertAlign} (${lyrics.length} lines)`);

  const clips = lyrics
    .filter(line => line.text?.trim() && line.end > line.start)
    .map(line => {
      const duration = parseFloat(Math.max(0.5, line.end - line.start).toFixed(3));
      const asset = {
        type:      'rich-text',
        text:      line.text.trim(),
        font:      config.font,
        align:     { horizontal: 'center', vertical: vertAlign },
        animation: config.animation,
      };
      if (config.style)  asset.style  = config.style;
      if (config.stroke) asset.stroke = config.stroke;
      if (config.shadow) asset.shadow = config.shadow;

      return {
        asset,
        start:    parseFloat(line.start.toFixed(3)),
        length:   duration,
        position: 'center',
        offset:   posConfig.offset,
      };
    });

  console.log(`[lyricStyles] Built ${clips.length} clips`);
  return clips;
}

module.exports = { buildLyricClips, VALID_LYRIC_STYLES };
