import { useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';

export const dashboardSteps = [
        {
            target: '.tour-header',
            content: '¡Bienvenido(a) a tu Panel de Control! Aquí tienes un resumen general de tu agencia. Te daré un breve paseo para que conozcas cómo funciona tu plataforma.',
            disableBeacon: true,
        },
        {
            target: '.tour-accesos-rapidos',
            content: 'Estos son tus Módulos Principales. Desde aquí accederás a consultar las Cotizaciones, Viajes, Clientes, Pasajeros y Proveedores.',
        },
        {
            target: '.tour-kpis',
            content: 'Tus Métricas Financieras. Podrás dar seguimiento en tiempo real de tus Ingresos, Egresos y cualquier saldo pendiente (Cuentas por Cobrar y Pagar). ¡Puedes darles click para ver su desglose!',
        },
        {
            target: '.tour-btn-acciones',
            content: '¡Tu botón más importante! Desde este menú podrás realizar cualquier acción u operación: "Carga Masiva" por Excel, "Registrar Transacciones", Generar "Estados de Cuenta", e iniciar nuevos viajes.',
        },
        {
            target: '.tour-alertas-servicios',
            content: 'Alertas Inteligentes. Aquí te mostraremos si tienes un vuelo o tour próximo en los siguientes días para que no se te pase nada.',
        },
        {
            target: '.tour-monitor-viajes',
            content: 'Por último, tu monitor. Podrás vigilar qué viajes están a punto de ocurrir o ya están en curso. ¡Todo desde este panel!',
        }
    ];

export default function AdminTour({ run, setRun, onFinishTour, steps = dashboardSteps, tourKey }) {
    // 1. Guardar en memoria apenas se inicie el tour (protege contra navegaciones repentinas)
    useEffect(() => {
        if (run && tourKey) {
            localStorage.setItem(tourKey, 'true');
        }
    }, [run, tourKey]);

    const handleJoyrideCallback = (data) => {
        const { status, action } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
        
        // Finaliza si termina, se omite o si el usuario cierra (clic en X o fuera)
        if (finishedStatuses.includes(status) || action === 'close') {
            setRun(false);
            if (tourKey) localStorage.setItem(tourKey, 'true');
            if (onFinishTour) onFinishTour(status);
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous={true}
            showSkipButton={true}
            showProgress={true}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#2563eb', // bg-blue-600
                    zIndex: 10000,
                },
                tooltipContainer: {
                    textAlign: 'left'
                },
                buttonNext: {
                    backgroundColor: '#1E3A8A', // primary-dark
                },
                buttonBack: {
                    color: '#64748b'
                }
            }}
            locale={{
                back: 'Atrás',
                close: 'Cerrar',
                last: 'Terminar Tour',
                next: 'Siguiente',
                skip: 'Omitir'
            }}
        />
    );
}
