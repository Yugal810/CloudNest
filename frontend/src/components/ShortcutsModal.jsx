import React from "react";
import { X, Keyboard } from "lucide-react";

export default function ShortcutsModal({ open, onClose }) {
    if (!open) return null;
    const rows = [
        ["Esc", "Close dropdowns, file menu, side drawer, or clear search"],
        ["Tab", "Move focus between controls"],
    ];
    return (
        <div className="fixed inset-0 z-[130] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-[var(--drive-overlay)]" aria-hidden onClick={onClose} />
            <div
                role="dialog"
                aria-labelledby="shortcuts-title"
                className="relative w-full max-w-md rounded-t-2xl border border-[var(--drive-border)] bg-[var(--drive-surface)] p-6 shadow-xl sm:rounded-2xl"
            >
                <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-[var(--drive-blue-tint)] p-2 text-[var(--drive-primary)]">
                            <Keyboard size={22} />
                        </div>
                        <h2 id="shortcuts-title" className="text-lg font-medium text-[var(--drive-text)]">
                            Keyboard shortcuts
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--drive-text-secondary)] hover:bg-[var(--drive-hover)]" aria-label="Close">
                        <X size={22} />
                    </button>
                </div>
                <ul className="divide-y divide-[var(--drive-border)] rounded-xl border border-[var(--drive-border)] bg-[var(--drive-muted)]">
                    {rows.map(([k, d]) => (
                        <li key={k} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <kbd className="inline-flex min-w-[3rem] justify-center rounded border border-[var(--drive-border)] bg-[var(--drive-surface)] px-2 py-1 font-mono text-xs text-[var(--drive-text)]">
                                {k}
                            </kbd>
                            <span className="text-sm text-[var(--drive-text-secondary)]">{d}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
