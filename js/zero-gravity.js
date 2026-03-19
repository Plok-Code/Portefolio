/**
 * Zero-gravity Easter egg — Pluto track, 8.5s → 27.75s
 *
 * Rules:
 *   - Only triggers when the track title contains "Pluto"
 *   - Works on ANY seek position (polling approach)
 *   - On pause: resetZeroG() (stop without slam)
 *   - On play: re-enter if in the zone
 *   - On track change away from Pluto: resetZeroG()
 *   - At 27.75s: exitZeroG() with slam
 *   - Does NOT touch the audio player internals at all
 */

import { prefersReducedMotion } from './config.js';
import { createSpark } from './sparks.js';

/* ── Selectors ────────────────────────────────────────────────
 *  Target top-level visual blocks only (not their children)
 *  so the whole card / nav item floats as a single unit.
 *  NEVER target sticky/fixed containers (header, .project-nav, .site-player).
 */
const ZG_SELECTORS = [
    'header .brand',
    'header nav',
    'header .header-actions',
    'header .breadcrumbs',
    '.project-nav-item',
    '.project-nav-separator',
    'summary.project-nav__current',
    '.project-screen .card',
    '.hero-actions',
    '.deck-card',
    '.contact-panel',
    '.contact-form__grid',
].join(', ');

const ZG_START = 8.5;
const ZG_END   = 27.75;

const rand = (min, max) => min + Math.random() * (max - min);

/* ── State ────────────────────────────────────────────────── */
let zeroGActive = false;
let sparkTimer = null;
let settleTimer = null;
let pollId = 0;

/* ── Helpers ──────────────────────────────────────────────── */
const getTrackTitle = () => {
    const el = document.querySelector('.player-title__text');
    return (el?.textContent ?? '').toLowerCase();
};

const isPluto = () => getTrackTitle().includes('pluto');

/* ── Apply effect to current DOM elements ─────────────────── */
const applyZeroGToDOM = () => {
    const targets = document.querySelectorAll(ZG_SELECTORS);
    targets.forEach((el) => {
        if (el.classList.contains('zg-target')) return; // already floating
        el.classList.add('zg-target');
        el.style.setProperty('--zg-y', `${rand(-25, -70)}px`);
        el.style.setProperty('--zg-x', `${rand(-10, 10)}px`);
        el.style.setProperty('--zg-r', `${rand(-3, 3)}deg`);
        el.style.setProperty('--zg-delay', `${rand(0, 0.5)}s`);
        // Continuous drift custom properties (randomized per element)
        el.style.setProperty('--zg-drift-dur', `${rand(3, 7)}s`);
        el.style.setProperty('--zg-drift-x', `${rand(-6, 6)}px`);
        el.style.setProperty('--zg-drift-y', `${rand(-5, 5)}px`);
        el.style.setProperty('--zg-drift-r', `${rand(-1.5, 1.5)}deg`);
    });
};

/* ── Reset (stop without slam — silent cleanup) ───────────── */
const resetZeroG = () => {
    if (sparkTimer) { clearInterval(sparkTimer); sparkTimer = null; }
    if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
    zeroGActive = false;

    document.body.classList.remove('zero-g');
    document.body.classList.remove('zero-g-settle');
    document.querySelectorAll('.zg-target').forEach((el) => {
        el.classList.remove('zg-target');
        el.style.removeProperty('--zg-y');
        el.style.removeProperty('--zg-x');
        el.style.removeProperty('--zg-r');
        el.style.removeProperty('--zg-delay');
        el.style.removeProperty('--zg-drift-dur');
        el.style.removeProperty('--zg-drift-x');
        el.style.removeProperty('--zg-drift-y');
        el.style.removeProperty('--zg-drift-r');
    });
};

/* ── Enter / Exit ─────────────────────────────────────────── */
const enterZeroG = () => {
    if (zeroGActive || prefersReducedMotion) return;

    // Clean state before entering
    resetZeroG();
    zeroGActive = true;

    applyZeroGToDOM();
    document.body.classList.add('zero-g');

    // Ambient particles while floating
    sparkTimer = setInterval(() => {
        createSpark(
            rand(window.innerWidth * 0.15, window.innerWidth * 0.85),
            rand(window.innerHeight * 0.2, window.innerHeight * 0.8),
        );
    }, 180);
};

const exitZeroG = () => {
    if (!zeroGActive) return;
    zeroGActive = false;

    if (sparkTimer) { clearInterval(sparkTimer); sparkTimer = null; }

    document.body.classList.remove('zero-g');
    document.body.classList.add('zero-g-settle');

    // Big burst of particles on impact
    for (let i = 0; i < 12; i++) {
        setTimeout(() => createSpark(
            rand(window.innerWidth * 0.1, window.innerWidth * 0.9),
            rand(window.innerHeight * 0.4, window.innerHeight * 0.9),
        ), i * 40);
    }

    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
        document.body.classList.remove('zero-g-settle');
        document.querySelectorAll('.zg-target').forEach((el) => {
            el.classList.remove('zg-target');
            el.style.removeProperty('--zg-y');
            el.style.removeProperty('--zg-x');
            el.style.removeProperty('--zg-r');
            el.style.removeProperty('--zg-delay');
            el.style.removeProperty('--zg-drift-dur');
            el.style.removeProperty('--zg-drift-x');
            el.style.removeProperty('--zg-drift-y');
            el.style.removeProperty('--zg-drift-r');
        });
        settleTimer = null;
    }, 1200);
};

/* ── Polling tick (runs every 50 ms while audio plays) ───── */
const tick = () => {
    const audio = document.querySelector('[data-player-audio]');
    if (!audio || !audio.src || audio.paused || audio.ended) {
        // Paused or no audio → silent reset if active
        if (zeroGActive) resetZeroG();
        return;
    }

    // Track changed away from Pluto → silent reset
    if (!isPluto()) {
        if (zeroGActive) resetZeroG();
        return;
    }

    const t = audio.currentTime;

    // In the zero-g zone
    if (t >= ZG_START && t < ZG_END) {
        if (!zeroGActive) enterZeroG();
    }
    // Hit the end mark → slam down
    else if (t >= ZG_END && zeroGActive) {
        exitZeroG();
    }
    // Outside the zone (before start) → silent reset
    else if (t < ZG_START && zeroGActive) {
        resetZeroG();
    }
};

/* ── Polling lifecycle ───────────────────────────────────── */
const startPolling = () => {
    if (pollId) return;
    pollId = setInterval(tick, 50);
};

const stopPolling = () => {
    if (!pollId) return;
    clearInterval(pollId);
    pollId = 0;
    // On pause → silent reset (no slam)
    if (zeroGActive) resetZeroG();
};

/* ── Public API ───────────────────────────────────────────── */

/**
 * Called after pjax navigation — re-applies zero-g to the fresh DOM
 * if the effect is currently active. No-op otherwise.
 */
export const refreshZeroG = () => {
    if (!zeroGActive) return;
    // New page content just appeared: tag its elements so they float too
    applyZeroGToDOM();
    // Make sure the body class is still there (pjax may have replaced .page but body persists)
    if (!document.body.classList.contains('zero-g')) {
        document.body.classList.add('zero-g');
    }
};

export const initZeroGravity = () => {
    if (prefersReducedMotion) return;

    // Stop any previous polling from a prior init
    stopPolling();

    const bindAudio = () => {
        const audio = document.querySelector('[data-player-audio]');
        if (!audio) return false;
        if (audio.__zgBound) return true;
        audio.__zgBound = true;

        audio.addEventListener('play', startPolling);
        audio.addEventListener('playing', startPolling);
        audio.addEventListener('pause', stopPolling);
        audio.addEventListener('ended', stopPolling);
        audio.addEventListener('emptied', stopPolling);

        if (!audio.paused && !audio.ended) startPolling();
        return true;
    };

    if (!bindAudio()) {
        // Audio element may not exist yet (site-player created lazily)
        const wait = setInterval(() => { if (bindAudio()) clearInterval(wait); }, 1000);
    }
};
