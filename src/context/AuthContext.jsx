import { createContext, useState, useEffect, useContext } from 'react';
import { enviarPeticion } from '../services/api';

// 1. Creamos el contexto (la nube de memoria)
const AuthContext = createContext();

// 2. Creamos el Proveedor (el componente que envuelve a toda la app)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la App, revisamos si ya había sesión guardada
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('igo_usuario');
    if (usuarioGuardado) {
      setUser(JSON.parse(usuarioGuardado));
    }
    setLoading(false);
  }, []);

  // Función para Iniciar Sesión
  const login = async (correo, password) => {
    const respuesta = await enviarPeticion({
      accion: 'login',
      correo,
      password
    });

    if (respuesta.exito) {
      setUser(respuesta.usuario);
      // Guardamos en el navegador para que no se borre al recargar
      localStorage.setItem('igo_usuario', JSON.stringify(respuesta.usuario));
      return { exito: true };
    } else {
      return { exito: false, error: respuesta.error };
    }
  };

  // Función para Cerrar Sesión
  const logout = () => {
    setUser(null);
    localStorage.removeItem('igo_usuario');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Hook personalizado para usar esto fácil en cualquier lado
export const useAuth = () => useContext(AuthContext);