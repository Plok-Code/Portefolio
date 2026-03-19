export const initArgGallery = () => {
    const gallery = document.querySelector("[data-arg-gallery]");
    if (!gallery) return;

    const slots = () => Array.from(gallery.querySelectorAll("[data-arg-slot]"));
    let draggedEl = null;
    let selectedEl = null;

    const checkTrigger = () => {
        const current = slots();
        const s0 = current[0]?.querySelector("img")?.src || "";
        const s1 = current[1]?.querySelector("img")?.src || "";
        if (s0.includes("arg2") && s1.includes("arg1")) {
            setTimeout(() => { window.location.href = "arg-entry.html"; }, 400);
        }
    };

    const swapElements = (a, b) => {
        if (a === b) return;
        const parentA = a.parentNode;
        const nextA = a.nextSibling;
        b.parentNode.insertBefore(a, b);
        parentA.insertBefore(b, nextA);
        checkTrigger();
    };

    const clearSelection = () => {
        if (selectedEl) {
            selectedEl.style.outline = "";
            selectedEl = null;
        }
    };

    for (const figure of slots()) {
        figure.setAttribute("tabindex", "0");
        figure.setAttribute("role", "button");
        figure.setAttribute("aria-label", "Image repositionnable");

        figure.addEventListener("dragstart", (e) => {
            draggedEl = figure;
            figure.style.opacity = "0.4";
            e.dataTransfer.effectAllowed = "move";
        });
        figure.addEventListener("dragend", () => {
            figure.style.opacity = "";
            draggedEl = null;
        });
        figure.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            figure.style.outline = "2px solid rgba(56, 189, 248, 0.4)";
        });
        figure.addEventListener("dragleave", () => {
            figure.style.outline = "";
        });
        figure.addEventListener("drop", (e) => {
            e.preventDefault();
            figure.style.outline = "";
            if (!draggedEl || draggedEl === figure) return;
            swapElements(draggedEl, figure);
        });
        figure.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!selectedEl) {
                selectedEl = figure;
                figure.style.outline = "2px solid rgba(56, 189, 248, 0.6)";
            } else if (selectedEl === figure) {
                clearSelection();
            } else {
                const other = selectedEl;
                clearSelection();
                swapElements(other, figure);
            }
        }, true);
        figure.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                figure.click();
                return;
            }
            const all = slots();
            const idx = all.indexOf(figure);
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                const next = all[idx + 1];
                if (next) next.focus();
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                const prev = all[idx - 1];
                if (prev) prev.focus();
            }
        });
    }
};
