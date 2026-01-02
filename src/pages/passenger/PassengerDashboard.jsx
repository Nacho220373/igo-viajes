import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enviarPeticion } from '../../services/api';
import { 
  Map, Calendar, ArrowRightCircle, Plane, Smile, Ticket, Clock, Hotel, Car, Utensils, 
  LayoutGrid, LayoutList, Settings, User, FileText, MapPin, Phone, Save, X, CheckCircle, AlertCircle, Star, MessageSquare, AlertTriangle, Ban
} from 'lucide-react';

export default function PassengerDashboard({ user }) {
  const navigate = useNavigate();
  
  // Estados de Datos
  const [viajes, setViajes] = useState({ activos: [], historial: [] });
  const [viajeEnCurso, setViajeEnCurso] = useState(null);
  const [serviciosEnCurso, setServiciosEnCurso] = useState([]);
  const [perfil, setPerfil] = useState(null); 
  
  // Estados de Catálogos
  const [nacionalidades, setNacionalidades] = useState([]);
  const [paises, setPaises] = useState([]);
  const [listaCalificaciones, setListaCalificaciones] = useState([]);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [activeTab, setActiveTab] = useState('principal'); 
  const [viewMode, setViewMode] = useState('grid');
  
  // Estados Modales
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Modal Calificación
  const [ratingModal, setRatingModal] = useState({ show: false, type: '', id: '', titulo: '', readOnly: false, initialRating: 0, initialComment: '' });
  
  // Modal Reporte (No Realizado)
  const [reportModal, setReportModal] = useState({ show: false, id: '', titulo: '', procesando: false });

  // Estados Alerta Personalizada
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', msg: '', type: 'success' });

  useEffect(() => {
    cargarDatosIniciales();
    cargarCatalogos();
  }, [user]);

  // --- FUNCIÓN DE PARSEO DE FECHA ROBUSTA ---
  const parseFecha = (fechaStr) => {
      if (!fechaStr || fechaStr === 'Pendiente') return null;
      try {
          let dia, mes, anio;
          if (fechaStr.includes('-')) {
              [anio, mes, dia] = fechaStr.split('-').map(Number);
          } else if (fechaStr.includes('/')) {
              [dia, mes, anio] = fechaStr.split('/').map(Number);
          } else {
              const d = new Date(fechaStr);
              if (!isNaN(d)) return d;
              return null;
          }
          const fechaObj = new Date(anio, mes - 1, dia, 0, 0, 0, 0);
          return fechaObj;
      } catch (e) { 
          console.error("Error parseando fecha:", fechaStr, e);
          return null; 
      }
  };

  const cargarDatosIniciales = async () => {
    setLoading(true);
    const respuesta = await enviarPeticion({ 
      accion: 'obtenerDashboardUsuario', 
      idUsuario: user.id, 
      tipoPerfil: 'Pasajero', 
      idPerfil: user.idPasajero 
    });
    
    if (respuesta.exito && respuesta.datos) {
        const activos = respuesta.datos.viajesActivos || [];
        const historial = respuesta.datos.historialViajes || [];
        
        setViajes({ activos, historial });
        setPerfil(respuesta.datos.perfil);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const currentTrip = activos.find(v => {
            const inicio = parseFecha(v.inicio);
            const fin = parseFecha(v.fin);
            if (!inicio || !fin) return false;
            return hoy >= inicio && hoy <= fin;
        });

        if (currentTrip) {
            setViajeEnCurso(currentTrip);
            cargarServicios(currentTrip.id);
        }
    } else {
        console.error("Error cargando dashboard pasajero:", respuesta.error);
    }
    setLoading(false);
  };

  const cargarCatalogos = async () => {
      try {
          const [resNac, resListas] = await Promise.all([
              enviarPeticion({ accion: 'obtenerNacionalidades' }),
              enviarPeticion({ accion: 'obtenerListas' })
          ]);
          if(resNac.exito && resNac.listas) setNacionalidades(resNac.listas.nacionalidades || []);
          if(resListas.exito && resListas.listas) {
              setPaises(resListas.listas.paises || []);
              if (resListas.listas.calificaciones && resListas.listas.calificaciones.length > 0) {
                  setListaCalificaciones(resListas.listas.calificaciones.map(c => parseFloat(c.nombre))); 
              } else {
                  const generated = [];
                  for (let i = 0; i <= 50; i++) {
                      generated.push(i / 10);
                  }
                  setListaCalificaciones(generated);
              }
          }
      } catch (e) { console.error("Error catálogos", e); }
  };

  const cargarServicios = async (idViaje) => {
      setLoadingServicios(true);
      const res = await enviarPeticion({ accion: 'obtenerDetallesViaje', idViaje });
      if (res.exito) {
          setServiciosEnCurso(res.datos || []);
      }
      setLoadingServicios(false);
  };

  const abrirModalPerfil = () => {
      if (perfil) {
          let fechaInput = '';
          if (perfil.fechaNacimiento) {
             const parsed = parseFecha(perfil.fechaNacimiento);
             if (parsed) {
                 const year = parsed.getFullYear();
                 const month = String(parsed.getMonth() + 1).padStart(2, '0');
                 const day = String(parsed.getDate()).padStart(2, '0');
                 fechaInput = `${year}-${month}-${day}`;
             }
          }
          setProfileForm({ ...perfil, fechaNacimiento: fechaInput });
          setShowProfileModal(true);
      }
  };

  const guardarPerfil = async (e) => {
      e.preventDefault();
      setSavingProfile(true);
      const res = await enviarPeticion({ accion: 'editarPasajero', pasajero: profileForm });
      if (res.exito) {
          let nuevaFechaMostrar = profileForm.fechaNacimiento;
          if (nuevaFechaMostrar && nuevaFechaMostrar.includes('-')) {
              const [y, m, d] = nuevaFechaMostrar.split('-');
              nuevaFechaMostrar = `${d}/${m}/${y}`;
          }
          setPerfil({ ...profileForm, fechaNacimiento: nuevaFechaMostrar });
          setShowProfileModal(false);
          showAlert("Perfil Actualizado", "Tus datos han sido guardados correctamente.", "success");
      } else {
          showAlert("Error", "No se pudo actualizar el perfil: " + res.error, "error");
      }
      setSavingProfile(false);
  };

  const abrirCalificar = (type, id, titulo, readOnly = false, initialRating = 0, initialComment = '') => {
      setRatingModal({ show: true, type, id, titulo, readOnly, initialRating, initialComment });
  };

  const guardarCalificacion = async (datos) => {
      if (datos.noRealizado) {
          setReportModal(prev => ({...prev, procesando: true}));
      } else {
          setRatingModal(prev => ({...prev, procesando: true}));
      }
      
      const accion = (ratingModal.show && ratingModal.type === 'viaje') ? 'calificarViaje' : 'calificarServicio';
      
      const idTarget = datos.noRealizado ? reportModal.id : ratingModal.id;
      const estatus = datos.noRealizado ? 3 : 2;
      const calificacionFinal = datos.noRealizado ? 0 : datos.rating;

      const payload = {
          accion,
          id: idTarget,
          calificacion: calificacionFinal,
          comentarios: datos.comentario,
          estatus: estatus
      };

      const res = await enviarPeticion(payload);
      
      if (res.exito) {
          showAlert("¡Gracias!", "Tu respuesta ha sido registrada.", "success");
          
          setRatingModal({ show: false, type: '', id: '', titulo: '', readOnly: false, initialRating: 0, initialComment: '', procesando: false });
          setReportModal({ show: false, id: '', titulo: '', procesando: false });
          
          if (accion === 'calificarViaje') {
              setViajes(prev => ({
                  ...prev,
                  historial: prev.historial.map(v => 
                      v.id === idTarget ? {...v, calificacion: calificacionFinal, comentarios: datos.comentario} : v
                  )
              }));
          } else {
              setServiciosEnCurso(prev => prev.map(s => 
                  s.idServicio === idTarget ? {...s, calificacion: calificacionFinal, comentarios: datos.comentario, estatusId: estatus} : s
              ));
          }
      } else {
          showAlert("Error", res.error || "No se pudo registrar.", "error");
          setRatingModal(prev => ({...prev, procesando: false}));
          setReportModal(prev => ({...prev, procesando: false}));
      }
  };

  const showAlert = (title, msg, type = 'success') => {
      setCustomAlert({ show: true, title, msg, type });
  };

  const closeAlert = () => {
      setCustomAlert({ ...customAlert, show: false });
  };

  const getIconoServicio = (catId) => {
      if (catId == 1) return <Plane size={20} />;
      if (catId == 2) return <Hotel size={20} />;
      if (catId == 3) return <Car size={20} />;
      if (catId == 4) return <Utensils size={20} />;
      return <Ticket size={20} />;
  };

  const getContainerStyle = () => ({
      display: viewMode === 'grid' ? 'grid' : 'flex',
      gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'none',
      flexDirection: viewMode === 'grid' ? 'row' : 'column',
      gap: '20px'
  });

  const serviciosAgenda = serviciosEnCurso.filter(s => {
      if (s.calificacion) return false;
      if (s.estatusId == 3) return false;
      return true;
  });

  const proximosViajes = viajes.activos.filter(v => !viajeEnCurso || v.id !== viajeEnCurso.id);

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary-dark)', fontWeight: '800' }}>
                Hola, {user.nombre.split(' ')[0]}
            </h1>
            <p style={{ color: '#64748b', margin: '5px 0 0' }}>Tu portal de aventuras.</p>
        </div>
        <button onClick={abrirModalPerfil} style={{ background: 'white', border: '1px solid #e2e8f0', color: 'var(--primary)', padding: '10px 16px', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <Settings size={18}/> Mi Perfil
        </button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', marginBottom: '30px', paddingBottom: '5px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto' }}>
            <TabButton active={activeTab === 'principal'} onClick={() => setActiveTab('principal')} label="Principal" icon={<Smile size={18}/>} />
            <TabButton active={activeTab === 'viajes'} onClick={() => setActiveTab('viajes')} label="Mis Viajes" icon={<Plane size={18}/>} />
            <TabButton active={activeTab === 'historial'} onClick={() => setActiveTab('historial')} label="Historial" icon={<Map size={18}/>} />
        </div>

        {(activeTab === 'viajes' || activeTab === 'historial' || (activeTab === 'principal' && !viajeEnCurso)) && (
            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', display: 'flex', gap:'4px' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '6px', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'grid' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='grid'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} style={{ padding: '6px', border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', borderRadius: '8px', color: viewMode === 'list' ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display:'flex', boxShadow: viewMode==='list'?'0 2px 5px rgba(0,0,0,0.05)':'' }}><LayoutList size={18}/></button>
            </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Cargando información...</div>
      ) : (
        <div className="fade-in">
            {activeTab === 'principal' && (
                <>
                    {viajeEnCurso ? (
                        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', margin: 0 }}>📍 Viajando Ahora</h2>
                                <button onClick={() => navigate(`/viaje/${viajeEnCurso.id}`)} style={{ color: 'var(--primary)', background: 'none', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize:'0.9rem' }}>Ver Detalle</button>
                            </div>
                            <div style={{ background: 'var(--primary-gradient)', borderRadius: '20px', padding: '25px', color: 'white', marginBottom: '30px', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'relative', zIndex: 2 }}>
                                    <h1 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', fontWeight:'800' }}>{viajeEnCurso.nombre}</h1>
                                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.95rem', opacity: 0.95, fontWeight:'600' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16}/> {viajeEnCurso.inicio} - {viajeEnCurso.fin}</span>
                                    </div>
                                </div>
                                <Plane size={120} color="white" style={{ position: 'absolute', right: -20, bottom: -40, opacity: 0.15, transform: 'rotate(-15deg)' }} />
                            </div>
                            
                            <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight:'700' }}>Agenda de Servicios</h3>
                            
                            {loadingServicios ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Cargando itinerario...</div>
                            ) : serviciosAgenda.length === 0 ? (
                                <div style={{ background: 'white', padding: '30px', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>No hay servicios activos o pendientes de calificar.</div>
                            ) : (
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    {serviciosAgenda.map((s, idx) => {
                                        const hasEnded = s.fechaFinISO && new Date() > new Date(s.fechaFinISO);
                                        return (
                                            <div key={idx} style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                                <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '12px', color: 'var(--primary)' }}>{getIconoServicio(s.categoriaId)}</div>
                                                <div style={{ flex: 1, minWidth: '150px' }}>
                                                    <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize:'1rem' }}>{s.destino}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', flexDirection:'column', gap: '2px', marginTop: '4px' }}>
                                                        <span style={{display:'flex', alignItems:'center', gap:'5px', fontWeight:'600'}}><Clock size={12}/> {s.fechaInicio}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                    {hasEnded && !s.calificacion && (
                                                        <button 
                                                            onClick={() => abrirCalificar('servicio', s.idServicio, `${s.destino}`)}
                                                            style={{ background: '#fefce8', color: '#ca8a04', border: '1px solid #fef08a', padding: '6px 16px', borderRadius: '50px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                        >
                                                            <Star size={14}/> Calificar
                                                        </button>
                                                    )}
                                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                        <button 
                                                            onClick={() => setReportModal({show: true, id: s.idServicio, titulo: s.destino})}
                                                            style={{ background: 'transparent', color: '#64748b', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                                                            title="Reportar que no se realizó"
                                                        >
                                                            <Ban size={12}/> Cancelar/No realizado
                                                        </button>
                                                        <div style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', fontWeight: '700', border: '1px solid #d1fae5', width:'fit-content' }}>
                                                            Activo
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.5s ease-in' }}>
                            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '24px', border: '1px dashed #e2e8f0', marginBottom: '30px' }}>
                                <div style={{ background: '#f0f9ff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto', color: '#0284c7' }}><Smile size={32}/></div>
                                <h2 style={{ margin: '0 0 8px 0', fontSize:'1.4rem', color: 'var(--text-main)' }}>Sin actividad hoy</h2>
                                <p style={{ color: '#64748b', margin: '0 auto', maxWidth: '300px', fontSize:'0.95rem' }}>No estás viajando actualmente. Aquí tienes tus próximas aventuras.</p>
                            </div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary-dark)', fontSize: '1.2rem', marginBottom: '20px', fontWeight:'800' }}><Plane size={20}/> Próximos Viajes</h3>
                            {proximosViajes.length === 0 ? (
                                <p style={{ color: '#94a3b8', textAlign: 'center', padding:'20px', background:'#f8fafc', borderRadius:'12px' }}>No hay viajes futuros programados.</p>
                            ) : (
                                <div style={getContainerStyle()}>
                                    {proximosViajes.map(v => <ViajeCardSimple key={v.id} viaje={v} navigate={navigate} viewMode={viewMode} />)}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'viajes' && (
                <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                    {viajes.activos.length === 0 ? (
                        <div style={emptyStateStyle}>No tienes viajes próximos agendados.</div>
                    ) : (
                        <div style={getContainerStyle()}>
                            {viajes.activos.map(v => <ViajeCardSimple key={v.id} viaje={v} navigate={navigate} viewMode={viewMode} />)}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'historial' && (
                <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                    {viajes.historial.length === 0 ? (
                        <div style={emptyStateStyle}>Aún no tienes historial de viajes finalizados.</div>
                    ) : (
                        <div style={getContainerStyle()}>
                            {viajes.historial.map(v => (
                                <ViajeCardSimple 
                                    key={v.id} 
                                    viaje={v} 
                                    navigate={navigate} 
                                    historial 
                                    viewMode={viewMode}
                                    onRate={() => abrirCalificar('viaje', v.id, v.nombre)}
                                    onViewRate={() => abrirCalificar('viaje', v.id, v.nombre, true, v.calificacion, v.comentarios)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
      )}

      {/* --- MODAL CALIFICACIÓN --- */}
      {ratingModal.show && (
          <RatingModal 
            isOpen={ratingModal.show}
            onClose={() => setRatingModal({ show: false, type: '', id: '', titulo: '', readOnly: false, initialRating: 0, initialComment: '' })}
            onSave={guardarCalificacion}
            titulo={ratingModal.titulo}
            tipo={ratingModal.type}
            procesando={ratingModal.procesando}
            opciones={listaCalificaciones} 
            readOnly={ratingModal.readOnly}
            initialRating={ratingModal.initialRating}
            initialComment={ratingModal.initialComment}
          />
      )}

      {/* --- MODAL REPORTE (NO REALIZADO) --- */}
      {reportModal.show && (
          <ReportModal 
            isOpen={reportModal.show}
            onClose={() => setReportModal({ show: false, id: '', titulo: '' })}
            onSave={(comentario) => guardarCalificacion({ noRealizado: true, comentario, rating: 0 })}
            titulo={reportModal.titulo}
            procesando={reportModal.procesando}
          />
      )}

      {/* --- MODAL MI PERFIL --- */}
      {showProfileModal && (
        <div style={modalOverlayStyle}>
            <div style={{...modalContentStyle, maxWidth:'600px', maxHeight:'calc(100dvh - 40px)', overflowY:'auto'}}>
                <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', position:'sticky', top:0, background:'white', zIndex:10}}>
                    <h3 style={{margin:0}}>Mi Perfil</h3>
                    <button onClick={()=>setShowProfileModal(false)} style={closeBtnStyle}><X size={18}/></button>
                </div>
                <div style={{padding:'25px'}}>
                    <form onSubmit={guardarPerfil} style={{display:'grid', gap:'15px'}}>
                        <div><SectionLabel icon={<User size={16}/>} title="Datos Personales" style={{marginBottom:'10px'}}/>
                        <div className="grid-responsive-2">
                            <div><label style={labelStyle}>Nombre(s)</label><input required style={inputStyle} value={profileForm.nombre || ''} onChange={e=>setProfileForm({...profileForm, nombre:e.target.value})}/></div><div><label style={labelStyle}>Apellido Paterno</label><input required style={inputStyle} value={profileForm.apellidoP || ''} onChange={e=>setProfileForm({...profileForm, apellidoP:e.target.value})}/></div><div><label style={labelStyle}>Apellido Materno</label><input style={inputStyle} value={profileForm.apellidoM || ''} onChange={e=>setProfileForm({...profileForm, apellidoM:e.target.value})}/></div><div><label style={labelStyle}>Fecha Nacimiento</label><input type="date" style={inputStyle} value={profileForm.fechaNacimiento || ''} onChange={e=>setProfileForm({...profileForm, fechaNacimiento:e.target.value})}/></div><div style={{gridColumn:'1 / -1'}}><label style={labelStyle}>Nacionalidad</label><select style={inputStyle} value={profileForm.nacionalidad || ''} onChange={e=>setProfileForm({...profileForm, nacionalidad:e.target.value})}><option value="">Seleccionar...</option>{nacionalidades.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select></div>
                        </div></div>
                        <div><SectionLabel icon={<FileText size={16}/>} title="Documentos" style={{marginBottom:'10px'}}/>
                        <div className="grid-responsive-2">
                            <div><label style={labelStyle}>Pasaporte</label><input style={inputStyle} value={profileForm.pasaporte || ''} onChange={e=>setProfileForm({...profileForm, pasaporte:e.target.value})}/></div><div><label style={labelStyle}>Visa</label><input style={inputStyle} value={profileForm.visa || ''} onChange={e=>setProfileForm({...profileForm, visa:e.target.value})}/></div>
                        </div></div>
                        <div><SectionLabel icon={<Phone size={16}/>} title="Contacto" style={{marginBottom:'10px'}}/>
                        <div className="grid-responsive-2">
                            <div><label style={labelStyle}>Lada</label><input style={inputStyle} value={profileForm.lada || ''} onChange={e=>setProfileForm({...profileForm, lada:e.target.value})}/></div><div><label style={labelStyle}>Teléfono</label><input style={inputStyle} value={profileForm.telefono || ''} onChange={e=>setProfileForm({...profileForm, telefono:e.target.value})}/></div><div style={{gridColumn:'1 / -1'}}><label style={labelStyle}>Correo</label><input type="email" style={inputStyle} value={profileForm.correo || ''} onChange={e=>setProfileForm({...profileForm, correo:e.target.value})}/></div>
                        </div></div>
                        <button type="submit" disabled={savingProfile} className="btn-primary" style={{marginTop:'15px'}}>{savingProfile ? 'Guardando...' : <><Save size={18}/> Guardar Cambios</>}</button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {customAlert.show && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, maxWidth:'400px', maxHeight:'auto', padding:'30px', textAlign:'center', overflowY:'visible'}}>
            <div style={{ margin: '0 auto 20px', width: '60px', height: '60px', borderRadius: '50%', background: customAlert.type === 'error' ? '#fef2f2' : '#ecfdf5', color: customAlert.type === 'error' ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{customAlert.type === 'error' ? <AlertCircle size={32}/> : <CheckCircle size={32}/>}</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.4rem', color: 'var(--text-main)' }}>{customAlert.title}</h3>
            <p style={{ margin: '0 0 25px', color: '#64748b' }}>{customAlert.msg}</p>
            <button onClick={closeAlert} className="btn-primary" style={{ width: '100%' }}>Entendido</button>
          </div>
        </div>
      )}

    </div>
  );
}

const ReportModal = ({ isOpen, onClose, onSave, titulo, procesando }) => {
    const [comentario, setComentario] = useState('');
    if (!isOpen) return null;
    return (
        <div style={modalOverlayStyle}>
            <div style={{...modalContentStyle, maxWidth: '400px', overflowY:'visible', animation: 'popIn 0.3s'}}>
                <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{background:'#fef2f2', width:'50px', height:'50px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px auto', color:'#ef4444'}}><AlertTriangle size={24}/></div>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>Reportar Servicio</h3>
                    <p style={{ margin: '5px 0 0', color: '#64748b', fontSize:'0.9rem' }}>{titulo}</p>
                </div>
                <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <p style={{margin:0, fontSize:'0.9rem', color:'#475569'}}>¿Por qué no se realizó este servicio?</p>
                    <textarea 
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        placeholder="Describe el motivo (Obligatorio)..."
                        rows="4"
                        disabled={procesando}
                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', resize: 'none', fontFamily: 'inherit', boxSizing:'border-box', background: procesando ? '#f8fafc' : 'white' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={onClose} disabled={procesando} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', color: '#64748b' }}>Cancelar</button>
                        <button onClick={() => { if(!comentario.trim()) return alert("Debes explicar el motivo"); onSave(comentario); }} disabled={procesando} className="btn-primary" style={{ flex: 1, background:'#ef4444', border:'none' }}>
                            {procesando ? 'Guardando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RatingModal = ({ isOpen, onClose, onSave, titulo, tipo, procesando, opciones = [], readOnly = false, initialRating = 0, initialComment = '' }) => {
    const maxRating = opciones.length > 0 ? Math.max(...opciones) : 5.0;
    const [rating, setRating] = useState(readOnly ? initialRating : maxRating); 
    const [comentario, setComentario] = useState(readOnly ? initialComment : '');

    useEffect(() => {
        if (readOnly) {
            setRating(initialRating);
            setComentario(initialComment);
        }
    }, [readOnly, initialRating, initialComment]);

    if (!isOpen) return null;

    const handleSliderChange = (e) => {
        if (readOnly) return;
        const val = parseFloat(e.target.value);
        if (opciones.length > 0) {
            const closest = opciones.reduce((prev, curr) => (Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev));
            setRating(closest);
        } else {
            setRating(val);
        }
    };

    const PartialStar = ({ fillPct }) => (
        <div style={{ position: 'relative', width: '32px', height: '32px' }}>
            <Star size={32} color="#e2e8f0" strokeWidth={2} style={{ position: 'absolute', top: 0, left: 0 }} />
            <div style={{ width: `${fillPct * 100}%`, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
                <Star size={32} color="#fbbf24" fill="#fbbf24" strokeWidth={2} style={{ minWidth: '32px' }} />
            </div>
        </div>
    );

    return (
        <div style={modalOverlayStyle}>
            <div style={{...modalContentStyle, maxWidth: '450px', overflowY:'visible', animation: 'popIn 0.3s'}}>
                <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>{readOnly ? 'Calificación' : `Calificar ${tipo === 'viaje' ? 'Viaje' : 'Servicio'}`}</h3>
                    <p style={{ margin: '5px 0 0', color: 'var(--primary)', fontWeight: '700' }}>{titulo}</p>
                </div>
                
                <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {[1, 2, 3, 4, 5].map((i) => {
                            const visualRating = maxRating > 0 ? (rating / maxRating) * 5 : 0;
                            let fill = 0;
                            if (visualRating >= i) fill = 1;
                            else if (visualRating > i - 1) fill = visualRating - (i - 1);
                            return <PartialStar key={i} fillPct={fill} />;
                        })}
                    </div>
                    
                    <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fbbf24' }}>
                        {rating.toFixed(1)} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '600' }}>/ {maxRating.toFixed(1)}</span>
                    </div>

                    {!readOnly && (
                        <div style={{ width: '100%', padding: '0 10px' }}>
                            <input type="range" min="0" max={maxRating} step="0.1" value={rating} onChange={handleSliderChange} style={{ width: '100%', cursor: 'pointer', accentColor: '#fbbf24' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '5px', fontWeight: '600' }}><span>0.0</span><span>Desliza para ajustar</span><span>{maxRating.toFixed(1)}</span></div>
                        </div>
                    )}

                    <div style={{ width: '100%', textAlign: 'left' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#64748b', marginBottom: '8px', fontSize: '0.9rem' }}><MessageSquare size={16}/> Comentarios</label>
                        <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="¿Qué te pareció la experiencia?" rows="3" disabled={readOnly} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', resize: 'none', fontFamily: 'inherit', boxSizing:'border-box', background: readOnly ? '#f8fafc' : 'white', color: readOnly ? '#334155' : 'inherit' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        <button onClick={onClose} disabled={procesando} className={readOnly ? "btn-primary" : ""} style={readOnly ? {width: '100%'} : { flex: 1, padding: '12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', color: '#64748b' }}>{readOnly ? 'Cerrar' : 'Cancelar'}</button>
                        {!readOnly && <button onClick={() => onSave({ rating, comentario })} disabled={procesando} className="btn-primary" style={{ flex: 1 }}>{procesando ? 'Guardando...' : 'Enviar'}</button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SectionLabel = ({ icon, title, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', ...style }}>
      <div style={{ color: 'var(--primary-light)' }}>{icon}</div>
      <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
  </div>
);

const TabButton = ({ active, onClick, label, icon }) => (
    <button onClick={onClick} style={{ background: 'transparent', border: 'none', padding: '10px 16px', borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent', color: active ? 'var(--primary)' : '#94a3b8', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
        {icon} {label}
    </button>
);

const ViajeCardSimple = ({ viaje, navigate, historial, viewMode = 'grid', onRate, onViewRate }) => {
    const getEtiqueta = () => {
        if (historial) return 'Finalizado';
        if (!viaje.inicio) return 'Próximamente';
        try {
            let inicioDate;
            if (viaje.inicio.includes('-')) {
                const [y, m, d] = viaje.inicio.split('-').map(Number);
                inicioDate = new Date(y, m - 1, d);
            } else {
                const [d, m, y] = viaje.inicio.split('/').map(Number);
                inicioDate = new Date(y, m - 1, d);
            }
            const hoy = new Date();
            hoy.setHours(0,0,0,0);
            return hoy >= inicioDate ? 'En Curso' : 'Próximamente';
        } catch(e) { return 'Próximamente'; }
    };

    const etiqueta = getEtiqueta();
    const bg = etiqueta === 'En Curso' ? '#ecfdf5' : (historial ? '#f1f5f9' : '#eff6ff');
    const color = etiqueta === 'En Curso' ? '#10b981' : (historial ? '#64748b' : 'var(--primary)');
    const border = etiqueta === 'En Curso' ? '#d1fae5' : (historial ? '#e2e8f0' : '#dbeafe');

    return (
        <div className="dashboard-card" style={{ cursor: 'pointer', transition: 'transform 0.2s', opacity: historial ? 0.9 : 1, padding: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', alignItems: viewMode === 'list' ? 'center' : 'stretch', minHeight: viewMode === 'list' ? 'auto' : '220px' }} onClick={() => navigate(`/viaje/${viaje.id}`)} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ padding: viewMode === 'list' ? '12px 20px' : '25px', flex: 1, display: viewMode === 'list' ? 'flex' : 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', alignItems: viewMode === 'list' ? 'center' : 'flex-start', justifyContent: viewMode === 'list' ? 'flex-start' : 'space-between', gap: '15px' }}>
                <div style={{ marginBottom: viewMode === 'list' ? 0 : 'auto', width: '100%' }}>
                    <div style={{display:'flex', justifyContent: viewMode==='list'?'flex-start':'space-between', alignItems:'center', width:'100%', marginBottom:'10px'}}>
                        <span style={{ background: bg, color: color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{etiqueta}</span>
                        {viewMode === 'grid' && <Plane size={24} color="#e2e8f0" />}
                    </div>
                    <h3 style={{ margin: '0 0 5px 0', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight:'800', lineHeight:'1.2' }}>{viaje.nombre}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem', fontWeight:'600' }}><Calendar size={16} color="var(--primary)"/> {viaje.inicio}</div>
            </div>
            <div style={{ padding: viewMode === 'list' ? '12px 20px' : '15px 20px', borderTop: viewMode === 'list' ? 'none' : '1px solid #f1f5f9', borderLeft: viewMode === 'list' ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: viewMode === 'list' ? 'flex-end' : 'center', alignItems: 'center', color: viewMode === 'list' ? '#64748b' : 'var(--primary)', fontSize: '0.85rem', background: viewMode === 'list' ? 'transparent' : '#f8fafc', whiteSpace: 'nowrap', fontWeight: '700', gap: '10px' }}>
                {historial && (viaje.calificacion ? (<div onClick={(e) => { e.stopPropagation(); onViewRate(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}><div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fbbf24', fontSize: '0.9rem', fontWeight: '800' }}>{viaje.calificacion} <Star size={14} fill="#fbbf24" strokeWidth={0} /></div>{viaje.comentarios && <span style={{color: '#94a3b8', fontSize: '0.7rem', fontStyle: 'italic', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>"{viaje.comentarios}"</span>}</div>) : (<button onClick={(e) => { e.stopPropagation(); onRate(); }} style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12}/> Calificar</button>))}
                {viewMode === 'list' ? (<div style={{display:'flex', alignItems:'center', gap:'5px'}}>Ver detalles <ArrowRightCircle size={18}/></div>) : (<div style={{width:'100%', textAlign:'center'}}>{!historial && 'Ver Itinerario Completo'}</div>)}
            </div>
        </div>
    );
};

const emptyStateStyle = { background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', fontSize: '0.95rem', fontWeight: '600' };
// CAMBIO IMPORTANTE: Modal Style con calc(100dvh - 40px)
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContentStyle = { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const inputStyle = { width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '1rem' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };