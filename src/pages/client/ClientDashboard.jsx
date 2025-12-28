import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enviarPeticion } from '../../services/api';
import { useConfig } from '../../context/ConfigContext'; 
import { useAuth } from '../../context/AuthContext'; 
import html2pdf from 'html2pdf.js'; 
import SearchableSelect from '../../components/SearchableSelect'; 
import { 
  Wallet, Map, Users, ArrowRightCircle, Plane, Clock, User, Copy, Check, LayoutList, LayoutGrid, X, 
  FileText, Phone, Mail, MapPin, Flag, UserCheck, Calendar, CreditCard, Loader, Search,
  Download, Printer, Pencil, Save, Plus, Trash2, Settings, AlertCircle, CheckCircle, HelpCircle
} from 'lucide-react';

export default function ClientDashboard({ user }) {
  const navigate = useNavigate();
  const { config } = useConfig(); 
  const { profiles } = useAuth(); 
  
  const userClients = profiles.filter(p => p.tipo === 'Cliente');

  // DATOS
  const [data, setData] = useState(null);
  const [clientProfile, setClientProfile] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen'); 
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  
  // CATÁLOGOS
  const [nacionalidades, setNacionalidades] = useState([]);
  const [paises, setPaises] = useState([]);

  // MODALES
  const [selectedPasajero, setSelectedPasajero] = useState(null);
  const [showAddPasajero, setShowAddPasajero] = useState(false); 
  const [showProfileModal, setShowProfileModal] = useState(false); 
  
  // LINKS
  const [generatingLinkId, setGeneratingLinkId] = useState(null); 
  const [copiedId, setCopiedId] = useState(null);

  // EDICIÓN / FORMULARIOS
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [profileForm, setProfileForm] = useState({});
  const [newPasajeroForm, setNewPasajeroForm] = useState({ nombre: '', apellidoP: '', correo: '', telefono: '' });
  const [saving, setSaving] = useState(false);

  // REPORTES
  const [showModalSelector, setShowModalSelector] = useState(false);
  const [showModalReporte, setShowModalReporte] = useState(false);
  
  const [filtroReporte, setFiltroReporte] = useState({ 
      idCliente: user.idCliente, 
      idViaje: '', 
      fechaInicio: '', 
      fechaFin: '' 
  });
  
  const [reporteData, setReporteData] = useState({ transacciones: [], cliente: null, resumen: {ingresos:0, egresos:0, saldoReal:0}, esGeneral: false });
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });

  useEffect(() => {
    cargarDatos();
    cargarCatalogos();
  }, [user]);

  useEffect(() => { setSearchTerm(''); }, [activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    const promesas = [
        enviarPeticion({ 
            accion: 'obtenerDashboardUsuario', 
            idUsuario: user.id,      
            tipoPerfil: 'Cliente',   
            idPerfil: user.idCliente 
        })
    ];

    if (user.idCliente) {
        promesas.push(enviarPeticion({ accion: 'obtenerSaldoCliente', idCliente: user.idCliente }));
        promesas.push(enviarPeticion({ accion: 'obtenerEstadoCuentaGlobal', idCliente: user.idCliente }));
    }

    try {
        const resultados = await Promise.all(promesas);
        const resDashboard = resultados[0];
        const resSaldo = resultados[1];
        const resTransacciones = resultados[2];

        if (resDashboard.exito) {
            const datos = resDashboard.datos;
            
            if (resTransacciones && resTransacciones.exito) {
                let pagadoReal = 0;
                let costoReal = 0;
                resTransacciones.datos.forEach(t => {
                    const monto = parseFloat(String(t.monto).replace(/[^0-9.-]+/g,"")) || 0;
                    if (t.tipoId == 1 || t.tipoId == 3) pagadoReal += monto;
                    if (t.tipoId == 2) costoReal += monto;
                });
                if (!datos.finanzas) datos.finanzas = {};
                datos.finanzas.pagado = pagadoReal;
                datos.finanzas.costoTotal = costoReal;
            }

            if (resSaldo && resSaldo.exito) {
                if (!datos.finanzas) datos.finanzas = {};
                datos.finanzas.saldo = resSaldo.saldo;
            }

            setData(datos);
            setClientProfile(datos.perfil); 
        } else {
            console.error("Error Dashboard:", resDashboard.error);
        }
    } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
    }
    
    setLoading(false);
  };

  const cargarCatalogos = async () => {
      try {
          const [resNac, resListas] = await Promise.all([
              enviarPeticion({ accion: 'obtenerNacionalidades' }),
              enviarPeticion({ accion: 'obtenerListas' })
          ]);
          if(resNac.exito && resNac.listas) setNacionalidades(resNac.listas.nacionalidades || []);
          if(resListas.exito && resListas.listas) setPaises(resListas.listas.paises || []);
      } catch (e) { console.error("Error cargando catálogos", e); }
  };

  const showAlert = (title, message, type = 'info') => {
      setAlertConfig({ show: true, type, title, message, onConfirm: null });
  };

  const showConfirm = (title, message, onConfirm) => {
      setAlertConfig({ show: true, type: 'confirm', title, message, onConfirm });
  };

  const closeAlert = () => {
      setAlertConfig({ ...alertConfig, show: false });
  };

  // --- HELPERS ---
  const getNombreNacionalidad = (id) => {
      if (!id) return 'N/D';
      const nac = nacionalidades.find(n => n.id == id);
      return nac ? nac.nombre : id; 
  };
  const getNombrePais = (id) => {
      if (!id) return '';
      const p = paises.find(x => x.id == id);
      return p ? p.nombre : id;
  };
  const formatoFecha = (fechaStr) => {
      if (!fechaStr) return 'N/D';
      if (fechaStr.includes('/')) return fechaStr; 
      try {
          const [anio, mes, dia] = fechaStr.split('T')[0].split('-');
          if (anio && mes && dia) return `${dia}/${mes}/${anio}`;
          const d = new Date(fechaStr);
          return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (e) { return fechaStr; }
  };
  const fechaParaInput = (fechaStr) => {
      if (!fechaStr) return '';
      if (fechaStr.includes('/')) {
          const [d, m, y] = fechaStr.split('/');
          return `${y}-${m}-${d}`;
      }
      try {
          const d = new Date(fechaStr);
          if (isNaN(d.getTime())) return '';
          return d.toISOString().split('T')[0];
      } catch(e) { return ''; }
  };
  const parseFechaLocal = (fechaStr) => {
      if (!fechaStr) return null;
      try {
          if (fechaStr.includes('/')) {
              const [dia, mes, anio] = fechaStr.split('/');
              return new Date(anio, mes - 1, dia);
          }
          return new Date(fechaStr);
      } catch (e) { return null; }
  };
  const getInviteUrl = (token) => {
      if (!token) return '';
      const baseUrl = window.location.origin;
      return `${baseUrl}/invite?token=${token}`;
  };

  // --- LÓGICA DE EDICIÓN Y PASAJEROS ---
  const abrirEditarPerfil = () => { setProfileForm({ ...clientProfile }); setShowProfileModal(true); };
  
  const guardarPerfil = async (e) => {
      e.preventDefault();
      setSaving(true);
      const res = await enviarPeticion({ accion: 'editarPerfilCliente', cliente: profileForm });
      if (res.exito) {
          setClientProfile(profileForm);
          setShowProfileModal(false);
          showAlert("Perfil Actualizado", "Tus datos han sido guardados correctamente.", "success");
      } else {
          showAlert("Error", res.error, "error");
      }
      setSaving(false);
  };

  const guardarNuevoPasajero = async (e) => {
      e.preventDefault();
      setSaving(true);
      const nuevo = { ...newPasajeroForm, idCliente: user.idCliente };
      const res = await enviarPeticion({ accion: 'agregarPasajero', pasajero: nuevo });
      
      if (res.exito) {
          await cargarDatos(); 
          setShowAddPasajero(false);
          setNewPasajeroForm({ nombre: '', apellidoP: '', correo: '', telefono: '' });
          showAlert("Pasajero Agregado", "El pasajero se ha creado. Ahora puedes enviarle su link de invitación.", "success");
      } else {
          showAlert("Error", res.error, "error");
      }
      setSaving(false);
  };

  const handleEditClick = () => {
      setEditForm({ ...selectedPasajero, fechaNacimiento: fechaParaInput(selectedPasajero.fechaNacimiento) });
      setIsEditing(true);
  };

  const handleSavePasajero = async () => {
      setSaving(true);
      const res = await enviarPeticion({ accion: 'editarPasajero', pasajero: editForm });
      if (res.exito) {
          const updatedPasajeros = data.pasajeros.map(p => 
              p.id === editForm.id ? { ...p, ...editForm, fechaNacimiento: formatoFecha(editForm.fechaNacimiento) } : p
          );
          setData({ ...data, pasajeros: updatedPasajeros });
          setSelectedPasajero({ ...selectedPasajero, ...editForm, fechaNacimiento: formatoFecha(editForm.fechaNacimiento) });
          setIsEditing(false);
          showAlert("Guardado", "La información del pasajero ha sido actualizada.", "success");
      } else { 
          showAlert("Error", res.error, "error"); 
      }
      setSaving(false);
  };

  const eliminarPasajero = (idPasajero) => {
      showConfirm("¿Eliminar Pasajero?", "Esta acción desvinculará al pasajero de tu cuenta. ¿Estás seguro?", async () => {
          const res = await enviarPeticion({ accion: 'desvincularPasajero', idPasajero, idCliente: user.idCliente });
          if(res.exito) {
              setData(prev => ({
                  ...prev,
                  pasajeros: prev.pasajeros.filter(p => p.id !== idPasajero)
              }));
              if(selectedPasajero?.id === idPasajero) setSelectedPasajero(null);
              showAlert("Eliminado", "El pasajero ha sido desvinculado.", "success");
          } else {
              showAlert("Error", res.error, "error");
          }
      });
  };

  const handleGenerateLink = async (e, idPasajero) => {
    e.stopPropagation(); 
    setGeneratingLinkId(idPasajero);
    const res = await enviarPeticion({ accion: 'generarTokenInvitacion', idPasajero });
    if (res.exito) {
        setData(prev => ({
            ...prev,
            pasajeros: prev.pasajeros.map(p => p.id === idPasajero ? { ...p, token: res.token } : p)
        }));
        if (selectedPasajero && selectedPasajero.id === idPasajero) {
            setSelectedPasajero(prev => ({ ...prev, token: res.token }));
        }
        const link = getInviteUrl(res.token);
        navigator.clipboard.writeText(link);
        setCopiedId(idPasajero);
        setTimeout(() => setCopiedId(null), 3000);
    } else { 
        showAlert("Error", res.error, "error"); 
    }
    setGeneratingLinkId(null);
  };

  const handleCopyExistingLink = (e, token, idPasajero) => {
      e.stopPropagation();
      const link = getInviteUrl(token);
      navigator.clipboard.writeText(link);
      setCopiedId(idPasajero);
      setTimeout(() => setCopiedId(null), 3000);
  };

  // --- REPORTES ---
  const abrirSelectorReporte = () => { 
      setFiltroReporte({ idCliente: user.idCliente, idViaje: '', fechaInicio: '', fechaFin: '' }); 
      setShowModalSelector(true); 
  };
  
  const generarReporte = async () => {
      setLoadingReporte(true);
      let transacciones = [];
      let clienteInfo = null;
      let esGeneral = false;
      let saldoTotal = 0;

      // 1. Obtención de datos
      if (filtroReporte.idCliente === 'ALL_MINE') {
          esGeneral = true;
          clienteInfo = { nombre: "REPORTE CONSOLIDADO", rfc: "Varios Clientes" };
          const promesas = userClients.map(c => 
              enviarPeticion({ accion: 'obtenerEstadoCuentaGlobal', idCliente: c.id, idViaje: '' })
          );
          const promesasSaldo = userClients.map(c => 
              enviarPeticion({ accion: 'obtenerSaldoCliente', idCliente: c.id })
          );
          const [resultadosTrans, resultadosSaldos] = await Promise.all([Promise.all(promesas), Promise.all(promesasSaldo)]);
          resultadosTrans.forEach(res => { if (res.exito) transacciones = [...transacciones, ...res.datos]; });
          resultadosSaldos.forEach(res => { if (res.exito) saldoTotal += (res.saldo || 0); });
      } else {
          const promesas = [
              enviarPeticion({ accion: 'obtenerEstadoCuentaGlobal', idCliente: filtroReporte.idCliente, idViaje: filtroReporte.idViaje })
          ];
          if (!filtroReporte.idViaje) promesas.push(enviarPeticion({ accion: 'obtenerSaldoCliente', idCliente: filtroReporte.idCliente }));
          
          const [res, resSaldo] = await Promise.all(promesas);
          if (res.exito) {
              transacciones = res.datos;
              clienteInfo = res.cliente;
              if (resSaldo && resSaldo.exito) saldoTotal = resSaldo.saldo;
              else saldoTotal = data?.finanzas?.saldo || 0; 
          } else {
              showAlert("Error", res.error, "error");
              setLoadingReporte(false);
              return;
          }
      }

      // 2. Filtro Fechas
      if (filtroReporte.fechaInicio) {
          const fInicio = new Date(filtroReporte.fechaInicio); fInicio.setHours(0,0,0,0);
          transacciones = transacciones.filter(t => { const ft = parseFechaLocal(t.fecha); return ft && ft >= fInicio; });
      }
      if (filtroReporte.fechaFin) {
          const fFin = new Date(filtroReporte.fechaFin); fFin.setHours(23,59,59,999);
          transacciones = transacciones.filter(t => { const ft = parseFechaLocal(t.fecha); return ft && ft <= fFin; });
      }

      // 3. Totales
      let ing = 0, egr = 0;
      transacciones.forEach(t => {
         const m = parseFloat(String(t.monto).replace(/[^0-9.-]+/g,"")) || 0;
         if (t.tipoId == 1 || t.tipoId == 3) ing += m; 
         if (t.tipoId == 2) egr += m; 
      });

      setReporteData({ transacciones, cliente: clienteInfo, resumen: { ingresos: ing, egresos: egr, saldoReal: saldoTotal }, esGeneral });
      setShowModalSelector(false);
      setShowModalReporte(true);
      setLoadingReporte(false);
  };

  const descargarExcel = () => {
    if (!reporteData.transacciones.length) return showAlert("Sin Datos", "No hay información para exportar.", "info");
    const colSpanTotal = reporteData.esGeneral ? 5 : 4;
    const extraHeader = reporteData.esGeneral ? '<th style="background:#1e3a8a;color:white;">Cliente</th>' : '';
    const rangoFechas = (filtroReporte.fechaInicio || filtroReporte.fechaFin) 
        ? `Periodo: ${filtroReporte.fechaInicio || 'Inicio'} al ${filtroReporte.fechaFin || 'Hoy'}` 
        : `Fecha Emisión: ${new Date().toLocaleDateString()}`;

    let htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head><body><table>
          <tr><td colspan="${colSpanTotal}" align="center" style="font-size:18px;font-weight:bold;color:#2563eb;">ESTADO DE CUENTA - ${config.nombre_empresa || 'IGO Viajes'}</td></tr>
          <tr><td colspan="${colSpanTotal}" align="center">Cliente: ${reporteData.cliente?.nombre}</td></tr>
          <tr><td colspan="${colSpanTotal}" align="center">${rangoFechas}</td></tr>
          <tr><td colspan="${colSpanTotal}"></td></tr>
          <tr><th style="background:#1e3a8a;color:white;">Fecha</th>${extraHeader}<th style="background:#1e3a8a;color:white;">Concepto</th><th style="background:#1e3a8a;color:white;">Tipo</th><th style="background:#1e3a8a;color:white;">Monto</th></tr>
    `;
    
    reporteData.transacciones.forEach(t => {
      const esAbono = (t.tipoId == 1 || t.tipoId == 3);
      const tipoTexto = t.tipoId == 1 ? 'PAGO' : (t.tipoId == 3 ? 'ABONO CTA' : 'CARGO');
      const monto = parseFloat(String(t.monto).replace(/[^0-9.-]+/g,"")) || 0;
      const clientCell = reporteData.esGeneral ? `<td>${t.nombreCliente}</td>` : '';
      htmlTable += `<tr><td>${t.fecha}</td>${clientCell}<td>${t.concepto}</td><td style="color:${esAbono ? '#16a34a' : '#dc2626'}">${tipoTexto}</td><td style="color:${esAbono ? '#16a34a' : '#dc2626'}">$${monto.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td></tr>`;
    });
    
    const saldoFinal = reporteData.resumen.ingresos - reporteData.resumen.egresos;
    htmlTable += `<tr><td colspan="${colSpanTotal}"></td></tr><tr><td colspan="${colSpanTotal - 1}" align="right"><b>Total Pagado (Abonos):</b></td><td style="color:#16a34a"><b>$${reporteData.resumen.ingresos.toLocaleString('es-MX')}</b></td></tr><tr><td colspan="${colSpanTotal - 1}" align="right"><b>Total Costos (Cargos):</b></td><td style="color:#dc2626"><b>$${reporteData.resumen.egresos.toLocaleString('es-MX')}</b></td></tr><tr><td colspan="${colSpanTotal - 1}" align="right" style="background:#eff6ff; color:#2563eb;"><b>BALANCE PERIODO:</b></td><td style="background:#eff6ff; color:#2563eb;"><b>$${saldoFinal.toLocaleString('es-MX')}</b></td></tr><tr><td colspan="${colSpanTotal - 1}" align="right" style="background:#f0f9ff; color:#0369a1;"><b>SALDO MONEDERO ACTUAL:</b></td><td style="background:#f0f9ff; color:#0369a1;"><b>$${reporteData.resumen.saldoReal.toLocaleString('es-MX')}</b></td></tr></table></body></html>`;
    const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; 
    const cleanName = reporteData.cliente?.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `EdoCta_${cleanName}.xls`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const descargarPDF = () => {
    const element = document.getElementById('print-area-cliente');
    if (!element) return;
    setGenerandoPDF(true);
    
    // Configuración ajustada al estilo Admin (sin pagebreak agresivo para evitar huecos)
    const opt = { 
        margin: [10, 10], 
        filename: `EdoCta_${new Date().toISOString().slice(0,10)}.pdf`, 
        image: { type: 'jpeg', quality: 0.98 }, 
        html2canvas: { scale: 2 }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    
    html2pdf().set(opt).from(element).save().then(() => setGenerandoPDF(false));
  };

  const getFilteredPasajeros = () => { if (!data?.pasajeros) return []; if (!searchTerm) return data.pasajeros; const term = searchTerm.toLowerCase(); return data.pasajeros.filter(p => p.nombre.toLowerCase().includes(term) || p.apellidoP.toLowerCase().includes(term) || (p.correo && p.correo.toLowerCase().includes(term))); };
  const getFilteredViajes = () => { if (!data?.historialViajes) return []; if (!searchTerm) return data.historialViajes; const term = searchTerm.toLowerCase(); return data.historialViajes.filter(v => v.nombre.toLowerCase().includes(term) || (v.destino && v.destino.toLowerCase().includes(term))); };

  if (loading) return <div className="dashboard-container" style={{textAlign:'center', padding:'50px', color:'#94a3b8'}}>Cargando información...</div>;
  if (!data) return <div className="dashboard-container" style={{textAlign:'center', padding:'50px', color:'#ef4444'}}>No se pudo cargar la información. Intenta recargar.</div>;

  const pasajerosFiltrados = getFilteredPasajeros();
  const viajesFiltrados = getFilteredViajes();

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: '15px' }}>
        <div>
            <h1 style={{ fontSize: '2rem', color: 'var(--primary-dark)', fontWeight: '800', margin: 0 }}>Hola, {user.nombre.split(' ')[0]}</h1>
            <p style={{ color: '#64748b', margin: '5px 0 0' }}>Bienvenido a tu portal de viajes.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={abrirEditarPerfil} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', padding: '10px 16px', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18}/> Mi Perfil
            </button>
            <button onClick={abrirSelectorReporte} style={{ background: 'white', border: '1px solid #e2e8f0', color: 'var(--primary)', padding: '10px 16px', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <FileText size={18}/> Estado de Cuenta
            </button>
            {activeTab === 'pasajeros' && (
                <button onClick={() => setShowAddPasajero(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px' }}>
                    <Plus size={18}/> Nuevo Pasajero
                </button>
            )}
            {(activeTab === 'viajes' || activeTab === 'pasajeros') && (
                <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex' }}>
                    <button onClick={() => setViewMode('grid')} style={{ padding: '8px', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'grid' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer' }}><LayoutGrid size={18}/></button>
                    <button onClick={() => setViewMode('list')} style={{ padding: '8px', border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'list' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer' }}><LayoutList size={18}/></button>
                </div>
            )}
        </div>
      </div>

      {/* TABS Y BUSCADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '25px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto' }}>
            <TabButton active={activeTab === 'resumen'} onClick={() => setActiveTab('resumen')} icon={<Wallet size={18}/>} label="Resumen Financiero" />
            <TabButton active={activeTab === 'viajes'} onClick={() => setActiveTab('viajes')} icon={<Map size={18}/>} label="Mis Viajes" />
            <TabButton active={activeTab === 'pasajeros'} onClick={() => setActiveTab('pasajeros')} icon={<Users size={18}/>} label="Pasajeros" />
        </div>
        {(activeTab === 'pasajeros' || activeTab === 'viajes') && (
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" placeholder={activeTab === 'pasajeros' ? "Buscar pasajero..." : "Buscar viaje..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '50px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem', background: 'white' }} />
            </div>
        )}
      </div>

      {/* CONTENIDO TABS */}
      {activeTab === 'resumen' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '1rem', textTransform: 'uppercase' }}>Estado de Cuenta</h3>
                <div className="dashboard-card" style={{ padding: '24px', background: 'var(--primary-gradient)', color: 'white', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.9 }}><Wallet size={24}/> <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>MI MONEDERO</span></div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>${data.finanzas.saldo.toLocaleString()}</div>
                        <p style={{ margin: '5px 0 0', fontSize: '0.9rem', opacity: 0.9 }}>Saldo disponible a favor</p>
                    </div>
                    <Wallet size={120} style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.1, transform: 'rotate(-15deg)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="dashboard-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}><div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '5px' }}>TOTAL PAGADO</div><div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>${data.finanzas.pagado.toLocaleString()}</div></div>
                    <div className="dashboard-card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}><div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '5px' }}>COSTO SERVICIOS</div><div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>${data.finanzas.costoTotal.toLocaleString()}</div></div>
                </div>
            </div>
            <div>
                <h3 style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '1rem', textTransform: 'uppercase' }}>Viajes en Curso</h3>
                {data.viajesActivos.length === 0 ? <div style={emptyStateStyle}>No tienes viajes activos.</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>{data.viajesActivos.map(v => <ViajeCard key={v.id} viaje={v} navigate={navigate} active={true} viewMode="list" />)}</div>
                )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'viajes' && (
        <div className="fade-in">
          <div style={{ display: viewMode === 'grid' ? 'grid' : 'flex', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', flexDirection: 'column', gap: '15px' }}>
            {viajesFiltrados.length === 0 && <div style={{...emptyStateStyle, width:'100%'}}>No se encontraron viajes.</div>}
            {viajesFiltrados.map(v => <ViajeCard key={v.id} viaje={v} navigate={navigate} viewMode={viewMode} />)}
          </div>
        </div>
      )}

      {activeTab === 'pasajeros' && (
        <div className="fade-in">
          <div style={{ display: viewMode === 'grid' ? 'grid' : 'flex', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', flexDirection: 'column', gap: '15px' }}>
            {pasajerosFiltrados.length === 0 && <div style={{...emptyStateStyle, gridColumn: '1/-1'}}>No se encontraron pasajeros.</div>}
            {pasajerosFiltrados.map(pasajero => (
              <div key={pasajero.id} className="dashboard-card" onClick={() => { setSelectedPasajero(pasajero); setIsEditing(false); }} style={{ padding: viewMode === 'list' ? '12px 20px' : '20px', cursor: 'pointer', display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', alignItems: viewMode === 'list' ? 'center' : 'stretch', gap: viewMode === 'list' ? '15px' : '15px', borderLeft: viewMode === 'list' && pasajero.registrado ? '4px solid #10b981' : '1px solid #e2e8f0', minHeight: 'auto', flexWrap: 'nowrap' }}>
                <div style={{ flexShrink: 0, display: 'flex', justifyContent: viewMode==='list'?'center':'flex-start' }}>
                   <div style={{ background: pasajero.registrado ? '#ecfdf5' : '#eff6ff', padding: '8px', borderRadius: '50%', color: pasajero.registrado ? '#10b981' : 'var(--primary)' }}>{pasajero.registrado ? <UserCheck size={18}/> : <User size={18}/>}</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', alignItems: viewMode === 'list' ? 'center' : 'flex-start', gap: viewMode === 'list' ? '20px' : '5px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', alignItems: viewMode === 'list' ? 'center' : 'flex-start', gap: viewMode === 'list' ? '8px' : '2px', minWidth: viewMode === 'list' ? 'auto' : 'auto' }}>
                        <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{pasajero.nombre} {pasajero.apellidoP}</h4>
                        {viewMode === 'list' && getNombreNacionalidad(pasajero.nacionalidad) !== 'N/D' && <span style={{color:'#cbd5e1'}}>•</span>}
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{getNombreNacionalidad(pasajero.nacionalidad)}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', gap: viewMode === 'list' ? '20px' : '5px', fontSize: '0.85rem', color: '#475569' }}>
                         {pasajero.telefono && <div style={{display:'flex', alignItems:'center', gap:'6px', whiteSpace: 'nowrap'}}><Phone size={14}/> {pasajero.telefono}</div>}
                         {pasajero.correo && <div style={{display:'flex', alignItems:'center', gap:'6px', whiteSpace: 'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth: viewMode==='list'?'300px':'100%'}}><Mail size={14}/> {pasajero.correo}</div>}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: viewMode === 'list' ? 'flex-end' : 'space-between', width: viewMode === 'list' ? 'auto' : '100%', marginTop: viewMode === 'list' ? 0 : '10px', paddingTop: viewMode === 'list' ? 0 : '10px', borderTop: viewMode === 'list' ? 'none' : '1px solid #f1f5f9', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', color: pasajero.registrado ? '#10b981' : '#94a3b8', fontWeight: '700', background: pasajero.registrado ? '#ecfdf5' : '#f1f5f9', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{pasajero.registrado ? 'Activo' : 'Pendiente'}</span>
                    <button onClick={(e) => { e.stopPropagation(); eliminarPasajero(pasajero.id); }} style={{ background: '#fee2e2', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: '#dc2626' }} title="Eliminar Pasajero">
                        <Trash2 size={16}/>
                    </button>
                    {!pasajero.registrado && (
                        <button 
                            onClick={(e) => pasajero.token ? handleCopyExistingLink(e, pasajero.token, pasajero.id) : handleGenerateLink(e, pasajero.id)} 
                            style={{
                                ...btnLinkStyle(copiedId === pasajero.id), 
                                padding: '6px 12px', 
                                fontSize: '0.8rem',
                                minWidth: '90px',
                                justifyContent: 'center'
                            }} 
                            disabled={generatingLinkId === pasajero.id}
                        >
                            {generatingLinkId === pasajero.id ? <Loader size={14} className="spin" /> : 
                                (copiedId === pasajero.id ? <><Check size={14}/> ¡Copiado!</> : 
                                    (pasajero.token ? <><Copy size={14}/> Copiar Link</> : <><Copy size={14}/> {viewMode === 'list' ? 'Invitar' : 'Crear Link'}</>)
                                )
                            }
                        </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPasajero && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '600px' }}>
             <div style={{ padding: '24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                   <div style={{ background: selectedPasajero.registrado ? '#ecfdf5' : '#eff6ff', padding: '10px', borderRadius: '50%', color: selectedPasajero.registrado ? '#10b981' : 'var(--primary)' }}>{selectedPasajero.registrado ? <UserCheck size={24}/> : <User size={24}/>}</div>
                   <div>
                      <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)', fontWeight: '800' }}>{isEditing ? 'Editar Pasajero' : `${selectedPasajero.nombre} ${selectedPasajero.apellidoP}`}</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.85rem' }}>
                         <span style={{ color: selectedPasajero.registrado ? '#10b981' : '#94a3b8', fontWeight: '700' }}>{selectedPasajero.registrado ? 'Cuenta Activa' : 'Registro Pendiente'}</span>
                      </div>
                   </div>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    {!isEditing && (
                        <button onClick={handleEditClick} style={{ background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            <Pencil size={18}/>
                        </button>
                    )}
                    <button onClick={() => setSelectedPasajero(null)} style={{ background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                </div>
             </div>

             <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {isEditing ? (
                    <div style={{display:'grid', gap:'15px'}}>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                            <div><label style={labelStyle}>Nombre(s)</label><input style={inputStyle} value={editForm.nombre || ''} onChange={e=>setEditForm({...editForm, nombre:e.target.value})}/></div>
                            <div><label style={labelStyle}>Apellido Paterno</label><input style={inputStyle} value={editForm.apellidoP || ''} onChange={e=>setEditForm({...editForm, apellidoP:e.target.value})}/></div>
                            <div style={{gridColumn:'1 / -1'}}><label style={labelStyle}>Correo</label><input style={inputStyle} value={editForm.correo || ''} onChange={e=>setEditForm({...editForm, correo:e.target.value})}/></div>
                            <div><label style={labelStyle}>Teléfono</label><input style={inputStyle} value={editForm.telefono || ''} onChange={e=>setEditForm({...editForm, telefono:e.target.value})}/></div>
                            <div><label style={labelStyle}>Fecha Nacimiento</label><input type="date" style={inputStyle} value={editForm.fechaNacimiento || ''} onChange={e=>setEditForm({...editForm, fechaNacimiento:e.target.value})}/></div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div>
                        <SectionLabel icon={<User size={16} />} title="Información Personal" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <InfoItem label="Apellido Materno" value={selectedPasajero.apellidoM} />
                            <InfoItem label="Fecha Nacimiento" value={formatoFecha(selectedPasajero.fechaNacimiento)} icon={<Calendar size={14}/>} />
                            <InfoItem label="Nacionalidad" value={getNombreNacionalidad(selectedPasajero.nacionalidad)} icon={<Flag size={14}/>} />
                        </div>
                        </div>
                        {(selectedPasajero.pasaporte || selectedPasajero.visa) && (
                        <div>
                            <SectionLabel icon={<FileText size={16} />} title="Documentación" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <InfoItem label="Pasaporte" value={selectedPasajero.pasaporte} isCode icon={<CreditCard size={14}/>} />
                                <InfoItem label="Visa" value={selectedPasajero.visa} isCode icon={<CreditCard size={14}/>} />
                            </div>
                        </div>
                        )}
                        {(selectedPasajero.calle || selectedPasajero.ciudad || selectedPasajero.pais) && (
                        <div>
                            <SectionLabel icon={<MapPin size={16} />} title="Dirección" />
                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', fontSize: '0.95rem', lineHeight: '1.6', color: '#334155' }}>
                                {selectedPasajero.calle} {selectedPasajero.numExt} {selectedPasajero.numInt ? `Int ${selectedPasajero.numInt}` : ''} <br/>{selectedPasajero.colonia} <br/>{selectedPasajero.ciudad}, {getNombrePais(selectedPasajero.pais)} {selectedPasajero.cp ? `- CP ${selectedPasajero.cp}` : ''}
                            </div>
                        </div>
                        )}
                        <div>
                        <SectionLabel icon={<Phone size={16} />} title="Contacto" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <InfoItem label="Teléfono" value={`${selectedPasajero.lada ? `(${selectedPasajero.lada}) ` : ''}${selectedPasajero.telefono}`} />
                            <InfoItem label="Correo" value={selectedPasajero.correo} icon={<Mail size={14}/>} />
                        </div>
                        </div>
                        {!selectedPasajero.registrado && (
                            <div style={{ marginTop: '10px', background: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px dashed #60a5fa' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <SectionLabel icon={<Copy size={16} />} title="Enlace de Registro" style={{ marginBottom: 0 }} />
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', background: 'white', padding: '2px 8px', borderRadius: '10px' }}>Para enviar al pasajero</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input readOnly value={selectedPasajero.token ? getInviteUrl(selectedPasajero.token) : "No generado aún"} style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e3a8a', fontSize: '0.9rem' }} />
                                    {selectedPasajero.token ? (
                                        <button onClick={(e) => handleCopyExistingLink(e, selectedPasajero.token, selectedPasajero.id)} style={{background:'var(--primary)', color:'white', border:'none', borderRadius:'8px', padding:'0 15px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>{copiedId === selectedPasajero.id ? <Check size={18}/> : <Copy size={18}/>}</button>
                                    ) : (
                                        <button onClick={(e) => handleGenerateLink(e, selectedPasajero.id)} disabled={generatingLinkId === selectedPasajero.id} style={{background:'var(--primary)', color:'white', border:'none', borderRadius:'8px', padding:'0 20px', cursor:'pointer', fontWeight:'700'}}>{generatingLinkId === selectedPasajero.id ? '...' : 'Crear'}</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
             </div>
             
             <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f8fafc', borderRadius: '0 0 24px 24px', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                {isEditing ? (
                    <>
                        <button onClick={() => setIsEditing(false)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '10px 24px', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', color: '#64748b' }}>Cancelar</button>
                        <button onClick={handleSavePasajero} disabled={saving} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px', fontSize: '0.9rem' }}>
                            {saving ? 'Guardando...' : <><Save size={16}/> Guardar</>}
                        </button>
                    </>
                ) : (
                    <button onClick={() => setSelectedPasajero(null)} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px', fontSize: '0.9rem' }}>Cerrar Ficha</button>
                )}
             </div>
          </div>
        </div>
      )}

      {showAddPasajero && (
        <div style={modalOverlayStyle}>
            <div style={{...modalContentStyle, maxWidth:'500px', maxHeight:'auto'}}>
                <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}><h3 style={{margin:0}}>Nuevo Pasajero</h3><button onClick={()=>setShowAddPasajero(false)} style={closeBtnStyle}><X size={18}/></button></div>
                <div style={{padding:'25px'}}>
                    <form onSubmit={guardarNuevoPasajero} style={{display:'grid', gap:'15px'}}>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                            <div><label style={labelStyle}>Nombre *</label><input required style={inputStyle} value={newPasajeroForm.nombre} onChange={e=>setNewPasajeroForm({...newPasajeroForm, nombre:e.target.value})}/></div>
                            <div><label style={labelStyle}>Apellido Paterno *</label><input required style={inputStyle} value={newPasajeroForm.apellidoP} onChange={e=>setNewPasajeroForm({...newPasajeroForm, apellidoP:e.target.value})}/></div>
                        </div>
                        <label style={labelStyle}>Correo Electrónico (Opcional)</label><input type="email" style={inputStyle} value={newPasajeroForm.correo} onChange={e=>setNewPasajeroForm({...newPasajeroForm, correo:e.target.value})}/>
                        <label style={labelStyle}>Teléfono (Opcional)</label><input type="tel" style={inputStyle} value={newPasajeroForm.telefono} onChange={e=>setNewPasajeroForm({...newPasajeroForm, telefono:e.target.value})}/>
                        
                        <p style={{fontSize:'0.85rem', color:'#64748b', margin:'10px 0'}}>Solo necesitas la información básica. Luego podrás generar un enlace para que el pasajero complete su perfil.</p>
                        
                        <button type="submit" disabled={saving} className="btn-primary" style={{marginTop:'10px'}}>
                            {saving ? 'Guardando...' : 'Crear Pasajero'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {showProfileModal && (
        <div style={modalOverlayStyle}>
            <div style={{...modalContentStyle, maxWidth:'600px', maxHeight:'90vh', overflowY:'auto'}}>
                <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', position:'sticky', top:0, background:'white', zIndex:10}}><h3 style={{margin:0}}>Mi Perfil</h3><button onClick={()=>setShowProfileModal(false)} style={closeBtnStyle}><X size={18}/></button></div>
                <div style={{padding:'25px'}}>
                    <form onSubmit={guardarPerfil} style={{display:'grid', gap:'15px'}}>
                        <div>
                            <SectionLabel icon={<User size={16}/>} title="Datos Generales" style={{marginBottom:'10px'}}/>
                            <label style={labelStyle}>Nombre Completo / Comercial</label>
                            <input required style={inputStyle} value={profileForm.nombre || ''} onChange={e=>setProfileForm({...profileForm, nombre:e.target.value})}/>
                        </div>
                        <div>
                            <SectionLabel icon={<FileText size={16}/>} title="Datos Fiscales" style={{marginBottom:'10px'}}/>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                                <div><label style={labelStyle}>Razón Social</label><input style={inputStyle} value={profileForm.razonSocial || ''} onChange={e=>setProfileForm({...profileForm, razonSocial:e.target.value})}/></div>
                                <div><label style={labelStyle}>RFC</label><input style={inputStyle} value={profileForm.rfc || ''} onChange={e=>setProfileForm({...profileForm, rfc:e.target.value})}/></div>
                            </div>
                        </div>
                        <div>
                            <SectionLabel icon={<Phone size={16}/>} title="Contacto" style={{marginBottom:'10px'}}/>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'15px'}}>
                                <div><label style={labelStyle}>Lada</label><input style={inputStyle} value={profileForm.lada || ''} onChange={e=>setProfileForm({...profileForm, lada:e.target.value})}/></div>
                                <div><label style={labelStyle}>Teléfono</label><input style={inputStyle} value={profileForm.telefono || ''} onChange={e=>setProfileForm({...profileForm, telefono:e.target.value})}/></div>
                                <div style={{gridColumn:'1 / -1'}}><label style={labelStyle}>Correo</label><input style={inputStyle} value={profileForm.correo || ''} onChange={e=>setProfileForm({...profileForm, correo:e.target.value})}/></div>
                            </div>
                        </div>
                        <div>
                            <SectionLabel icon={<MapPin size={16}/>} title="Dirección" style={{marginBottom:'10px'}}/>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                                <div><label style={labelStyle}>País</label>
                                    <select style={inputStyle} value={profileForm.pais || ''} onChange={e=>setProfileForm({...profileForm, pais:e.target.value})}>
                                        <option value="">Seleccionar...</option>
                                        {paises.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div><label style={labelStyle}>CP</label><input style={inputStyle} value={profileForm.cp || ''} onChange={e=>setProfileForm({...profileForm, cp:e.target.value})}/></div>
                                
                                <div><label style={labelStyle}>Estado / Ciudad</label><input style={inputStyle} value={profileForm.ciudad || ''} onChange={e=>setProfileForm({...profileForm, ciudad:e.target.value})}/></div>
                                <div><label style={labelStyle}>Colonia</label><input style={inputStyle} value={profileForm.colonia || ''} onChange={e=>setProfileForm({...profileForm, colonia:e.target.value})}/></div>
                                
                                <div style={{gridColumn:'1 / -1'}}><label style={labelStyle}>Calle</label><input style={inputStyle} value={profileForm.calle || ''} onChange={e=>setProfileForm({...profileForm, calle:e.target.value})}/></div>
                                
                                <div><label style={labelStyle}>Num. Exterior</label><input style={inputStyle} value={profileForm.numExt || ''} onChange={e=>setProfileForm({...profileForm, numExt:e.target.value})}/></div>
                                <div><label style={labelStyle}>Num. Interior</label><input style={inputStyle} value={profileForm.numInt || ''} onChange={e=>setProfileForm({...profileForm, numInt:e.target.value})}/></div>
                            </div>
                        </div>

                        <button type="submit" disabled={saving} className="btn-primary" style={{marginTop:'15px'}}>
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {showModalSelector && (
        <div style={modalOverlayStyle}>
            <div style={{...modalContentStyle, maxWidth:'450px', maxHeight:'auto', overflow:'visible'}}>
                <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}><h3 style={{margin:0}}>Generar Estado de Cuenta</h3><button onClick={()=>setShowModalSelector(false)} style={closeBtnStyle}><X size={18}/></button></div>
                <div style={{padding:'25px', display:'flex', flexDirection:'column', gap:'15px'}}>
                    
                    {/* SELECCIÓN DE CLIENTE (MULTI-CUENTA) */}
                    {userClients.length > 1 && (
                        <div>
                            <label style={labelStyle}>Seleccionar Cliente</label>
                            <SearchableSelect 
                                options={[
                                    { id: "ALL_MINE", nombre: "★ Todos mis clientes (Consolidado)" }, 
                                    ...userClients
                                ]}
                                value={filtroReporte.idCliente}
                                onChange={(val) => setFiltroReporte({ ...filtroReporte, idCliente: val, idViaje: '' })}
                                placeholder="Elige un cliente..."
                            />
                        </div>
                    )}

                    {filtroReporte.idCliente !== "ALL_MINE" && (
                        <div style={{animation:'slideIn 0.2s'}}>
                            <label style={labelStyle}>Filtrar por Viaje (Opcional)</label>
                            <select 
                                value={filtroReporte.idViaje} 
                                onChange={e=>setFiltroReporte({ ...filtroReporte, idViaje: e.target.value })} 
                                style={inputStyle}
                            >
                                <option value="">-- General (Todos los movimientos) --</option>
                                {/* Filtramos los viajes para mostrar solo los que pertenecen al cliente seleccionado */}
                                {[...(data?.viajesActivos || []), ...(data?.historialViajes || [])]
                                    .filter(v => 
                                        // Si el usuario tiene varios clientes, data solo tiene los del perfil activo. 
                                        // Esto es una limitación menor: el filtro de viaje solo funcionará para el perfil activo.
                                        // Para el resto, será reporte general.
                                        true 
                                    )
                                    .map(v => (
                                    <option key={v.id} value={v.id}>{v.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* FILTRO DE FECHAS */}
                    <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:'15px' }}>
                        <label style={{...labelStyle, color:'var(--primary)'}}>Filtrar por Fechas (Opcional)</label>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                            <div>
                                <label style={{fontSize:'0.75rem', color:'#64748b'}}>Desde</label>
                                <input type="date" style={inputStyle} value={filtroReporte.fechaInicio} onChange={e=>setFiltroReporte({...filtroReporte, fechaInicio:e.target.value})} />
                            </div>
                            <div>
                                <label style={{fontSize:'0.75rem', color:'#64748b'}}>Hasta</label>
                                <input type="date" style={inputStyle} value={filtroReporte.fechaFin} onChange={e=>setFiltroReporte({...filtroReporte, fechaFin:e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <button onClick={generarReporte} disabled={loadingReporte} className="btn-primary" style={{marginTop:'10px'}}>
                        {loadingReporte ? 'Generando...' : 'Ver Reporte'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {showModalReporte && (
        <div style={modalOverlayStyle}>
            <div style={{ ...modalContentStyle, maxWidth: '800px', height: '90vh', padding: 0 }}>
                {/* TOOLBAR */}
                <div className="no-print" style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Vista Previa</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={descargarExcel} style={{ display: 'flex', gap: '5px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #16a34a', color: '#16a34a', background: 'white', cursor: 'pointer', fontWeight: '600' }}>
                            <Download size={18}/> Excel
                        </button>
                        <button onClick={descargarPDF} disabled={generandoPDF} style={{ display: 'flex', gap: '5px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600' }}>
                            <Printer size={18}/> {generandoPDF ? '...' : 'PDF'}
                        </button>
                        <button onClick={() => setShowModalReporte(false)} style={{ padding: '8px', borderRadius: '50%', border: 'none', background: '#e2e8f0', cursor: 'pointer' }}><X size={18}/></button>
                    </div>
                </div>
                <div id="print-area-cliente" className="print-area" style={{ padding: '40px', background: 'white', flex: 1, overflowY: 'auto' }}>
                    {/* Contenido Reporte */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '2px solid #2563eb', paddingBottom: '20px' }}>
                        <div><h1 style={{ margin: '0', color: '#2563eb', fontSize: '2rem' }}>ESTADO DE CUENTA</h1><p style={{ margin: '5px 0 0', color: '#64748b' }}>{reporteData.cliente?.rfc || 'Sin RFC'}</p></div>
                        <div style={{ textAlign: 'right' }}><h2 style={{ margin: 0, fontSize: '1.2rem' }}>{config.nombre_empresa || 'IGO Viajes'}</h2><p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: '#64748b' }}>{new Date().toLocaleDateString()}</p></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Cliente</h4>
                            <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{reporteData.cliente?.nombre}</div>
                            <div style={{marginTop:'5px', color:'var(--primary)', fontSize:'0.9rem', fontWeight:'600'}}>{filtroReporte.idViaje ? `Viaje: ${[...(data?.viajesActivos||[]), ...(data?.historialViajes||[])].find(v => v.id == filtroReporte.idViaje)?.nombre}` : 'Reporte General'}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resumen Financiero</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Total Pagado (Servicios):</span> <span style={{color:'#16a34a', fontWeight:'700'}}>${reporteData.resumen.ingresos.toLocaleString()}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Total Costos:</span> <span style={{color:'#dc2626', fontWeight:'700'}}>${reporteData.resumen.egresos.toLocaleString()}</span></div>
                            <div style={{ borderTop: '1px solid #cbd5e1', marginTop: '5px', paddingTop: '5px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#2563eb' }}><span>Saldo Monedero:</span> <span>${(reporteData.resumen.saldoReal).toLocaleString()}</span></div>
                        </div>
                    </div>
                    <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>Detalle de Movimientos</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead><tr style={{ background: '#f1f5f9' }}><th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Fecha</th>{reporteData.esGeneral && <th style={{padding:'10px',textAlign:'left',borderBottom:'1px solid #eee'}}>Cliente</th>}<th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Concepto</th><th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Tipo</th><th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Monto</th></tr></thead>
                        <tbody>
                            {reporteData.transacciones.map((t, i) => {
                                const esVerde = (t.tipoId == 1 || t.tipoId == 3);
                                const tipoEtiqueta = t.tipoId == 1 ? 'PAGO' : (t.tipoId == 3 ? 'ABONO CTA' : 'CARGO');
                                return (
                                    <tr key={i} style={{pageBreakInside: 'avoid'}}>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{t.fecha}</td>
                                        {reporteData.esGeneral && <td style={{padding:'10px',borderBottom:'1px solid #eee', fontWeight:'600'}}>{t.nombreCliente}</td>}
                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{t.concepto}</td>
                                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}><span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700', background: esVerde ? '#ecfdf5' : '#fef2f2', color: esVerde ? '#10b981' : '#ef4444' }}>{tipoEtiqueta}</span></td>
                                        <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontWeight: '600', color: esVerde ? '#10b981' : 'var(--text-main)' }}>${t.monto}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {alertConfig.show && (
        <div style={modalOverlayStyle}>
            <div style={{ ...modalContentStyle, maxWidth: '400px', maxHeight: 'auto', padding: '30px', textAlign: 'center', overflowY:'visible' }}>
                <div style={{ 
                    margin: '0 auto 20px', width: '60px', height: '60px', borderRadius: '50%', 
                    background: alertConfig.type === 'error' ? '#fef2f2' : (alertConfig.type === 'success' ? '#ecfdf5' : '#eff6ff'), 
                    color: alertConfig.type === 'error' ? '#ef4444' : (alertConfig.type === 'success' ? '#10b981' : '#2563eb'), 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                    {alertConfig.type === 'error' ? <X size={32}/> : (alertConfig.type === 'success' ? <CheckCircle size={32}/> : (alertConfig.type === 'confirm' ? <HelpCircle size={32}/> : <AlertCircle size={32}/>))}
                </div>
                <h3 style={{ margin: '0 0 10px', fontSize: '1.4rem', color: 'var(--text-main)' }}>{alertConfig.title}</h3>
                <p style={{ margin: '0 0 25px', color: '#64748b' }}>{alertConfig.message}</p>
                
                {alertConfig.type === 'confirm' ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={closeAlert} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', color: '#64748b' }}>Cancelar</button>
                        <button onClick={() => { alertConfig.onConfirm(); closeAlert(); }} style={{ flex: 1, padding: '12px', border: 'none', background: '#dc2626', color: 'white', borderRadius: '50px', fontWeight: '700', cursor: 'pointer' }}>Sí, Eliminar</button>
                    </div>
                ) : (
                    <button onClick={closeAlert} className="btn-primary" style={{ width: '100%' }}>Entendido</button>
                )}
            </div>
        </div>
      )}

    </div>
  );
}

// ESTILOS Y COMPONENTES
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContentStyle = { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };

const TabButton = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} style={{ background: 'transparent', border: 'none', padding: '10px 20px', borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent', color: active ? 'var(--primary)' : '#64748b', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>{icon} {label}</button>
);

const ViajeCard = ({ viaje, navigate, active, viewMode='grid' }) => (
  <div className="dashboard-card" style={{ display: 'flex', flexDirection: viewMode==='list'?'row':'column', alignItems: viewMode==='list'?'center':'stretch', padding: '0', height: '100%', minHeight: viewMode === 'list' ? 'auto' : '150px' }}>
    <div style={{ padding: viewMode === 'list' ? '12px 20px' : '20px', flex: 1, display: viewMode==='list'?'flex':'block', alignItems:'center', gap: viewMode === 'list' ? '15px' : '20px', minWidth: '200px' }}>
      <div style={{ marginBottom: viewMode==='list'?0:'10px' }}><div style={{ background: active?'#eff6ff':'#f1f5f9', color: active?'var(--primary)':'#64748b', padding: '8px', borderRadius: '10px', width: 'fit-content' }}><Plane size={viewMode==='list'?18:24} /></div></div>
      <div style={{ flex: 1, display: viewMode === 'list' ? 'flex' : 'block', alignItems: 'center', gap: '15px' }}>
          <h3 style={{ margin: viewMode === 'list' ? 0 : '0 0 5px 0', color: 'var(--text-main)', fontSize: viewMode==='list'?'0.95rem':'1.1rem', whiteSpace: 'nowrap' }}>{viaje.nombre}</h3>
          {viewMode === 'list' && <span style={{color:'#cbd5e1'}}>•</span>}
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
             {viewMode !== 'list' && <Clock size={14}/>} 
             {viaje.inicio} - {viaje.fin}
          </p>
      </div>
    </div>
    <div style={{ padding: viewMode === 'list' ? '12px 20px' : '15px 20px', borderTop: viewMode==='list'?'none':'1px solid #f1f5f9', borderLeft: viewMode==='list'?'1px solid #f1f5f9':'none', background: '#fcfcfc', display: 'flex', alignItems: 'center', width: viewMode==='list'?'auto':'100%', justifyContent: viewMode==='list'?'flex-end':'center', boxSizing: 'border-box' }}>
        <button onClick={() => navigate(`/viaje/${viaje.id}`)} style={{ width: viewMode==='list'?'auto':'100%', padding: '8px 15px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', whiteSpace:'nowrap', fontSize: '0.8rem' }}>Ver Itinerario <ArrowRightCircle size={16}/></button>
    </div>
  </div>
);

const SectionLabel = ({ icon, title, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', ...style }}>
      <div style={{ color: 'var(--primary-light)' }}>{icon}</div>
      <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
  </div>
);

const InfoItem = ({ label, value, icon, isCode }) => {
  if (!value) return null;
  return (
    <div>
       <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>{label}</div>
       <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: isCode ? 'monospace' : 'inherit', background: isCode ? '#f1f5f9' : 'transparent', padding: isCode ? '4px 8px' : '0', borderRadius: isCode ? '6px' : '0', width: 'fit-content' }}>
          {icon && <span style={{color: 'var(--primary)'}}>{icon}</span>}
          {value}
       </div>
    </div>
  );
};

const emptyStateStyle = { background: 'white', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '2px dashed #e2e8f0', color: '#94a3b8', fontWeight: '600' };
const btnLinkStyle = (copied) => ({ background: copied ? '#ecfdf5' : '#f8fafc', color: copied ? '#10b981' : 'var(--primary)', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '50px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' });