import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Loader2, ShieldCheck, User, Eye, EyeOff } from 'lucide-react';
import { login } from '../services/authService';
import Swal from 'sweetalert2';

const Login = ({ onLoginSuccess }) => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identificador || !password) {
      return Swal.fire('Campos incompletos', 'Por favor llena todos los campos', 'warning');
    }

    setCargando(true);
    
    // Si no es un correo electrónico, agregamos el dominio por defecto
    const emailToUse = identificador.includes('@') ? identificador : `${identificador.trim().toLowerCase()}@uparqueo.com`;
    
    const res = await login(emailToUse, password);
    
    if (res.success) {
      onLoginSuccess(res.user);
    } else {
      Swal.fire('Error de Acceso', 'Credenciales incorrectas o usuario no autorizado', 'error');
    }
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/20 mb-6 rotate-3">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">
            Uparqueo<span className="text-blue-500 text-sm align-top ml-1">Pro</span>
          </h1>
          <p className="text-gray-400 text-xs font-black uppercase tracking-[0.3em] mt-3">Sistema de Gestión y Control</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Usuario o Correo</label>
            <div className="relative group">
              <input 
                type="text" 
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Ej: admin2"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all relative z-0 [color-scheme:dark] autofill:bg-slate-900 autofill:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-4 pr-14 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all relative z-0 [color-scheme:dark] autofill:bg-slate-900 autofill:text-white"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors z-10"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
          >
            {cargando ? <Loader2 className="animate-spin" /> : (
              <>
                <LogIn size={18} /> Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
            Uparqueo © 2026 | Acceso Restringido
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
