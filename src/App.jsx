import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext'; 
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DetalleViaje from './pages/ViajeDetalle'; 
import Invite from './pages/Invite'; 

import AdminClientes from './pages/admin/AdminClientes';
import AdminPasajeros from './pages/admin/AdminPasajeros';
import AdminViajes from './pages/admin/AdminViajes';
import AdminDetalleViaje from './pages/admin/AdminDetalleViaje';
import AdminProveedores from './pages/admin/AdminProveedores';
import AdminCotizaciones from './pages/admin/AdminCotizaciones';
import AdminGuard from './components/AdminGuard';
import MobileWarning from './components/MobileWarning'; // <--- IMPORTAR
import Loader from './components/Loader';

const RutaProtegida = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        {/* COMPONENTE DE AVISO MÓVIL (Global) */}
        <MobileWarning />
        
        <BrowserRouter>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/invite" element={<Invite />} />
            
            {/* Rutas Privadas Generales */}
            <Route path="/" element={
              <RutaProtegida>
                <Dashboard />
              </RutaProtegida>
            } />

            <Route path="/viaje/:id" element={
              <RutaProtegida>
                <DetalleViaje />
              </RutaProtegida>
            } />

            {/* --- ZONA ADMINISTRATIVA --- */}
            <Route path="/admin/clientes" element={<RutaProtegida><AdminGuard><AdminClientes /></AdminGuard></RutaProtegida>} />
            <Route path="/admin/pasajeros" element={<RutaProtegida><AdminGuard><AdminPasajeros /></AdminGuard></RutaProtegida>} />
            <Route path="/admin/viajes" element={<RutaProtegida><AdminGuard><AdminViajes /></AdminGuard></RutaProtegida>} />
            <Route path="/admin/viaje/:id" element={<RutaProtegida><AdminGuard><AdminDetalleViaje /></AdminGuard></RutaProtegida>} />
            <Route path="/admin/proveedores" element={<RutaProtegida><AdminGuard><AdminProveedores /></AdminGuard></RutaProtegida>} />
            <Route path="/admin/cotizaciones" element={<RutaProtegida><AdminGuard><AdminCotizaciones /></AdminGuard></RutaProtegida>} />
            
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;