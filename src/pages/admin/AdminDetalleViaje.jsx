import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enviarPeticion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import { ArrowLeft, Plus, MapPin, User, Tag, Plane, Hotel, Car, Utensils, Ticket, Wallet, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Star, MessageSquare, CheckSquare, Square, Users, Trash2, Pencil, X, AlertCircle, DollarSign, PieChart } from 'lucide-react';

export default function AdminDetalleViaje() {
  const { id } = useParams(); 
  const { user } = useAuth();
  const navigate = useNavigate();

  // === ESTADOS ===
  const [activeTab, setActiveTab] = useState('itinerario'); 
  const [viajeInfo, setViajeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState([]);
  const [pasajeros, setPasajeros] = useState([]); 
  const [transacciones, setTransacciones] = useState([]);
  
  // ESTADO DE RESUMEN FINANCIERO
  const [resumenFinanciero, setResumenFinanciero] = useState(null);

  // Listas
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaEstatus, setListaEstatus] = useState([]);
  const [listaTiposFin, setListaTiposFin] = useState([]); 
  const [listaFormasPago, setListaFormasPago] = useState([]);
  const [listaMonedas, setListaMonedas] = useState([]);
  const [listaProveedores, setListaProveedores] = useState([]);
  const [saldoCliente, setSaldoCliente] = useState(0);

  // Modales y Formularios
  const [showModalServicio, setShowModalServicio] = useState(false);
  const [showModalFinanzas, setShowModalFinanzas] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [isEditingServicio, setIsEditingServicio] = useState(false);
  const [currentIdServicio, setCurrentIdServicio] = useState(null);
  
  // Alertas y Confirmaciones
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', msg: '', type: 'error' });
  const [confirmConfig, setConfirmConfig] = useState({ show: false, message: '', onConfirm: null });

  // Forms
  const formServicioInicial = { 
      categoria: '', destino: '', clave: '', fechaInicio: '', fechaFin: '', estatus: '',
      // NUEVOS CAMPOS FINANCIEROS EN SERVICIO
      costoProveedor: '', precioVenta: '', idProveedor: '' 
  };
  const [formServicio, setFormServicio] = useState(formServicioInicial);
  const [selectedPasajeros, setSelectedPasajeros] = useState([]); 

  const formFinanzaInicial = { tipo: '1', formaPago: '', monto: '', moneda: '1', concepto: '', idProveedor: '', fecha: new Date().toISOString().split('T')[0] };
  const [formFinanza, setFormFinanza] = useState(formFinanzaInicial);
  const [selectedServiciosFinanza, setSelectedServiciosFinanza] = useState([]);

  useEffect(() => { cargarDatosGenerales(); }, [id]);
  
  // Cargar finanzas cada vez que se entra al tab o se actualiza algo
  useEffect(() => { 
      if (activeTab === 'finanzas') cargarDatosFinancieros(); 
  }, [activeTab]);

  // --- CARGA DE DATOS ---
  const cargarDatosGenerales = async () => {
    setLoading(true);
    try {
      const [resListas, resInfo, resServicios, resPasajeros, resProv] = await Promise.all([
          enviarPeticion({ accion: 'obtenerListas' }),
          enviarPeticion({ accion: 'obtenerInfoViaje', idViaje: id }),
          enviarPeticion({ accion: 'obtenerDetallesViaje', idViaje: id }),
          enviarPeticion({ accion: 'obtenerPasajeros', rol: user.rol }),
          enviarPeticion({ accion: 'obtenerProveedores' }) // Necesario para el modal de servicios
      ]);

      if (resListas.exito) {
        setListaCategorias(resListas.listas.categorias || []);
        setListaEstatus(resListas.listas.estatus || []);
      }
      if (resInfo.exito) setViajeInfo(resInfo.viaje);
      if (resServicios.exito) setServicios(resServicios.datos);
      if (resProv.exito) setListaProveedores(resProv.datos);
      if (resPasajeros.exito) {
          let pasajerosDisp = resPasajeros.datos;
          if (resInfo.exito && user.rol !== 'Administrador') {
             pasajerosDisp = resPasajeros.datos.filter(p => p.idCliente == resInfo.viaje.idCliente);
          }
          setPasajeros(pasajerosDisp.map(p => ({ ...p, nombre: `${p.nombre} ${p.apellidoP}` })));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const cargarDatosFinancieros = async () => {
    try {
        const [resListasFin, resTrans, resResumen] = await Promise.all([
            enviarPeticion({ accion: 'obtenerListasFinancieras' }),
            enviarPeticion({ accion: 'obtenerFinanzasViaje', idViaje: id }),
            enviarPeticion({ accion: 'obtenerResumenFinancieroViaje', idViaje: id }) // NUEVO ENDPOINT
        ]);
        
        if (resListasFin.exito) {
            setListaTiposFin(resListasFin.listas.tipos);
            setListaFormasPago(resListasFin.listas.formasPago);
            setListaMonedas(resListasFin.listas.monedas);
        }
        if (resTrans.exito) setTransacciones(resTrans.datos);
        if (resResumen.exito) setResumenFinanciero(resResumen.datos);

        if (viajeInfo?.idCliente) {
            const resSaldo = await enviarPeticion({ accion: 'obtenerSaldoCliente', idCliente: viajeInfo.idCliente });
            if (resSaldo.exito) setSaldoCliente(resSaldo.saldo);
        }
    } catch (e) { console.error(e); }
  };

  const showAlert = (title, msg, type = 'error') => setCustomAlert({ show: true, title, msg, type });
  const closeAlert = () => setCustomAlert({ ...customAlert, show: false });

  // === LÓGICA DE AGRUPACIÓN (BASADA EN ID COMPARTIDO) ===
  const obtenerServiciosAgrupados = () => {
      const gruposMap = new Map();
      
      servicios.forEach(s => {
          const key = String(s.idServicio); 
          if (!gruposMap.has(key)) {
              gruposMap.set(key, {
                  idServicio: s.idServicio, 
                  servicioBase: s, 
                  pasajeros: [], 
                  count: 0,
                  // Sumamos totales del grupo para mostrar en la tarjeta
                  totalCostoGrupo: 0,
                  totalVentaGrupo: 0
              });
          }
          const grupo = gruposMap.get(key);
          grupo.pasajeros.push({ id: s.idPasajero, nombre: s.nombrePasajero });
          grupo.count++;
          grupo.totalCostoGrupo += (s.costoProveedor || 0);
          grupo.totalVentaGrupo += (s.precioVenta || 0);
      });

      return Array.from(gruposMap.values());
  };

  const serviciosAgrupados = obtenerServiciosAgrupados();

  // --- GESTIÓN DE SERVICIOS ---
  const abrirModalCrear = () => {
    setIsEditingServicio(false); setCurrentIdServicio(null);
    setFormServicio({...formServicioInicial, categoria: listaCategorias[0]?.id || '1', estatus: listaEstatus[0]?.id || '1'});
    setSelectedPasajeros([]); 
    setShowModalServicio(true);
  };

  const abrirModalEditar = (grupo) => {
    setIsEditingServicio(true); 
    setCurrentIdServicio(grupo.idServicio);
    const s = grupo.servicioBase;
    
    const toInput = (d) => {
        if(!d) return "";
        try {
            const [date, time] = d.split(' ');
            const [day, month, year] = date.split('/');
            return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${time || '00:00'}`;
        } catch(e) { return ""; }
    };

    setFormServicio({
        categoria: s.categoriaId, destino: s.destino, clave: s.clave,
        fechaInicio: toInput(s.fechaInicio), fechaFin: toInput(s.fechaFin), estatus: s.estatusId,
        // Cargar datos financieros
        costoProveedor: s.costoProveedor, precioVenta: s.precioVenta, idProveedor: s.idProveedor
    });
    
    const pasajerosGrupo = grupo.pasajeros.map(p => {
        const fullPas = pasajeros.find(px => px.id == p.id);
        return fullPas ? { id: fullPas.id, nombre: fullPas.nombre } : { id: p.id, nombre: p.nombre };
    });
    setSelectedPasajeros(pasajerosGrupo);
    setShowModalServicio(true);
  };

  const handleGuardarServicio = async (e) => {
    e.preventDefault();
    if (selectedPasajeros.length === 0) return showAlert("Atención", "Debes seleccionar al menos un pasajero.", "warning");
    
    setProcesando(true);
    
    const payload = {
        ...formServicio,
        idViaje: id,
        idCliente: viajeInfo.idCliente,
        idServicio: currentIdServicio,
        idPasajero: selectedPasajeros.map(p => p.id) 
    };

    const accion = isEditingServicio ? 'editarServicio' : 'agregarServicio';
    const res = await enviarPeticion({ accion, servicio: payload });
    
    if (res.exito) {
        setShowModalServicio(false);
        cargarDatosGenerales();
        showAlert("Éxito", res.mensaje, "success");
    } else {
        showAlert("Error", res.error);
    }
    setProcesando(false);
  };

  // --- ELIMINACIÓN INTELIGENTE ---
  const solicitarEliminarGrupo = (idServicio) => {
      setConfirmConfig({
          show: true,
          message: "¿Deseas eliminar este servicio completo y a todos sus pasajeros?",
          onConfirm: () => ejecutarEliminar(idServicio, null) 
      });
  };

  const solicitarEliminarPasajero = (idServicio, idPasajero, nombre) => {
      setConfirmConfig({
          show: true,
          message: `¿Eliminar solo a ${nombre} de este servicio?`,
          onConfirm: () => ejecutarEliminar(idServicio, idPasajero) 
      });
  };

  const ejecutarEliminar = async (idServicio, idPasajero) => {
      setProcesando(true);
      const res = await enviarPeticion({ accion: 'eliminarServicio', idServicio, idPasajero });
      if (res.exito) {
          setConfirmConfig({ ...confirmConfig, show: false });
          cargarDatosGenerales();
          showAlert("Eliminado", "Registro eliminado correctamente.", "success");
      } else {
          showAlert("Error", res.error);
      }
      setProcesando(false);
  };

  // --- LOGICA FINANZAS ---
  const handleGuardarTransaccion = async (e) => {
    e.preventDefault();
    setProcesando(true);
    const transaccionEnviar = { 
        ...formFinanza, 
        idViaje: id, 
        idCliente: viajeInfo.idCliente,
        idServicio: selectedServiciosFinanza 
    };
    const respuesta = await enviarPeticion({ accion: 'registrarTransaccion', transaccion: transaccionEnviar });
    if (respuesta.exito) { 
        setShowModalFinanzas(false); 
        setFormFinanza(formFinanzaInicial); 
        setSelectedServiciosFinanza([]); 
        cargarDatosFinancieros(); 
        showAlert("Registrado", respuesta.mensaje, "success"); 
    } 
    else { showAlert("Error", respuesta.error); }
    setProcesando(false);
  };

  // --- UTILS ---
  const getIconoCategoria = (catId) => { 
      const n = listaCategorias.find(c => c.id == catId)?.nombre?.toLowerCase() || '';
      if(n.includes('vuelo')) return <Plane size={20}/>; if(n.includes('hotel')) return <Hotel size={20}/>; if(n.includes('auto')) return <Car size={20}/>; return <Ticket size={20}/>;
  };
  const getNombreCategoria = (id) => listaCategorias.find(c => c.id == id)?.nombre || 'Servicio';
  const getNombreEstatus = (id) => listaEstatus.find(e => e.id == id)?.nombre || id;

  // Lógica para el modal de finanzas (selección)
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

  // Helper para mostrar nombres pasajeros en lista finanzas
  const getPasajerosStr = (ids) => {
      const nombres = [];
      ids.forEach(id => {
          const s = servicios.find(srv => srv.idPasajero == id);
          if(s && !nombres.includes(s.nombrePasajero)) nombres.push(s.nombrePasajero);
      });
      return nombres.join(", ");
  };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/admin/viajes')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', fontWeight: '700', marginBottom: '15px' }}><ArrowLeft size={16} /> Volver</button>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary-dark)', fontWeight: '800' }}>{viajeInfo ? viajeInfo.nombre : 'Cargando...'}</h1>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0' }}>
        <button onClick={() => setActiveTab('itinerario')} style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: activeTab === 'itinerario' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'itinerario' ? 'var(--primary)' : '#64748b', fontWeight: '800', cursor: 'pointer' }}>Itinerario</button>
        <button onClick={() => setActiveTab('finanzas')} style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: activeTab === 'finanzas' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'finanzas' ? 'var(--primary)' : '#64748b', fontWeight: '800', cursor: 'pointer' }}>Finanzas P&L</button>
      </div>

      {activeTab === 'itinerario' && (
        <div className="fade-in">
            <div style={{ textAlign: 'right', marginBottom: '20px' }}><button onClick={abrirModalCrear} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px' }}><Plus size={16} /> Agregar Servicio</button></div>
            
            <div style={{ display: 'grid', gap: '20px' }}>
                {serviciosAgrupados.length === 0 && <div style={{padding:'40px', textAlign:'center', color:'#94a3b8', border:'2px dashed #e2e8f0', borderRadius:'20px'}}>No hay servicios registrados.</div>}
                
                {serviciosAgrupados.map((grupo) => {
                    const s = grupo.servicioBase;
                    return (
                        <div key={grupo.idServicio} className="dashboard-card" style={{ padding: '20px', flexDirection: 'column' }}>
                            {/* ENCABEZADO DE TARJETA */}
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'15px'}}>
                                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                    <div style={{ background: '#f8fafc', color: 'var(--primary)', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>{getIconoCategoria(s.categoriaId)}</div>
                                    <div>
                                        <h4 style={{ margin: '0', fontSize: '1.1rem', color: 'var(--text-main)' }}>{getNombreCategoria(s.categoriaId)}</h4>
                                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{s.destino}</div>
                                    </div>
                                </div>
                                <div style={{display:'flex', gap:'8px'}}>
                                    <button onClick={() => abrirModalEditar(grupo)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}><Pencil size={16} color="#64748b"/></button>
                                    <button onClick={() => solicitarEliminarGrupo(grupo.idServicio)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #fee2e2', background:'#fef2f2', cursor: 'pointer' }}><Trash2 size={16} color="#ef4444"/></button>
                                </div>
                            </div>

                            {/* DETALLES COMUNES */}
                            <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#475569', marginBottom: '15px', flexWrap:'wrap' }}>
                                <div style={{display:'flex', alignItems:'center', gap:'6px'}}><CheckCircle size={14}/> {getNombreEstatus(s.estatusId)}</div>
                                <div style={{display:'flex', alignItems:'center', gap:'6px'}}><Tag size={14}/> {s.fechaInicio}</div>
                                {s.clave && <div style={{display:'flex', alignItems:'center', gap:'6px'}}><Tag size={14}/> Ref: {s.clave}</div>}
                            </div>

                            {/* MINI DASHBOARD FINANCIERO POR SERVICIO */}
                            <div style={{background: '#f0fdf4', padding: '8px 15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', border: '1px solid #bbf7d0', color: '#166534'}}>
                                <div><strong>Costo Total:</strong> ${grupo.totalCostoGrupo.toLocaleString()}</div>
                                <div><strong>Venta Total:</strong> ${grupo.totalVentaGrupo.toLocaleString()}</div>
                                <div><strong>Utilidad:</strong> ${(grupo.totalVentaGrupo - grupo.totalCostoGrupo).toLocaleString()}</div>
                            </div>

                            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{fontSize:'0.75rem', fontWeight:'700', color:'#94a3b8', marginBottom:'8px', textTransform:'uppercase'}}>Pasajeros ({grupo.count})</div>
                                <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                    {grupo.pasajeros.map(p => (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', paddingBottom: '4px', borderBottom: '1px solid #eee' }}>
                                            <div style={{display:'flex', alignItems:'center', gap:'8px'}}><User size={14} color="var(--primary)"/> {p.nombre}</div>
                                            <button 
                                                onClick={() => solicitarEliminarPasajero(grupo.idServicio, p.id, p.nombre)} 
                                                style={{ border:'none', background:'transparent', cursor:'pointer', color:'#94a3b8', padding:'4px' }} 
                                                title="Eliminar solo este pasajero"
                                            >
                                                <X size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {activeTab === 'finanzas' && (
        <div className="fade-in">
            {resumenFinanciero ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    {/* TARJETA P&L */}
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><PieChart size={18}/> Estado de Resultados</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Venta Total (Presupuesto)</span><span style={{fontWeight:'700'}}>${resumenFinanciero.ventaTotal.toLocaleString()}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#ef4444' }}><span>Costo Total (Presupuesto)</span><span style={{fontWeight:'700'}}>-${resumenFinanciero.costoTotal.toLocaleString()}</span></div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)' }}><span>Utilidad Proyectada</span><span>${resumenFinanciero.utilidadTeorica.toLocaleString()}</span></div>
                    </div>

                    {/* TARJETA CUENTAS POR COBRAR */}
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18} color="#16a34a"/> Cuentas por Cobrar</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Total a Cobrar</span><span style={{fontWeight:'700'}}>${resumenFinanciero.ventaTotal.toLocaleString()}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#16a34a' }}><span>Recibido (Bancos)</span><span style={{fontWeight:'700'}}>${resumenFinanciero.cobradoCliente.toLocaleString()}</span></div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '800', color: resumenFinanciero.porCobrar > 0 ? '#f59e0b' : '#10b981' }}><span>Saldo Pendiente</span><span>${resumenFinanciero.porCobrar.toLocaleString()}</span></div>
                    </div>

                    {/* TARJETA CUENTAS POR PAGAR */}
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingDown size={18} color="#ef4444"/> Cuentas por Pagar</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Total a Pagar</span><span style={{fontWeight:'700'}}>${resumenFinanciero.costoTotal.toLocaleString()}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#ef4444' }}><span>Pagado (Bancos)</span><span style={{fontWeight:'700'}}>${resumenFinanciero.pagadoProveedor.toLocaleString()}</span></div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '800', color: resumenFinanciero.porPagar > 0 ? '#ef4444' : '#10b981' }}><span>Deuda Proveedores</span><span>${resumenFinanciero.porPagar.toLocaleString()}</span></div>
                    </div>
                </div>
            ) : <div style={{textAlign:'center', padding:'20px'}}>Cargando resumen...</div>}

            <div style={{ textAlign: 'right', marginBottom: '20px' }}><button onClick={() => { setShowModalFinanzas(true); setSelectedServiciosFinanza([]); }} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px', fontSize: '0.9rem', background: '#0f172a' }}><DollarSign size={16} /> Nueva Transacción</button></div>
            
            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}><tr><th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Fecha</th><th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Concepto</th><th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Tipo</th><th style={{ padding: '15px', textAlign: 'right', color: '#64748b' }}>Monto</th></tr></thead>
                    <tbody>
                        {transacciones.length === 0 ? (<tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No hay movimientos registrados</td></tr>) : (transacciones.map((t, i) => (<tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '15px' }}>{t.fecha}</td><td style={{ padding: '15px', fontWeight: '600' }}>{t.concepto}</td><td style={{ padding: '15px' }}><span style={{ background: t.tipoId == 1 ? '#ecfdf5' : '#fef2f2', color: t.tipoId == 1 ? '#16a34a' : '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700' }}>{t.tipoId == 1 ? 'Ingreso' : 'Egreso'}</span></td><td style={{ padding: '15px', textAlign: 'right', fontWeight: '700', color: t.tipoId == 1 ? '#16a34a' : '#ef4444' }}>{t.tipoId == 2 ? '-' : '+'}${t.monto}</td></tr>)))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* MODAL SERVICIO (MULTI-PASAJERO + FINANZAS) */}
      {showModalServicio && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, maxWidth:'650px'}}> 
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{isEditingServicio ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                <button onClick={() => setShowModalServicio(false)} style={closeBtnStyle}><X size={18}/></button>
            </div>
            
            {/* TRUCO: Padding normal arriba, y un DIV vacío abajo como espaciador real */}
            <div style={{ padding: '24px' }}>
                <form onSubmit={handleGuardarServicio} style={{ display: 'grid', gap: '15px' }}>
                    
                    {/* SELECCIÓN DE PASAJEROS */}
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label style={{...labelStyle, color:'var(--primary-dark)', display:'flex', justifyContent:'space-between'}}><span>Pasajeros</span></label>
                        {!isEditingServicio ? (
                            <>
                                <div style={{marginBottom:'10px'}}><SearchableSelect options={pasajeros.filter(p => !selectedPasajeros.some(sel => sel.id === p.id))} value="" onChange={(val) => { const pas = pasajeros.find(p=>p.id==val); if(pas) setSelectedPasajeros([...selectedPasajeros, {id:pas.id, nombre:pas.nombre}]); }} placeholder="+ Agregar pasajero..." /></div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{selectedPasajeros.map(p => (<div key={p.id} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '15px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>{p.nombre} <X size={14} style={{cursor:'pointer'}} onClick={() => setSelectedPasajeros(selectedPasajeros.filter(x => x.id !== p.id))} /></div>))}</div>
                            </>
                        ) : (<div style={{fontSize:'0.9rem', color:'#64748b'}}>{selectedPasajeros.map(p => p.nombre).join(', ')}</div>)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div><label style={labelStyle}>Categoría</label><select value={formServicio.categoria} onChange={e => setFormServicio({...formServicio, categoria: e.target.value})} style={inputStyle}>{listaCategorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                        <div><label style={labelStyle}>Estatus</label><select value={formServicio.estatus} onChange={e => setFormServicio({...formServicio, estatus: e.target.value})} style={inputStyle}>{listaEstatus.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                        <div><label style={labelStyle}>Destino / Detalle</label><input required type="text" value={formServicio.destino} onChange={e=>setFormServicio({...formServicio, destino:e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Clave (Opcional)</label><input type="text" value={formServicio.clave} onChange={e=>setFormServicio({...formServicio, clave:e.target.value})} style={inputStyle} /></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div><label style={labelStyle}>Inicio</label><input type="datetime-local" value={formServicio.fechaInicio} onChange={e=>setFormServicio({...formServicio, fechaInicio:e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Fin</label><input type="datetime-local" value={formServicio.fechaFin} onChange={e=>setFormServicio({...formServicio, fechaFin:e.target.value})} style={inputStyle} /></div>
                    </div>

                    {/* SECCIÓN FINANCIERA */}
                    <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '12px', border: '1px dashed #86efac' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#15803d', fontWeight: '800', fontSize: '0.9rem' }}><DollarSign size={16}/> Configuración Financiera (Por Persona)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                            <div><label style={labelStyle}>Costo (Lo que pagas)</label><input type="number" step="0.01" value={formServicio.costoProveedor} onChange={e=>setFormServicio({...formServicio, costoProveedor:e.target.value})} style={inputStyle} placeholder="0.00"/></div>
                            <div><label style={labelStyle}>Precio Venta (Lo que cobras)</label><input type="number" step="0.01" value={formServicio.precioVenta} onChange={e=>setFormServicio({...formServicio, precioVenta:e.target.value})} style={inputStyle} placeholder="0.00"/></div>
                        </div>
                        <div style={{ position: 'relative', zIndex: 50 }}> {/* Z-INDEX ALTO PARA EVITAR CORTE */}
                            <label style={labelStyle}>Proveedor del Servicio</label>
                            <SearchableSelect options={listaProveedores} value={formServicio.idProveedor} onChange={(val) => setFormServicio({...formServicio, idProveedor: val})} placeholder="Seleccionar Proveedor..." />
                        </div>
                        {formServicio.costoProveedor && formServicio.precioVenta && (
                            <div style={{marginTop:'10px', textAlign:'right', fontSize:'0.85rem', color: (formServicio.precioVenta - formServicio.costoProveedor) >= 0 ? '#15803d' : '#ef4444'}}>
                                <strong>Utilidad Unitaria:</strong> ${(formServicio.precioVenta - formServicio.costoProveedor).toLocaleString()}
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar'}</button>
                </form>
                
                {/* ESPACIADOR INVISIBLE PARA SCROLL */}
                <div style={{ height: '350px' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSACCION */}
      {showModalFinanzas && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, overflow:'visible'}}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}><h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Registrar Movimiento</h2><button onClick={() => setShowModalFinanzas(false)} style={closeBtnStyle}><X size={18}/></button></div>
            <div style={{ padding: '24px' }}>
                <form onSubmit={handleGuardarTransaccion} style={{ display: 'grid', gap: '15px' }}>
                    <div style={{background:'#f1f5f9', padding:'10px', borderRadius:'10px', display:'flex', gap:'10px'}}><label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formFinanza.tipo=='1'?'white':'transparent', fontWeight:'700', boxShadow: formFinanza.tipo=='1'?'0 2px 5px rgba(0,0,0,0.05)':''}}><input type="radio" name="tipo" value="1" checked={formFinanza.tipo=='1'} onChange={e=>setFormFinanza({...formFinanza, tipo: e.target.value})} style={{display:'none'}}/> Ingreso</label><label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formFinanza.tipo=='2'?'white':'transparent', fontWeight:'700', boxShadow: formFinanza.tipo=='2'?'0 2px 5px rgba(0,0,0,0.05)':''}}><input type="radio" name="tipo" value="2" checked={formFinanza.tipo=='2'} onChange={e=>setFormFinanza({...formFinanza, tipo: e.target.value})} style={{display:'none'}}/> Egreso</label></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}><div><label style={labelStyle}>Monto Total</label><input required type="number" step="0.01" value={formFinanza.monto} onChange={e=>setFormFinanza({...formFinanza, monto:e.target.value})} style={inputStyle} placeholder="0.00" /></div><div><label style={labelStyle}>Moneda</label><select value={formFinanza.moneda} onChange={e=>setFormFinanza({...formFinanza, moneda:e.target.value})} style={inputStyle}>{listaMonedas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div></div>
                    <label style={labelStyle}>Concepto</label><input required type="text" value={formFinanza.concepto} onChange={e=>setFormFinanza({...formFinanza, concepto:e.target.value})} style={inputStyle} placeholder="Ej. Pago de Vuelo" />
                    <label style={labelStyle}>Forma de Pago</label><select value={formFinanza.formaPago} onChange={e=>setFormFinanza({...formFinanza, formaPago:e.target.value})} style={inputStyle}>{listaFormasPago.map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
                    {formFinanza.tipo == '2' && (<div><label style={labelStyle}>Proveedor</label><SearchableSelect options={listaProveedores} value={formFinanza.idProveedor} onChange={(val) => setFormFinanza({...formFinanza, idProveedor: val})} placeholder="Buscar Proveedor..." /></div>)}
                    
                    <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:'15px' }}>
                        <label style={{...labelStyle, color:'var(--primary)', marginBottom:'10px'}}>Asociar a Servicios (El costo se dividirá)</label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                            {serviciosAgrupados.map(grupo => {
                                    const areAllSelected = grupo.pasajeros.map(p=>p.id).every(id => selectedServiciosFinanza.includes(id)); 
                                    const isSelected = selectedServiciosFinanza.includes(grupo.idServicio); 
                                    
                                    return (
                                        <div 
                                            key={grupo.idServicio} 
                                            onClick={() => toggleGrupoServicios([grupo.idServicio])}
                                            style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: isSelected ? '#eff6ff' : 'transparent' }}
                                        >
                                            <div style={{color: isSelected ? 'var(--primary)' : '#cbd5e1'}}>{isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}</div>
                                            <div style={{flex:1}}>
                                                <div style={{fontSize:'0.85rem', fontWeight:'600', color: isSelected ? 'var(--primary-dark)' : '#334155'}}>{getNombreCategoria(grupo.servicioBase.categoriaId)} - {grupo.servicioBase.destino}</div>
                                                <div style={{fontSize:'0.75rem', color:'#64748b'}}>Pasajeros: {grupo.count}</div>
                                            </div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={procesando}>{procesando ? '...' : 'Registrar'}</button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACION Y ALERTAS */}
      {confirmConfig.show && (<div style={modalOverlayStyle}><div style={{...modalContentStyle, maxWidth:'400px', textAlign:'center', padding:'30px'}}><AlertCircle size={40} color="#ef4444" style={{margin:'0 auto 10px'}}/><h3 style={{margin:'0 0 10px'}}>Confirmar acción</h3><p style={{color:'#64748b', marginBottom:'20px'}}>{confirmConfig.message}</p><div style={{display:'flex', gap:'10px'}}><button onClick={()=>setConfirmConfig({...confirmConfig, show:false})} style={{flex:1, padding:'10px', background:'white', border:'1px solid #ccc', borderRadius:'20px'}}>Cancelar</button><button onClick={confirmConfig.onConfirm} style={{flex:1, padding:'10px', background:'#ef4444', color:'white', border:'none', borderRadius:'20px'}}>Confirmar</button></div></div></div>)}
      {customAlert.show && (<div style={modalOverlayStyle}><div style={{...modalContentStyle, maxWidth:'400px', padding:'30px', textAlign:'center'}}><h3 style={{margin:0}}>{customAlert.title}</h3><p>{customAlert.msg}</p><button onClick={closeAlert} className="btn-primary" style={{marginTop:'15px'}}>OK</button></div></div>)}
    </div>
  );
}

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContentStyle = { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };