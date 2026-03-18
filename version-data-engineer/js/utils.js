export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const formatTime = (value) => {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const whole = Math.floor(value);
    const minutes = Math.floor(whole / 60);
    const seconds = String(whole % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
};
