// Visual effects synced to specific tracks.
// 04 - Despair: nuclear flash + screen shake from 29s to 40s.
// 01 - Bad Sacha: pokepeur image flash from 42s to 44s.
// 03 - New Horizon: fantasy theme for entire track.

const FLASH_START = 29;
const FLASH_END = 40;

const POKE_START = 42;
const POKE_END = 44;
const POKE_IMAGE_URL = new URL("../assets/images/pokepeur.jpg", import.meta.url).href;

let overlay = null;
let pokeOverlay = null;
let shaking = false;
let shakeRaf = 0;
let shakeIntensity = 1;
let pollId = 0;
let fantasyElements = null;

const rand = (min, max) => min + Math.random() * (max - min);

const ensureOverlay = () => {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.style.cssText =
        "position:fixed;inset:0;z-index:99999;pointer-events:none;background:#fff;opacity:0;transition:none;";
    document.body.appendChild(overlay);
    return overlay;
};

const ensurePokeOverlay = () => {
    if (pokeOverlay) return pokeOverlay;
    pokeOverlay = document.createElement("div");
    pokeOverlay.style.cssText =
        "position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;transition:none;" +
        `background:url("${POKE_IMAGE_URL}") center/cover no-repeat;`;
    document.body.insertBefore(pokeOverlay, document.body.firstChild);
    return pokeOverlay;
};

const createFantasyElements = () => {
    if (fantasyElements) return;

    const fireflies = document.createElement("div");
    fireflies.className = "fantasy-fireflies";
    for (let i = 0; i < 25; i++) {
        const ff = document.createElement("div");
        ff.className = "fantasy-firefly";
        ff.style.setProperty("--ff-x", `${rand(5, 95)}%`);
        ff.style.setProperty("--ff-y", `${rand(10, 90)}%`);
        ff.style.setProperty("--ff-size", `${rand(2, 6)}px`);
        ff.style.setProperty("--ff-glow", `${rand(4, 14)}px`);
        ff.style.setProperty("--ff-dur", `${rand(5, 12)}s`);
        ff.style.setProperty("--ff-pulse", `${rand(2, 5)}s`);
        ff.style.setProperty("--ff-dx1", `${rand(-40, 40)}px`);
        ff.style.setProperty("--ff-dy1", `${rand(-30, 30)}px`);
        ff.style.setProperty("--ff-dx2", `${rand(-50, 50)}px`);
        ff.style.setProperty("--ff-dy2", `${rand(-50, 10)}px`);
        ff.style.setProperty("--ff-dx3", `${rand(-30, 30)}px`);
        ff.style.setProperty("--ff-dy3", `${rand(-20, 20)}px`);
        ff.style.setProperty("--ff-dx4", `${rand(-45, 45)}px`);
        ff.style.setProperty("--ff-dy4", `${rand(-40, 20)}px`);
        ff.style.animationDelay = `${rand(0, 8)}s, ${rand(0, 4)}s`;
        fireflies.appendChild(ff);
    }
    document.body.appendChild(fireflies);

    const rays = document.createElement("div");
    rays.className = "fantasy-rays";
    for (let i = 0; i < 5; i++) {
        const ray = document.createElement("div");
        ray.className = "fantasy-ray";
        ray.style.setProperty("--ray-x", `${10 + i * 20}%`);
        ray.style.setProperty("--ray-w", `${rand(80, 200)}px`);
        ray.style.setProperty("--ray-angle", `${rand(8, 25)}deg`);
        ray.style.setProperty("--ray-opacity", `${rand(0.02, 0.06)}`);
        ray.style.setProperty("--ray-dur", `${rand(8, 16)}s`);
        ray.style.setProperty("--ray-sway", `${rand(10, 30)}px`);
        rays.appendChild(ray);
    }
    document.body.appendChild(rays);

    fantasyElements = { fireflies, rays };
};

const removeFantasyElements = () => {
    if (!fantasyElements) return;
    fantasyElements.fireflies.remove();
    fantasyElements.rays.remove();
    fantasyElements = null;
};

const startShake = () => {
    if (shaking) return;
    shaking = true;
    const page = document.querySelector(".page") || document.body;
    const shake = () => {
        if (!shaking) {
            page.style.transform = "";
            return;
        }
        const x = (Math.random() - 0.5) * 30 * shakeIntensity;
        const y = (Math.random() - 0.5) * 30 * shakeIntensity;
        const r = (Math.random() - 0.5) * 4 * shakeIntensity;
        page.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`;
        shakeRaf = requestAnimationFrame(shake);
    };
    shake();
};

const stopShake = () => {
    shaking = false;
    cancelAnimationFrame(shakeRaf);
    const page = document.querySelector(".page") || document.body;
    page.style.transform = "";
};

const stopAll = () => {
    if (overlay) overlay.style.opacity = "0";
    if (pokeOverlay) pokeOverlay.style.opacity = "0";
    document.body.classList.remove("theme-fantasy");
    removeFantasyElements();
    stopShake();
};

const tick = () => {
    const audio = document.querySelector("[data-player-audio]");
    if (!audio || !audio.src || audio.paused || audio.ended) { stopAll(); return; }

    const src = decodeURIComponent(audio.src);
    const t = audio.currentTime;

    // 04 - Despair: flash + shake
    if (src.includes("04 - Despair")) {
        if (t >= FLASH_START && t <= FLASH_END) {
            const el = ensureOverlay();
            const elapsed = t - FLASH_START;
            const duration = FLASH_END - FLASH_START;

            if (elapsed < 0.15) {
                el.style.opacity = "1";
                shakeIntensity = 1;
            } else if (elapsed < 2) {
                el.style.opacity = String(1 - elapsed * 0.15);
                shakeIntensity = 1;
            } else {
                const progress = (elapsed - 2) / (duration - 2);
                el.style.opacity = String(Math.max(0.7 - progress * 0.7, 0));
                shakeIntensity = Math.max(1 - progress, 0);
            }
            startShake();
        } else {
            stopAll();
        }
        return;
    }

    // 03 - New Horizon: fantasy theme
    if (src.includes("03 - New Horizon")) {
        if (!document.body.classList.contains("theme-fantasy")) {
            document.body.classList.add("theme-fantasy");
            createFantasyElements();
        }
        return;
    } else {
        if (document.body.classList.contains("theme-fantasy")) {
            document.body.classList.remove("theme-fantasy");
            removeFantasyElements();
        }
    }

    // 01 - Bad Sacha: pokepeur image
    if (src.includes("01 - Bad Sacha")) {
        const FADE_IN = 0.5;
        if (t >= POKE_START - FADE_IN && t <= POKE_END) {
            const el = ensurePokeOverlay();
            if (t < POKE_START) {
                el.style.opacity = String(0.55 * ((t - (POKE_START - FADE_IN)) / FADE_IN));
            } else {
                el.style.opacity = "0.55";
            }
        } else {
            if (pokeOverlay) pokeOverlay.style.opacity = "0";
        }
        return;
    }

    stopAll();
};

const startPolling = () => {
    if (pollId) return;
    pollId = setInterval(tick, 50);
};

const stopPolling = () => {
    if (!pollId) return;
    clearInterval(pollId);
    pollId = 0;
    stopAll();
};

export const initTrackFx = () => {
    stopPolling();

    const bindAudio = () => {
        const audio = document.querySelector("[data-player-audio]");
        if (!audio) return false;
        if (audio.__trackFxBound) return true;
        audio.__trackFxBound = true;

        audio.addEventListener("play", startPolling);
        audio.addEventListener("playing", startPolling);
        audio.addEventListener("pause", stopPolling);
        audio.addEventListener("ended", stopPolling);
        audio.addEventListener("emptied", stopPolling);

        if (!audio.paused && !audio.ended) startPolling();
        return true;
    };

    if (!bindAudio()) {
        const waitForAudio = setInterval(() => {
            if (bindAudio()) clearInterval(waitForAudio);
        }, 500);
    }
};
