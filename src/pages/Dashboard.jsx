import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, User, Briefcase, Shield, Smile, CheckCircle, AlertCircle, HelpCircle, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { enviarPeticion } from '../services/api';

// IMPORTS DE LOS DASHBOARDS ESPECIALIZADOS
import ClientDashboard from './client/ClientDashboard';
import PassengerDashboard from './passenger/PassengerDashboard';
import AdminDashboardContent from './admin/AdminDashboardContent'; 
import Loader from '../components/Loader';

// Componente Interno: Selector de Perfiles
const ProfileSwitcher = () => {
  const { profiles, activeProfile, switchProfile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!activeProfile) return null;

  const getIcon = (tipo) => {
    if (tipo === 'Administrador') return <Shield size={16} />;
    if (tipo === 'Cliente') return <Briefcase size={16} />;
    return <User size={16} />;
  };

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          background: 'white', border: '1px solid #e2e8f0', padding: '8px 16px', 
          borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', 
          gap: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', minWidth: '220px', justifyContent:'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
          <div style={{ color: 'var(--primary)' }}>{getIcon(activeProfile.tipo)}</div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>{activeProfile.tipo}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeProfile.nombre}</div>
          </div>
        </div>
        <ChevronDown size={16} color="#64748b" />
      </button>

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '120%', right: 0, width: '260px', 
          background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', 
          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden', padding: '8px' 
        }}>
          <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>CAMBIAR CUENTA</div>
          {profiles.map((p) => (
            <div 
              key={`${p.tipo}-${p.id}`} 
              onClick={() => { switchProfile(p.id, p.tipo); setIsOpen(false); }}
              style={{ 
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', 
                cursor: 'pointer', borderRadius: '8px', transition: '0.2s',
                background: (activeProfile.id === p.id && activeProfile.tipo === p.tipo) ? '#f0f9ff' : 'transparent',
                border: (activeProfile.id === p.id && activeProfile.tipo === p.tipo) ? '1px solid #bae6fd' : '1px solid transparent'
              }}
              onMouseEnter={(e) => { if(activeProfile.id !== p.id) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={(e) => { if(activeProfile.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ color: (activeProfile.id === p.id && activeProfile.tipo === p.tipo) ? 'var(--primary)' : '#64748b' }}>{getIcon(p.tipo)}</div>
              <div style={{ flex: 1 }}>
                 <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>{p.nombre}</div>
                 <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.tipo}</div>
              </div>
              {(activeProfile.id === p.id && activeProfile.tipo === p.tipo) && <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'var(--primary)'}}></div>}
            </div>
          ))}
          <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }}></div>
          <button onClick={logout} style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { user, activeProfile, profiles } = useAuth();
  const [creatingPassenger, setCreatingPassenger] = useState(false);
  
  // ESTADO PARA ALERTAS PERSONALIZADAS
  const [alertConfig, setAlertConfig] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });

  // Verificamos si el usuario ya tiene un perfil de Pasajero
  const hasPassengerProfile = profiles.some(p => p.tipo === 'Pasajero');

  // --- MANEJO DE ALERTAS ---
  const showAlert = (title, message, type = 'info') => {
      setAlertConfig({ show: true, type, title, message, onConfirm: null });
  };

  const showConfirm = (title, message, onConfirm) => {
      setAlertConfig({ show: true, type: 'confirm', title, message, onConfirm });
  };

  const closeAlert = () => {
      // Si es mensaje de éxito de creación, recargamos al cerrar
      if (alertConfig.title === "¡Perfil Activado!" && alertConfig.type === 'success') {
          window.location.reload();
      }
      setAlertConfig({ ...alertConfig, show: false });
  };

  // --- LÓGICA DE ACTIVACIÓN ---
  const solicitarActivacion = () => {
      showConfirm(
          "¿Activar modo viajero?",
          "Esto creará un perfil de pasajero vinculado a tu cuenta actual para que puedas ver tus viajes personales.",
          crearPerfilPasajero
      );
  };

  const crearPerfilPasajero = async () => {
      setCreatingPassenger(true);
      
      const res = await enviarPeticion({ 
          accion: 'crearPerfilPasajeroPropio', 
          idUsuario: user.id, 
          nombre: user.nombre 
      });

      if (res.exito) {
          // --- PARCHE DE SESIÓN (SOLUCIÓN CLAVE) ---
          // 1. Leemos la sesión actual
          const currentSession = JSON.parse(localStorage.getItem('igo_session') || '{}');
          // 2. Si el backend nos devolvió los perfiles nuevos, actualizamos la sesión
          if (res.perfiles) {
              currentSession.profiles = res.perfiles;
              localStorage.setItem('igo_session', JSON.stringify(currentSession));
          }
          
          showAlert("¡Perfil Activado!", "Tu perfil de viajero ha sido creado. La página se recargará para mostrar tu nueva opción.", "success");
      } else {
          showAlert("Error", res.error || "No se pudo crear el perfil.", "error");
      }
      setCreatingPassenger(false);
  };

  if (!user || !activeProfile) return <Loader message="Cargando perfil..." />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* BARRA SUPERIOR DE PERFIL */}
      <div style={{ 
        background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '15px 20px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap:'10px'
      }}>
         {/* BOTÓN DE AUTO-CREACIÓN DE PERFIL PASAJERO */}
         <div>
            {(!hasPassengerProfile && activeProfile.tipo !== 'Administrador') && (
                <button 
                    onClick={solicitarActivacion}
                    disabled={creatingPassenger}
                    style={{
                        background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                        padding: '8px 16px', borderRadius: '50px', cursor: 'pointer',
                        fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <Smile size={16}/> {creatingPassenger ? 'Activando...' : 'Activar mi modo Viajero'}
                </button>
            )}
         </div>

         <ProfileSwitcher />
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1 }}>
        {activeProfile.tipo === 'Administrador' && ( <AdminDashboardContent /> )}

        {activeProfile.tipo === 'Cliente' && (
          <ClientDashboard 
              user={{ ...user, idCliente: activeProfile.id, nombre: activeProfile.nombre, rol: 'Cliente' }} 
          />
        )}

        {activeProfile.tipo === 'Pasajero' && (
          <PassengerDashboard 
              user={{ ...user, idPasajero: activeProfile.id, nombre: activeProfile.nombre, rol: 'Pasajero' }} 
          />
        )}
      </div>

      {/* MODAL DE ALERTAS PERSONALIZADO */}
      {alertConfig.show && (
        <div style={modalOverlayStyle}>
            <div style={{ ...modalContentStyle, maxWidth: '400px', padding: '30px', textAlign: 'center' }}>
                <div style={{ 
                    margin: '0 auto 20px', width: '60px', height: '60px', borderRadius: '50%', 
                    background: alertConfig.type === 'error' ? '#fef2f2' : (alertConfig.type === 'success' ? '#ecfdf5' : '#eff6ff'), 
                    color: alertConfig.type === 'error' ? '#ef4444' : (alertConfig.type === 'success' ? '#10b981' : '#2563eb'), 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                    {alertConfig.type === 'error' ? <AlertCircle size={32}/> : (alertConfig.type === 'success' ? <CheckCircle size={32}/> : (alertConfig.type === 'confirm' ? <HelpCircle size={32}/> : <AlertCircle size={32}/>))}
                </div>
                <h3 style={{ margin: '0 0 10px', fontSize: '1.4rem', color: 'var(--text-main)' }}>{alertConfig.title}</h3>
                <p style={{ margin: '0 0 25px', color: '#64748b' }}>{alertConfig.message}</p>
                
                {alertConfig.type === 'confirm' ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={closeAlert} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', color: '#64748b' }}>Cancelar</button>
                        <button onClick={() => { alertConfig.onConfirm(); closeAlert(); }} style={{ flex: 1, padding: '12px', border: 'none', background: 'var(--primary)', color: 'white', borderRadius: '50px', fontWeight: '700', cursor: 'pointer' }}>Sí, Activar</button>
                    </div>
                ) : (
                    <button onClick={closeAlert} className="btn-primary" style={{ width: '100%' }}>Entendido</button>
                )}
            </div>
        </div>
      )}
    </div>
  );
}

// Estilos necesarios para el modal (reutilizados para consistencia)
const modalOverlayStyle = { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', 
    zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' 
};
const modalContentStyle = { 
    background: 'white', borderRadius: '24px', width: '100%', 
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
    display: 'flex', flexDirection: 'column' 
};