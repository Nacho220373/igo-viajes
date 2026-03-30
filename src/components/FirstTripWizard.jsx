import React, { useState, useEffect } from 'react';
import { PlaneTakeoff, X, CheckCircle, ArrowRight, Minimize2, Maximize2, Sparkles, Building2, User, Users, Map, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

const stepsConfig = {
    proveedores: {
        title: 'Paso 1: Proveedores',
        icon: <Building2 size={20} color="white" />,
        text: 'Por favor registra el o los proveedores (aerolíneas, hoteles, agencias operadoras) que usarás para este primer viaje. Así podrás enlazarlos a tus reservaciones y pagos en el futuro.',
        nextRoute: '/admin/clientes',
        nextStepKey: 'clientes',
        btnText: 'Siguiente: Clientes'
    },
    clientes: {
        title: 'Paso 2: Cliente Titular',
        icon: <User size={20} color="white" />,
        text: 'Registra a tu cliente titular. IMPORTANTE: Un Cliente es distinto a un Pasajero. El Cliente es el perfil Empresarial/Administrativo que pagará la factura. El Pasajero es quien aborda. (Si el cliente también viaja, bastará con repetir su nombre en el siguiente paso).',
        nextRoute: '/admin/pasajeros',
        nextStepKey: 'pasajeros',
        btnText: 'Siguiente: Pasajeros'
    },
    pasajeros: {
        title: 'Paso 3: Pasajeros',
        icon: <Users size={20} color="white" />,
        text: '¡Excelente! Ahora registraremos a las personas físicas que viajarán en esta reservación para poder enlazar sus boletos de avión o cuartos de hotel.',
        nextRoute: '/admin/viajes',
        nextStepKey: 'viajes',
        btnText: 'Siguiente: Armar Viaje'
    },
    viajes: {
        title: 'Paso 4: Viaje Raíz',
        icon: <Map size={20} color="white" />,
        text: 'Ya tenemos proveedores, cliente y pasajeros. ¡Vamos a vincularlo todo! Dale clic en "Abrir Formulario de Registro", bautiza tu Viaje y elige a tu cliente titular.',
        nextRoute: '/admin/viaje/', // Se anexará el ID dinámicamente
        nextStepKey: 'servicios',
        btnText: 'Siguiente: Añadir Servicios'
    },
    servicios: {
        title: 'Paso Final: Servicios',
        icon: <PlusCircle size={20} color="white" />,
        text: '¡Tu esqueleto está armado! Lo único que falta es agregar uno o más Servicios (Vuelos, Traslados, Hoteles) seleccionando a tu Proveedor y pasajeros.',
        nextRoute: '/',
        nextStepKey: 'final',
        btnText: '¡Terminar Primer Viaje!'
    }
};

export default function FirstTripWizard({ currentStep, onOpenModal }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [wizardState, setWizardState] = useState(null);
    const [minimized, setMinimized] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('igo_first_trip_wizard');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.active && parsed.step === currentStep) {
                    setWizardState(parsed);
                }
            } catch (e) {
                console.error("Error parsing wizard state");
            }
        }
    }, [currentStep]);

    const saveState = (newState) => {
        localStorage.setItem('igo_first_trip_wizard', JSON.stringify(newState));
        setWizardState(newState);
    };

    const handleNextStep = () => {
        if (!wizardState) return;

        const config = stepsConfig[wizardState.step];
        if (!config) return;

        if (wizardState.step === 'servicios') {
            fireConfetti();
            setIsFinished(true);
            return;
        }

        if (wizardState.step === 'viajes') {
            const freshStr = localStorage.getItem('igo_first_trip_wizard');
            let latestId = wizardState.idViaje;
            if (freshStr) {
                 const parsed = JSON.parse(freshStr);
                 latestId = parsed.idViaje || latestId;
            }

            if (!latestId) {
                 alert("Aún no has creado tu viaje. Entra a 'Nuevo Viaje', guárdalo y el sistema avanzará automáticamente aquí.");
                 return;
            }
            saveState({ ...wizardState, step: config.nextStepKey, idViaje: latestId });
            navigate(config.nextRoute + latestId);
            return;
        }

        saveState({ ...wizardState, step: config.nextStepKey });
        navigate(config.nextRoute, { state: { openCreate: true } });
    };

    const finishWizard = () => {
        localStorage.removeItem('igo_first_trip_wizard');
        localStorage.setItem('igo_admin_setup_dismissed', 'true');
        navigate('/');
    };

    const fireConfetti = () => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999999 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const cancelWizard = () => {
        if(window.confirm("¿Seguro que deseas salir del Asistente? Podrás continuar tu registro sin ayuda.")) {
            localStorage.removeItem('igo_first_trip_wizard');
            setWizardState(null);
        }
    };

    if (isFinished) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, backdropFilter: 'blur(5px)' }}>
                <div style={{ background: 'white', borderRadius: '24px', padding: '40px', maxWidth: '400px', textAlign: 'center', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                    <div style={{ background: '#ecfdf5', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#10b981' }}>
                        <CheckCircle size={48} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', color: 'var(--primary-dark)', margin: '0 0 10px 0', fontWeight: '800' }}>¡Felicidades {user?.nombre || ''}!</h2>
                    <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>Concluiste tu asistencia técnica interactiva. Has terminado de registrar y orquestar tu primer viaje sin problemas.</p>
                    <button onClick={finishWizard} className="btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '15px' }}>Ir al Dashboard Principal</button>
                </div>
            </div>
        );
    }

    if (!wizardState) return null;

    if (wizardState.step !== currentStep || currentStep === 'dashboard') {
        const conf = stepsConfig[wizardState.step];
        if (!conf) return null;
        
        return (
            <div 
                style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--primary)', color: 'white', padding: '12px 20px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)', cursor: 'pointer', zIndex: 9999, fontWeight: '700', animation: 'slideUp 0.3s' }}
                onClick={() => {
                    if (wizardState.step === 'viajes' && wizardState.idViaje) {
                         navigate(conf.nextRoute + wizardState.idViaje);
                    } else {
                         // Default logic to go to the current step's module.
                         // Wait, nextRoute points to the NEXT step. We need the current step's route!
                         const routesMap = {
                             proveedores: '/admin/proveedores',
                             clientes: '/admin/clientes',
                             pasajeros: '/admin/pasajeros',
                             viajes: '/admin/viajes',
                             servicios: wizardState.idViaje ? `/admin/viaje/${wizardState.idViaje}` : '/admin/viajes'
                         };
                         navigate(routesMap[wizardState.step] || '/');
                    }
                }}
            >
                <Sparkles size={18} />
                Continuar Asistente (Paso {Object.keys(stepsConfig).indexOf(wizardState.step) + 1}/5)
                <ArrowRight size={14} style={{ marginLeft: '5px' }} />
            </div>
        );
    }

    const config = stepsConfig[wizardState.step];

    if (minimized) {
        return (
            <div 
                style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--primary)', color: 'white', padding: '12px 20px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)', cursor: 'pointer', zIndex: 9999, fontWeight: '700', animation: 'slideUp 0.3s' }}
                onClick={() => setMinimized(false)}
            >
                <Sparkles size={18} />
                Continuar Asistente (Paso {Object.keys(stepsConfig).indexOf(wizardState.step) + 1}/5)
                <Maximize2 size={14} style={{ marginLeft: '5px' }} />
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'white', border: '2px solid #bfdbfe', borderRadius: '24px', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', zIndex: 9999, overflow: 'hidden', animation: 'slideUp 0.3s' }}>
            {/* Header */}
            <div style={{ background: 'var(--primary)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '1.05rem' }}>
                    {config.icon}
                    {config.title}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => setMinimized(true)} style={{ background: 'transparent', border: 'none', color: '#bfdbfe', cursor: 'pointer', padding: '5px' }} title="Minimizar"><Minimize2 size={16}/></button>
                    <button onClick={cancelWizard} style={{ background: 'transparent', border: 'none', color: '#bfdbfe', cursor: 'pointer', padding: '5px' }} title="Cerrar Asistente"><X size={16}/></button>
                </div>
            </div>
            
            {/* Body */}
            <div style={{ padding: '20px' }}>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: '#475569', lineHeight: '1.5' }}>
                    {config.text}
                </p>
                
                {onOpenModal && (
                    <button 
                        onClick={onOpenModal} 
                        style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '2px dashed var(--primary)', borderRadius: '12px', cursor: 'pointer', color: 'var(--primary)', fontWeight: '700', fontSize: '0.95rem', marginBottom: '15px', transition: 'background 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                    >
                        <PlusCircle size={20} />
                        Abrir Formulario
                    </button>
                )}

                <button onClick={handleNextStep} className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    {config.btnText}
                    <ArrowRight size={18} />
                </button>
            </div>
            
             {/* Progress Bar */}
            <div style={{ height: '5px', background: '#e2e8f0', display: 'flex' }}>
                {Object.keys(stepsConfig).map((key, idx) => {
                    const currentIndex = Object.keys(stepsConfig).indexOf(wizardState.step);
                    return (
                        <div key={key} style={{ flex: 1, background: idx <= currentIndex ? 'var(--primary)' : 'transparent', borderRight: '1px solid white' }}></div>
                    )
                })}
            </div>
        </div>
    );
}
