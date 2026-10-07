import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Lock, X } from 'lucide-react';

export const BillingNotice = () => {
  const [billing, setBilling] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Si ya fue descartado en esta sesión y no es bloqueante, no volver a mostrar
    const isDismissed = sessionStorage.getItem('billing_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }

    const fetchBilling = async () => {
      try {
        const { data, error } = await supabase
          .from('tenant_billing')
          .select('*')
          .eq('tenant_id', 'default')
          .maybeSingle();

        if (error) {
          console.warn('tenant_billing aún no configurado o sin permisos:', error.message);
          return;
        }

        if (data) {
          setBilling(data);
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
        (payload) => {
          if (payload.new) {
            setBilling(payload.new);
            if (payload.new.es_bloqueante) {
              setDismissed(false);
              sessionStorage.removeItem('billing_dismissed');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!billing || !billing.banner_activo) return null;
  if (!billing.es_bloqueante && dismissed) return null;

  // 1. CASO BLOQUEANTE TOTAL (Sin botón X, modal a pantalla completa con backdrop estricto)
  if (billing.es_bloqueante) {
    return (
      <div 
        className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none"
        style={{ pointerEvents: 'all' }}
      >
        <div className="bg-gray-950 border-2 border-red-600/60 rounded-[2.5rem] max-w-lg w-full p-8 text-white shadow-[0_0_80px_rgba(220,38,38,0.4)] text-center animate-fade-in relative">
          <div className="w-20 h-20 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/40 shadow-xl shadow-red-950">
            <Lock className="w-10 h-10 animate-pulse" />
          </div>
          
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

          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
            Una vez realizado el abono, notifique a soporte técnico para reactivar el acceso inmediatamente.
          </p>
        </div>
      </div>
    );
  }

  // 2. CASO NO BLOQUEANTE (Banner superior o modal informativo con botón X)
  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('billing_dismissed', 'true');
  };

  if (billing.tipo_aviso === 'banner') {
    return (
      <aside aria-label="Aviso de facturación" className="relative z-[9999] bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-5 py-3.5 shadow-xl flex items-center justify-between text-xs md:text-sm font-medium">
        <div className="flex items-center gap-3 pr-4">
          <div className="p-1.5 bg-black/20 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-200" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
            <span className="font-bold">{billing.mensaje}</span>
            {billing.datos_pago && (
              <span className="text-amber-100 text-xs font-mono bg-black/20 px-2 py-0.5 rounded">
                {billing.datos_pago}
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1.5 hover:bg-black/20 rounded-xl transition-colors shrink-0 text-amber-100 hover:text-white"
          title="Cerrar aviso"
        >
          <X className="w-5 h-5" />
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
