import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { 
  HardDrive, LogIn, Mail, Lock, Eye, EyeOff, ShieldCheck, XCircle, X
} from 'lucide-react';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null); // --- State for Popup Error ---
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null); // Reset error on new attempt
        
        const formData = new FormData();
        formData.append('username', email); 
        formData.append('password', password);

        try {
            const res = await api.post('/auth/login', formData);
            onLogin(res.data.access_token);
            navigate('/dashboard');
        } catch (err) {
            // --- REPLACE ALERT WITH POPUP STATE ---
            setError(err.response?.data?.detail || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Subtle Mesh Gradient Background */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 relative z-10">
                {/* Brand Identity */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="p-4 bg-blue-600 text-white rounded-2xl mb-4 shadow-xl shadow-blue-100">
                        <HardDrive size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight">DFS Cloud</h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">Your data, everywhere you go.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="relative group">
                        <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                        <input 
                            type="email" 
                            placeholder="Email Address" 
                            required
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-50 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-600 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="relative group">
                            <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Password" 
                                required
                                className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-50 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-600 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-4 text-gray-300 hover:text-blue-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <div className="flex justify-end px-1">
                            <Link to="/forgot-password" size={14} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                                Forgot Password?
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <button 
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <LogIn size={20} />
                            )}
                            SECURE LOG IN
                        </button>
                        
                        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            AES-256 End-to-End Encrypted
                        </div>
                    </div>
                </form>

                <div className="mt-10 pt-8 border-t border-gray-50 text-center">
                    <p className="text-sm text-gray-400 font-bold tracking-tight">
                        NEW TO THE SYSTEM? <Link to="/signup" className="text-blue-600 hover:text-blue-700">CREATE AN ACCOUNT</Link>
                    </p>
                </div>
            </div>

            {/* --- ERROR POPUP TAB --- */}
            {error && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 border border-red-50">
                        <div className="flex justify-between items-center mb-4">
                            <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                                <XCircle size={24} />
                            </div>
                            <button onClick={() => setError(null)} className="text-gray-300 hover:text-gray-500">
                                <X size={20} />
                            </button>
                        </div>
                        <h2 className="text-xl font-black text-gray-800 mb-1">Access Denied</h2>
                        <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">{error}</p>
                        <button 
                            onClick={() => setError(null)}
                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black hover:bg-black transition-all"
                        >
                            TRY AGAIN
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}