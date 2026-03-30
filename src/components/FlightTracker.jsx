import { useState, useEffect } from 'react';
import { Plane, Clock, MapPin, AlertTriangle, AlertCircle, CheckCircle, RefreshCcw } from 'lucide-react';
import { enviarPeticion } from '../services/api';

export default function FlightTracker({ numeroVuelo, fechaInicio }) {
    const [statusData, setStatusData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!numeroVuelo) return;
        fetchFlightStatus();
    }, [numeroVuelo]);

    const fetchFlightStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const req = { accion: 'obtenerEstatusVuelo', codigoVuelo: numeroVuelo, fecha: fechaInicio };
            const res = await enviarPeticion(req);
            
            if (res.exito) {
                setStatusData(res.vuelo);
            } else {
                setError(res.error || "No se pudo obtener la información del vuelo");
            }
        } catch (err) {
            setError("Error de red al consultar estatus.");
        } finally {
            setLoading(false);
        }
    };

    if (!numeroVuelo) return null;

    if (loading) {
        return (
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '0.9rem', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                <RefreshCcw size={16} className="spin" /> Buscando radar para {numeroVuelo}...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ background: '#fef2f2', padding: '12px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ef4444', fontSize: '0.85rem', border: '1px solid #fee2e2', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} /> <span>{numeroVuelo}: {error}</span>
                </div>
                <button onClick={fetchFlightStatus} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Reintentar">
                    <RefreshCcw size={14} />
                </button>
            </div>
        );
    }

    if (!statusData) return null;

    const rawStatus = statusData.flight_status; 
    
    let stateColor = '#3b82f6'; 
    let stateBg = '#eff6ff';
    let icon = <Plane size={16} />;
    let statusText = "Programado";

    if (rawStatus === 'active') {
        stateColor = '#10b981'; stateBg = '#ecfdf5'; statusText = "En Vuelo"; icon = <Plane size={16} style={{transform: 'rotate(-45deg)'}}/>;
    } else if (rawStatus === 'landed') {
         stateColor = '#64748b'; stateBg = '#f1f5f9'; statusText = "Aterrizado"; icon = <CheckCircle size={16}/>;
    } else if (rawStatus === 'cancelled') {
         stateColor = '#ef4444'; stateBg = '#fef2f2'; statusText = "Cancelado"; icon = <AlertCircle size={16}/>;
    } else if (rawStatus === 'incident' || rawStatus === 'diverted') {
         stateColor = '#f59e0b'; stateBg = '#fffbeb'; statusText = "Desviado/Incidente"; icon = <AlertTriangle size={16}/>;
    }

    const dep = statusData.departure || {};
    const arr = statusData.arrival || {};
    
    const formatTime = (isoString) => {
        if (!isoString || isoString === "Por definir" || isoString === "N/A") return typeof isoString === 'string' ? isoString : "--:--";
        try {
            // Aviationstack manda la hora local del aeropuerto pero le pega +00:00 al final.
            // Si usamos "new Date()", el navegador resta horas de diferencia y da tiempos equivocados.
            // Solución: Extraer directamente el "HH:MM" de la cadena ("2024-03-30T17:20:00+00:00" -> "17:20")
            const match = isoString.match(/T(\d{2}:\d{2})/);
            if (match) {
                let [hh, mm] = match[1].split(':');
                let h = parseInt(hh, 10);
                let ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return `${String(h).padStart(2, '0')}:${mm} ${ampm}`;
            }
            return "--:--";
        } catch(e) { return "--:--"; }
    };

    const depTime = formatTime(dep.estimated || dep.scheduled);
    const arrTime = formatTime(arr.estimated || arr.scheduled);

    return (
        <div className="fade-in" style={{ background: stateBg, border: `1px solid ${stateColor}40`, borderRadius: '12px', padding: '16px', marginTop: '10px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: stateColor, fontWeight: '800', fontSize: '0.95rem' }}>
                       {icon} Vuelo {numeroVuelo.toUpperCase()} • {statusText.toUpperCase()}
                  </div>
                  <button onClick={fetchFlightStatus} style={{ background: 'white', border: `1px solid ${stateColor}30`, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: stateColor, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} title="Actualizar Estatus">
                      <RefreshCcw size={12} />
                  </button>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center' }}>
                  <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>{dep.iata || 'Origen'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <Clock size={12}/> Sale: <strong>{depTime}</strong>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          <MapPin size={12}/> Puerta: <strong>{dep.terminal ? `T${dep.terminal} ` : ''}{dep.gate || 'TBD'}</strong>
                      </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#cbd5e1' }}>
                      <Plane size={20} color={stateColor} style={{ opacity: 0.5 }} />
                      <div style={{ width: '40px', height: '2px', background: `linear-gradient(to right, transparent, ${stateColor}50, transparent)`, marginTop: '5px' }}></div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>{arr.iata || 'Destino'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                           Llega: <strong>{arrTime}</strong> <Clock size={12}/>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '2px', whiteSpace: 'nowrap' }}>
                           Puerta: <strong>{arr.terminal ? `T${arr.terminal} ` : ''}{arr.gate || 'TBD'}</strong> <MapPin size={12}/>
                      </div>
                  </div>
             </div>
        </div>
    );
}
