let lightboxReady = false;

export const ensureLightbox = () => {
    if (lightboxReady) return;
    lightboxReady = true;

    const overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Aper\u00e7u de l'image");
    overlay.setAttribute("data-lightbox-root", "");
    overlay.tabIndex = -1;

    const panel = document.createElement("div");
    panel.className = "lightbox__panel";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "lightbox__close";
    closeButton.setAttribute("aria-label", "Fermer");
    closeButton.textContent = "\u00d7";

    const image = document.createElement("img");
    image.className = "lightbox__img";
    image.alt = "";
    image.decoding = "async";

    const caption = document.createElement("div");
    caption.className = "lightbox__caption";
    caption.hidden = true;

    panel.append(closeButton, image, caption);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    let restoreFocusEl = null;

    const close = () => {
        if (!overlay.classList.contains("is-open")) return;
        overlay.classList.remove("is-open");
        document.body.classList.remove("is-lightbox-open");
        image.src = "";
        image.alt = "";
        caption.hidden = true;
        caption.textContent = "";

        if (restoreFocusEl && typeof restoreFocusEl.focus === "function") restoreFocusEl.focus();
        restoreFocusEl = null;
    };

    const open = (sourceImage) => {
        const src = sourceImage.currentSrc || sourceImage.src;
        if (!src) return;

        restoreFocusEl = document.activeElement;

        image.src = src;
        image.alt = sourceImage.alt || "";

        const rawCaption = (sourceImage.dataset.caption || sourceImage.alt || "").trim();
        if (rawCaption && rawCaption.length <= 160) {
            caption.textContent = rawCaption;
            caption.hidden = false;
        } else {
            caption.hidden = true;
            caption.textContent = "";
        }

        document.body.classList.add("is-lightbox-open");
        overlay.classList.add("is-open");
        window.setTimeout(() => closeButton.focus(), 0);
    };

    closeButton.addEventListener("click", close);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close();
    });

    overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
        }

        if (event.key === "Tab") {
            event.preventDefault();
            closeButton.focus();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        close();
    });

    document.addEventListener("click", (event) => {
        const target = event.target?.closest?.("img[data-lightbox]");
        if (!target) return;
        event.preventDefault();
        open(target);
    });
};
