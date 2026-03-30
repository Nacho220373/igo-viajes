import { useState, useEffect } from 'react';
import { enviarPeticion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import Loader from '../../components/Loader';
import SearchableSelect from '../../components/SearchableSelect';
import BulkUploader from '../../components/BulkUploader';
import AdminTour from '../../components/AdminTour';
import FirstTripWizard from '../../components/FirstTripWizard';
import { Plus, Search, Map, Calendar, ArrowLeft, X, LayoutGrid, LayoutList, Users, CheckSquare, Activity, Database, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminViajes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Estados
  const [viajes, setViajes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); 

  // Bulk Upload
  const [showModalBulk, setShowModalBulk] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', msg: '', type: 'info' });

  const showAlert = (title, msg, type = 'info') => setCustomAlert({ show: true, title, msg, type });

  // Formulario (ahora soporta multi-cliente)
  const formInicial = { nombre: '', tipo: '1', fechaInicio: '', fechaFin: '' };
  const [form, setForm] = useState(formInicial);
  const [selectedClientes, setSelectedClientes] = useState([]); // Array {id, nombre}

  // === TOUR ===
  const [runTour, setRunTour] = useState(false);
  const stepsViajes = [
      { target: '.tour-viajes-header', content: 'Bienvenido al Módulo de Viajes. Aquí administrarás todas tus aventuras y operaciones de destinos.', disableBeacon: true },
      { target: '.tour-btn-carga', content: 'Si vas a mudar datos desde un Excel, puedes usar nuestra Carga Masiva Inteligente tocando aquí.' },
      { target: '.tour-btn-nuevo', content: 'Si deseas dar de alta un nuevo viaje de forma manual para probar, este es el botón indicado.' },
      { target: '.tour-busqueda', content: 'Cuando tu cartera crezca, usa esta barra para rastrear clientes o viajes en milisegundos.' },
      { target: '.tour-lista-viajes', content: 'Aquí verás todo tu inventario en tiempo real. Dale clic a una reserva para registrar operaciones transaccionales o editar la compra.' }
  ];

  useEffect(() => {
    cargarDatos();
    if (location.state?.openCreate) {
        setShowModal(true);
        navigate(location.pathname, { replace: true, state: {} });
    }
    
    // Verificar si mostramos el Tour
    const tourSeen = localStorage.getItem('igo_admin_tour_viajes');
    if (!tourSeen) {
       setRunTour(true);
    }
  }, []);

  const cargarDatos = async () => {
    const cacheKey = 'igo_cache_admin_viajes';
    const cacheData = sessionStorage.getItem(cacheKey);

    if (cacheData) {
      const parsed = JSON.parse(cacheData);
      setViajes(parsed.viajes);
      setClientes(parsed.clientes);
      setLoading(false);
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [resViajes, resClientes] = await Promise.all([
        enviarPeticion({ accion: 'obtenerViajes', idUsuario: user.id, rol: user.rol }),
        enviarPeticion({ accion: 'obtenerClientes', rol: user.rol })
      ]);
      if (resViajes.exito) setViajes(resViajes.datos);
      if (resClientes.exito) setClientes(resClientes.datos);
      
      if (resViajes.exito && resClientes.exito) {
          sessionStorage.setItem(cacheKey, JSON.stringify({ viajes: resViajes.datos, clientes: resClientes.datos }));
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
      setIsRefreshing(false);
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (selectedClientes.length === 0) {
        showAlert("Atención", "Selecciona al menos un Cliente titular", "warning");
        return;
    }
    
    setProcesando(true);
    
    // Enviamos array de IDs de clientes
    const payload = {
        ...form,
        idCliente: selectedClientes.map(c => c.id)
    };

    const respuesta = await enviarPeticion({ accion: 'agregarViaje', viaje: payload });
    
    if (respuesta.exito) {
      setShowModal(false); 
      setForm(formInicial); 
      setSelectedClientes([]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
      // LOGIC FOR FIRST TRIP WIZARD
      try {
          const wizStr = localStorage.getItem('igo_first_trip_wizard');
          if (wizStr) {
              const wiz = JSON.parse(wizStr);
              if (wiz.active && wiz.step === 'viajes') {
                  const newId = respuesta.id || respuesta.idViaje || respuesta.id_viaje || respuesta.datos?.id;
                  if (newId) {
                      wiz.idViaje = newId;
                      wiz.step = 'servicios'; // Auto advance!
                      localStorage.setItem('igo_first_trip_wizard', JSON.stringify(wiz));
                      navigate('/admin/viaje/' + newId);
                      return; // Stop further execution, let router handle it
                  } else {
                      // Fallback: we leave it waiting for user to click on the newly created trip
                  }
              }
          }
      } catch (err) { console.error("Error wizard", err); }
      
      const refresh = await enviarPeticion({ accion: 'obtenerViajes', idUsuario: user.id, rol: user.rol });
      if (refresh.exito) {
          setViajes(refresh.datos);
          // If wizard was missing ID, try to get the highest ID from the refreshed list (assuming UUIDs are sortable or just the last in array? Not safe. Let's just hope backend returns it).
      }
    } else { 
      showAlert("Error", "Error: " + respuesta.error, "error"); 
    }
    setProcesando(false);
  };

  // Función para agregar cliente a la lista
  const addCliente = (id) => {
      const cliente = clientes.find(c => c.id == id);
      if (cliente && !selectedClientes.some(sc => sc.id == id)) {
          setSelectedClientes([...selectedClientes, { id: cliente.id, nombre: cliente.nombre }]);
      }
  };

  const removeCliente = (id) => {
      setSelectedClientes(selectedClientes.filter(c => c.id !== id));
  };

  const handleUploadMasivo = async (parsedData, validationErrors) => {
    setIsUploading(true);
    const payload = { accion: 'procesarUploadMasivo', datos: parsedData, erroresIgnorados: validationErrors };
    try {
        const respuesta = await enviarPeticion(payload);
        if (respuesta.exito) {
            setShowModalBulk(false);
            cargarDatos();
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } else {
            showAlert("Error al procesar", respuesta.error, "error");
        }
    } catch (error) {
        showAlert("Error de red", "Verifica tu conexión a internet.", "error");
    } finally {
        setIsUploading(false);
    }
  };

  const filtrados = viajes.filter(v => v.nombre.toLowerCase().includes(busqueda.toLowerCase()) || v.destino.toLowerCase().includes(busqueda.toLowerCase()));

  const handleNuevoViaje = async () => {
      if (clientes.length === 0) {
          showAlert("Sistema Incompleto", "No puedes crear un viaje porque no tienes clientes registrados. Registra un cliente base primero en el módulo de Clientes.", "warning");
          return;
      }
      setProcesando(true);
      try {
          const res = await enviarPeticion({ accion: 'obtenerEstadisticasEntidades' });
          if (res.exito) {
              if (res.conteos.proveedores === 0 || res.conteos.pasajeros === 0) {
                  showAlert("Sistema Incompleto", "No puedes crear un viaje porque te falta registrar Proveedores o Pasajeros. Utiliza la Carga Masiva o los módulos para completar la información base.", "warning");
              } else {
                  setShowModal(true);
              }
          }
      } catch (error) {
          console.error(error);
          showAlert("Error de red", "No se pudo consultar los requisitos del sistema.", "error");
      } finally {
          setProcesando(false);
      }
  };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <button onClick={() => navigate('/')} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><ArrowLeft size={20} /></button>
             <div>
                <h1 className="tour-viajes-header" style={{ fontSize: '1.8rem', color: 'var(--primary-dark)', margin: 0, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  Viajes Activos
                  {isRefreshing && (
                    <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8 }}>
                      <Activity size={20} className="spin-animation" color="var(--primary)"/> <span style={{fontSize:'0.8rem'}}>Actualizando...</span>
                    </span>
                  )}
                </h1>
                <p style={{ color: '#64748b', margin: '0', fontSize: '0.9rem' }}>Gestión de aventuras activas</p>
             </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', gap:'4px' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '8px', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'grid' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='grid'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} style={{ padding: '8px', border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'list' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='list'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutList size={18}/></button>
            </div>
            <button onClick={() => setShowModalBulk(true)} className="btn-secondary tour-btn-carga" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600' }}><Database size={18} /> Carga Masiva</button>
            <button onClick={handleNuevoViaje} className="btn-primary tour-btn-nuevo" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px' }} disabled={procesando}>{procesando ? 'Espere...' : <><Plus size={18} /> Nuevo Viaje</>}</button>
        </div>
      </div>

      <div className="tour-busqueda" style={{ position: 'relative', marginBottom: '25px', maxWidth: '600px' }}><Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} /><input type="text" placeholder="Buscar viaje..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }} /></div>

      {loading ? <Loader message="Cargando viajes..." /> : (
        <div className="tour-lista-viajes" style={{ 
            display: viewMode === 'grid' ? 'grid' : 'flex', 
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'none', 
            flexDirection: viewMode === 'grid' ? 'row' : 'column',
            gap: '20px', 
            alignItems: viewMode === 'grid' ? 'start' : 'stretch' 
        }}>
          {filtrados.map((v, idx) => (
            <div key={idx} className="dashboard-card" style={{ 
                padding: '20px', 
                height: 'auto',
                display: 'flex',
                flexDirection: viewMode === 'list' ? 'row' : 'column',
                alignItems: viewMode === 'list' ? 'center' : 'stretch',
                gap: viewMode === 'list' ? '20px' : '0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: viewMode === 'list' ? '0' : '10px', minWidth: viewMode==='list'?'150px':'auto' }}>
                  <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '12px', color: 'var(--primary)', width:'fit-content' }}><Map size={20} /></div>
                  {viewMode !== 'list' && <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', height:'fit-content' }}>ID: {v.idViaje}</div>}
              </div>
              
              <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>{v.nombre}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem', marginBottom: viewMode === 'list' ? '0' : '15px' }}>
                      <Calendar size={14} /> {v.fecha}
                  </div>
              </div>

              <div style={{ borderTop: viewMode === 'list' ? 'none' : '1px solid #f1f5f9', paddingTop: viewMode === 'list' ? '0' : '12px', minWidth: viewMode==='list'?'180px':'auto', display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={() => navigate(`/admin/viaje/${v.idViaje}`)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
                      Gestionar Itinerario <ArrowLeft size={14} style={{transform:'rotate(180deg)'}}/>
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'visible' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: '800' }}>Nuevo Viaje</h2><button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><X size={18} /></button></div>
            <div style={{ padding: '30px' }}>
              <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '20px' }}>
                <div><label style={labelStyle}>Nombre del Viaje *</label><input required type="text" placeholder="Ej. Boda en Cancún" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} style={inputStyle} /></div>
                
                {/* MULTI-CLIENTE SELECTOR */}
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <label style={{...labelStyle, color:'var(--primary)'}}><Users size={14} style={{verticalAlign:'middle'}}/> Clientes Asociados (Pago compartido)</label>
                    
                    <div style={{marginBottom:'10px'}}>
                        <SearchableSelect 
                            options={clientes.filter(c => !selectedClientes.some(sc => sc.id === c.id))}
                            value=""
                            onChange={addCliente}
                            placeholder="+ Agregar Cliente..."
                        />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedClientes.length === 0 && <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Ningún cliente seleccionado</span>}
                        {selectedClientes.map(c => (
                            <div key={c.id} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight:'600' }}>
                                {c.nombre} 
                                <X size={14} style={{cursor:'pointer', color:'#ef4444'}} onClick={() => removeCliente(c.id)} />
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}><div><label style={labelStyle}>Fecha Inicio</label><input type="date" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})} style={inputStyle} /></div><div><label style={labelStyle}>Fecha Fin</label><input type="date" value={form.fechaFin} onChange={e => setForm({...form, fechaFin: e.target.value})} style={inputStyle} /></div></div>
                <div><label style={labelStyle}>Tipo de Viaje</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={inputStyle}><option value="1">Vacacional</option><option value="2">Negocios</option></select></div>
                <button type="submit" className="btn-primary" disabled={procesando} style={{ marginTop: '10px' }}>{procesando ? 'Creando...' : 'Crear Viaje'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {showModalBulk && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
           <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '800px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
               <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Importar Viajes (Carga Masiva)</h2>
                  <button onClick={() => setShowModalBulk(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><X size={18}/></button>
               </div>
               <div style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto', background: '#f8fafc' }}>
                  <BulkUploader onUpload={handleUploadMasivo} isProcessing={isUploading} />
               </div>
           </div>
        </div>
      )}

      {showSuccess && (<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}><div style={{ background: 'white', padding: '30px', borderRadius: '20px', textAlign: 'center', animation: 'popIn 0.3s' }}><h3 style={{ margin: 0, color: '#16a34a' }}>¡Operación Exitosa!</h3></div></div>)}

      {/* CUSTOM ALERT MODAL */}
      {customAlert.show && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
              <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '30px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                  <div style={{ background: customAlert.type === 'error' ? '#fef2f2' : customAlert.type === 'warning' ? '#fffbeb' : '#f0fdf4', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <AlertCircle size={30} color={customAlert.type === 'error' ? '#ef4444' : customAlert.type === 'warning' ? '#f59e0b' : '#10b981'} />
                  </div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: '#1e293b' }}>{customAlert.title}</h3>
                  <p style={{ margin: '0 0 25px 0', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>{customAlert.msg}</p>
                  <button onClick={() => setCustomAlert({ ...customAlert, show: false })} className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '12px' }}>Entendido</button>
              </div>
          </div>
      )}

      <AdminTour run={runTour} setRun={setRunTour} steps={stepsViajes} tourKey="igo_admin_tour_viajes" />
      <FirstTripWizard currentStep="viajes" onOpenModal={() => setShowModal(true)} />
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem', color: '#64748b' };