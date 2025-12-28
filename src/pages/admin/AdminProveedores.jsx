import { useState, useEffect } from 'react';
import { enviarPeticion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Building2, MapPin, Phone, Mail, X, ArrowLeft, Pencil, Trash2, CheckCircle, AlertCircle, LayoutGrid, LayoutList } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminProveedores() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [proveedores, setProveedores] = useState([]);
  const [paises, setPaises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', msg: '', type: 'error' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // Estado de vista

  const formInicial = { id: '', nombre: '', razonSocial: '', rfc: '', pais: '', ciudad: '', colonia: '', calle: '', numExt: '', numInt: '', cp: '', lada: '', telefono: '', correo: '' };
  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    cargarDatos();
    if (location.state?.openCreate) {
        setIsEditing(false);
        setForm(formInicial);
        setShowModal(true);
        navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resProv, resListas] = await Promise.all([enviarPeticion({ accion: 'obtenerProveedores' }), enviarPeticion({ accion: 'obtenerListas' })]);
      if (resProv.exito) setProveedores(resProv.datos);
      if (resListas.exito && resListas.listas) setPaises(resListas.listas.paises || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const abrirModalCrear = () => { setIsEditing(false); setForm(formInicial); setShowModal(true); };
  const abrirModalEditar = (p) => { setIsEditing(true); setForm(p); setShowModal(true); };
  const solicitarEliminar = (id) => { setDeleteId(id); setShowDeleteConfirm(true); };
  const confirmarEliminar = async () => { setProcesando(true); const res = await enviarPeticion({ accion: 'eliminarProveedor', idProveedor: deleteId }); if (res.exito) { cargarDatos(); setShowDeleteConfirm(false); showAlert("Eliminado", "Proveedor eliminado correctamente", "success"); } else { showAlert("Error", res.error); } setProcesando(false); };
  const handleGuardar = async (e) => { e.preventDefault(); if (!form.nombre) return showAlert("Faltan datos", "El nombre es obligatorio", "warning"); setProcesando(true); const accion = isEditing ? 'editarProveedor' : 'agregarProveedor'; const res = await enviarPeticion({ accion, proveedor: form }); if (res.exito) { setShowModal(false); cargarDatos(); showAlert("Guardado", isEditing ? "Proveedor actualizado" : "Proveedor creado", "success"); } else { showAlert("Error", res.error); } setProcesando(false); };
  const showAlert = (title, msg, type = 'error') => setCustomAlert({ show: true, title, msg, type });
  const closeAlert = () => setCustomAlert({ ...customAlert, show: false });
  const getNombrePais = (id) => paises.find(p => p.id == id)?.nombre || id;
  const filtrados = proveedores.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.razonSocial && p.razonSocial.toLowerCase().includes(busqueda.toLowerCase())));

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <button onClick={() => navigate('/')} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><ArrowLeft size={20} /></button>
             <div><h1 style={{ fontSize: '1.8rem', color: 'var(--primary-dark)', margin: 0, fontWeight: '800' }}>Proveedores</h1><p style={{ color: '#64748b', margin: '0', fontSize: '0.9rem' }}>Aerolíneas, Hoteles y Servicios</p></div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', gap:'4px' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '8px', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'grid' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='grid'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} style={{ padding: '8px', border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'list' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='list'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutList size={18}/></button>
            </div>
            <button onClick={abrirModalCrear} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px' }}><Plus size={18} /> Nuevo Proveedor</button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '25px', maxWidth: '600px' }}><Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} /><input type="text" placeholder="Buscar por nombre o razón social..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }} /></div>

      {loading ? <div style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>Cargando directorio...</div> : (
        <div style={{ 
            display: viewMode === 'grid' ? 'grid' : 'flex', 
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : 'none', 
            flexDirection: viewMode === 'grid' ? 'row' : 'column',
            gap: '20px', 
            alignItems: 'start' 
        }}>
          {filtrados.map(p => (
            <div 
              key={p.id} 
              className="dashboard-card" 
              style={{ 
                  padding: '24px', 
                  height: 'auto',
                  display: 'flex',
                  flexDirection: viewMode === 'list' ? 'row' : 'column',
                  alignItems: viewMode === 'list' ? 'center' : 'stretch',
                  gap: viewMode === 'list' ? '20px' : '0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: viewMode === 'list' ? '0' : '15px', minWidth: viewMode==='list'?'200px':'auto' }}>
                  <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                      <div style={{ background: '#fefce8', padding: '12px', borderRadius: '16px', color: '#ca8a04' }}><Building2 size={24} /></div>
                      {viewMode === 'list' && <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: '800' }}>{p.nombre}</h3>}
                  </div>
                  <div style={{ display:'flex', gap:'5px', marginLeft: viewMode==='list'?'auto':'0' }}>
                      <button onClick={() => abrirModalEditar(p)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}><Pencil size={16} color="#64748b"/></button>
                      <button onClick={() => solicitarEliminar(p.id)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer' }}><Trash2 size={16} color="#ef4444"/></button>
                  </div>
              </div>
              
              <div style={{ flex: 1 }}>
                  {viewMode !== 'list' && (
                      <>
                        <h3 style={{ margin: '0 0 5px 0', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '800' }}>{p.nombre}</h3>
                        {p.razonSocial && <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', marginBottom: '15px' }}>{p.razonSocial}</div>}
                      </>
                  )}
                  {viewMode === 'list' && p.razonSocial && <div style={{ fontSize: '0.9rem', color: '#64748b', marginRight:'20px' }}>{p.razonSocial}</div>}
              </div>

              <div style={{ 
                  borderTop: viewMode === 'list' ? 'none' : '1px solid #f1f5f9', 
                  borderLeft: viewMode === 'list' ? '1px solid #f1f5f9' : 'none', 
                  paddingTop: viewMode === 'list' ? '0' : '15px', 
                  paddingLeft: viewMode === 'list' ? '20px' : '0', 
                  display: 'flex', 
                  flexDirection: viewMode === 'list' ? 'row' : 'column', 
                  gap: '8px',
                  minWidth: viewMode==='list'?'300px':'auto'
              }}>
                  {(p.ciudad || p.pais) && (<div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#475569', alignItems: 'center' }}><MapPin size={14}/> {p.ciudad ? p.ciudad + ', ' : ''}{getNombrePais(p.pais)}</div>)}
                  {(p.telefono || p.correo) && (<div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#475569', alignItems: 'center' }}><Phone size={14}/> {p.telefono || p.correo}</div>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALES */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}><h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>{isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2><button onClick={() => setShowModal(false)} style={closeBtnStyle}><X size={18}/></button></div>
            <div style={{ padding: '30px' }}>
                <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}><div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Nombre Comercial *</label><input required type="text" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} style={inputStyle} /></div><div><label style={labelStyle}>Razón Social</label><input type="text" value={form.razonSocial} onChange={e=>setForm({...form, razonSocial:e.target.value})} style={inputStyle} /></div><div><label style={labelStyle}>RFC</label><input type="text" value={form.rfc} onChange={e=>setForm({...form, rfc:e.target.value})} style={inputStyle} /></div></div>
                    <div style={{ borderTop: '1px solid #f1f5f9', margin: '10px 0' }}></div><label style={{...labelStyle, color:'var(--primary)'}}>UBICACIÓN</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}><div><label style={labelStyle}>País</label><select value={form.pais} onChange={e=>setForm({...form, pais:e.target.value})} style={inputStyle}>{paises.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div><div><label style={labelStyle}>CP</label><input type="text" value={form.cp} onChange={e=>setForm({...form, cp:e.target.value})} style={inputStyle} /></div><div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Calle</label><input type="text" value={form.calle} onChange={e=>setForm({...form, calle:e.target.value})} style={inputStyle} /></div><div><label style={labelStyle}>Núm. Exterior</label><input type="text" value={form.numExt} onChange={e=>setForm({...form, numExt:e.target.value})} style={inputStyle} /></div><div><label style={labelStyle}>Núm. Interior</label><input type="text" value={form.numInt} onChange={e=>setForm({...form, numInt:e.target.value})} style={inputStyle} /></div><div><label style={labelStyle}>Colonia</label><input type="text" value={form.colonia} onChange={e=>setForm({...form, colonia:e.target.value})} style={inputStyle} /></div><div><label style={labelStyle}>Ciudad</label><input type="text" value={form.ciudad} onChange={e=>setForm({...form, ciudad:e.target.value})} style={inputStyle} /></div></div>
                    <div style={{ borderTop: '1px solid #f1f5f9', margin: '10px 0' }}></div><label style={{...labelStyle, color:'var(--primary)'}}>CONTACTO</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}><div><label style={labelStyle}>Lada</label><input type="text" value={form.lada} onChange={e=>setForm({...form, lada:e.target.value})} style={inputStyle} /></div><div><label style={labelStyle}>Teléfono</label><input type="tel" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} style={inputStyle} /></div><div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Correo</label><input type="email" value={form.correo} onChange={e=>setForm({...form, correo:e.target.value})} style={inputStyle} /></div></div>
                    <button type="submit" className="btn-primary" disabled={procesando} style={{ marginTop: '10px' }}>{procesando ? 'Guardando...' : 'Guardar'}</button>
                </form>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (<div style={modalOverlayStyle}><div style={{...modalContentStyle, maxWidth:'400px', maxHeight:'auto', padding:'30px', textAlign:'center'}}><Trash2 size={40} color="#ef4444" style={{margin:'0 auto 10px'}}/><h3>¿Eliminar Proveedor?</h3><p style={{color:'#64748b'}}>Esta acción es permanente.</p><div style={{display:'flex', gap:'10px', marginTop:'20px'}}><button onClick={()=>setShowDeleteConfirm(false)} style={{flex:1, padding:'10px', border:'1px solid #ccc', borderRadius:'20px', background:'white'}}>Cancelar</button><button onClick={confirmarEliminar} style={{flex:1, padding:'10px', border:'none', borderRadius:'20px', background:'#ef4444', color:'white'}}>Eliminar</button></div></div></div>)}
      {customAlert.show && (<div style={modalOverlayStyle}><div style={{...modalContentStyle, maxWidth:'400px', maxHeight:'auto', padding:'30px', textAlign:'center'}}><div style={{ margin:'0 auto 15px', color: customAlert.type==='success'?'#10b981':'#ef4444' }}>{customAlert.type==='success' ? <CheckCircle size={40}/> : <AlertCircle size={40}/>}</div><h3>{customAlert.title}</h3><p style={{color:'#64748b'}}>{customAlert.msg}</p><button onClick={closeAlert} className="btn-primary" style={{marginTop:'20px', width:'100%'}}>Entendido</button></div></div>)}
    </div>
  );
}

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContentStyle = { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };