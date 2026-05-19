import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, Loader2, ShieldCheck, User, Eye, EyeOff, X, Sparkles, Check, Gift } from 'lucide-react';
import { login } from '../services/authService';
import Swal from 'sweetalert2';


const Login = ({ onLoginSuccess }) => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [showPromos, setShowPromos] = useState(false);


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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs cursor-pointer"
          >
            {cargando ? <Loader2 className="animate-spin" /> : (
              <>
                <LogIn size={18} /> Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <button 
          type="button" 
          onClick={() => setShowPromos(true)}
          className="w-full bg-white/5 hover:bg-white/10 text-blue-400 hover:text-blue-350 font-black py-3 rounded-2xl border border-blue-500/30 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] mt-4 cursor-pointer"
        >
          <Gift size={12} /> Ver Promos y Ofertas
        </button>

        <div className="mt-12 text-center space-y-3">
          <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
            Uparqueo © 2026 | Acceso Restringido
          </p>
          <div className="flex justify-center items-center gap-1.5">
            <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Desarrollado por</span>
            <a 
              href="https://christian-romero.vercel.app/index.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 font-extrabold text-[10px] uppercase tracking-widest hover:underline transition-all cursor-pointer"
            >
              By ChrizDev
            </a>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPromos && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-8 max-w-xl w-full shadow-2xl relative text-white max-h-[90vh] overflow-y-auto scrollbar-hide text-left"
            >
              {/* Botón Cerrar */}
              <button
                onClick={() => setShowPromos(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>

              {/* Encabezado */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-2xl shadow-lg shadow-rose-500/20 mb-3">
                  <Sparkles size={24} className="text-white" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent uppercase tracking-tight">
                  Promociones y Ofertas
                </h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Impulsa tu negocio con Uparqueo Pro</p>
              </div>

              {/* Oferta de Software Web */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20 rounded-3xl p-5 relative overflow-hidden">
                  <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-wider">
                    ¡40% de Descuento!
                  </div>
                  <h4 className="font-extrabold text-sm text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Gift size={16} /> Oferta Especial Software Web
                  </h4>
                  <p className="text-gray-300 text-xs font-medium leading-relaxed mb-4">
                    Obtén el gestor de parqueaderos en la nube con todos los módulos activos y soporte técnico garantizado.
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-gray-500 line-through text-xs font-bold">$500.000 COP</span>
                    <span className="text-2xl font-black text-white">$300.000 COP</span>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">Pago Único</span>
                  </div>
                </div>

                {/* Planes Mensual y Anual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Plan Mensual */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5 hover:border-blue-500/30 transition-all">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Plan Mensual</p>
                    <p className="text-xl font-black text-white">$100.000 <span className="text-xs font-normal text-gray-400">/ mes</span></p>
                    <p className="text-gray-450 text-[10px] mt-2 font-medium">Pago mes a mes sin contratos de permanencia obligatoria.</p>
                  </div>

                  {/* Plan Anual */}
                  <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/30 rounded-3xl p-5 hover:border-blue-500/50 transition-all relative overflow-hidden">
                    <div className="absolute top-2 right-2 bg-blue-500 text-slate-950 font-black text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      ¡20% OFF!
                    </div>
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Plan Anual Recomendado</p>
                    <p className="text-xl font-black text-white">$960.000 <span className="text-xs font-normal text-gray-400">/ año</span></p>
                    <p className="text-emerald-400 text-[10px] mt-1 font-bold">¡Ahorras $240.000 COP al año!</p>
                    <p className="text-gray-450 text-[9px] mt-2 font-medium">
                      Equivalente a solo <span className="text-blue-300 font-bold">$80.000 COP/mes</span>. ¡Recibes 2.4 meses gratis!
                    </p>
                  </div>
                </div>

                {/* Beneficios Clave para atraer clientes */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-3">
                  <h5 className="font-extrabold text-xs text-gray-300 uppercase tracking-wider mb-1">¿Qué incluye tu inversión?</h5>
                  <ul className="space-y-2 text-xs text-gray-400 font-medium">
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Ahorro Garantizado:</strong> Automatiza cuentas y evita pérdidas financieras por descuidos.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Control de Puestos Informales:</strong> Gestiona abonos, cargos extra y calcula deudas al instante.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Acceso Multidispositivo:</strong> Monitorea en tiempo real desde celulares, tablets o PCs.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Seguridad Total:</strong> Reportes de auditoría en tiempo real para un control estricto de ingresos.</span>
                    </li>
                  </ul>
                </div>

                {/* Botón de Contacto */}
                <div className="flex gap-3">
                  <a
                    href="https://christian-romero.vercel.app/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-center font-black py-4 rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 text-xs uppercase tracking-widest cursor-pointer flex items-center justify-center"
                  >
                    Adquirir / Conectar con ChrizDev
                  </a>
                  <button
                    onClick={() => setShowPromos(false)}
                    className="bg-white/5 hover:bg-white/10 text-gray-300 px-6 rounded-2xl border border-white/10 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Login;
