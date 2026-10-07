import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, Key, CheckCircle, AlertCircle, RefreshCw, 
  Save, ArrowLeft, Building2, Users, PlusCircle, Check, 
  Power, PowerOff, Building
} from 'lucide-react';
import { getTenantsList } from '../services/tenantService';

export const DevPortal = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Pestaña activa: 'billing' | 'organizaciones'
  const [activeTab, setActiveTab] = useState('billing');

  // Lista dinámica de Tenants / Organizaciones
  const [tenantsList, setTenantsList] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('default');
  const [currentBillingRow, setCurrentBillingRow] = useState(null);

  // Estados de Configuración de Cobro
  const [bannerActivo, setBannerActivo] = useState(false);
  const [tipoAviso, setTipoAviso] = useState('banner');
  const [esBloqueante, setEsBloqueante] = useState(false);
  const [mensaje, setMensaje] = useState('Su mensualidad ha vencido. Por favor realice el pago para continuar utilizando el sistema.');
  const [datosPago, setDatosPago] = useState('Nequi / Daviplata: 300 000 0000 - A nombre de: Administrador');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados de Gestión de Organizaciones
  const [organizacionesList, setOrganizacionesList] = useState([]);
  const [empleadosCounts, setEmpleadosCounts] = useState({});
  const [orgNombre, setOrgNombre] = useState('');
  const [modulosSeleccionados, setModulosSeleccionados] = useState(['parqueadero', 'informal']);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgSuccessMsg, setOrgSuccessMsg] = useState('');
  const [orgErrorMsg, setOrgErrorMsg] = useState('');

  // Clave maestra configurada en .env o fallback de seguridad
  const DEV_MASTER_KEY = import.meta.env.VITE_DEV_ADMIN_KEY || 'ChrizDev07';

  const isUuid = (val) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  useEffect(() => {
    // 1. Si ya se autenticó previamente en la pestaña actual
    const devAuth = sessionStorage.getItem('dev_authenticated') === 'true';
    if (devAuth) {
      setIsAuthenticated(true);
      inicializarPortal();
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
            inicializarPortal();
          }
        }
      } catch (e) {
        console.error("Error al validar rol:", e);
      }
    };

    checkRole();
  }, []);

  const inicializarPortal = async () => {
    const res = await getTenantsList();
    let currentList = [];
    if (res.success && res.data.length > 0) {
      currentList = res.data;
      setTenantsList(res.data);
    }
    await fetchBillingData('default', currentList);
    await cargarOrganizaciones();
  };

  const handleKeyAuth = async (e) => {
    e.preventDefault();
    if (adminKeyInput.trim() === DEV_MASTER_KEY) {
      setIsAuthenticated(true);
      sessionStorage.setItem('dev_authenticated', 'true');
      setErrorMsg('');
      inicializarPortal();
    } else {
      setErrorMsg('Clave Maestra de Desarrollador incorrecta.');
    }
  };

  // Carga de datos de Cobro con persistencia garantizada
  const fetchBillingData = async (tenantId = selectedTenantId, listToUse = tenantsList) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const item = listToUse.find(t => t.id === tenantId || t.slug === tenantId);
      const selectedOrgId = item?.tipo === 'organizacion' && isUuid(item.id) ? item.id : (isUuid(tenantId) ? tenantId : null);
      const selectedTenantKey = item?.slug || item?.id || tenantId;

      let query = supabase.from('tenant_billing').select('*');
      if (selectedOrgId && isUuid(selectedOrgId)) {
        query = query.or(`organizacion_id.eq.${selectedOrgId},tenant_id.eq.${selectedTenantKey}`);
      } else {
        query = query.eq('tenant_id', selectedTenantKey);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('tenant_billing query notice:', error.message);
      }

      if (data) {
        setCurrentBillingRow(data);
        setBannerActivo(data.banner_activo ?? false);
        setTipoAviso(data.tipo_aviso ?? 'banner');
        setEsBloqueante(data.es_bloqueante ?? false);
        setMensaje(data.mensaje ?? '');
        setDatosPago(data.datos_pago ?? '');
      } else {
        setCurrentBillingRow(null);
        setBannerActivo(false);
        setTipoAviso('banner');
        setEsBloqueante(false);
        setMensaje('Su mensualidad ha vencido. Por favor realice el pago para continuar utilizando el sistema.');
        setDatosPago('Nequi / Daviplata: 300 000 0000 - A nombre de: Administrador');
      }
    } catch (err) {
      console.error('Error al cargar billing:', err);
      setErrorMsg('Error al consultar configuración: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantChange = async (e) => {
    const newTenantId = e.target.value;
    setSelectedTenantId(newTenantId);
    await fetchBillingData(newTenantId, tenantsList);
  };

  // Guardado de configuración de Cobro por Tenant / Organización
  const handleSaveBilling = async () => {
    setLoading(true);
    setSaveSuccess(false);
    setErrorMsg('');

    try {
      const item = tenantsList.find(t => t.id === selectedTenantId || t.slug === selectedTenantId);
      const selectedOrgId = item?.tipo === 'organizacion' && isUuid(item.id) ? item.id : (isUuid(selectedTenantId) ? selectedTenantId : null);
      const selectedTenantKey = currentBillingRow?.tenant_id || item?.slug || item?.id || selectedTenantId;

      const upsertPayload = {
        tenant_id: selectedTenantKey,
        organizacion_id: selectedOrgId || null,
        banner_activo: bannerActivo,
        tipo_aviso: tipoAviso,
        es_bloqueante: esBloqueante,
        mensaje: mensaje || '',
        datos_pago: datosPago || '',
        updated_at: new Date().toISOString()
      };

      if (currentBillingRow?.id) {
        upsertPayload.id = currentBillingRow.id;
      }

      const { data: savedData, error } = await supabase
        .from('tenant_billing')
        .upsert(upsertPayload, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;
      if (savedData) {
        setCurrentBillingRow(savedData);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error al guardar billing:', err);
      setErrorMsg('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carga de Organizaciones y conteo de empleados
  const cargarOrganizaciones = async () => {
    try {
      const { data: orgs, error: orgErr } = await supabase
        .from('organizaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgErr) throw orgErr;

      // Obtener perfiles para computar número de empleados por organización
      const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id, organizacion_id');

      const counts = {};
      if (perfiles) {
        perfiles.forEach(p => {
          if (p.organizacion_id) {
            counts[p.organizacion_id] = (counts[p.organizacion_id] || 0) + 1;
          }
        });
      }

      setEmpleadosCounts(counts);
      setOrganizacionesList(orgs || []);
    } catch (err) {
      console.error('Error al cargar organizaciones:', err);
    }
  };

  // Creación de nueva Organización
  const handleCrearOrganizacion = async (e) => {
    e.preventDefault();
    if (!orgNombre.trim()) {
      setOrgErrorMsg('Debes ingresar un nombre para la organización.');
      return;
    }
    if (modulosSeleccionados.length === 0) {
      setOrgErrorMsg('Debes seleccionar al menos un módulo.');
      return;
    }

    setOrgLoading(true);
    setOrgErrorMsg('');
    setOrgSuccessMsg('');

    try {
      const slug = orgNombre.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { error } = await supabase
        .from('organizaciones')
        .insert([{
          nombre: orgNombre.trim(),
          slug,
          modulos_activos: modulosSeleccionados,
          estado: 'activo'
        }]);

      if (error) throw error;

      setOrgSuccessMsg(`¡Organización "${orgNombre.trim()}" creada correctamente!`);
      setOrgNombre('');
      setModulosSeleccionados(['parqueadero', 'informal']);

      await cargarOrganizaciones();

      // Recargar lista de tenants para el selector de cobro
      const resTenants = await getTenantsList();
      if (resTenants.success) {
        setTenantsList(resTenants.data);
      }
      setTimeout(() => setOrgSuccessMsg(''), 4000);
    } catch (err) {
      setOrgErrorMsg('Error al crear organización: ' + err.message);
    } finally {
      setOrgLoading(false);
    }
  };

  // Alternar estado de una organización (activo / suspendido)
  const handleToggleEstadoOrg = async (org) => {
    const nuevoEstado = org.estado === 'activo' ? 'suspendido' : 'activo';
    try {
      const { error } = await supabase
        .from('organizaciones')
        .update({ estado: nuevoEstado })
        .eq('id', org.id);

      if (error) throw error;
      await cargarOrganizaciones();
      const resTenants = await getTenantsList();
      if (resTenants.success) {
        setTenantsList(resTenants.data);
      }
    } catch (err) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  const toggleModuloCheckbox = (mod) => {
    if (modulosSeleccionados.includes(mod)) {
      setModulosSeleccionados(modulosSeleccionados.filter(m => m !== mod));
    } else {
      setModulosSeleccionados([...modulosSeleccionados, mod]);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-3xl">
              <Key size={40} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center uppercase tracking-tight mb-2">
            Portal SuperAdmin / Dev
          </h2>
          <p className="text-gray-400 text-xs text-center mb-8 font-medium">
            Ingreso restringido para ingeniería y gestión financiera
          </p>

          <form onSubmit={handleKeyAuth} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                Clave Maestra de Desarrollador
              </label>
              <input 
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                placeholder="Ingresa clave maestra..."
                className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 rounded-2xl px-5 py-4 text-white text-center font-bold outline-none text-sm tracking-widest"
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-bold">
                {errorMsg}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition shadow-lg shadow-blue-600/20"
            >
              Autenticar y Entrar
            </button>
            <a 
              href="/"
              className="block text-center text-xs text-gray-500 hover:text-gray-300 font-bold mt-4"
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
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">SuperAdmin & Dev Portal</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                Panel Global de Cobranza, Suscripción y Organizaciones
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

        {/* Pestañas de Navegación del Portal */}
        <div className="flex gap-2 border-b border-gray-800 pb-4">
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition ${
              activeTab === 'billing' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Building2 size={16} /> Cobro & Suscripción
          </button>
          <button
            onClick={() => setActiveTab('organizaciones')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition ${
              activeTab === 'organizaciones' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Building size={16} /> Organizaciones
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: COBRO & SUSCRIPCIÓN */}
        {/* ========================================================================= */}
        {activeTab === 'billing' && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  Control de Cobro Mensual por Tenant / Organización
                </h2>
                <p className="text-xs text-gray-400">Selecciona el negocio u organización a configurar o bloquear</p>
              </div>
              <button 
                onClick={() => fetchBillingData(selectedTenantId)}
                disabled={loading}
                className="text-xs flex items-center gap-2 text-gray-400 hover:text-white font-bold bg-gray-900 px-4 py-2 rounded-xl border border-gray-800"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>

            {/* SELECTOR DE TENANT / CLIENTE */}
            <div className="p-5 bg-blue-950/20 border border-blue-500/30 rounded-2xl space-y-2">
              <label className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={16} /> Seleccionar Cliente / Tenant / Organización
              </label>
              <select
                value={selectedTenantId}
                onChange={handleTenantChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-sm text-white font-bold outline-none focus:border-blue-500"
              >
                {tenantsList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.tipo === 'global' ? '★ (Afecta a Todos)' : `[${t.tipo || 'id'}]`}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 italic">
                Configurando actualmente: <span className="font-mono text-blue-300 font-bold">{selectedTenantId}</span>
              </p>
            </div>

            {/* Switch Activar Aviso */}
            <div className="flex items-center justify-between p-5 bg-gray-950/80 rounded-2xl border border-gray-800">
              <div>
                <span className="font-black text-white text-base block">Activar Advertencia / Bloqueo</span>
                <span className="text-xs text-gray-400 font-medium">
                  Si está apagado, este tenant no verá avisos ni restricciones de pago.
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
                  <option value="banner">Banner Superior Fijo</option>
                  <option value="modal">Modal Centrado</option>
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
                <span>Configuración guardada para [{selectedTenantId}] y sincronizada en tiempo real.</span>
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
              {loading ? 'Guardando Cambios...' : `Guardar y Aplicar Estado para Tenant (${selectedTenantId.substring(0, 10)}...)`}
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: GESTIÓN DE ORGANIZACIONES */}
        {/* ========================================================================= */}
        {activeTab === 'organizaciones' && (
          <div className="space-y-8">
            
            {/* Formulario de Alta de Organización */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <PlusCircle size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">
                    Crear Nueva Organización
                  </h2>
                  <p className="text-xs text-gray-400">
                    Da de alta un cliente/empresa con sus módulos independientes
                  </p>
                </div>
              </div>

              <form onSubmit={handleCrearOrganizacion} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Nombre de la Organización
                  </label>
                  <input 
                    type="text"
                    value={orgNombre}
                    onChange={(e) => setOrgNombre(e.target.value)}
                    placeholder="Ej: Parqueadero Central, Moncho Express..."
                    className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 rounded-2xl px-5 py-4 text-white font-bold outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">
                    Módulos Asignados
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label 
                      onClick={() => toggleModuloCheckbox('parqueadero')}
                      className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition select-none ${
                        modulosSeleccionados.includes('parqueadero')
                          ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                        modulosSeleccionados.includes('parqueadero')
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-gray-700 bg-gray-900'
                      }`}>
                        {modulosSeleccionados.includes('parqueadero') && <Check size={14} />}
                      </div>
                      <div>
                        <span className="font-black text-sm block">Módulo Parqueadero</span>
                        <span className="text-[11px] opacity-75">Control vehicular, tarifas, cobro de parqueo</span>
                      </div>
                    </label>

                    <label 
                      onClick={() => toggleModuloCheckbox('informal')}
                      className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition select-none ${
                        modulosSeleccionados.includes('informal')
                          ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                        modulosSeleccionados.includes('informal')
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-gray-700 bg-gray-900'
                      }`}>
                        {modulosSeleccionados.includes('informal') && <Check size={14} />}
                      </div>
                      <div>
                        <span className="font-black text-sm block">Negocios Informales</span>
                        <span className="text-[11px] opacity-75">Puestos, locales, ventas y recaudo comercial</span>
                      </div>
                    </label>
                  </div>
                </div>

                {orgSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle size={18} className="shrink-0" />
                    <span>{orgSuccessMsg}</span>
                  </div>
                )}

                {orgErrorMsg && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{orgErrorMsg}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={orgLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 font-black text-white text-xs uppercase tracking-widest py-4 rounded-2xl transition shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <PlusCircle size={18} />
                  {orgLoading ? 'Creando Organización...' : 'Crear Organización'}
                </button>
              </form>
            </div>

            {/* Tabla de Organizaciones Existentes */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Organizaciones Registradas ({organizacionesList.length})
                  </h3>
                  <p className="text-xs text-gray-400">
                    Monitorea empleados asociados y controla el estado operativo
                  </p>
                </div>
                <button 
                  onClick={cargarOrganizaciones}
                  className="text-xs flex items-center gap-2 text-gray-400 hover:text-white font-bold bg-gray-900 px-4 py-2 rounded-xl border border-gray-800"
                >
                  <RefreshCw size={14} /> Recargar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      <th className="py-3 px-4">Organización</th>
                      <th className="py-3 px-4">Slug</th>
                      <th className="py-3 px-4">Módulos</th>
                      <th className="py-3 px-4 text-center">Empleados</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-xs">
                    {organizacionesList.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500 font-medium">
                          No hay organizaciones registradas aún.
                        </td>
                      </tr>
                    ) : (
                      organizacionesList.map(org => {
                        const cantEmp = empleadosCounts[org.id] || 0;
                        const esActivo = org.estado === 'activo';

                        return (
                          <tr key={org.id} className="hover:bg-gray-800/20 transition">
                            <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                              <Building2 size={16} className="text-blue-400 shrink-0" />
                              <span>{org.nombre}</span>
                            </td>
                            <td className="py-4 px-4 font-mono text-[11px] text-gray-400">
                              {org.slug}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex gap-1 flex-wrap">
                                {Array.isArray(org.modulos_activos) && org.modulos_activos.map(m => (
                                  <span 
                                    key={m} 
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-300 border border-gray-700"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center gap-1 font-bold text-gray-300 bg-gray-800/80 px-2.5 py-1 rounded-xl">
                                <Users size={12} className="text-gray-400" /> {cantEmp}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                esActivo 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {org.estado}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleToggleEstadoOrg(org)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition inline-flex items-center gap-1.5 ${
                                  esActivo
                                    ? 'bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/20'
                                    : 'bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/20'
                                }`}
                                title={esActivo ? 'Suspender organización' : 'Activar organización'}
                              >
                                {esActivo ? <PowerOff size={12} /> : <Power size={12} />}
                                {esActivo ? 'Suspender' : 'Activar'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default DevPortal;
