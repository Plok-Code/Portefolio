import { initSparks } from './sparks.js';
import { initReveal, initRevealOnLoad } from './reveal.js';
import { ensureLightbox } from './lightbox.js';
import { initProjectRail } from './project-rail.js';
import { initCardDecks } from './decks.js';
import { initContactForms } from './contact.js';
import { initAudioPlayer, setSitePlayerVisible } from './audio-player.js';
import { setupPjax, setInitPageFeatures, hardNavigate } from './pjax.js';
import { showPlayerUnlockFireworks, showPlayerUnlockToast } from './unlock.js';
import { isGlobalPlayerEnabled, setGlobalPlayerEnabled } from './storage.js';

document.documentElement.classList.add("js");

const initPageFeatures = () => {
    initReveal();
    initRevealOnLoad();
    initProjectRail();
    ensureLightbox();
    initCardDecks();
    initContactForms();
    initAudioPlayer();
};

// Set pjax callback
setInitPageFeatures(initPageFeatures);

const initGlobals = () => {
    initSparks();
    setupPjax();

    document.addEventListener("click", (event) => {
        const button = event.target?.closest?.("[data-player-unlock]");
        if (!button) return;
        event.preventDefault();

        const wasEnabled = isGlobalPlayerEnabled();
        setGlobalPlayerEnabled(true);
        setSitePlayerVisible(true);

        if (button instanceof HTMLButtonElement) {
            button.disabled = true;
        }
        button.textContent = "Lecteur musical d\u00e9bloqu\u00e9";

        if (!wasEnabled) {
            initAudioPlayer(); // initialize the player now that it's enabled
            const fireworksDone = showPlayerUnlockFireworks({ text: "Let Play Music" });
            showPlayerUnlockToast({ until: fireworksDone });
        }
    });
};

// Kickoff
initPageFeatures();
initGlobals();
