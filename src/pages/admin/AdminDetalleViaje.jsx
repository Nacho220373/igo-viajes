import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enviarPeticion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
// IMPORTAMOS COMPONENTE DE BÚSQUEDA
import SearchableSelect from '../../components/SearchableSelect';
import { ArrowLeft, Plus, MapPin, User, Tag, Plane, Hotel, Car, Utensils, Ticket, X, Ship, Briefcase, Pencil, Trash2, AlertTriangle, DollarSign, Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Mail, Loader, Star, MessageSquare } from 'lucide-react';

export default function AdminDetalleViaje() {
  const { id } = useParams(); 
  const { user } = useAuth();
  const navigate = useNavigate();

  // === ESTADOS GLOBALES ===
  const [activeTab, setActiveTab] = useState('itinerario'); 
  const [viajeInfo, setViajeInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // === ESTADOS ITINERARIO ===
  const [servicios, setServicios] = useState([]);
  const [pasajeros, setPasajeros] = useState([]); 
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaEstatus, setListaEstatus] = useState([]);
  
  // Estados UI Itinerario
  const [showModalServicio, setShowModalServicio] = useState(false);
  const [isEditingServicio, setIsEditingServicio] = useState(false);
  const [currentIdServicio, setCurrentIdServicio] = useState(null);
  
  // Estados UI Confirmación (Eliminar)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // === ESTADOS FINANZAS ===
  const [transacciones, setTransacciones] = useState([]);
  const [listaTiposFin, setListaTiposFin] = useState([]); 
  const [listaFormasPago, setListaFormasPago] = useState([]);
  const [listaMonedas, setListaMonedas] = useState([]);
  const [listaProveedores, setListaProveedores] = useState([]);
  
  // ESTADO SALDO
  const [saldoCliente, setSaldoCliente] = useState(0);
  
  // Estados UI Finanzas
  const [showModalFinanzas, setShowModalFinanzas] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  // === ESTADO ALERTA PERSONALIZADA ===
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', msg: '', type: 'error' });

  // === FORMULARIOS ===
  const formServicioInicial = { idPasajero: '', categoria: '', destino: '', clave: '', fechaInicio: '', fechaFin: '', estatus: '' };
  const [formServicio, setFormServicio] = useState(formServicioInicial);

  const formFinanzaInicial = { tipo: '1', formaPago: '', monto: '', moneda: '1', concepto: '', idProveedor: '', idServicio: '', fecha: new Date().toISOString().split('T')[0] };
  const [formFinanza, setFormFinanza] = useState(formFinanzaInicial);

  useEffect(() => {
    cargarDatosGenerales();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'finanzas') cargarDatosFinancieros();
  }, [activeTab]);

  const cargarDatosGenerales = async () => {
    setLoading(true);
    try {
      const resListas = await enviarPeticion({ accion: 'obtenerListas' });
      if (resListas.exito && resListas.listas) {
        setListaCategorias(resListas.listas.categorias || []);
        setListaEstatus(resListas.listas.estatus || []);
      }

      const resInfo = await enviarPeticion({ accion: 'obtenerInfoViaje', idViaje: id });
      if (resInfo.exito) setViajeInfo(resInfo.viaje);
      
      const resServicios = await enviarPeticion({ accion: 'obtenerDetallesViaje', idViaje: id });
      if (resServicios.exito) setServicios(resServicios.datos);

      const resPasajeros = await enviarPeticion({ accion: 'obtenerPasajeros', rol: user.rol });
      if (resPasajeros.exito && resInfo.exito) {
          // Filtrar pasajeros asociados al cliente de este viaje
          const pasajerosCliente = resPasajeros.datos.filter(p => p.idCliente == resInfo.viaje.idCliente);
          // Normalizamos para SearchableSelect (necesita propiedad 'nombre')
          const pasajerosNormalizados = pasajerosCliente.map(p => ({
              ...p,
              nombre: `${p.nombre} ${p.apellidoP}` // Nombre completo para la búsqueda
          }));
          setPasajeros(pasajerosNormalizados);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const cargarDatosFinancieros = async () => {
    try {
        const [resListasFin, resProv, resTrans] = await Promise.all([
            enviarPeticion({ accion: 'obtenerListasFinancieras' }),
            enviarPeticion({ accion: 'obtenerProveedores' }),
            enviarPeticion({ accion: 'obtenerFinanzasViaje', idViaje: id })
        ]);

        if (resListasFin.exito) {
            setListaTiposFin(resListasFin.listas.tipos);
            setListaFormasPago(resListasFin.listas.formasPago);
            setListaMonedas(resListasFin.listas.monedas);
        }
        if (resProv.exito) setListaProveedores(resProv.datos);
        if (resTrans.exito) setTransacciones(resTrans.datos);

        if (viajeInfo?.idCliente) {
            const resSaldo = await enviarPeticion({ accion: 'obtenerSaldoCliente', idCliente: viajeInfo.idCliente });
            if (resSaldo.exito) setSaldoCliente(resSaldo.saldo);
        }

    } catch (error) { console.error(error); }
  };

  const enviarItinerario = async () => {
    if (!window.confirm("¿Seguro que deseas generar y enviar el PDF del itinerario al cliente?")) return;
    
    setEnviandoCorreo(true);
    try {
        const respuesta = await enviarPeticion({ accion: 'enviarPDFItinerario', idViaje: id });
        if (respuesta.exito) {
            showAlert("¡Enviado!", respuesta.mensaje, "success");
        } else {
            showAlert("Error", respuesta.error, "error");
        }
    } catch (error) {
        showAlert("Error", "No se pudo conectar con el servidor", "error");
    } finally {
        setEnviandoCorreo(false);
    }
  };

  const showAlert = (title, msg, type = 'error') => {
    setCustomAlert({ show: true, title, msg, type });
  };

  const closeAlert = () => {
    setCustomAlert({ ...customAlert, show: false });
  };

  // --- LÓGICA SERVICIOS ---
  const abrirModalCrearServicio = () => {
    setIsEditingServicio(false); setCurrentIdServicio(null);
    setFormServicio({...formServicioInicial, categoria: listaCategorias[0]?.id || '1', estatus: listaEstatus[0]?.id || '1'});
    setShowModalServicio(true);
  };

  const handleEditarServicio = (s) => {
    setIsEditingServicio(true); setCurrentIdServicio(s.idServicio);
    const convertToInputDate = (dateStr) => { 
        if(!dateStr) return "";
        try {
            const [datePart, timePart] = dateStr.split(' ');
            const [day, month, year] = datePart.split('/');
            const [hour, minute] = timePart ? timePart.split(':') : ['00', '00'];
            const p = (n) => n.toString().padStart(2, '0');
            return `${year}-${p(month)}-${p(day)}T${p(hour)}:${p(minute)}`;
        } catch(e) { return ""; }
    };
    setFormServicio({
        idPasajero: s.idPasajero, categoria: s.categoriaId, destino: s.destino, clave: s.clave,
        fechaInicio: convertToInputDate(s.fechaInicio), fechaFin: convertToInputDate(s.fechaFin), estatus: s.estatusId
    });
    setShowModalServicio(true);
  };

  const solicitarEliminarServicio = (id) => { setDeleteId(id); setShowDeleteConfirm(true); };
  
  const confirmarEliminarServicio = async () => {
    setProcesando(true);
    const respuesta = await enviarPeticion({ accion: 'eliminarServicio', idServicio: deleteId });
    if (respuesta.exito) { 
        setShowDeleteConfirm(false); 
        setDeleteId(null); 
        cargarDatosGenerales();
        showAlert("Eliminado", "El servicio ha sido eliminado correctamente.", "success");
    } else {
        showAlert("Error", "No se pudo eliminar el servicio: " + respuesta.error);
    }
    setProcesando(false);
  };

  const handleGuardarServicio = async (e) => {
    e.preventDefault();
    if (!formServicio.idPasajero) return showAlert("Falta Información", "Por favor selecciona un pasajero.", "warning");
    
    setProcesando(true);
    const servicioEnviar = { ...formServicio, idViaje: id, idCliente: viajeInfo.idCliente, idServicio: currentIdServicio };
    const accion = isEditingServicio ? 'editarServicio' : 'agregarServicio';
    const respuesta = await enviarPeticion({ accion, servicio: servicioEnviar });
    if (respuesta.exito) { 
        setShowModalServicio(false); 
        cargarDatosGenerales(); 
        showAlert("Guardado", "El servicio se guardó correctamente.", "success");
    } 
    else { showAlert("Error", respuesta.error); }
    setProcesando(false);
  };

  // --- LÓGICA FINANZAS ---
  const isServicioSaldado = (idServicio) => {
    const movs = transacciones.filter(t => t.idServicio == idServicio);
    if (movs.length === 0) return false; 

    let balance = 0;
    movs.forEach(t => {
        const monto = parseFloat(String(t.monto).replace(/[^0-9.-]+/g,"")) || 0;
        if (t.tipoId == 1) balance += monto; 
        if (t.tipoId == 2) balance -= monto; 
    });
    return Math.abs(balance) < 0.01; 
  };

  const handleGuardarTransaccion = async (e) => {
    e.preventDefault();
    if (formFinanza.formaPago === '4' && formFinanza.tipo === '1') { 
        const montoOperacion = parseFloat(formFinanza.monto) || 0;
        if (montoOperacion > saldoCliente) {
            const faltante = montoOperacion - saldoCliente;
            showAlert(
                "Saldo Insuficiente", 
                `El cliente solo tiene disponible $${saldoCliente.toLocaleString()}.\nLe faltan $${faltante.toLocaleString()} para completar esta operación.`,
                "warning"
            );
            return; 
        }
    }

    setProcesando(true);
    const transaccionEnviar = { ...formFinanza, idViaje: id, idCliente: viajeInfo.idCliente };
    const respuesta = await enviarPeticion({ accion: 'registrarTransaccion', transaccion: transaccionEnviar });
    if (respuesta.exito) { 
        setShowModalFinanzas(false); 
        setFormFinanza(formFinanzaInicial); 
        cargarDatosFinancieros();
        showAlert("Registrado", "La transacción se registró correctamente.", "success");
    } 
    else { showAlert("Error", respuesta.error); }
    setProcesando(false);
  };

  const getIconoCategoria = (catId) => { 
    const catObj = listaCategorias.find(c => c.id == catId);
    const nombre = catObj ? catObj.nombre.toLowerCase() : '';
    if (nombre.includes('vuelo')) return <Plane size={20} />;
    if (nombre.includes('hospedaje') || nombre.includes('hotel')) return <Hotel size={20} />;
    return <Tag size={20} />;
  };
  const getNombreCategoria = (id) => listaCategorias.find(c => c.id == id)?.nombre || 'Servicio';
  const getNombreEstatus = (id) => listaEstatus.find(e => e.id == id)?.nombre || id;
  const getColorEstatus = (nombre) => { 
      const n = nombre ? nombre.toLowerCase() : '';
      if(n.includes('cotiz')) return { bg: '#eff6ff', txt: '#2563eb' };
      if(n.includes('reserv')) return { bg: '#ecfdf5', txt: '#10b981' };
      return { bg: '#f1f5f9', txt: '#475569' };
  };

  const calcularTotales = () => {
    let ingresos = 0;
    let egresos = 0;
    transacciones.forEach(t => {
        const montoLimpio = parseFloat(String(t.monto).replace(/[^0-9.-]+/g,"")) || 0;
        if (t.tipoId == 1) ingresos += montoLimpio;
        if (t.tipoId == 2) egresos += montoLimpio;
    });
    return { ingresos, egresos, utilidad: ingresos - egresos };
  };
  const totales = calcularTotales();

  return (
    <div className="dashboard-container">
      
      {/* HEADER */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/admin/viajes')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', fontWeight: '700', marginBottom: '15px' }}>
          <ArrowLeft size={16} /> Volver a Expedientes
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary-dark)', fontWeight: '800' }}>
              {viajeInfo ? viajeInfo.nombre : 'Cargando...'}
            </h1>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
              Expediente #{id} • {viajeInfo ? `Cliente ID: ${viajeInfo.idCliente}` : ''}
            </p>
          </div>

          {/* CALIFICACIÓN GENERAL DEL VIAJE (NUEVO) */}
          {viajeInfo && viajeInfo.calificacion && (
              <div style={{ background: '#fffbeb', padding: '10px 15px', borderRadius: '12px', border: '1px solid #fcd34d', display: 'flex', gap: '15px', alignItems: 'center', maxWidth: '400px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#b45309' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', fontSize: '1.2rem' }}>
                          {viajeInfo.calificacion} <Star size={20} fill="#b45309" strokeWidth={0}/>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Valoración</span>
                  </div>
                  {viajeInfo.comentarios && (
                      <div style={{ borderLeft: '1px solid #fcd34d', paddingLeft: '15px', color: '#92400e', fontSize: '0.9rem', fontStyle: 'italic' }}>
                          "{viajeInfo.comentarios}"
                      </div>
                  )}
              </div>
          )}
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
        <button 
            onClick={() => setActiveTab('itinerario')}
            style={{ 
                padding: '12px 24px', background: 'transparent', border: 'none', 
                borderBottom: activeTab === 'itinerario' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'itinerario' ? 'var(--primary)' : '#64748b',
                fontWeight: '800', fontSize: '1rem', cursor: 'pointer', marginBottom: '-2px'
            }}
        >
            Itinerario
        </button>
        <button 
            onClick={() => setActiveTab('finanzas')}
            style={{ 
                padding: '12px 24px', background: 'transparent', border: 'none', 
                borderBottom: activeTab === 'finanzas' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'finanzas' ? 'var(--primary)' : '#64748b',
                fontWeight: '800', fontSize: '1rem', cursor: 'pointer', marginBottom: '-2px'
            }}
        >
            Finanzas
        </button>
      </div>

      {/* --- CONTENIDO ITINERARIO --- */}
      {activeTab === 'itinerario' && (
        <>
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                <button onClick={abrirModalCrearServicio} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px', fontSize: '0.9rem' }}>
                    <Plus size={16} /> Agregar Servicio
                </button>
            </div>

            {loading ? <div style={{textAlign:'center', color:'#94a3b8'}}>Cargando...</div> : (
                <div style={{ display: 'grid', gap: '20px' }}>
                {servicios.length === 0 && <div style={{background:'white', padding:'40px', borderRadius:'20px', textAlign:'center', border:'2px dashed #e2e8f0', color:'#94a3b8'}}>Sin servicios.</div>}
                {servicios.map((s, idx) => {
                    const nombreCat = getNombreCategoria(s.categoriaId);
                    const nombreEst = getNombreEstatus(s.estatusId);
                    const estiloEst = getColorEstatus(nombreEst);
                    return (
                    <div key={idx} className="dashboard-card" style={{ padding: '20px', flexDirection: 'column' }}>
                        <div style={{display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap', width:'100%'}}>
                            <div style={{ background: '#f8fafc', color: 'var(--primary)', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>{getIconoCategoria(s.categoriaId)}</div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>{nombreCat}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem' }}><MapPin size={14} /> <span style={{fontWeight:'600'}}>{s.destino}</span></div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem' }}><User size={14} /> Pasajero: <span style={{color: 'var(--primary)', fontWeight:'600'}}>{s.nombrePasajero}</span></div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems:'center' }}>
                                <button onClick={() => handleEditarServicio(s)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}><Pencil size={18} color="#64748b"/></button>
                                <button onClick={() => solicitarEliminarServicio(s.idServicio)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #fee2e2', background:'#fef2f2', cursor: 'pointer' }}><Trash2 size={18} color="#ef4444"/></button>
                            </div>
                        </div>

                        {/* VISUALIZACIÓN DE CALIFICACIÓN DEL SERVICIO (NUEVO) */}
                        {s.calificacion && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fffbeb', padding: '4px 10px', borderRadius: '8px', color: '#b45309', fontWeight: '800', fontSize: '0.9rem' }}>
                                    {s.calificacion} <Star size={14} fill="#b45309" strokeWidth={0}/>
                                </div>
                                {s.comentarios && (
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', display:'flex', alignItems:'center', gap:'6px' }}>
                                        <MessageSquare size={14} style={{marginTop:'2px'}}/> "{s.comentarios}"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    );
                })}
                </div>
            )}
        </>
      )}

      {/* --- CONTENIDO FINANZAS --- */}
      {activeTab === 'finanzas' && (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#16a34a', marginBottom: '5px' }}><TrendingUp size={20}/> <span style={{fontWeight:'700'}}>Ingresos</span></div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>${totales.ingresos.toLocaleString()}</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626', marginBottom: '5px' }}><TrendingDown size={20}/> <span style={{fontWeight:'700'}}>Egresos</span></div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>${totales.egresos.toLocaleString()}</div>
                </div>
                <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '16px', border: '1px solid #bae6fd', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0284c7', marginBottom: '5px' }}><Wallet size={20}/> <span style={{fontWeight:'700'}}>Saldo a Favor (Cliente)</span></div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0369a1' }}>${saldoCliente.toLocaleString()}</div>
                </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                <button onClick={() => setShowModalFinanzas(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px', fontSize: '0.9rem', background: '#0f172a' }}>
                    <DollarSign size={16} /> Nueva Transacción
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Fecha</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Concepto</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Tipo</th>
                            <th style={{ padding: '15px', textAlign: 'right', color: '#64748b' }}>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transacciones.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No hay movimientos registrados</td></tr>
                        ) : (
                            transacciones.map((t, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px' }}>{t.fecha}</td>
                                    <td style={{ padding: '15px', fontWeight: '600' }}>{t.concepto}</td>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{ 
                                            background: t.tipoId == 1 ? '#ecfdf5' : '#fef2f2', 
                                            color: t.tipoId == 1 ? '#16a34a' : '#ef4444',
                                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700'
                                        }}>
                                            {t.tipoId == 1 ? 'Ingreso' : 'Egreso'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: '700', color: t.tipoId == 1 ? '#16a34a' : '#ef4444' }}>
                                        {t.tipoId == 2 ? '-' : '+'}${t.monto}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
      )}

      {/* MODAL NUEVO SERVICIO (CON BÚSQUEDA DE PASAJEROS) */}
      {showModalServicio && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, overflow:'visible'}}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{isEditingServicio ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                <button onClick={() => setShowModalServicio(false)} style={closeBtnStyle}><X size={18}/></button>
            </div>
            <div style={{ padding: '24px' }}>
                <form onSubmit={handleGuardarServicio} style={{ display: 'grid', gap: '15px' }}>
                    {/* CAMBIO: Usar SearchableSelect para Pasajeros */}
                    <label style={labelStyle}>Pasajero</label>
                    <SearchableSelect 
                        options={pasajeros}
                        value={formServicio.idPasajero}
                        onChange={(val) => setFormServicio({...formServicio, idPasajero: val})}
                        placeholder="Buscar Pasajero..."
                        required
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><label style={labelStyle}>Categoría</label><select value={formServicio.categoria} onChange={e => setFormServicio({...formServicio, categoria: e.target.value})} style={inputStyle}>{listaCategorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                        <div><label style={labelStyle}>Estatus</label><select value={formServicio.estatus} onChange={e => setFormServicio({...formServicio, estatus: e.target.value})} style={inputStyle}>{listaEstatus.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
                    </div>
                    <label style={labelStyle}>Destino</label><input required type="text" value={formServicio.destino} onChange={e=>setFormServicio({...formServicio, destino:e.target.value})} style={inputStyle} />
                    <label style={labelStyle}>Clave Reserva</label><input type="text" value={formServicio.clave} onChange={e=>setFormServicio({...formServicio, clave:e.target.value})} style={inputStyle} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><label style={labelStyle}>Inicio</label><input type="datetime-local" value={formServicio.fechaInicio} onChange={e=>setFormServicio({...formServicio, fechaInicio:e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Fin</label><input type="datetime-local" value={formServicio.fechaFin} onChange={e=>setFormServicio({...formServicio, fechaFin:e.target.value})} style={inputStyle} /></div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={procesando}>{procesando ? '...' : 'Guardar'}</button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA TRANSACCIÓN (CON BÚSQUEDA DE PROVEEDORES) */}
      {showModalFinanzas && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, overflow:'visible'}}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Registrar Movimiento</h2>
                <button onClick={() => setShowModalFinanzas(false)} style={closeBtnStyle}><X size={18}/></button>
            </div>
            <div style={{ padding: '24px' }}>
                <form onSubmit={handleGuardarTransaccion} style={{ display: 'grid', gap: '15px' }}>
                    <div style={{background:'#f1f5f9', padding:'10px', borderRadius:'10px', display:'flex', gap:'10px'}}>
                        <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formFinanza.tipo=='1'?'white':'transparent', fontWeight:'700', boxShadow: formFinanza.tipo=='1'?'0 2px 5px rgba(0,0,0,0.05)':''}}>
                            <input type="radio" name="tipo" value="1" checked={formFinanza.tipo=='1'} onChange={e=>setFormFinanza({...formFinanza, tipo: e.target.value})} style={{display:'none'}}/> Ingreso (Cobro)
                        </label>
                        <label style={{flex:1, cursor:'pointer', textAlign:'center', padding:'8px', borderRadius:'8px', background: formFinanza.tipo=='2'?'white':'transparent', fontWeight:'700', boxShadow: formFinanza.tipo=='2'?'0 2px 5px rgba(0,0,0,0.05)':''}}>
                            <input type="radio" name="tipo" value="2" checked={formFinanza.tipo=='2'} onChange={e=>setFormFinanza({...formFinanza, tipo: e.target.value})} style={{display:'none'}}/> Egreso (Gasto)
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><label style={labelStyle}>Monto</label><input required type="number" step="0.01" value={formFinanza.monto} onChange={e=>setFormFinanza({...formFinanza, monto:e.target.value})} style={inputStyle} placeholder="0.00" /></div>
                        <div><label style={labelStyle}>Moneda</label><select value={formFinanza.moneda} onChange={e=>setFormFinanza({...formFinanza, moneda:e.target.value})} style={inputStyle}>
                            <option value="">-- Seleccionar --</option>
                            {listaMonedas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select></div>
                    </div>

                    <label style={labelStyle}>Concepto</label>
                    <input required type="text" value={formFinanza.concepto} onChange={e=>setFormFinanza({...formFinanza, concepto:e.target.value})} style={inputStyle} placeholder="Ej. Pago de Vuelo" />

                    <label style={labelStyle}>Forma de Pago</label>
                    <select value={formFinanza.formaPago} onChange={e=>setFormFinanza({...formFinanza, formaPago:e.target.value})} style={inputStyle}>
                        <option value="">-- Seleccionar --</option>
                        {listaFormasPago.map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>

                    {formFinanza.tipo == '2' && (
                        <div>
                            {/* CAMBIO: Usar SearchableSelect para Proveedores */}
                            <label style={labelStyle}>Proveedor</label>
                            <SearchableSelect 
                                options={listaProveedores}
                                value={formFinanza.idProveedor}
                                onChange={(val) => setFormFinanza({...formFinanza, idProveedor: val})}
                                placeholder="Buscar Proveedor..."
                            />
                        </div>
                    )}

                    <div>
                        <label style={labelStyle}>Asociar a Servicio (Opcional)</label>
                        <select value={formFinanza.idServicio} onChange={e=>setFormFinanza({...formFinanza, idServicio:e.target.value})} style={inputStyle}>
                            <option value="">-- General del Viaje --</option>
                            {servicios
                                .filter(s => !isServicioSaldado(s.idServicio))
                                .map(s => {
                                    const nomCat = listaCategorias.find(c=>c.id==s.categoriaId)?.nombre || '';
                                    return <option key={s.idServicio} value={s.idServicio}>{nomCat} - {s.destino}</option>
                                })
                            }
                        </select>
                    </div>

                    <button type="submit" className="btn-primary" disabled={procesando}>{procesando ? '...' : 'Registrar'}</button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALERTA PERSONALIZADA */}
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
            <p style={{ margin: '0 0 25px 0', color: '#64748b', fontSize: '1rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {customAlert.msg}
            </p>
            <button 
                onClick={closeAlert} 
                className="btn-primary" 
                style={{ width: '100%', background: customAlert.type === 'warning' ? '#f59e0b' : (customAlert.type === 'success' ? '#10b981' : '#ef4444'), border: 'none' }}
            >
                Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN ELIMINAR */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, maxWidth:'400px', textAlign:'center', padding:'30px', maxHeight:'auto', overflowY:'visible'}}>
            <div style={{ background: '#fef2f2', color: '#ef4444', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '800' }}>¿Eliminar Servicio?</h3>
            <p style={{ margin: '0 0 25px 0', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>
              Esta acción borrará el servicio del itinerario permanentemente. ¿Estás seguro?
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '50px', fontSize: '1rem', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEliminarServicio} 
                disabled={procesando}
                style={{ flex: 1, padding: '12px', border: 'none', background: '#dc2626', borderRadius: '50px', fontSize: '1rem', fontWeight: '700', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
              >
                {procesando ? 'Borrando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Estilos
const modalOverlayStyle = { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', 
    zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' 
};
const modalContentStyle = { 
    background: 'white', borderRadius: '24px', width: '100%', 
    maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex', flexDirection: 'column'
};
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };