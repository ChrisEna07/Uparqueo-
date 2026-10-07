import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Lock, X, Key, ShieldCheck } from 'lucide-react';

export const BillingNotice = ({ admin, selectedModule, onDevRequest }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [billing, setBilling] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [lockClicks, setLockClicks] = useState(0);

  // Estados para control de desbloqueo técnico inmediato
  const [isBlocked, setIsBlocked] = useState(true);
  const [devBypass, setDevBypass] = useState(
    sessionStorage.getItem('dev_bypass') === 'true'
  );

  // Formulario in-place de desbloqueo técnico
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);

  const DEV_KEY = import.meta.env.VITE_DEV_ADMIN_KEY || 'ChrizDev07';

  // Identificar el módulo activo del contexto actual ('parqueadero' o 'informal')
  const moduloActual = (selectedModule === 'informales' || selectedModule === 'informal' || admin?.modulo === 'informal')
    ? 'informal'
    : 'parqueadero';

  useEffect(() => {
    // Si ya existe bypass en la pestaña actual
    if (sessionStorage.getItem('dev_bypass') === 'true') {
      setDevBypass(true);
      setIsBlocked(false);
    }

    const fetchBilling = async () => {
      try {
        // 1. Consulta directa y simplificada a tenant_billing ordenando por más reciente
        const { data, error } = await supabase
          .from('tenant_billing')
          .select('*')
          .eq('banner_activo', true)
          .order('updated_at', { ascending: false });

        if (error) {
          console.warn('[BillingNotice] Error al consultar tenant_billing:', error.message);
          return;
        }

        if (data && data.length > 0) {
          let matched = null;

          // Regla 1: Coincidencia específica por organizacion_id
          if (admin?.organizacion_id) {
            matched = data.find(b => b.organizacion_id === admin.organizacion_id || b.tenant_id === admin.organizacion_id);
          }

          // Regla 2: Coincidencia específica por módulo activo ('parqueadero' o 'informal' / 'informales')
          if (!matched && moduloActual) {
            matched = data.find(b => 
              b.tenant_id === moduloActual || 
              (moduloActual === 'informal' && b.tenant_id === 'informales')
            );
          }

          // Regla 3: Comodín global ('default') aplicable a todos los módulos
          if (!matched) {
            matched = data.find(b => b.tenant_id === 'default');
          }

          console.log('[BillingNotice] Coincidencia activa:', { 
            moduloActual, 
            orgId: admin?.organizacion_id, 
            matched, 
            filasActivas: data.length 
          });

          setBilling(matched || null);
        } else {
          setBilling(null);
        }
      } catch (err) {
        console.error('[BillingNotice] Error en fetchBilling:', err);
      }
    };

    fetchBilling();

    // Suscripción en tiempo real a cambios en tenant_billing
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
  }, [admin?.id, admin?.organizacion_id, admin?.modulo, selectedModule, moduloActual]);

  // EXCLUSIÓN 1: Excluir inmediatamente si la ruta actual es /dev-portal
  const currentPath = (location?.pathname || window.location.pathname).toLowerCase();
  if (currentPath === '/dev-portal' || currentPath.startsWith('/dev-portal')) {
    return null;
  }

  // EXCLUSIÓN 2: Excluir inmediatamente si el usuario es superadmin o dev
  const esSuperAdmin = admin?.rol === 'superadmin' || 
                       admin?.rol === 'dev' || 
                       admin?.rol === 'admin_master';
  if (esSuperAdmin) {
    return null;
  }

  // EXCLUSIÓN 3: Si se activó bypass de desarrollador o se levantó el bloqueo
  if (devBypass || !isBlocked || sessionStorage.getItem('dev_bypass') === 'true') {
    return null;
  }

  // Si no hay configuración activa encontrada
  if (!billing || !billing.banner_activo) {
    return null;
  }

  // Si fue descartado por el usuario con el botón (X) en este ciclo y no es bloqueante
  if (!billing.es_bloqueante && dismissed) {
    return null;
  }

  // Método de validación de clave exitosa: desmonta de inmediato el componente
  const handleSubmitKey = (e) => {
    e.preventDefault();
    if (inputKey.trim() === DEV_KEY) {
      setAuthError('');
      setAuthSuccess(true);
      
      sessionStorage.setItem('dev_bypass', 'true');
      sessionStorage.setItem('dev_authenticated', 'true');
      setIsBlocked(false);
      setDevBypass(true);
      setShowAuthForm(false);
    } else {
      setAuthError('Clave de Desarrollador incorrecta.');
    }
  };

  // Navegación interna SPA al Portal de Desarrollador
  const handleGoToDevPortal = () => {
    sessionStorage.setItem('dev_bypass', 'true');
    sessionStorage.setItem('dev_authenticated', 'true');
    setIsBlocked(false);
    setDevBypass(true);
    setShowAuthForm(false);
    navigate('/dev-portal');
  };

  // Manejador de 5 clics seguidos en el candado para acceso técnico
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

  const handleDismiss = () => {
    setDismissed(true);
  };

  // =========================================================================
  // CASO 1: BLOQUEO OBLIGATORIO (es_bloqueante === true)
  // =========================================================================
  if (billing.es_bloqueante) {
    return (
      <div 
        className="fixed inset-0 z-[999990] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none"
        style={{ pointerEvents: 'all' }}
      >
        <div className="bg-gray-950 border-2 border-red-600/60 rounded-[2.5rem] max-w-lg w-full p-8 text-white shadow-[0_0_80px_rgba(220,38,38,0.4)] text-center animate-fade-in relative">
          
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
                  Ingresa la clave maestra para levantar el bloqueo
                </p>
              </div>

              {authSuccess ? (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                  <ShieldCheck size={18} />
                  <span>Clave correcta. Levantando bloqueo...</span>
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
                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-xs uppercase py-3.5 rounded-2xl border border-gray-800 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase py-3.5 rounded-2xl transition shadow-lg shadow-blue-900/40 cursor-pointer"
                    >
                      Desbloquear
                    </button>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={handleGoToDevPortal}
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline font-bold cursor-pointer"
                    >
                      Ir directamente a /dev-portal →
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Ícono interactivo: 5 clics abren el prompt técnico */}
              <button 
                type="button"
                onClick={handleLockClick}
                className="w-20 h-20 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/40 shadow-inner hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Toca 5 veces para soporte técnico"
              >
                <Lock className="w-10 h-10 animate-pulse text-red-500" />
              </button>

              <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-2">
                Servicio Suspendido
              </h2>
              
              <div className="inline-block bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-red-400 mb-6">
                Acceso Temporalmente Inhabilitado
              </div>

              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                {billing.mensaje || 'Su cuenta presenta mensualidades pendientes. El acceso al sistema se encuentra restringido.'}
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

              {/* Botón discreto para acceso técnico */}
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

  // =========================================================================
  // CASO 2: BARRA SUPERIOR FIJADA (tipo_aviso === 'banner' && !es_bloqueante)
  // =========================================================================
  if (billing.tipo_aviso === 'banner') {
    return (
      <aside 
        aria-label="Aviso de facturación" 
        className="sticky top-0 z-[99999] w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 flex items-center justify-between shadow-lg font-semibold"
      >
        <div className="flex items-center gap-3 pr-4 overflow-hidden">
          <div className="p-1.5 bg-black/20 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-100" />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm">
            <span>{billing.mensaje}</span>
            {billing.datos_pago && (
              <span className="text-amber-100 text-xs font-mono bg-black/25 px-2.5 py-1 rounded-lg border border-amber-400/30">
                {billing.datos_pago}
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1.5 hover:bg-black/20 rounded-xl transition-colors shrink-0 text-amber-100 hover:text-white ml-2 cursor-pointer"
          title="Cerrar aviso"
        >
          <X className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  // =========================================================================
  // CASO 3: MODAL INFORMATIVO NO BLOQUEANTE (tipo_aviso === 'modal' && !es_bloqueante)
  // =========================================================================
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-amber-500/40 rounded-[2.5rem] max-w-md w-full p-8 text-white shadow-2xl relative animate-scale-up">
        <button 
          onClick={handleDismiss}
          className="absolute top-6 right-6 text-gray-400 hover:text-white p-2 rounded-2xl hover:bg-gray-800 transition cursor-pointer"
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
        {billing.datos_pago && (
          <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 text-xs text-gray-300 mb-6 whitespace-pre-wrap font-mono leading-relaxed">
            {billing.datos_pago}
          </div>
        )}
        <button 
          onClick={handleDismiss}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl transition shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          Entendido / Continuar
        </button>
      </div>
    </div>
  );
};

export default BillingNotice;
