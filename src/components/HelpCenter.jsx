import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, Search, ChevronRight, FileText, ChevronDown } from 'lucide-react';

const knowledgeBase = [
    {
        id: 'nuevo-viaje',
        category: 'Viajes',
        q: '¿Cómo crear o registrar un nuevo viaje?',
        a: 'Ve a la tarjeta azul "Viajes" en tus Accesos Rápidos, o desde el botón principal de "Acciones -> Nuevo Viaje". Se abrirá un formulario. Ingresa el nombre del viaje y selecciona UNO O MÚLTIPLES clientes como titulares para cobrarles el viaje de forma compartida.'
    },
    {
        id: 'carga-masiva',
        category: 'Importación',
        q: '¿Cómo funciona la carga masiva por Excel?',
        a: 'En Acciónes -> Carga Masiva (Excel) podrás copiar y pegar datos directamente de tu hoja de cálculo. Puedes pegar múltiples clientes, pasajeros, proveedores o un viaje entero con sus servicios y transacciones de forma automática.'
    },
    {
        id: 'registrar-transaccion',
        category: 'Finanzas',
        q: '¿Cómo registro un Ingreso o Egreso?',
        a: 'Ve a Acciones -> Registrar Transacción. Selecciona Ingreso si el cliente te está pagando, Egreso si tú estás pagando a un proveedor, o Abono. Ingresa el monto total. Si el pago es de un viaje, selecciona el viaje y opcionalmente elige a qué servicios específicos se asocia la transacción.'
    },
    {
        id: 'estado-cuenta',
        category: 'Finanzas',
        q: '¿Cómo genero y descargo un Estado de Cuenta?',
        a: 'Ve a Acciones -> Estado de Cuenta. Selecciona al cliente del cual quieres ver su deuda o historial. Si quieres filtrar un viaje en particular, agrégalo al selector. Luego da click en Generar. Podrás descargar un reporte en Excel o imprimir en PDF.'
    },
    {
        id: 'crear-cuenta',
        category: 'Configuración',
        q: '¿Cómo agrego mis Cuentas Bancarias o Cajas?',
        a: 'Al registrar una transacción nueva, verás la opción "Cuenta de Empresa (Destino/Origen)". Haz click en el botón [+]. Se abrirá un mini formulario para dar de alta una nueva tarjeta o banco.'
    },
    {
        id: 'crear-pasajero-vs-cliente',
        category: 'Viajes',
        q: 'Diferencia entre Cliente Titular y Pasajero',
        a: 'El CLIENTE TITULAR es a quien se le factura o cobra (quien tiene un estado de cuenta). El PASAJERO es la persona que abordará un vuelo u hotel (ej: los familiares o empleados del cliente titular).'
    }
];

export default function HelpCenter({ onRestartTour }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeItem, setActiveItem] = useState(null);
    const panelRef = useRef(null);

    // Cierra con ESC
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const filteredKb = knowledgeBase.filter(item => 
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ position: 'relative' }}>
            {/* BOTÓN FLOTANTE */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed', bottom: '25px', right: '25px',
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'var(--primary)', color: 'white',
                    border: 'none', boxShadow: '0 10px 25px -5px rgba(37,99,235,0.4)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    cursor: 'pointer', zIndex: 9000, transition: 'transform 0.2s',
                    transform: isOpen ? 'scale(0.9)' : 'scale(1)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)'}
                title="Centro de Ayuda / Asistente"
            >
                {isOpen ? <X size={28} /> : <HelpCircle size={28} />}
            </button>

            {/* PANEL LATERAL FLOTANTE */}
            {isOpen && (
                <div ref={panelRef} style={{
                    position: 'fixed', bottom: '100px', right: '25px',
                    width: '380px', maxHeight: 'calc(100vh - 120px)',
                    background: 'white', borderRadius: '24px',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
                    zIndex: 9000, display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', border: '1px solid #e2e8f0',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {/* CABECERA */}
                    <div style={{ background: 'var(--primary-gradient)', padding: '20px', color: 'white', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <HelpCircle size={20}/> Centro de Ayuda
                            </h3>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={20}/></button>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>Búsqueda de tutoriales y guías operativas.</p>
                        
                        <div style={{ position: 'relative', marginTop: '15px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Busca 'estado de cuenta' o 'viaje'" 
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setActiveItem(null); }}
                                style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '12px', border: 'none', background: 'white', fontSize: '0.95rem', color: '#334155', outline: 'none', boxSizing: 'border-box' }}

                            />
                        </div>
                    </div>

                    {/* CUERPO DE PREGUNTAS / DOCUMENTACIÓN */}
                    <div style={{ padding: '15px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                        {filteredKb.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 10px' }}>
                                <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                                No encontramos resultados para "{searchTerm}".
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {filteredKb.map((item, idx) => {
                                    const isExpanded = activeItem === item.id;
                                    return (
                                        <div key={item.id} style={{
                                            background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s',
                                            boxShadow: isExpanded ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none'
                                        }}>
                                            <button 
                                                onClick={() => setActiveItem(isExpanded ? null : item.id)}
                                                style={{
                                                    width: '100%', padding: '12px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    background: isExpanded ? '#eff6ff' : 'white', border: 'none', cursor: 'pointer', textAlign: 'left'
                                                }}
                                            >
                                                <div style={{ flex: 1, paddingRight: '10px' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px', textTransform: 'uppercase' }}>{item.category}</div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: isExpanded ? '700' : '600', color: isExpanded ? 'var(--primary-dark)' : '#334155', lineHeight: '1.3' }}>{item.q}</div>
                                                </div>
                                                {isExpanded ? <ChevronDown size={18} color="var(--primary)" /> : <ChevronRight size={18} color="#94a3b8" />}
                                            </button>
                                            
                                            {isExpanded && (
                                                <div style={{ padding: '0 15px 15px 15px', fontSize: '0.9rem', color: '#475569', lineHeight: '1.5', background: '#eff6ff' }}>
                                                    <div style={{ width: '100%', height: '1px', background: '#bfdbfe', marginBottom: '10px' }}></div>
                                                    {item.a}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* PIE DEL PANEL - REINICIAR TOUR */}
                    <div style={{ padding: '15px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
                        <button 
                            onClick={() => { setIsOpen(false); onRestartTour(); }}
                            style={{
                                width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                background: '#f1f5f9', color: '#64748b', fontSize: '0.9rem', fontWeight: '700', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                        >
                            Ver guía inicial ("Tour" de Bienvenida)
                        </button>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
