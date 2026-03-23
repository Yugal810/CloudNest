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
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('username', email); 
        formData.append('password', password);

        try {
            const res = await api.post('/auth/login', formData);
            onLogin(res.data.access_token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-dvh bg-[#f8f9fa] text-[#202124] flex flex-col pb-[env(safe-area-inset-bottom)]">
            <nav className="flex justify-between items-center gap-2 px-3 sm:px-8 min-h-14 py-2 sm:py-0 bg-white border-b border-[#dadce0] pt-[max(0.5rem,env(safe-area-inset-top))]">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 bg-[#1a73e8] text-white rounded-lg shrink-0">
                        <HardDrive size={22} strokeWidth={2} />
                    </div>
                    <span className="text-lg sm:text-[22px] font-normal tracking-tight truncate">CloudNest</span>
                </div>
                <Link
                    to="/signup"
                    className="text-sm font-medium text-[#1a73e8] hover:bg-[#e8f0fe] px-3 py-2.5 sm:py-2 rounded-md transition-colors shrink-0 touch-manipulation min-h-[44px] inline-flex items-center"
                >
                    Create account
                </Link>
            </nav>

            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 w-full min-w-0">
                <div className="max-w-[440px] w-full bg-white rounded-lg border border-[#dadce0] shadow-sm p-6 sm:p-10 mx-auto">
                    <div className="flex flex-col items-center mb-8 text-center">
                        <h1 className="text-2xl font-normal text-[#202124]">Sign in</h1>
                        <p className="text-sm text-[#5f6368] mt-2">to continue to CloudNest</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="relative">
                            <label className="block text-xs font-medium text-[#5f6368] mb-1.5">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6368]" size={18} />
                                <input 
                                    type="email" 
                                    placeholder="you@example.com" 
                                    required
                                    className="w-full pl-10 pr-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[#dadce0] rounded-md outline-none transition focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] text-[#202124] placeholder:text-[#80868b]"
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    inputMode="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-xs font-medium text-[#5f6368] mb-1.5">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6368]" size={18} />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="Enter your password" 
                                        required
                                        className="w-full pl-10 pr-11 py-3 sm:py-2.5 text-base sm:text-sm border border-[#dadce0] rounded-md outline-none transition focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] text-[#202124] placeholder:text-[#80868b]"
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] p-1 min-w-[44px] min-h-[44px] inline-flex items-center justify-center -mr-1"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Link to="/forgot-password" className="text-sm font-medium text-[#1a73e8] hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <button 
                                disabled={loading}
                                type="submit"
                                className="w-full py-3 sm:py-2.5 bg-[#1a73e8] text-white rounded-md text-sm font-medium hover:bg-[#1557b0] transition-colors flex justify-center items-center gap-2 disabled:opacity-70 touch-manipulation min-h-[48px] sm:min-h-0"
                            >
                                {loading ? (
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    <LogIn size={18} strokeWidth={2} />
                                )}
                                Next
                            </button>
                            
                            <div className="flex items-center justify-center gap-2 text-xs text-[#5f6368]">
                                <ShieldCheck size={14} className="text-[#137333]" />
                                Secure connection
                            </div>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[#dadce0] text-center">
                        <p className="text-sm text-[#5f6368]">
                            Don&apos;t have an account?{' '}
                            <Link to="/signup" className="text-[#1a73e8] font-medium hover:underline">Create one</Link>
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 pb-[env(safe-area-inset-bottom)]">
                    <div className="bg-white w-full max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-[#dadce0] overflow-hidden p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#fce8e6] text-[#d93025] rounded-lg">
                                <XCircle size={22} />
                            </div>
                            <button type="button" onClick={() => setError(null)} className="text-[#5f6368] hover:bg-[#f1f3f4] rounded-full p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <h2 className="text-lg font-medium text-[#202124] mb-2">Couldn&apos;t sign you in</h2>
                        <p className="text-sm text-[#5f6368] mb-6">{error}</p>
                        <button 
                            type="button"
                            onClick={() => setError(null)}
                            className="w-full py-3 sm:py-2.5 bg-[#1a73e8] text-white rounded-md text-sm font-medium hover:bg-[#1557b0] touch-manipulation min-h-[48px] sm:min-h-0"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
