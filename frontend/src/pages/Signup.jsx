import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { 
  HardDrive, UserPlus, Mail, Lock, User, 
  XCircle, CheckCircle, X, Loader2, Eye, EyeOff // Added Eye icons
} from 'lucide-react';

export default function Signup() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false); // --- State for Password Visibility ---
    const [loading, setLoading] = useState(false);
    
    const [popup, setPopup] = useState({ show: false, type: '', title: '', message: '' });
    const navigate = useNavigate();

    const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPopup({ show: false, type: '', title: '', message: '' });

    try {
        // Ensure these keys (name, email, password) match your Pydantic model
        const response = await api.post('/auth/signup', {
            name: formData.name, 
            email: formData.email,
            password: formData.password
        });

        setPopup({
            show: true,
            type: 'success',
            title: 'Account Created',
            message: 'Your DFS Cloud node is ready. Redirecting...'
        });
        setTimeout(() => navigate('/login'), 2500);

    } catch (err) {
        // This log will show you EXACTLY which field is failing in the console
        console.log("Validation Error Details:", err.response?.data?.detail);
        
        setPopup({
            show: true,
            type: 'error',
            title: 'Registration Failed',
            message: err.response?.data?.detail?.[0]?.msg || "Field required or invalid"
        });
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorative layers */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 relative z-10 transition-all">
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="p-4 bg-blue-600 text-white rounded-2xl mb-4 shadow-xl shadow-blue-100 transform hover:scale-105 transition-transform">
                        <HardDrive size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight">Join DFS Cloud</h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">Start sharding your files today</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                    {/* Full Name */}
                    <div className="relative group">
                        <User className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                        <input 
                            type="text" placeholder="Full Name" required
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-50 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-600 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    {/* Email Address */}
                    <div className="relative group">
                        <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                        <input 
                            type="email" placeholder="Email Address" required
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-50 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-600 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                    </div>

                    {/* Password with Toggle */}
                    <div className="relative group">
                        <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Create Password" 
                            required
                            className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-50 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-600 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4 text-gray-300 hover:text-blue-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button 
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20}/> : <UserPlus size={20} />}
                        CREATE ACCOUNT
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-gray-50 text-center">
                    <p className="text-sm text-gray-400 font-bold tracking-tight uppercase">
                        ALREADY A MEMBER? <Link to="/login" className="text-blue-600 hover:text-blue-700 transition-colors underline-offset-4 hover:underline">SIGN IN HERE</Link>
                    </p>
                </div>
            </div>

            {/* --- POPUP TAB --- */}
            {popup.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 border border-gray-50">
                        <div className="flex justify-between items-center mb-6">
                            <div className={`p-3 rounded-2xl ${popup.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                {popup.type === 'success' ? <CheckCircle size={28} /> : <XCircle size={28} />}
                            </div>
                            <button onClick={() => setPopup({ ...popup, show: false })} className="text-gray-300 hover:text-gray-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <h2 className="text-xl font-black text-gray-800 mb-1">{popup.title}</h2>
                        <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                            {popup.message}
                        </p>
                        <button 
                            onClick={() => popup.type === 'success' ? navigate('/login') : setPopup({ ...popup, show: false })}
                            className={`w-full py-4 rounded-2xl font-black transition-all ${
                                popup.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white'
                            }`}
                        >
                            {popup.type === 'success' ? 'GO TO LOGIN' : 'TRY AGAIN'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}