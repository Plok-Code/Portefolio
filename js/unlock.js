import { prefersReducedMotion } from './config.js';

const UNLOCK_SPEED_MULTIPLIER = 3;
const scaleUnlockDuration = (durationMs) => Math.max(1, durationMs / UNLOCK_SPEED_MULTIPLIER);

export const showPlayerUnlockFireworks = ({ text = "Let Play Music", durationMs = 5200 } = {}) => {
    const existing = document.querySelector("[data-unlock-fireworks]");
    if (existing) existing.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "unlock-fireworks";
    wrapper.dataset.unlockFireworks = "1";
    wrapper.innerHTML = `<canvas class="unlock-fireworks__canvas" aria-hidden="true"></canvas>`;
    document.body.appendChild(wrapper);

    let doneResolved = false;
    let resolveDone = null;
    const done = new Promise((resolve) => {
        resolveDone = () => {
            if (doneResolved) return;
            doneResolved = true;
            resolve();
        };
    });

    const removeWrapper = () => {
        if (wrapper.isConnected) wrapper.remove();
    };

    const canvas = wrapper.querySelector("canvas");
    const ctx = canvas?.getContext?.("2d", { alpha: true });
    if (!canvas || !ctx) {
        removeWrapper();
        resolveDone?.();
        return done;
    }

    let width = 0;
    let height = 0;

    const setCanvasSize = () => {
        const dpr = window.devicePixelRatio || 1;
        width = window.innerWidth || 0;
        height = window.innerHeight || 0;
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    };

    setCanvasSize();

    const textFontFamily = `"Bebas Neue", "Inter", system-ui, sans-serif`;
    const fitTextFontSize = (context, value, initialSize, maxWidth, { minSize = 28 } = {}) => {
        let size = Number.isFinite(initialSize) ? initialSize : 42;
        const min = Number.isFinite(minSize) ? minSize : 28;
        const iterations = 14;
        for (let i = 0; i < iterations; i++) {
            context.font = `900 ${Math.max(min, size)}px ${textFontFamily}`;
            const measured = context.measureText(String(value || "")).width || 0;
            if (measured <= maxWidth) break;
            const next = Math.floor(size * 0.92);
            if (next >= size) size -= 1;
            else size = next;
            if (size <= min) {
                size = min;
                break;
            }
        }
        return Math.max(min, size);
    };

    if (prefersReducedMotion) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const baseSize = Math.round(Math.max(Math.min(width * 0.1, 96), 46));
        const fontSize = fitTextFontSize(ctx, text, baseSize, width * 0.92, { minSize: 28 });
        ctx.font = `900 ${fontSize}px ${textFontFamily}`;
        ctx.fillText(text, width / 2, height * 0.34);

        wrapper.classList.add("is-out");
        window.setTimeout(() => resolveDone?.(), scaleUnlockDuration(420));
        window.setTimeout(removeWrapper, scaleUnlockDuration(900));
        return done;
    }

    const tau = Math.PI * 2;
    const neonHues = [0, 18, 35, 55, 95, 140, 185, 210, 255, 290, 320];
    const pickHue = () => neonHues[(Math.random() * neonHues.length) | 0] + (Math.random() * 16 - 8);

    const rockets = [];
    const particles = [];

    const makeColor = (hue, alpha) => `hsla(${hue}, 100%, 62%, ${alpha})`;

    const spawnBurst = (x, y, hue, { count = 60, speedMin = 4, speedMax = 12 } = {}) => {
        const baseHue = Number.isFinite(hue) ? hue : pickHue();
        for (let i = 0; i < count; i++) {
            const a = Math.random() * tau;
            const s = speedMin + Math.random() * (speedMax - speedMin);
            particles.push({
                type: "burst",
                x,
                y,
                lastX: x,
                lastY: y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                hue: baseHue + (Math.random() * 40 - 20),
                life: 1,
                decay: 0.012 + Math.random() * 0.016,
                width: 1.8 + Math.random() * 1.4,
            });
        }
    };

    const spawnRocket = () => {
        rockets.push({
            x: width * (0.12 + Math.random() * 0.76),
            y: height + 18,
            lastX: 0,
            lastY: 0,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -(10 + Math.random() * 4.5),
            hue: pickHue(),
        });
    };

    const buildTextTargets = () => {
        const bufferW = Math.min(980, Math.max(320, Math.round(width * 0.92)));
        const buffer = document.createElement("canvas");
        buffer.width = bufferW;
        buffer.height = 1;
        const bctx = buffer.getContext("2d");
        if (!bctx) return [];

        const baseSize = Math.round(Math.max(Math.min(width * 0.11, 110), 52));
        const minSize = width < 360 ? 26 : 30;
        const fontSize = fitTextFontSize(bctx, text, baseSize, bufferW * 0.92, { minSize });
        const bufferH = Math.round(fontSize * 1.25);
        buffer.height = bufferH;

        bctx.clearRect(0, 0, bufferW, bufferH);
        bctx.fillStyle = "#fff";
        bctx.textAlign = "center";
        bctx.textBaseline = "middle";
        bctx.font = `900 ${fontSize}px ${textFontFamily}`;
        bctx.fillText(text, bufferW / 2, bufferH / 2);

        const pixels = bctx.getImageData(0, 0, bufferW, bufferH).data;
        const step = width < 520 ? 7 : 6;
        const points = [];
        for (let y = 0; y < bufferH; y += step) {
            for (let x = 0; x < bufferW; x += step) {
                const alpha = pixels[(y * bufferW + x) * 4 + 3];
                if (alpha > 160) points.push({ x, y });
            }
        }

        const maxPoints = width < 520 ? 700 : 1100;
        if (points.length > maxPoints) {
            const ratio = maxPoints / points.length;
            return points.filter(() => Math.random() < ratio).map((p) => ({ x: p.x, y: p.y, w: bufferW, h: bufferH }));
        }

        return points.map((p) => ({ x: p.x, y: p.y, w: bufferW, h: bufferH }));
    };

    const spawnTextFirework = () => {
        const rawTargets = buildTextTargets();
        if (!rawTargets.length) return false;

        const bufferW = rawTargets[0].w;
        const bufferH = rawTargets[0].h;
        const offsetX = (width - bufferW) / 2;
        const centerY = height * 0.32;
        const offsetY = centerY - bufferH / 2;
        const targets = rawTargets.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));

        const originX = width * (0.35 + Math.random() * 0.3);
        const originY = height * 0.72;
        spawnBurst(originX, originY, pickHue(), { count: 90, speedMin: 6, speedMax: 13 });

        for (const target of targets) {
            const angle = Math.random() * tau;
            const speed = 1.5 + Math.random() * 6;
            const hue = pickHue();
            particles.push({
                type: "text",
                x: originX,
                y: originY,
                lastX: originX,
                lastY: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 5,
                tx: target.x,
                ty: target.y,
                hue,
                life: 1,
                decay: 0.006 + Math.random() * 0.003,
                width: 2.1 + Math.random() * 1.6,
                hold: 140 + Math.random() * 90,
                arrived: false,
            });
        }

        return true;
    };

    const updateParticle = (p, dt) => {
        p.lastX = p.x;
        p.lastY = p.y;

        if (p.type === "burst") {
            p.vy += 0.22 * dt;
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;
            return;
        }

        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.hypot(dx, dy) || 0;

        if (!p.arrived) {
            const maxSpeed = 12;
            const nearRadius = 140;
            const desiredSpeed = dist > nearRadius ? maxSpeed : (maxSpeed * dist) / nearRadius;
            const inv = dist ? 1 / dist : 0;
            const desiredVx = dx * inv * desiredSpeed;
            const desiredVy = dy * inv * desiredSpeed;

            const steerX = desiredVx - p.vx;
            const steerY = desiredVy - p.vy;
            const maxForce = 0.62;
            p.vx += Math.max(-maxForce, Math.min(steerX, maxForce)) * dt;
            p.vy += Math.max(-maxForce, Math.min(steerY, maxForce)) * dt;

            p.vx *= 0.92;
            p.vy *= 0.92;

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (dist < 6) {
                p.arrived = true;
            }

            return;
        }

        if (p.hold > 0) {
            p.hold -= dt;
            const settleStrength = 0.09;
            p.vx += dx * settleStrength * dt;
            p.vy += dy * settleStrength * dt;
            p.vx *= 0.82;
            p.vy *= 0.82;
        } else {
            p.vy += 0.18 * dt;
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.life -= (p.decay || 0.012) * dt;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
    };

    const drawParticle = (p) => {
        const alpha = Math.max(0, Math.min(1, p.life));
        if (alpha <= 0) return;

        if (p.type === "burst") {
            ctx.strokeStyle = makeColor(p.hue, alpha);
            ctx.lineWidth = p.width;
            ctx.beginPath();
            ctx.moveTo(p.lastX, p.lastY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            return;
        }

        ctx.fillStyle = makeColor(p.hue, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.width, 0, tau);
        ctx.fill();
    };

    let cleanedUp = false;
    const cleanup = ({ immediate = false } = {}) => {
        if (cleanedUp) return;
        cleanedUp = true;
        window.removeEventListener("resize", setCanvasSize);
        resolveDone?.();

        if (immediate) {
            removeWrapper();
            return;
        }

        wrapper.classList.add("is-out");
        wrapper.addEventListener("transitionend", removeWrapper, { once: true });
        window.setTimeout(removeWrapper, scaleUnlockDuration(900));
    };

    window.addEventListener("resize", setCanvasSize, { passive: true });

    const start = performance.now();
    let last = start;
    let nextRocketAt = start + scaleUnlockDuration(50);
    let textSpawned = false;
    let textSpawnedOk = false;
    const textSpawnAt = start + scaleUnlockDuration(560);
    const endAt = start + scaleUnlockDuration(Math.max(1200, Number(durationMs) || 5200));

    const frame = (now) => {
        const dt = Math.min((now - last) / 16.666, 2) * UNLOCK_SPEED_MULTIPLIER;
        last = now;

        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = "lighter";

        if (now >= nextRocketAt && now < endAt - 400) {
            spawnRocket();
            nextRocketAt = now + scaleUnlockDuration(220 + Math.random() * 240);
        }

        if (!textSpawned && now >= textSpawnAt) {
            textSpawnedOk = spawnTextFirework();
            textSpawned = true;
        }

        for (let i = rockets.length - 1; i >= 0; i--) {
            const r = rockets[i];
            r.lastX = r.x;
            r.lastY = r.y;
            r.vy += 0.12 * dt;
            r.vx *= 0.995;
            r.x += r.vx * dt;
            r.y += r.vy * dt;

            ctx.strokeStyle = makeColor(r.hue, 0.9);
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(r.lastX, r.lastY);
            ctx.lineTo(r.x, r.y);
            ctx.stroke();

            const shouldExplode = r.vy >= 0 || r.y < height * 0.18;
            if (!shouldExplode) continue;

            spawnBurst(r.x, r.y, r.hue, { count: 70, speedMin: 6, speedMax: 14 });
            rockets.splice(i, 1);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            updateParticle(p, dt);
            drawParticle(p);
            if (p.life <= 0) particles.splice(i, 1);
        }

        if (textSpawnedOk) {
            const hasText = particles.some((p) => p.type === "text");
            if (!hasText) {
                cleanup({ immediate: true });
                return;
            }
        }

        const hasMore = now < endAt || rockets.length || particles.length;
        if (hasMore) {
            window.requestAnimationFrame(frame);
            return;
        }

        cleanup();
    };

    window.requestAnimationFrame(frame);
    return done;
};

export const showPlayerUnlockToast = ({ until = null } = {}) => {
    const existing = document.querySelector("[data-player-unlock-toast]");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "player-unlock-toast";
    toast.dataset.playerUnlockToast = "1";
    toast.innerHTML = `
    <div class="player-unlock-toast__inner" role="status" aria-live="polite">
      <div class="player-unlock-toast__title">Lecteur musical d\u00e9bloqu\u00e9</div>
    </div>
  `;

    document.body.appendChild(toast);

    const exitToast = () => {
        if (prefersReducedMotion) {
            toast.remove();
            return;
        }

        toast.classList.add("is-out");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
        window.setTimeout(() => toast.remove(), scaleUnlockDuration(800));
    };

    if (until && typeof until.then === "function") {
        until.finally(exitToast);
        return;
    }

    window.setTimeout(exitToast, scaleUnlockDuration(prefersReducedMotion ? 1200 : 2600));
};
