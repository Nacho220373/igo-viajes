import { createContext, useState, useEffect, useContext } from 'react';
import { enviarPeticion } from '../services/api';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    color_primario: '#2563eb', // Azul default
    nombre_empresa: 'IGO Viajes',
    logo_url: null,
    app_ico_url: null // AÑADIDO: Estado para el icono de la app
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const cargarConfig = async () => {
      // 1. Carga rápida desde caché local
      const configGuardada = localStorage.getItem('igo_config');
      if (configGuardada) {
        const datos = JSON.parse(configGuardada);
        setConfig(datos);
        aplicarEstilos(datos); 
      }

      // 2. Carga fresca desde el Backend
      try {
        const respuesta = await enviarPeticion({ accion: 'obtenerConfiguracion' });
        if (respuesta.exito) {
          setConfig(respuesta.config);
          localStorage.setItem('igo_config', JSON.stringify(respuesta.config));
          aplicarEstilos(respuesta.config); 
        }
      } catch (error) {
        console.error("Error cargando config", error);
      } finally {
        setLoadingConfig(false);
      }
    };

    cargarConfig();
  }, []);

  // Función mejorada para inyectar variables CSS e ICONOS
  const aplicarEstilos = (datos) => {
    const root = document.documentElement.style;
    
    // 1. COLORES
    if (datos.color_primario) {
      const color = datos.color_primario;
      root.setProperty('--primary', color);
      root.setProperty('--primary-dark', adjustColor(color, -40));
      root.setProperty('--primary-light', adjustColor(color, 40));
      root.setProperty('--primary-gradient', `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`);
    }
    
    // 2. TÍTULO
    if (datos.nombre_empresa) {
      document.title = datos.nombre_empresa;
    }

    // 3. ICONOS DINÁMICOS (PWA / FAVICON) - CORRECCIÓN: USAR app_ico_url
    if (datos.app_ico_url) {
        updateIcon(datos.app_ico_url);
    } else if (datos.logo_url) {
        // Fallback: Si no hay icono específico, usamos el logo normal
        updateIcon(datos.logo_url);
    }
  };

  const updateIcon = (url) => {
      // Función auxiliar para actualizar o crear links en el head
      const setLink = (rel, href) => {
          let link = document.querySelector(`link[rel="${rel}"]`);
          if (!link) {
              link = document.createElement('link');
              link.rel = rel;
              document.head.appendChild(link);
          }
          link.href = href;
      };

      // Actualizamos Favicon estándar
      setLink('icon', url);
      setLink('shortcut icon', url);
      
      // Actualizamos Icono de Apple (iOS Home Screen)
      setLink('apple-touch-icon', url);
  };

  return (
    <ConfigContext.Provider value={{ config, loadingConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);

// --- UTILIDADES ---
function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}