import { prefersReducedMotion } from './config.js';
import { clamp, formatTime } from './utils.js';
import {
    storage,
    readStoredPlayerState,
    writeStoredPlayerState,
    isGlobalPlayerEnabled,
    setGlobalPlayerEnabled
} from './storage.js';

export const setSitePlayerVisible = (visible) => {
    const shouldShow = Boolean(visible);
    const sitePlayer = document.querySelector("[data-site-player]");
    if (sitePlayer) {
        sitePlayer.hidden = !shouldShow;
        sitePlayer.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }
    document.body.classList.toggle("has-site-player", shouldShow && Boolean(document.querySelector("[data-player]")));
};

export const mountSitePlayer = () => {
    if (document.querySelector("[data-site-player]")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "site-player";
    wrapper.setAttribute("data-site-player", "");
    wrapper.innerHTML = `
    <div class="player" data-player>
      <button class="icon-btn" type="button" data-player-toggle aria-label="Lecture" aria-pressed="false">
        <svg class="icon icon--filled" data-icon="play" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 5v14l11-7z"></path>
        </svg>
        <svg class="icon icon--filled" data-icon="pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 6h2v12H9zM13 6h2v12h-2z"></path>
        </svg>
      </button>
      <button class="icon-btn" type="button" data-player-panel-toggle aria-label="Ouvrir la playlist" aria-expanded="false" aria-controls="player-panel">
        <svg class="icon" data-icon="playlist" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 6h11"></path>
          <path d="M4 12h11"></path>
          <path d="M4 18h11"></path>
          <path d="M18 9v6l3-3z"></path>
        </svg>
      </button>
      <div class="player-panel" id="player-panel" data-player-panel aria-label="Playlist" aria-hidden="true" hidden>
        <p class="muted player-panel__hint">Playlist : ajoutez vos morceaux.</p>
        <div class="player-tracks" data-player-tracks></div>
      </div>
      <audio data-player-audio preload="none"></audio>
    </div>
  `;

    document.body.appendChild(wrapper);
};

export const initAudioPlayer = () => {
    let players = document.querySelectorAll("[data-player]");
    const rawPlaylist = window.INA_PLAYLIST;
    const playlist = Array.isArray(rawPlaylist) ? rawPlaylist : [];

    const validTracks = playlist.filter(
        (track) => track && typeof track.title === "string" && track.title.trim() && typeof track.src === "string" && track.src.trim(),
    );

    const storedState = readStoredPlayerState();
    const isProfilePage = () => (window.location?.pathname ?? "").endsWith("profil.html");

    if (!players.length && isGlobalPlayerEnabled() && !isProfilePage()) {
        mountSitePlayer();
        players = document.querySelectorAll("[data-player]");
    }

    setSitePlayerVisible(isGlobalPlayerEnabled());

    if (players.length) {
        let storedStateConsumed = false;

        for (const player of players) {
            if (player.dataset.playerBound === "1") continue;
            player.dataset.playerBound = "1";

            const playButton = player.querySelector("[data-player-toggle]");
            const panelButton = player.querySelector("[data-player-panel-toggle]");
            const panel = player.querySelector("[data-player-panel]");
            const tracksRoot = player.querySelector("[data-player-tracks]");
            const hint = player.querySelector(".player-panel__hint");
            const audio = player.querySelector("[data-player-audio]");

            if (!playButton || !panelButton || !panel || !tracksRoot || !audio) continue;

            const initialState = storedStateConsumed ? null : storedState;
            storedStateConsumed = true;

            const inline = document.createElement("div");
            inline.className = "player-inline";

            const transport = document.createElement("div");
            transport.className = "player-transport";

            const prevButton = document.createElement("button");
            prevButton.type = "button";
            prevButton.className = "icon-btn player-btn";
            prevButton.setAttribute("aria-label", "Morceau pr\u00e9c\u00e9dent");
            prevButton.innerHTML = `
        <svg class="icon icon--filled" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path>
        </svg>
      `;

            const nextButton = document.createElement("button");
            nextButton.type = "button";
            nextButton.className = "icon-btn player-btn";
            nextButton.setAttribute("aria-label", "Morceau suivant");
            nextButton.innerHTML = `
        <svg class="icon icon--filled" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path>
        </svg>
      `;

            playButton.classList.add("player-play");
            transport.append(prevButton, playButton, nextButton);

            const info = document.createElement("div");
            info.className = "player-info";
            const titleEl = document.createElement("div");
            titleEl.className = "player-title";
            const titleTrackEl = document.createElement("span");
            titleTrackEl.className = "player-title__track";
            const titleTextEl = document.createElement("span");
            titleTextEl.className = "player-title__text";
            const titleGapEl = document.createElement("span");
            titleGapEl.className = "player-title__gap";
            titleGapEl.setAttribute("aria-hidden", "true");
            const titleCloneEl = document.createElement("span");
            titleCloneEl.className = "player-title__text player-title__text--clone";
            titleCloneEl.setAttribute("aria-hidden", "true");

            const initialTitle = validTracks.length ? "S\u00e9lectionnez un morceau" : "Ajoutez vos morceaux";
            titleTextEl.textContent = initialTitle;
            titleCloneEl.textContent = initialTitle;
            titleTrackEl.append(titleTextEl, titleGapEl, titleCloneEl);
            titleEl.appendChild(titleTrackEl);
            titleEl.title = initialTitle;
            const statusEl = document.createElement("div");
            statusEl.className = "player-status";
            statusEl.textContent = validTracks.length ? "Pr\u00eat" : "Aucune piste";
            info.append(titleEl, statusEl);

            const progress = document.createElement("div");
            progress.className = "player-progress";
            const currentTimeEl = document.createElement("span");
            currentTimeEl.className = "player-time";
            currentTimeEl.textContent = "0:00";
            const progressInput = document.createElement("input");
            progressInput.type = "range";
            progressInput.className = "player-progress__input";
            progressInput.min = "0";
            progressInput.max = "0";
            progressInput.step = "0.1";
            progressInput.value = "0";
            progressInput.disabled = true;
            progressInput.setAttribute("aria-label", "Position dans le morceau");
            const durationEl = document.createElement("span");
            durationEl.className = "player-time";
            durationEl.textContent = "0:00";
            progress.append(currentTimeEl, progressInput, durationEl);

            const volumeWrap = document.createElement("div");
            volumeWrap.className = "player-volume";
            const volumeButton = document.createElement("button");
            volumeButton.type = "button";
            volumeButton.className = "icon-btn player-volume-btn";
            volumeButton.setAttribute("aria-label", "Activer ou couper le son");
            volumeButton.innerHTML = `
        <svg class="icon" data-icon="volume" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 10v4h3l4 4V6l-4 4z"></path>
          <path d="M17 8a4 4 0 0 1 0 8"></path>
          <path d="M19 5a7 7 0 0 1 0 14"></path>
        </svg>
        <svg class="icon" data-icon="mute" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 10v4h3l4 4V6l-4 4z"></path>
          <path d="M20 9l-4 4"></path>
          <path d="M16 9l4 4"></path>
        </svg>
      `;
            const volumeSlider = document.createElement("input");
            volumeSlider.type = "range";
            volumeSlider.className = "player-volume__slider";
            volumeSlider.min = "0";
            volumeSlider.max = "1";
            volumeSlider.step = "0.01";
            volumeSlider.value = "1";
            volumeSlider.setAttribute("aria-label", "Volume");
            volumeWrap.append(volumeButton, volumeSlider);

            inline.append(transport, info, progress, volumeWrap);
            player.insertBefore(inline, panelButton);

            let activeIndex = -1;
            let panelOpen = false;
            let isSeeking = false;
            let lastPersist = 0;
            let lastNonZeroVolume = clamp(Number(initialState?.volume ?? 1), 0, 1) || 0.7;
            let statusOverride = "";
            let marqueeRaf = 0;

            const clearTitleMarquee = () => {
                titleEl.classList.remove("is-marquee");
                titleEl.style.removeProperty("--player-title-distance");
                titleEl.style.removeProperty("--player-title-duration");
            };

            const updateTitleMarquee = () => {
                clearTitleMarquee();
                if (prefersReducedMotion) return;

                const isPlaying = !audio.paused && !audio.ended;
                const hasTrack = Number.isFinite(activeIndex) && activeIndex >= 0 && Boolean(audio.src);
                if (!isPlaying || !hasTrack) return;

                void titleEl.offsetWidth;
                const containerWidth = titleEl.clientWidth;
                if (!containerWidth) return;

                const textWidth = titleTextEl.getBoundingClientRect().width;
                const overflow = Math.max(0, textWidth - containerWidth);
                if (overflow < 8) return;

                const gapValue = Number.parseFloat(window.getComputedStyle(titleEl).getPropertyValue("--player-title-gap")) || 40;
                const distance = textWidth + gapValue;
                const durationSeconds = Math.min(Math.max(distance / 40 + 2, 8), 45);
                titleEl.style.setProperty("--player-title-distance", `${distance.toFixed(2)}px`);
                titleEl.style.setProperty("--player-title-duration", `${durationSeconds}s`);

                void titleEl.offsetWidth;
                titleEl.classList.add("is-marquee");
            };

            const scheduleTitleMarqueeUpdate = () => {
                if (marqueeRaf) window.cancelAnimationFrame(marqueeRaf);
                marqueeRaf = window.requestAnimationFrame(() => {
                    marqueeRaf = 0;
                    updateTitleMarquee();
                });
            };

            let titleResizeObserver = null;
            if (typeof window.ResizeObserver === "function") {
                titleResizeObserver = new ResizeObserver(() => scheduleTitleMarqueeUpdate());
                titleResizeObserver.observe(titleEl);
            } else {
                window.addEventListener("resize", scheduleTitleMarqueeUpdate);
            }

            if (document.fonts?.ready) {
                document.fonts.ready.then(scheduleTitleMarqueeUpdate).catch(() => { });
            }

            const persistState = (overrides = {}, { immediate = false } = {}) => {
                if (!storage) return;
                const now = Date.now();
                if (!immediate && now - lastPersist < 750) return;
                lastPersist = now;
                const payload = {
                    trackIndex: activeIndex,
                    time: audio.currentTime || 0,
                    isPlaying: !audio.paused && !audio.ended,
                    volume: audio.volume,
                    muted: audio.muted,
                    ...overrides,
                };
                writeStoredPlayerState(payload);
            };

            const setPanelOpen = (nextOpen) => {
                const shouldOpen = Boolean(nextOpen);
                if (panelOpen === shouldOpen) return;
                panelOpen = shouldOpen;

                if (panelOpen) {
                    panel.hidden = false;
                    panel.setAttribute("aria-hidden", "false");
                    panelButton.setAttribute("aria-expanded", "true");
                    panelButton.setAttribute("aria-label", "Fermer la playlist");
                    window.requestAnimationFrame(() => panel.classList.add("is-open"));
                    return;
                }

                panel.classList.remove("is-open");
                panel.setAttribute("aria-hidden", "true");
                panelButton.setAttribute("aria-expanded", "false");
                panelButton.setAttribute("aria-label", "Ouvrir la playlist");

                if (prefersReducedMotion) {
                    panel.hidden = true;
                    return;
                }

                panel.addEventListener(
                    "transitionend",
                    () => {
                        if (panelOpen) return;
                        panel.hidden = true;
                    },
                    { once: true },
                );
            };

            const updateVolumeUI = () => {
                const isMuted = audio.muted || audio.volume === 0;
                volumeButton.classList.toggle("is-muted", isMuted);
                volumeButton.setAttribute("aria-pressed", isMuted ? "true" : "false");
                volumeSlider.value = audio.volume.toString();
                const volumePercent = Math.round(audio.volume * 100);
                volumeSlider.style.setProperty("--volume-level", `${volumePercent}%`);
            };

            const updatePlayUI = () => {
                const isPlaying = !audio.paused && !audio.ended;
                const hasTrack = Number.isFinite(activeIndex) && activeIndex >= 0 && Boolean(audio.src);
                playButton.setAttribute("aria-pressed", isPlaying ? "true" : "false");
                playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Lecture");

                if (!validTracks.length) {
                    statusEl.textContent = "Aucune piste";
                    scheduleTitleMarqueeUpdate();
                    return;
                }

                if (!hasTrack) {
                    statusEl.textContent = "Pr\u00eat";
                    scheduleTitleMarqueeUpdate();
                    return;
                }

                if (audio.ended) {
                    statusEl.textContent = "Morceau termin\u00e9";
                    scheduleTitleMarqueeUpdate();
                    return;
                }

                if (statusOverride) {
                    statusEl.textContent = statusOverride;
                    scheduleTitleMarqueeUpdate();
                    return;
                }

                statusEl.textContent = isPlaying ? "Lecture en cours" : "En pause";
                scheduleTitleMarqueeUpdate();
            };

            const updateProgressUI = () => {
                const hasTrack = Number.isFinite(activeIndex) && activeIndex >= 0 && Boolean(audio.src);
                const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
                if (!hasTrack || duration <= 0) {
                    progressInput.disabled = true;
                    progressInput.max = "0";
                    if (!isSeeking) progressInput.value = "0";
                    durationEl.textContent = "0:00";
                    progressInput.style.setProperty("--progress", "0%");
                } else {
                    progressInput.disabled = false;
                    progressInput.max = duration.toString();
                    durationEl.textContent = formatTime(duration);
                }

                if (!isSeeking) {
                    currentTimeEl.textContent = formatTime(audio.currentTime);
                    if (!progressInput.disabled) progressInput.value = audio.currentTime.toString();
                }

                const progressPercent = duration > 0 ? Math.min((audio.currentTime / duration) * 100, 100) : 0;
                progressInput.style.setProperty("--progress", `${progressPercent}%`);
            };

            const highlightActiveTrack = () => {
                for (const el of tracksRoot.querySelectorAll("[data-track-index]")) {
                    el.classList.toggle("is-active", Number(el.dataset.trackIndex) === activeIndex);
                }
            };

            const setActiveTrack = async (index, { autoplay = false, resumeTime = null } = {}) => {
                const nextIndex = Number.isFinite(index) ? index : -1;
                if (nextIndex < 0 || nextIndex >= validTracks.length) return null;
                const wasActive = activeIndex === nextIndex && audio.src;
                activeIndex = nextIndex;
                const track = validTracks[activeIndex];

                if (!wasActive) {
                    audio.src = track.src;
                    titleTextEl.textContent = track.title;
                    titleCloneEl.textContent = track.title;
                    titleEl.title = track.title;
                    progressInput.value = "0";
                    progressInput.disabled = true;
                    progressInput.style.setProperty("--progress", "0%");
                    currentTimeEl.textContent = "0:00";
                    durationEl.textContent = "0:00";
                    scheduleTitleMarqueeUpdate();
                }

                highlightActiveTrack();

                const targetTime = Number.isFinite(resumeTime) ? Math.max(0, resumeTime) : null;
                if (targetTime !== null) {
                    const seekAfterMetadata = () => {
                        try {
                            const duration = Number.isFinite(audio.duration) ? audio.duration : null;
                            const safeTime = duration ? Math.min(targetTime, Math.max(duration - 0.25, 0)) : targetTime;
                            audio.currentTime = safeTime;
                            updateProgressUI();
                        } catch {
                            // Ignore seek issues.
                        }
                        audio.removeEventListener("loadedmetadata", seekAfterMetadata);
                        audio.removeEventListener("canplay", seekAfterMetadata);
                    };

                    if (audio.readyState >= 1) seekAfterMetadata();
                    else {
                        audio.addEventListener("loadedmetadata", seekAfterMetadata);
                        audio.addEventListener("canplay", seekAfterMetadata);
                    }
                }

                if (autoplay) {
                    statusOverride = "Chargement...";
                    updatePlayUI();
                    try {
                        await audio.play();
                    } catch {
                        statusOverride = "Impossible de lancer la lecture";
                    }
                }

                updatePlayUI();
                persistState({ trackIndex: activeIndex, time: audio.currentTime || 0 }, { immediate: true });
                return track;
            };

            const renderTracks = () => {
                tracksRoot.innerHTML = "";

                if (!validTracks.length) {
                    if (hint) hint.textContent = "Playlist : ajoutez vos morceaux.";
                    return;
                }

                if (hint) hint.textContent = "S\u00e9lectionnez un morceau :";

                validTracks.forEach((track, index) => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "player-track";
                    button.dataset.trackIndex = String(index);
                    button.textContent = track.title;
                    button.addEventListener("click", async () => {
                        await setActiveTrack(index, { autoplay: true });
                        updatePlayUI();
                        setPanelOpen(false);
                    });
                    tracksRoot.appendChild(button);
                });
            };

            renderTracks();

            panel.hidden = true;
            panel.setAttribute("aria-hidden", "true");
            panelButton.setAttribute("aria-expanded", "false");

            prevButton.disabled = validTracks.length <= 1;
            nextButton.disabled = validTracks.length <= 1;

            const storedVolume = clamp(Number(initialState?.volume ?? 1), 0, 1);
            const storedMuted = Boolean(initialState?.muted);
            audio.volume = storedVolume;
            volumeSlider.value = storedVolume.toString();
            if (storedMuted && storedVolume > 0) lastNonZeroVolume = storedVolume;
            audio.muted = storedMuted;
            updateVolumeUI();

            if (initialState && Number.isFinite(initialState.trackIndex) && initialState.trackIndex >= 0 && initialState.trackIndex < validTracks.length) {
                void setActiveTrack(initialState.trackIndex, {
                    autoplay: Boolean(initialState.isPlaying) && isGlobalPlayerEnabled(),
                    resumeTime: Number(initialState.time) || 0,
                });
            } else {
                updatePlayUI();
            }

            playButton.addEventListener("click", async () => {
                if (!validTracks.length) {
                    setPanelOpen(true);
                    return;
                }

                if (!audio.src) {
                    await setActiveTrack(0, { autoplay: true });
                    return;
                }

                if (audio.paused || audio.ended) {
                    statusOverride = "Chargement...";
                    updatePlayUI();
                    try {
                        await audio.play();
                    } catch {
                        statusOverride = "Impossible de lancer la lecture";
                    }
                } else {
                    audio.pause();
                }

                updatePlayUI();
                persistState({}, { immediate: true });
            });

            prevButton.addEventListener("click", async () => {
                if (!validTracks.length) return;
                const baseIndex = activeIndex < 0 ? 0 : activeIndex;
                const nextIndex = baseIndex <= 0 ? validTracks.length - 1 : baseIndex - 1;
                await setActiveTrack(nextIndex, { autoplay: true });
            });

            nextButton.addEventListener("click", async () => {
                if (!validTracks.length) return;
                const baseIndex = activeIndex < 0 ? -1 : activeIndex;
                const nextIndex = baseIndex >= validTracks.length - 1 ? 0 : baseIndex + 1;
                await setActiveTrack(nextIndex, { autoplay: true });
            });

            progressInput.addEventListener("pointerdown", () => {
                if (progressInput.disabled) return;
                isSeeking = true;
            });

            progressInput.addEventListener("pointerup", () => {
                if (progressInput.disabled) return;
                isSeeking = false;
            });

            progressInput.addEventListener("input", () => {
                if (progressInput.disabled) return;
                const nextValue = Number(progressInput.value);
                currentTimeEl.textContent = formatTime(nextValue);
                const maxValue = Number(progressInput.max) || 0;
                const percent = maxValue > 0 ? Math.min((nextValue / maxValue) * 100, 100) : 0;
                progressInput.style.setProperty("--progress", `${percent}%`);
            });

            progressInput.addEventListener("change", () => {
                if (progressInput.disabled) return;
                const nextValue = Number(progressInput.value);
                if (Number.isFinite(nextValue)) audio.currentTime = Math.max(0, nextValue);
                isSeeking = false;
                updateProgressUI();
                persistState({}, { immediate: true });
            });

            volumeSlider.addEventListener("input", () => {
                const value = clamp(Number(volumeSlider.value), 0, 1);
                audio.volume = value;
                if (value > 0) {
                    lastNonZeroVolume = value;
                    if (audio.muted) audio.muted = false;
                } else {
                    audio.muted = true;
                }
                updateVolumeUI();
                persistState({}, { immediate: true });
            });

            volumeButton.addEventListener("click", () => {
                if (audio.muted || audio.volume === 0) {
                    audio.muted = false;
                    audio.volume = lastNonZeroVolume || 0.7;
                } else {
                    audio.muted = true;
                }
                updateVolumeUI();
                persistState({}, { immediate: true });
            });

            panelButton.addEventListener("click", () => setPanelOpen(!panelOpen));

            document.addEventListener(
                "pointerdown",
                (event) => {
                    if (!panelOpen) return;
                    if (player.contains(event.target)) return;
                    setPanelOpen(false);
                },
                { capture: true },
            );

            document.addEventListener("keydown", (event) => {
                if (!panelOpen) return;
                if (event.key !== "Escape") return;
                setPanelOpen(false);
            });

            audio.addEventListener("play", () => {
                updatePlayUI();
                persistState({}, { immediate: true });
            });
            audio.addEventListener("playing", () => {
                statusOverride = "";
                updatePlayUI();
            });
            audio.addEventListener("waiting", () => {
                if (!audio.paused && !audio.ended) {
                    statusOverride = "Chargement...";
                    updatePlayUI();
                }
            });
            audio.addEventListener("error", () => {
                const code = audio.error?.code;
                if (code === 4) statusOverride = "Fichier introuvable ou format non support\u00e9";
                else statusOverride = "Erreur de lecture";
                updatePlayUI();
            });
            audio.addEventListener("pause", () => {
                statusOverride = "";
                updatePlayUI();
                persistState({}, { immediate: true });
            });
            audio.addEventListener("ended", async () => {
                statusOverride = "";
                updatePlayUI();
                persistState({}, { immediate: true });
                if (!validTracks.length) return;
                const hasNext = activeIndex < validTracks.length - 1;
                const nextIndex = hasNext ? activeIndex + 1 : 0;
                await setActiveTrack(nextIndex, { autoplay: true });
            });
            audio.addEventListener("timeupdate", () => {
                updateProgressUI();
                persistState();
            });
            audio.addEventListener("durationchange", updateProgressUI);
            audio.addEventListener("loadedmetadata", updateProgressUI);
            audio.addEventListener("volumechange", () => {
                updateVolumeUI();
                persistState({}, { immediate: true });
            });
        }
    }
};
