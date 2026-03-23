import React, { useState, useEffect } from "react";
import {
    X,
    Settings,
    Sun,
    Moon,
    Monitor,
    Keyboard,
    Shield,
    Info,
    Sparkles,
    Eye,
    Contrast,
} from "lucide-react";

const TABS = [
    { id: "general", label: "General", icon: Settings },
    { id: "appearance", label: "Appearance", icon: Sparkles },
    { id: "accessibility", label: "Accessibility", icon: Eye },
    { id: "keyboard", label: "Keyboard", icon: Keyboard },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "about", label: "About", icon: Info },
];

export default function PlatformSettingsModal({
    open,
    onClose,
    themeMode,
    onThemeMode,
    compactUi,
    onCompactUi,
    reduceMotion,
    onReduceMotion,
}) {
    const [tab, setTab] = useState("general");

    useEffect(() => {
        if (open) setTab("general");
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[130] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-[var(--drive-overlay)]" aria-hidden onClick={onClose} />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
                className="relative flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--drive-border)] bg-[var(--drive-surface)] shadow-xl sm:rounded-2xl"
            >
                <div className="flex items-center justify-between border-b border-[var(--drive-border)] px-4 py-3 sm:px-6">
                    <h2 id="settings-title" className="text-lg font-medium text-[var(--drive-text)]">
                        Settings
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-[var(--drive-text-secondary)] hover:bg-[var(--drive-hover)]"
                        aria-label="Close settings"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                    <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--drive-border)] p-2 sm:w-48 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
                        {TABS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setTab(id)}
                                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors touch-manipulation min-h-[44px] sm:w-full ${
                                    tab === id
                                        ? "bg-[var(--drive-blue-tint)] text-[var(--drive-primary)]"
                                        : "text-[var(--drive-text-secondary)] hover:bg-[var(--drive-hover)] hover:text-[var(--drive-text)]"
                                }`}
                            >
                                <Icon size={18} className="shrink-0 opacity-90" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                        {tab === "general" && (
                            <div className="space-y-6">
                                <section>
                                    <h3 className="mb-3 text-sm font-semibold text-[var(--drive-text)]">Workspace</h3>
                                    <p className="text-sm leading-relaxed text-[var(--drive-text-secondary)]">
                                        Preferences are stored in this browser only. Signing out or clearing site data will reset
                                        them. Server-side preferences can be added when your backend exposes a profile API.
                                    </p>
                                </section>
                                <section>
                                    <h3 className="mb-3 text-sm font-semibold text-[var(--drive-text)]">Session</h3>
                                    <p className="text-sm text-[var(--drive-text-secondary)]">
                                        You’re signed in securely. Use your profile menu or the sidebar to sign out on shared
                                        devices.
                                    </p>
                                </section>
                            </div>
                        )}

                        {tab === "appearance" && (
                            <div className="space-y-6">
                                <section>
                                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--drive-text)]">
                                        <Contrast size={18} /> Theme
                                    </h3>
                                    <p className="mb-4 text-sm text-[var(--drive-text-secondary)]">
                                        Choose how CloudNest looks. “System” follows your OS light/dark mode.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: "light", icon: Sun, label: "Light" },
                                            { id: "system", icon: Monitor, label: "System" },
                                            { id: "dark", icon: Moon, label: "Dark" },
                                        ].map(({ id, icon: Icon, label }) => (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => onThemeMode(id)}
                                                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                                                    themeMode === id
                                                        ? "border-[var(--drive-primary)] bg-[var(--drive-blue-tint)] text-[var(--drive-primary)]"
                                                        : "border-[var(--drive-border)] bg-[var(--drive-muted)] text-[var(--drive-text)] hover:border-[var(--drive-text-secondary)]"
                                                }`}
                                            >
                                                <Icon size={18} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--drive-border)] bg-[var(--drive-muted)] p-4">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--drive-text)]">Compact density</p>
                                            <p className="mt-0.5 text-xs text-[var(--drive-text-secondary)]">
                                                Tighter spacing for power users and smaller screens.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={compactUi}
                                            onClick={() => onCompactUi(!compactUi)}
                                            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                                                compactUi ? "bg-[var(--drive-primary)]" : "bg-[var(--drive-border)]"
                                            }`}
                                        >
                                            <span
                                                className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                                                    compactUi ? "translate-x-6" : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}

                        {tab === "accessibility" && (
                            <div className="space-y-6">
                                <section>
                                    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--drive-border)] bg-[var(--drive-muted)] p-4">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--drive-text)]">Reduce motion</p>
                                            <p className="mt-0.5 text-xs text-[var(--drive-text-secondary)]">
                                                Minimize animations and transitions. You can still use the app fully.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={reduceMotion}
                                            onClick={() => onReduceMotion(!reduceMotion)}
                                            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                                                reduceMotion ? "bg-[var(--drive-primary)]" : "bg-[var(--drive-border)]"
                                            }`}
                                        >
                                            <span
                                                className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                                                    reduceMotion ? "translate-x-6" : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </section>
                                <p className="text-sm text-[var(--drive-text-secondary)]">
                                    We aim for sensible focus rings and touch targets (44px) throughout. Report issues from Help
                                    & tips.
                                </p>
                            </div>
                        )}

                        {tab === "keyboard" && (
                            <div className="space-y-4">
                                <p className="text-sm text-[var(--drive-text-secondary)]">
                                    Shortcuts work when focus is not inside a text field (unless noted).
                                </p>
                                <ul className="divide-y divide-[var(--drive-border)] rounded-xl border border-[var(--drive-border)] bg-[var(--drive-muted)]">
                                    {[
                                        ["Esc", "Close menus, file actions, mobile sidebar, or clear search"],
                                        ["/", "Focus search (when implemented globally)"],
                                        ["?", "Open shortcuts (from Help)"],
                                    ].map(([k, d]) => (
                                        <li key={k} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <kbd className="inline-flex min-w-[3rem] items-center justify-center rounded border border-[var(--drive-border)] bg-[var(--drive-surface)] px-2 py-1 font-mono text-xs text-[var(--drive-text)]">
                                                {k}
                                            </kbd>
                                            <span className="text-sm text-[var(--drive-text-secondary)]">{d}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {tab === "privacy" && (
                            <div className="space-y-4 text-sm leading-relaxed text-[var(--drive-text-secondary)]">
                                <p>
                                    <strong className="text-[var(--drive-text)]">Your files.</strong> File names and contents are
                                    handled by your CloudNest backend. This web app stores only UI preferences (theme, sidebar,
                                    etc.) in <code className="rounded bg-[var(--drive-muted)] px-1 text-xs">localStorage</code> in
                                    this browser.
                                </p>
                                <p>
                                    <strong className="text-[var(--drive-text)]">No extra tracking.</strong> This settings panel
                                    does not send analytics to third parties.
                                </p>
                                <p>
                                    Clear site data in your browser to remove local preferences. Use Sign out to invalidate your
                                    session token.
                                </p>
                            </div>
                        )}

                        {tab === "about" && (
                            <div className="space-y-4 text-sm text-[var(--drive-text-secondary)]">
                                <div className="rounded-xl border border-[var(--drive-border)] bg-[var(--drive-muted)] p-4">
                                    <p className="font-medium text-[var(--drive-text)]">CloudNest — flagship web client</p>
                                    <p className="mt-2">React · Vite · Tailwind CSS · Lucide</p>
                                    <p className="mt-1 text-xs">UI version 2.0 · No backend changes required for this panel.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
