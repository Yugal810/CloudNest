const SIDEBAR_KEY = "drive-sidebar-collapsed";
const COMPACT_KEY = "drive-compact-ui";
const REDUCE_MOTION_KEY = "drive-reduce-motion";

export function getSidebarCollapsed() {
    try {
        return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
        return false;
    }
}

export function setSidebarCollapsed(v) {
    try {
        localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
    } catch {
        /* ignore */
    }
}

export function getCompactUi() {
    try {
        return localStorage.getItem(COMPACT_KEY) === "1";
    } catch {
        return false;
    }
}

export function setCompactUi(v) {
    try {
        localStorage.setItem(COMPACT_KEY, v ? "1" : "0");
    } catch {
        /* ignore */
    }
}

export function getReduceMotion() {
    try {
        const v = localStorage.getItem(REDUCE_MOTION_KEY);
        if (v === "1") return true;
        if (v === "0") return false;
    } catch {
        /* ignore */
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setReduceMotion(v) {
    try {
        localStorage.setItem(REDUCE_MOTION_KEY, v ? "1" : "0");
    } catch {
        /* ignore */
    }
    document.documentElement.classList.toggle("drive-reduce-motion", v);
}

export function initPreferences() {
    document.documentElement.classList.toggle("drive-reduce-motion", getReduceMotion());
}
