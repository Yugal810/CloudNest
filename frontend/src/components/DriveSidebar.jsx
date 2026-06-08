import React from "react";
import {
    HardDrive,
    Settings,
    Keyboard,
    HelpCircle,
    Bell,
    Sun,
    Moon,
    Monitor,
    Sparkles,
    Upload,
    Loader2,
    FolderPlus,
    X,
} from "lucide-react";

export default function DriveSidebar({
    onHome,
    onNewFolder,
    onAddFiles,
    uploading,
    themeMode,
    onThemeMode,
    onOpenSettings,
    onOpenShortcuts,
    onOpenHelp,
    mobileOpen = false,
    onClose,
}) {
    const wrapAction = (action) => () => {
        action?.();
        onClose?.();
    };

    const GhostBtn = ({ onClick, icon: Icon, label, title: t, disabled }) => (
        <button
            type="button"
            onClick={wrapAction(onClick)}
            disabled={disabled}
            title={t || label}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--drive-text)] transition-colors hover:bg-[var(--drive-hover)] touch-manipulation min-h-[44px] disabled:cursor-not-allowed disabled:opacity-45"
        >
            <Icon size={20} strokeWidth={2} className="shrink-0" />
            <span className="truncate">{label}</span>
        </button>
    );

    const NavBtn = ({ onClick, icon: Icon, label, primary, title: t, disabled }) => (
        <button
            type="button"
            onClick={wrapAction(onClick)}
            disabled={disabled}
            title={t || label}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                primary
                    ? "bg-[var(--drive-primary)] text-white hover:opacity-95 disabled:opacity-60"
                    : "text-[var(--drive-text)] hover:bg-[var(--drive-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            }`}
        >
            <Icon size={20} strokeWidth={2} className={`shrink-0 ${primary ? "text-white" : ""}`} />
            <span className="truncate">{label}</span>
        </button>
    );

    const ThemeSegment = () => (
        <div className="flex rounded-lg border border-[var(--drive-border)] bg-[var(--drive-muted)] p-1" role="group" aria-label="Theme">
            {[
                { id: "light", icon: Sun, label: "Light" },
                { id: "system", icon: Monitor, label: "Auto" },
                { id: "dark", icon: Moon, label: "Dark" },
            ].map(({ id, icon: Icon, label }) => (
                <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={wrapAction(() => onThemeMode(id))}
                    className={`flex flex-1 items-center justify-center rounded-md py-2 transition-colors touch-manipulation min-h-[40px] ${
                        themeMode === id
                            ? "bg-[var(--drive-surface)] text-[var(--drive-primary)] shadow-sm"
                            : "text-[var(--drive-text-secondary)] hover:text-[var(--drive-text)]"
                    }`}
                >
                    <Icon size={18} strokeWidth={2} />
                    <span className="ml-1.5 hidden text-xs font-medium xl:inline">{label}</span>
                </button>
            ))}
        </div>
    );

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 flex min-h-dvh w-[min(88vw,280px)] max-w-[280px] shrink-0 flex-col border-r border-[var(--drive-border)] bg-[var(--drive-header)] shadow-[var(--drive-shadow)] transition-transform duration-300 ease-out md:static md:z-auto md:w-[272px] md:max-w-none md:translate-x-0 ${
                mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            }`}
            aria-label="Side navigation"
        >
            <div className="flex items-center gap-2 border-b border-[var(--drive-border)] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <button
                    type="button"
                    onClick={wrapAction(onHome)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1.5 text-left outline-none ring-[var(--drive-focus-ring)] focus-visible:ring-2"
                    title="CloudNest — Home"
                >
                    <div className="shrink-0 rounded-lg bg-[var(--drive-primary)] p-2 text-white">
                        <HardDrive size={22} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold tracking-tight text-[var(--drive-text)]">CloudNest</p>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-2 text-[var(--drive-text-secondary)] transition-colors hover:bg-[var(--drive-hover)] md:hidden touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                    aria-label="Close menu"
                >
                    <X size={20} strokeWidth={2} />
                </button>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-3" aria-label="Workspace">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--drive-text-secondary)]">Workspace</p>
                <NavBtn onClick={onHome} icon={Sparkles} label="My Drive" primary title="My Drive — Home" />

                <p className="mt-2 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--drive-text-secondary)]">Files</p>
                <GhostBtn
                    onClick={onNewFolder}
                    icon={FolderPlus}
                    label="New folder"
                    title="Create a new folder in the current location"
                />
                <button
                    type="button"
                    onClick={wrapAction(onAddFiles)}
                    disabled={uploading}
                    title="Add files"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--drive-text)] transition-colors hover:bg-[var(--drive-hover)] touch-manipulation min-h-[44px] disabled:cursor-wait disabled:opacity-60"
                >
                    {uploading ? (
                        <Loader2 size={20} strokeWidth={2} className="shrink-0 animate-spin text-[var(--drive-primary)]" />
                    ) : (
                        <Upload size={20} strokeWidth={2} className="shrink-0" />
                    )}
                    <span className="truncate">{uploading ? "Uploading…" : "Add files"}</span>
                </button>

                <div className="my-2 mx-2 h-px bg-[var(--drive-border)]" />

                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--drive-text-secondary)]">Platform</p>
                <GhostBtn onClick={onOpenSettings} icon={Settings} label="Settings" />
                <GhostBtn onClick={onOpenShortcuts} icon={Keyboard} label="Keyboard shortcuts" />
                <GhostBtn onClick={onOpenHelp} icon={HelpCircle} label="Help & tips" />
                <button
                    type="button"
                    disabled
                    title="Notifications sync with your account in a future update"
                    className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--drive-text-secondary)] opacity-60"
                >
                    <Bell size={20} className="shrink-0" />
                    <span>Notifications</span>
                </button>

                <div className="mt-2 px-1">
                    <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--drive-text-secondary)]">Appearance</p>
                    <ThemeSegment />
                </div>
            </nav>
        </aside>
    );
}
