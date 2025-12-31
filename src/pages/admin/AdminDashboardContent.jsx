import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { useConfig } from '../../context/ConfigContext'; 
import { enviarPeticion } from '../../services/api'; 
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import SearchableSelect from '../../components/SearchableSelect';
import { 
  LogOut, Map as MapIcon, User as UserIcon, Calendar, ArrowRightCircle, LayoutGrid, List, Search, X, 
  Users, UserCheck, Plane, Briefcase, TrendingUp, TrendingDown, Wallet, Bell, DollarSign, Clock, 
  Plus, ChevronDown, ChevronUp, FileText, Download, Printer, Tag, Hotel, Car, Utensils, Ticket,
  CheckSquare, Square, AlertCircle, CheckCircle, AlertTriangle
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

  // ESTADO PARA ALERTAS PERSONALIZADAS (NUEVO)
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', msg: '', type: 'info' });

  // ESTADOS ESTADO DE CUENTA
  const [edoCtaFiltro, setEdoCtaFiltro] = useState({ idCliente: '', idViaje: '', fechaInicio: '', fechaFin: '' });
  const [edoCtaData, setEdoCtaData] = useState({ transacciones: [], cliente: null, resumen: {ingresos:0, egresos:0}, esGeneral: false });
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // FORMULARIO TRANSACCIÓN RÁPIDA
  const formTransaccionInicial = { 
    tipo: '1', formaPago: '', monto: '', moneda: '1', concepto: '', 
    idCliente: '', idViaje: '', idProveedor: '', 
    fecha: new Date().toISOString().split('T')[0] 
  };
  const [formTransaccion, setFormTransaccion] = useState(formTransaccionInicial);
  
  // LISTAS Y CATÁLOGOS
  const [listasFinancieras, setListasFinancieras] = useState({ formasPago: [], monedas: [], tipos: [] });
  const [listaProveedores, setListaProveedores] = useState([]);
  const [listaCategorias, setListaCategorias] = useState([]); 
  const [listaEstatus, setListaEstatus] = useState([]); 
  
  // SERVICIOS Y TRANSACCIONES DEL VIAJE SELECCIONADO
  const [serviciosViaje, setServiciosViaje] = useState([]);
  const [transaccionesViaje, setTransaccionesViaje] = useState([]); 
  const [selectedServiciosFinanza, setSelectedServiciosFinanza] = useState([]); 
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

  // Cargar Servicios Y Transacciones al seleccionar un viaje
  useEffect(() => {
    setServiciosViaje([]); 
    setTransaccionesViaje([]);
    setSelectedServiciosFinanza([]);

    if (formTransaccion.idViaje) {
        cargarDatosDelViaje(formTransaccion.idViaje);
    }
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
        const [resListasFin, resProv, resListasGrales] = await Promise.all([
            enviarPeticion({ accion: 'obtenerListasFinancieras' }),
            enviarPeticion({ accion: 'obtenerProveedores' }),
            enviarPeticion({ accion: 'obtenerListas' })
        ]);
        
        if(resListasFin.exito) setListasFinancieras(resListasFin.listas);
        if(resProv.exito) setListaProveedores(resProv.datos);
        if(resListasGrales.exito && resListasGrales.listas) {
            setListaCategorias(resListasGrales.listas.categorias || []);
            setListaEstatus(resListasGrales.listas.estatus || []);
        }
      } catch (error) { console.error(error); }
  };

  const cargarDatosDelViaje = async (idViaje) => {
      try {
          const [resServicios, resFinanzas] = await Promise.all([
              enviarPeticion({ accion: 'obtenerDetallesViaje', idViaje }),
              enviarPeticion({ accion: 'obtenerFinanzasViaje', idViaje })
          ]);

          if (resServicios.exito && Array.isArray(resServicios.datos)) {
              setServiciosViaje(resServicios.datos);
          } else {
              setServiciosViaje([]);
          }

          if (resFinanzas.exito && Array.isArray(resFinanzas.datos)) {
              setTransaccionesViaje(resFinanzas.datos);
          } else {
              setTransaccionesViaje([]);
          }

      } catch (error) {
          console.error("Error cargando datos del viaje", error);
          setServiciosViaje([]);
          setTransaccionesViaje([]);
      }
  };

  // --- HELPERS DE ALERTAS (NUEVO) ---
  const showAlert = (title, msg, type = 'info') => {
      setCustomAlert({ show: true, title, msg, type });
  };

  const closeAlert = () => {
      setCustomAlert({ ...customAlert, show: false });
  };

  // --- NAVEGACIÓN MENÚ ---
  const handleMenuOption = (ruta, accionEspecial = null) => {
      setShowAddMenu(false);
      if (accionEspecial === 'transaccion') {
          setFormTransaccion(formTransaccionInicial);
          setSelectedServiciosFinanza([]);
          setShowModalTransaccion(true);
      }
      else if (accionEspecial === 'edocta') {
          setEdoCtaFiltro({ idCliente: '', idViaje: '', fechaInicio: '', fechaFin: '' }); 
          setShowModalSelectorEdoCta(true);
      }
      else navigate(ruta, { state: { openCreate: true } });
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

  // === LÓGICA DE AGRUPACIÓN (BLINDADA) ===
  const getIconoCategoria = (catId) => { 
      if (!listaCategorias) return <Tag size={18}/>;
      const c = listaCategorias.find(x=>x.id==catId); 
      const n = c ? c.nombre.toLowerCase() : ''; 
      if(n.includes('vuelo')) return <Plane size={18}/>; 
      if(n.includes('hotel')) return <Hotel size={18}/>; 
      if(n.includes('auto') || n.includes('traslado')) return <Car size={18}/>;
      if(n.includes('alimento')) return <Utensils size={18}/>;
      return <Tag size={18}/>; 
  };

  const getNombreCategoria = (id) => {
      if (!listaCategorias) return 'Servicio';
      const cat = listaCategorias.find(c => c.id == id);
      return cat ? cat.nombre : 'Servicio';
  };

  const isServicioSaldado = (idServicio) => {
    if (!transaccionesViaje || !Array.isArray(transaccionesViaje)) return false;
    const movs = transaccionesViaje.filter(t => t && t.idServicio == idServicio);
    if (movs.length === 0) return false; 
    let balance = 0;
    movs.forEach(t => { 
        const monto = parseFloat(String(t.monto || "0").replace(/[^0-9.-]+/g,"")) || 0; 
        if (t.tipoId == 1 || t.tipoId == 3) balance += monto; 
        if (t.tipoId == 2) balance -= monto; 
    });
    return Math.abs(balance) < 0.1; 
  };

  const obtenerServiciosAgrupados = () => {
      if (!serviciosViaje || !Array.isArray(serviciosViaje) || serviciosViaje.length === 0) return [];

      const gruposMap = new Map();
      const pendientes = serviciosViaje.filter(s => s && s.idServicio && !isServicioSaldado(s.idServicio));

      pendientes.forEach(s => {
          const cat = String(s.categoriaId || '').trim();
          const dest = String(s.destino || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          let fecha = String(s.fechaInicio || '').split(' ')[0].trim(); 
          const fechaParts = fecha.includes('/') ? fecha.split('/') : (fecha.includes('-') ? fecha.split('-') : []);
          
          if (fechaParts.length === 3) {
              const p1 = fechaParts[0].padStart(2, '0');
              const p2 = fechaParts[1].padStart(2, '0');
              const p3 = fechaParts[2];
              fecha = `${p1}/${p2}/${p3}`;
          }

          const clave = String(s.clave || '').trim().toUpperCase();
          let uniqueKey = '';
          
          if (clave && clave !== 'UNDEFINED' && clave !== 'NULL' && clave !== '0') {
              uniqueKey = `CLAVE:${clave}`; 
          } else {
              uniqueKey = `AUTO:${cat}|${dest}|${fecha}`;
          }

          if (!gruposMap.has(uniqueKey)) {
              gruposMap.set(uniqueKey, {
                  key: uniqueKey,
                  ids: [],
                  servicioBase: s,
                  nombresPasajeros: []
              });
          }
          
          const grupo = gruposMap.get(uniqueKey);
          grupo.ids.push(s.idServicio);
          
          if (s.nombrePasajero && !grupo.nombresPasajeros.includes(s.nombrePasajero)) {
              grupo.nombresPasajeros.push(s.nombrePasajero);
          }
      });

      return Array.from(gruposMap.values()).map(g => ({
          ...g,
          cantidad: g.ids.length,
          pasajerosStr: g.nombresPasajeros.sort().join(", ")
      }));
  };

  const toggleGrupoServicios = (idsGrupo) => {
      const todosSeleccionados = idsGrupo.every(id => selectedServiciosFinanza.includes(id));
      let nuevaSeleccion = [...selectedServiciosFinanza];
      if (todosSeleccionados) {
          nuevaSeleccion = nuevaSeleccion.filter(id => !idsGrupo.includes(id));
      } else {
          idsGrupo.forEach(id => {
              if (!nuevaSeleccion.includes(id)) nuevaSeleccion.push(id);
          });
      }
      setSelectedServiciosFinanza(nuevaSeleccion);
  };

  // --- GENERAR REPORTE (ALERTAS REEMPLAZADAS) ---
  const generarReporte = async () => {
      if (!edoCtaFiltro.idCliente) return showAlert("Faltan datos", "Selecciona un cliente o el reporte global", "warning");
      setLoadingReporte(true);
      const res = await enviarPeticion({ 
          accion: 'obtenerEstadoCuentaGlobal', 
          idCliente: edoCtaFiltro.idCliente,
          idViaje: edoCtaFiltro.idViaje 
      });

      if (res.exito) {
          let transaccionesFiltradas = res.datos;
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
          showAlert("Error", "Error al generar reporte: " + res.error, "error");
      }
      setLoadingReporte(false);
  };

  const descargarExcel = () => {
    if (!edoCtaData.transacciones.length) return showAlert("Sin datos", "No hay datos para exportar", "warning");
    const colSpanTotal = edoCtaData.esGeneral ? 8 : 7; 
    const extraHeader = edoCtaData.esGeneral ? '<th style="background:#1e3a8a;color:white;">Cliente</th>' : '';
    const rangoFechas = (edoCtaFiltro.fechaInicio || edoCtaFiltro.fechaFin) ? `Periodo: ${edoCtaFiltro.fechaInicio || 'Inicio'} al ${edoCtaFiltro.fechaFin || 'Hoy'}` : `Fecha Emisión: ${new Date().toLocaleDateString()}`;

    let htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body><table>
          <tr><td colspan="${colSpanTotal}" align="center" style="font-size:18px;font-weight:bold;color:#2563eb;">ESTADO DE CUENTA - ${config.nombre_empresa || 'IGO Viajes'}</td></tr>
          <tr><td colspan="${colSpanTotal}" align="center">Cliente: ${edoCtaData.cliente?.nombre}</td></tr>
          <tr><td colspan="${colSpanTotal}" align="center">${rangoFechas}</td></tr>
          <tr><td colspan="${colSpanTotal}"></td></tr>
          <tr><th style="background:#1e3a8a;color:white;">Fecha</th>${extraHeader}<th style="background:#1e3a8a;color:white;">Viaje</th><th style="background:#1e3a8a;color:white;">Servicio / Detalle</th><th style="background:#1e3a8a;color:white;">Pasajero</th><th style="background:#1e3a8a;color:white;">Concepto</th><th style="background:#1e3a8a;color:white;">Tipo</th><th style="background:#1e3a8a;color:white;">Monto</th></tr>
    `;
    edoCtaData.transacciones.forEach(t => {
      const isIngreso = (t.tipoId == 1 || t.tipoId == 3);
      const tipoTexto = t.tipoId == 1 ? 'PAGO' : (t.tipoId == 3 ? 'ABONO CTA' : 'CARGO');
      const colorTexto = isIngreso ? '#16a34a' : '#dc2626';
      const monto = parseFloat(String(t.monto).replace(/[^0-9.-]+/g,"")) || 0;
      const clientCell = edoCtaData.esGeneral ? `<td>${t.nombreCliente}</td>` : ``;
      htmlTable += `<tr><td>${t.fecha}</td>${clientCell}<td>${t.nombreViaje || ''}</td><td>${t.infoServicio || ''}</td><td>${t.nombrePasajero || ''}</td><td>${t.concepto}</td><td style="color:${colorTexto}">${tipoTexto}</td><td style="color:${colorTexto}">$${monto.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td></tr>`;
    });
    const saldoFinal = edoCtaData.resumen.ingresos - edoCtaData.resumen.egresos;
    htmlTable += `<tr><td colspan="${colSpanTotal}"></td></tr><tr><td colspan="${colSpanTotal - 1}" align="right"><b>Total Pagado (Abonos):</b></td><td style="color:#16a34a"><b>$${edoCtaData.resumen.ingresos.toLocaleString('es-MX')}</b></td></tr><tr><td colspan="${colSpanTotal - 1}" align="right"><b>Total Costos (Cargos):</b></td><td style="color:#dc2626"><b>$${edoCtaData.resumen.egresos.toLocaleString('es-MX')}</b></td></tr><tr><td colspan="${colSpanTotal - 1}" align="right" style="background:#eff6ff; color:#2563eb;"><b>SALDO FINAL:</b></td><td style="background:#eff6ff; color:#2563eb;"><b>$${saldoFinal.toLocaleString('es-MX')}</b></td></tr></table></body></html>`;
    const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url;
    const cleanName = edoCtaData.cliente?.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `EdoCta_${cleanName}_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const descargarPDF = () => {
    const element = document.getElementById('print-area-admin');
    if (!element) return;
    setGenerandoPDF(true);
    const opt = { margin: [5, 5], filename: `EdoCta.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
    html2pdf().set(opt).from(element).save().then(() => setGenerandoPDF(false));
  };

  const handleGuardarTransaccion = async (e) => {
      e.preventDefault();
      if(!formTransaccion.idCliente) return showAlert("Faltan datos", "Selecciona un cliente", "warning");
      setProcesando(true);
      const transaccionEnviar = { ...formTransaccion, idServicio: selectedServiciosFinanza.length > 0 ? selectedServiciosFinanza : '' };
      const respuesta = await enviarPeticion({ accion: 'registrarTransaccion', transaccion: transaccionEnviar });
      if(respuesta.exito) {
          setShowModalTransaccion(false);
          setFormTransaccion(formTransaccionInicial);
          setSelectedServiciosFinanza([]);
          cargarDashboardAdmin();
          showAlert("Éxito", "Movimiento registrado correctamente", "success");
      } else {
          showAlert("Error", "Error: " + respuesta.error, "error");
      }
      setProcesando(false);
  };

  // Cálculo seguro
  const gruposServicios = (showModalTransaccion && Array.isArray(serviciosViaje) && serviciosViaje.length > 0) 
      ? obtenerServiciosAgrupados() 
      : [];

  return (
      <div className="dashboard-container" style={{ paddingTop: '80px' }}>
          {/* HEADER PRINCIPAL */}
          <div className="header-flexible">
              <div><h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--primary-dark)', fontWeight: '800' }}>Panel de Control</h1><p style={{ margin: '5px 0 0', color: '#64748b' }}>Vista Administrativa</p></div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  {/* CONTENEDOR DE ACCIONES (RESPONSIVO) */}
                  <div className="action-container" style={{ position: 'relative' }} ref={addMenuRef}>
                      <button onClick={() => setShowAddMenu(!showAddMenu)} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', display:'flex', gap:'8px', alignItems:'center', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.3)' }}><Plus size={18}/> Acciones {showAddMenu ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
                      {showAddMenu && (
                          <div className="dropdown-menu-responsive">
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.9 }}><Wallet size={24} /> <span style={{ fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>Utilidad Neta</span></div>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>{dashboardData.viajesActivos.map(v => (<div key={v.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}><div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1rem' }}>{v.nombre}</div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.85rem', color: '#64748b' }}><span>{v.cliente}</span><span style={{ color: v.diasRestantes < 3 ? '#ef4444' : '#10b981', fontWeight: '600' }}>{v.diasRestantes > 0 ? `Termina en ${v.diasRestantes} días` : 'Termina hoy'}</span></div></div>))}</div>
                        )}
                    </div>
                    <div className="dashboard-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'10px' }}><Bell size={20} color="#f59e0b"/> Próximos Servicios</h3><span style={{ background: '#fffbeb', color: '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700' }}>3 horas</span></div>
                        {dashboardData.recordatorios.length === 0 ? <p style={{color:'#94a3b8', textAlign:'center'}}>Sin servicios próximos.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>{dashboardData.recordatorios.map((r, i) => (<div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '10px', minWidth:'40px', textAlign:'center' }}><div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8' }}>ID</div><div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)' }}>{r.idServicio}</div></div><div><div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{r.categoria === 1 ? 'Vuelo' : 'Servicio'} a {r.destino}</div><div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={12}/> Hora: {r.fecha}</div></div></div>))}</div>
                        )}
                    </div>
                </div>
              </>
          )}

          {/* MODAL 1: SELECTOR PARA ESTADO DE CUENTA */}
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
                              {/* AQUÍ ESTÁ EL CAMBIO RESPONSIVO: CLASE UTILITARIA */}
                              <div className="grid-responsive-2">
                                  <div><label style={{fontSize:'0.75rem', color:'#64748b'}}>Desde</label><input type="date" style={inputStyle} value={edoCtaFiltro.fechaInicio} onChange={e=>setEdoCtaFiltro({...edoCtaFiltro, fechaInicio:e.target.value})} /></div>
                                  <div><label style={{fontSize:'0.75rem', color:'#64748b'}}>Hasta</label><input type="date" style={inputStyle} value={edoCtaFiltro.fechaFin} onChange={e=>setEdoCtaFiltro({...edoCtaFiltro, fechaFin:e.target.value})} /></div>
                              </div>
                          </div>
                          <button onClick={generarReporte} disabled={!edoCtaFiltro.idCliente || loadingReporte} className="btn-primary" style={{marginTop:'10px'}}>{loadingReporte ? 'Generando...' : 'Ver Reporte'}</button>
                      </div>
                  </div>
              </div>
          )}

          {/* MODAL 2: REPORTE VISUAL */}
          {showModalReporte && (
            <div style={modalOverlayStyle}>
              <div style={{ ...modalContentStyle, maxWidth: '1000px', height: '90vh', padding: 0 }}>
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead><tr style={{ background: '#f1f5f9' }}><th style={{padding:'8px',textAlign:'left'}}>Fecha</th>{edoCtaData.esGeneral && <th style={{padding:'8px',textAlign:'left'}}>Cliente</th>}<th style={{padding:'8px',textAlign:'left'}}>Viaje</th><th style={{padding:'8px',textAlign:'left'}}>Servicio / Detalle</th><th style={{padding:'8px',textAlign:'left'}}>Pasajero</th><th style={{padding:'8px',textAlign:'left'}}>Concepto</th><th style={{padding:'8px',textAlign:'center'}}>Tipo</th><th style={{padding:'8px',textAlign:'right'}}>Monto</th></tr></thead>
                        <tbody>
                            {edoCtaData.transacciones.map((t,i)=>{
                                const esVerde=(t.tipoId==1||t.tipoId==3);
                                return (<tr key={i}><td style={{padding:'8px',borderBottom:'1px solid #eee'}}>{t.fecha}</td>{edoCtaData.esGeneral && <td style={{padding:'8px',borderBottom:'1px solid #eee', fontWeight:'600'}}>{t.nombreCliente}</td>}<td style={{padding:'8px',borderBottom:'1px solid #eee', fontWeight:'600', fontSize:'0.75rem', maxWidth:'150px'}}>{t.nombreViaje}</td><td style={{padding:'8px',borderBottom:'1px solid #eee', fontSize:'0.75rem', maxWidth:'150px'}}>{t.infoServicio}</td><td style={{padding:'8px',borderBottom:'1px solid #eee', fontSize:'0.75rem'}}>{t.nombrePasajero}</td><td style={{padding:'8px',borderBottom:'1px solid #eee'}}>{t.concepto}</td><td style={{padding:'8px',textAlign:'center',borderBottom:'1px solid #eee'}}><span style={{background:esVerde?'#ecfdf5':'#fef2f2', color:esVerde?'#10b981':'#ef4444', padding:'2px 8px', borderRadius:'10px', fontSize:'0.75rem', fontWeight:'bold'}}>{esVerde?'ABONO':'CARGO'}</span></td><td style={{padding:'8px',textAlign:'right',borderBottom:'1px solid #eee'}}>${t.monto}</td></tr>)
                            })}
                        </tbody>
                    </table>
                </div>
              </div>
            </div>
          )}

          {/* MODAL TRANSACCIÓN RÁPIDA */}
          {showModalTransaccion && (
              <div style={modalOverlayStyle}>
                  <div style={{...modalContentStyle, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column'}}> 
                      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Registrar Movimiento</h2>
                          <button onClick={() => setShowModalTransaccion(false)} style={closeBtnStyle}><X size={18}/></button>
                      </div>
                      <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                          <form id="form-transaccion" onSubmit={handleGuardarTransaccion} style={{ display: 'grid', gap: '15px' }}>
                              <div style={{background:'#f1f5f9', padding:'10px', borderRadius:'10px', display:'flex', gap:'10px'}}>
                                  <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formTransaccion.tipo=='1'?'white':'transparent', fontWeight:'700', boxShadow: formTransaccion.tipo=='1'?'0 2px 5px rgba(0,0,0,0.05)':''}}><input type="radio" name="tipo" value="1" checked={formTransaccion.tipo=='1'} onChange={e=>setFormTransaccion({...formTransaccion, tipo: e.target.value})} style={{display:'none'}}/> Ingreso</label>
                                  <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formTransaccion.tipo=='2'?'white':'transparent', fontWeight:'700', boxShadow: formTransaccion.tipo=='2'?'0 2px 5px rgba(0,0,0,0.05)':''}}><input type="radio" name="tipo" value="2" checked={formTransaccion.tipo=='2'} onChange={e=>setFormTransaccion({...formTransaccion, tipo: e.target.value})} style={{display:'none'}}/> Egreso</label>
                                  <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formTransaccion.tipo=='3'?'white':'transparent', fontWeight:'700', boxShadow: formTransaccion.tipo=='3'?'0 2px 5px rgba(0,0,0,0.05)':''}}><input type="radio" name="tipo" value="3" checked={formTransaccion.tipo=='3'} onChange={e=>setFormTransaccion({...formTransaccion, tipo: e.target.value})} style={{display:'none'}}/> Abono</label>
                              </div>
                              <div className="grid-responsive-2">
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
                                        onChange={(val) => setFormTransaccion({...formTransaccion, idViaje: val})}
                                        placeholder={formTransaccion.idCliente ? "Buscar viaje del cliente..." : "Selecciona un cliente primero"}
                                        disabled={!formTransaccion.idCliente}
                                    />
                                  </div>
                                  
                                  {/* --- SELECCIÓN MÚLTIPLE DE SERVICIOS - AGRUPADA Y BLINDADA --- */}
                                  {formTransaccion.idViaje && (
                                    <>
                                        <label style={{...labelStyle, marginTop:'10px'}}>Asociar a Servicios (El costo se dividirá)</label>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding:'5px' }}>
                                            {gruposServicios.length === 0 && <div style={{padding:'15px', textAlign:'center', color:'#94a3b8', fontSize:'0.85rem'}}>No hay servicios pendientes en este viaje.</div>}
                                            {gruposServicios.map(grupo => {
                                                const nomCat = getNombreCategoria(grupo.servicioBase.categoriaId);
                                                const areAllSelected = grupo.ids.every(id => selectedServiciosFinanza.includes(id));
                                                const isSomeSelected = grupo.ids.some(id => selectedServiciosFinanza.includes(id));

                                                return (
                                                    <div 
                                                        key={grupo.key} 
                                                        onClick={() => toggleGrupoServicios(grupo.ids)}
                                                        style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: isSomeSelected ? '#eff6ff' : 'transparent' }}
                                                    >
                                                        <div style={{color: areAllSelected ? 'var(--primary)' : (isSomeSelected ? 'var(--primary-light)' : '#cbd5e1')}}>
                                                            {areAllSelected ? <CheckSquare size={18}/> : (isSomeSelected ? <div style={{width:18, height:18, background:'var(--primary-light)', borderRadius:4}}></div> : <Square size={18}/>)}
                                                        </div>
                                                        <div style={{ flex:1 }}>
                                                            <div style={{fontSize:'0.85rem', fontWeight:'600', color: isSomeSelected ? 'var(--primary-dark)' : '#334155'}}>
                                                                {nomCat} - {grupo.servicioBase.destino}
                                                                {grupo.cantidad > 1 && <span style={{marginLeft:'8px', background:'#e0f2fe', color:'#0284c7', padding:'2px 6px', borderRadius:'10px', fontSize:'0.7rem'}}>x{grupo.cantidad}</span>}
                                                            </div>
                                                            <div style={{fontSize:'0.75rem', color:'#64748b'}}>
                                                                {grupo.cantidad > 1 ? (
                                                                    <div style={{display:'flex', alignItems:'center', gap:'4px'}}><Users size={12}/> {grupo.pasajerosStr}</div>
                                                                ) : (
                                                                    grupo.servicioBase.nombrePasajero
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                  )}
                              </div>
                              <div style={{ height: '50px', flexShrink: 0 }}></div>
                          </form>
                      </div>
                      <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                          <button type="submit" form="form-transaccion" className="btn-primary" disabled={procesando}>{procesando ? '...' : 'Registrar'}</button>
                      </div>
                  </div>
              </div>
          )}

          {/* MODAL ALERTA PERSONALIZADA (NUEVO) */}
          {customAlert.show && (
            <div style={modalOverlayStyle}>
              <div style={{...modalContentStyle, maxWidth:'400px', textAlign:'center', padding:'30px', maxHeight:'auto', overflowY:'visible'}}>
                <div style={{ 
                    background: customAlert.type === 'warning' ? '#fffbeb' : (customAlert.type === 'success' ? '#ecfdf5' : '#fef2f2'), 
                    color: customAlert.type === 'warning' ? '#f59e0b' : (customAlert.type === 'success' ? '#10b981' : '#ef4444'), 
                    width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' 
                }}>
                    {customAlert.type === 'warning' ? <AlertTriangle size={32} /> : (customAlert.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />)}
                </div>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '800' }}>{customAlert.title}</h3>
                <p style={{ margin: '0 0 25px 0', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>{customAlert.msg}</p>
                <button onClick={closeAlert} className="btn-primary" style={{ width: '100%', background: customAlert.type === 'warning' ? '#f59e0b' : (customAlert.type === 'success' ? '#10b981' : '#ef4444'), border: 'none' }}>Entendido</button>
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