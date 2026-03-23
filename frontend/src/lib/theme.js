const THEME_KEY = "drive-theme"; // "light" | "dark" | "system"

/** @returns {"light"|"dark"|"system"} */
export function getStoredTheme() {
    try {
        const v = localStorage.getItem(THEME_KEY);
        if (v === "light" || v === "dark" || v === "system") return v;
    } catch {
        /* ignore */
    }
    return "system";
}

export function setStoredTheme(mode) {
    try {
        localStorage.setItem(THEME_KEY, mode);
    } catch {
        /* ignore */
    }
}

function resolveDark(mode) {
    if (mode === "dark") return true;
    if (mode === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply theme to <html>: class "dark" when dark */
export function applyTheme(mode) {
    const root = document.documentElement;
    const dark = resolveDark(mode);
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
}

export function initTheme() {
    applyTheme(getStoredTheme());
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (getStoredTheme() === "system") applyTheme("system");
    });
}
