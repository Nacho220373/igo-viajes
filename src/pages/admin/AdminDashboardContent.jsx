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
  CheckSquare, Square, AlertCircle, CheckCircle, AlertTriangle, Calculator, Building, PieChart, CreditCard
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
  const [showModalAddCuenta, setShowModalAddCuenta] = useState(false); // NUEVO

  // ALERTA
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', msg: '', type: 'info' });

  // ESTADOS ESTADO DE CUENTA
  const [edoCtaFiltro, setEdoCtaFiltro] = useState({ idCliente: '', idViaje: '', fechaInicio: '', fechaFin: '' });
  const [edoCtaData, setEdoCtaData] = useState({ movimientos: [], cliente: null, resumen: {cargos:0, abonos:0, saldo:0}, esGeneral: false, esAgencia: false });
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // FORMULARIO TRANSACCIÓN RÁPIDA
  const [aplicaIVA, setAplicaIVA] = useState(false);
  const [tasaIVA, setTasaIVA] = useState(16);

  const formTransaccionInicial = { 
    tipo: '1', formaPago: '', monto: '', moneda: '1', concepto: '', 
    idCliente: '', idViaje: '', idProveedor: '', 
    noFactura: '',
    idCuentaEmpresa: '', 
    fecha: new Date().toISOString().split('T')[0] 
  };
  const [formTransaccion, setFormTransaccion] = useState(formTransaccionInicial);
  
  // FORMULARIO NUEVA CUENTA (ACTUALIZADO A COLUMNAS REALES)
  const [formCuenta, setFormCuenta] = useState({ nombre: '', tipo: 'Banco', banco: '', cuenta: '' });
  
  // LISTAS Y CATÁLOGOS
  const [listasFinancieras, setListasFinancieras] = useState({ formasPago: [], monedas: [], tipos: [], cuentasEmpresa: [] });
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
    const handleClickOutside = (event) => { if (addMenuRef.current && !addMenuRef.current.contains(event.target)) setShowAddMenu(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setServiciosViaje([]); setTransaccionesViaje([]); setSelectedServiciosFinanza([]);
    if (formTransaccion.idViaje) { cargarDatosDelViaje(formTransaccion.idViaje); }
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
        if(resListasFin.exito) {
            const monedasSeguras = (resListasFin.listas.monedas && resListasFin.listas.monedas.length > 0) 
                ? resListasFin.listas.monedas 
                : [{id: '1', nombre: 'MXN'}, {id: '2', nombre: 'USD'}, {id: '3', nombre: 'EUR'}];
            
            setListasFinancieras({
                ...resListasFin.listas,
                monedas: monedasSeguras
            });
        }
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
          if (resServicios.exito && Array.isArray(resServicios.datos)) setServiciosViaje(resServicios.datos);
          else setServiciosViaje([]);
          if (resFinanzas.exito && Array.isArray(resFinanzas.datos)) setTransaccionesViaje(resFinanzas.datos);
          else setTransaccionesViaje([]);
      } catch (error) { console.error(error); }
  };

  const showAlert = (title, msg, type = 'info') => setCustomAlert({ show: true, title, msg, type });
  const closeAlert = () => setCustomAlert({ ...customAlert, show: false });

  const handleMenuOption = (ruta, accionEspecial = null) => {
      setShowAddMenu(false);
      if (accionEspecial === 'transaccion') {
          setFormTransaccion(formTransaccionInicial); setSelectedServiciosFinanza([]); setAplicaIVA(false); setTasaIVA(16); setShowModalTransaccion(true);
      }
      else if (accionEspecial === 'edocta') {
          setEdoCtaFiltro({ idCliente: '', idViaje: '', fechaInicio: '', fechaFin: '' }); setShowModalSelectorEdoCta(true);
      }
      else navigate(ruta, { state: { openCreate: true } });
  };

  const parseFechaLocal = (fechaStr) => {
      if (!fechaStr) return null;
      if (fechaStr.includes('/')) { const [d,m,y] = fechaStr.split('/'); return new Date(y,m-1,d); }
      return new Date(fechaStr);
  };

  const getIconoCategoria = (catId) => { 
      if (!listaCategorias) return <Tag size={18}/>;
      const c = listaCategorias.find(x=>x.id==catId); const n = c ? c.nombre.toLowerCase() : ''; 
      if(n.includes('vuelo')) return <Plane size={18}/>; if(n.includes('hotel')) return <Hotel size={18}/>; if(n.includes('auto')) return <Car size={18}/>; if(n.includes('alimento')) return <Utensils size={18}/>; return <Tag size={18}/>; 
  };
  const getNombreCategoria = (id) => { const cat = listaCategorias.find(c => c.id == id); return cat ? cat.nombre : 'Servicio'; };
  
  const isServicioSaldado = (idServicio) => {
    if (!transaccionesViaje || !Array.isArray(transaccionesViaje)) return false;
    const servicio = serviciosViaje.find(s => s.idServicio == idServicio);
    if (!servicio) return false;
    const movs = transaccionesViaje.filter(t => t && t.idServicio == idServicio);
    let totalIngresos = 0;
    let totalEgresos = 0;
    movs.forEach(t => { 
        const monto = parseFloat(String(t.monto || "0").replace(/[^0-9.-]+/g,"")) || 0; 
        if (t.tipoId == 1 || t.tipoId == 3) totalIngresos += monto; 
        if (t.tipoId == 2) totalEgresos += monto; 
    });
    if (formTransaccion.tipo == '2') {
        return totalEgresos >= (servicio.costoProveedor || 0);
    } else {
        return totalIngresos >= (servicio.precioVenta || 0);
    }
  };

  const obtenerServiciosAgrupados = () => {
      if (!serviciosViaje || !Array.isArray(serviciosViaje) || serviciosViaje.length === 0) return [];
      const gruposMap = new Map();
      const pendientes = serviciosViaje.filter(s => s && s.idServicio && !isServicioSaldado(s.idServicio));
      pendientes.forEach(s => {
          const cat = String(s.categoriaId || '').trim();
          const dest = String(s.destino || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          let fecha = String(s.fechaInicio || '').split(' ')[0].trim(); 
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
      return Array.from(gruposMap.values()).map(g => ({ ...g, cantidad: g.ids.length, pasajerosStr: g.nombresPasajeros.sort().join(", ") }));
  };

  const toggleGrupoServicios = (ids) => {
      const all = ids.every(id => selectedServiciosFinanza.includes(id));
      let nueva = [...selectedServiciosFinanza];
      if (all) nueva = nueva.filter(id => !ids.includes(id));
      else ids.forEach(id => { if (!nueva.includes(id)) nueva.push(id); });
      setSelectedServiciosFinanza(nueva);
  };

  const generarReporte = async () => {
      if (!edoCtaFiltro.idCliente) return showAlert("Faltan datos", "Selecciona un cliente o el reporte global", "warning");
      setLoadingReporte(true);
      
      const res = await enviarPeticion({ 
          accion: 'obtenerEstadoCuentaGlobal', 
          idCliente: edoCtaFiltro.idCliente,
          idViaje: edoCtaFiltro.idViaje 
      });

      if (res.exito) {
          let movs = res.datos;
          if (edoCtaFiltro.fechaInicio) {
              const fi = new Date(edoCtaFiltro.fechaInicio); fi.setHours(0,0,0,0);
              movs = movs.filter(m => { const d = parseFechaLocal(m.fecha); return d && d >= fi; });
          }
          if (edoCtaFiltro.fechaFin) {
              const ff = new Date(edoCtaFiltro.fechaFin); ff.setHours(23,59,59,999);
              movs = movs.filter(m => { const d = parseFechaLocal(m.fecha); return d && d <= ff; });
          }

          let cargos = 0, abonos = 0;
          movs.forEach(m => { cargos += m.cargo; abonos += m.abono; });

          setEdoCtaData({ 
              movimientos: movs, 
              cliente: res.cliente,
              resumen: { cargos, abonos, saldo: cargos - abonos },
              esGeneral: res.esGeneral,
              esAgencia: edoCtaFiltro.idCliente === "AGENCY_INTERNAL" 
          });
          setShowModalSelectorEdoCta(false);
          setShowModalReporte(true);
      } else {
          showAlert("Error", res.error, "error");
      }
      setLoadingReporte(false);
  };

  const descargarExcel = () => {
    if (!edoCtaData.movimientos.length) return showAlert("Sin datos", "No hay datos para exportar", "warning");
    const colSpanTotal = edoCtaData.esGeneral ? 8 : 7; 
    const tituloReporte = edoCtaData.esAgencia ? "REPORTE FINANCIERO AGENCIA" : "ESTADO DE CUENTA";
    const extraHeader = (edoCtaData.esGeneral || edoCtaData.esAgencia) ? '<th style="background:#1e3a8a;color:white;">Cliente / Prov</th>' : '';
    
    const labelCargo = edoCtaData.esAgencia ? "Egresos (Pagos a Prov)" : "Cargos";
    const labelAbono = edoCtaData.esAgencia ? "Ingresos (Cobros)" : "Abonos";
    const labelSaldo = edoCtaData.esAgencia ? "Flujo Neto" : "Saldo";

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>
          <tr><td colspan="${colSpanTotal}" align="center" style="font-size:18px;font-weight:bold;color:#2563eb;">${tituloReporte}</td></tr>
          <tr><td colspan="${colSpanTotal}" align="center">${edoCtaData.cliente?.nombre}</td></tr>
          <tr><th style="background:#1e3a8a;color:white;">Fecha</th>${extraHeader}<th style="background:#1e3a8a;color:white;">Viaje</th><th style="background:#1e3a8a;color:white;">Concepto</th><th style="background:#1e3a8a;color:white;">${labelCargo}</th><th style="background:#1e3a8a;color:white;">${labelAbono}</th><th style="background:#1e3a8a;color:white;">${labelSaldo}</th></tr>
    `;
    let saldo = 0;
    edoCtaData.movimientos.forEach(m => {
        if (edoCtaData.esAgencia) {
             saldo += (m.abono - m.cargo); 
        } else {
             saldo += (m.cargo - m.abono); 
        }
        
        const cliCell = (edoCtaData.esGeneral || edoCtaData.esAgencia) ? `<td>${m.nombreCliente || ''}</td>` : '';
        html += `<tr><td>${m.fecha}</td>${cliCell}<td>${m.viaje}</td><td>${m.concepto}</td><td style="color:#ef4444">${m.cargo>0?'$'+m.cargo.toFixed(2):'-'}</td><td style="color:#10b981">${m.abono>0?'$'+m.abono.toFixed(2):'-'}</td><td>$${saldo.toFixed(2)}</td></tr>`;
    });
    html += `<tr><td colspan="${colSpanTotal}"></td></tr><tr><td colspan="${colSpanTotal-2}" align="right"><b>TOTAL FINAL:</b></td><td colspan="2" style="background:#f1f5f9;color:#2563eb"><b>$${saldo.toFixed(2)}</b></td></tr></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Reporte_${edoCtaData.esAgencia ? 'Agencia' : 'Cliente'}.xls`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const descargarPDF = () => {
    const el = document.getElementById('print-area-admin');
    if (!el) return;
    setGenerandoPDF(true);
    const opt = { margin: 5, filename: `EdoCta.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
    html2pdf().set(opt).from(el).save().then(() => setGenerandoPDF(false));
  };

  const handleGuardarTransaccion = async (e) => {
      e.preventDefault();
      if (formTransaccion.tipo !== '2' && !formTransaccion.idCliente) {
          return showAlert("Faltan datos", "Selecciona un cliente para este ingreso", "warning");
      }
      
      setProcesando(true);
      
      const subtotal = parseFloat(formTransaccion.monto) || 0;
      const montoIVA = aplicaIVA ? (subtotal * (parseFloat(tasaIVA) / 100)) : 0;
      const total = subtotal + montoIVA;

      const transaccionEnviar = { 
          ...formTransaccion, 
          aplicaIVA: aplicaIVA,
          tasaIVA: aplicaIVA ? tasaIVA : 0,
          subtotal: subtotal,
          montoIVA: montoIVA,
          monto: total, 
          idServicio: selectedServiciosFinanza.length > 0 ? selectedServiciosFinanza : '' 
      };

      const respuesta = await enviarPeticion({ accion: 'registrarTransaccion', transaccion: transaccionEnviar });
      if(respuesta.exito) {
          setShowModalTransaccion(false);
          setFormTransaccion(formTransaccionInicial);
          setSelectedServiciosFinanza([]);
          setAplicaIVA(false);
          cargarDashboardAdmin();
          showAlert("Éxito", "Movimiento registrado correctamente", "success");
      } else {
          showAlert("Error", "Error: " + respuesta.error, "error");
      }
      setProcesando(false);
  };

  // NUEVA FUNCION: GUARDAR CUENTA COMPLETA
  const handleGuardarCuenta = async (e) => {
      e.preventDefault();
      if (!formCuenta.nombre) return showAlert("Error", "El nombre identificador es obligatorio");
      setProcesando(true);
      
      // Enviamos el objeto completo coincidiendo con las columnas del Sheet
      const res = await enviarPeticion({ 
          accion: 'agregarCuentaEmpresa', 
          nombre: formCuenta.nombre, // Alias
          tipo: formCuenta.tipo,     
          banco: formCuenta.banco,   // Nombre del banco
          cuenta: formCuenta.cuenta  // Número de cuenta
      });

      if (res.exito) {
          setShowModalAddCuenta(false);
          setFormCuenta({ nombre: '', tipo: 'Banco', banco: '', cuenta: '' });
          await cargarListasCompletas(); 
          showAlert("Éxito", "Cuenta agregada correctamente", "success");
      } else {
          showAlert("Error", res.error);
      }
      setProcesando(false);
  };

  const gruposServicios = (showModalTransaccion && serviciosViaje.length > 0) ? obtenerServiciosAgrupados() : [];
  const calcSubtotal = parseFloat(formTransaccion.monto) || 0;
  const calcIVA = aplicaIVA ? (calcSubtotal * (parseFloat(tasaIVA) / 100)) : 0;
  const calcTotal = calcSubtotal + calcIVA;

  return (
      <div className="dashboard-container" style={{ paddingTop: '80px' }}>
          {/* HEADER */}
          <div className="header-flexible">
              <div><h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--primary-dark)', fontWeight: '800' }}>Panel de Control</h1><p style={{ margin: '5px 0 0', color: '#64748b' }}>Vista Administrativa</p></div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
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

          {/* MODAL TRANSACCION */}
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
                                  <div><label style={labelStyle}>{aplicaIVA ? 'Importe / Subtotal' : 'Monto'}</label><input required type="number" step="0.01" value={formTransaccion.monto} onChange={e=>setFormTransaccion({...formTransaccion, monto:e.target.value})} style={inputStyle} placeholder="0.00" /></div>
                                  <div>
                                      <label style={labelStyle}>Moneda</label>
                                      <select 
                                        value={formTransaccion.moneda} 
                                        onChange={e=>setFormTransaccion({...formTransaccion, moneda:e.target.value})} 
                                        style={inputStyle}
                                      >
                                        {listasFinancieras.monedas && listasFinancieras.monedas.length > 0 
                                            ? listasFinancieras.monedas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)
                                            : (<><option value="1">MXN</option><option value="2">USD</option></>)
                                        }
                                      </select>
                                  </div>
                              </div>
                              <div style={{ background: aplicaIVA ? '#f0fdf4' : 'transparent', padding: aplicaIVA ? '10px' : '0', borderRadius: '10px', border: aplicaIVA ? '1px dashed #bbf7d0' : 'none' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: aplicaIVA ? '10px' : '0', fontSize:'0.9rem', fontWeight:'600', color:'#334155' }}><input type="checkbox" checked={aplicaIVA} onChange={e => setAplicaIVA(e.target.checked)} style={{width:'18px', height:'18px'}} /> ¿Más IVA? (Sumar Impuestos)</label>
                                {aplicaIVA && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', animation:'fadeIn 0.3s' }}><div><label style={{fontSize:'0.75rem', fontWeight:'700', color:'#64748b'}}>Tasa IVA (%)</label><input type="number" value={tasaIVA} onChange={e=>setTasaIVA(e.target.value)} style={{...inputStyle, padding:'8px'}} /></div><div><label style={{fontSize:'0.75rem', fontWeight:'700', color:'#64748b'}}>Monto IVA</label><div style={{...inputStyle, padding:'8px', background:'#e2e8f0', color:'#64748b'}}>${calcIVA.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div></div></div>)}
                              </div>
                              {aplicaIVA && (<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#ecfdf5', padding:'10px 15px', borderRadius:'10px', color:'#065f46', fontWeight:'800', border:'1px solid #a7f3d0' }}><span>Total Final:</span><span style={{fontSize:'1.1rem'}}>${calcTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>)}
                              
                              <div className={formTransaccion.tipo === '2' ? 'fade-in' : ''}>
                                  <label style={labelStyle}>Cliente {formTransaccion.tipo !== '2' && '*'}</label>
                                  <SearchableSelect 
                                    options={dashboardData?.listasRapidas?.clientes}
                                    value={formTransaccion.idCliente}
                                    onChange={(val) => setFormTransaccion({...formTransaccion, idCliente: val, idViaje: ''})}
                                    placeholder={formTransaccion.tipo === '2' ? "(Opcional) Asociar a cliente" : "Seleccionar Cliente..."}
                                    required={formTransaccion.tipo !== '2'}
                                  />
                              </div>

                              <div className="grid-responsive-2"><div><label style={labelStyle}>Concepto</label><input required type="text" value={formTransaccion.concepto} onChange={e=>setFormTransaccion({...formTransaccion, concepto:e.target.value})} style={inputStyle} placeholder="Ej. Depósito inicial" /></div><div><label style={labelStyle}>No. Factura (Opcional)</label><input type="text" value={formTransaccion.noFactura} onChange={e=>setFormTransaccion({...formTransaccion, noFactura:e.target.value})} style={inputStyle} placeholder="Ej. F-12345" /></div></div>
                              <label style={labelStyle}>Forma de Pago</label><select value={formTransaccion.formaPago} onChange={e=>setFormTransaccion({...formTransaccion, formaPago:e.target.value})} style={inputStyle}><option value="">-- Seleccionar --</option>{listasFinancieras.formasPago.map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
                              
                              {formTransaccion.tipo == '2' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label style={labelStyle}>Proveedor (Para Gasto)</label>
                                        <SearchableSelect options={listaProveedores} value={formTransaccion.idProveedor} onChange={(val) => setFormTransaccion({...formTransaccion, idProveedor: val})} placeholder="Buscar Proveedor..." />
                                    </div>
                                    <div>
                                        <label style={{...labelStyle, color: '#0369a1', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                            <span>Cuenta de Retiro</span>
                                            <button type="button" onClick={() => setShowModalAddCuenta(true)} style={{border:'none', background:'transparent', color:'#0ea5e9', cursor:'pointer', fontWeight:'bold', fontSize:'1.2rem'}}>+</button>
                                        </label>
                                        <select value={formTransaccion.idCuentaEmpresa} onChange={e => setFormTransaccion({...formTransaccion, idCuentaEmpresa: e.target.value})} style={{...inputStyle, borderColor: '#0ea5e9', background: '#f0f9ff'}}>
                                            <option value="">-- Seleccionar Origen --</option>
                                            {listasFinancieras.cuentasEmpresa.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                                        </select>
                                    </div>
                                </div>
                              )}

                              <div style={{background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px'}}><label style={{...labelStyle, color:'var(--primary)'}}>Asociar a Viaje (Opcional)</label><div style={{marginBottom:'10px'}}><SearchableSelect options={dashboardData?.listasRapidas?.viajes.filter(v => !formTransaccion.idCliente || v.idCliente == formTransaccion.idCliente)} value={formTransaccion.idViaje} onChange={(val) => setFormTransaccion({...formTransaccion, idViaje: val})} placeholder={formTransaccion.idCliente ? "Buscar viaje del cliente..." : "Selecciona un cliente primero"} disabled={!formTransaccion.idCliente} /></div>{formTransaccion.idViaje && (<><label style={{...labelStyle, marginTop:'10px'}}>Asociar a Servicios (El costo se dividirá)</label><div style={{ maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding:'5px' }}>{gruposServicios.length === 0 && <div style={{padding:'15px', textAlign:'center', color:'#94a3b8', fontSize:'0.85rem'}}>No hay servicios pendientes en este viaje.</div>}{gruposServicios.map(grupo => { const nomCat = getNombreCategoria(grupo.servicioBase.categoriaId); const all = grupo.ids.every(id => selectedServiciosFinanza.includes(id)); const some = grupo.ids.some(id => selectedServiciosFinanza.includes(id)); return (<div key={grupo.key} onClick={() => toggleGrupoServicios(grupo.ids)} style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: some ? '#eff6ff' : 'transparent' }}><div style={{color: all ? 'var(--primary)' : (some ? 'var(--primary-light)' : '#cbd5e1')}}>{all ? <CheckSquare size={18}/> : (some ? <div style={{width:18, height:18, background:'var(--primary-light)', borderRadius:4}}></div> : <Square size={18}/>)}</div><div style={{ flex:1 }}><div style={{fontSize:'0.85rem', fontWeight:'600', color: some ? 'var(--primary-dark)' : '#334155'}}>{nomCat} - {grupo.servicioBase.destino}{grupo.cantidad > 1 && <span style={{marginLeft:'8px', background:'#e0f2fe', color:'#0284c7', padding:'2px 6px', borderRadius:'10px', fontSize:'0.7rem'}}>x{grupo.cantidad}</span>}</div><div style={{fontSize:'0.75rem', color:'#64748b'}}>{grupo.cantidad > 1 ? (<div style={{display:'flex', alignItems:'center', gap:'4px'}}><Users size={12}/> {grupo.pasajerosStr}</div>) : (grupo.servicioBase.nombrePasajero)}</div></div></div>); })}</div></>)}</div><div style={{ height: '50px', flexShrink: 0 }}></div>
                          </form>
                      </div>
                      <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                          <button type="submit" form="form-transaccion" className="btn-primary" disabled={procesando}>{procesando ? '...' : 'Registrar'}</button>
                      </div>
                  </div>
              </div>
          )}

          {/* MODAL AGREGAR CUENTA (ACTUALIZADO A 4 COLUMNAS) */}
          {showModalAddCuenta && (
              <div style={modalOverlayStyle}>
                  <div style={{...modalContentStyle, maxWidth:'450px', height:'auto', overflow:'visible'}}>
                      <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}>
                          <h3 style={{margin:0}}>Nueva Cuenta</h3>
                          <button onClick={()=>setShowModalAddCuenta(false)} style={closeBtnStyle}><X size={18}/></button>
                      </div>
                      <div style={{padding:'25px'}}>
                          <form onSubmit={handleGuardarCuenta}>
                              <div style={{marginBottom:'15px'}}>
                                  <label style={labelStyle}>Alias / Identificador *</label>
                                  <input required type="text" value={formCuenta.nombre} onChange={e=>setFormCuenta({...formCuenta, nombre:e.target.value})} style={inputStyle} placeholder="Ej. Caja Principal, BBVA Nómina"/>
                              </div>
                              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginBottom:'15px'}}>
                                  <div>
                                      <label style={labelStyle}>Tipo</label>
                                      <select value={formCuenta.tipo} onChange={e=>setFormCuenta({...formCuenta, tipo:e.target.value})} style={inputStyle}>
                                          <option value="Banco">Banco</option>
                                          <option value="Caja Chica">Caja Chica</option>
                                          <option value="Tarjeta Crédito">Tarjeta Crédito</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label style={labelStyle}>Banco (Institución)</label>
                                      <input type="text" value={formCuenta.banco} onChange={e=>setFormCuenta({...formCuenta, banco:e.target.value})} style={inputStyle} placeholder="Ej. BBVA, Santander"/>
                                  </div>
                              </div>
                              <div style={{marginBottom:'25px'}}>
                                  <label style={labelStyle}>No. Cuenta / CLABE / Tarjeta</label>
                                  <input type="text" value={formCuenta.cuenta} onChange={e=>setFormCuenta({...formCuenta, cuenta:e.target.value})} style={inputStyle} placeholder="Ej. 1234567890"/>
                              </div>
                              <button type="submit" className="btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Crear Cuenta'}</button>
                          </form>
                      </div>
                  </div>
              </div>
          )}

          {showModalSelectorEdoCta && (
              <div style={modalOverlayStyle}>
                  <div style={{...modalContentStyle, maxWidth:'450px', maxHeight:'auto', overflow:'visible'}}>
                      <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}><h3 style={{margin:0}}>Reportes Financieros</h3><button onClick={()=>setShowModalSelectorEdoCta(false)} style={closeBtnStyle}><X size={18}/></button></div>
                      <div style={{padding:'25px', display:'flex', flexDirection:'column', gap:'15px'}}>
                          <div>
                            <label style={labelStyle}>Tipo de Reporte *</label>
                            <SearchableSelect 
                                options={[
                                    {id: "AGENCY_INTERNAL", nombre: "🏢 REPORTE AGENCIA (Ingresos vs Egresos)"}, 
                                    {id: "ALL", nombre: "👥 Deuda General de Clientes (Consolidado)"}, 
                                    ...(dashboardData?.listasRapidas?.clientes || [])
                                ]} 
                                value={edoCtaFiltro.idCliente} 
                                onChange={(val) => setEdoCtaFiltro({...edoCtaFiltro, idCliente: val, idViaje: ''})} 
                                placeholder="Seleccionar..." 
                            />
                          </div>
                          {edoCtaFiltro.idCliente && edoCtaFiltro.idCliente !== "ALL" && edoCtaFiltro.idCliente !== "AGENCY_INTERNAL" && (
                              <div style={{animation:'slideIn 0.2s'}}><label style={labelStyle}>Filtrar por Viaje (Opcional)</label><SearchableSelect options={dashboardData?.listasRapidas?.viajes.filter(v => v.idCliente == edoCtaFiltro.idCliente)} value={edoCtaFiltro.idViaje} onChange={(val) => setEdoCtaFiltro({...edoCtaFiltro, idViaje: val})} placeholder="Buscar viaje..." /></div>
                          )}
                          <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:'15px' }}>
                              <label style={{...labelStyle, color:'var(--primary)'}}>Filtrar por Fechas (Opcional)</label>
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

          {showModalReporte && (
            <div style={modalOverlayStyle}>
              <div style={{ ...modalContentStyle, maxWidth: '1000px', height: '90vh', padding: 0 }}>
                <div className="no-print" style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Vista Previa</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={descargarExcel} style={{ display: 'flex', gap: '5px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #16a34a', color: '#16a34a', background: 'white', cursor: 'pointer', fontWeight: '600' }}><Download size={18}/> Excel</button>
                        <button onClick={descargarPDF} disabled={generandoPDF} style={{ display: 'flex', gap: '5px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600' }}><Printer size={18}/> {generandoPDF ? '...' : 'PDF'}</button>
                        <button onClick={() => setShowModalReporte(false)} style={{ padding: '8px', borderRadius: '50%', border: 'none', background: '#e2e8f0', cursor: 'pointer' }}><X size={18}/></button>
                    </div>
                </div>
                <div id="print-area-admin" className="print-area" style={{ padding: '40px', background: 'white', flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '2px solid #2563eb', paddingBottom: '20px' }}>
                        <div>
                            <h1 style={{ margin: '0', color: '#2563eb', fontSize: '2rem' }}>
                                {edoCtaData.esAgencia ? 'REPORTE FINANCIERO' : 'ESTADO DE CUENTA'}
                            </h1>
                            <p style={{ margin: '5px 0 0', color: '#64748b' }}>
                                {edoCtaData.esAgencia ? 'Ingresos y Egresos de la Agencia' : (edoCtaData.cliente?.rfc || 'Sin RFC')}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}><h2 style={{ margin: 0, fontSize: '1.2rem' }}>{config.nombre_empresa || 'IGO Viajes'}</h2><p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: '#64748b' }}>{new Date().toLocaleDateString()}</p></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Titular</h4>
                            <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{edoCtaData.cliente?.nombre}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resumen del Periodo</h4>
                            
                            {edoCtaData.esAgencia ? (
                                <>
                                    <div style={{display:'flex', justifyContent:'space-between'}}><span>Ingresos (Cobrado):</span><span style={{color:'#16a34a', fontWeight:'700'}}>${edoCtaData.resumen.abonos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}><span>Egresos (Pagado Prov):</span><span style={{color:'#ef4444', fontWeight:'700'}}>${edoCtaData.resumen.cargos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                                    <div style={{borderTop:'1px solid #ccc', marginTop:'5px', paddingTop:'5px', fontWeight:'bold', color: (edoCtaData.resumen.abonos - edoCtaData.resumen.cargos) >= 0 ? '#2563eb' : '#ef4444', display:'flex', justifyContent:'space-between'}}>
                                        <span>Utilidad / Flujo Neto:</span><span>${(edoCtaData.resumen.abonos - edoCtaData.resumen.cargos).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{display:'flex', justifyContent:'space-between'}}><span>Cargos (Servicios):</span><span style={{color:'#ef4444', fontWeight:'700'}}>${edoCtaData.resumen.cargos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}><span>Abonos (Pagos):</span><span style={{color:'#16a34a', fontWeight:'700'}}>${edoCtaData.resumen.abonos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                                    <div style={{borderTop:'1px solid #ccc', marginTop:'5px', paddingTop:'5px', fontWeight:'bold', color:'#2563eb', display:'flex', justifyContent:'space-between'}}>
                                        <span>Saldo Pendiente:</span><span>${edoCtaData.resumen.saldo.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{padding:'8px',textAlign:'left'}}>Fecha</th>
                                {(edoCtaData.esGeneral || edoCtaData.esAgencia) && <th style={{padding:'8px',textAlign:'left'}}>Cliente / Prov</th>}
                                <th style={{padding:'8px',textAlign:'left'}}>Viaje</th>
                                <th style={{padding:'8px',textAlign:'left'}}>Concepto</th>
                                <th style={{padding:'8px',textAlign:'right'}}>{edoCtaData.esAgencia ? 'Egresos' : 'Cargos'}</th>
                                <th style={{padding:'8px',textAlign:'right'}}>{edoCtaData.esAgencia ? 'Ingresos' : 'Abonos'}</th>
                                <th style={{padding:'8px',textAlign:'right'}}>Acumulado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                let saldo = 0;
                                return edoCtaData.movimientos.map((m,i)=>{
                                    if(edoCtaData.esAgencia) {
                                        saldo += (m.abono - m.cargo); // Para agencia: Ingreso - Egreso
                                    } else {
                                        saldo += (m.cargo - m.abono); // Para cliente: Deuda - Pago
                                    }
                                    
                                    return (
                                        <tr key={i} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                            <td style={{padding:'8px',borderBottom:'1px solid #eee'}}>{m.fecha}</td>
                                            {(edoCtaData.esGeneral || edoCtaData.esAgencia) && <td style={{padding:'8px',borderBottom:'1px solid #eee', fontWeight:'600'}}>{m.nombreCliente}</td>}
                                            <td style={{padding:'8px',borderBottom:'1px solid #eee', fontWeight:'600', fontSize:'0.75rem', maxWidth:'150px'}}>{m.viaje}</td>
                                            <td style={{padding:'8px',borderBottom:'1px solid #eee', fontSize:'0.75rem'}}>{m.concepto}</td>
                                            <td style={{padding:'8px',textAlign:'right',borderBottom:'1px solid #eee', color:'#ef4444'}}>{m.cargo > 0 ? '$'+m.cargo.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                                            <td style={{padding:'8px',textAlign:'right',borderBottom:'1px solid #eee', color:'#16a34a'}}>{m.abono > 0 ? '$'+m.abono.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                                            <td style={{padding:'8px',textAlign:'right',borderBottom:'1px solid #eee', fontWeight:'700', color: (edoCtaData.esAgencia && saldo < 0) ? '#ef4444' : 'inherit'}}>${saldo.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    )
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
              </div>
            </div>
          )}

          {customAlert.show && (<div style={modalOverlayStyle}><div style={{...modalContentStyle, maxWidth:'400px', textAlign:'center', padding:'30px', maxHeight:'auto', overflowY:'visible'}}><div style={{ margin: '0 auto 20px', width: '60px', height: '60px', borderRadius: '50%', background: customAlert.type === 'warning' ? '#fffbeb' : (customAlert.type === 'success' ? '#ecfdf5' : '#fef2f2'), color: customAlert.type === 'warning' ? '#f59e0b' : (customAlert.type === 'success' ? '#10b981' : '#ef4444'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{customAlert.type === 'warning' ? <AlertTriangle size={32} /> : (customAlert.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />)}</div><h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '800' }}>{customAlert.title}</h3><p style={{ margin: '0 0 25px', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>{customAlert.msg}</p><button onClick={closeAlert} className="btn-primary" style={{ width: '100%', background: customAlert.type === 'warning' ? '#f59e0b' : (customAlert.type === 'success' ? '#10b981' : '#ef4444'), border: 'none' }}>Entendido</button></div></div>)}
      </div>
  );
}

const QuickAccessCard = ({ icon, title, onClick, color }) => (<div onClick={onClick} style={{ background: 'white', borderRadius: '20px', padding: '15px 25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '100px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}><div style={{ color }}>{icon}</div><span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>{title}</span></div>);
const BalanceCard = ({ title, amount, icon, color, bg }) => (<div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><div style={{ background: bg, padding: '8px', borderRadius: '10px', color: color }}>{icon}</div><span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.9rem' }}>{title}</span></div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>${amount.toLocaleString()}</div></div>);
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContentStyle = { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };
const menuItemStyle = { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#334155', fontWeight: '600', fontSize: '0.9rem', transition: 'background 0.2s', borderRadius: '8px', userSelect: 'none' };