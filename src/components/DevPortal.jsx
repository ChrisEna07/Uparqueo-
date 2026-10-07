import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Key, CheckCircle, AlertCircle, RefreshCw, Save, ArrowLeft } from 'lucide-react';

export const DevPortal = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de Configuración de Cobro
  const [bannerActivo, setBannerActivo] = useState(false);
  const [tipoAviso, setTipoAviso] = useState('modal');
  const [esBloqueante, setEsBloqueante] = useState(false);
  const [mensaje, setMensaje] = useState('Su mensualidad ha vencido. Por favor realice el pago para continuar utilizando el sistema.');
  const [datosPago, setDatosPago] = useState('Nequi / Daviplata: 300 000 0000 - A nombre de: Administrador');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Clave maestra configurada en .env o fallback de seguridad
  const DEV_MASTER_KEY = import.meta.env.VITE_DEV_ADMIN_KEY || 'ChrizDev07';

  useEffect(() => {
    // 1. Si ya se autenticó previamente en la pestaña actual
    const devAuth = sessionStorage.getItem('dev_authenticated') === 'true';
    if (devAuth) {
      setIsAuthenticated(true);
      fetchBillingData();
      return;
    }

    // 2. Verificar rol en perfiles de supabase
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: perfil } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', user.id)
            .maybeSingle();

          if (perfil && (perfil.rol === 'superadmin' || perfil.rol === 'dev' || perfil.rol === 'admin_master' || perfil.rol === 'ambos')) {
            setIsAuthenticated(true);
            sessionStorage.setItem('dev_authenticated', 'true');
            fetchBillingData();
          }
        }
      } catch (e) {
        console.error("Error al validar rol:", e);
      }
    };

    checkRole();
  }, []);

  const handleKeyAuth = (e) => {
    e.preventDefault();
    if (adminKeyInput.trim() === DEV_MASTER_KEY) {
      setIsAuthenticated(true);
      sessionStorage.setItem('dev_authenticated', 'true');
      setErrorMsg('');
      fetchBillingData();
    } else {
      setErrorMsg('Clave Maestra de Desarrollador incorrecta.');
    }
  };

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_billing')
        .select('*')
        .eq('tenant_id', 'default')
        .maybeSingle();

      if (data) {
        setBannerActivo(data.banner_activo);
        setTipoAviso(data.tipo_aviso || 'modal');
        setEsBloqueante(data.es_bloqueante);
        setMensaje(data.mensaje);
        setDatosPago(data.datos_pago);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBilling = async () => {
    setLoading(true);
    setSaveSuccess(false);
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('tenant_billing')
        .upsert({
          tenant_id: 'default',
          banner_activo: bannerActivo,
          tipo_aviso: tipoAviso,
          es_bloqueante: esBloqueante,
          mensaje,
          datos_pago: datosPago,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrorMsg('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-3xl">
              <Key size={36} />
            </div>
          </div>
          <h2 className="text-3xl font-black text-center tracking-tight mb-2 uppercase">Portal Dev</h2>
          <p className="text-gray-400 text-xs font-bold text-center uppercase tracking-widest mb-8">
            Acceso SuperAdmin o Clave Maestra
          </p>

          <form onSubmit={handleKeyAuth} className="space-y-5">
            <div>
              <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-2 ml-1">
                Clave Maestra (VITE_DEV_ADMIN_KEY)
              </label>
              <input 
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                placeholder="Ingresa clave de desarrollador..."
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition shadow-xl shadow-blue-900/30"
            >
              Autenticar Acceso
            </button>
            
            <a 
              href="/"
              className="block text-center text-xs text-gray-500 hover:text-white font-bold pt-2 transition"
            >
              Volver a la App Principal
            </a>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">SuperAdmin & Dev Portal</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                Panel Global de Cobranza, Suscripción y Módulos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="/"
              className="text-xs bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold px-4 py-2.5 rounded-xl border border-gray-800 transition flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Volver a la App
            </a>
            <button 
              onClick={() => {
                sessionStorage.removeItem('dev_authenticated');
                setIsAuthenticated(false);
              }}
              className="text-xs bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white font-bold px-4 py-2.5 rounded-xl border border-red-600/20 transition"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Sección de Facturación y Cobro */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              Control de Cobro Mensual (Tenant Global)
            </h2>
            <button 
              onClick={fetchBillingData}
              disabled={loading}
              className="text-xs flex items-center gap-2 text-gray-400 hover:text-white font-bold"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>

          {/* Switch Activar Aviso */}
          <div className="flex items-center justify-between p-5 bg-gray-950/80 rounded-2xl border border-gray-800">
            <div>
              <span className="font-black text-white text-base block">Activar Advertencia / Bloqueo</span>
              <span className="text-xs text-gray-400 font-medium">
                Si está apagado, ningún usuario verá avisos ni restricciones de pago.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={bannerActivo} 
                onChange={(e) => setBannerActivo(e.target.checked)} 
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Modalidad y Restricción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-gray-950/80 rounded-2xl border border-gray-800 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Tipo de Presentación
              </label>
              <select 
                value={tipoAviso}
                onChange={(e) => setTipoAviso(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-blue-500"
              >
                <option value="modal">Modal Centrado</option>
                <option value="banner">Banner Superior Fijo</option>
              </select>
            </div>

            <div className="p-5 bg-gray-950/80 rounded-2xl border border-gray-800 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Nivel de Restricción
              </label>
              <select 
                value={esBloqueante ? 'bloqueante' : 'informativo'}
                onChange={(e) => setEsBloqueante(e.target.value === 'bloqueante')}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-blue-500"
              >
                <option value="informativo">Aviso Informativo (Permite cerrar con botón X)</option>
                <option value="bloqueante">Bloqueo Obligatorio (Sin botón X / Bloquea la App)</option>
              </select>
            </div>
          </div>

          {/* Textareas de Mensaje y Métodos de Pago */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">
                Mensaje de Advertencia
              </label>
              <textarea 
                rows="3"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Ej: Su mensualidad ha vencido..."
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-white font-medium outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">
                Cuentas Bancarias / Medios de Pago
              </label>
              <textarea 
                rows="3"
                value={datosPago}
                onChange={(e) => setDatosPago(e.target.value)}
                placeholder="Ej: Nequi / Bancolombia / Daviplata..."
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-white font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {saveSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle size={18} className="shrink-0" />
              <span>Configuración guardada y sincronizada en tiempo real con la app.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button 
            onClick={handleSaveBilling}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 font-black text-white text-sm uppercase tracking-widest py-5 rounded-2xl transition shadow-xl shadow-blue-900/30 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Guardando Cambios...' : 'Guardar y Aplicar Estado de Cobro'}
          </button>
        </div>

      </div>
    </div>
  );
};
export default DevPortal;
