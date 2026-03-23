import React, { useEffect, useState, useRef, useMemo } from 'react';
import api from '../api';
import { getStoredTheme, setStoredTheme, applyTheme } from '../lib/theme';
import {
    getCompactUi,
    setCompactUi as persistCompactUiPreference,
    getReduceMotion,
    setReduceMotion as persistReduceMotionPreference,
} from '../lib/preferences';
import DriveSidebar from '../components/DriveSidebar';
import PlatformSettingsModal from '../components/PlatformSettingsModal';
import ShortcutsModal from '../components/ShortcutsModal';
import HelpModal from '../components/HelpModal';
import { 
  Folder, HardDrive, LogOut, Plus, Upload,
  ChevronRight, FileText, Trash2, Download, Loader2,
  ChevronDown, Search, X, Share2, Move, FolderPlus, Copy, ExternalLink, AlertTriangle, ArrowRight, CheckSquare, Square,
} from 'lucide-react';

export default function Dashboard({ logout }) {
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [user, setUser] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    /** When true, search results dropdown is visible (hidden on outside click) */
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const searchBarRef = useRef(null);
    const uploadInputRef = useRef(null);
    const overviewRef = useRef(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [themeMode, setThemeMode] = useState(() => getStoredTheme());
    const [compactUi, setCompactUi] = useState(() => getCompactUi());
    const [reduceMotion, setReduceMotion] = useState(() => getReduceMotion());

    // --- MODAL & ERROR STATES ---
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isMoveConfirmOpen, setIsMoveConfirmOpen] = useState(false); // New Move Confirmation
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const [newFolderName, setNewFolderName] = useState("");
    /** Files queued for move (one or many); each { id, name } */
    const [filesPendingMove, setFilesPendingMove] = useState([]);
    const [targetFolder, setTargetFolder] = useState(null); // Stores {id, name} of destination
    /** Items to delete: { id, name, type }[] */
    const [deleteTargets, setDeleteTargets] = useState([]);
    const [shareUrl, setShareUrl] = useState("");
    const [folderSearch, setFolderSearch] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    /** Which file tile has the action menu open (null = none) */
    const [fileActionsOpenId, setFileActionsOpenId] = useState(null);
    /** Multi-select file ids in current folder view */
    const [selectedFileIds, setSelectedFileIds] = useState([]);
    /** Batch share: list of { name, url } */
    const [batchShareLinks, setBatchShareLinks] = useState(null);

    useEffect(() => {
        fetchData();
        fetchUserProfile();
    }, []);

    useEffect(() => {
        setSelectedFileIds([]);
    }, [selectedFolder]);

    useEffect(() => {
        if (fileActionsOpenId === null) return;
        const handleDocClick = () => setFileActionsOpenId(null);
        const handleKey = (e) => { if (e.key === "Escape") setFileActionsOpenId(null); };
        document.addEventListener("click", handleDocClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("click", handleDocClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [fileActionsOpenId]);

    useEffect(() => {
        if (!showProfile) return;
        const close = () => setShowProfile(false);
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, [showProfile]);

    useEffect(() => {
        if (!searchDropdownOpen) return;
        const handlePointerDown = (e) => {
            if (searchBarRef.current && !searchBarRef.current.contains(e.target)) {
                setSearchDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [searchDropdownOpen]);

    useEffect(() => {
        document.documentElement.setAttribute("data-density", compactUi ? "compact" : "comfortable");
    }, [compactUi]);

    const handleThemeMode = (mode) => {
        setStoredTheme(mode);
        applyTheme(mode);
        setThemeMode(mode);
    };

    const handleCompactUi = (v) => {
        setCompactUi(v);
        persistCompactUiPreference(v);
    };

    const handleReduceMotionToggle = (v) => {
        setReduceMotion(v);
        persistReduceMotionPreference(v);
    };

    /** Logo / brand: reset to Home and scroll to top of drive (same page content, not duplicate nav) */
    const goDriveHome = () => {
        setSelectedFolder(null);
        setSearchQuery("");
        setSearchDropdownOpen(false);
        setShowProfile(false);
        requestAnimationFrame(() => {
            overviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    const fetchData = async () => {
        try {
            const res = await api.get('/folders/explorer');
            setFolders(res.data.folders || []);
            const allFiles = [...(res.data.root_files || []), ...(res.data.organized_files || [])];
            setFiles(allFiles);
        } catch (err) { console.error("Data Fetch Error:", err); } 
        finally { setLoading(false); }
    };

    const fetchUserProfile = async () => {
        try {
            const res = await api.get('/auth/me'); 
            setUser(res.data);
        } catch (err) { console.error("Profile Error:", err); }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        if (!newFolderName.trim()) return;
        try {
            const parentParam = selectedFolder ? `&parent_id=${selectedFolder.id}` : '';
            await api.post(`/folders/?name=${newFolderName}${parentParam}`);
            setNewFolderName("");
            setIsCreateModalOpen(false);
            fetchData();
        } catch (err) { setErrorMessage(err.response?.data?.detail || "An error occurred"); }
    };

    // --- MOVE LOGIC ---
    /** Drag-drop onto folder/home: confirm move for one file */
    const beginMoveWithDestination = (fileId, fileName, targetId, targetName) => {
        setFilesPendingMove([{ id: fileId, name: fileName }]);
        setTargetFolder({ id: targetId, name: targetName || "Home" });
        setIsMoveConfirmOpen(true);
    };

    const selectMoveDestination = (targetId, targetName) => {
        setTargetFolder({ id: targetId, name: targetName || "Home" });
        setIsMoveModalOpen(false);
        setIsMoveConfirmOpen(true);
    };

    const openMoveModalForFiles = (fileList) => {
        if (!fileList?.length) return;
        setFilesPendingMove(fileList);
        setIsMoveModalOpen(true);
    };

    const handleMoveExecution = async () => {
        if (!targetFolder || filesPendingMove.length === 0) return;
        try {
            for (const f of filesPendingMove) {
                await api.patch(`/${f.id}/move`, null, {
                    params: { new_folder_id: targetFolder.id },
                });
            }
            setIsMoveConfirmOpen(false);
            setIsMoveModalOpen(false);
            setFilesPendingMove([]);
            setSelectedFileIds([]);
            fetchData();
        } catch (err) {
            console.error("Move failed", err);
        }
    };

    const openShareModal = async (fileId) => {
        try {
            setBatchShareLinks(null);
            const res = await api.post(`/share/${fileId}`);
            setShareUrl(res.data.share_url);
            setIsShareModalOpen(true);
        } catch (err) {
            console.error("Sharing failed");
        }
    };

    const openBatchShareModal = async () => {
        if (selectedFileIds.length === 0) return;
        try {
            const results = [];
            for (const id of selectedFileIds) {
                const res = await api.post(`/share/${id}`);
                const f = files.find((x) => x.id === id);
                results.push({
                    name: f?.name || f?.filename || String(id),
                    url: res.data.share_url,
                });
            }
            setBatchShareLinks(results);
            setShareUrl("");
            setIsShareModalOpen(true);
        } catch (err) {
            console.error("Batch share failed", err);
        }
    };

    const confirmDeletion = (id, name, type) => {
        setDeleteTargets([{ id, name, type }]);
        setIsDeleteModalOpen(true);
    };

    const confirmBatchDeleteFiles = () => {
        const targets = selectedFileIds
            .map((id) => {
                const f = files.find((x) => x.id === id);
                return f
                    ? { id: f.id, name: f.name || f.filename, type: "file" }
                    : null;
            })
            .filter(Boolean);
        if (targets.length === 0) return;
        setDeleteTargets(targets);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (deleteTargets.length === 0) return;
        try {
            for (const item of deleteTargets) {
                const endpoint =
                    item.type === "folder" ? `/folders/${item.id}` : `/delete/${item.id}`;
                await api.delete(endpoint);
            }
            setIsDeleteModalOpen(false);
            setDeleteTargets([]);
            setSelectedFileIds([]);
            fetchData();
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const toggleFileSelection = (fileId, e) => {
        e?.stopPropagation?.();
        setSelectedFileIds((prev) =>
            prev.includes(fileId) ? prev.filter((x) => x !== fileId) : [...prev, fileId]
        );
    };

    const selectAllVisibleFiles = () => {
        setSelectedFileIds(filteredFiles.map((f) => f.id));
    };

    const clearFileSelection = () => setSelectedFileIds([]);

    const downloadSelectedFiles = () => {
        selectedFileIds.forEach((id, i) => {
            const f = files.find((x) => x.id === id);
            if (f) setTimeout(() => downloadFile(f), i * 200);
        });
    };

    const getBreadcrumbs = () => {
        const crumbs = [];
        let current = selectedFolder;
        while (current) {
            crumbs.unshift(current);
            current = folders.find(f => f.id === current.parent_id);
        }
        return crumbs;
    };

    /** Main grid: always reflects current folder only (not affected by search) */
    const filteredFolders = folders.filter(f => selectedFolder ? f.parent_id === selectedFolder.id : f.parent_id === null);

    const filteredFiles = files.filter(f => {
        if (selectedFolder) return f.folder_id === selectedFolder.id;
        return f.folder_id === null || f.folder_id === undefined;
    });

    /** Search dropdown: global matches across all folders & files */
    const searchTrim = searchQuery.trim();
    const { searchFolderHits, searchFileHits } = useMemo(() => {
        if (!searchTrim) return { searchFolderHits: [], searchFileHits: [] };
        const q = searchTrim.toLowerCase();
        return {
            searchFolderHits: folders.filter(f => f.name.toLowerCase().includes(q)),
            searchFileHits: files.filter(f => (f.name || f.filename).toLowerCase().includes(q)),
        };
    }, [searchTrim, folders, files]);

    /** Full path from Home to this folder, e.g. "Home / Documents / Work" */
    const getFolderPathString = (folder) => {
        if (!folder) return "Home";
        const names = [];
        let current = folder;
        while (current) {
            names.unshift(current.name);
            current =
                current.parent_id != null
                    ? folders.find((f) => f.id === current.parent_id)
                    : null;
        }
        return ["Home", ...names].join(" / ");
    };

    /** Full path including file name, e.g. "Home / Docs / report.pdf" */
    const getFilePathString = (file) => {
        const name = file.name || file.filename;
        const parent =
            file.folder_id != null && file.folder_id !== undefined
                ? folders.find((f) => f.id === file.folder_id)
                : null;
        if (!parent) return `Home / ${name}`;
        return `${getFolderPathString(parent)} / ${name}`;
    };

    const goToFolderFromSearch = (folder) => {
        setSelectedFolder(folder);
        setSearchQuery("");
        setSearchDropdownOpen(false);
    };

    const goToFileFromSearch = (file) => {
        const parent = file.folder_id != null && file.folder_id !== undefined
            ? folders.find(f => f.id === file.folder_id) ?? null
            : null;
        setSelectedFolder(parent);
        setSearchQuery("");
        setSearchDropdownOpen(false);
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const folderParam = selectedFolder ? `?folder_id=${selectedFolder.id}` : '';
            await api.post(`/upload${folderParam}`, formData);
            fetchData();
        } catch (err) { console.error("Upload failed"); } 
        finally { setUploading(false); }
    };

    const downloadFile = (file) => {
        const name = file.name || file.filename;
        api.get(`/download/${file.id}`, { responseType: 'blob' }).then(res => {
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            window.URL.revokeObjectURL(url);
        }).catch(() => {});
    };

    if (loading) return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--drive-bg)] gap-4 text-[var(--drive-primary)] px-4 pb-[env(safe-area-inset-bottom)]">
            <Loader2 className="animate-spin" size={40} strokeWidth={2} />
            <p className="text-sm text-[var(--drive-text-secondary)] font-medium">Loading…</p>
        </div>
    );

    return (
        <div className="flex min-h-dvh bg-[var(--drive-bg)] text-[var(--drive-text)] pb-[env(safe-area-inset-bottom)]">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-[var(--drive-surface)] focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-[var(--drive-text)] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--drive-primary)]"
            >
                Skip to content
            </a>

            <DriveSidebar
                onHome={goDriveHome}
                onNewFolder={() => {
                    setErrorMessage("");
                    setIsCreateModalOpen(true);
                }}
                onAddFiles={() => uploadInputRef.current?.click()}
                uploading={uploading}
                themeMode={themeMode}
                onThemeMode={handleThemeMode}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenShortcuts={() => setShortcutsOpen(true)}
                onOpenHelp={() => setHelpOpen(true)}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-40 flex min-h-14 items-center gap-1 border-b border-[var(--drive-border)] bg-[var(--drive-header)] px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-2 sm:px-4">
                    <div ref={searchBarRef} id="drive-search-section" className="relative z-40 min-w-0 flex-1 px-0.5 sm:px-2">
                        <label htmlFor="drive-search" className="sr-only">Search files and folders</label>
                        <div className="relative mx-auto flex w-full max-w-2xl items-center rounded-xl border border-[var(--drive-border)] bg-[var(--drive-surface)] shadow-[var(--drive-shadow)] transition focus-within:border-[var(--drive-primary)] focus-within:ring-2 focus-within:ring-[var(--drive-primary)]/20">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--drive-text-secondary)]" strokeWidth={2} />
                            <input
                                id="drive-search"
                                type="search"
                                enterKeyHint="search"
                                autoComplete="off"
                                placeholder="Search all folders and files…"
                                value={searchQuery}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setSearchQuery(v);
                                    setSearchDropdownOpen(v.trim().length > 0);
                                }}
                                onFocus={() => {
                                    if (searchQuery.trim().length > 0) setSearchDropdownOpen(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        setSearchQuery("");
                                        setSearchDropdownOpen(false);
                                    }
                                }}
                                className="w-full min-w-0 rounded-xl border-0 bg-transparent py-2.5 pl-11 pr-3 text-base text-[var(--drive-text)] placeholder:text-[var(--drive-placeholder)] outline-none focus:ring-0 sm:py-2 sm:text-sm"
                            />
                        </div>

                        {searchDropdownOpen && searchTrim ? (
                            <div
                                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,360px)] overflow-y-auto rounded-xl border border-[var(--drive-border)] bg-[var(--drive-surface)] py-2 shadow-lg"
                                role="listbox"
                                aria-label="Search results"
                            >
                                {searchFolderHits.length === 0 && searchFileHits.length === 0 ? (
                                    <p className="px-4 py-6 text-center text-sm text-[var(--drive-text-secondary)]">
                                        No results for “<span className="font-medium text-[var(--drive-text)]">{searchTrim}</span>”
                                    </p>
                                ) : (
                                    <>
                                        {searchFolderHits.length > 0 && (
                                            <div className="px-2 pb-1">
                                                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--drive-text-secondary)]">Folders</p>
                                                {searchFolderHits.map((folder) => (
                                                    <button
                                                        key={`sf-${folder.id}`}
                                                        type="button"
                                                        role="option"
                                                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--drive-hover)] active:bg-[var(--drive-muted)]"
                                                        onClick={() => goToFolderFromSearch(folder)}
                                                    >
                                                        <Folder className="mt-0.5 shrink-0 text-[var(--drive-folder)]" fill="currentColor" size={20} />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-medium text-[var(--drive-text)]">{folder.name}</span>
                                                            <span className="mt-0.5 block whitespace-normal break-words text-xs leading-snug text-[var(--drive-text-secondary)]" title={getFolderPathString(folder)}>
                                                                {getFolderPathString(folder)}
                                                            </span>
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchFileHits.length > 0 && (
                                            <div className="px-2 pt-1">
                                                {searchFolderHits.length > 0 ? <div className="mx-2 my-2 h-px bg-[var(--drive-border)]" /> : null}
                                                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--drive-text-secondary)]">Files</p>
                                                {searchFileHits.map((file) => (
                                                    <button
                                                        key={`sfile-${file.id}`}
                                                        type="button"
                                                        role="option"
                                                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--drive-hover)] active:bg-[var(--drive-muted)]"
                                                        onClick={() => goToFileFromSearch(file)}
                                                    >
                                                        <FileText className="mt-0.5 shrink-0 text-[var(--drive-primary)]" size={20} strokeWidth={2} />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-medium text-[var(--drive-text)]">{file.name || file.filename}</span>
                                                            <span className="mt-0.5 block whitespace-normal break-words text-xs leading-snug text-[var(--drive-text-secondary)]" title={getFilePathString(file)}>
                                                                {getFilePathString(file)}
                                                            </span>
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowProfile(!showProfile);
                            }}
                            className="flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-full py-1.5 pl-1 pr-2 transition-colors hover:bg-[var(--drive-hover)] sm:min-w-0 touch-manipulation"
                            aria-expanded={showProfile}
                            aria-haspopup="true"
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--drive-primary)] text-sm font-medium text-white">
                                {user?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="hidden max-w-[160px] text-left sm:block">
                                <p className="truncate text-sm font-medium leading-tight text-[var(--drive-text)]">{user?.name || "User"}</p>
                                <p className="truncate text-xs text-[var(--drive-text-secondary)]">{user?.email}</p>
                            </div>
                            <ChevronDown size={16} className={`shrink-0 text-[var(--drive-text-secondary)] transition ${showProfile ? "rotate-180" : ""}`} />
                        </button>
                        {showProfile && (
                            <div
                                className="absolute right-0 z-[60] mt-1 w-56 max-w-[calc(100vw-1rem)] rounded-lg border border-[var(--drive-border)] bg-[var(--drive-surface)] py-1 shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                                role="menu"
                            >
                                <div className="border-b border-[var(--drive-border)] px-4 py-3 sm:hidden">
                                    <p className="truncate text-sm font-medium text-[var(--drive-text)]">{user?.name || "User"}</p>
                                    <p className="truncate text-xs text-[var(--drive-text-secondary)]">{user?.email}</p>
                                </div>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setShowProfile(false);
                                        logout();
                                    }}
                                    className="flex w-full min-h-[44px] items-center gap-2 px-4 py-3 text-sm text-[var(--drive-danger)] transition-colors hover:bg-[var(--drive-danger-surface)] touch-manipulation"
                                >
                                    <LogOut size={18} /> Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <main id="main-content" tabIndex={-1} className="drive-main-padding mx-auto w-full min-w-0 max-w-[1200px] flex-1 overflow-x-hidden outline-none">
                <input ref={uploadInputRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} aria-hidden />
                <section ref={overviewRef} id="drive-overview" className="mb-6 sm:mb-8 scroll-mt-24 rounded-lg border border-[#dadce0] bg-white shadow-sm p-4 sm:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                            <h1 className="text-2xl sm:text-[28px] font-normal text-[#202124] tracking-tight">My Drive</h1>
                            <p className="text-sm text-[#5f6368] mt-1">Store, organize, and share your files.</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className="min-w-[100px] rounded-lg border border-[#dadce0] bg-[#f8f9fa] px-4 py-3">
                                <p className="text-xs text-[#5f6368] font-medium">Folders</p>
                                <p className="text-xl font-normal text-[#202124] tabular-nums">{folders.length}</p>
                            </div>
                            <div className="min-w-[100px] rounded-lg border border-[#dadce0] bg-[#f8f9fa] px-4 py-3">
                                <p className="text-xs text-[#5f6368] font-medium">Files</p>
                                <p className="text-xl font-normal text-[#202124] tabular-nums">{files.length}</p>
                            </div>
                            <div className="min-w-[140px] rounded-lg border border-[#dadce0] bg-[#f8f9fa] px-4 py-3">
                                <p className="text-xs text-[#5f6368] font-medium">Location</p>
                                <p className="text-base font-medium text-[#202124] truncate max-w-[200px]">{selectedFolder?.name || "Home"}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mb-6 sm:mb-8 min-w-0">
                    <div className="flex items-center gap-1 text-sm overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1 touch-pan-x w-full [scrollbar-width:thin]" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {/* --- IMPROVED HOME DROP TARGET --- */}
                        <span 
                            className="shrink-0 px-3 py-2 sm:py-1.5 rounded-md text-[#1a73e8] hover:bg-[#e8f0fe] cursor-pointer font-medium transition-colors touch-manipulation min-h-[44px] sm:min-h-0 inline-flex items-center" 
                            onClick={() => setSelectedFolder(null)}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('border-blue-500', 'bg-blue-100');
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                            }}
                            onDrop={(e) => { 
                                e.preventDefault(); 
                                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                                const fileId = e.dataTransfer.getData("fileId");
                                const fileName = e.dataTransfer.getData("fileName");
                                beginMoveWithDestination(fileId, fileName, null, "Home");
                            }}
                        >
                            HOME
                        </span>
                        {getBreadcrumbs().map((crumb, idx) => (
                            <React.Fragment key={crumb.id}>
                                <ChevronRight size={16} className="text-[#dadce0] shrink-0" />
                                <span className={`shrink-0 px-2 py-2 sm:py-1 rounded-md cursor-pointer text-sm font-medium transition-colors inline-flex items-center max-w-[200px] sm:max-w-none truncate touch-manipulation min-h-[44px] sm:min-h-0 ${idx === getBreadcrumbs().length - 1 ? "text-[#202124] bg-[#e8f0fe]" : "text-[#5f6368] hover:bg-[#f1f3f4]"}`} onClick={() => setSelectedFolder(crumb)} title={crumb.name}>{crumb.name}</span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="space-y-6 sm:space-y-8">
                    <section id="drive-folders" className="scroll-mt-24 rounded-lg border border-[#dadce0] bg-white shadow-sm p-4 sm:p-6 overflow-visible">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-sm font-medium text-[#202124]">Folders</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setErrorMessage("");
                                    setIsCreateModalOpen(true);
                                }}
                                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-md border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#202124] transition-colors hover:bg-[#f8f9fa] hover:border-[#bdc1c6] touch-manipulation min-h-[44px] sm:w-auto sm:min-h-0"
                            >
                                <Plus size={18} strokeWidth={2} className="text-[#1a73e8]" /> New folder
                            </button>
                        </div>
                        {filteredFolders.length === 0 ? (
                            <p className="text-sm text-[#5f6368] py-2">No folders here</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredFolders.map(folder => (
                                    <div 
                                        key={folder.id} 
                                        onClick={() => {setSelectedFolder(folder); setSearchQuery("");}} 
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#1a73e8"; }}
                                        onDragLeave={(e) => { e.currentTarget.style.borderColor = "#dadce0"; }}
                                        onDrop={(e) => { 
                                            e.preventDefault(); 
                                            e.currentTarget.style.borderColor = "#dadce0";
                                            const fileId = e.dataTransfer.getData("fileId");
                                            const fileName = e.dataTransfer.getData("fileName");
                                            beginMoveWithDestination(fileId, fileName, folder.id, folder.name);
                                        }} 
                                        className="group relative flex items-center justify-between gap-3 rounded-lg border border-[#dadce0] bg-white p-4 hover:bg-[#f8f9fa] hover:shadow-sm transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Folder className="text-[#f9ab00] shrink-0" fill="currentColor" size={28} />
                                            <span className="text-sm font-medium text-[#202124] truncate">{folder.name}</span>
                                        </div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); confirmDeletion(folder.id, folder.name, 'folder'); }} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 sm:p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 inline-flex items-center justify-center rounded-full text-[#5f6368] hover:bg-[#fce8e6] hover:text-[#d93025] transition-colors shrink-0 touch-manipulation" aria-label="Delete folder"><Trash2 size={18} strokeWidth={2} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section id="drive-files" className="scroll-mt-24 rounded-lg border border-[#dadce0] bg-white shadow-sm p-4 sm:p-6 overflow-visible">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                <h2 className="text-sm font-medium text-[#202124]">Files</h2>
                                {filteredFiles.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={selectAllVisibleFiles}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1a73e8] hover:bg-[#e8f0fe] rounded-md transition-colors touch-manipulation min-h-[40px] sm:min-h-0"
                                    >
                                        <CheckSquare size={16} /> Select all
                                    </button>
                                )}
                            </div>
                            <div className="flex w-full flex-wrap justify-end sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => uploadInputRef.current?.click()}
                                    disabled={uploading}
                                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white transition-colors touch-manipulation min-h-[44px] disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-h-0 bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#1557b0] shadow-sm disabled:bg-[#bdc1c6]"
                                >
                                    {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} strokeWidth={2} />}
                                    {uploading ? "Uploading…" : "Add files"}
                                </button>
                            </div>
                        </div>
                        {selectedFileIds.length > 0 && (
                            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[#1a73e8]/30 bg-[#e8f0fe]/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-medium text-[#202124]">
                                    {selectedFileIds.length} selected
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={openBatchShareModal}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-[#dadce0] bg-white px-3 py-2 text-xs font-medium text-[#202124] hover:bg-[#f8f9fa] touch-manipulation min-h-[40px]"
                                    >
                                        <Share2 size={16} className="text-[#137333]" /> Share
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const list = selectedFileIds
                                                .map((id) => {
                                                    const f = files.find((x) => x.id === id);
                                                    return f
                                                        ? { id: f.id, name: f.name || f.filename }
                                                        : null;
                                                })
                                                .filter(Boolean);
                                            openMoveModalForFiles(list);
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-[#dadce0] bg-white px-3 py-2 text-xs font-medium text-[#202124] hover:bg-[#f8f9fa] touch-manipulation min-h-[40px]"
                                    >
                                        <Move size={16} className="text-[#b06000]" /> Move
                                    </button>
                                    <button
                                        type="button"
                                        onClick={downloadSelectedFiles}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-[#dadce0] bg-white px-3 py-2 text-xs font-medium text-[#202124] hover:bg-[#f8f9fa] touch-manipulation min-h-[40px]"
                                    >
                                        <Download size={16} className="text-[#1a73e8]" /> Download
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmBatchDeleteFiles}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-[#fce8e6] bg-white px-3 py-2 text-xs font-medium text-[#d93025] hover:bg-[#fce8e6] touch-manipulation min-h-[40px]"
                                    >
                                        <Trash2 size={16} /> Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearFileSelection}
                                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] touch-manipulation min-h-[40px]"
                                    >
                                        <X size={16} /> Clear
                                    </button>
                                </div>
                            </div>
                        )}
                        {filteredFiles.length === 0 ? (
                            <div className="py-16 rounded-lg border border-dashed border-[#dadce0] flex flex-col items-center justify-center bg-[#fafafa]">
                                <FileText className="text-[#dadce0] mb-3" size={40} strokeWidth={1.5} />
                                <p className="text-sm text-[#5f6368]">No files</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 sm:gap-3">
                                {filteredFiles.map(file => {
                                    const displayName = file.name || file.filename;
                                    const menuOpen = fileActionsOpenId === file.id;
                                    const isSelected = selectedFileIds.includes(file.id);
                                    return (
                                        <div
                                            key={file.id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData("fileId", file.id);
                                                e.dataTransfer.setData("fileName", displayName);
                                                e.currentTarget.style.opacity = "0.4";
                                            }}
                                            onDragEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
                                            className={`relative rounded-lg border bg-white transition-colors select-none touch-manipulation md:cursor-grab md:active:cursor-grabbing ${
                                                menuOpen ? "border-[#1a73e8] shadow-md ring-1 ring-[#1a73e8]/30 z-[25]" : isSelected ? "border-[#1a73e8] bg-[#f8fbff] ring-1 ring-[#1a73e8]/20" : "border-[#dadce0] active:bg-[#f8f9fa] md:hover:bg-[#f8f9fa] md:hover:border-[#bdc1c6]"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                aria-label={isSelected ? "Deselect file" : "Select file"}
                                                className="absolute left-1.5 top-1.5 z-[30] rounded p-1 text-[#1a73e8] hover:bg-[#e8f0fe] touch-manipulation"
                                                onClick={(e) => toggleFileSelection(file.id, e)}
                                            >
                                                {isSelected ? (
                                                    <CheckSquare size={18} strokeWidth={2} className="fill-[#e8f0fe]" />
                                                ) : (
                                                    <Square size={18} strokeWidth={2} className="text-[#bdc1c6]" />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="w-full flex flex-col items-center gap-1 p-2 pt-3 pb-2 text-center min-h-[88px] sm:min-h-[76px] cursor-pointer touch-manipulation"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFileActionsOpenId((prev) => (prev === file.id ? null : file.id));
                                                }}
                                            >
                                                <div className="p-1.5 rounded-md bg-[#e8f0fe] text-[#1a73e8] pointer-events-none"><FileText size={20} strokeWidth={2} /></div>
                                                <span className="text-[11px] sm:text-xs font-medium text-[#202124] line-clamp-2 w-full break-words leading-snug" title={displayName}>
                                                    {displayName}
                                                </span>
                                            </button>

                                            {menuOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-[95] bg-black/40 md:hidden touch-manipulation"
                                                        aria-hidden
                                                        onClick={() => setFileActionsOpenId(null)}
                                                    />
                                                    <div
                                                        role="menu"
                                                        className="
                                                            z-[100] bg-white border border-[#dadce0] shadow-xl flex flex-col
                                                            fixed right-0 top-0 bottom-0 w-[min(88vw,300px)] max-w-[min(88vw,300px)]
                                                            rounded-l-xl rounded-r-none border-r-0
                                                            pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]
                                                            overflow-y-auto overflow-x-hidden
                                                            md:absolute md:left-full md:right-auto md:top-0 md:bottom-auto md:ml-1
                                                            md:w-52 md:max-w-[13rem] md:rounded-lg md:border md:border-[#dadce0] md:shadow-lg
                                                            md:py-1 md:max-h-[min(320px,70vh)] md:pt-1 md:pb-1 md:mt-0
                                                        "
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="md:hidden flex items-start justify-between gap-2 px-4 py-3 border-b border-[#f1f3f4] shrink-0">
                                                            <p className="text-sm font-medium text-[#202124] break-words flex-1 min-w-0" title={displayName}>{displayName}</p>
                                                            <button type="button" className="p-2 -mr-1 -mt-1 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] touch-manipulation shrink-0" aria-label="Close" onClick={() => setFileActionsOpenId(null)}>
                                                                <X size={20} />
                                                            </button>
                                                        </div>
                                                        <p className="hidden md:block px-3 pt-2 pb-1 text-xs font-medium text-[#5f6368] truncate border-b border-[#f1f3f4] mb-1">{displayName}</p>
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        className="w-full flex items-center gap-3 px-4 py-3.5 md:px-3 md:py-2.5 text-left text-base md:text-sm text-[#202124] hover:bg-[#f1f3f4] active:bg-[#e8eaed] touch-manipulation min-h-[48px] md:min-h-0"
                                                        onClick={() => { setFileActionsOpenId(null); openShareModal(file.id); }}
                                                    >
                                                        <Share2 size={18} className="text-[#137333] shrink-0" /> Share
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        className="w-full flex items-center gap-3 px-4 py-3.5 md:px-3 md:py-2.5 text-left text-base md:text-sm text-[#202124] hover:bg-[#f1f3f4] active:bg-[#e8eaed] touch-manipulation min-h-[48px] md:min-h-0"
                                                        onClick={() => { setFileActionsOpenId(null); openMoveModalForFiles([{ id: file.id, name: displayName }]); }}
                                                    >
                                                        <Move size={18} className="text-[#b06000] shrink-0" /> Move
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        className="w-full flex items-center gap-3 px-4 py-3.5 md:px-3 md:py-2.5 text-left text-base md:text-sm text-[#202124] hover:bg-[#f1f3f4] active:bg-[#e8eaed] touch-manipulation min-h-[48px] md:min-h-0"
                                                        onClick={() => { setFileActionsOpenId(null); downloadFile(file); }}
                                                    >
                                                        <Download size={18} className="text-[#1a73e8] shrink-0" /> Download
                                                    </button>
                                                    <div className="my-1 h-px bg-[#dadce0] mx-2 md:mx-0" />
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        className="w-full flex items-center gap-3 px-4 py-3.5 md:px-3 md:py-2.5 text-left text-base md:text-sm text-[#d93025] hover:bg-[#fce8e6] active:bg-[#fce8e6] touch-manipulation min-h-[48px] md:min-h-0"
                                                        onClick={() => { setFileActionsOpenId(null); confirmDeletion(file.id, displayName, 'file'); }}
                                                    >
                                                        <Trash2 size={18} className="shrink-0" /> Delete
                                                    </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>
            </div>

            <PlatformSettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                themeMode={themeMode}
                onThemeMode={handleThemeMode}
                compactUi={compactUi}
                onCompactUi={handleCompactUi}
                reduceMotion={reduceMotion}
                onReduceMotion={handleReduceMotionToggle}
            />
            <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
            <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

            {/* --- MOVE CONFIRMATION MODAL --- */}
            {isMoveConfirmOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 pb-[env(safe-area-inset-bottom)]">
                    <div className="bg-white w-full max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-[#dadce0] overflow-hidden p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#e8f0fe] text-[#1a73e8] rounded-lg"><Move size={22} strokeWidth={2} /></div>
                            <button type="button" onClick={() => { setIsMoveConfirmOpen(false); setFilesPendingMove([]); }} className="text-[#5f6368] hover:bg-[#f1f3f4] rounded-full p-1"><X size={20} /></button>
                        </div>
                        <h2 className="text-lg font-medium text-[#202124] mb-1">{filesPendingMove.length > 1 ? `Move ${filesPendingMove.length} files` : "Move file"}</h2>
                        <p className="text-sm text-[#5f6368] mb-4">Confirm where {filesPendingMove.length > 1 ? "these items" : "this item"} should go.</p>
                        <div className="flex flex-col items-center gap-2 p-4 bg-[#f8f9fa] rounded-lg border border-[#dadce0] mb-6 max-h-40 overflow-y-auto">
                            {filesPendingMove.length <= 3 ? (
                                filesPendingMove.map((f) => (
                                    <span key={f.id} className="text-sm font-medium text-[#1a73e8] text-center break-all w-full">{f.name}</span>
                                ))
                            ) : (
                                <span className="text-sm font-medium text-[#1a73e8] text-center">{filesPendingMove.length} files selected</span>
                            )}
                            <ArrowRight className="text-[#dadce0] shrink-0" size={18} />
                            <span className="text-xs text-[#5f6368]">Destination: <span className="font-medium text-[#202124]">{targetFolder?.name}</span></span>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 sm:justify-end">
                            <button type="button" onClick={() => { setIsMoveConfirmOpen(false); setFilesPendingMove([]); }} className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-md border border-[#dadce0] text-sm font-medium text-[#202124] hover:bg-[#f8f9fa] transition-colors touch-manipulation min-h-[44px] sm:min-h-0">Cancel</button>
                            <button type="button" onClick={handleMoveExecution} className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-md bg-[#1a73e8] text-white text-sm font-medium hover:bg-[#1557b0] transition-colors touch-manipulation min-h-[44px] sm:min-h-0">Move</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MOVE SELECTION MODAL --- */}
            {isMoveModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 pb-[env(safe-area-inset-bottom)]">
                    <div className="bg-white w-full max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-[#dadce0] overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-[#dadce0] flex justify-between items-center bg-[#f8f9fa]">
                            <div>
                                <h2 className="text-lg font-medium text-[#202124]">Move to…</h2>
                                <p className="text-xs text-[#5f6368] mt-0.5">Choose a folder</p>
                            </div>
                            <button type="button" onClick={() => { setIsMoveModalOpen(false); setFilesPendingMove([]); }} className="p-2 hover:bg-[#e8eaed] rounded-full text-[#5f6368]"><X size={20} /></button>
                        </div>
                        <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1">
                            {filesPendingMove.length > 1 && (
                                <p className="text-xs text-[#5f6368] mb-3">Moving {filesPendingMove.length} files to the folder you pick.</p>
                            )}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6368]" size={18} />
                                <input type="search" enterKeyHint="search" placeholder="Search folders" className="w-full pl-10 pr-3 py-3 sm:py-2 bg-[#f1f3f4] border border-transparent rounded-lg text-base sm:text-sm text-[#202124] outline-none focus:bg-white focus:border-[#1a73e8]" value={folderSearch} onChange={(e) => setFolderSearch(e.target.value)} />
                            </div>
                            <div className="max-h-[40vh] sm:max-h-64 overflow-y-auto space-y-1 pr-1">
                                <button type="button" onClick={() => selectMoveDestination(null, "Home")} className="w-full flex items-center gap-3 p-3 sm:p-3 min-h-[48px] hover:bg-[#e8f0fe] rounded-lg transition-colors border border-dashed border-[#dadce0] text-left touch-manipulation">
                                    <HardDrive className="text-[#1a73e8]" size={20} strokeWidth={2} />
                                    <span className="text-sm font-medium text-[#202124]">My Drive (Home)</span>
                                </button>
                                {folders.filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase())).map(folder => (
                                    <button type="button" key={folder.id} onClick={() => selectMoveDestination(folder.id, folder.name)} className="w-full flex items-center gap-3 p-3 min-h-[48px] hover:bg-[#f1f3f4] rounded-lg transition-colors text-left group touch-manipulation">
                                        <Folder className="text-[#f9ab00]" fill="currentColor" size={22} />
                                        <span className="text-sm font-medium text-[#202124] group-hover:text-[#1a73e8]">{folder.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SHARE MODAL --- */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 pb-[env(safe-area-inset-bottom)]">
                    <div className="bg-white w-full max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-[#dadce0] overflow-hidden p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#e6f4ea] text-[#137333] rounded-lg"><Share2 size={22} strokeWidth={2} /></div>
                            <button type="button" onClick={() => { setIsShareModalOpen(false); setBatchShareLinks(null); }} className="text-[#5f6368] hover:bg-[#f1f3f4] rounded-full p-1"><X size={20} /></button>
                        </div>
                        <h2 className="text-lg font-medium text-[#202124] mb-1">{batchShareLinks?.length ? "Get links" : "Get link"}</h2>
                        <p className="text-sm text-[#5f6368] mb-4">{batchShareLinks?.length ? "Anyone with a link can view that file." : "Anyone with the link can view the file."}</p>
                        {batchShareLinks?.length ? (
                            <ul className="space-y-3 mb-2 max-h-[50vh] overflow-y-auto pr-1">
                                {batchShareLinks.map((row, idx) => (
                                    <li key={idx} className="rounded-lg border border-[#dadce0] bg-[#f8f9fa] p-3">
                                        <p className="text-xs font-medium text-[#202124] truncate mb-2" title={row.name}>{row.name}</p>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                            <input readOnly value={row.url} className="flex-1 bg-white px-2 py-2 text-xs text-[#202124] outline-none min-w-0 rounded border border-[#dadce0] break-all" />
                                            <button type="button" onClick={() => navigator.clipboard.writeText(row.url)} className="p-2 text-[#1a73e8] hover:bg-[#e8f0fe] rounded-md shrink-0 touch-manipulation min-h-[40px]" title="Copy"><Copy size={18} /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-[#f8f9fa] rounded-lg border border-[#dadce0] mb-4">
                                    <input readOnly value={shareUrl} className="flex-1 bg-transparent px-2 py-2 text-sm text-[#202124] outline-none min-w-0 break-all sm:truncate" />
                                    <button type="button" onClick={() => navigator.clipboard.writeText(shareUrl)} className="p-3 sm:p-2 text-[#1a73e8] hover:bg-[#e8f0fe] rounded-md transition-colors shrink-0 touch-manipulation min-h-[44px] sm:min-h-0" title="Copy"><Copy size={18} /></button>
                                </div>
                                <a href={shareUrl} target="_blank" rel="noreferrer" className="w-full bg-[#1a73e8] text-white py-3 sm:py-2.5 rounded-md text-sm font-medium hover:bg-[#1557b0] transition-colors flex justify-center items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0">
                                   <ExternalLink size={18} /> Open link
                                </a>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* --- DELETE CONFIRMATION --- */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 pb-[env(safe-area-inset-bottom)]">
                    <div className="bg-white w-full max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-[#dadce0] overflow-hidden p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#fce8e6] text-[#d93025] rounded-lg"><AlertTriangle size={22} strokeWidth={2} /></div>
                            <button type="button" onClick={() => { setIsDeleteModalOpen(false); setDeleteTargets([]); }} className="text-[#5f6368] hover:bg-[#f1f3f4] rounded-full p-1"><X size={20} /></button>
                        </div>
                        <h2 className="text-lg font-medium text-[#202124] mb-2">Delete forever?</h2>
                        <p className="text-sm text-[#5f6368] mb-6">
                            {deleteTargets.length > 1 ? (
                                <>This will remove <span className="font-medium text-[#202124]">{deleteTargets.length} items</span> from your Drive.</>
                            ) : (
                                <>This will remove <span className="font-medium text-[#202124]">"{deleteTargets[0]?.name}"</span> from your Drive.</>
                            )}
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 sm:justify-end">
                            <button type="button" onClick={() => { setIsDeleteModalOpen(false); setDeleteTargets([]); }} className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-md border border-[#dadce0] text-sm font-medium text-[#202124] hover:bg-[#f8f9fa] touch-manipulation min-h-[44px] sm:min-h-0">Cancel</button>
                            <button type="button" onClick={handleDelete} className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-md bg-[#d93025] text-white text-sm font-medium hover:bg-[#c5221f] touch-manipulation min-h-[44px] sm:min-h-0">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE MODAL --- */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 pb-[env(safe-area-inset-bottom)]">
                    <div className="bg-white w-full max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-[#dadce0] overflow-hidden animate-in zoom-in-95 p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#e8f0fe] text-[#1a73e8] rounded-lg"><FolderPlus size={22} strokeWidth={2} /></div>
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-[#5f6368] hover:bg-[#f1f3f4] rounded-full p-1"><X size={20} /></button>
                        </div>
                        <h2 className="text-lg font-medium text-[#202124] mb-4">New folder</h2>
                        <form onSubmit={handleCreateFolder}>
                            <input autoFocus type="text" placeholder="Untitled folder" className={`w-full px-5 py-3 bg-[#f8f9fa] border rounded-lg outline-none text-base sm:text-sm text-[#202124] mb-2 transition-all ${errorMessage ? 'border-[#d93025]' : 'border-[#dadce0] focus:border-[#1a73e8] focus:bg-white'}`} value={newFolderName} onChange={(e) => {setNewFolderName(e.target.value); setErrorMessage("");}} />
                            {errorMessage && <p className="text-[#d93025] text-xs mb-4">{errorMessage}</p>}
                            <button type="submit" className="w-full bg-[#1a73e8] text-white py-3 sm:py-2.5 rounded-md text-sm font-medium hover:bg-[#1557b0] transition-colors mt-2 touch-manipulation min-h-[44px] sm:min-h-0">Create</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}