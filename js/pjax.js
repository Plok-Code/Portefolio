import { prefersReducedMotion } from './config.js';
import { isGlobalPlayerEnabled } from './storage.js';

let pjaxController = null;
let pjaxNavigationId = 0;

// Need a callback system or similar to re-init components after load
// We will export a variable that the main.js can set
export let initPageFeatures = () => { };
export const setInitPageFeatures = (fn) => { initPageFeatures = fn; };

export const replacePage = (nextDoc) => {
    const currentPage = document.querySelector(".page");
    const nextPage = nextDoc.querySelector(".page");
    if (!currentPage || !nextPage) return false;

    nextPage.querySelector("[data-site-player]")?.remove();

    const sitePlayer = document.querySelector("[data-site-player]");
    if (sitePlayer) sitePlayer.remove();

    const adoptedPage = document.importNode(nextPage, true);
    currentPage.replaceWith(adoptedPage);

    if (sitePlayer) document.body.appendChild(sitePlayer);

    document.title = nextDoc.title || document.title;
    initPageFeatures();
    return true;
};

export const pjaxLoad = async (url) => {
    const navigationId = ++pjaxNavigationId;
    pjaxController?.abort();
    const controller = new AbortController();
    pjaxController = controller;

    const response = await fetch(url, { signal: controller.signal, credentials: "same-origin" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let html = "";
    if (window.TextDecoder) {
        const buffer = await response.arrayBuffer();
        html = new TextDecoder("utf-8").decode(buffer);
    } else {
        html = await response.text();
    }
    if (navigationId !== pjaxNavigationId) return false;

    const nextDoc = new DOMParser().parseFromString(html, "text/html");
    return replacePage(nextDoc);
};

export const hardNavigate = (href) => {
    window.location.assign(href);
};

export const canPjaxNavigateTo = (url) => {
    if (!isGlobalPlayerEnabled()) return false;
    if (url.origin !== window.location.origin) return false;
    if (!url.pathname.toLowerCase().endsWith(".html")) return false;
    return true;
};

export const pjaxNavigate = async (href, { updateHistory = true } = {}) => {
    const url = new URL(href, window.location.href);

    if (!canPjaxNavigateTo(url)) {
        hardNavigate(url.href);
        return;
    }

    const current = new URL(window.location.href);
    if (url.pathname === current.pathname && url.search === current.search && url.hash) {
        hardNavigate(url.href);
        return;
    }

    const cleanUrl = new URL(url.href);
    cleanUrl.hash = "";

    try {
        const swapped = await pjaxLoad(cleanUrl.href);
        if (!swapped) return;

        if (updateHistory) history.pushState({ pjax: true }, "", url.href);
    } catch (error) {
        if (error?.name === "AbortError") return;
        hardNavigate(url.href);
        return;
    }

    if (url.hash) {
        const id = url.hash.slice(1);
        const target = id ? document.getElementById(id) : null;
        if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
        else window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
        return;
    }

    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
};

export const setupPjax = () => {
    document.addEventListener(
        "click",
        (event) => {
            if (event.defaultPrevented) return;
            if (event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (!isGlobalPlayerEnabled()) return;

            const anchor = event.target?.closest?.("a[href]");
            if (!anchor) return;
            if (anchor.target && anchor.target !== "_self") return;
            if (anchor.hasAttribute("download")) return;
            if (anchor.dataset.pjax === "off") return;

            const href = anchor.getAttribute("href");
            if (!href) return;
            if (href.startsWith("#")) return;

            const url = new URL(href, window.location.href);
            if (!canPjaxNavigateTo(url)) return;

            event.preventDefault();
            void pjaxNavigate(url.href);
        },
        { capture: true },
    );

    window.addEventListener("popstate", () => {
        if (!isGlobalPlayerEnabled()) {
            hardNavigate(window.location.href);
            return;
        }
        void pjaxNavigate(window.location.href, { updateHistory: false });
    });
};
