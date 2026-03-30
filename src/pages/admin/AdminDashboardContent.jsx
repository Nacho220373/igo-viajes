import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { enviarPeticion } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import Loader from '../../components/Loader';
import FirstTripWizard from '../../components/FirstTripWizard';
import SearchableSelect from '../../components/SearchableSelect';
import {
  LogOut, Map as MapIcon, User as UserIcon, Calendar, ArrowRightCircle, LayoutGrid, List, Search, X,
  Users, UserCheck, Plane, Briefcase, TrendingUp, TrendingDown, Wallet, Bell, DollarSign, Clock,
  Plus, ChevronDown, ChevronUp, FileText, Download, Printer, Tag, Hotel, Car, Utensils, Ticket,
  CheckSquare, Square, AlertCircle, CheckCircle, AlertTriangle, Calculator, Building, PieChart, CreditCard, Filter,
  ArrowUpRight, ArrowDownRight, Activity, Database, Trash2, Edit
} from 'lucide-react';
import BulkUploader from '../../components/BulkUploader';
import AdminTour from '../../components/AdminTour';
import HelpCenter from '../../components/HelpCenter';


export default function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  // === ESTADOS GENERALES ===
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef(null);

  // === TOUR & SETUP ONBOARDING ===
  const [runTour, setRunTour] = useState(false);
  const [tourKeyNonce, setTourKeyNonce] = useState(0); // Para forzar el reinicio
  const [showSetupModal, setShowSetupModal] = useState(false);

  // MODALES
  const [showModalDesglose, setShowModalDesglose] = useState(false);
  const [loadingDesglose, setLoadingDesglose] = useState(false);
  const [desgloseConfig, setDesgloseConfig] = useState({ tipo: '', titulo: '', datos: [] });
  const [showModalTransaccion, setShowModalTransaccion] = useState(false);
  const [showModalSelectorEdoCta, setShowModalSelectorEdoCta] = useState(false);
  const [showModalReporte, setShowModalReporte] = useState(false);
  const [showModalAddCuenta, setShowModalAddCuenta] = useState(false);

  // REPORTES MULTI-SELECT
  const [selectedReportClients, setSelectedReportClients] = useState([]);
  const [selectedReportTrips, setSelectedReportTrips] = useState([]);
  const [filtroFechas, setFiltroFechas] = useState({ fechaInicio: '', fechaFin: '' });

  // BULK UPLOAD
  const [showModalBulk, setShowModalBulk] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ALERTA
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', msg: '', type: 'info' });
  const [edoCtaData, setEdoCtaData] = useState({ movimientos: [], cliente: null, resumen: {cargos:0, abonos:0, saldo:0}, esGeneral: false, esAgencia: false });
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // TRANSACCIÓN RÁPIDA
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
  const [modoEdicionTransaccion, setModoEdicionTransaccion] = useState(false);
  const [idTransaccionEditar, setIdTransaccionEditar] = useState(null);

  // GESTOR DE TRANSACCIONES
  const [showModalAdminTransacciones, setShowModalAdminTransacciones] = useState(false);
  const [transaccionesList, setTransaccionesList] = useState([]);
  const [loadingTransaccionesList, setLoadingTransaccionesList] = useState(false);

  // NUEVA CUENTA
  const [formCuenta, setFormCuenta] = useState({ nombre: '', tipo: 'Banco', banco: '', cuenta: '' });

  // LISTAS
  const [listasFinancieras, setListasFinancieras] = useState({ formasPago: [], monedas: [], tipos: [], cuentasEmpresa: [] });
  const [listaProveedores, setListaProveedores] = useState([]);
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaEstatus, setListaEstatus] = useState([]);

  // SERVICIOS / TRANSACCIONES DEL VIAJE SELECCIONADO
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
    setServiciosViaje([]);
    setTransaccionesViaje([]);
    setSelectedServiciosFinanza([]);
    if (formTransaccion.idViaje) { cargarDatosDelViaje(formTransaccion.idViaje); }
  }, [formTransaccion.idViaje]);

  const dismissSetup = () => {
    localStorage.setItem('igo_admin_setup_dismissed', 'true');
    setShowSetupModal(false);
  };

  // Checar si debe correr el tour o mostrar el setup
  useEffect(() => {
    if (dashboardData && !loading) {
      const tourSeen = localStorage.getItem('igo_admin_tour_seen');
      const setupDismissed = localStorage.getItem('igo_admin_setup_dismissed');
      const totalViajes = dashboardData?.listasRapidas?.viajes?.length || 0;

      if (!tourSeen && !runTour) {
        setRunTour(true);
      } else if (tourSeen && totalViajes === 0 && !setupDismissed && !runTour) {
        // Mostrar el setup SOLO si ya vió el tour, la base está vacía y el tour no corre
        setShowSetupModal(true);
      }
    }
  }, [dashboardData, loading, runTour]);

  const handleFinishTour = () => {
    setRunTour(false);
    
    // Verificación "Zero-State"
    const totalViajes = dashboardData?.listasRapidas?.viajes?.length || 0;
    const setupDismissed = localStorage.getItem('igo_admin_setup_dismissed');
    
    if (totalViajes === 0 && !setupDismissed) {
      setTimeout(() => setShowSetupModal(true), 500); // Pequeño retraso fluido
    }
  };

  const cargarDashboardAdmin = async () => {
    const cacheKey = 'igo_cache_dashboard_admin';
    const cacheData = sessionStorage.getItem(cacheKey);
    
    if (cacheData) {
      setDashboardData(JSON.parse(cacheData));
      setLoading(false);
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const respuesta = await enviarPeticion({ accion: 'obtenerDashboardAdmin' });
      if (respuesta.exito) {
        setDashboardData(respuesta.datos);
        sessionStorage.setItem(cacheKey, JSON.stringify(respuesta.datos));
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
      setIsRefreshing(false);
    }
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

  const abrirDesglose = async (tipo, titulo) => {
    setShowModalDesglose(true);
    setLoadingDesglose(true);
    setDesgloseConfig({ tipo, titulo, datos: [] });
    
    try {
        const res = await enviarPeticion({ accion: 'obtenerDesgloseKpi', tipo: tipo });
        if (res.exito) {
            setDesgloseConfig({ tipo, titulo, datos: res.datos });
        } else {
            showAlert("Error", "No se pudo cargar el desglose: " + (res.error || "Error desconocido"), "error");
            setShowModalDesglose(false);
        }
    } catch (error) {
        showAlert("Error", "Error de red al cargar el desglose", "error");
        setShowModalDesglose(false);
    }
    setLoadingDesglose(false);
  };

  const handleMenuOption = (ruta, accionEspecial = null) => {
    setShowAddMenu(false);
    if (accionEspecial === 'transaccion') {
      setModoEdicionTransaccion(false); setIdTransaccionEditar(null); setFormTransaccion(formTransaccionInicial); setSelectedServiciosFinanza([]); setAplicaIVA(false); setTasaIVA(16); setShowModalTransaccion(true);
    }
    else if (accionEspecial === 'transacciones') {
      abrirGestorTransacciones();
    }
    else if (accionEspecial === 'edocta') {
      setSelectedReportClients([]); setSelectedReportTrips([]); setFiltroFechas({fechaInicio:'', fechaFin:''}); setShowModalSelectorEdoCta(true);
    }
    else if (accionEspecial === 'bulk') {
      setShowModalBulk(true);
    }
    else navigate(ruta, { state: { openCreate: true } });
  };

  const handleUploadMasivo = async (parsedData, validationErrors) => {
    setIsUploading(true);
    const payload = {
        accion: 'procesarUploadMasivo',
        datos: parsedData,
        erroresIgnorados: validationErrors // Backend no necesita los errores formales, pero está bien pasarlos. Se enviarán solo los limpios.
    };

    try {
        const respuesta = await enviarPeticion(payload);
        if (respuesta.exito) {
            showAlert("Éxito", respuesta.mensaje, "success");
            setShowModalBulk(false);
            cargarDashboardAdmin();
            cargarListasCompletas();
        } else {
            showAlert("Error", "Error al procesar la subida: " + respuesta.error, "error");
        }
    } catch (error) {
        showAlert("Error", "Error de red durante la carga masiva.", "error");
    } finally {
        setIsUploading(false);
    }
  };

  // Utilidades
  const parseFechaLocal = (fechaStr) => { if (!fechaStr) return null; if (fechaStr.includes('/')) { const [d,m,y] = fechaStr.split('/'); return new Date(y,m-1,d); } return new Date(fechaStr); };
  const getIconoCategoria = (catId) => {
    if (!listaCategorias) return <Tag size={18}/>;
    const c = listaCategorias.find(x=>x.id==catId); const n = c ? c.nombre.toLowerCase() : '';
    if(n.includes('vuelo')) return <Plane size={18}/>;
    if(n.includes('hotel')) return <Hotel size={18}/>;
    if(n.includes('auto')) return <Car size={18}/>;
    if(n.includes('alimento')) return <Utensils size={18}/>;
    return <Tag size={18}/>;
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
      const monto = parseFloat(String(t.monto || "0").replace(/[^0-9.\-]+/g,"")) || 0;
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

  // --- NUEVO: normalización de IDs al obtener viajes disponibles según clientes seleccionados
  const getAvailableTripsForReport = () => {
    const viajes = dashboardData?.listasRapidas?.viajes || [];
    if (
      selectedReportClients.length === 0 ||
      selectedReportClients.includes("AGENCY_INTERNAL") ||
      selectedReportClients.includes("ALL")
    ) {
      return viajes;
    }
    const selectedSet = new Set(selectedReportClients.map(c => String(c)));
    return viajes.filter(v => selectedSet.has(String(v.idCliente)));
  };

  const addClientToReport = (id) => {
    if (id === "AGENCY_INTERNAL" || id === "ALL") {
      setSelectedReportClients([id]);
    } else {
      let newList = selectedReportClients.filter(c => c !== "AGENCY_INTERNAL" && c !== "ALL");
      if (!newList.includes(id)) newList.push(id);
      setSelectedReportClients(newList);
    }
    setSelectedReportTrips([]);
  };
  const removeClientFromReport = (id) => setSelectedReportClients(selectedReportClients.filter(c => c !== id));
  const addTripToReport = (id) => { if (id && !selectedReportTrips.includes(id)) { setSelectedReportTrips([...selectedReportTrips, id]); } };
  const removeTripFromReport = (id) => setSelectedReportTrips(selectedReportTrips.filter(t => t !== id));

  const generarReporte = async () => {
    if (selectedReportClients.length === 0) return showAlert("Faltan datos", "Selecciona al menos un cliente.", "warning");
    setLoadingReporte(true);
    const payload = {
      accion: 'obtenerEstadoCuentaGlobal',
      idCliente: selectedReportClients.length === 1 ? selectedReportClients[0] : selectedReportClients,
      idViaje: selectedReportTrips.length > 0 ? selectedReportTrips : ''
    };
    const res = await enviarPeticion(payload);
    if (res.exito) {
      let movs = res.datos;
      if (filtroFechas.fechaInicio) {
        const fi = new Date(filtroFechas.fechaInicio); fi.setHours(0,0,0,0);
        movs = movs.filter(m => { const d = parseFechaLocal(m.fecha); return d && d >= fi; });
      }
      if (filtroFechas.fechaFin) {
        const ff = new Date(filtroFechas.fechaFin); ff.setHours(23,59,59,999);
        movs = movs.filter(m => { const d = parseFechaLocal(m.fecha); return d && d <= ff; });
      }
      let cargos = 0, abonos = 0;
      movs.forEach(m => { cargos += m.cargo; abonos += m.abono; });
      const esAgencia = selectedReportClients.includes("AGENCY_INTERNAL");
      setEdoCtaData({
        movimientos: movs,
        cliente: res.cliente,
        resumen: { cargos, abonos, saldo: cargos - abonos },
        esGeneral: res.esGeneral || (Array.isArray(selectedReportClients) && selectedReportClients.length > 1),
        esAgencia
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
      if (edoCtaData.esAgencia) saldo += (m.abono - m.cargo);
      else saldo += (m.cargo - m.abono);
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
      return showAlert("Faltan datos", "Selecciona un cliente para este movimiento", "warning");
    }
    setProcesando(true);
    const subtotal = parseFloat(formTransaccion.monto) || 0;
    const montoIVA = aplicaIVA ? (subtotal * (parseFloat(tasaIVA) / 100)) : 0;
    const total = subtotal + montoIVA;
    const transaccionEnviar = { ...formTransaccion, aplicaIVA, tasaIVA: aplicaIVA ? tasaIVA : 0, subtotal, montoIVA, monto: total, idServicio: selectedServiciosFinanza.length > 0 ? selectedServiciosFinanza : '' };
    
    if (modoEdicionTransaccion) {
       transaccionEnviar.idTransaccion = idTransaccionEditar;
    }
    const accionApi = modoEdicionTransaccion ? 'editarTransaccion' : 'registrarTransaccion';
    
    const respuesta = await enviarPeticion({ accion: accionApi, transaccion: transaccionEnviar, rol: user?.rolBase });
    if(respuesta.exito) { 
       setShowModalTransaccion(false); setFormTransaccion(formTransaccionInicial); setSelectedServiciosFinanza([]); setAplicaIVA(false); 
       cargarDashboardAdmin(); 
       if (showModalAdminTransacciones) abrirGestorTransacciones();
       showAlert("Éxito", respuesta.mensaje || "Movimiento registrado correctamente", "success"); 
    }
    else { showAlert("Error", "Error: " + respuesta.error, "error"); }
    setProcesando(false);
  };

  const abrirGestorTransacciones = async () => {
    setShowModalAdminTransacciones(true);
    setLoadingTransaccionesList(true);
    const res = await enviarPeticion({ accion: 'obtenerTodasTransacciones', rol: user?.rolBase });
    if (res.exito) {
        setTransaccionesList(res.datos || []);
    } else {
        showAlert("Error", res.error, "error");
    }
    setLoadingTransaccionesList(false);
  };

  const handleEditarTransaccionClick = (t) => {
    setModoEdicionTransaccion(true);
    setIdTransaccionEditar(t.idTransaccion);
    setAplicaIVA(t.aplicaIVA || false);
    setTasaIVA(t.tasaIVA || 16);
    
    let montoMostrar = t.monto;
    if (t.aplicaIVA && t.tasaIVA > 0) {
        montoMostrar = t.monto / (1 + (t.tasaIVA/100));
    }

    setFormTransaccion({
      tipo: String(t.tipo),
      formaPago: t.formaPago,
      monto: montoMostrar,
      moneda: t.moneda || '1',
      concepto: t.concepto || '',
      idCliente: t.idCliente,
      idViaje: t.idViaje || '',
      idProveedor: t.idProveedor || '',
      noFactura: t.noFactura || '',
      idCuentaEmpresa: t.idCuentaEmpresa || '',
      fecha: t.fecha,
      idServicio: t.idServicio || ''
    });
    setShowModalTransaccion(true);
  };

  const eliminarTransaccionSeleccionada = async (idT) => {
    if (!window.confirm("¿Estás seguro de eliminar esta transacción permanentemente?")) return;
    setLoadingTransaccionesList(true);
    const res = await enviarPeticion({ accion: 'eliminarTransaccion', idTransaccion: idT, rol: user?.rolBase });
    if (res.exito) {
        abrirGestorTransacciones();
        cargarDashboardAdmin();
        showAlert("Éxito", "Transacción eliminada", "success");
    } else {
        showAlert("Error", res.error, "error");
        setLoadingTransaccionesList(false);
    }
  };

  const handleGuardarCuenta = async (e) => {
    e.preventDefault();
    if (!formCuenta.nombre) return showAlert("Error", "El nombre es obligatorio");
    setProcesando(true);
    const res = await enviarPeticion({ accion: 'agregarCuentaEmpresa', nombre: formCuenta.nombre, tipo: formCuenta.tipo, banco: formCuenta.banco, cuenta: formCuenta.cuenta });
    if (res.exito) { setShowModalAddCuenta(false); setFormCuenta({ nombre: '', tipo: 'Banco', banco:'', cuenta:'' }); await cargarListasCompletas(); showAlert("Éxito", "Cuenta agregada correctamente", "success"); }
    else { showAlert("Error", res.error); }
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
        <div>
          <h1 className="tour-header" style={{ margin: 0, fontSize: '2rem', color: 'var(--primary-dark)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '15px' }}>
            Panel de Control
            {isRefreshing && (
              <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8 }}>
                <Activity size={20} className="spin-animation" color="var(--primary)"/> <span style={{fontSize:'0.8rem'}}>Actualizando...</span>
              </span>
            )}
          </h1>
          <p style={{ margin: '5px 0 0', color: '#64748b' }}>Vista Administrativa</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="action-container" style={{ position: 'relative' }} ref={addMenuRef}>
            <button className="tour-btn-acciones" onClick={() => setShowAddMenu(!showAddMenu)} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', display:'flex', gap:'8px', alignItems:'center', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.3)' }}><Plus size={18}/> Acciones {showAddMenu ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
            {showAddMenu && (
              <div className="dropdown-menu-responsive">
                <div onClick={() => handleMenuOption('/admin/viajes')} style={menuItemStyle}><Plane size={18} color="var(--primary)"/> Nuevo Viaje</div>
                <div onClick={() => handleMenuOption('/admin/cotizaciones')} style={menuItemStyle}><FileText size={18} color="var(--primary)"/> Nueva Cotización</div>
                <div onClick={() => handleMenuOption('/admin/clientes')} style={menuItemStyle}><Users size={18} color="var(--primary)"/> Nuevo Cliente</div>
                <div onClick={() => handleMenuOption('/admin/pasajeros')} style={menuItemStyle}><UserCheck size={18} color="var(--primary)"/> Nuevo Pasajero</div>
                <div onClick={() => handleMenuOption('/admin/proveedores')} style={menuItemStyle}><Briefcase size={18} color="var(--primary)"/> Nuevo Proveedor</div>
                <div style={{height:'1px', background:'#f1f5f9', margin:'6px 0'}}></div>
                <div onClick={() => handleMenuOption(null, 'bulk')} style={{...menuItemStyle, color:'#8b5cf6'}}><Database size={18}/> Carga Masiva (Excel)</div>
                <div onClick={() => handleMenuOption(null, 'transacciones')} style={{...menuItemStyle, color:'#f59e0b'}}><List size={18}/> Ver Transacciones</div>
                <div onClick={() => handleMenuOption(null, 'transaccion')} style={{...menuItemStyle, color:'#16a34a'}}><DollarSign size={18}/> Registrar Transacción</div>
                <div onClick={() => handleMenuOption(null, 'edocta')} style={{...menuItemStyle, color:'#2563eb'}}><FileText size={18}/> Estado de Cuenta</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tour-accesos-rapidos" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '30px' }}>
        <QuickAccessCard icon={<PieChart size={22} />} title="Cotizaciones" onClick={() => navigate('/admin/cotizaciones')} color="#f59e0b" />
        <QuickAccessCard icon={<Plane size={22} />} title="Viajes" onClick={() => navigate('/admin/viajes')} color="#2563eb" />
        <QuickAccessCard icon={<Users size={22} />} title="Clientes" onClick={() => navigate('/admin/clientes')} color="var(--primary-dark)" />
        <QuickAccessCard icon={<UserCheck size={22} />} title="Pasajeros" onClick={() => navigate('/admin/pasajeros')} color="#0f766e" />
        <QuickAccessCard icon={<Briefcase size={22} />} title="Proveedores" onClick={() => navigate('/admin/proveedores')} color="#ca8a04" />
      </div>

      {loading || !dashboardData ? <Loader message="Analizando métricas financieras..." /> : (
        <>
          <div className="tour-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
             <BalanceCard onClick={() => abrirDesglose('ingresos', 'Desglose de Ingresos')} title="Ingresos" amount={dashboardData.balance.ingresos} icon={<ArrowUpRight size={24}/>} color="#16a34a" bg="#ecfdf5" />
             <BalanceCard onClick={() => abrirDesglose('egresos', 'Desglose de Egresos')} title="Egresos" amount={dashboardData.balance.egresos} icon={<ArrowDownRight size={24}/>} color="#ef4444" bg="#fef2f2" />
             
             <div onClick={() => abrirDesglose('cxc', 'Desglose de Cuentas por Cobrar (CXC)')} style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ position: 'absolute', right: '-20px', top: '-20px', background: '#eff6ff', width: '100px', height: '100px', borderRadius: '50%', opacity: 0.5 }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '10px', color: '#2563eb' }}><Wallet size={24} /></div>
                    <span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.9rem' }}>CXC (Cuentas por Cobrar)</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: dashboardData.balance.cxc > 0 ? '#f59e0b' : '#10b981' }}>${(dashboardData.balance.cxc || 0).toLocaleString()}</div>
             </div>

             <div onClick={() => abrirDesglose('cxp', 'Desglose de Cuentas por Pagar (CXP)')} style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ position: 'absolute', right: '-20px', top: '-20px', background: '#fef2f2', width: '100px', height: '100px', borderRadius: '50%', opacity: 0.5 }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '10px', color: '#ef4444' }}><Calendar size={24} /></div>
                    <span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.9rem' }}>CXP (Cuentas por Pagar)</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: dashboardData.balance.cxp > 0 ? '#ef4444' : '#10b981' }}>${(dashboardData.balance.cxp || 0).toLocaleString()}</div>
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginBottom: '25px' }}>
             
             {/* PRIMERA FILA: FLUJO Y SERVICIOS */}
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', alignItems: 'start' }}>
             {/* PANEL FLUJO NETO Y GRÁFICA */}
             <div style={{ background: 'var(--primary-gradient)', padding: '24px', borderRadius: '24px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)' }}>
               <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', opacity: 0.9 }}><TrendingUp size={20} /> <span style={{ fontWeight: '700', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Flujo Libre Anualizado</span></div>
                  <div style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-1px' }}>${(dashboardData.balance.utilidad || 0).toLocaleString()}</div>
               </div>
               
               <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                     <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: '600' }}>Venta Total Proyectada</div>
                     <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>${(dashboardData.balance.ventaTotal || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: '600' }}>Costo Proveedores Proyectado</div>
                     <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>${(dashboardData.balance.costoTotal || 0).toLocaleString()}</div>
                  </div>
               </div>
             </div>

             {/* PANEL ALERTAS DE SERVICIOS */}
             <div className="dashboard-card tour-alertas-servicios" style={{ padding: '24px', display:'flex', flexDirection:'column', height: 'auto', maxHeight: '350px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'10px' }}><Bell size={20} color="#f59e0b"/> Próximos Servicios</h3>
                <span style={{ background: '#fffbeb', color: '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700' }}>{dashboardData.recordatorios.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dashboardData.recordatorios.length === 0 ? <p style={{color:'#94a3b8', textAlign:'center', marginTop:'30px'}}>Sin servicios próximos.</p> : (
                    dashboardData.recordatorios.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', transition:'background 0.2s', cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'} onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'} onClick={() => navigate('/admin/viajes#v'+r.idViaje)}>
                        <div style={{ background: 'white', padding: '8px', borderRadius: '50%', boxShadow:'0 2px 4px rgba(0,0,0,0.05)' }}>
                          <Clock size={16} color="var(--primary)"/>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>{r.categoria === 1 ? 'Vuelo' : 'Tours/Hotel'} a {r.destino}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>A las {r.fecha}</div>
                        </div>
                        <ArrowRightCircle size={16} color="#cbd5e1"/>
                      </div>
                    ))
                )}
              </div>
             </div>
             </div>

             {/* SEGUNDA FILA: MONITOR DE VIAJES */}
             <div style={{ display: 'block' }}>
             <div className="dashboard-card tour-monitor-viajes" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'10px' }}><Plane size={20} color="var(--primary)"/> Monitor de Viajes en Curso</h3>
                <button onClick={() => navigate('/admin/viajes')} style={{ background: 'transparent', border:'none', color:'var(--primary)', fontWeight:'700', cursor:'pointer', fontSize:'0.9rem' }}>Ver todos</button>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', alignItems: 'stretch' }}>
                  {dashboardData.viajesActivos.length === 0 ? <div style={{width:'100%', padding:'30px', background:'#f8fafc', borderRadius:'16px', textAlign:'center', color:'#94a3b8'}}>No hay viajes activos en este momento.</div> : (
                      dashboardData.viajesActivos.map(v => (
                        <div key={v.id} onClick={() => navigate(`/admin/viaje/${v.id}`)} style={{ minWidth: '280px', flexShrink: 0, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', position: 'relative', overflow: 'hidden', display:'flex', flexDirection:'column', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor='var(--primary)'}} onMouseLeave={e => {e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='#e2e8f0'}}>
                           <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: v.diasRestantes < 3 ? '#ef4444' : '#3b82f6' }}></div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: v.diasRestantes < 3 ? '#ef4444' : '#3b82f6', background: v.diasRestantes < 3 ? '#fef2f2' : '#eff6ff', padding: '4px 8px', borderRadius: '8px' }}>{v.diasRestantes > 0 ? `En ${v.diasRestantes} días` : 'HOY'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>VIAJE #{v.id}</div>
                           </div>
                           <div style={{ fontWeight: '800', color: 'var(--primary-dark)', fontSize: '1.2rem', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.nombre}</div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '0.9rem', flex: 1, marginBottom: '5px' }}>
                              <UserIcon size={14}/> <span>{v.cliente}</span>
                           </div>
                        </div>
                      ))
                  )}
              </div>
            </div>
             </div>
          </div>
        </>
      )}

      {/* MODALES TRANSACCIÓN / CUENTA / SELECTOR / REPORTE / ALERTAS */}
      {showModalTransaccion && (
        <div style={{...modalOverlayStyle, zIndex: 10050}}>
          <div style={{...modalContentStyle, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column'}}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{modoEdicionTransaccion ? 'Editar Movimiento' : 'Registrar Movimiento'}</h2>
              <button onClick={() => setShowModalTransaccion(false)} style={closeBtnStyle}><X size={18}/></button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <form id="form-transaccion" onSubmit={handleGuardarTransaccion} style={{ display: 'grid', gap: '15px' }}>
                
                {/* SELECTOR TIPO (INGRESO / EGRESO) */}
                <div style={{background:'#f1f5f9', padding:'10px', borderRadius:'12px', display:'flex', gap:'10px'}}>
                    <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'10px', borderRadius:'10px', background: formTransaccion.tipo=='1'?'white':'transparent', fontWeight:'700', color: formTransaccion.tipo=='1'?'#16a34a':'#64748b', boxShadow: formTransaccion.tipo=='1'?'0 2px 5px rgba(0,0,0,0.05)':''}}>
                        <input type="radio" name="tipo" value="1" checked={formTransaccion.tipo=='1'} onChange={e=>setFormTransaccion({...formTransaccion, tipo: e.target.value})} style={{display:'none'}}/> Ingreso
                    </label>
                    <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'10px', borderRadius:'10px', background: formTransaccion.tipo=='2'?'white':'transparent', fontWeight:'700', color: formTransaccion.tipo=='2'?'#ef4444':'#64748b', boxShadow: formTransaccion.tipo=='2'?'0 2px 5px rgba(0,0,0,0.05)':''}}>
                        <input type="radio" name="tipo" value="2" checked={formTransaccion.tipo=='2'} onChange={e=>setFormTransaccion({...formTransaccion, tipo: e.target.value})} style={{display:'none'}}/> Egreso
                    </label>
                    <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'10px', borderRadius:'10px', background: formTransaccion.tipo=='3'?'white':'transparent', fontWeight:'700', color: formTransaccion.tipo=='3'?'#2563eb':'#64748b', boxShadow: formTransaccion.tipo=='3'?'0 2px 5px rgba(0,0,0,0.05)':''}}>
                        <input type="radio" name="tipo" value="3" checked={formTransaccion.tipo=='3'} onChange={e=>setFormTransaccion({...formTransaccion, tipo: e.target.value})} style={{display:'none'}}/> Abono
                    </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label style={labelStyle}>Monto</label>
                        <input required type="number" step="0.01" value={formTransaccion.monto} onChange={e=>setFormTransaccion({...formTransaccion, monto:e.target.value})} style={inputStyle} placeholder="0.00" />
                    </div>
                    <div>
                        <label style={labelStyle}>Moneda</label>
                        <select value={formTransaccion.moneda} onChange={e=>setFormTransaccion({...formTransaccion, moneda:e.target.value})} style={inputStyle}>
                            {listasFinancieras.monedas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                    </div>
                </div>

                {/* IVA CHECKBOX */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', color: '#475569' }}>
                        <input type="checkbox" checked={aplicaIVA} onChange={e => setAplicaIVA(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                        Mas IVA
                    </label>
                    {aplicaIVA && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="number" value={tasaIVA} onChange={e => setTasaIVA(e.target.value)} style={{ width: '60px', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }} /> %
                        </div>
                    )}
                    <div style={{ marginLeft: 'auto', fontWeight: '800', color: 'var(--primary)' }}>Total: ${calcTotal.toLocaleString()}</div>
                </div>

                <div>
                    <label style={labelStyle}>Concepto</label>
                    <input required type="text" value={formTransaccion.concepto} onChange={e=>setFormTransaccion({...formTransaccion, concepto:e.target.value})} style={inputStyle} placeholder="Ej. Anticipo Paquete" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label style={labelStyle}>Fecha</label>
                        <input required type="date" value={formTransaccion.fecha} onChange={e=>setFormTransaccion({...formTransaccion, fecha:e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Forma de Pago</label>
                        <select value={formTransaccion.formaPago} onChange={e=>setFormTransaccion({...formTransaccion, formaPago:e.target.value})} style={inputStyle}>
                            <option value="">-- Seleccionar --</option>
                            {listasFinancieras.formasPago.map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}
                        </select>
                    </div>
                </div>

                {/* LOGICA CLIENTE vs PROVEEDOR */}
                {formTransaccion.tipo !== '2' ? (
                    <div>
                        <label style={{...labelStyle, color:'var(--primary)'}}>Cliente (Origen)</label>
                        <SearchableSelect 
                            options={dashboardData?.listasRapidas?.clientes || []}
                            value={formTransaccion.idCliente} 
                            onChange={(val) => setFormTransaccion({...formTransaccion, idCliente: val})}
                            placeholder="Buscar Cliente..."
                        />
                    </div>
                ) : (
                    <div>
                        <label style={{...labelStyle, color:'#ef4444'}}>Proveedor (Destino)</label>
                        <SearchableSelect 
                            options={listaProveedores} 
                            value={formTransaccion.idProveedor} 
                            onChange={(val) => setFormTransaccion({...formTransaccion, idProveedor: val})}
                            placeholder="Buscar Proveedor..."
                        />
                    </div>
                )}

                <div>
                    <label style={labelStyle}>Vincular a Viaje (Opcional)</label>
                    <SearchableSelect 
                        options={dashboardData?.listasRapidas?.viajes || []}
                        value={formTransaccion.idViaje} 
                        onChange={(val) => setFormTransaccion({...formTransaccion, idViaje: val})}
                        placeholder="Buscar Viaje..."
                    />
                </div>

                {/* SERVICIOS DEL VIAJE (Si se seleccionó viaje) */}
                {gruposServicios.length > 0 && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                        <label style={{ ...labelStyle, color: 'var(--primary)', marginBottom: '10px' }}>Asociar a Servicios Específicos (Opcional)</label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                            {gruposServicios.map(grupo => {
                                const idsGrupo = grupo.ids || [];
                                const isSelected = idsGrupo.some(id => selectedServiciosFinanza.includes(id));
                                return (
                                    <div 
                                        key={grupo.key} 
                                        onClick={() => toggleGrupoServicios(idsGrupo)}
                                        style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: isSelected ? '#eff6ff' : 'transparent' }}
                                    >
                                        <div style={{ color: isSelected ? 'var(--primary)' : '#cbd5e1' }}>{isSelected ? <CheckSquare size={18} /> : <Square size={18} />}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isSelected ? 'var(--primary-dark)' : '#334155' }}>
                                                {getNombreCategoria(grupo.servicioBase.categoriaId)} - {grupo.servicioBase.destino}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pasajeros: {grupo.pasajerosStr}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <label style={labelStyle}>Cuenta de Empresa (Destino/Origen)</label>
                    <div style={{display:'flex', gap:'10px'}}>
                        <select value={formTransaccion.idCuentaEmpresa} onChange={e=>setFormTransaccion({...formTransaccion, idCuentaEmpresa:e.target.value})} style={{...inputStyle, flex:1}}>
                            <option value="">-- Seleccionar Caja/Banco --</option>
                            {listasFinancieras.cuentasEmpresa && listasFinancieras.cuentasEmpresa.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre} ({c.banco})</option>
                            ))}
                        </select>
                        <button type="button" onClick={() => setShowModalAddCuenta(true)} style={{background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'0 12px', cursor:'pointer'}}><Plus size={20} color="var(--primary)"/></button>
                    </div>
                </div>

              </form>
            </div>
            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
              <button type="submit" form="form-transaccion" className="btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : (modoEdicionTransaccion ? 'Actualizar' : 'Registrar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BULK UPLOAD */}
      {showModalBulk && (
        <div style={modalOverlayStyle}>
           <div style={{...modalContentStyle, maxWidth: '800px', padding: 0, overflow: 'hidden'}}>
               <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Importación Masiva Integrada</h2>
                  <button onClick={() => setShowModalBulk(false)} style={closeBtnStyle}><X size={18}/></button>
               </div>
               <div style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto', background: '#f8fafc' }}>
                  <BulkUploader onUpload={handleUploadMasivo} isProcessing={isUploading} />
               </div>
           </div>
        </div>
      )}

      {showModalAddCuenta && (
        <div style={{...modalOverlayStyle, zIndex: 10060}}>
          <div style={{...modalContentStyle, maxWidth:'400px', height:'auto', overflow:'visible'}}>
            <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}>
              <h3 style={{margin:0}}>Nueva Cuenta</h3>
              <button onClick={() => setShowModalAddCuenta(false)} style={closeBtnStyle}><X size={18}/></button>
            </div>
            <div style={{padding:'25px'}}>
              <form onSubmit={handleGuardarCuenta} style={{display:'grid', gap:'15px'}}>
                  <div><label style={labelStyle}>Nombre Identificador</label><input required type="text" value={formCuenta.nombre} onChange={e=>setFormCuenta({...formCuenta, nombre:e.target.value})} style={inputStyle} placeholder="Ej. Banamex Principal"/></div>
                  <div><label style={labelStyle}>Tipo</label><select value={formCuenta.tipo} onChange={e=>setFormCuenta({...formCuenta, tipo:e.target.value})} style={inputStyle}><option value="Banco">Banco</option><option value="Caja Chica">Caja Chica</option><option value="Plataforma">Plataforma</option></select></div>
                  <div><label style={labelStyle}>Banco (Opcional)</label><input type="text" value={formCuenta.banco} onChange={e=>setFormCuenta({...formCuenta, banco:e.target.value})} style={inputStyle}/></div>
                  <div><label style={labelStyle}>No. Cuenta / CLABE (Opcional)</label><input type="text" value={formCuenta.cuenta} onChange={e=>setFormCuenta({...formCuenta, cuenta:e.target.value})} style={inputStyle}/></div>
                  <button type="submit" className="btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Crear Cuenta'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showModalSelectorEdoCta && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, maxWidth:'450px', maxHeight:'auto', overflow:'visible'}}>
            <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}><h3 style={{margin:0}}>Reportes Financieros</h3><button onClick={() => setShowModalSelectorEdoCta(false)} style={closeBtnStyle}><X size={18}/></button></div>
            <div style={{padding:'25px', display:'flex', flexDirection:'column', gap:'15px'}}>
              <div>
                <label style={labelStyle}><Users size={14}/> Clientes (Tags)</label>
                <SearchableSelect
                  options={[
                    {id: "AGENCY_INTERNAL", nombre: "🏢 REPORTE AGENCIA (Ingresos vs Egresos)"},
                    {id: "ALL", nombre: "👥 Deuda General de Clientes (Consolidado)"},
                    ...(dashboardData?.listasRapidas?.clientes || [])
                  ]}
                  value=""
                  onChange={addClientToReport}
                  placeholder="+ Agregar cliente al reporte..."
                />
                <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'8px'}}>
                  {selectedReportClients.map(cid => {
                    const cliName = (cid === "AGENCY_INTERNAL" ? "Reporte Agencia" : (cid === "ALL" ? "Consolidado General" : dashboardData?.listasRapidas?.clientes.find(c=>c.id==cid)?.nombre));
                    return (
                      <div key={cid} style={{background:'#eff6ff', border:'1px solid #bfdbfe', padding:'4px 8px', borderRadius:'12px', fontSize:'0.8rem', color:'#1e40af', display:'flex', alignItems:'center', gap:'5px'}}>
                        {cliName || cid} <X size={14} style={{cursor:'pointer'}} onClick={() => removeClientFromReport(cid)}/>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}><Filter size={14}/> Filtrar por Viajes (Opcional)</label>
                <SearchableSelect
                  options={getAvailableTripsForReport().filter(t => !selectedReportTrips.includes(String(t.id)))}
                  value=""
                  onChange={addTripToReport}
                  placeholder="+ Agregar viaje..."
                  disabled={selectedReportClients.includes("AGENCY_INTERNAL") || selectedReportClients.includes("ALL") || selectedReportClients.length === 0}
                />
                <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'8px'}}>
                  {selectedReportTrips.map(tid => {
                    const tripName = dashboardData?.listasRapidas?.viajes.find(t=>String(t.id)==tid)?.nombre;
                    return (
                      <div key={tid} style={{background:'#eff6ff', border:'1px solid #bfdbfe', padding:'4px 8px', borderRadius:'12px', fontSize:'0.8rem', color:'#1e40af', display:'flex', alignItems:'center', gap:'5px'}}>
                        {tripName || tid} <X size={14} style={{cursor:'pointer'}} onClick={() => removeTripFromReport(tid)}/>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:'15px' }}>
                <label style={{ ...labelStyle, color:'var(--primary)' }}>Filtrar por Fechas (Opcional)</label>
                <div className="grid-responsive-2">
                  <div><label style={{fontSize:'0.75rem', color:'#64748b'}}>Desde</label><input type="date" style={inputStyle} value={filtroFechas.fechaInicio} onChange={e=>setFiltroFechas({ ...filtroFechas, fechaInicio:e.target.value })} /></div>
                  <div><label style={{fontSize:'0.75rem', color:'#64748b'}}>Hasta</label><input type="date" style={inputStyle} value={filtroFechas.fechaFin} onChange={e=>setFiltroFechas({ ...filtroFechas, fechaFin:e.target.value })} /></div>
                </div>
              </div>

              <button onClick={generarReporte} disabled={selectedReportClients.length === 0 || loadingReporte} className="btn-primary" style={{marginTop:'10px'}}>{loadingReporte ? 'Generando...' : 'Ver Reporte'}</button>
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
                    return edoCtaData.movimientos.map((m,i) => {
                      if(edoCtaData.esAgencia) { saldo += (m.abono - m.cargo); } else { saldo += (m.cargo - m.abono); }
                      return (
                        <tr key={i} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <td style={{padding:'8px',borderBottom:'1px solid #eee'}}>{m.fecha}</td>
                          {(edoCtaData.esGeneral || edoCtaData.esAgencia) && <td style={{padding:'8px',borderBottom:'1px solid #eee', fontWeight:'600'}}>{m.nombreCliente}</td>}
                          <td style={{padding:'8px',borderBottom:'1px solid #eee', fontWeight:'600', fontSize:'0.75rem', maxWidth:'150px'}}>{m.viaje}</td>
                          <td style={{padding:'8px',borderBottom:'1px solid #eee', fontSize:'0.75rem'}}>{m.concepto}</td>
                          <td style={{padding:'8px',textAlign:'right',borderBottom:'1px solid #eee', color:'#ef4444'}}>{m.cargo > 0 ? '$' + m.cargo.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                          <td style={{padding:'8px',textAlign:'right',borderBottom:'1px solid #eee', color:'#16a34a'}}>{m.abono > 0 ? '$' + m.abono.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
                          <td style={{padding:'8px',textAlign:'right',borderBottom:'1px solid #eee', fontWeight:'700', color: (edoCtaData.esAgencia && saldo < 0) ? '#ef4444' : 'inherit'}}>${saldo.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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

      {showModalDesglose && (
          <div style={modalOverlayStyle}>
              <div style={{ ...modalContentStyle, maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                      <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem' }}>{desgloseConfig.titulo}</h3>
                      <button onClick={() => setShowModalDesglose(false)} style={closeBtnStyle}><X size={18} /></button>
                  </div>
                  <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                      {loadingDesglose ? (
                          <Loader message="Cargando desglose..." />
                      ) : (
                          desgloseConfig.datos.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No hay registros para este rubro.</div>
                          ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                  <thead>
                                      <tr style={{ background: '#f1f5f9', color: '#64748b' }}>
                                          {(desgloseConfig.tipo === 'ingresos' || desgloseConfig.tipo === 'egresos') ? (
                                              <>
                                                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Fecha</th>
                                                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Concepto</th>
                                                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{desgloseConfig.tipo === 'ingresos' ? 'Cliente' : 'Proveedor'}</th>
                                                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Referencia (Viaje)</th>
                                                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Monto</th>
                                              </>
                                          ) : (
                                              <>
                                                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Referencia (Viaje)</th>
                                                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Cliente Asignado</th>
                                                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{desgloseConfig.tipo === 'cxc' ? 'Estimado / Facturado' : 'A Pagar (Proveedores)'}</th>
                                                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{desgloseConfig.tipo === 'cxc' ? 'Cobrado' : 'Pagado'}</th>
                                                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Pendiente por {desgloseConfig.tipo === 'cxc' ? 'Cobrar' : 'Pagar'}</th>
                                              </>
                                          )}
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {desgloseConfig.datos.map((row, i) => (
                                          <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                              {(desgloseConfig.tipo === 'ingresos' || desgloseConfig.tipo === 'egresos') ? (
                                                  <>
                                                      <td style={{ padding: '10px' }}>{row.fecha}</td>
                                                      <td style={{ padding: '10px', fontWeight: '600' }}>{row.concepto}</td>
                                                      <td style={{ padding: '10px' }}>{row.entidad}</td>
                                                      <td style={{ padding: '10px', color: '#64748b' }}>{row.viaje}</td>
                                                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: desgloseConfig.tipo === 'ingresos' ? '#16a34a' : '#ef4444' }}>${row.monto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                  </>
                                              ) : (
                                                  <>
                                                      <td style={{ padding: '10px', fontWeight: '600' }}>{row.viaje}</td>
                                                      <td style={{ padding: '10px' }}>{row.cliente}</td>
                                                      <td style={{ padding: '10px', textAlign: 'right', color: '#64748b' }}>${row.presupuestado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                      <td style={{ padding: '10px', textAlign: 'right', color: '#64748b' }}>${row.pagado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: desgloseConfig.tipo === 'cxc' ? '#f59e0b' : '#ef4444' }}>${row.saldo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                  </>
                                              )}
                                          </tr>
                                      ))}
                                  </tbody>
                                  <tfoot>
                                      <tr style={{ background: '#f8fafc', fontWeight: '800' }}>
                                          {(desgloseConfig.tipo === 'ingresos' || desgloseConfig.tipo === 'egresos') ? (
                                              <>
                                                  <td colSpan="4" style={{ padding: '15px 10px', textAlign: 'right' }}>TOTAL DEL DESGLOSE:</td>
                                                  <td style={{ padding: '15px 10px', textAlign: 'right', color: desgloseConfig.tipo === 'ingresos' ? '#16a34a' : '#ef4444' }}>${desgloseConfig.datos.reduce((acc, r) => acc + r.monto, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                              </>
                                          ) : (
                                              <>
                                                  <td colSpan="4" style={{ padding: '15px 10px', textAlign: 'right' }}>TOTAL PENDIENTE (CXC/CXP):</td>
                                                  <td style={{ padding: '15px 10px', textAlign: 'right', color: desgloseConfig.tipo === 'cxc' ? '#f59e0b' : '#ef4444' }}>${desgloseConfig.datos.reduce((acc, r) => acc + r.saldo, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                              </>
                                          )}
                                      </tr>
                                  </tfoot>
                              </table>
                          )
                      )}
                  </div>
              </div>
          </div>
      )}

      {showModalAdminTransacciones && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, maxWidth: '1000px', maxHeight: '90vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}><List size={20} color="var(--primary)"/> Gestor de Transacciones</h2>
              <button onClick={() => setShowModalAdminTransacciones(false)} style={closeBtnStyle}><X size={18}/></button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {loadingTransaccionesList ? (
                <Loader message="Cargando transacciones..." />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                     <tr style={{ background: '#f1f5f9', color: '#64748b' }}>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Fecha</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Concepto</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Entidad</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Viaje</th>
                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Monto</th>
                        <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Acciones</th>
                     </tr>
                  </thead>
                  <tbody>
                    {transaccionesList.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px', color:'#94a3b8'}}>No hay transacciones guardadas.</td></tr> : transaccionesList.map(t => (
                        <tr key={t.idTransaccion} style={{ borderBottom: '1px solid #e2e8f0', background: 'white', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='white'}>
                           <td style={{ padding: '10px' }}>{t.fecha}</td>
                           <td style={{ padding: '10px', fontWeight: '600' }}>
                              {t.concepto} <br/>
                              <span style={{ fontSize:'0.75rem', color:'#94a3b8', fontWeight:'normal' }}>Cuenta: {t.idCuentaEmpresa ? (listasFinancieras.cuentasEmpresa?.find(c=>c.id==t.idCuentaEmpresa)?.nombre || t.idCuentaEmpresa) : 'General'}</span>
                           </td>
                           <td style={{ padding: '10px', color: '#475569' }}>{t.tipo == 2 ? t.nombreProveedor : t.nombreCliente}</td>
                           <td style={{ padding: '10px', color: '#64748b' }}>{t.nombreViaje !== 'General' ? t.nombreViaje : '-'}</td>
                           <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: (t.tipo == 2 ? '#ef4444' : '#16a34a') }}>${t.monto.toLocaleString(undefined, {minimumFractionDigits: 2})} {t.nombreMoneda}</td>
                           <td style={{ padding: '10px', textAlign: 'center' }}>
                              {user?.rolBase === 'Administrador' ? (
                                <div style={{display:'flex', gap:'5px', justifyContent:'center'}}>
                                   <button onClick={() => handleEditarTransaccionClick(t)} style={{background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'8px', padding:'6px', color:'#2563eb', cursor:'pointer'}} title="Editar"><Edit size={16}/></button>
                                   <button onClick={() => eliminarTransaccionSeleccionada(t.idTransaccion)} style={{background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'6px', color:'#ef4444', cursor:'pointer'}} title="Eliminar"><Trash2 size={16}/></button>
                                </div>
                              ) : (
                                <span style={{fontSize:'0.75rem', color:'#94a3b8'}}>Sólo visualización</span>
                              )}
                           </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {customAlert.show && (<div style={modalOverlayStyle}><div style={{...modalContentStyle, maxWidth:'400px', textAlign:'center', padding:'30px', maxHeight:'auto', overflowY:'visible'}}><div style={{ margin: '0 auto 20px', width: '60px', height: '60px', borderRadius: '50%', background: customAlert.type === 'warning' ? '#fffbeb' : (customAlert.type === 'success' ? '#ecfdf5' : '#fef2f2'), color: customAlert.type === 'warning' ? '#f59e0b' : (customAlert.type === 'success' ? '#10b981' : '#ef4444'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{customAlert.type === 'warning' ? <AlertTriangle size={32} /> : (customAlert.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />)}</div><h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '800' }}>{customAlert.title}</h3><p style={{ margin: '0 0 25px', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>{customAlert.msg}</p><button onClick={closeAlert} className="btn-primary" style={{ width: '100%', background: customAlert.type === 'warning' ? '#f59e0b' : (customAlert.type === 'success' ? '#10b981' : '#ef4444'), border: 'none' }}>Entendido</button></div></div>)}

      {/* SETUP ONBOARDING MODAL */}
      {showSetupModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '500px', padding: '30px', textAlign: 'center' }}>
            <div style={{ margin: '0 auto 20px', width: '70px', height: '70px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plane size={36} />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: '1.6rem', color: 'var(--primary-dark)' }}>¡Bienvenido a IGO Viajes!</h2>
            <p style={{ margin: '0 0 25px', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>
              Parece que tu sistema está limpiecito. <b>¿Quieres que te guíe en tu configuración inicial?</b> Dime si tienes ya un archivo de excel lleno de viajes o si prefieres registrar el primero a mano.
            </p>
            <div style={{ display: 'grid', gap: '15px' }}>
              <button onClick={() => { dismissSetup(); setShowModalBulk(true); }} style={{ padding: '15px', border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(37, 99, 235, 0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ background: 'white', padding: '10px', borderRadius: '12px', color: '#2563eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Database size={24}/></div>
                <div>
                  <div style={{ fontWeight: '800', color: '#1e40af', fontSize: '1.05rem', marginBottom: '2px' }}>Importar por Excel</div>
                  <div style={{ fontSize: '0.85rem', color: '#60a5fa' }}>Tengo varios viajes, clientes o pasajeros en tablas.</div>
                </div>
              </button>
              <button onClick={() => { 
                  dismissSetup(); 
                  localStorage.setItem('igo_first_trip_wizard', JSON.stringify({ active: true, step: 'proveedores' }));
                  navigate('/admin/proveedores'); 
              }} style={{ padding: '15px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px', color: '#64748b', border: '1px solid #e2e8f0' }}><Plus size={24}/></div>
                <div>
                  <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: '2px' }}>Registrar Primer Viaje (Guiado)</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Te llevaremos paso a paso interactivamente.</div>
                </div>
              </button>
            </div>
            <button onClick={dismissSetup} style={{ marginTop: '20px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>No gracias, explorar por mi cuenta</button>
          </div>
        </div>
      )}
      
      <AdminTour key={tourKeyNonce} run={runTour} setRun={setRunTour} onFinishTour={handleFinishTour} tourKey="igo_admin_tour_seen" />
      <HelpCenter onRestartTour={() => { setTourKeyNonce(prev => prev + 1); setRunTour(true); }} />
      <FirstTripWizard currentStep="dashboard" />
    </div>
  );
}

const QuickAccessCard = ({ icon, title, onClick, color }) => (<div onClick={onClick} style={{ background: 'white', borderRadius: '20px', padding: '15px 25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '100px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}><div style={{ color }}>{icon}</div><span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>{title}</span></div>);
const BalanceCard = ({ title, amount, icon, color, bg, onClick }) => (<div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'box-shadow 0.2s', ...((onClick ? { '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } } : {})) }} onMouseEnter={e => { if(onClick) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)' }} onMouseLeave={e => { if(onClick) e.currentTarget.style.boxShadow = 'none' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><div style={{ background: bg, padding: '8px', borderRadius: '10px', color: color }}>{icon}</div><span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.9rem' }}>{title}</span></div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>${amount.toLocaleString()}</div></div>);
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContentStyle = { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };
const menuItemStyle = { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#334155', fontWeight: '600', fontSize: '0.9rem', transition: 'background 0.2s', borderRadius: '8px', userSelect: 'none' };