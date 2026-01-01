import { useState, useEffect } from 'react';
import { Smartphone, RotateCcw, X, Check } from 'lucide-react';

export default function MobileWarning() {
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // 1. Detección simple por ancho de pantalla (común para móviles/tablets verticales)
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 1024; // Abarca móviles y iPads en vertical
      const hasSeenWarning = localStorage.getItem('igo_hide_mobile_warning');
      
      // Solo mostramos si es dispositivo pequeño Y no ha marcado "no mostrar"
      if (isMobileWidth && !hasSeenWarning) {
        setIsVisible(true);
      }
    };

    checkMobile();
    
    // Opcional: Escuchar cambios de tamaño (por si gira la pantalla en vivo)
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('igo_hide_mobile_warning', 'true');
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle} className="fade-in-up">
        {/* Animación Visual */}
        <div style={animationContainerStyle}>
          <div className="phone-rotate-animation">
            <Smartphone size={48} color="white" />
          </div>
          <RotateCcw size={24} color="white" style={{ marginTop: '10px' }} />
        </div>

        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '800' }}>
          Experiencia Mejorada
        </h3>
        
        <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5', marginBottom: '20px' }}>
          Esta es una PWA diseñada para computadora que se adapta muy bien a cualquier dispositivo, pero puede fallar. 
          <br/><br/>
          <strong>Tip:</strong> Si se llega a cortar, gira tu teléfono para ver la pantalla completa. Seguiremos trabajando para hacer tu experiencia cada vez mejor.
        </p>

        {/* Opción No volver a mostrar */}
        <div 
          onClick={() => setDontShowAgain(!dontShowAgain)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', 
            background: '#f1f5f9', padding: '10px 15px', borderRadius: '12px', 
            marginBottom: '20px', cursor: 'pointer', border: dontShowAgain ? '1px solid var(--primary)' : '1px solid transparent'
          }}
        >
          <div style={{
            width: '20px', height: '20px', borderRadius: '6px', 
            border: dontShowAgain ? 'none' : '2px solid #cbd5e1',
            background: dontShowAgain ? 'var(--primary)' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            {dontShowAgain && <Check size={14} strokeWidth={4} />}
          </div>
          <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '600' }}>No volver a mostrar este mensaje</span>
        </div>

        <button onClick={handleClose} className="btn-primary" style={{ width: '100%' }}>
          Entendido, continuar
        </button>
      </div>
      
      <style>{`
        @keyframes rotatePhone {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
          75% { transform: rotate(90deg); }
          100% { transform: rotate(0deg); }
        }
        .phone-rotate-animation {
          animation: rotatePhone 3s infinite ease-in-out;
          background: var(--primary);
          padding: 10px;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.5);
        }
        .fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// Estilos en línea para aislamiento total
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(15, 23, 42, 0.8)', // Fondo oscuro elegante
  backdropFilter: 'blur(8px)',
  zIndex: 10000, // Por encima de todo
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  padding: '20px'
};

const modalStyle = {
  background: 'white',
  padding: '30px',
  borderRadius: '24px',
  maxWidth: '350px',
  width: '100%',
  textAlign: 'center',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  position: 'relative'
};

const animationContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '20px',
  background: '#eff6ff',
  padding: '20px',
  borderRadius: '20px',
  color: 'var(--primary)'
};