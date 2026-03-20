import React, { useEffect, useState } from 'react';
import api from '../api';
import { 
  Folder, HardDrive, Upload, LogOut, Plus, 
  ChevronRight, FileText, Trash2, Download, Loader2,
  ChevronDown, Search, X, Share2, Move, FolderPlus, Copy, ExternalLink, AlertTriangle, ArrowRight
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

    // --- MODAL & ERROR STATES ---
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isMoveConfirmOpen, setIsMoveConfirmOpen] = useState(false); // New Move Confirmation
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const [newFolderName, setNewFolderName] = useState("");
    const [activeFile, setActiveFile] = useState(null); // Stores {id, name} of file being moved
    const [targetFolder, setTargetFolder] = useState(null); // Stores {id, name} of destination
    const [activeItem, setActiveItem] = useState(null); 
    const [shareUrl, setShareUrl] = useState("");
    const [folderSearch, setFolderSearch] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        fetchData();
        fetchUserProfile();
    }, []);

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
    const initiateMove = (fileId, fileName, targetId, targetName) => {
        setActiveFile({ id: fileId, name: fileName });
        setTargetFolder({ id: targetId, name: targetName || "Home" });
        setIsMoveConfirmOpen(true);
    };

    const handleMoveExecution = async () => {
        try {
            await api.patch(`/${activeFile.id}/move`, null, { 
                params: { new_folder_id: targetFolder.id } 
            });
            setIsMoveConfirmOpen(false);
            setIsMoveModalOpen(false);
            fetchData();
        } catch (err) { console.error("Move failed"); }
    };

    const openShareModal = async (fileId) => {
        try {
            const res = await api.post(`/share/${fileId}`);
            setShareUrl(res.data.share_url);
            setIsShareModalOpen(true);
        } catch (err) { console.error("Sharing failed"); }
    };

    const confirmDeletion = (id, name, type) => {
        setActiveItem({ id, name, type });
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            const endpoint = activeItem.type === 'folder' ? `/folders/${activeItem.id}` : `/delete/${activeItem.id}`;
            await api.delete(endpoint);
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (err) { console.error("Delete failed"); }
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

    const filteredFolders = searchQuery 
        ? folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : folders.filter(f => selectedFolder ? f.parent_id === selectedFolder.id : f.parent_id === null);

    const filteredFiles = searchQuery 
        ? files.filter(f => (f.name || f.filename).toLowerCase().includes(searchQuery.toLowerCase()))
        : files.filter(f => {
            if (selectedFolder) return f.folder_id === selectedFolder.id;
            return f.folder_id === null || f.folder_id === undefined;
        });

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

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-white gap-4 text-blue-600 font-bold">
            <Loader2 className="animate-spin" size={48} />
            <p className="tracking-widest text-sm uppercase opacity-40">Syncing Cloud...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <nav className="flex justify-between items-center px-10 py-5 bg-white border-b sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3 font-black text-2xl text-blue-600 cursor-pointer" onClick={() => {setSelectedFolder(null); setSearchQuery("");}}>
                    <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg"><HardDrive size={24} /></div>
                    <span>Cloud Storage</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-3 p-1.5 pr-4 hover:bg-gray-100 rounded-2xl transition">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold">
                                {user?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-bold text-gray-800 leading-none">{user?.name || "User"}</p>
                                <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase">{user?.email}</p>
                            </div>
                            <ChevronDown size={14} className={`text-gray-400 transition ${showProfile ? 'rotate-180' : ''}`} />
                        </button>
                        {showProfile && (
                            <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-100 rounded-3xl shadow-2xl p-3 z-50">
                                <button onClick={logout} className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition font-bold text-sm">
                                    <LogOut size={18}/> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <main className="p-10 max-w-7xl mx-auto">
                <div className="relative max-w-2xl mb-10 group">
                    <Search className="absolute left-5 top-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input type="text" placeholder="Search files or folder" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-14 pr-12 py-4 bg-white border border-gray-100 rounded-3xl shadow-sm outline-none transition-all font-medium" />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-2 text-sm">
                        {/* --- IMPROVED HOME DROP TARGET --- */}
                        <span 
                            className="bg-white border-2 border-transparent hover:border-blue-400 hover:bg-blue-50 px-4 py-2 rounded-xl text-gray-400 hover:text-blue-600 cursor-pointer font-black transition-all" 
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
                                initiateMove(fileId, fileName, null, "Home");
                            }}
                        >
                            HOME
                        </span>
                        {getBreadcrumbs().map((crumb, idx) => (
                            <React.Fragment key={crumb.id}>
                                <ChevronRight size={16} className="text-gray-300" />
                                <span className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold ${idx === getBreadcrumbs().length - 1 ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:bg-white border border-transparent hover:border-gray-50"}`} onClick={() => setSelectedFolder(crumb)}>{crumb.name}</span>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => {setErrorMessage(""); setIsCreateModalOpen(true);}} className="bg-white border border-gray-100 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-gray-50 transition shadow-sm font-bold text-gray-600 text-sm">
                            <Plus size={20} className="text-blue-600" /> New Folder
                        </button>
                        <label className={`px-6 py-3 rounded-2xl flex items-center gap-2 cursor-pointer shadow-xl transition-all font-bold text-white text-sm ${uploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
                            {uploading ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20}/>}
                            {uploading ? "UPLOADING..." : "UPLOAD"}
                            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                        </label>
                    </div>
                </div>

                <div className="space-y-16">
                    <section>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Directories</h3>
                        {filteredFolders.length === 0 ? (
                            <p className="text-sm font-bold text-gray-300 italic py-4">No more directory</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {filteredFolders.map(folder => (
                                    <div 
                                        key={folder.id} 
                                        onClick={() => {setSelectedFolder(folder); setSearchQuery("");}} 
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#3B82F6"; }}
                                        onDragLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
                                        onDrop={(e) => { 
                                            e.preventDefault(); 
                                            e.currentTarget.style.borderColor = "transparent";
                                            const fileId = e.dataTransfer.getData("fileId");
                                            const fileName = e.dataTransfer.getData("fileName");
                                            initiateMove(fileId, fileName, folder.id, folder.name);
                                        }} 
                                        className="group relative p-6 bg-white rounded-[2rem] border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-between shadow-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Folder className="text-yellow-400" fill="currentColor" size={32} />
                                            <span className="font-bold text-gray-700 text-lg">{folder.name}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); confirmDeletion(folder.id, folder.name, 'folder'); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Files</h3>
                        {filteredFiles.length === 0 ? (
                            <div className="py-20 bg-white rounded-[3rem] border border-dashed border-gray-100 flex flex-col items-center justify-center">
                                <FileText className="text-gray-100 mb-2" size={48} />
                                <p className="text-sm font-bold text-gray-300 italic">Empty</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2.5rem] border border-gray-50 overflow-hidden shadow-2xl">
                                <table className="w-full text-left">
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredFiles.map(file => (
                                            <tr 
                                                key={file.id} 
                                                draggable 
                                                onDragStart={(e) => { 
                                                    e.dataTransfer.setData("fileId", file.id); 
                                                    e.dataTransfer.setData("fileName", file.name || file.filename);
                                                    e.currentTarget.style.opacity = "0.4"; 
                                                }} 
                                                onDragEnd={(e) => { e.currentTarget.style.opacity = "1"; }} 
                                                className="hover:bg-blue-50/30 transition-colors group cursor-grab active:cursor-grabbing"
                                            >
                                                <td className="px-10 py-7 flex items-center gap-5">
                                                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><FileText size={24} /></div>
                                                    <p className="font-black text-gray-800 text-lg leading-tight">{file.name || file.filename}</p>
                                                </td>
                                                <td className="px-10 py-7 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => openShareModal(file.id)} className="p-3.5 text-emerald-600 hover:bg-emerald-50 rounded-2xl bg-white shadow-sm border border-gray-50"><Share2 size={20} /></button>
                                                        <button onClick={() => { setActiveFile({id: file.id, name: file.name || file.filename}); setIsMoveModalOpen(true); }} className="p-3.5 text-amber-600 hover:bg-amber-50 rounded-2xl bg-white shadow-sm border border-gray-50"><Move size={20} /></button>
                                                        <button onClick={() => api.get(`/download/${file.id}`, { responseType: 'blob' }).then(res => { const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = file.name || file.filename; a.click(); })} className="p-3.5 text-blue-600 hover:bg-blue-100 rounded-2xl bg-white shadow-sm border border-gray-50"><Download size={20} /></button>
                                                        <button onClick={() => confirmDeletion(file.id, file.name || file.filename, 'file')} className="p-3.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* --- MOVE CONFIRMATION MODAL --- */}
            {isMoveConfirmOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Move size={24} /></div>
                            <button onClick={() => setIsMoveConfirmOpen(false)} className="text-gray-400 hover:text-gray-600 transition-all"><X size={24} /></button>
                        </div>
                        <h2 className="text-xl font-black text-gray-800 mb-2">Confirm Move</h2>
                        <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-3xl mb-8">
                            <span className="font-black text-blue-600">{activeFile?.name}</span>
                            <ArrowRight className="text-gray-300" size={20} />
                            <span className="font-black text-gray-700 uppercase tracking-widest text-xs">Destination: {targetFolder?.name}</span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setIsMoveConfirmOpen(false)} className="flex-1 bg-white border border-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-50 transition-all">CANCEL</button>
                            <button onClick={handleMoveExecution} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">CONFIRM</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MOVE SELECTION MODAL --- */}
            {isMoveModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div><h2 className="text-xl font-black text-gray-800">Move Item</h2><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Select destination</p></div>
                            <button onClick={() => setIsMoveModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-red-500 transition-all shadow-sm"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-3.5 text-gray-300" size={18} />
                                <input type="text" placeholder="Filter folders..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl outline-none text-sm font-bold text-gray-700" value={folderSearch} onChange={(e) => setFolderSearch(e.target.value)} />
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                <button onClick={() => initiateMove(activeFile.id, activeFile.name, null, "Home")} className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 rounded-2xl transition-all border border-dashed border-gray-100 hover:border-blue-200">
                                    <HardDrive className="text-blue-500" size={20} />
                                    <span className="font-bold text-gray-500 text-[10px] tracking-widest uppercase">Move to Home</span>
                                </button>
                                {folders.filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase())).map(folder => (
                                    <button key={folder.id} onClick={() => initiateMove(activeFile.id, activeFile.name, folder.id, folder.name)} className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 rounded-2xl transition-all group">
                                        <Folder className="text-yellow-400" fill="currentColor" size={24} />
                                        <span className="font-bold text-gray-700 group-hover:text-blue-600 text-sm">{folder.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SHARE MODAL --- */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Share2 size={24} /></div>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-all"><X size={24} /></button>
                        </div>
                        <h2 className="text-xl font-black text-gray-800 mb-2">Share File</h2>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
                            <input readOnly value={shareUrl} className="flex-1 bg-transparent px-3 text-sm font-bold text-gray-600 outline-none truncate" />
                            <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="p-3 bg-white text-blue-600 rounded-xl shadow-sm hover:bg-blue-50 transition-all active:scale-95"><Copy size={18} /></button>
                        </div>
                        <a href={shareUrl} target="_blank" rel="noreferrer" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-2">
                           <ExternalLink size={18} /> OPEN LINK
                        </a>
                    </div>
                </div>
            )}

            {/* --- DELETE CONFIRMATION --- */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><AlertTriangle size={24} /></div>
                            <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-all"><X size={24} /></button>
                        </div>
                        <h2 className="text-xl font-black text-gray-800 mb-2">Delete?</h2>
                        <p className="text-sm text-gray-500 font-medium mb-8">Are you sure you want to delete <span className="text-red-600 font-black">"{activeItem?.name}"</span>?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-gray-50 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-100 transition-all">CANCEL</button>
                            <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-red-700 transition-all">DELETE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE MODAL --- */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FolderPlus size={24} /></div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>
                        <h2 className="text-xl font-black text-gray-800 mb-1">New Folder</h2>
                        <form onSubmit={handleCreateFolder}>
                            <input autoFocus type="text" placeholder="Enter folder name" className={`w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 mb-2 transition-all ${errorMessage ? 'border-red-100' : 'border-transparent focus:border-blue-50'}`} value={newFolderName} onChange={(e) => {setNewFolderName(e.target.value); setErrorMessage("");}} />
                            {errorMessage && <p className="text-red-500 text-[10px] font-black uppercase mb-6">{errorMessage}</p>}
                            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all mt-4">CREATE</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}