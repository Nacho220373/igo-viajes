import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { enviarPeticion } from '../services/api';
import { useNavigate } from 'react-router-dom'; // <--- 1. IMPORTAR
import { LogOut, Map, User as UserIcon, Calendar, ArrowRightCircle } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [viajes, setViajes] = useState([]);
  const [loadingViajes, setLoadingViajes] = useState(true);
  const navigate = useNavigate(); // <--- 2. INICIALIZAR

  useEffect(() => {
    const cargarViajes = async () => {
      if (!user) return;
      setLoadingViajes(true);
      const respuesta = await enviarPeticion({
        accion: 'obtenerViajes',
        idUsuario: user.id,
        rol: user.rol
      });
      if (respuesta.exito) {
        setViajes(respuesta.datos);
      }
      setLoadingViajes(false);
    };
    cargarViajes();
  }, [user]);

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
      
      {/* TARJETA DE BIENVENIDA (Igual que antes...) */}
      <div className="login-card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1e3a8a' }}>Hola, {user?.nombre}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', color: '#6b7280' }}>
            <UserIcon size={16} />
            <span style={{ fontSize: '0.9rem' }}>{user?.rol}</span>
          </div>
        </div>
        <button onClick={logout} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
          <LogOut size={18} /> Salir
        </button>
      </div>

      <h2 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Map /> {user?.rol === 'Administrador' ? 'Todos los Viajes (Admin)' : 'Mis Aventuras'}
      </h2>

      {loadingViajes ? (
        <div style={{ color: 'white', textAlign: 'center', padding: '40px', fontSize: '1.2rem' }}>🚀 Buscando tus viajes en la nube...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {viajes.length === 0 && (
            <div className="login-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>No tienes viajes registrados por ahora.</p>
            </div>
          )}

          {viajes.map((viaje) => (
            <div key={viaje.idViaje} className="login-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#eff6ff', padding: '20px', borderBottom: '1px solid #dbeafe' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#1e3a8a', fontSize: '1.2rem' }}>{viaje.nombre}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontSize: '0.9rem' }}>
                  <Calendar size={14} />
                  <span>{viaje.fecha}</span>
                </div>
              </div>

              <div style={{ padding: '20px', flex: 1 }}>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>
                  Destino: <strong style={{ color: '#374151' }}>{viaje.destino}</strong>
                </p>
              </div>

              <div style={{ padding: '15px 20px', borderTop: '1px solid #f3f4f6', marginTop: 'auto' }}>
                 {/* 3. AGREGAR EL ONCLICK AQUÍ */}
                 <button 
                   onClick={() => navigate(`/viaje/${viaje.idViaje}`)}
                   style={{ 
                     width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px',
                     background: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer',
                     display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                   }}
                 >
                   Ver Detalles <ArrowRightCircle size={16} />
                 </button>
              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}