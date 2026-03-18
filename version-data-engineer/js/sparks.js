import { prefersReducedMotion, sparkColors } from './config.js';

export const createSpark = (x, y) => {
    if (prefersReducedMotion) return;
    const count = 6 + Math.random() * 4;
    for (let i = 0; i < count; i++) {
        const spark = document.createElement("div");
        spark.className = "fx-spark";
        const angle = Math.random() * Math.PI * 2;
        const velocity = 20 + Math.random() * 40;
        spark.style.left = `${x}px`;
        spark.style.top = `${y}px`;
        spark.style.setProperty("--tx", `${Math.cos(angle) * velocity}px`);
        spark.style.setProperty("--ty", `${Math.sin(angle) * velocity}px`);
        spark.style.backgroundColor = sparkColors[Math.floor(Math.random() * sparkColors.length)];
        document.body.appendChild(spark);
        spark.addEventListener("animationend", () => spark.remove());
    }
};

export const initSparks = () => {
    document.addEventListener("click", (e) => createSpark(e.clientX, e.clientY));
};
