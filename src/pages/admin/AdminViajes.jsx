import { useState, useEffect } from 'react';
import { enviarPeticion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
// IMPORTAMOS EL NUEVO COMPONENTE
import SearchableSelect from '../../components/SearchableSelect';
import { Plus, Search, Map, Calendar, ArrowLeft, X, LayoutGrid, LayoutList } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminViajes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Estados
  const [viajes, setViajes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); 

  const formInicial = { nombre: '', idCliente: '', tipo: '1', fechaInicio: '', fechaFin: '' };
  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    cargarDatos();
    if (location.state?.openCreate) {
        setShowModal(true);
        navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resViajes, resClientes] = await Promise.all([
        enviarPeticion({ accion: 'obtenerViajes', idUsuario: user.id, rol: user.rol }),
        enviarPeticion({ accion: 'obtenerClientes', rol: user.rol })
      ]);
      if (resViajes.exito) setViajes(resViajes.datos);
      if (resClientes.exito) setClientes(resClientes.datos);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.idCliente) return alert("Selecciona un Cliente");
    setProcesando(true);
    const respuesta = await enviarPeticion({ accion: 'agregarViaje', viaje: form });
    if (respuesta.exito) {
      setShowModal(false); setForm(formInicial); setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      const refresh = await enviarPeticion({ accion: 'obtenerViajes', idUsuario: user.id, rol: user.rol });
      if (refresh.exito) setViajes(refresh.datos);
    } else { alert("Error: " + respuesta.error); }
    setProcesando(false);
  };

  const filtrados = viajes.filter(v => v.nombre.toLowerCase().includes(busqueda.toLowerCase()) || v.destino.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <button onClick={() => navigate('/')} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><ArrowLeft size={20} /></button>
             <div><h1 style={{ fontSize: '1.8rem', color: 'var(--primary-dark)', margin: 0, fontWeight: '800' }}>Expedientes de Viaje</h1><p style={{ color: '#64748b', margin: '0', fontSize: '0.9rem' }}>Gestión de aventuras activas</p></div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', gap:'4px' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '8px', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'grid' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='grid'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} style={{ padding: '8px', border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'list' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='list'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutList size={18}/></button>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px' }}><Plus size={18} /> Nuevo Viaje</button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '25px', maxWidth: '600px' }}><Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} /><input type="text" placeholder="Buscar expediente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }} /></div>

      {loading ? <div style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>Cargando viajes...</div> : (
        <div style={{ 
            display: viewMode === 'grid' ? 'grid' : 'flex', 
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'none', 
            flexDirection: viewMode === 'grid' ? 'row' : 'column',
            gap: '20px', 
            alignItems: 'start' 
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
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: '800' }}>Nuevo Expediente</h2><button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><X size={18} /></button></div>
            <div style={{ padding: '30px' }}>
              <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '20px' }}>
                <div><label style={labelStyle}>Nombre del Viaje *</label><input required type="text" placeholder="Ej. Boda en Cancún" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} style={inputStyle} /></div>
                
                {/* IMPLEMENTACIÓN DE BÚSQUEDA DE CLIENTES */}
                <div>
                    <label style={labelStyle}>Cliente (Titular) *</label>
                    <SearchableSelect 
                        options={clientes}
                        value={form.idCliente}
                        onChange={(val) => setForm({...form, idCliente: val})}
                        placeholder="Buscar Cliente..."
                        required
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}><div><label style={labelStyle}>Fecha Inicio</label><input type="date" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})} style={inputStyle} /></div><div><label style={labelStyle}>Fecha Fin</label><input type="date" value={form.fechaFin} onChange={e => setForm({...form, fechaFin: e.target.value})} style={inputStyle} /></div></div>
                <div><label style={labelStyle}>Tipo de Viaje</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={inputStyle}><option value="1">Vacacional</option><option value="2">Negocios</option></select></div>
                <button type="submit" className="btn-primary" disabled={procesando} style={{ marginTop: '10px' }}>{procesando ? 'Creando...' : 'Crear Expediente'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}><div style={{ background: 'white', padding: '30px', borderRadius: '20px', textAlign: 'center', animation: 'popIn 0.3s' }}><h3 style={{ margin: 0, color: '#16a34a' }}>¡Viaje Creado!</h3></div></div>)}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem', color: '#64748b' };