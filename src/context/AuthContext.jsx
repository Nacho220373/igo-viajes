import { createContext, useState, useEffect, useContext } from 'react';
import { enviarPeticion } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [profiles, setProfiles] = useState([]); 
  const [activeProfile, setActiveProfile] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('igo_session');
    if (sesionGuardada) {
      try {
        const data = JSON.parse(sesionGuardada);
        // RESTAURACIÓN ROBUSTA: Aseguramos que el rol exista
        const usuarioRecuperado = {
            ...data.user,
            rol: data.user.rol || data.user.rolBase // Compatibilidad hacia atrás
        };
        
        setUser(usuarioRecuperado);
        setProfiles(data.profiles || []);
        
        const lastProfileId = localStorage.getItem('igo_last_profile');
        const lastProfileType = localStorage.getItem('igo_last_type');
        
        // Buscar el perfil exacto por ID y TIPO
        const foundProfile = data.profiles?.find(p => p.id == lastProfileId && p.tipo == lastProfileType);
        
        if (foundProfile) {
          setActiveProfile(foundProfile);
        } else if (data.profiles && data.profiles.length > 0) {
          // Fallback inteligente
          const adminProfile = data.profiles.find(p => p.tipo === 'Administrador');
          setActiveProfile(adminProfile || data.profiles[0]);
        }
      } catch (e) {
        console.error("Error recuperando sesión", e);
        localStorage.removeItem('igo_session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (correo, password) => {
    const respuesta = await enviarPeticion({
      accion: 'login',
      correo,
      password
    });

    if (respuesta.exito) {
      // NORMALIZACIÓN: Creamos un objeto de usuario consistente
      const usuarioNormalizado = {
          ...respuesta.usuario,
          rol: respuesta.usuario.rol || respuesta.usuario.rolBase // Aquí corregimos el problema
      };

      setUser(usuarioNormalizado);
      setProfiles(respuesta.perfiles || []);
      
      // Lógica de selección de perfil por defecto
      let defaultProfile = null;
      if (respuesta.perfiles && respuesta.perfiles.length > 0) {
          defaultProfile = respuesta.perfiles.find(p => p.tipo === 'Administrador');
          if (!defaultProfile) defaultProfile = respuesta.perfiles.find(p => p.tipo === 'Cliente');
          if (!defaultProfile) defaultProfile = respuesta.perfiles[0];
      }

      setActiveProfile(defaultProfile);

      // Persistencia
      const sessionData = { user: usuarioNormalizado, profiles: respuesta.perfiles };
      localStorage.setItem('igo_session', JSON.stringify(sessionData));
      
      if (defaultProfile) {
        localStorage.setItem('igo_last_profile', defaultProfile.id);
        localStorage.setItem('igo_last_type', defaultProfile.tipo);
      }
      
      return { exito: true };
    } else {
      return { exito: false, error: respuesta.error };
    }
  };

  const logout = () => {
    setUser(null);
    setProfiles([]);
    setActiveProfile(null);
    localStorage.removeItem('igo_session');
    localStorage.removeItem('igo_last_profile');
    localStorage.removeItem('igo_last_type');
    window.location.href = '/login';
  };

  const switchProfile = (profileId, profileType) => {
    const target = profiles.find(p => p.id == profileId && p.tipo == profileType);
    if (target) {
      setActiveProfile(target);
      localStorage.setItem('igo_last_profile', target.id);
      localStorage.setItem('igo_last_type', target.tipo);
      
      // Forzamos recarga para limpiar estados de memoria de la vista anterior
      // Esto es crucial cuando cambias de Admin a Cliente para evitar mezclar datos
      window.location.href = '/'; 
    }
  };

  return (
    <AuthContext.Provider value={{ user, profiles, activeProfile, login, logout, switchProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);