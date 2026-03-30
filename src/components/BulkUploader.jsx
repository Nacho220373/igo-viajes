import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, CheckCircle, AlertTriangle, FileSpreadsheet, Loader as LoaderIcon, ArrowRight, Lock, Users, Briefcase, MapPin, Ticket } from 'lucide-react';
import { enviarPeticion } from '../services/api';

export default function BulkUploader({ onUpload, isProcessing }) {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  
  const [stage, setStage] = useState('wizard'); // 'wizard' o 'preview'
  const fileInputRef = useRef(null);

  useEffect(() => {
    if(!isProcessing) cargarEstadisticas();
  }, [isProcessing]);

  const cargarEstadisticas = async () => {
    setLoadingStats(true);
    try {
      const res = await enviarPeticion({ accion: 'obtenerEstadisticasEntidades' });
      if(res.exito) setStats(res.conteos);
    } catch(e) { console.error(e); }
    setLoadingStats(false);
  };

  const steps = [
    {
        id: 1, 
        titulo: "Paso 1: Clientes",
        desc: "Ingresa tus empresas Clientes o Titulares.",
        icon: <Briefcase size={20} />,
        unlocked: true,
        hojas: ['Clientes'],
        color: '#3b82f6',
        plantillaParams: [
            { name: "Clientes", data: [{ "Nombre Completo": "", "Razón Social": "", "Tipo Persona": "", "RFC": "", "País": "", "Estado": "", "Ciudad": "", "Colonia": "", "Calle": "", "Número Exterior": "", "Número Interior": "", "CP": "", "Lada": "52", "Teléfono": "", "Correo": "" }] }
        ]
    },
    {
        id: 2, 
        titulo: "Paso 2: Proveedores",
        desc: "Ingresa Aerolíneas, Hoteles, Navieras...",
        icon: <Briefcase size={20} />,
        unlocked: true,
        hojas: ['Proveedores'],
        color: '#ec4899',
        plantillaParams: [
            { name: "Proveedores", data: [{ "Nombre Forma Corta": "", "Razón Social": "", "Categoría": "", "RFC": "", "País": "", "Ciudad": "", "Colonia": "", "Calle": "", "Número Exterior": "", "Número Interior": "", "CP": "", "Lada": "52", "Teléfono": "", "Correo": "" }] }
        ]
    },
    {
        id: 3, 
        titulo: "Paso 3: Pasajeros",
        desc: "Registra a los viajeros y asócialos a un Cliente.",
        icon: <Users size={20} />,
        unlocked: stats ? stats.clientes > 0 : false,
        msgBloqueo: "Registra al menos un Cliente en el Paso 1",
        hojas: ['Pasajeros'],
        color: '#10b981',
        plantillaParams: [
            { name: "Pasajeros", data: [{ "Cliente Asociado": "", "Nombre(s)": "", "Apellido Paterno": "", "Apellido Materno": "", "Nacionalidad": "", "Fecha de Nacimiento": "DD/MM/YYYY", "ID Pasaporte": "", "ID Visa": "", "País": "", "Estado": "", "Ciudad": "", "Colonia": "", "Calle": "", "Número Exterior": "", "Número Interior": "", "CP": "", "Lada": "52", "Teléfono": "", "Correo": "" }] }
        ]
    },
    {
        id: 4, 
        titulo: "Paso 4: Viajes",
        desc: "Crea eventos de viaje y asígnalos a Clientes.",
        icon: <MapPin size={20} />,
        unlocked: stats ? (stats.clientes > 0 && stats.pasajeros > 0 && stats.proveedores > 0) : false,
        msgBloqueo: "Completa los Pasos 1, 2 y 3 primero.",
        hojas: ['Viajes'],
        color: '#f59e0b',
        plantillaParams: [
             { name: "Viajes", data: [{ "Nombre Viaje": "", "Tipo de Viaje": "", "Cliente Titular": "", "Fecha Inicio": "DD/MM/YYYY", "Fecha Fin": "DD/MM/YYYY", "Calificación": "", "Comentarios": "" }] }
        ]
    },
    {
        id: 5, 
        titulo: "Paso 5: Servicios",
        desc: "Agrega vuelos, hoteles a tus viajes.",
        icon: <Ticket size={20} />,
        unlocked: stats ? stats.viajes > 0 : false,
        msgBloqueo: "Registra al menos un Viaje en el Paso 4.",
        hojas: ['Servicios'],
        color: '#8b5cf6',
        plantillaParams: [
            { name: "Servicios", data: [{ "Viaje": "", "Cliente Asociado": "", "Categoría": "", "Destino": "", "Clave de Reservación": "", "Pasajero": "", "Fecha Inicio del Servicio": "DD/MM/YYYY", "Fecha Fin del Servicio": "DD/MM/YYYY", "Estatus": "", "Calificación": "", "Comentarios": "", "Costo Proveedor": 0, "Precio Venta": 0, "Proveedor": "" }] }
        ]
    }
  ];

  const handleDownloadTemplate = (step) => {
    const wb = XLSX.utils.book_new();
    step.plantillaParams.forEach(p => {
        const ws = XLSX.utils.json_to_sheet(p.data);
        XLSX.utils.book_append_sheet(wb, ws, p.name);
    });
    XLSX.writeFile(wb, `IGO_Plantilla_Masiva_${step.hojas.join('_')}.xlsx`);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
       processFile(selectedFile);
    }
    e.target.value = null;
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    setValidationErrors([]);
    setParsedData(null);
    setStage('uploading_local'); 

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const hojasData = { clientes: [], proveedores: [], viajes: [], pasajeros: [], servicios: [] };
            const errors = [];

            if (workbook.Sheets['Clientes']) hojasData.clientes = XLSX.utils.sheet_to_json(workbook.Sheets['Clientes']);
            if (workbook.Sheets['Proveedores']) hojasData.proveedores = XLSX.utils.sheet_to_json(workbook.Sheets['Proveedores']);
            if (workbook.Sheets['Viajes']) hojasData.viajes = XLSX.utils.sheet_to_json(workbook.Sheets['Viajes']);
            if (workbook.Sheets['Pasajeros']) hojasData.pasajeros = XLSX.utils.sheet_to_json(workbook.Sheets['Pasajeros']);
            if (workbook.Sheets['Servicios']) hojasData.servicios = XLSX.utils.sheet_to_json(workbook.Sheets['Servicios']);

            // Validaciones
            hojasData.clientes.forEach((c, idx) => {
                if (!c['Nombre Completo'] && !c['Razón Social']) errors.push({ hoja: 'Clientes', fila: idx + 2, mensaje: 'Debe tener Nombre Completo o Razón Social.' });
            });
            hojasData.proveedores.forEach((p, idx) => {
                if (!p['Nombre']) errors.push({ hoja: 'Proveedores', fila: idx + 2, mensaje: 'El proveedor debe tener Nombre.' });
            });
            hojasData.viajes.forEach((v, idx) => {
                if (!v['Nombre Viaje']) errors.push({ hoja: 'Viajes', fila: idx + 2, mensaje: 'Falta el Nombre del Viaje.' });
            });
            hojasData.pasajeros.forEach((p, idx) => {
                if (!p['Nombre(s)']) errors.push({ hoja: 'Pasajeros', fila: idx + 2, mensaje: 'Falta nombre del pasajero.' });
            });
            hojasData.servicios.forEach((s, idx) => {
                if (!s['Viaje'] && !s['Cliente Asociado']) {
                    errors.push({ hoja: 'Servicios', fila: idx + 2, mensaje: 'Debe estar asignado a un Viaje o Cliente.' });
                }
            });

            setParsedData(hojasData);
            if (errors.length > 0) setValidationErrors(errors);
            setStage('preview');
        } catch (err) {
            setValidationErrors([{ hoja: 'Archivo', fila: '-', mensaje: 'Error crítico al leer el Excel.' }]);
            setStage('preview');
        }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleConfirm = () => {
    if (parsedData && onUpload) {
        onUpload(parsedData, validationErrors);
    }
  };

  if(loadingStats) return <div style={{padding:'40px', textAlign:'center'}}><LoaderIcon className="spin-animation" size={30} color="var(--primary)"/></div>;

  return (
    <div style={{ background: 'transparent' }}>
      {stage === 'wizard' && (
        <div className="fade-in">
          <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '15px', display: 'flex', gap: '15px', alignItems: 'flex-start', border: '1px solid #bfdbfe', marginBottom: '15px' }}>
              <AlertTriangle size={24} color="#2563eb" style={{flexShrink:0}}/>
              <div>
                  <h4 style={{margin:'0 0 5px 0', color:'#1e3a8a', fontSize:'1rem'}}>Setup Inteligente de Base de Datos</h4>
                  <p style={{margin:0, color:'#1e40af', fontSize:'0.85rem'}}>Para proteger la integridad de los datos, la carga masiva debe realizarse en orden. Completa los pasos superiores antes de avanzar.</p>
              </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 15px', border: '1px solid #cbd5e1', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>i</div>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem' }}><b>Tip de Vinculación:</b> Al llenar los datos de un Pasajero, Viaje o Servicio, asegúrate de escribir los nombres de Clientes y Proveedores <b>exactamente igual</b> a como los registraste en los Pasos 1 y 2 para que el sistema los enlace automáticamente.</p>
          </div>

          <div style={{ display: 'grid', gap: '15px' }}>
             {steps.map((step) => (
                 <div key={step.id} style={{ 
                     background: 'white', borderRadius: '16px', padding: '20px', 
                     border: `2px solid ${step.unlocked ? '#e2e8f0' : '#f1f5f9'}`,
                     boxShadow: step.unlocked ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                     opacity: step.unlocked ? 1 : 0.6,
                     display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px',
                     transition: 'all 0.3s'
                 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: '1 1 300px' }}>
                         <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: step.unlocked ? `${step.color}20` : '#f1f5f9', color: step.unlocked ? step.color : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {step.icon}
                         </div>
                         <div>
                             <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: step.unlocked ? 'var(--text-main)' : '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 {step.titulo}
                                 {!step.unlocked && <Lock size={14} color="#94a3b8"/>}
                             </h3>
                             <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{step.desc}</p>
                             {!step.unlocked && <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>{step.msgBloqueo}</p>}
                         </div>
                     </div>
                     
                     <div style={{ display: 'flex', gap: '10px' }}>
                         <button 
                            disabled={!step.unlocked} 
                            onClick={() => handleDownloadTemplate(step)}
                            style={{ 
                                padding: '8px 16px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: '600',
                                background: 'transparent', border: '1px solid #cbd5e1', color: step.unlocked ? '#475569' : '#cbd5e1', cursor: step.unlocked ? 'pointer' : 'not-allowed'
                            }}>
                            Bajar Plantilla
                         </button>
                         <button 
                            disabled={!step.unlocked} 
                            onClick={() => fileInputRef.current.click()}
                            className={step.unlocked ? "btn-primary" : ""}
                            style={{ 
                                padding: '8px 16px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: '600',
                                background: step.unlocked ? step.color : '#f1f5f9', color: step.unlocked ? 'white' : '#cbd5e1', border: 'none', cursor: step.unlocked ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                            <Upload size={14}/> Subir Datos
                         </button>
                     </div>
                 </div>
             ))}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" style={{ display: 'none' }} />
        </div>
      )}

      {stage === 'preview' && parsedData && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Resumen de Importación</h3>
            <button onClick={() => setStage('wizard')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}>Volver al Wizard</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
             <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3b82f6' }}>{parsedData.clientes.length}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Clientes</div>
             </div>
             <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ec4899' }}>{parsedData.proveedores.length}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Proveed</div>
             </div>
             <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{parsedData.pasajeros.length}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Pasajeros</div>
             </div>
             <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>{parsedData.viajes.length}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Viajes</div>
             </div>
             <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8b5cf6' }}>{parsedData.servicios.length}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Servicios</div>
             </div>
          </div>

          {validationErrors.length > 0 && (
             <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: '700', marginBottom: '10px' }}>
                    <AlertTriangle size={20} /> 
                    <span>{validationErrors.length} errores detectados (Serán omitidos)</span>
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {validationErrors.map((err, i) => (
                        <div key={i} style={{ color: '#991b1b', marginBottom: '5px' }}>
                            <b>Hoja {err.hoja} (Fila {err.fila}):</b> {err.mensaje}
                        </div>
                    ))}
                </div>
             </div>
          )}

          {validationErrors.length === 0 && (
              <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#047857', fontWeight: '700' }}>
                  <CheckCircle size={20} /> Archivo validado correctamente. Listo para importar.
              </div>
          )}

          <div style={{ textAlign: 'right' }}>
              <button 
                onClick={handleConfirm} 
                disabled={isProcessing || (parsedData.clientes.length === 0 && parsedData.proveedores.length === 0 && parsedData.viajes.length === 0 && parsedData.pasajeros.length === 0 && parsedData.servicios.length === 0)} 
                className="btn-primary" 
                style={{ opacity: isProcessing ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                 {isProcessing ? <LoaderIcon size={18} className="spin-animation" /> : <ArrowRight size={18} />}
                 {isProcessing ? 'Importando Datos...' : 'Confirmar Importación'}
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
