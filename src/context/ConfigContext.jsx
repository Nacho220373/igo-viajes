import { createContext, useState, useEffect, useContext } from 'react';
import { enviarPeticion } from '../services/api';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    color_primario: '#2563eb', // Azul default
    nombre_empresa: 'IGO Viajes',
    logo_url: null
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const cargarConfig = async () => {
      // 1. Carga rápida desde caché local
      const configGuardada = localStorage.getItem('igo_config');
      if (configGuardada) {
        const datos = JSON.parse(configGuardada);
        setConfig(datos);
        aplicarEstilos(datos); // Aplicar estilos inmediatamente
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

  // Función mejorada para inyectar variables CSS
  const aplicarEstilos = (datos) => {
    if (datos.color_primario) {
      const root = document.documentElement.style;
      const color = datos.color_primario;
      
      // Variable base
      root.setProperty('--primary', color);
      
      // Generamos variantes para dar profundidad (Estilo Disney)
      root.setProperty('--primary-dark', adjustColor(color, -40)); // Más oscuro para hover/sombras
      root.setProperty('--primary-light', adjustColor(color, 40)); // Más claro para brillos
      
      // Creamos un gradiente dinámico basado en el color de la marca
      root.setProperty('--primary-gradient', `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`);
    }
    
    if (datos.nombre_empresa) {
      document.title = datos.nombre_empresa;
    }
  };

  return (
    <ConfigContext.Provider value={{ config, loadingConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);

// --- UTILIDADES ---

// Función auxiliar para aclarar/oscurecer colores HEX
function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}