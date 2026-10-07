import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Lock, X, Shield, Key, ArrowRight, ShieldCheck, Check } from 'lucide-react';

export const BillingNotice = ({ admin, selectedModule, onDevRequest }) => {
  const [billing, setBilling] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [devBypass, setDevBypass] = useState(false);
  const [lockClicks, setLockClicks] = useState(0);

  // ESTADO LOCAL DE REACT PARA DESBLOQUEO TÉCNICO (Sin SweetAlert ni portales externos)
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);

  const DEV_KEY = import.meta.env.VITE_DEV_ADMIN_KEY || 'ChrizDev07';

  // Identificar los tenant_id potenciales que aplican al usuario actual
  const activeTenantId = admin?.organizacion_id || admin?.tenant_id || admin?.business_id || null;
  const currentModulo = selectedModule || (admin?.modulo === 'informal' ? 'informales' : 'parqueadero');

  useEffect(() => {
    // Si ya se activó el bypass de desarrollador en esta pestaña
    const bypassActive = sessionStorage.getItem('dev_bypass') === 'true';
    if (bypassActive) {
      setDevBypass(true);
    }

    // Si ya fue descartado en esta sesión y no es bloqueante
    const isDismissed = sessionStorage.getItem('billing_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }

    const fetchBilling = async () => {
      try {
        const { data, error } = await supabase
          .from('tenant_billing')
          .select('*')
          .eq('banner_activo', true);

        if (error) {
          console.warn('tenant_billing aún no configurado o sin permisos:', error.message);
          return;
        }

        if (data && data.length > 0) {
          let matched = null;
          // 1. Coincidencia por organizacion_id o tenant_id exacto
          if (activeTenantId) {
            matched = data.find(b => b.organizacion_id === activeTenantId || b.tenant_id === activeTenantId);
          }
          // 2. Coincidencia por módulo activo
          if (!matched && currentModulo) {
            matched = data.find(b => b.tenant_id === currentModulo);
          }
          // 3. Fallback a configuración global 'default'
          if (!matched) {
            matched = data.find(b => b.tenant_id === 'default');
          }

          setBilling(matched || null);
        } else {
          setBilling(null);
        }
      } catch (err) {
        console.error('Error fetching tenant_billing:', err);
      }
    };

    fetchBilling();

    // Suscripción en tiempo real a cambios en la tabla tenant_billing
    const channel = supabase
      .channel('realtime_billing_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenant_billing' },
        () => {
          fetchBilling();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [admin, selectedModule, activeTenantId, currentModulo]);

  // 1. REGLA CRÍTICA 1: Excluir totalmente la ruta del portal de desarrollador
  const currentPath = window.location.pathname.toLowerCase();
  if (currentPath === '/dev-portal' || currentPath.startsWith('/dev-portal/')) {
    return null;
  }

  // 2. REGLA CRÍTICA 2: Bypass para desarrollador activo en la sesión actual
  if (devBypass) {
    return null;
  }

  // Bypass si el usuario autenticado tiene rol de SuperAdmin / Dev
  const esSuperAdmin = admin?.rol === 'superadmin' || 
                       admin?.rol === 'dev' || 
                       admin?.rol === 'admin_master';

  if (!billing || !billing.banner_activo) return null;
  if (!billing.es_bloqueante && dismissed) return null;

  // Manejador del Formulario Interno de Desbloqueo Técnico
  const handleSubmitKey = (e) => {
    e.preventDefault();
    if (inputKey.trim() === DEV_KEY) {
      setAuthError('');
      setAuthSuccess(true);
      sessionStorage.setItem('dev_bypass', 'true');
      sessionStorage.setItem('dev_authenticated', 'true');
      
      setTimeout(() => {
        setDevBypass(true);
        setShowAuthForm(false);
      }, 1000);
    } else {
      setAuthError('Clave de Desarrollador incorrecta.');
    }
  };

  // Manejador de clics repetidos sobre el ícono del candado (Backdoor secreto de 5 toques)
  const handleLockClick = () => {
    const nextCount = lockClicks + 1;
    if (nextCount >= 5) {
      setLockClicks(0);
      setShowAuthForm(true);
      setAuthError('');
    } else {
      setLockClicks(nextCount);
      setTimeout(() => setLockClicks(0), 3000);
    }
  };

  // 3. Si el usuario actual es SuperAdmin/Dev pero el bloqueo está activo,
  // NO le bloqueamos la pantalla, se lo mostramos como un aviso informativo flotante
  if (esSuperAdmin && billing.es_bloqueante) {
    if (dismissed) return null;
    return (
      <aside aria-label="Aviso de administrador" className="fixed bottom-4 right-4 z-[999990] bg-red-950/90 border border-red-500/50 rounded-2xl p-4 text-white shadow-2xl backdrop-blur-md max-w-sm animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
            <Shield size={16} /> Modo SuperAdmin (Bloqueo Activo)
          </div>
          <button 
            onClick={() => setDismissed(true)} 
            className="text-gray-400 hover:text-white p-1"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-xs text-gray-300 mt-2">
          El sistema está bloqueando usuarios operativos. Puedes apagarlo en <a href="/dev-portal" className="text-blue-400 underline font-bold">/dev-portal</a>.
        </p>
      </aside>
    );
  }

  // 4. CASO BLOQUEANTE TOTAL (Sin botón X, modal a pantalla completa con backdrop estricto)
  if (billing.es_bloqueante) {
    return (
      <div 
        className="fixed inset-0 z-[999990] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none"
        style={{ pointerEvents: 'all' }}
      >
        <div className="bg-gray-950 border-2 border-red-600/60 rounded-[2.5rem] max-w-lg w-full p-8 text-white shadow-[0_0_80px_rgba(220,38,38,0.4)] text-center animate-fade-in relative">
          
          {/* MODAL / SUB-PANEL INTERNO DE DESBLOQUEO TÉCNICO (RENDERIZADO DENTRO DEL PROPIO COMPONENTE) */}
          {showAuthForm ? (
            <div className="space-y-6 animate-scale-up py-2">
              <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/40 shadow-lg">
                <Key className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                  Acceso de Desarrollador
                </h3>
                <p className="text-gray-400 text-xs mt-1">
                  Ingresa la clave maestra para levantar el bloqueo en esta sesión
                </p>
              </div>

              {authSuccess ? (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                  <ShieldCheck size={18} />
                  <span>Clave correcta. Levantando bloqueo del sistema...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmitKey} className="space-y-4">
                  <div>
                    <input 
                      type="password"
                      autoFocus
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="Ingresa clave maestra..."
                      className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-white text-center font-bold outline-none text-sm tracking-wider"
                    />
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold">
                      {authError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => { setShowAuthForm(false); setAuthError(''); setInputKey(''); }}
                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-xs uppercase py-3.5 rounded-2xl border border-gray-800 transition"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase py-3.5 rounded-2xl transition shadow-lg shadow-blue-900/40"
                    >
                      Desbloquear
                    </button>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={() => { window.location.href = '/dev-portal'; }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline font-bold"
                    >
                      Ir directamente a /dev-portal →
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* VISTA NORMAL DEL BLOQUEO */
            <>
              {/* Ícono interactivo: 5 toques activan el prompt interno del Dev */}
              <button 
                type="button"
                onClick={handleLockClick}
                className="w-20 h-20 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/40 shadow-xl shadow-red-950 cursor-pointer active:scale-90 transition-transform"
                title="Tocar 5 veces para soporte técnico"
              >
                <Lock className="w-10 h-10 animate-pulse" />
              </button>
              
              <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-3">
                Servicio Suspendido
              </h2>
              
              <p className="text-gray-300 text-sm mb-6 leading-relaxed font-medium">
                {billing.mensaje || 'Su mensualidad ha vencido. Por favor realice el pago para continuar utilizando el sistema.'}
              </p>
              
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-left mb-6 shadow-inner">
                <span className="text-[10px] text-amber-400 font-black tracking-widest uppercase block mb-2">
                  Información de Pago y Canales Autorizados
                </span>
                <pre className="text-xs text-gray-200 font-mono whitespace-pre-wrap leading-relaxed">
                  {billing.datos_pago || 'Nequi / Daviplata: 300 000 0000 - A nombre de: Administrador'}
                </pre>
              </div>

              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-6">
                Una vez realizado el abono, notifique a soporte técnico para reactivar el acceso inmediatamente.
              </p>

              {/* BOTÓN DISCRETO PARA ACCESO TÉCNICO INTERNO */}
              <div className="pt-2 border-t border-gray-900 flex justify-between items-center text-[10px] text-gray-600">
                <span>Uparqueo Security Engine</span>
                <button 
                  type="button"
                  onClick={() => { setShowAuthForm(true); setAuthError(''); }}
                  className="hover:text-blue-400 font-mono text-[10px] underline decoration-dotted transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Key size={10} /> Acceso Técnico
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    );
  }

  // 5. CASO NO BLOQUEANTE (Banner superior o modal informativo con botón X)
  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('billing_dismissed', 'true');
  };

  if (billing.tipo_aviso === 'banner') {
    return (
      <aside 
        aria-label="Aviso de facturación" 
        className="sticky top-0 z-[99990] w-full bg-amber-500 text-white px-4 py-2.5 flex justify-between items-center shadow-md"
      >
        <div className="flex items-center gap-3 pr-4 overflow-hidden">
          <div className="p-1 bg-black/20 rounded-md shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-100" />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm">
            <span className="font-bold tracking-tight">{billing.mensaje}</span>
            {billing.datos_pago && (
              <span className="text-amber-100 text-xs font-mono bg-black/25 px-2 py-0.5 rounded border border-amber-400/20">
                {billing.datos_pago}
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1 hover:bg-black/20 rounded-lg transition-colors shrink-0 text-amber-100 hover:text-white ml-2"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // Modal informativo no bloqueante (con botón X)
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-amber-500/40 rounded-[2.5rem] max-w-md w-full p-8 text-white shadow-2xl relative animate-scale-up">
        <button 
          onClick={handleDismiss}
          className="absolute top-6 right-6 text-gray-400 hover:text-white p-2 rounded-2xl hover:bg-gray-800 transition"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 mb-5">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-amber-400 tracking-tight uppercase">Aviso de Suscripción</h3>
            <p className="text-xs text-gray-400 font-medium">Recordatorio del Administrador</p>
          </div>
        </div>
        <p className="text-gray-300 text-sm mb-5 leading-relaxed">{billing.mensaje}</p>
        <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 text-xs text-gray-300 mb-6 whitespace-pre-wrap font-mono leading-relaxed">
          {billing.datos_pago}
        </div>
        <button 
          onClick={handleDismiss}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl transition shadow-lg shadow-amber-500/20"
        >
          Entendido / Continuar
        </button>
      </div>
    </div>
  );
};

export default BillingNotice;
