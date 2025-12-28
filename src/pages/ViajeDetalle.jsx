import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enviarPeticion } from '../services/api';
import { useAuth } from '../context/AuthContext'; 
import { 
  ArrowLeft, Calendar, MapPin, Hash, Plane, Hotel, Car, Utensils, Ticket, 
  Wallet, TrendingUp, Tag, XCircle, Star, Clock, CheckCircle, MessageSquare
} from 'lucide-react';

export default function ViajeDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); 
  
  // Estados
  const [activeTab, setActiveTab] = useState('itinerario');
  const [viaje, setViaje] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Catálogos para mapear IDs a Nombres
  const [listas, setListas] = useState({ categorias: [], estatus: [] });

  useEffect(() => {
    cargarDatosCompletos();
  }, [id]);

  const cargarDatosCompletos = async () => {
    setLoading(true);
    try {
      const [resInfo, resServicios, resFinanzas, resListas] = await Promise.all([
        enviarPeticion({ accion: 'obtenerInfoViaje', idViaje: id }),
        enviarPeticion({ accion: 'obtenerDetallesViaje', idViaje: id }),
        enviarPeticion({ accion: 'obtenerFinanzasViaje', idViaje: id }),
        enviarPeticion({ accion: 'obtenerListas' })
      ]);

      if (resInfo.exito) setViaje(resInfo.viaje);
      if (resServicios.exito) setServicios(resServicios.datos);
      if (resFinanzas.exito) setTransacciones(resFinanzas.datos);
      if (resListas.exito && resListas.listas) setListas(resListas.listas);

    } catch (error) {
      console.error("Error cargando detalles del viaje:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS UI ---
  const getIconoCategoria = (catId) => {
    const catNombre = listas.categorias.find(c => c.id == catId)?.nombre?.toLowerCase() || '';
    if (catNombre.includes('vuelo')) return <Plane size={20} />;
    if (catNombre.includes('hospedaje') || catNombre.includes('hotel')) return <Hotel size={20} />;
    if (catNombre.includes('traslado') || catNombre.includes('auto')) return <Car size={20} />;
    if (catNombre.includes('alimento')) return <Utensils size={20} />;
    return <Ticket size={20} />;
  };

  const getNombreCategoria = (id) => listas.categorias.find(c => c.id == id)?.nombre || 'Servicio';
  
  const getInfoEstatus = (id) => {
      const nombre = listas.estatus.find(e => e.id == id)?.nombre || 'Pendiente';
      const lower = nombre.toLowerCase();
      
      if (lower.includes('cancelado')) return { nombre, bg: '#fef2f2', color: '#ef4444' }; 
      if (lower.includes('realizado') || lower.includes('reservado') || lower.includes('pagado')) return { nombre, bg: '#ecfdf5', color: '#10b981' }; 
      if (lower.includes('confirmado')) return { nombre, bg: '#eff6ff', color: '#2563eb' }; 
      
      return { nombre, bg: '#f1f5f9', color: '#64748b' }; 
  };

  const getEstadoViaje = () => {
      if (!viaje || !viaje.fechaFin) return { texto: 'Sin fecha', active: false };
      try {
          const partes = viaje.fechaFin.split('/');
          const fin = new Date(partes[2], partes[1] - 1, partes[0], 23, 59, 59);
          const hoy = new Date();
          
          if (fin >= hoy) {
              return { texto: 'Expediente Activo', active: true };
          } else {
              return { texto: 'Viaje Concluido', active: false };
          }
      } catch (e) {
          return { texto: 'Fecha Inválida', active: false };
      }
  };

  const calcularFinanzas = () => {
    let pagado = 0; 
    let costo = 0;  

    transacciones.forEach(t => {
      const monto = parseFloat(String(t.monto).replace(/[^0-9.-]+/g,"")) || 0;
      if (t.tipoId == 1 || t.tipoId == 3) pagado += monto;
      if (t.tipoId == 2) costo += monto;
    });

    return { pagado, costo, saldo: pagado - costo };
  };

  const totales = calcularFinanzas();
  const estadoViaje = getEstadoViaje();

  if (loading) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
        <p>Cargando tu experiencia...</p>
      </div>
    );
  }

  if (!viaje) {
    return (
        <div className="dashboard-container">
            <button onClick={() => navigate(-1)} style={{ marginBottom: '20px', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}><ArrowLeft size={16}/> Volver</button>
            <div style={{ padding: '40px', background: 'white', borderRadius: '20px', textAlign: 'center' }}>
                <h3>No se encontró información del viaje.</h3>
            </div>
        </div>
    );
  }

  const puedeVerFinanzas = user?.rol !== 'Pasajero';

  return (
    <div className="dashboard-container">
      
      {/* HEADER CON BOTÓN VOLVER */}
      <div style={{ marginBottom: '25px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ 
            background: 'white', border: '1px solid #e2e8f0', color: '#64748b', 
            display: 'flex', alignItems: 'center', gap: '8px', 
            cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700',
            padding: '8px 16px', borderRadius: '50px', marginBottom: '15px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
          }}
        >
          <ArrowLeft size={16} /> Volver al Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--primary-dark)', fontWeight: '800' }}>
                {viaje.nombre}
                </h1>
                <p style={{ margin: '5px 0 0', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                    <Calendar size={16}/> {viaje.fechaInicio} - {viaje.fechaFin}
                </p>
            </div>
            
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <div style={{ 
                    background: estadoViaje.active ? '#ecfdf5' : '#f1f5f9', 
                    color: estadoViaje.active ? '#10b981' : '#64748b', 
                    padding: '8px 16px', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', 
                    display: 'flex', alignItems: 'center', gap: '6px' 
                }}>
                    {estadoViaje.active ? <CheckCircle size={18}/> : <XCircle size={18}/>} 
                    {estadoViaje.texto}
                </div>
            </div>
        </div>

        {/* CALIFICACIÓN GENERAL DEL VIAJE (NUEVO) */}
        {viaje.calificacion && (
            <div style={{ marginTop: '20px', background: '#fffbeb', padding: '15px 20px', borderRadius: '16px', border: '1px solid #fcd34d', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#b45309', minWidth: '80px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', fontSize: '1.4rem' }}>
                        {viaje.calificacion} <Star size={22} fill="#b45309" strokeWidth={0}/>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valoración</span>
                </div>
                {viaje.comentarios && (
                    <div style={{ borderLeft: '2px solid #fcd34d', paddingLeft: '20px', color: '#92400e', fontSize: '0.95rem', fontStyle: 'italic', flex: 1 }}>
                        "{viaje.comentarios}"
                    </div>
                )}
            </div>
        )}
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '25px' }}>
        <button 
            onClick={() => setActiveTab('itinerario')}
            style={{ 
                padding: '12px 5px', background: 'transparent', border: 'none', 
                borderBottom: activeTab === 'itinerario' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'itinerario' ? 'var(--primary)' : '#64748b',
                fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
        >
            <Ticket size={18}/> Itinerario
        </button>
        
        {puedeVerFinanzas && (
            <button 
                onClick={() => setActiveTab('finanzas')}
                style={{ 
                    padding: '12px 5px', background: 'transparent', border: 'none', 
                    borderBottom: activeTab === 'finanzas' ? '3px solid var(--primary)' : '3px solid transparent',
                    color: activeTab === 'finanzas' ? 'var(--primary)' : '#64748b',
                    fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}
            >
                <Wallet size={18}/> Finanzas
            </button>
        )}
      </div>

      {/* CONTENIDO: ITINERARIO */}
      {activeTab === 'itinerario' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {servicios.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '20px', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
                    <Plane size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p>No hay servicios registrados en este itinerario aún.</p>
                </div>
            ) : (
                servicios.map((s, idx) => {
                    const estatusInfo = getInfoEstatus(s.estatusId);
                    return (
                        <div key={idx} className="dashboard-card" style={{ padding: '20px', flexDirection: 'column' }}>
                            
                            <div style={{display:'flex', gap:'20px', alignItems:'flex-start', flexWrap:'wrap'}}>
                                <div style={{ background: '#f8fafc', color: 'var(--primary)', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    {getIconoCategoria(s.categoriaId)}
                                </div>

                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '5px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{getNombreCategoria(s.categoriaId)}</h3>
                                        
                                        <span style={{ 
                                            fontSize: '0.75rem', 
                                            background: estatusInfo.bg, 
                                            color: estatusInfo.color, 
                                            padding: '4px 10px', borderRadius: '20px', fontWeight: '700' 
                                        }}>
                                            {estatusInfo.nombre}
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', color: '#475569', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={14} color="var(--primary)"/> {s.destino}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={14} color="var(--primary)"/> {s.fechaInicio}
                                        </div>
                                        {s.clave && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Hash size={14} color="var(--primary)"/> Reserva: <span style={{ fontWeight: '600' }}>{s.clave}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div style={{ marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                                        <span style={{ fontWeight: '700' }}>Pasajero:</span> {s.nombrePasajero}
                                    </div>
                                </div>
                            </div>

                            {/* MOSTRAR CALIFICACIÓN SI EXISTE (ACTUALIZADO) */}
                            {s.calificacion && (
                                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fffbeb', padding: '4px 10px', borderRadius: '8px', color: '#b45309', fontWeight: '800', fontSize: '0.9rem' }}>
                                        {s.calificacion} <Star size={14} fill="#b45309" strokeWidth={0}/>
                                    </div>
                                    <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>Opinión del Pasajero</span>
                                        {s.comentarios && (
                                            <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', display:'flex', alignItems:'center', gap:'6px' }}>
                                                "{s.comentarios}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
      )}

      {/* CONTENIDO: FINANZAS (Protegido) */}
      {activeTab === 'finanzas' && puedeVerFinanzas && (
        <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginBottom: '5px' }}><TrendingUp size={20}/> <span style={{fontWeight:'700'}}>Total Pagado</span></div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)' }}>${totales.pagado.toLocaleString()}</div>
                    <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Abonos realizados</p>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b', marginBottom: '5px' }}><Tag size={20}/> <span style={{fontWeight:'700'}}>Costo del Viaje</span></div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)' }}>${totales.costo.toLocaleString()}</div>
                    <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Valor de los servicios</p>
                </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '15px' }}>Historial de Movimientos</h3>
            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
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
                            <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No hay movimientos registrados para este viaje.</td></tr>
                        ) : (
                            transacciones.map((t, i) => {
                                const esPago = (t.tipoId == 1 || t.tipoId == 3);
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '15px' }}>{t.fecha}</td>
                                        <td style={{ padding: '15px', fontWeight: '600' }}>{t.concepto}</td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ 
                                                background: esPago ? '#ecfdf5' : '#fffbeb', 
                                                color: esPago ? '#10b981' : '#f59e0b',
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700'
                                            }}>
                                                {esPago ? 'Abono / Pago' : 'Cargo / Servicio'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: '700', color: esPago ? '#10b981' : 'var(--text-main)' }}>
                                            ${t.monto}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

    </div>
  );
}