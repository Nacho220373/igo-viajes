import { useState, useEffect } from 'react';
import { enviarPeticion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, MapPin, Phone, Building, Briefcase, Mail, X, ArrowLeft, Users, Home, Globe, CheckCircle, UserCheck, LayoutGrid, LayoutList, Copy, Check, Loader } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminClientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [clientes, setClientes] = useState([]);
  const [paises, setPaises] = useState([]);
  const [usuariosLibres, setUsuariosLibres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); 

  // Estados Link
  const [generatingLinkId, setGeneratingLinkId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Formulario
  const formInicial = {
    nombre: '', razonSocial: '', rfc: '', pais: '', ciudad: '', colonia: '', calle: '', 
    numExt: '', numInt: '', cp: '', lada: '', telefono: '', correo: '', idUsuario: ''
  };
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
      const [resClientes, resListas, resUsuarios] = await Promise.all([
        enviarPeticion({ accion: 'obtenerClientes', rol: user.rol }),
        enviarPeticion({ accion: 'obtenerListas' }),
        enviarPeticion({ accion: 'obtenerUsuariosLibres' })
      ]);

      if (resClientes.exito) setClientes(resClientes.datos);
      if (resListas.exito && resListas.listas) setPaises(resListas.listas.paises);
      if (resUsuarios && resUsuarios.exito) setUsuariosLibres(resUsuarios.usuarios);
      
    } catch (error) { console.error("Error cargando datos:", error); } finally { setLoading(false); }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    if (!form.nombre) { alert("El nombre es obligatorio"); setProcesando(false); return; }
    const respuesta = await enviarPeticion({ accion: 'agregarCliente', cliente: form });
    if (respuesta.exito) {
      setShowModal(false); setForm(formInicial); setMensajeExito(respuesta.mensaje || "Cliente registrado exitosamente");
      setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000);
      const resRefresh = await enviarPeticion({ accion: 'obtenerClientes', rol: user.rol });
      if (resRefresh.exito) setClientes(resRefresh.datos);
    } else { alert("❌ Error: " + (respuesta.error || "No se pudo guardar")); }
    setProcesando(false);
  };

  const getInviteUrl = (token) => `${window.location.origin}/invite?token=${token}`;

  const handleGenerateLink = async (e, idCliente) => {
    e.stopPropagation(); 
    setGeneratingLinkId(idCliente);
    const res = await enviarPeticion({ accion: 'generarTokenInvitacionCliente', idCliente });
    if (res.exito) {
        setClientes(prev => prev.map(c => c.id === idCliente ? { ...c, token: res.token } : c));
        const link = getInviteUrl(res.token);
        navigator.clipboard.writeText(link);
        setCopiedId(idCliente);
        setTimeout(() => setCopiedId(null), 3000);
    } else { 
        alert("Error al generar enlace: " + res.error); 
    }
    setGeneratingLinkId(null);
  };

  const handleCopyExistingLink = (e, token, idCliente) => {
      e.stopPropagation();
      const link = getInviteUrl(token);
      navigator.clipboard.writeText(link);
      setCopiedId(idCliente);
      setTimeout(() => setCopiedId(null), 3000);
  };

  const getNombrePais = (id) => {
    const p = paises.find(pais => pais.id == id);
    return p ? p.nombre : id;
  };

  const clientesFiltrados = clientes.filter(c => 
    (c.nombre && c.nombre.toLowerCase().includes(busqueda.toLowerCase())) || 
    (c.razonSocial && c.razonSocial.toLowerCase().includes(busqueda.toLowerCase())) ||
    (c.rfc && c.rfc.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <button onClick={() => navigate('/')} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: '0.2s' }}><ArrowLeft size={20} /></button>
             <div><h1 style={{ fontSize: '1.8rem', color: 'var(--primary-dark)', margin: 0, fontWeight: '800' }}>Cartera de Clientes</h1><p style={{ color: '#64748b', margin: '0', fontSize: '0.9rem' }}>{clientes.length} Registros Activos</p></div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', gap:'4px' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '8px', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'grid' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='grid'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} style={{ padding: '8px', border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'list' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='list'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutList size={18}/></button>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px' }}><Plus size={18} /> Nuevo Cliente</button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '25px', maxWidth: '600px' }}><Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} /><input type="text" placeholder="Buscar por nombre, empresa o RFC..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}/></div>

      {loading ? <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}><p>Cargando directorio...</p></div> : (
        <div style={{ 
            display: viewMode === 'grid' ? 'grid' : 'flex', 
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : 'none', 
            flexDirection: viewMode === 'grid' ? 'row' : 'column',
            gap: '20px', 
            alignItems: 'start' 
        }}>
          {clientesFiltrados.map(cliente => {
            // LÓGICA DE ESTADO: Si tiene ID de usuario (cliente.idUsuario), está ACTIVO.
            const isActive = !!cliente.idUsuario;

            return (
            <div 
              key={cliente.id} 
              className="dashboard-card" 
              onClick={() => setShowDetail(cliente)}
              style={{ 
                  padding: '24px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: 'auto',
                  display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', alignItems: viewMode === 'list' ? 'center' : 'stretch', gap: viewMode === 'list' ? '20px' : '0'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: viewMode === 'list' ? '0' : '15px', minWidth: viewMode==='list'?'180px':'auto' }}>
                <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                    <div style={{ background: isActive ? '#ecfdf5' : '#fffbeb', padding: '12px', borderRadius: '16px', color: isActive ? '#10b981' : '#f59e0b' }}><Building size={24} /></div>
                    {viewMode === 'list' && (
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: '800' }}>{cliente.nombre}</h3>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isActive ? '#10b981' : '#94a3b8' }}>{isActive ? 'Cuenta Activa' : `ID: ${cliente.id}`}</span>
                        </div>
                    )}
                </div>
                {/* BADGE DE ESTADO (Solo en Grid) */}
                {viewMode !== 'list' && (
                    <span style={{ 
                        background: isActive ? '#ecfdf5' : '#fef2f2', 
                        padding: '4px 10px', borderRadius: '20px', 
                        fontSize: '0.75rem', fontWeight: '700', 
                        color: isActive ? '#10b981' : '#ef4444', 
                        border: '1px solid', borderColor: isActive ? '#bbf7d0' : '#fecaca' 
                    }}>
                        {isActive ? 'Activo' : 'Pendiente'}
                    </span>
                )}
              </div>
              
              <div style={{ flex: 1 }}>
                  {viewMode !== 'list' && (
                      <>
                        <h3 style={{ margin: '0 0 5px 0', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '800' }}>{cliente.nombre}</h3>
                        {cliente.razonSocial && <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', marginBottom: '15px' }}>{cliente.razonSocial}</div>}
                      </>
                  )}
                  {viewMode === 'list' && cliente.razonSocial && <div style={{ fontSize: '0.9rem', color: '#64748b', marginRight:'20px' }}>{cliente.razonSocial}</div>}
                  
                  {/* LINK VISIBLE: Solo si NO está activo y tiene token */}
                  {!isActive && cliente.token && (
                      <div style={{ marginTop: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px dashed #cbd5e1', display:'flex', alignItems:'center', gap:'10px' }} onClick={(e)=>e.stopPropagation()}>
                          <div style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'0.8rem', color:'#64748b'}}>{getInviteUrl(cliente.token)}</div>
                          <button onClick={(e) => handleCopyExistingLink(e, cliente.token, cliente.id)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--primary)'}} title="Copiar"><Copy size={14}/></button>
                      </div>
                  )}
              </div>
              
              <div style={{ 
                  marginTop: viewMode === 'list' ? '0' : 'auto', 
                  display: 'flex', alignItems: 'center', gap: '5px',
                  borderTop: viewMode === 'list' ? 'none' : '1px solid #f1f5f9',
                  paddingTop: viewMode === 'list' ? '0' : '15px',
                  minWidth: viewMode === 'list' ? '150px' : 'auto',
                  justifyContent: viewMode === 'list' ? 'flex-end' : 'space-between'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    Ver detalles <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                </div>

                {/* BOTÓN DINÁMICO: Si activo -> Nada (o editar). Si inactivo -> Generar Link/Copiar */}
                {!isActive && (
                    <button 
                        onClick={(e) => cliente.token ? handleCopyExistingLink(e, cliente.token, cliente.id) : handleGenerateLink(e, cliente.id)} 
                        style={{
                            background: copiedId === cliente.id ? '#ecfdf5' : '#eff6ff', 
                            color: copiedId === cliente.id ? '#10b981' : 'var(--primary)', 
                            border: '1px solid', borderColor: copiedId === cliente.id ? '#10b981' : '#bfdbfe',
                            padding: '6px 12px', borderRadius: '50px', cursor: 'pointer', 
                            fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px'
                        }} 
                        disabled={generatingLinkId === cliente.id}
                    >
                        {generatingLinkId === cliente.id ? <Loader size={12} className="spin" /> : 
                            (copiedId === cliente.id ? <><Check size={12}/> Copiado</> : 
                                (cliente.token ? <><Copy size={12}/> Link</> : <><Plus size={12}/> Activar</>)
                            )
                        }
                    </button>
                )}
              </div>
            </div>
          )})}
        </div>
      )}

      {/* MODAL REGISTRO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: '800' }}>Registrar Nuevo Cliente</h2>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '30px' }}>
              <form onSubmit={handleGuardar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: '1 / -1', background: '#eff6ff', padding: '15px', borderRadius: '12px', border: '1px dashed #60a5fa' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: 'var(--primary-dark)', fontWeight: '800', fontSize: '0.9rem' }}><UserCheck size={18} /> VINCULAR A USUARIO WEB</div><div className="form-group" style={{ marginBottom: 0 }}><label style={{ fontSize: '0.85rem' }}>Seleccionar Usuario Existente (Opcional)</label><select value={form.idUsuario} onChange={e => setForm({...form, idUsuario: e.target.value})} style={{ ...inputStyle, background: 'white' }}><option value="">-- Sin vincular (Solo registro administrativo) --</option>{usuariosLibres.map((u) => (<option key={u.id} value={u.id}>{u.nombre} ({u.correo})</option>))}</select></div></div>
                <div style={{ gridColumn: '1 / -1', color: 'var(--primary)', fontWeight: '800', fontSize: '0.9rem', marginTop: '10px' }}>DATOS GENERALES Y FISCALES</div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Nombre Completo / Comercial *</label><input required type="text" className="input-field" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} style={inputStyle} /></div><div className="form-group"><label>Razón Social</label><input type="text" className="input-field" value={form.razonSocial} onChange={e => setForm({...form, razonSocial: e.target.value})} style={inputStyle} /></div><div className="form-group"><label>RFC</label><input type="text" className="input-field" value={form.rfc} onChange={e => setForm({...form, rfc: e.target.value.toUpperCase()})} style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1', color: 'var(--primary)', fontWeight: '800', fontSize: '0.9rem', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>DIRECCIÓN</div>
                <div className="form-group"><label>País</label><select value={form.pais} onChange={e => setForm({...form, pais: e.target.value})} style={inputStyle}><option value="">-- Seleccionar --</option>{paises.map((p, idx) => (<option key={idx} value={p.id}>{p.nombre}</option>))}</select></div><div className="form-group"><label>Código Postal</label><input type="text" value={form.cp} onChange={e => setForm({...form, cp: e.target.value})} style={inputStyle} /></div><div className="form-group"><label>Ciudad / Estado</label><input type="text" value={form.ciudad} onChange={e => setForm({...form, ciudad: e.target.value})} style={inputStyle} /></div><div className="form-group"><label>Colonia</label><input type="text" value={form.colonia} onChange={e => setForm({...form, colonia: e.target.value})} style={inputStyle} /></div><div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Calle</label><input type="text" value={form.calle} onChange={e => setForm({...form, calle: e.target.value})} style={inputStyle} /></div><div className="form-group"><label>Núm. Exterior</label><input type="text" value={form.numExt} onChange={e => setForm({...form, numExt: e.target.value})} style={inputStyle} /></div><div className="form-group"><label>Núm. Interior</label><input type="text" value={form.numInt} onChange={e => setForm({...form, numInt: e.target.value})} style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1', color: 'var(--primary)', fontWeight: '800', fontSize: '0.9rem', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>CONTACTO</div>
                <div className="form-group"><label>Lada</label><input type="text" placeholder="Ej. 52" value={form.lada} onChange={e => setForm({...form, lada: e.target.value})} style={inputStyle} /></div><div className="form-group"><label>Teléfono</label><input type="tel" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} style={inputStyle} /></div><div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Correo Electrónico</label><input type="email" value={form.correo} onChange={e => setForm({...form, correo: e.target.value})} style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}><button type="submit" className="btn-primary" disabled={procesando} style={{ width: '100%' }}>{procesando ? 'Guardando...' : 'Guardar Cliente Completo'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {showDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
             <div style={{ padding: '24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '800' }}>{showDetail.nombre}</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.9rem' }}>ID Cliente: {showDetail.id}</p></div>
                <button onClick={() => setShowDetail(null)} style={{ background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
             </div>
             <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <DetalleRow label="Razón Social" value={showDetail.razonSocial} icon={<Building size={16} />} />
                <DetalleRow label="RFC" value={showDetail.rfc} icon={<Briefcase size={16} />} />
                <div style={{ height: '1px', background: '#e2e8f0', margin: '5px 0' }}></div>
                <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ubicación</h4>
                <DetalleRow label="Dirección" value={`${showDetail.calle || ''} ${showDetail.numExt || ''} ${showDetail.numInt ? 'Int '+showDetail.numInt : ''}`} icon={<Home size={16} />} />
                <DetalleRow label="Colonia" value={showDetail.colonia} />
                <DetalleRow label="Ciudad/CP" value={`${showDetail.ciudad || ''} ${showDetail.cp ? '- CP '+showDetail.cp : ''}`} icon={<MapPin size={16} />} />
                <DetalleRow label="País" value={getNombrePais(showDetail.pais)} icon={<Globe size={16} />} />
                <div style={{ height: '1px', background: '#e2e8f0', margin: '5px 0' }}></div>
                <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Contacto</h4>
                <DetalleRow label="Teléfono" value={showDetail.telefono} icon={<Phone size={16} />} />
                <DetalleRow label="Correo" value={showDetail.correo} icon={<Mail size={16} />} />
             </div>
             <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}><button onClick={() => setShowDetail(null)} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 20px' }}>Cerrar</button></div>
          </div>
        </div>
      )}

      {showSuccess && (<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}><div style={{ background: 'white', padding: '40px 30px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxWidth: '320px', width: '90%' }}><div style={{ background: '#ecfdf5', color: '#10b981', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}><CheckCircle size={48} /></div><h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: '800' }}>¡Éxito!</h3><p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>{mensajeExito}</p><button onClick={() => setShowSuccess(false)} className="btn-primary" style={{ width: '100%', padding: '12px' }}>Entendido</button></div></div>)}
    </div>
  );
}

const DetalleRow = ({ label, value, icon }) => {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <div style={{ color: '#94a3b8', marginTop: '2px' }}>{icon || <div style={{width: 16}} />}</div>
      <div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: '500' }}>{value}</div>
      </div>
    </div>
  );
};

const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', boxSizing: 'border-box' };