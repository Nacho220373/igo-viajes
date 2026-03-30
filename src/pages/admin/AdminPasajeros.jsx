import { useState, useEffect } from 'react';
import { enviarPeticion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import { Plus, Search, User, Building, Phone, Mail, X, ArrowLeft, CreditCard, FileText, MapPin, Flag, Calendar, LayoutGrid, LayoutList, Copy, Check, UserCheck, Trash2, Loader as LucideLoader, Database, AlertCircle } from 'lucide-react';
import Loader from '../../components/Loader';
import BulkUploader from '../../components/BulkUploader';
import AdminTour from '../../components/AdminTour';
import FirstTripWizard from '../../components/FirstTripWizard';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminPasajeros() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [pasajeros, setPasajeros] = useState([]);
  const [clientes, setClientes] = useState([]); 
  const [nacionalidades, setNacionalidades] = useState([]);
  const [paises, setPaises] = useState([]); 
  const [usuariosLibres, setUsuariosLibres] = useState([]);
  
  const [loading, setLoading] = useState(true);
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

  // Estados Link
  const [generatingLinkId, setGeneratingLinkId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const formInicial = {
    idCliente: '', nombre: '', apellidoP: '', apellidoM: '', fechaNacimiento: '', 
    nacionalidad: '', pasaporte: '', visa: '', pais: '', estado: '', ciudad: '', colonia: '', 
    calle: '', numExt: '', numInt: '', cp: '', correo: '',
    // Estructura de teléfonos múltiples
    telefonos: [{ tipo: 'Móvil', lada: '52', numero: '' }],
    idUsuario: '' 
  };
  const [form, setForm] = useState(formInicial);

  // === TOUR ===
  const [runTour, setRunTour] = useState(false);
  const stepsPasajeros = [
      { target: '.tour-pasajeros-header', content: 'Directorio de Pasajeros. Aquí administras a las personas reales que van a abordar los viajes (distintos al cliente que lo factura).', disableBeacon: true },
      { target: '.tour-btn-carga', content: '¿Tienes listas grandes de pasajeros? Cárgalos aquí por Excel.' },
      { target: '.tour-btn-nuevo', content: 'Registra a un pasajero individual, con documentos clave como pasaporte y visa.' },
      { target: '.tour-lista-pasajeros', content: 'Aquí tendrás visible si el pasajero tiene la app activada y su información. Listo, puedes continuar.' }
  ];

  useEffect(() => {
    cargarDatos();
    if (location.state?.openCreate) {
        setForm(formInicial);
        setShowModal(true);
        navigate(location.pathname, { replace: true, state: {} });
    }
    const tourSeen = localStorage.getItem('igo_admin_tour_pasajeros');
    if (!tourSeen) setRunTour(true);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resPasajeros, resClientes, resListas, resUsuarios] = await Promise.all([
        enviarPeticion({ accion: 'obtenerPasajeros', rol: user.rol }),
        enviarPeticion({ accion: 'obtenerClientes', rol: user.rol }),
        enviarPeticion({ accion: 'obtenerListas' }),
        enviarPeticion({ accion: 'obtenerUsuariosLibres' }) 
      ]);

      if (resPasajeros.exito) setPasajeros(resPasajeros.datos);
      if (resClientes.exito) setClientes(resClientes.datos);
      if (resUsuarios.exito) setUsuariosLibres(resUsuarios.usuarios);
      
      if (resListas.exito && resListas.listas) {
         setPaises(resListas.listas.paises || []);
         const resNac = await enviarPeticion({ accion: 'obtenerNacionalidades' });
         if (resNac.exito) setNacionalidades(resNac.listas.nacionalidades);
      }
      
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- LÓGICA DE TELÉFONOS ---
  const handlePhoneChange = (index, field, value) => {
      const nuevos = [...form.telefonos];
      nuevos[index][field] = value;
      setForm({ ...form, telefonos: nuevos });
  };
  const addPhone = () => setForm({ ...form, telefonos: [...form.telefonos, { tipo: 'Móvil', lada: '52', numero: '' }] });
  const removePhone = (idx) => {
      if (form.telefonos.length === 1) return;
      setForm({ ...form, telefonos: form.telefonos.filter((_, i) => i !== idx) });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.idCliente) {
         showAlert("Atención", "Debes seleccionar un Cliente (Empresa/Titular) o asignar uno Genérico.", "warning");
         return;
    }
    setProcesando(true);
    
    const accion = form.id ? 'editarPasajero' : 'agregarPasajero';
    const respuesta = await enviarPeticion({ accion: accion, pasajero: form });
    
    if (respuesta.exito) {
      setShowModal(false); setForm(formInicial); setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      const refresh = await enviarPeticion({ accion: 'obtenerPasajeros', rol: user.rol });
      if (refresh.exito) setPasajeros(refresh.datos);
    } else { showAlert("Error", "Error: " + respuesta.error, "error"); }
    setProcesando(false);
  };

  const handleEditar = (p) => {
      // Tomamos la fecha directamente, ya que el backend ahora asegura formato yyyy-MM-dd
      // Usamos .split('T')[0] como doble seguridad por si el string trae información de horas
      let fechaInput = p.fechaNacimiento ? p.fechaNacimiento.split('T')[0] : '';
      
      // Recuperar teléfonos si existen, si no, usar el campo plano antiguo
      let listaTelefonos = p.telefonos && p.telefonos.length > 0 
          ? p.telefonos 
          : [{ tipo: 'Móvil', lada: p.lada || '52', numero: p.telefono || '' }];

      setForm({
          ...p,
          fechaNacimiento: fechaInput,
          telefonos: listaTelefonos,
          idUsuario: p.idUsuario || '',
          estado: p.estado || '' // Asegurar cargar estado si existe
      });
      setShowModal(true);
  };

  const getInviteUrl = (token) => `${window.location.origin}/invite?token=${token}`;

  const handleGenerateLink = async (e, idPasajero) => {
    e.stopPropagation(); 
    setGeneratingLinkId(idPasajero);
    const res = await enviarPeticion({ accion: 'generarTokenInvitacion', idPasajero });
    if (res.exito) {
        setPasajeros(prev => prev.map(p => p.id === idPasajero ? { ...p, token: res.token } : p));
        const link = getInviteUrl(res.token);
        navigator.clipboard.writeText(link);
        setCopiedId(idPasajero);
        setTimeout(() => setCopiedId(null), 3000);
    } else { showAlert("Error", "Error: " + res.error, "error"); }
    setGeneratingLinkId(null);
  };

  const handleCopyExistingLink = (e, token, idPasajero) => {
      e.stopPropagation();
      navigator.clipboard.writeText(getInviteUrl(token));
      setCopiedId(idPasajero);
      setTimeout(() => setCopiedId(null), 3000);
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
            setTimeout(() => setShowSuccess(false), 3000);
        } else {
            showAlert("Error al procesar", respuesta.error, "error");
        }
    } catch (error) {
        showAlert("Error de red", "Verifica tu conexión a internet", "error");
    } finally {
        setIsUploading(false);
    }
  };

  const filtrados = pasajeros.filter(p => 
    (p.nombre + " " + p.apellidoP).toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nombreCliente.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleNuevoPasajero = () => {
      if (clientes.length === 0) {
          showAlert("Sistema Incompleto", "No puedes crear un pasajero porque no tienes clientes registrados. Por favor, ve al módulo de Clientes y registra al menos uno.", "warning");
          return;
      }
      setForm(formInicial);
      setShowModal(true);
  };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <button onClick={() => navigate('/')} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><ArrowLeft size={20} /></button>
             <div className="tour-pasajeros-header"><h1 style={{ fontSize: '1.8rem', color: 'var(--primary-dark)', margin: 0, fontWeight: '800' }}>Pasajeros</h1><p style={{ color: '#64748b', margin: '0', fontSize: '0.9rem' }}>{pasajeros.length} viajeros registrados</p></div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', gap:'4px' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '8px', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'grid' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='grid'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} style={{ padding: '8px', border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'list' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='list'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutList size={18}/></button>
            </div>
            <button onClick={() => setShowModalBulk(true)} className="btn-secondary tour-btn-carga" style={{ width: 'auto', padding: '10px 20px', borderRadius: '50px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600' }}><Database size={18} /> Carga Masiva</button>
            <button onClick={handleNuevoPasajero} className="btn-primary tour-btn-nuevo" style={{ width: 'auto', padding: '12px 24px', borderRadius: '50px' }}><Plus size={18} /> Nuevo Pasajero</button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '25px', maxWidth: '600px' }}><Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} /><input type="text" placeholder="Buscar pasajero o empresa..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }} /></div>

      {loading ? <Loader message="Cargando pasajeros..." /> : (
        <div className="tour-lista-pasajeros" style={{ 
            display: viewMode === 'grid' ? 'grid' : 'flex', 
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'none', 
            flexDirection: viewMode === 'grid' ? 'row' : 'column',
            gap: '20px', alignItems: viewMode === 'grid' ? 'start' : 'stretch' 
        }}>
          {filtrados.map(p => (
            <div 
              key={p.id} className="dashboard-card" onClick={() => handleEditar(p)}
              style={{ 
                  padding: '20px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: 'auto',
                  display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', alignItems: viewMode === 'list' ? 'center' : 'stretch', gap: viewMode === 'list' ? '20px' : '0'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: viewMode === 'list' ? '0' : '10px', minWidth: viewMode==='list'?'200px':'auto' }}>
                <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                    <div style={{ background: p.registrado ? '#ecfdf5' : '#fef2f2', padding: '8px', borderRadius: '12px', color: p.registrado ? '#10b981' : '#f87171' }}><User size={20} /></div>
                    {viewMode === 'list' && (
                        <div>
                            <h3 style={{ margin: '0 0 2px 0', fontSize: '1rem', color: 'var(--text-main)' }}>{p.nombre} {p.apellidoP}</h3>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.apellidoM}</div>
                        </div>
                    )}
                </div>
                {viewMode !== 'list' && (
                    <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Building size={12} /> {p.nombreCliente}
                    </div>
                )}
              </div>
              
              {viewMode !== 'list' && (
                  <>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>{p.nombre} {p.apellidoP}</h3>
                    <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#64748b' }}>{p.apellidoM}</p>
                  </>
              )}
              
              <div style={{ 
                  borderTop: viewMode === 'list' ? 'none' : '1px solid #f1f5f9', 
                  borderLeft: viewMode === 'list' ? '1px solid #f1f5f9' : 'none', 
                  paddingTop: viewMode === 'list' ? '0' : '12px', 
                  paddingLeft: viewMode === 'list' ? '20px' : '0', 
                  display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', 
                  gap: viewMode === 'list' ? '30px' : '8px', flex: 1,
                  justifyContent: viewMode === 'list' ? 'flex-start' : 'space-between',
                  alignItems: viewMode === 'list' ? 'center' : 'stretch'
              }}>
                 {viewMode === 'list' && <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><Building size={12} /> {p.nombreCliente}</div>}
                 
                 {p.token && (
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px dashed #cbd5e1', display:'flex', alignItems:'center', gap:'10px', maxWidth: viewMode==='list'?'200px':'100%' }} onClick={(e)=>e.stopPropagation()}>
                          <div style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'0.7rem', color:'#64748b'}}>{getInviteUrl(p.token)}</div>
                          <button onClick={(e) => handleCopyExistingLink(e, p.token, p.id)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--primary)'}} title="Copiar"><Copy size={12}/></button>
                      </div>
                 )}
                 
                 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: viewMode==='list'?'0':'5px', marginLeft: viewMode==='list'?'auto':'0' }}>
                    <div style={{fontSize:'0.75rem', fontWeight:'700', color: p.registrado?'#10b981':'#f59e0b', marginRight:'10px'}}>{p.registrado ? 'Activo' : 'Pendiente'}</div>
                    {!p.registrado && (
                        <button 
                            onClick={(e) => p.token ? handleCopyExistingLink(e, p.token, p.id) : handleGenerateLink(e, p.id)} 
                            style={{
                                background: copiedId === p.id ? '#ecfdf5' : '#eff6ff', 
                                color: copiedId === p.id ? '#10b981' : 'var(--primary)', 
                                border: '1px solid', borderColor: copiedId === p.id ? '#10b981' : '#bfdbfe',
                                padding: '6px 12px', borderRadius: '50px', cursor: 'pointer', 
                                fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px'
                            }} 
                            disabled={generatingLinkId === p.id}
                        >
                            {generatingLinkId === p.id ? <LucideLoader size={12} className="spin" /> : 
                                (copiedId === p.id ? <><Check size={12}/> Copiado</> : 
                                    (p.token ? <><Copy size={12}/> Link</> : <><Plus size={12}/> Crear Link</>)
                                )
                            }
                        </button>
                    )}
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR/EDITAR PASAJERO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            {/* Header del Modal */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: '800' }}>{form.id ? 'Editar Pasajero' : 'Nuevo Pasajero'}</h2>
                <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><X size={18} /></button>
            </div>

            {/* Cuerpo del Modal con Scroll */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <form id="pasajeroForm" onSubmit={handleGuardar} style={{ display: 'grid', gap: '20px' }}>
                
                <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '12px', border: '1px dashed #60a5fa' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', fontWeight: '800', fontSize: '0.9rem', color: 'var(--primary-dark)' }}><Building size={16}/> Cliente (Empresa) *</label>
                    <SearchableSelect 
                        options={clientes}
                        value={form.idCliente}
                        onChange={(val) => setForm({...form, idCliente: val})}
                        placeholder="Buscar Empresa o Cliente..."
                        required
                    />
                </div>

                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '12px', border: '1px dashed #4ade80' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', fontWeight: '800', fontSize: '0.9rem', color: '#15803d' }}><UserCheck size={16}/> Vincular a Usuario Web (Opcional)</label>
                    <SearchableSelect 
                        options={[{id: '', nombre: '-- Sin vincular (Solo registro) --'}, ...usuariosLibres]}
                        value={form.idUsuario}
                        onChange={(val) => setForm({...form, idUsuario: val})}
                        placeholder="Buscar Usuario Login..."
                    />
                </div>
                
                <SectionTitle icon={<User size={16}/>} title="Datos Personales" />
                <div className="grid-responsive-2">
                    <div><Label>Nombre(s) *</Label><input required type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} style={inputStyle} /></div><div><Label>Apellido Paterno *</Label><input required type="text" value={form.apellidoP} onChange={e => setForm({...form, apellidoP: e.target.value})} style={inputStyle} /></div><div><Label>Apellido Materno</Label><input type="text" value={form.apellidoM} onChange={e => setForm({...form, apellidoM: e.target.value})} style={inputStyle} /></div><div><Label>Fecha Nacimiento</Label><input type="date" value={form.fechaNacimiento} onChange={e => setForm({...form, fechaNacimiento: e.target.value})} style={inputStyle} /></div><div style={{ gridColumn: '1 / -1' }}><Label>Nacionalidad</Label><select value={form.nacionalidad} onChange={e => setForm({...form, nacionalidad: e.target.value})} style={inputStyle}><option value="">-- Seleccionar --</option>{nacionalidades.map((n, idx) => <option key={idx} value={n.id}>{n.nombre}</option>)}</select></div>
                </div>
                
                <SectionTitle icon={<FileText size={16}/>} title="Documentos de Viaje" />
                <div className="grid-responsive-2">
                    <div><Label>ID Pasaporte</Label><div style={{ position: 'relative' }}><CreditCard size={16} style={{ position: 'absolute', top: '12px', left: '10px', color: '#94a3b8' }} /><input type="text" value={form.pasaporte} onChange={e => setForm({...form, pasaporte: e.target.value})} style={{...inputStyle, paddingLeft: '35px'}} placeholder="Número de Pasaporte" /></div></div><div><Label>ID Visa</Label><div style={{ position: 'relative' }}><CreditCard size={16} style={{ position: 'absolute', top: '12px', left: '10px', color: '#94a3b8' }} /><input type="text" value={form.visa} onChange={e => setForm({...form, visa: e.target.value})} style={{...inputStyle, paddingLeft: '35px'}} placeholder="Número de Visa" /></div></div>
                </div>
                
                <SectionTitle icon={<MapPin size={16}/>} title="Dirección" />
                <div className="grid-responsive-2">
                    <div><Label>País</Label><select value={form.pais} onChange={e => setForm({...form, pais: e.target.value})} style={inputStyle}><option value="">-- Seleccionar --</option>{paises.map((p, idx) => (<option key={idx} value={p.id}>{p.nombre}</option>))}</select></div><div><Label>Estado / Provincia</Label><input type="text" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} style={inputStyle} /></div><div><Label>CP</Label><input type="text" value={form.cp} onChange={e => setForm({...form, cp: e.target.value})} style={inputStyle} /></div><div style={{ gridColumn: '1 / -1' }}><Label>Calle</Label><input type="text" value={form.calle} onChange={e => setForm({...form, calle: e.target.value})} style={inputStyle} /></div><div><Label>Num. Ext</Label><input type="text" value={form.numExt} onChange={e => setForm({...form, numExt: e.target.value})} style={inputStyle} /></div><div><Label>Num. Int</Label><input type="text" value={form.numInt} onChange={e => setForm({...form, numInt: e.target.value})} style={inputStyle} /></div><div><Label>Colonia</Label><input type="text" value={form.colonia} onChange={e => setForm({...form, colonia: e.target.value})} style={inputStyle} /></div><div><Label>Ciudad</Label><input type="text" value={form.ciudad} onChange={e => setForm({...form, ciudad: e.target.value})} style={inputStyle} /></div>
                </div>
                
                <SectionTitle icon={<Phone size={16}/>} title="Contacto" />
                
                {/* SECCIÓN TELÉFONOS MULTIPLES */}
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <Label>Teléfonos</Label>
                        <button type="button" onClick={addPhone} style={{ background: 'white', border: '1px solid #cbd5e1', cursor: 'pointer', borderRadius: '20px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14}/> Agregar</button>
                    </div>
                    {form.telefonos.map((tel, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr 30px', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
                            <div style={{marginBottom:0}}>
                                {idx === 0 && <label style={{fontSize:'0.75rem', marginBottom:'2px', display:'block', color:'#64748b'}}>Tipo</label>}
                                <select value={tel.tipo} onChange={e => handlePhoneChange(idx, 'tipo', e.target.value)} style={{...inputStyle, padding:'8px'}}>
                                    <option value="Móvil">Móvil</option>
                                    <option value="Oficina">Oficina</option>
                                    <option value="Casa">Casa</option>
                                </select>
                            </div>
                            <div style={{marginBottom:0}}>
                                {idx === 0 && <label style={{fontSize:'0.75rem', marginBottom:'2px', display:'block', color:'#64748b'}}>Lada</label>}
                                <input type="text" value={tel.lada} onChange={e => handlePhoneChange(idx, 'lada', e.target.value)} style={{...inputStyle, padding:'8px'}} placeholder="52"/>
                            </div>
                            <div style={{marginBottom:0}}>
                                {idx === 0 && <label style={{fontSize:'0.75rem', marginBottom:'2px', display:'block', color:'#64748b'}}>Número</label>}
                                <input type="tel" value={tel.numero} onChange={e => handlePhoneChange(idx, 'numero', e.target.value)} style={{...inputStyle, padding:'8px'}} placeholder="10 dígitos"/>
                            </div>
                            {form.telefonos.length > 1 && (
                                <button type="button" onClick={() => removePhone(idx)} style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#dc2626', marginBottom: '2px' }}><Trash2 size={16}/></button>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ gridColumn: '1 / -1' }}><Label>Correo</Label><input type="email" value={form.correo} onChange={e => setForm({...form, correo: e.target.value})} style={inputStyle} /></div>
              </form>
            </div>

            {/* Footer Fijo del Modal */}
            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                <button type="submit" form="pasajeroForm" className="btn-primary" disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar Pasajero'}</button>
            </div>
          </div>
        </div>
      )}
      
      {/* BULK UPLOAD MODAL */}
      {showModalBulk && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
           <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '800px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
               <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Importar Pasajeros (Carga Masiva)</h2>
                  <button onClick={() => setShowModalBulk(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><X size={18}/></button>
               </div>
               <div style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto', background: '#f8fafc' }}>
                  <BulkUploader onUpload={handleUploadMasivo} isProcessing={isUploading} />
               </div>
           </div>
        </div>
      )}
      
      {showSuccess && (<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}><div style={{ background: 'white', padding: '30px', borderRadius: '20px', textAlign: 'center', animation: 'popIn 0.3s' }}><h3 style={{ margin: 0, color: '#16a34a' }}>¡Operación Exitosa!</h3></div></div>)}

      {/* CUSTOM ALERT MODAL */}
      {customAlert.show && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
              <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '30px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                  <div style={{ background: customAlert.type === 'error' ? '#fef2f2' : '#fffbeb', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <AlertCircle size={30} color={customAlert.type === 'error' ? '#ef4444' : '#f59e0b'} />
                  </div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: '#1e293b' }}>{customAlert.title}</h3>
                  <p style={{ margin: '0 0 25px 0', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>{customAlert.msg}</p>
                  <button onClick={() => setCustomAlert({ ...customAlert, show: false })} className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '12px' }}>Entendido</button>
              </div>
          </div>
      )}

      <AdminTour run={runTour} setRun={setRunTour} steps={stepsPasajeros} tourKey="igo_admin_tour_pasajeros" />
      <FirstTripWizard currentStep="pasajeros" onOpenModal={() => setShowModal(true)} />
    </div>
  );
}

const SectionTitle = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginTop: '10px' }}><div style={{ color: 'var(--primary)' }}>{icon}</div><span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-main)', textTransform: 'uppercase' }}>{title}</span></div>
);
const Label = ({ children }) => (<label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>{children}</label>);
const inputStyle = { width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.95rem' };