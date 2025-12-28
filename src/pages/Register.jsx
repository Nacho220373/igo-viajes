import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { enviarPeticion } from '../services/api'; 
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, ArrowRight, Plane } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ nombre: '', apellido: '', correo: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  const { login } = useAuth(); 
  const { config } = useConfig();
  const navigate = useNavigate();

  useEffect(() => { setImgError(false); }, [config.logo_url]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const respuesta = await enviarPeticion({ accion: 'registrarUsuario', ...formData });

    if (respuesta.exito) {
      const loginRes = await login(formData.correo, formData.password);
      if (loginRes.exito) navigate('/'); else navigate('/login');
    } else {
      setError(respuesta.error || 'Error al registrar usuario');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="card-decoration-top"></div>
        <div className="login-header">
          {/* CAMBIO: Usamos 'logo-box' */}
          <div className="logo-box">
             {config.logo_url && !imgError ? (
               <img 
                 src={config.logo_url} 
                 alt="Logo" 
                 onError={() => setImgError(true)} 
                 // BorderRadius ajustado para ser cuadrado redondeado
                 style={{ width: '100%', height: '100%', borderRadius: '20px', objectFit: 'cover' }} 
               />
             ) : (
               <Plane size={40} color="var(--primary)" strokeWidth={1.5} />
             )}
          </div>
          <h1>Crear Cuenta</h1>
          <p>Únete a {config.nombre_empresa || 'IGO Viajes'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label>Nombre</label>
              <div className="input-wrapper">
                <input type="text" name="nombre" placeholder="Juan" required onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <div className="input-wrapper">
                <input type="text" name="apellido" placeholder="Pérez" required onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-wrapper">
              <Mail size={18} className="icon" />
              <input type="email" name="correo" placeholder="juan@correo.com" required onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-wrapper">
              <Lock size={18} className="icon" />
              <input type="password" name="password" placeholder="••••••••" required onChange={handleChange} />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta...' : 'Registrarme'} 
            {!isSubmitting && <ArrowRight size={18} />}
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>¿Ya tienes cuenta? </span>
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
              Inicia Sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}