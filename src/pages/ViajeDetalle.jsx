import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enviarPeticion } from '../services/api';
import { ArrowLeft, Calendar, MapPin, Hash, CheckCircle } from 'lucide-react';

export default function ViajeDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDetalles = async () => {
      setLoading(true);
      const respuesta = await enviarPeticion({
        accion: 'obtenerDetallesViaje',
        idViaje: id
      });

      if (respuesta.exito) {
        setServicios(respuesta.datos);
      }
      setLoading(false);
    };

    cargarDetalles();
  }, [id]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      {/* Botón Volver */}
      <button 
        onClick={() => navigate('/')}
        style={{ 
          background: 'none', border: 'none', color: 'white', 
          display: 'flex', alignItems: 'center', gap: '8px', 
          marginBottom: '20px', cursor: 'pointer', fontSize: '1rem',
          fontWeight: '500'
        }}
      >
        <ArrowLeft size={20} /> Volver a mis viajes
      </button>

      <h1 style={{ color: 'white', marginBottom: '20px', fontSize: '1.5rem' }}>
        Itinerario del Viaje
      </h1>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
          Cargando detalles...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {servicios.length === 0 && (
             <div className="login-card" style={{ textAlign: 'center', padding: '40px' }}>
               <p style={{ color: '#6b7280' }}>No hay servicios registrados para este viaje aún.</p>
             </div>
          )}

          {servicios.map((servicio) => (
            <div key={servicio.idServicio} className="login-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
              
              {/* Barra lateral de color según categoría */}
              <div style={{ width: '6px', background: servicio.categoria.includes('Vuelo') ? '#3b82f6' : '#10b981' }}></div>
              
              <div style={{ padding: '20px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, color: '#111827', fontSize: '1.1rem' }}>{servicio.categoria}</h3>
                  {servicio.estatus && (
                    <span style={{ fontSize: '0.8rem', background: '#d1fae5', color: '#059669', padding: '2px 8px', borderRadius: '12px' }}>
                      {servicio.estatus}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563', fontSize: '0.9rem' }}>
                    <MapPin size={16} color="#6b7280" />
                    <span>{servicio.destino}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563', fontSize: '0.9rem' }}>
                    <Calendar size={16} color="#6b7280" />
                    <span>{servicio.fecha}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563', fontSize: '0.9rem', gridColumn: '1 / -1' }}>
                    <Hash size={16} color="#6b7280" />
                    <span>Reserva: <strong style={{ color: '#111827' }}>{servicio.clave}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}