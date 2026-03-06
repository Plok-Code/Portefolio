export const playerStorageKey = "ina-player-state";
export const playerGlobalKey = "ina-player-global-enabled";

export const storage = (() => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
})();

export const readStoredPlayerState = () => {
    if (!storage) return null;
    try {
        const raw = storage.getItem(playerStorageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
    } catch {
        return null;
    }
};

export const writeStoredPlayerState = (state) => {
    if (!storage) return;
    try {
        storage.setItem(playerStorageKey, JSON.stringify(state));
    } catch {
        // Ignore storage errors.
    }
};

export const isGlobalPlayerEnabled = () => {
    if (!storage) return false;
    try {
        return storage.getItem(playerGlobalKey) === "1";
    } catch {
        return false;
    }
};

export const setGlobalPlayerEnabled = (enabled) => {
    if (!storage) return;
    try {
        if (enabled) storage.setItem(playerGlobalKey, "1");
        else storage.removeItem(playerGlobalKey);
    } catch {
        // Ignore storage errors.
    }
};
