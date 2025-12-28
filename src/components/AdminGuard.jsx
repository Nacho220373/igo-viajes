import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminGuard({ children }) {
  const { user, activeProfile, loading } = useAuth();

  if (loading) return <div style={{padding:'50px', textAlign:'center', color:'#94a3b8'}}>Verificando permisos...</div>;

  // 1. Verificamos que haya usuario
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Verificamos que el PERFIL ACTIVO sea de tipo Administrador
  // Esto es más seguro y coherente con la lógica multi-perfil
  const esAdmin = activeProfile?.tipo === 'Administrador' || user.rol === 'Administrador' || user.rol === 'Asistente';

  if (!esAdmin) {
    // Si no tiene permiso, lo mandamos al dashboard (que lo redirigirá a su vista correcta)
    return <Navigate to="/" replace />;
  }

  return children;
}