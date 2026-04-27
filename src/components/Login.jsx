import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { loginAdmin } from '../services/authService';
import { Shield, Lock, User, Loader2, Sparkles, Fingerprint, Key, ArrowRight, Crown } from 'lucide-react';
import Swal from 'sweetalert2';
import logoImg from '../assets/logo upar.png';
import bgImg from '../assets/parking_bg.png';

const Login = ({ onLoginSuccess, onDevRequest }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [taps, setTaps] = useState(0);

  const handleLogoClick = () => {
    const newTaps = taps + 1;
    if (newTaps >= 5) {
      setTaps(0);
      onDevRequest?.();
    } else {
      setTaps(newTaps);
      setTimeout(() => setTaps(0), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setCargando(true);
    try {
      const res = await loginAdmin(username.toLowerCase(), password);
      
      if (res.success) {
        setTimeout(() => {
          onLoginSuccess(res.data);
          setCargando(false);
        }, 500);
      } else {
        Swal.fire({
          title: 'Error de Acceso',
          text: res.message,
          icon: 'error',
          confirmButtonColor: '#2563EB'
        });
        setCargando(false);
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Fallo crítico de conexión', 'error');
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4 relative overflow-hidden">
      {/* Fondo animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 animate-pulse"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2240%22 height=%2240%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern id=%22grid%22 width=%2240%22 height=%2240%22 patternUnits=%22userSpaceOnUse%22%3E%3Cpath d=%22M 40 0 L 0 0 0 40%22 fill=%22none%22 stroke=%22rgba(255,255,255,0.03)%22 stroke-width=%221%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22url(%23grid)%22/%3E%3C/svg%3E')] opacity-50"></div>

      {/* Imagen de fondo */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950/90 via-gray-950/80 to-black/95 backdrop-blur-sm"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-800/90 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          
          {/* Header con logo mejorado */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-blue-500/30 rounded-full blur-2xl -z-10"></div>
              
              <div 
                className="cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
                onClick={handleLogoClick}
              >
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/40 via-purple-600/40 to-cyan-600/40 rounded-full blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                  
                  {/* LOGO CSS PREMIUM */}
                  <div className="relative z-10 mx-auto flex items-center justify-center bg-gray-950/80 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(59,130,246,0.3)] rounded-full px-8 py-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 p-2.5 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                      <div className="bg-white rounded-full p-1.5">
                        <span className="text-blue-600 font-black text-xl italic pr-0.5 font-sans leading-none block">P</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start justify-center">
                      <span className="text-2xl md:text-3xl font-black tracking-tighter bg-gradient-to-r from-white via-blue-100 to-gray-300 bg-clip-text text-transparent leading-none">UPARQUEO</span>
                      <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase leading-none mt-1">by ChrizDev</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <motion.h1 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-white via-blue-300 to-purple-400 bg-clip-text text-transparent tracking-tight"
              >
                UPARQUEO
              </motion.h1>
              
              <div className="flex items-center justify-center gap-2 mt-3">
                <Crown className="text-yellow-500/80" size={16} />
                <p className="text-gray-300 text-sm uppercase tracking-wider font-medium">
                  Sistema de Gestión
                </p>
                <Crown className="text-yellow-500/80" size={16} />
              </div>
              
              <div className="flex justify-center items-center gap-2 mt-4">
                <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-500"></div>
                <Sparkles className="text-blue-400" size={12} />
                <div className="w-12 h-px bg-gradient-to-l from-transparent to-blue-500"></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <User size={12} />
                Usuario
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-3 bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-blue-500 transition-all duration-300">
                  <User className="text-gray-400 group-focus-within:text-blue-400 transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-transparent text-white outline-none placeholder-gray-500 text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Key size={12} />
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-3 bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-blue-500 transition-all duration-300">
                  <Lock className="text-gray-400 group-focus-within:text-blue-400 transition-colors" size={18} />
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-white outline-none placeholder-gray-500 text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 py-2">
              <Fingerprint size={12} className="text-green-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Conexión Segura SSL</span>
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={cargando}
              className={`relative w-full py-3 rounded-xl font-bold text-white text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden ${
                cargando 
                  ? 'bg-gradient-to-r from-blue-600/50 to-purple-600/50 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 hover:shadow-lg hover:shadow-blue-500/25'
              }`}
            >
              {!cargando && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"></div>
              )}
              
              {cargando ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Verificando...
                </>
              ) : (
                <>
                  Acceder al Panel
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-white/10">
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
              <Shield size={10} />
              Powered by ChrizDev
              <Shield size={10} />
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
