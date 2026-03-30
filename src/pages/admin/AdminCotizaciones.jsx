import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { enviarPeticion } from '../../services/api';
import { FileText, Plus, Search, MapPin, User, ArrowLeft, LayoutGrid, LayoutList, Calendar, DollarSign, PenTool, CheckCircle, Tag, Trash2, ExternalLink, Edit2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Loader from '../../components/Loader';
import AdminTour from '../../components/AdminTour';

export default function AdminCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({ id: null, idCliente: '', destino: '', fechaTentativa: '', montoEstimado: '', estatus: 'Pendiente' });
  const [clientes, setClientes] = useState([]);

  // === TOUR ===
  const [runTour, setRunTour] = useState(false);
  const stepsCotizaciones = [
      { target: '.tour-cotiz-header', content: 'Módulo de Cotizaciones. Aquí puedes armar presupuestos para tus prospectos antes de convertirlos en un viaje real.', disableBeacon: true },
      { target: '.tour-btn-nueva', content: 'Crea una nueva propuesta asignándola a un cliente con su destino y presupuesto estimado.' },
      { target: '.tour-busqueda', content: 'Filtra rápidamente tus cotizaciones por nombre o destino en tu base de datos.' },
      { target: '.tour-lista-cotiz', content: 'Lleva el rastreo de ventas de cada cotización (Pendiente o Aprobada) desde esta tabla interactiva.' }
  ];

  useEffect(() => {
    cargarDatos();
    const tourSeen = localStorage.getItem('igo_admin_tour_cotizaciones');
    if (!tourSeen) setRunTour(true);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resCots, resCli] = await Promise.all([
         enviarPeticion({ accion: 'obtenerCotizaciones' }),
         enviarPeticion({ accion: 'obtenerListas' })
      ]);
      if (resCots.exito) setCotizaciones(resCots.datos || []);
      // We will need proper clients from dashboard or list
      const cliRes = await enviarPeticion({ accion: 'obtenerDashboardAdmin' });
      if (cliRes.exito && cliRes.datos?.listasRapidas?.clientes) {
          setClientes(cliRes.datos.listasRapidas.clientes);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setLoading(true);
    const accion = form.id ? 'editarCotizacion' : 'agregarCotizacion';
    const res = await enviarPeticion({ accion, cotizacion: form });
    if(res.exito) {
        setShowModal(false);
        setForm({ id: null, idCliente: '', destino: '', fechaTentativa: '', montoEstimado: '', estatus: 'Pendiente' });
        cargarDatos();
    } else {
        alert("Error: " + res.error);
    }
    setLoading(false);
  };

  const handleEliminar = async (id) => {
    if(window.confirm('¿Seguro que deseas eliminar esta cotización?')) {
        setLoading(true);
        const res = await enviarPeticion({ accion: 'eliminarCotizacion', idCotizacion: id });
        if(res.exito) cargarDatos();
        else { alert("Error"); setLoading(false); }
    }
  };

  const abrirEditar = (c) => {
      setForm(c);
      setShowModal(true);
  };

  const cotizacionesFiltradas = cotizaciones.filter(c => 
      c.destino.toLowerCase().includes(busqueda.toLowerCase()) || 
      String(c.id).includes(busqueda)
  );

  return (
    <div style={{ padding: '80px 20px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div className="tour-cotiz-header">
               <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--primary-dark)', fontWeight: '800' }}>Cotizaciones</h1>
               <p style={{ margin: '5px 0 0', color: '#64748b' }}>Gestiona los presupuestos antes de confirmarlos como Viajes</p>
            </div>
            <button onClick={() => {setForm({ id: null, idCliente: '', destino: '', fechaTentativa: '', montoEstimado: '', estatus: 'Pendiente' }); setShowModal(true)}} className="btn-primary tour-btn-nueva" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Plus size={18}/> Nueva Cotización
            </button>
        </div>

        <div className="tour-busqueda" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
            <div style={{ position: 'relative', maxWidth: '300px' }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}/>
                <input type="text" placeholder="Buscar cotización..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }}/>
            </div>
        </div>

        {loading ? <Loader message="Cargando cotizaciones..." /> : (
            <div className="tour-lista-cotiz" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                            <th style={{ padding: '15px' }}>ID</th>
                            <th style={{ padding: '15px' }}>Destino</th>
                            <th style={{ padding: '15px' }}>Cliente</th>
                            <th style={{ padding: '15px' }}>Fecha Tentativa</th>
                            <th style={{ padding: '15px' }}>Monto Estimado</th>
                            <th style={{ padding: '15px' }}>Estatus</th>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cotizacionesFiltradas.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No hay cotizaciones registradas.</td></tr> : cotizacionesFiltradas.map(c => {
                            const clienteObj = clientes.find(cl => cl.id == c.idCliente);
                            return (
                             <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '15px', fontWeight: '700', color: 'var(--primary)' }}>#{c.id}</td>
                                <td style={{ padding: '15px', fontWeight: '600', color: 'var(--text-main)' }}>{c.destino}</td>
                                <td style={{ padding: '15px', color: '#64748b' }}>{clienteObj ? clienteObj.nombre : c.idCliente}</td>
                                <td style={{ padding: '15px', color: '#64748b' }}>{c.fechaTentativa}</td>
                                <td style={{ padding: '15px', color: '#64748b', fontWeight:'700' }}>${c.montoEstimado}</td>
                                <td style={{ padding: '15px' }}>
                                    <span style={{ 
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', 
                                        background: c.estatus === 'Aprobada' ? '#ecfdf5' : (c.estatus === 'Rechazada' ? '#fef2f2' : '#fffbeb'), 
                                        color: c.estatus === 'Aprobada' ? '#10b981' : (c.estatus === 'Rechazada' ? '#ef4444' : '#f59e0b')
                                    }}>
                                        {c.estatus}
                                    </span>
                                </td>
                                <td style={{ padding: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button onClick={() => abrirEditar(c)} style={{ padding: '6px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Edit2 size={16}/></button>
                                    <button onClick={() => handleEliminar(c.id)} style={{ padding: '6px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                </td>
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {showModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)' }}>
                <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{form.id ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
                        <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>
                    </div>
                    <form onSubmit={handleGuardar} style={{ padding: '24px', display: 'grid', gap: '15px', overflowY: 'auto' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>Cliente</label>
                            <select required value={form.idCliente} onChange={e=>setForm({...form, idCliente:e.target.value})} style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <option value="">-- Seleccionar Cliente --</option>
                                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>Destino / Nombre del Viaje</label>
                            <input required type="text" value={form.destino} onChange={e=>setForm({...form, destino:e.target.value})} style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}/>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>Fecha Tentativa</label>
                                <input type="date" value={form.fechaTentativa ? form.fechaTentativa.split('/').reverse().join('-') : ''} onChange={e=>setForm({...form, fechaTentativa:e.target.value})} style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}/>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>Monto Estimado</label>
                                <input type="number" step="0.01" value={form.montoEstimado} onChange={e=>setForm({...form, montoEstimado:e.target.value})} style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}/>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>Estatus</label>
                            <select value={form.estatus} onChange={e=>setForm({...form, estatus:e.target.value})} style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <option value="Pendiente">Pendiente</option>
                                <option value="Aprobada">Aprobada</option>
                                <option value="Rechazada">Rechazada</option>
                            </select>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>{loading ? 'Guardando...' : 'Guardar'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        <AdminTour run={runTour} setRun={setRunTour} steps={stepsCotizaciones} tourKey="igo_admin_tour_cotizaciones" />
    </div>
  );
}
