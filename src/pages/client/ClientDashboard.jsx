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
  
  // ESTADO DE CUENTA UNIFICADO
  const [reporteData, setReporteData] = useState({ movimientos: [], cliente: null, resumen: {cargos:0, abonos:0, saldo:0}, esGeneral: false });
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
    // Usamos obtenerEstadoCuentaGlobal para obtener el saldo real basado en (Ventas - Pagos)
    const promesas = [
        enviarPeticion({ 
            accion: 'obtenerDashboardUsuario', 
            idUsuario: user.id,      
            tipoPerfil: 'Cliente',   
            idPerfil: user.idCliente 
        }),
        enviarPeticion({ accion: 'obtenerEstadoCuentaGlobal', idCliente: user.idCliente })
    ];

    try {
        const resultados = await Promise.all(promesas);
        const resDashboard = resultados[0];
        const resEdoCta = resultados[1];

        if (resDashboard.exito) {
            const datos = resDashboard.datos;
            
            // Inyectamos el saldo calculado correctamente desde el backend unificado
            if (resEdoCta.exito) {
                if (!datos.finanzas) datos.finanzas = {};
                datos.finanzas.pagado = resEdoCta.resumen.totalAbonos;
                datos.finanzas.costoTotal = resEdoCta.resumen.totalCargos; // Aquí "Costo" para el cliente es lo que se le cargó
                datos.finanzas.saldo = resEdoCta.resumen.saldoPendiente; // Saldo Deudor (Positivo = Debe, Negativo = A favor)
            }

            setData(datos);
            setClientProfile(datos.perfil); 
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

  // --- HELPERS Y FUNCIONES AUXILIARES ---
  const showAlert = (title, message, type = 'info') => setAlertConfig({ show: true, type, title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) => setAlertConfig({ show: true, type: 'confirm', title, message, onConfirm });
  const closeAlert = () => setAlertConfig({ ...alertConfig, show: false });
  const getNombreNacionalidad = (id) => { const n = nacionalidades.find(x => x.id == id); return n ? n.nombre : id; };
  const getNombrePais = (id) => { const p = paises.find(x => x.id == id); return p ? p.nombre : id; };
  const formatoFecha = (fechaStr) => { try { if(!fechaStr) return ''; const d = new Date(fechaStr); return d.toLocaleDateString('es-MX'); } catch(e){ return fechaStr; } };
  const fechaParaInput = (f) => { try { if(!f) return ''; if(f.includes('/')) { const [d,m,y] = f.split('/'); return `${y}-${m}-${d}`; } return new Date(f).toISOString().split('T')[0]; } catch(e){ return ''; } };
  const getInviteUrl = (t) => `${window.location.origin}/invite?token=${t}`;

  // --- REPORTES ---
  const abrirSelectorReporte = () => { 
      setFiltroReporte({ idCliente: user.idCliente, idViaje: '', fechaInicio: '', fechaFin: '' }); 
      setShowModalSelector(true); 
  };
  
  const generarReporte = async () => {
      setLoadingReporte(true);
      // Usamos el NUEVO endpoint unificado
      const res = await enviarPeticion({ 
          accion: 'obtenerEstadoCuentaGlobal', 
          idCliente: filtroReporte.idCliente, 
          idViaje: filtroReporte.idViaje 
      });

      if (res.exito) {
          // Filtro local de fechas si es necesario (aunque el backend ya lo hace idealmente, lo reforzamos)
          let movs = res.datos;
          if (filtroReporte.fechaInicio) {
              const fInicio = new Date(filtroReporte.fechaInicio); fInicio.setHours(0,0,0,0);
              movs = movs.filter(m => { const d = parseFechaLocal(m.fecha); return d && d >= fInicio; });
          }
          if (filtroReporte.fechaFin) {
              const fFin = new Date(filtroReporte.fechaFin); fFin.setHours(23,59,59,999);
              movs = movs.filter(m => { const d = parseFechaLocal(m.fecha); return d && d <= fFin; });
          }

          // Recalcular resumen tras filtro de fecha
          let c = 0, a = 0;
          movs.forEach(m => { c += m.cargo; a += m.abono; });

          setReporteData({ 
              movimientos: movs, 
              cliente: res.cliente, 
              resumen: { cargos: c, abonos: a, saldo: c - a }, 
              esGeneral: res.esGeneral 
          });
          setShowModalSelector(false);
          setShowModalReporte(true);
      } else {
          showAlert("Error", res.error, "error");
      }
      setLoadingReporte(false);
  };

  // Helper fechas
  const parseFechaLocal = (fechaStr) => {
      if (!fechaStr) return null;
      if (fechaStr.includes('/')) { const [d,m,y] = fechaStr.split('/'); return new Date(y,m-1,d); }
      return new Date(fechaStr);
  };

  // --- LOGICA DESCARGAS ---
  const descargarExcel = () => {
    if (!reporteData.movimientos.length) return showAlert("Sin Datos", "No hay información.", "info");
    
    // Si es reporte general o "ALL_MINE", mostramos 8 columnas (incluyendo cliente).
    // Si no, 7 columnas.
    const colSpanTotal = reporteData.esGeneral ? 8 : 7;
    // Si es reporte general o consolidado propio, mostramos header de cliente
    const extraHeader = reporteData.esGeneral ? '<th style="background:#1e3a8a;color:white;">Cliente</th>' : '';
    
    let saldoAcumulado = 0;
    let htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>
          <tr><td colspan="${colSpanTotal}" align="center" style="font-size:18px;font-weight:bold;color:#2563eb;">ESTADO DE CUENTA</td></tr>
          <tr><td colspan="${colSpanTotal}" align="center">Cliente: ${reporteData.cliente?.nombre}</td></tr>
          <tr><td colspan="${colSpanTotal}"></td></tr>
          <tr>
            <th style="background:#1e3a8a;color:white;">Fecha</th>
            ${extraHeader}
            <th style="background:#1e3a8a;color:white;">Viaje</th>
            <th style="background:#1e3a8a;color:white;">Concepto / Detalle</th>
            <th style="background:#1e3a8a;color:white;">Cargos (Debe)</th>
            <th style="background:#1e3a8a;color:white;">Abonos (Haber)</th>
            <th style="background:#1e3a8a;color:white;">Saldo</th>
          </tr>`;
    
    reporteData.movimientos.forEach(m => {
      saldoAcumulado += (m.cargo - m.abono);
      // Si es reporte general, mostramos el nombre del cliente en una celda
      const cliCell = reporteData.esGeneral ? `<td>${m.nombreCliente || ''}</td>` : '';
      
      htmlTable += `<tr>
        <td>${m.fecha}</td>
        ${cliCell}
        <td>${m.viaje}</td>
        <td>${m.concepto}</td>
        <td style="color:#ef4444">${m.cargo > 0 ? '$'+m.cargo.toFixed(2) : '-'}</td>
        <td style="color:#10b981">${m.abono > 0 ? '$'+m.abono.toFixed(2) : '-'}</td>
        <td style="font-weight:bold">$${saldoAcumulado.toFixed(2)}</td>
      </tr>`;
    });
    
    htmlTable += `<tr><td colspan="${colSpanTotal}"></td></tr>
    <tr><td colspan="${colSpanTotal-3}" align="right"><b>TOTALES:</b></td><td style="color:#ef4444"><b>$${reporteData.resumen.cargos.toFixed(2)}</b></td><td style="color:#10b981"><b>$${reporteData.resumen.abonos.toFixed(2)}</b></td><td></td></tr>
    <tr><td colspan="${colSpanTotal-1}" align="right" style="background:#f1f5f9"><b>SALDO PENDIENTE DE PAGO:</b></td><td style="background:#f1f5f9;color:#2563eb"><b>$${reporteData.resumen.saldo.toFixed(2)}</b></td></tr></table></body></html>`;
    
    const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); 
    link.download = `EdoCta_IGO_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const descargarPDF = () => {
    const element = document.getElementById('print-area-cliente');
    setGenerandoPDF(true);
    const opt = { margin: 5, filename: `EdoCta_IGO.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
    html2pdf().set(opt).from(element).save().then(() => setGenerandoPDF(false));
  };

  // Funciones CRUD Pasajeros
  const handleEditClick = (p) => { 
      setSelectedPasajero(p);
      setEditForm({ ...p, fechaNacimiento: fechaParaInput(p.fechaNacimiento) }); 
      setIsEditing(true); 
  };
  
  const handleSavePasajero = async (e) => {
      e.preventDefault();
      setSaving(true);
      const res = await enviarPeticion({accion:'editarPasajero', pasajero:editForm}); 
      if(res.exito){ 
          await cargarDatos(); 
          setIsEditing(false); 
          setSelectedPasajero(null); 
          showAlert("Éxito", "Datos actualizados."); 
      } else showAlert("Error", res.error, "error"); 
      setSaving(false); 
  };

  const guardarNuevoPasajero = async(e) => { 
      e.preventDefault(); 
      setSaving(true); 
      const res = await enviarPeticion({accion:'agregarPasajero', pasajero:{...newPasajeroForm, idCliente: user.idCliente}}); 
      if(res.exito){ 
          await cargarDatos(); 
          setShowAddPasajero(false); 
          setNewPasajeroForm({nombre:'', apellidoP:'', correo:'', telefono:''}); 
          showAlert("Éxito", "Pasajero creado."); 
      } else showAlert("Error", res.error, "error"); 
      setSaving(false); 
  };

  const guardarPerfil = async(e) => { 
      e.preventDefault(); 
      setSaving(true); 
      const res = await enviarPeticion({accion:'editarPerfilCliente', cliente:profileForm}); 
      if(res.exito){ 
          setClientProfile(profileForm); 
          setShowProfileModal(false); 
          showAlert("Éxito", "Perfil actualizado."); 
      } else showAlert("Error", res.error, "error"); 
      setSaving(false); 
  };
  
  // Helpers para links
  const handleGenerateLink = async (e, id) => { e.stopPropagation(); setGeneratingLinkId(id); const res = await enviarPeticion({accion:'generarTokenInvitacion', idPasajero:id}); if(res.exito){ await cargarDatos(); const link = getInviteUrl(res.token); navigator.clipboard.writeText(link); setCopiedId(id); setTimeout(()=>setCopiedId(null),3000); } else showAlert("Error", res.error); setGeneratingLinkId(null); };
  const handleCopyExistingLink = (e, t, id) => { e.stopPropagation(); navigator.clipboard.writeText(getInviteUrl(t)); setCopiedId(id); setTimeout(()=>setCopiedId(null),3000); };

  if (loading) return <div style={{textAlign:'center', padding:'50px', color:'#94a3b8'}}>Cargando...</div>;
  if (!data) return <div style={{textAlign:'center', padding:'50px', color:'#ef4444'}}>Error al cargar datos.</div>;

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="header-flexible">
        <div><h1 style={{fontSize:'2rem', color:'var(--primary-dark)', fontWeight:'800', margin:0}}>Hola, {user.nombre.split(' ')[0]}</h1><p style={{color:'#64748b', margin:'5px 0 0'}}>Portal de Clientes</p></div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={()=> {setProfileForm({...clientProfile}); setShowProfileModal(true);}} style={{background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#475569', padding:'10px 16px', borderRadius:'50px', fontWeight:'700', cursor:'pointer', display:'flex', gap:'8px', alignItems:'center'}}><Settings size={18}/> Mi Perfil</button>
            <button onClick={abrirSelectorReporte} style={{background:'white', border:'1px solid #e2e8f0', color:'var(--primary)', padding:'10px 16px', borderRadius:'50px', fontWeight:'700', cursor:'pointer', display:'flex', gap:'8px', alignItems:'center', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}><FileText size={18}/> Estado de Cuenta</button>
            {activeTab === 'pasajeros' && <button onClick={()=>setShowAddPasajero(true)} className="btn-primary" style={{width:'auto', padding:'10px 20px', borderRadius:'50px'}}><Plus size={18}/> Pasajero</button>}
        </div>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'20px', marginBottom:'25px', borderBottom:'1px solid #e2e8f0', paddingBottom:'10px'}}>
        <div style={{display:'flex', gap:'20px', overflowX:'auto'}}>
            <TabButton active={activeTab==='resumen'} onClick={()=>setActiveTab('resumen')} icon={<Wallet size={18}/>} label="Finanzas" />
            <TabButton active={activeTab==='viajes'} onClick={()=>setActiveTab('viajes')} icon={<Map size={18}/>} label="Viajes" />
            <TabButton active={activeTab==='pasajeros'} onClick={()=>setActiveTab('pasajeros')} icon={<Users size={18}/>} label="Pasajeros" />
        </div>

        {(activeTab === 'viajes' || activeTab === 'pasajeros') && (
            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', gap:'4px' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '6px', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'grid' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='grid'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} style={{ padding: '6px', border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'list' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='list'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutList size={18}/></button>
            </div>
        )}
      </div>

      {/* DASHBOARD CONTENT: RESUMEN */}
      {activeTab === 'resumen' && (
        <div className="fade-in dashboard-main-grid">
            <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                <h3 style={{margin:'0 0 10px 0', color:'#64748b', fontSize:'1rem', textTransform:'uppercase'}}>Estado de Cuenta Actual</h3>
                
                {/* TARJETA DE SALDO PENDIENTE */}
                <div className="dashboard-card" style={{padding:'24px', background: data.finanzas.saldo > 0 ? '#fff1f2' : '#f0fdf4', border: data.finanzas.saldo > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', color: data.finanzas.saldo > 0 ? '#ef4444' : '#16a34a'}}>
                        <Wallet size={24}/> <span style={{fontWeight:'700', fontSize:'0.9rem'}}>SALDO PENDIENTE</span>
                    </div>
                    <div style={{fontSize:'2.5rem', fontWeight:'800', color: data.finanzas.saldo > 0 ? '#dc2626' : '#15803d'}}>
                        ${data.finanzas.saldo.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </div>
                    <p style={{margin:'5px 0 0', fontSize:'0.9rem', color: data.finanzas.saldo > 0 ? '#b91c1c' : '#166534'}}>
                        {data.finanzas.saldo > 0 ? 'Monto por liquidar' : 'Estás al corriente (o tienes saldo a favor)'}
                    </p>
                </div>

                <div className="grid-responsive-2">
                    <div className="dashboard-card" style={{padding:'20px', borderLeft:'4px solid #f59e0b'}}>
                        <div style={{color:'#64748b', fontSize:'0.8rem', fontWeight:'700', marginBottom:'5px'}}>TOTAL CARGOS (SERVICIOS)</div>
                        <div style={{fontSize:'1.4rem', fontWeight:'800', color:'var(--text-main)'}}>${data.finanzas.costoTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    </div>
                    <div className="dashboard-card" style={{padding:'20px', borderLeft:'4px solid #10b981'}}>
                        <div style={{color:'#64748b', fontSize:'0.8rem', fontWeight:'700', marginBottom:'5px'}}>TOTAL ABONOS (PAGOS)</div>
                        <div style={{fontSize:'1.4rem', fontWeight:'800', color:'var(--text-main)'}}>${data.finanzas.pagado.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    </div>
                </div>
            </div>
            <div>
                <h3 style={{margin:'0 0 15px 0', color:'#64748b', fontSize:'1rem', textTransform:'uppercase'}}>Viajes Recientes</h3>
                {data.viajesActivos.length === 0 ? <div style={emptyStateStyle}>No tienes viajes activos.</div> : (
                    <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        {data.viajesActivos.map(v => (
                            <div key={v.id} className="dashboard-card" style={{padding:'15px', display:'flex', alignItems:'center', gap:'15px'}}>
                                <div style={{background:'#eff6ff', padding:'10px', borderRadius:'10px', color:'var(--primary)'}}><Plane size={20}/></div>
                                <div style={{flex:1}}>
                                    <div style={{fontWeight:'700', color:'var(--text-main)'}}>{v.nombre}</div>
                                    <div style={{fontSize:'0.85rem', color:'#64748b'}}>{v.inicio} - {v.fin}</div>
                                </div>
                                <button onClick={()=>navigate(`/viaje/${v.id}`)} style={{border:'none', background:'transparent', color:'var(--primary)', cursor:'pointer'}}><ArrowRightCircle size={20}/></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* TABS DE VIAJES */}
      {activeTab === 'viajes' && (
          <div className="fade-in">
              <h3 style={{marginTop:0, marginBottom:'20px', color:'var(--primary-dark)'}}>Tus Expedientes</h3>
              {data.viajesActivos.length === 0 && data.historialViajes.length === 0 ? (
                  <div style={emptyStateStyle}>No hay registros de viajes.</div>
              ) : (
                  <div style={{ 
                      display: viewMode === 'grid' ? 'grid' : 'flex', 
                      gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'none', 
                      flexDirection: viewMode === 'grid' ? 'row' : 'column',
                      gap: '20px'
                  }}>
                      {[...data.viajesActivos, ...data.historialViajes].map(v => (
                          <div 
                            key={v.id} 
                            className="dashboard-card" 
                            style={{
                                padding: '20px', 
                                cursor: 'pointer',
                                display: 'flex', 
                                flexDirection: viewMode === 'list' ? 'row' : 'column', 
                                alignItems: viewMode === 'list' ? 'center' : 'stretch', 
                                gap: viewMode === 'list' ? '20px' : '0'
                            }} 
                            onClick={() => navigate(`/viaje/${v.id}`)}
                          >
                              <div style={{display:'flex', justifyContent:'space-between', marginBottom: viewMode === 'list' ? '0' : '10px', minWidth: viewMode==='list'?'150px':'auto'}}>
                                  <div style={{background:'#f0f9ff', color:'var(--primary)', padding:'8px', borderRadius:'10px'}}><Plane size={24}/></div>
                                  {viewMode !== 'list' && <span style={{fontSize:'0.75rem', fontWeight:'700', padding:'4px 10px', borderRadius:'20px', background: v.tipo==='Vacacional'?'#ecfdf5':'#fff7ed', color: v.tipo==='Vacacional'?'#10b981':'#c2410c'}}>{v.tipo}</span>}
                              </div>
                              
                              <div style={{ flex: 1 }}>
                                <h4 style={{margin:'0 0 5px 0', fontSize:'1.1rem', color:'var(--text-main)'}}>{v.nombre}</h4>
                                <p style={{margin:0, color:'#64748b', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'6px'}}><Calendar size={14}/> {v.inicio} - {v.fin}</p>
                              </div>

                              {viewMode === 'list' && (
                                <div style={{display:'flex', alignItems:'center', gap:'10px', minWidth:'150px', justifyContent:'flex-end'}}>
                                    <span style={{fontSize:'0.75rem', fontWeight:'700', padding:'4px 10px', borderRadius:'20px', background: v.tipo==='Vacacional'?'#ecfdf5':'#fff7ed', color: v.tipo==='Vacacional'?'#10b981':'#c2410c'}}>{v.tipo}</span>
                                    <ArrowRightCircle size={20} color="var(--primary)"/>
                                </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* TABS DE PASAJEROS */}
      {activeTab === 'pasajeros' && (
          <div className="fade-in">
              {data.pasajeros.length === 0 ? (
                  <div style={emptyStateStyle}>No tienes pasajeros registrados. ¡Agrega uno!</div>
              ) : (
                  <div style={{
                      display: viewMode === 'grid' ? 'grid' : 'flex', 
                      gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'none', 
                      flexDirection: viewMode === 'grid' ? 'row' : 'column',
                      gap: '20px'
                  }}>
                      {data.pasajeros.map(p => (
                          <div 
                            key={p.id} 
                            className="dashboard-card" 
                            style={{
                                padding: '20px',
                                display: 'flex', 
                                flexDirection: viewMode === 'list' ? 'row' : 'column', 
                                alignItems: viewMode === 'list' ? 'center' : 'stretch', 
                                gap: viewMode === 'list' ? '20px' : '0'
                            }}
                          >
                              <div style={{display:'flex', justifyContent:'space-between', marginBottom: viewMode === 'list' ? '0' : '10px', minWidth: viewMode==='list'?'150px':'auto'}}>
                                  <div style={{background: p.registrado ? '#ecfdf5' : '#fef2f2', padding:'8px', borderRadius:'10px', color: p.registrado ? '#10b981' : '#f87171'}}><User size={20}/></div>
                                  {viewMode !== 'list' && <button onClick={() => handleEditClick(p)} style={{border:'none', background:'transparent', cursor:'pointer', color:'#64748b'}}><Pencil size={16}/></button>}
                              </div>
                              
                              <div style={{ flex: 1 }}>
                                  <h4 style={{margin:'0 0 5px 0', color:'var(--text-main)'}}>{p.nombre} {p.apellidoP}</h4>
                                  <p style={{margin:0, fontSize:'0.85rem', color:'#64748b'}}>{p.correo || 'Sin correo'}</p>
                              </div>
                              
                              <div style={{
                                  marginTop: viewMode === 'list' ? '0' : '15px', 
                                  paddingTop: viewMode === 'list' ? '0' : '15px', 
                                  borderTop: viewMode === 'list' ? 'none' : '1px solid #f1f5f9', 
                                  display:'flex', justifyContent: viewMode==='list'?'flex-end':'space-between', 
                                  alignItems:'center', gap:'15px', minWidth: viewMode==='list'?'250px':'auto'
                              }}>
                                  {viewMode === 'list' && <button onClick={() => handleEditClick(p)} style={{border:'none', background:'transparent', cursor:'pointer', color:'#64748b'}}><Pencil size={16}/></button>}
                                  <span style={{fontSize:'0.75rem', fontWeight:'700', color: p.registrado ? '#10b981' : '#f59e0b'}}>{p.registrado ? 'Activo' : 'Pendiente'}</span>
                                  {!p.registrado && (
                                      <button onClick={(e) => p.token ? handleCopyExistingLink(e, p.token, p.id) : handleGenerateLink(e, p.id)} style={{background:'white', border:'1px solid #e2e8f0', padding:'6px 12px', borderRadius:'20px', cursor:'pointer', display:'flex', gap:'5px', alignItems:'center', fontSize:'0.75rem', color:'var(--primary)', fontWeight:'700'}}>
                                          {generatingLinkId === p.id ? <Loader size={12} className="spin"/> : (copiedId === p.id ? <Check size={12}/> : <Copy size={12}/>)} Link
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* MODAL SELECTOR */}
      {showModalSelector && (
        <div style={modalOverlayStyle}>
            <div style={{...modalContentStyle, maxWidth:'450px', maxHeight:'calc(100dvh - 40px)', overflow:'visible'}}>
                <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}><h3 style={{margin:0}}>Ver Detalle de Cuenta</h3><button onClick={()=>setShowModalSelector(false)} style={closeBtnStyle}><X size={18}/></button></div>
                <div style={{padding:'25px', display:'flex', flexDirection:'column', gap:'15px'}}>
                    {userClients.length > 1 && (
                        <div>
                            <label style={labelStyle}>Cuenta</label>
                            <SearchableSelect options={[{id:"ALL_MINE", nombre:"Todos (Consolidado)"}, ...userClients]} value={filtroReporte.idCliente} onChange={v => setFiltroReporte({...filtroReporte, idCliente: v, idViaje: ''})} />
                        </div>
                    )}
                    <div style={{borderTop:'1px solid #f1f5f9', paddingTop:'15px'}}>
                        <label style={{...labelStyle, color:'var(--primary)'}}>Filtrar Fechas (Opcional)</label>
                        <div className="grid-responsive-2">
                            <div><label style={{fontSize:'0.75rem', color:'#64748b'}}>Desde</label><input type="date" style={inputStyle} value={filtroReporte.fechaInicio} onChange={e=>setFiltroReporte({...filtroReporte, fechaInicio:e.target.value})} /></div>
                            <div><label style={{fontSize:'0.75rem', color:'#64748b'}}>Hasta</label><input type="date" style={inputStyle} value={filtroReporte.fechaFin} onChange={e=>setFiltroReporte({...filtroReporte, fechaFin:e.target.value})} /></div>
                        </div>
                    </div>
                    <button onClick={generarReporte} disabled={loadingReporte} className="btn-primary" style={{marginTop:'10px'}}>{loadingReporte ? 'Generando...' : 'Generar Reporte'}</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL EDITAR PASAJERO */}
      {isEditing && (
          <div style={modalOverlayStyle}>
              <div style={{...modalContentStyle, maxWidth:'500px'}}>
                  <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}><h3 style={{margin:0}}>Editar Pasajero</h3><button onClick={()=>setIsEditing(false)} style={closeBtnStyle}><X size={18}/></button></div>
                  <div style={{padding:'25px'}}>
                      <form onSubmit={handleSavePasajero} style={{display:'grid', gap:'15px'}}>
                          <div className="grid-responsive-2">
                              <div><label style={labelStyle}>Nombre</label><input style={inputStyle} value={editForm.nombre} onChange={e=>setEditForm({...editForm, nombre:e.target.value})} required/></div>
                              <div><label style={labelStyle}>Apellido P.</label><input style={inputStyle} value={editForm.apellidoP} onChange={e=>setEditForm({...editForm, apellidoP:e.target.value})} required/></div>
                          </div>
                          <div><label style={labelStyle}>Correo</label><input type="email" style={inputStyle} value={editForm.correo} onChange={e=>setEditForm({...editForm, correo:e.target.value})}/></div>
                          <div><label style={labelStyle}>Teléfono</label><input style={inputStyle} value={editForm.telefono} onChange={e=>setEditForm({...editForm, telefono:e.target.value})}/></div>
                          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL NUEVO PASAJERO */}
      {showAddPasajero && (
          <div style={modalOverlayStyle}>
              <div style={{...modalContentStyle, maxWidth:'500px'}}>
                  <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}><h3 style={{margin:0}}>Nuevo Pasajero</h3><button onClick={()=>setShowAddPasajero(false)} style={closeBtnStyle}><X size={18}/></button></div>
                  <div style={{padding:'25px'}}>
                      <form onSubmit={guardarNuevoPasajero} style={{display:'grid', gap:'15px'}}>
                          <div className="grid-responsive-2">
                              <div><label style={labelStyle}>Nombre *</label><input style={inputStyle} value={newPasajeroForm.nombre} onChange={e=>setNewPasajeroForm({...newPasajeroForm, nombre:e.target.value})} required/></div>
                              <div><label style={labelStyle}>Apellido P. *</label><input style={inputStyle} value={newPasajeroForm.apellidoP} onChange={e=>setNewPasajeroForm({...newPasajeroForm, apellidoP:e.target.value})} required/></div>
                          </div>
                          <div><label style={labelStyle}>Correo</label><input type="email" style={inputStyle} value={newPasajeroForm.correo} onChange={e=>setNewPasajeroForm({...newPasajeroForm, correo:e.target.value})}/></div>
                          <div><label style={labelStyle}>Teléfono</label><input style={inputStyle} value={newPasajeroForm.telefono} onChange={e=>setNewPasajeroForm({...newPasajeroForm, telefono:e.target.value})}/></div>
                          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creando...' : 'Crear Pasajero'}</button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL REPORTE UNIFICADO */}
      {showModalReporte && (
        <div style={modalOverlayStyle}>
            <div style={{ ...modalContentStyle, maxWidth: '1000px', height: '90vh', maxHeight:'calc(100dvh - 40px)', padding: 0 }}>
                <div className="no-print" style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0 }}>Estado de Cuenta</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={descargarExcel} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #16a34a', color: '#16a34a', background: 'white', cursor: 'pointer' }}><Download size={18}/></button>
                        <button onClick={descargarPDF} disabled={generandoPDF} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer' }}><Printer size={18}/></button>
                        <button onClick={() => setShowModalReporte(false)} style={closeBtnStyle}><X size={18}/></button>
                    </div>
                </div>
                
                <div id="print-area-cliente" className="print-area" style={{ padding: '40px', background: 'white', flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #2563eb', paddingBottom: '20px' }}>
                        <div><h1 style={{ margin: 0, color: '#2563eb', fontSize: '2rem' }}>ESTADO DE CUENTA</h1><p style={{ margin: '5px 0 0', color: '#64748b' }}>{reporteData.cliente?.rfc || ''}</p></div>
                        <div style={{ textAlign: 'right' }}><h2 style={{ margin: 0, fontSize: '1.2rem' }}>{config.nombre_empresa || 'IGO Viajes'}</h2><p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: '#64748b' }}>{new Date().toLocaleDateString()}</p></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Cliente</h4>
                            <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{reporteData.cliente?.nombre}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resumen del Periodo</h4>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Cargos (Servicios):</span> <span style={{color:'#ef4444', fontWeight:'700'}}>${reporteData.resumen.cargos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Abonos (Pagos):</span> <span style={{color:'#16a34a', fontWeight:'700'}}>${reporteData.resumen.abonos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                            <div style={{borderTop:'1px solid #cbd5e1', marginTop:'5px', paddingTop:'5px', display:'flex', justifyContent:'space-between', fontWeight:'800'}}>
                                <span>Saldo Final:</span> <span style={{color: reporteData.resumen.saldo > 0 ? '#ef4444' : '#16a34a'}}>${reporteData.resumen.saldo.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead><tr style={{ background: '#f1f5f9' }}>
                            <th style={{padding:'8px', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>Fecha</th>
                            {reporteData.esGeneral && <th style={{padding:'8px', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>Cliente</th>}
                            <th style={{padding:'8px', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>Viaje</th>
                            <th style={{padding:'8px', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>Concepto</th>
                            <th style={{padding:'8px', textAlign:'right', borderBottom:'1px solid #e2e8f0'}}>Cargos</th>
                            <th style={{padding:'8px', textAlign:'right', borderBottom:'1px solid #e2e8f0'}}>Abonos</th>
                            <th style={{padding:'8px', textAlign:'right', borderBottom:'1px solid #e2e8f0'}}>Saldo</th>
                        </tr></thead>
                        <tbody>
                            {(() => {
                                let saldoAcumulado = 0;
                                return reporteData.movimientos.map((m, i) => {
                                    saldoAcumulado += (m.cargo - m.abono);
                                    return (
                                        <tr key={i} style={{pageBreakInside:'avoid'}}>
                                            <td style={{padding:'8px', borderBottom:'1px solid #f1f5f9'}}>{m.fecha}</td>
                                            {reporteData.esGeneral && <td style={{padding:'8px', borderBottom:'1px solid #f1f5f9', fontWeight:'600'}}>{m.nombreCliente}</td>}
                                            <td style={{padding:'8px', borderBottom:'1px solid #f1f5f9'}}>
                                                <div style={{fontSize:'0.75rem', color:'#64748b'}}>{m.viaje}</div>
                                            </td>
                                            <td style={{padding:'8px', borderBottom:'1px solid #f1f5f9'}}>
                                                <div style={{fontWeight:'600'}}>{m.concepto}</div>
                                            </td>
                                            <td style={{padding:'8px', textAlign:'right', borderBottom:'1px solid #f1f5f9', color:'#ef4444'}}>{m.cargo > 0 ? '$'+m.cargo.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                                            <td style={{padding:'8px', textAlign:'right', borderBottom:'1px solid #f1f5f9', color:'#16a34a'}}>{m.abono > 0 ? '$'+m.abono.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                                            <td style={{padding:'8px', textAlign:'right', borderBottom:'1px solid #f1f5f9', fontWeight:'700'}}>${saldoAcumulado.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* MODAL ALERTA */}
      {alertConfig.show && (<div style={modalOverlayStyle}><div style={{...modalContentStyle, maxWidth:'400px', maxHeight:'auto', padding:'30px', textAlign:'center'}}><h3 style={{marginTop:0}}>{alertConfig.title}</h3><p>{alertConfig.message}</p><div style={{display:'flex', gap:'10px', marginTop:'20px'}}>{alertConfig.type === 'confirm' ? <><button onClick={closeAlert} style={{flex:1, padding:'10px', borderRadius:'50px', border:'1px solid #ccc', background:'white'}}>Cancelar</button><button onClick={()=>{alertConfig.onConfirm(); closeAlert();}} style={{flex:1, padding:'10px', borderRadius:'50px', border:'none', background:'var(--primary)', color:'white'}}>Confirmar</button></> : <button onClick={closeAlert} className="btn-primary" style={{width:'100%'}}>OK</button>}</div></div></div>)}
    </div>
  );
}

const TabButton = ({ active, onClick, icon, label }) => (<button onClick={onClick} style={{ background: 'transparent', border: 'none', padding: '10px 20px', borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent', color: active ? 'var(--primary)' : '#64748b', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>{icon} {label}</button>);
const emptyStateStyle = { background: 'white', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '2px dashed #e2e8f0', color: '#94a3b8' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContentStyle = { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };
const SectionLabel = ({ icon, title, style }) => (<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', ...style }}><div style={{ color: 'var(--primary-light)' }}>{icon}</div><span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span></div>);