import React from "react";
import { X, HelpCircle, Search, FolderOpen, Share2, MousePointer2 } from "lucide-react";

export default function HelpModal({ open, onClose }) {
    if (!open) return null;
    const tips = [
        { icon: Search, title: "Search everywhere", body: "Use the search bar to jump to any folder or file. Results show full paths." },
        { icon: FolderOpen, title: "Organize with folders", body: "Open folders from the grid or breadcrumbs. Drag files onto folders or Home to move them." },
        { icon: Share2, title: "Share links", body: "Open the file menu → Share to create a view link. Multi-select files to batch-share." },
        { icon: MousePointer2, title: "Multi-select", body: "Use checkboxes on file tiles for batch download, move, share, or delete." },
    ];
    return (
        <div className="fixed inset-0 z-[130] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-[var(--drive-overlay)]" aria-hidden onClick={onClose} />
            <div
                role="dialog"
                aria-labelledby="help-title"
                className="relative max-h-[min(85vh,560px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--drive-border)] bg-[var(--drive-surface)] p-6 shadow-xl sm:rounded-2xl"
            >
                <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-[var(--drive-blue-tint)] p-2 text-[var(--drive-primary)]">
                            <HelpCircle size={22} />
                        </div>
                        <h2 id="help-title" className="text-lg font-medium text-[var(--drive-text)]">
                            Help & tips
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--drive-text-secondary)] hover:bg-[var(--drive-hover)]" aria-label="Close">
                        <X size={22} />
                    </button>
                </div>
                <ul className="space-y-3">
                    {tips.map(({ icon: Icon, title, body }) => (
                        <li key={title} className="flex gap-3 rounded-xl border border-[var(--drive-border)] bg-[var(--drive-muted)] p-4">
                            <Icon size={20} className="mt-0.5 shrink-0 text-[var(--drive-primary)]" />
                            <div>
                                <p className="font-medium text-[var(--drive-text)]">{title}</p>
                                <p className="mt-1 text-sm text-[var(--drive-text-secondary)]">{body}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
