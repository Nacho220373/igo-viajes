import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ViajeDetalle from './pages/ViajeDetalle'; // <--- NUEVO

const RutaProtegida = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: 'white' }}>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rutas Privadas */}
          <Route path="/" element={
            <RutaProtegida>
              <Dashboard />
            </RutaProtegida>
          } />

          {/* NUEVA RUTA: Fíjate en el :id, eso permite urls dinámicas */}
          <Route path="/viaje/:id" element={
            <RutaProtegida>
              <ViajeDetalle />
            </RutaProtegida>
          } />
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;