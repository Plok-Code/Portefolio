/**
 * Zero-gravity Easter egg — Pluto track, 8.5s → 28s
 *
 * Rules:
 *   - Only triggers when the track title contains "Pluto"
 *   - Only if the track was played from the very beginning (currentTime < 2 s)
 *   - Any user seek invalidates the effect for that playthrough
 *   - At 28 s elements SLAM back down with bounces
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

const rand = (min, max) => min + Math.random() * (max - min);

/* ── State ────────────────────────────────────────────────── */
let zeroGActive = false;
let plutoState = 'idle'; // idle | eligible | triggered | done | ineligible
let isPlutoTrack = false;
let sparkTimer = null;
let settleTimer = null;

/* ── Helpers ──────────────────────────────────────────────── */
const getTrackTitle = () => {
    const el = document.querySelector('.player-title__text');
    return (el?.textContent ?? '').toLowerCase();
};

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
    });
};

/* ── Enter / Exit ─────────────────────────────────────────── */
const enterZeroG = () => {
    if (zeroGActive || prefersReducedMotion) return;
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
        });
        settleTimer = null;
    }, 1200);
};

/* ── Audio listeners (passive — never mutates the player) ── */
const setupListeners = (audio) => {
    audio.addEventListener('timeupdate', () => {
        const wasPluto = isPlutoTrack;
        isPlutoTrack = getTrackTitle().includes('pluto');

        // Track changed away from Pluto → reset
        if (!isPlutoTrack) {
            if (wasPluto) { plutoState = 'idle'; if (zeroGActive) exitZeroG(); }
            return;
        }

        // Just switched TO Pluto
        if (!wasPluto && isPlutoTrack) plutoState = 'idle';

        const t = audio.currentTime;

        // Mark eligible when we see the track near its start
        if (plutoState === 'idle' && t < 2 && !audio.paused) {
            plutoState = 'eligible';
        }

        // 8.5 s → enter
        if (plutoState === 'eligible' && t >= 8.5 && t < 28) {
            plutoState = 'triggered';
            enterZeroG();
        }

        // 28 s → slam down
        if (plutoState === 'triggered' && t >= 28) {
            plutoState = 'done';
            exitZeroG();
        }
    });

    audio.addEventListener('seeked', () => {
        if (!isPlutoTrack) return;

        // Seek past the start zone → ineligible
        if ((plutoState === 'idle' || plutoState === 'eligible') && audio.currentTime > 3) {
            plutoState = 'ineligible';
        }

        // Seek while effect is active → end it
        if (plutoState === 'triggered' && zeroGActive) {
            exitZeroG();
            plutoState = 'done';
        }
    });
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

    const tryBind = () => {
        const audio = document.querySelector('[data-player-audio]');
        if (!audio || audio.__zgBound) return false;
        audio.__zgBound = true;
        setupListeners(audio);
        return true;
    };

    if (tryBind()) return;
    // Audio element may not exist yet (site-player created lazily)
    const poll = setInterval(() => { if (tryBind()) clearInterval(poll); }, 1000);
};
