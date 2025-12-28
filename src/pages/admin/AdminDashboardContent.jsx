import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { useConfig } from '../../context/ConfigContext'; 
import { enviarPeticion } from '../../services/api'; 
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import SearchableSelect from '../../components/SearchableSelect';
import { 
  LogOut, Map, User as UserIcon, Calendar, ArrowRightCircle, LayoutGrid, List, Search, X, 
  Users, UserCheck, Plane, Briefcase, TrendingUp, TrendingDown, Wallet, Bell, DollarSign, Clock, 
  Plus, ChevronDown, ChevronUp, FileText, Download, Printer 
} from 'lucide-react';

export default function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  // === ESTADOS GENERALES ===
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef(null);
  
  // MODALES
  const [showModalTransaccion, setShowModalTransaccion] = useState(false);
  const [showModalSelectorEdoCta, setShowModalSelectorEdoCta] = useState(false);
  const [showModalReporte, setShowModalReporte] = useState(false);

  // ESTADOS ESTADO DE CUENTA
  // AÑADIDO: Campos de fecha inicio y fin
  const [edoCtaFiltro, setEdoCtaFiltro] = useState({ idCliente: '', idViaje: '', fechaInicio: '', fechaFin: '' });
  const [edoCtaData, setEdoCtaData] = useState({ transacciones: [], cliente: null, resumen: {ingresos:0, egresos:0}, esGeneral: false });
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // FORMULARIO TRANSACCIÓN RÁPIDA
  const formTransaccionInicial = { 
    tipo: '1', formaPago: '', monto: '', moneda: '1', concepto: '', 
    idCliente: '', idViaje: '', idProveedor: '', idServicio: '', 
    fecha: new Date().toISOString().split('T')[0] 
  };
  const [formTransaccion, setFormTransaccion] = useState(formTransaccionInicial);
  const [listasFinancieras, setListasFinancieras] = useState({ formasPago: [], monedas: [], tipos: [] });
  const [listaProveedores, setListaProveedores] = useState([]);
  const [serviciosViaje, setServiciosViaje] = useState([]);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarDashboardAdmin();
    cargarListasCompletas();
    
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) setShowAddMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (formTransaccion.idViaje) cargarServiciosDelViaje(formTransaccion.idViaje);
    else setServiciosViaje([]);
  }, [formTransaccion.idViaje]);

  const cargarDashboardAdmin = async () => {
    setLoading(true);
    try {
        const respuesta = await enviarPeticion({ accion: 'obtenerDashboardAdmin' });
        if (respuesta.exito) setDashboardData(respuesta.datos);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const cargarListasCompletas = async () => {
      try {
        const [resListas, resProv] = await Promise.all([
            enviarPeticion({ accion: 'obtenerListasFinancieras' }),
            enviarPeticion({ accion: 'obtenerProveedores' })
        ]);
        if(resListas.exito) setListasFinancieras(resListas.listas);
        if(resProv.exito) setListaProveedores(resProv.datos);
      } catch (error) { console.error(error); }
  };

  const cargarServiciosDelViaje = async (idViaje) => {
      const res = await enviarPeticion({ accion: 'obtenerDetallesViaje', idViaje });
      if(res.exito) setServiciosViaje(res.datos);
  };

  // --- NAVEGACIÓN MENÚ ---
  const handleMenuOption = (ruta, accionEspecial = null) => {
      setShowAddMenu(false);
      if (accionEspecial === 'transaccion') setShowModalTransaccion(true);
      else if (accionEspecial === 'edocta') {
          setEdoCtaFiltro({ idCliente: '', idViaje: '', fechaInicio: '', fechaFin: '' }); 
          setShowModalSelectorEdoCta(true);
      }
      else navigate(ruta, { state: { openCreate: true } });
  };

  // --- HELPER: Parsear fecha dd/mm/yyyy a Objeto Date ---
  const parseFechaLocal = (fechaStr) => {
      if (!fechaStr) return null;
      try {
          // Asumimos formato dd/mm/yyyy que viene del sheet o visualización
          if (fechaStr.includes('/')) {
              const [dia, mes, anio] = fechaStr.split('/');
              return new Date(anio, mes - 1, dia);
          }
          // Formato ISO yyyy-mm-dd
          return new Date(fechaStr);
      } catch (e) { return null; }
  };

  // --- GENERAR REPORTE (DATOS CON FILTRO DE FECHA) ---
  const generarReporte = async () => {
      if (!edoCtaFiltro.idCliente) return alert("Selecciona un cliente o el reporte global");
      
      setLoadingReporte(true);
      
      const res = await enviarPeticion({ 
          accion: 'obtenerEstadoCuentaGlobal', 
          idCliente: edoCtaFiltro.idCliente,
          idViaje: edoCtaFiltro.idViaje 
      });

      if (res.exito) {
          let transaccionesFiltradas = res.datos;

          // --- FILTRADO POR FECHAS (Frontend) ---
          if (edoCtaFiltro.fechaInicio) {
              const fechaInicio = new Date(edoCtaFiltro.fechaInicio);
              fechaInicio.setHours(0,0,0,0);
              transaccionesFiltradas = transaccionesFiltradas.filter(t => {
                  const fechaT = parseFechaLocal(t.fecha);
                  return fechaT && fechaT >= fechaInicio;
              });
          }

          if (edoCtaFiltro.fechaFin) {
              const fechaFin = new Date(edoCtaFiltro.fechaFin);
              fechaFin.setHours(23,59,59,999);
              transaccionesFiltradas = transaccionesFiltradas.filter(t => {
                  const fechaT = parseFechaLocal(t.fecha);
                  return fechaT && fechaT <= fechaFin;
              });
          }

          // Recalcular Totales
          let ing = 0, egr = 0;
          transaccionesFiltradas.forEach(t => {
             const m = parseFloat(String(t.monto).replace(/[^0-9.-]+/g,"")) || 0;
             if (t.tipoId == 1 || t.tipoId == 3) ing += m; 
             if (t.tipoId == 2) egr += m; 
          });

          setEdoCtaData({ 
              transacciones: transaccionesFiltradas, 
              cliente: res.cliente,
              resumen: { ingresos: ing, egresos: egr },
              esGeneral: res.esGeneral 
          });
          
          setShowModalSelectorEdoCta(false);
          setShowModalReporte(true);
      } else {
          alert("Error al generar reporte: " + res.error);
      }
      setLoadingReporte(false);
  };

  // --- DESCARGAR EXCEL ESTILO CLIENTE ---
  const descargarExcel = () => {
    if (!edoCtaData.transacciones.length) return alert("No hay datos para exportar");
    
    // Si es reporte general, agregamos columna cliente, si no, mantenemos el formato limpio del cliente
    const colSpanTotal = edoCtaData.esGeneral ? 5 : 4; 
    const extraHeader = edoCtaData.esGeneral ? '<th style="background:#1e3a8a;color:white;">Cliente</th>' : '';
    
    // Formato de Fechas para el título
    const rangoFechas = (edoCtaFiltro.fechaInicio || edoCtaFiltro.fechaFin) 
        ? `Periodo: ${edoCtaFiltro.fechaInicio || 'Inicio'} al ${edoCtaFiltro.fechaFin || 'Hoy'}` 
        : `Fecha Emisión: ${new Date().toLocaleDateString()}`;

    let htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <table>
          <tr><td colspan="${colSpanTotal}" align="center" style="font-size:18px;font-weight:bold;color:#2563eb;">ESTADO DE CUENTA - ${config.nombre_empresa || 'IGO Viajes'}</td></tr>
          <tr><td colspan="${colSpanTotal}" align="center">Cliente: ${edoCtaData.cliente?.nombre}</td></tr>
          <tr><td colspan="${colSpanTotal}" align="center">${rangoFechas}</td></tr>
          <tr><td colspan="${colSpanTotal}"></td></tr>
          <tr>
            <th style="background:#1e3a8a;color:white;">Fecha</th>
            ${extraHeader}
            <th style="background:#1e3a8a;color:white;">Concepto</th>
            <th style="background:#1e3a8a;color:white;">Tipo</th>
            <th style="background:#1e3a8a;color:white;">Monto</th>
          </tr>
    `;

    edoCtaData.transacciones.forEach(t => {
      const isIngreso = (t.tipoId == 1 || t.tipoId == 3);
      const tipoTexto = t.tipoId == 1 ? 'PAGO' : (t.tipoId == 3 ? 'ABONO CTA' : 'CARGO');
      const colorTexto = isIngreso ? '#16a34a' : '#dc2626'; // Verde o Rojo
      const monto = parseFloat(String(t.monto).replace(/[^0-9.-]+/g,"")) || 0;
      const clientCell = edoCtaData.esGeneral ? `<td>${t.nombreCliente}</td>` : ``;

      htmlTable += `
        <tr>
            <td>${t.fecha}</td>
            ${clientCell}
            <td>${t.concepto}</td>
            <td style="color:${colorTexto}">${tipoTexto}</td>
            <td style="color:${colorTexto}">$${monto.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
        </tr>`;
    });

    // FOOTER CON TOTALES (Estilo Cliente)
    const saldoFinal = edoCtaData.resumen.ingresos - edoCtaData.resumen.egresos;
    
    htmlTable += `
        <tr><td colspan="${colSpanTotal}"></td></tr>
        <tr>
            <td colspan="${colSpanTotal - 1}" align="right"><b>Total Pagado (Abonos):</b></td>
            <td style="color:#16a34a"><b>$${edoCtaData.resumen.ingresos.toLocaleString('es-MX')}</b></td>
        </tr>
        <tr>
            <td colspan="${colSpanTotal - 1}" align="right"><b>Total Costos (Cargos):</b></td>
            <td style="color:#dc2626"><b>$${edoCtaData.resumen.egresos.toLocaleString('es-MX')}</b></td>
        </tr>
        <tr>
            <td colspan="${colSpanTotal - 1}" align="right" style="background:#eff6ff; color:#2563eb;"><b>SALDO FINAL:</b></td>
            <td style="background:#eff6ff; color:#2563eb;"><b>$${saldoFinal.toLocaleString('es-MX')}</b></td>
        </tr>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Nombre del archivo limpio
    const cleanName = edoCtaData.cliente?.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `EdoCta_${cleanName}_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- DESCARGAR PDF ---
  const descargarPDF = () => {
    const element = document.getElementById('print-area-admin');
    if (!element) return;
    setGenerandoPDF(true);
    const opt = { margin: [10, 10], filename: `EdoCta.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save().then(() => setGenerandoPDF(false));
  };

  const handleGuardarTransaccion = async (e) => {
      e.preventDefault();
      if(!formTransaccion.idCliente) return alert("Selecciona un cliente");
      setProcesando(true);
      const respuesta = await enviarPeticion({ accion: 'registrarTransaccion', transaccion: formTransaccion });
      if(respuesta.exito) {
          setShowModalTransaccion(false);
          setFormTransaccion(formTransaccionInicial);
          cargarDashboardAdmin();
          alert("Movimiento registrado correctamente");
      } else {
          alert("Error: " + respuesta.error);
      }
      setProcesando(false);
  };

  return (
      <div className="dashboard-container" style={{ paddingTop: '80px' }}>
          {/* HEADER PRINCIPAL */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                  <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--primary-dark)', fontWeight: '800' }}>Panel de Control</h1>
                  <p style={{ margin: '5px 0 0', color: '#64748b' }}>Vista Administrativa</p>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }} ref={addMenuRef}>
                      <button onClick={() => setShowAddMenu(!showAddMenu)} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', display:'flex', gap:'8px', alignItems:'center', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.3)' }}>
                          <Plus size={18}/> Acciones {showAddMenu ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </button>
                      {showAddMenu && (
                          <div style={{ position: 'absolute', top: '120%', right: 0, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', minWidth: '240px', zIndex: 100, overflow: 'hidden', padding: '8px' }}>
                              <div onClick={() => handleMenuOption('/admin/viajes')} style={menuItemStyle}><Plane size={18} color="var(--primary)"/> Nuevo Viaje</div>
                              <div onClick={() => handleMenuOption('/admin/clientes')} style={menuItemStyle}><Users size={18} color="var(--primary)"/> Nuevo Cliente</div>
                              <div onClick={() => handleMenuOption('/admin/pasajeros')} style={menuItemStyle}><UserCheck size={18} color="var(--primary)"/> Nuevo Pasajero</div>
                              <div onClick={() => handleMenuOption('/admin/proveedores')} style={menuItemStyle}><Briefcase size={18} color="var(--primary)"/> Nuevo Proveedor</div>
                              <div style={{height:'1px', background:'#f1f5f9', margin:'6px 0'}}></div>
                              <div onClick={() => handleMenuOption(null, 'transaccion')} style={{...menuItemStyle, color:'#16a34a'}}><DollarSign size={18}/> Registrar Transacción</div>
                              <div onClick={() => handleMenuOption(null, 'edocta')} style={{...menuItemStyle, color:'#2563eb'}}><FileText size={18}/> Estado de Cuenta</div>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '30px' }}>
              <QuickAccessCard icon={<Users size={22} />} title="Clientes" onClick={() => navigate('/admin/clientes')} color="var(--primary-dark)" />
              <QuickAccessCard icon={<UserCheck size={22} />} title="Pasajeros" onClick={() => navigate('/admin/pasajeros')} color="#0f766e" />
              <QuickAccessCard icon={<Plane size={22} />} title="Viajes" onClick={() => navigate('/admin/viajes')} color="#2563eb" />
              <QuickAccessCard icon={<Briefcase size={22} />} title="Proveedores" onClick={() => navigate('/admin/proveedores')} color="#ca8a04" />
          </div>

          {loading || !dashboardData ? <div style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>Cargando métricas...</div> : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <BalanceCard title="Ingresos Totales" amount={dashboardData.balance.ingresos} icon={<TrendingUp size={24}/>} color="#16a34a" bg="#ecfdf5" />
                    <BalanceCard title="Egresos Totales" amount={dashboardData.balance.egresos} icon={<TrendingDown size={24}/>} color="#ef4444" bg="#fef2f2" />
                    <div style={{ background: 'var(--primary-gradient)', padding: '24px', borderRadius: '24px', color: 'white', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.9 }}>
                            <Wallet size={24} /> <span style={{ fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>Utilidad Neta</span>
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: '800' }}>${dashboardData.balance.utilidad.toLocaleString()}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
                    <div className="dashboard-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'10px' }}><Plane size={20} color="var(--primary)"/> Viajes Activos</h3>
                            <span style={{ background: '#eff6ff', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700' }}>{dashboardData.viajesActivos.length}</span>
                        </div>
                        {dashboardData.viajesActivos.length === 0 ? <p style={{color:'#94a3b8', textAlign:'center'}}>No hay viajes en curso.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {dashboardData.viajesActivos.map(v => (
                                    <div key={v.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1rem' }}>{v.nombre}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.85rem', color: '#64748b' }}>
                                            <span>{v.cliente}</span>
                                            <span style={{ color: v.diasRestantes < 3 ? '#ef4444' : '#10b981', fontWeight: '600' }}>{v.diasRestantes > 0 ? `Termina en ${v.diasRestantes} días` : 'Termina hoy'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="dashboard-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'10px' }}><Bell size={20} color="#f59e0b"/> Próximos Servicios</h3>
                            <span style={{ background: '#fffbeb', color: '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700' }}>7 días</span>
                        </div>
                        {dashboardData.recordatorios.length === 0 ? <p style={{color:'#94a3b8', textAlign:'center'}}>Sin servicios próximos.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {dashboardData.recordatorios.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '10px', minWidth:'40px', textAlign:'center' }}><div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8' }}>ID</div><div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)' }}>{r.idServicio}</div></div>
                                        <div><div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{r.categoria === 1 ? 'Vuelo' : 'Servicio'} a {r.destino}</div><div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={12}/> {r.fecha}</div></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
              </>
          )}

          {/* MODAL 1: SELECTOR PARA ESTADO DE CUENTA (CON FILTRO FECHA) */}
          {showModalSelectorEdoCta && (
              <div style={modalOverlayStyle}>
                  <div style={{...modalContentStyle, maxWidth:'450px', maxHeight:'auto', overflow:'visible'}}>
                      <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}><h3 style={{margin:0}}>Generar Estado de Cuenta</h3><button onClick={()=>setShowModalSelectorEdoCta(false)} style={closeBtnStyle}><X size={18}/></button></div>
                      <div style={{padding:'25px', display:'flex', flexDirection:'column', gap:'15px'}}>
                          <div>
                            <label style={labelStyle}>Cliente *</label>
                            <SearchableSelect 
                                options={[{id: "ALL", nombre: "★ REPORTE GENERAL (TODOS)"}, ...(dashboardData?.listasRapidas?.clientes || [])]}
                                value={edoCtaFiltro.idCliente}
                                onChange={(val) => setEdoCtaFiltro({...edoCtaFiltro, idCliente: val, idViaje: ''})}
                                placeholder="Buscar cliente..."
                            />
                          </div>

                          {edoCtaFiltro.idCliente && edoCtaFiltro.idCliente !== "ALL" && (
                              <div style={{animation:'slideIn 0.2s'}}>
                                  <label style={labelStyle}>Filtrar por Viaje (Opcional)</label>
                                  <SearchableSelect 
                                    options={dashboardData?.listasRapidas?.viajes.filter(v => v.idCliente == edoCtaFiltro.idCliente)}
                                    value={edoCtaFiltro.idViaje}
                                    onChange={(val) => setEdoCtaFiltro({...edoCtaFiltro, idViaje: val})}
                                    placeholder="Buscar viaje..."
                                  />
                              </div>
                          )}

                          <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:'15px' }}>
                              <label style={{...labelStyle, color:'var(--primary)'}}>Filtrar por Fechas (Opcional)</label>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                                  <div>
                                      <label style={{fontSize:'0.75rem', color:'#64748b'}}>Desde</label>
                                      <input type="date" style={inputStyle} value={edoCtaFiltro.fechaInicio} onChange={e=>setEdoCtaFiltro({...edoCtaFiltro, fechaInicio:e.target.value})} />
                                  </div>
                                  <div>
                                      <label style={{fontSize:'0.75rem', color:'#64748b'}}>Hasta</label>
                                      <input type="date" style={inputStyle} value={edoCtaFiltro.fechaFin} onChange={e=>setEdoCtaFiltro({...edoCtaFiltro, fechaFin:e.target.value})} />
                                  </div>
                              </div>
                          </div>

                          <button onClick={generarReporte} disabled={!edoCtaFiltro.idCliente || loadingReporte} className="btn-primary" style={{marginTop:'10px'}}>{loadingReporte ? 'Generando...' : 'Ver Reporte'}</button>
                      </div>
                  </div>
              </div>
          )}

          {/* MODAL 2: REPORTE VISUAL (ESTADO DE CUENTA) */}
          {showModalReporte && (
            <div style={modalOverlayStyle}>
              <div style={{ ...modalContentStyle, maxWidth: '900px', height: '90vh', padding: 0 }}>
                <div className="no-print" style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Vista Previa</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={descargarExcel} style={{ display: 'flex', gap: '5px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #16a34a', color: '#16a34a', background: 'white', cursor: 'pointer', fontWeight: '600' }}><Download size={18}/> Excel</button>
                        <button onClick={descargarPDF} disabled={generandoPDF} style={{ display: 'flex', gap: '5px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600' }}><FileText size={18}/> {generandoPDF ? '...' : 'PDF'}</button>
                        <button onClick={() => setShowModalReporte(false)} style={{ padding: '8px', borderRadius: '50%', border: 'none', background: '#e2e8f0', cursor: 'pointer' }}><X size={18}/></button>
                    </div>
                </div>
                <div id="print-area-admin" className="print-area" style={{ padding: '40px', background: 'white', flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '2px solid #2563eb', paddingBottom: '20px' }}><div><h1 style={{ margin: '0', color: '#2563eb', fontSize: '2rem' }}>ESTADO DE CUENTA</h1><p style={{ margin: '5px 0 0', color: '#64748b' }}>{edoCtaData.cliente?.rfc || 'Sin RFC'}</p></div><div style={{ textAlign: 'right' }}><h2 style={{ margin: 0, fontSize: '1.2rem' }}>{config.nombre_empresa || 'IGO Viajes'}</h2><p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: '#64748b' }}>{new Date().toLocaleDateString()}</p></div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}><div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}><h4 style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Cliente</h4><div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{edoCtaData.cliente?.nombre}</div>{!edoCtaData.esGeneral && edoCtaFiltro.idViaje && <div style={{marginTop:'5px', color:'var(--primary)', fontSize:'0.9rem'}}>Viaje: {dashboardData.listasRapidas.viajes.find(v => v.id == edoCtaFiltro.idViaje)?.nombre}</div>}</div><div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}><h4 style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resumen (Filtrado)</h4><div style={{display:'flex', justifyContent:'space-between'}}><span>Total Abonos:</span><span style={{color:'#16a34a', fontWeight:'700'}}>${edoCtaData.resumen.ingresos.toLocaleString()}</span></div><div style={{display:'flex', justifyContent:'space-between'}}><span>Total Cargos:</span><span style={{color:'#ef4444', fontWeight:'700'}}>${edoCtaData.resumen.egresos.toLocaleString()}</span></div><div style={{borderTop:'1px solid #ccc', marginTop:'5px', paddingTop:'5px', fontWeight:'bold', color:'#2563eb', display:'flex', justifyContent:'space-between'}}><span>Balance Periodo:</span><span>${(edoCtaData.resumen.ingresos - edoCtaData.resumen.egresos).toLocaleString()}</span></div></div></div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}><thead><tr style={{ background: '#f1f5f9' }}><th style={{padding:'10px',textAlign:'left'}}>Fecha</th>{edoCtaData.esGeneral && <th style={{padding:'10px',textAlign:'left'}}>Cliente</th>}<th style={{padding:'10px',textAlign:'left'}}>Concepto</th><th style={{padding:'10px',textAlign:'center'}}>Tipo</th><th style={{padding:'10px',textAlign:'right'}}>Monto</th></tr></thead><tbody>{edoCtaData.transacciones.map((t,i)=>(<tr key={i}><td style={{padding:'10px',borderBottom:'1px solid #eee'}}>{t.fecha}</td>{edoCtaData.esGeneral && <td style={{padding:'10px',borderBottom:'1px solid #eee', fontWeight:'600'}}>{t.nombreCliente}</td>}<td style={{padding:'10px',borderBottom:'1px solid #eee'}}>{t.concepto}</td><td style={{padding:'10px',textAlign:'center',borderBottom:'1px solid #eee'}}><span style={{background:(t.tipoId==1||t.tipoId==3)?'#ecfdf5':'#fef2f2', color:(t.tipoId==1||t.tipoId==3)?'#10b981':'#ef4444', padding:'2px 8px', borderRadius:'10px', fontSize:'0.75rem', fontWeight:'bold'}}>{(t.tipoId==1||t.tipoId==3)?'ABONO':'CARGO'}</span></td><td style={{padding:'10px',textAlign:'right',borderBottom:'1px solid #eee'}}>${t.monto}</td></tr>))}</tbody></table>
                </div>
              </div>
            </div>
          )}

          {/* MODAL TRANSACCIÓN RÁPIDA (ACTUALIZADO CON STICKY FOOTER) */}
          {showModalTransaccion && (
              <div style={modalOverlayStyle}>
                  {/* Contenedor principal con flex vertical */}
                  <div style={{...modalContentStyle, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column'}}> 
                      
                      {/* HEADER FIJO */}
                      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Registrar Movimiento</h2>
                          <button onClick={() => setShowModalTransaccion(false)} style={closeBtnStyle}><X size={18}/></button>
                      </div>

                      {/* BODY SCROLLEABLE */}
                      <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                          <form id="form-transaccion" onSubmit={handleGuardarTransaccion} style={{ display: 'grid', gap: '15px' }}>
                              <div style={{background:'#f1f5f9', padding:'10px', borderRadius:'10px', display:'flex', gap:'10px'}}>
                                  <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formTransaccion.tipo=='1'?'white':'transparent', fontWeight:'700', boxShadow: formTransaccion.tipo=='1'?'0 2px 5px rgba(0,0,0,0.05)':''}}><input type="radio" name="tipo" value="1" checked={formTransaccion.tipo=='1'} onChange={e=>setFormTransaccion({...formTransaccion, tipo: e.target.value})} style={{display:'none'}}/> Ingreso</label>
                                  <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formTransaccion.tipo=='2'?'white':'transparent', fontWeight:'700', boxShadow: formTransaccion.tipo=='2'?'0 2px 5px rgba(0,0,0,0.05)':''}}><input type="radio" name="tipo" value="2" checked={formTransaccion.tipo=='2'} onChange={e=>setFormTransaccion({...formTransaccion, tipo: e.target.value})} style={{display:'none'}}/> Egreso</label>
                                  <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formTransaccion.tipo=='3'?'white':'transparent', fontWeight:'700', boxShadow: formTransaccion.tipo=='3'?'0 2px 5px rgba(0,0,0,0.05)':''}}><input type="radio" name="tipo" value="3" checked={formTransaccion.tipo=='3'} onChange={e=>setFormTransaccion({...formTransaccion, tipo: e.target.value})} style={{display:'none'}}/> Abono</label>
                              </div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                  <div><label style={labelStyle}>Monto</label><input required type="number" step="0.01" value={formTransaccion.monto} onChange={e=>setFormTransaccion({...formTransaccion, monto:e.target.value})} style={inputStyle} placeholder="0.00" /></div>
                                  <div><label style={labelStyle}>Moneda</label><select value={formTransaccion.moneda} onChange={e=>setFormTransaccion({...formTransaccion, moneda:e.target.value})} style={inputStyle}>{listasFinancieras.monedas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
                              </div>
                              
                              <label style={labelStyle}>Cliente *</label>
                              <SearchableSelect 
                                options={dashboardData?.listasRapidas?.clientes}
                                value={formTransaccion.idCliente}
                                onChange={(val) => setFormTransaccion({...formTransaccion, idCliente: val, idViaje: ''})}
                                placeholder="Seleccionar Cliente..."
                                required
                              />

                              <label style={labelStyle}>Concepto</label><input required type="text" value={formTransaccion.concepto} onChange={e=>setFormTransaccion({...formTransaccion, concepto:e.target.value})} style={inputStyle} placeholder="Ej. Depósito inicial" />
                              <label style={labelStyle}>Forma de Pago</label><select value={formTransaccion.formaPago} onChange={e=>setFormTransaccion({...formTransaccion, formaPago:e.target.value})} style={inputStyle}><option value="">-- Seleccionar --</option>{listasFinancieras.formasPago.map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
                              
                              {formTransaccion.tipo == '2' && (
                                <div>
                                    <label style={labelStyle}>Proveedor (Para Gasto)</label>
                                    <SearchableSelect 
                                        options={listaProveedores}
                                        value={formTransaccion.idProveedor}
                                        onChange={(val) => setFormTransaccion({...formTransaccion, idProveedor: val})}
                                        placeholder="Buscar Proveedor..."
                                    />
                                </div>
                              )}
                              
                              <div style={{background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px'}}>
                                  <label style={{...labelStyle, color:'var(--primary)'}}>Asociar a Viaje (Opcional)</label>
                                  <div style={{marginBottom:'10px'}}>
                                    <SearchableSelect 
                                        options={dashboardData?.listasRapidas?.viajes.filter(v => !formTransaccion.idCliente || v.idCliente == formTransaccion.idCliente)}
                                        value={formTransaccion.idViaje}
                                        onChange={(val) => setFormTransaccion({...formTransaccion, idViaje: val, idServicio: ''})}
                                        placeholder={formTransaccion.idCliente ? "Buscar viaje del cliente..." : "Selecciona un cliente primero"}
                                        disabled={!formTransaccion.idCliente}
                                    />
                                  </div>
                                  
                                  {formTransaccion.idViaje && (
                                    <>
                                        <label style={labelStyle}>Asociar a Servicio Específico</label>
                                        <select value={formTransaccion.idServicio} onChange={e=>setFormTransaccion({...formTransaccion, idServicio:e.target.value})} style={inputStyle}>
                                            <option value="">-- General del Viaje --</option>
                                            {serviciosViaje.map(s => (<option key={s.idServicio} value={s.idServicio}>{s.categoria} - {s.destino}</option>))}
                                        </select>
                                    </>
                                  )}
                              </div>
                              
                              {/* ESPACIO EXTRA PARA SCROLL (COLCHÓN) */}
                              <div style={{ height: '100px', flexShrink: 0 }}></div>
                          </form>
                      </div>

                      {/* FOOTER FIJO */}
                      <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                          <button type="submit" form="form-transaccion" className="btn-primary" disabled={procesando}>{procesando ? '...' : 'Registrar'}</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
}

// === COMPONENTES HELPER ===
const QuickAccessCard = ({ icon, title, onClick, color }) => (
    <div onClick={onClick} style={{ background: 'white', borderRadius: '20px', padding: '15px 25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '100px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>{title}</span>
    </div>
);

const BalanceCard = ({ title, amount, icon, color, bg }) => (
    <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ background: bg, padding: '8px', borderRadius: '10px', color: color }}>{icon}</div>
            <span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.9rem' }}>{title}</span>
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>${amount.toLocaleString()}</div>
    </div>
);

// === ESTILOS ===
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContentStyle = { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };
const menuItemStyle = { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#334155', fontWeight: '600', fontSize: '0.9rem', transition: 'background 0.2s', borderRadius: '8px', userSelect: 'none' };