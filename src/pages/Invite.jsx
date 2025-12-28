import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { enviarPeticion } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { CheckCircle, AlertCircle, Plane, Lock, Phone, Globe, Calendar, User, MapPin, Home, FileText, Briefcase, Building } from 'lucide-react';

export default function Invite() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { config } = useConfig();
  
  const [validating, setValidating] = useState(true);
  const [tokenData, setTokenData] = useState(null); 
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [procesando, setProcesando] = useState(false);
  
  const [nacionalidades, setNacionalidades] = useState([]); 
  const [paises, setPaises] = useState([]);

  // Formulario Unificado
  const [form, setForm] = useState({
    password: '', confirmPassword: '',
    // Pasajero
    apellidoM: '', fechaNacimiento: '', nacionalidad: '',
    // Cliente (Fiscales)
    razonSocial: '', rfc: '',
    // Común
    lada: '', telefono: '', 
    // Dirección
    pais: '', cp: '', ciudad: '', colonia: '', calle: '', numExt: '', numInt: '',
    // Docs Pasajero
    pasaporte: '', visa: ''
  });

  const query = new URLSearchParams(search);
  const token = query.get('token');

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setErrorMsg("Enlace inválido.");
      return;
    }
    const init = async () => {
        try {
            const [resToken, resListas] = await Promise.all([
                enviarPeticion({ accion: 'validarTokenInvitacion', token }),
                enviarPeticion({ accion: 'obtenerListas' })
            ]);

            if (resListas.exito && resListas.listas) {
                setNacionalidades(resListas.listas.nacionalidades || []);
                setPaises(resListas.listas.paises || []);
            }

            if (resToken.exito) {
                setTokenData(resToken);
                // Pre-llenar datos conocidos si existen en el tokenData (para clientes sobre todo)
                if (resToken.tipo === 'Cliente' && resToken.datos) {
                    setForm(prev => ({
                        ...prev,
                        razonSocial: resToken.datos.empresa || '',
                        // Aquí podrías mapear otros si la API de validación los devolviera, pero 'empresa' es lo básico
                    }));
                }
            } else {
                setErrorMsg(resToken.error || "El enlace ha caducado o no existe.");
            }
        } catch (error) {
            setErrorMsg("Error de conexión al validar la invitación.");
        } finally {
            setValidating(false);
        }
    };
    init();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (form.password.length < 6) return setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
    if (form.password !== form.confirmPassword) return setErrorMsg("Las contraseñas no coinciden.");

    setProcesando(true);

    if (tokenData.tipo === 'Pasajero') {
        if (!form.fechaNacimiento) { setProcesando(false); return setErrorMsg("La fecha de nacimiento es obligatoria."); }
        if (!form.nacionalidad) { setProcesando(false); return setErrorMsg("La nacionalidad es obligatoria."); }

        let fechaFinal = '';
        if (form.fechaNacimiento) {
            const [year, month, day] = form.fechaNacimiento.split('-');
            fechaFinal = `${day}/${month}/${year}`;
        }

        const res = await enviarPeticion({
            accion: 'completarRegistroPasajero',
            token,
            password: form.password,
            apellidoM: form.apellidoM,
            fechaNacimiento: fechaFinal,
            nacionalidad: form.nacionalidad,
            lada: form.lada,
            telefono: form.telefono,
            pais: form.pais,
            cp: form.cp,
            ciudad: form.ciudad,
            colonia: form.colonia,
            calle: form.calle,
            numExt: form.numExt,
            numInt: form.numInt,
            pasaporte: form.pasaporte,
            visa: form.visa,
        });
        manejarRespuesta(res);

    } else {
        // Lógica Cliente: Enviamos TODO el perfil corporativo
        const res = await enviarPeticion({
            accion: 'completarRegistroCliente',
            token,
            password: form.password,
            razonSocial: form.razonSocial,
            rfc: form.rfc,
            telefono: form.telefono,
            lada: form.lada,
            pais: form.pais,
            cp: form.cp,
            ciudad: form.ciudad,
            colonia: form.colonia,
            calle: form.calle,
            numExt: form.numExt,
            numInt: form.numInt
        });
        manejarRespuesta(res);
    }
  };

  const manejarRespuesta = (res) => {
      if (res.exito) {
          setSuccessMsg("¡Cuenta activada! Redirigiendo al login...");
          setTimeout(() => navigate('/login'), 3000);
      } else {
          setErrorMsg(res.error || "Hubo un problema al completar el registro.");
          setProcesando(false);
      }
  };

  if (validating) return <div className="auth-layout" style={{color:'white'}}>Verificando invitación...</div>;
  if (!tokenData) return <ErrorView msg={errorMsg} navigate={navigate} />;
  if (successMsg) return <SuccessView msg={successMsg} />;

  const isPasajero = tokenData.tipo === 'Pasajero';

  return (
    <div className="auth-layout" style={{ alignItems: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="auth-card" style={{ maxWidth:'800px', width: '100%' }}>
        <div className="card-decoration-top"></div>
        
        <div style={{textAlign:'center', marginBottom:'30px'}}>
            <div className="logo-box" style={{width:'70px', height:'70px', margin:'0 auto 15px auto'}}>
                {config.logo_url ? <img src={config.logo_url} style={{width:'100%', borderRadius:'16px'}} /> : <Plane size={32} color="var(--primary)"/>}
            </div>
            <h1 style={{fontSize:'1.8rem', margin:'0', color:'var(--text-main)'}}>Hola, {tokenData.datos.nombre}</h1>
            <p style={{color:'#64748b', margin:'5px 0 0'}}>
                {isPasajero ? "Completa tu perfil de viajero." : `Activa la cuenta corporativa.`}
            </p>
        </div>

        <form onSubmit={handleSubmit} style={{display:'grid', gap:'25px'}}>
            
            <div style={sectionContainerStyle}>
                <SectionHeader icon={<Lock size={18}/>} title="Configurar Acceso" />
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'15px'}}>
                    <div style={{gridColumn:'1 / -1'}}><label style={labelStyle}>Correo (Usuario)</label><div style={{...inputDisplay, color:'#64748b'}}>{tokenData.datos.correo}</div></div>
                    <div><label style={labelStyle}>Contraseña *</label><input required type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} style={inputStyle} placeholder="Mínimo 6 caracteres" /></div>
                    <div><label style={labelStyle}>Confirmar Contraseña *</label><input required type="password" value={form.confirmPassword} onChange={e=>setForm({...form, confirmPassword:e.target.value})} style={inputStyle} placeholder="Repite tu contraseña" /></div>
                </div>
            </div>

            {/* DATOS FISCALES (Solo Cliente) */}
            {!isPasajero && (
                <div style={sectionContainerStyle}>
                    <SectionHeader icon={<Briefcase size={18}/>} title="Datos Fiscales" />
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'15px'}}>
                        <div><label style={labelStyle}>Razón Social</label><input type="text" value={form.razonSocial} onChange={e=>setForm({...form, razonSocial:e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>RFC</label><input type="text" value={form.rfc} onChange={e=>setForm({...form, rfc:e.target.value})} style={inputStyle} /></div>
                    </div>
                </div>
            )}

            {/* SECCIÓN DATOS PERSONALES (Solo Pasajero) */}
            {isPasajero && (
                <div style={sectionContainerStyle}>
                    <SectionHeader icon={<User size={18}/>} title="Datos Personales" />
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'15px'}}>
                        <div><label style={labelStyle}>Nombre(s)</label><div style={inputDisplay}>{tokenData.datos.nombre}</div></div>
                        <div><label style={labelStyle}>Apellido Paterno</label><div style={inputDisplay}>{tokenData.datos.apellido}</div></div>
                        <div><label style={labelStyle}>Apellido Materno</label><input type="text" value={form.apellidoM} onChange={e=>setForm({...form, apellidoM:e.target.value})} style={inputStyle} placeholder="Opcional"/></div>
                        <div><label style={labelStyle}>Fecha de Nacimiento *</label><input required type="date" value={form.fechaNacimiento} onChange={e=>setForm({...form, fechaNacimiento:e.target.value})} style={inputStyle} /></div>
                        <div style={{gridColumn: '1 / -1'}}>
                            <label style={labelStyle}>Nacionalidad *</label>
                            <select required value={form.nacionalidad} onChange={e=>setForm({...form, nacionalidad:e.target.value})} style={inputStyle}>
                                <option value="">Seleccionar...</option>
                                {nacionalidades.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN DIRECCIÓN (Ambos) */}
            <div style={sectionContainerStyle}>
                <SectionHeader icon={<MapPin size={18}/>} title="Dirección" />
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <div><label style={labelStyle}>País</label><select value={form.pais} onChange={e=>setForm({...form, pais:e.target.value})} style={inputStyle}><option value="">Seleccionar...</option>{paises.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
                    <div><label style={labelStyle}>Código Postal</label><input type="text" value={form.cp} onChange={e=>setForm({...form, cp:e.target.value})} style={inputStyle}/></div>
                    <div><label style={labelStyle}>Ciudad</label><input type="text" value={form.ciudad} onChange={e=>setForm({...form, ciudad:e.target.value})} style={inputStyle}/></div>
                    <div><label style={labelStyle}>Colonia</label><input type="text" value={form.colonia} onChange={e=>setForm({...form, colonia:e.target.value})} style={inputStyle}/></div>
                    <div style={{gridColumn:'1 / -1'}}><label style={labelStyle}>Calle</label><input type="text" value={form.calle} onChange={e=>setForm({...form, calle:e.target.value})} style={inputStyle}/></div>
                    <div><label style={labelStyle}>Núm. Exterior</label><input type="text" value={form.numExt} onChange={e=>setForm({...form, numExt:e.target.value})} style={inputStyle}/></div>
                    <div><label style={labelStyle}>Núm. Interior</label><input type="text" value={form.numInt} onChange={e=>setForm({...form, numInt:e.target.value})} style={inputStyle}/></div>
                </div>
            </div>

            {/* SECCIÓN CONTACTO (Ambos) */}
            <div style={sectionContainerStyle}>
                <SectionHeader icon={<Phone size={18}/>} title="Contacto" />
                <div style={{display:'grid', gridTemplateColumns:'100px 1fr', gap:'15px'}}>
                    <div><label style={labelStyle}>Lada</label><input type="text" value={form.lada} onChange={e=>setForm({...form, lada:e.target.value})} style={inputStyle} placeholder="52"/></div>
                    <div><label style={labelStyle}>Teléfono Celular</label><input type="tel" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} style={inputStyle} placeholder="10 dígitos"/></div>
                </div>
            </div>

            {/* SECCIONES EXTRA SOLO PASAJERO */}
            {isPasajero && (
                <div style={{...sectionContainerStyle, border: '1px dashed #bfdbfe', background: '#eff6ff'}}>
                    <SectionHeader icon={<FileText size={18}/>} title="Documentación (Opcional)" color="#1e40af" />
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                        <div><label style={{...labelStyle, color:'#1e3a8a'}}>Pasaporte</label><input style={{...inputStyle, background:'white'}} value={form.pasaporte} onChange={e=>setForm({...form, pasaporte:e.target.value})} placeholder="Número" /></div>
                        <div><label style={{...labelStyle, color:'#1e3a8a'}}>Visa</label><input style={{...inputStyle, background:'white'}} value={form.visa} onChange={e=>setForm({...form, visa:e.target.value})} placeholder="Número" /></div>
                    </div>
                </div>
            )}

            {errorMsg && <div className="error-message">{errorMsg}</div>}
            
            <button type="submit" className="btn-primary" disabled={procesando} style={{marginTop:'10px', padding:'15px', fontSize:'1.1rem'}}>
                {procesando ? 'Activando...' : 'Completar Registro'}
            </button>
        </form>
      </div>
    </div>
  );
}

const ErrorView = ({ msg, navigate }) => (
    <div className="auth-layout"><div className="auth-card" style={{textAlign:'center'}}><div style={{margin:'0 auto 20px auto', width:'60px', height:'60px', borderRadius:'50%', background:'#fef2f2', color:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center'}}><AlertCircle size={32}/></div><h2 style={{color:'var(--text-main)'}}>Enlace no válido</h2><p style={{color:'#64748b'}}>{msg}</p><button onClick={() => navigate('/login')} className="btn-primary">Ir al Inicio</button></div></div>
);
const SuccessView = ({ msg }) => (
    <div className="auth-layout"><div className="auth-card" style={{textAlign:'center'}}><div style={{margin:'0 auto 20px auto', width:'60px', height:'60px', borderRadius:'50%', background:'#ecfdf5', color:'#10b981', display:'flex', alignItems:'center', justifyContent:'center'}}><CheckCircle size={32}/></div><h2 style={{color:'var(--text-main)'}}>¡Bienvenido!</h2><p style={{color:'#64748b'}}>{msg}</p></div></div>
);

// Estilos
const SectionHeader = ({ icon, title, color = 'var(--primary)' }) => (<div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px', paddingBottom:'10px', borderBottom:`1px solid ${color === 'var(--primary)' ? '#e2e8f0' : '#bfdbfe'}`}}><div style={{color}}>{icon}</div><div style={{fontSize:'0.95rem', fontWeight:'800', color: color === 'var(--primary)' ? '#334155' : color, textTransform:'uppercase'}}>{title}</div></div>);
const sectionContainerStyle = { background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' };
const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' };
const inputStyle = { width: '100%', padding: '12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '1rem', boxSizing:'border-box', outlineColor: 'var(--primary)' };
const inputDisplay = { ...inputStyle, background: '#e2e8f0', border: '1px solid #cbd5e1', color: '#475569', cursor: 'not-allowed' };