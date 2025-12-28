import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext'; 
import { useNavigate } from 'react-router-dom'; // <--- ELIMINADO 'Link'
import { User, Lock, ArrowRight, Plane } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  const { login, user } = useAuth(); 
  const { config } = useConfig(); 
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);
  useEffect(() => { setImgError(false); }, [config.logo_url]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    if (!email || !password) { setError('Por favor llena todos los campos'); setIsSubmitting(false); return; }
    const resultado = await login(email, password);
    if (!resultado.exito) { setError(resultado.error); setIsSubmitting(false); }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="card-decoration-top"></div>
        
        <div className="login-header">
          <div className="logo-box">
             {config.logo_url && !imgError ? (
               <img 
                 src={config.logo_url} 
                 alt="Logo" 
                 onError={() => setImgError(true)} 
                 style={{ width: '100%', height: '100%', borderRadius: '20px', objectFit: 'cover' }} 
               />
             ) : (
               <Plane size={40} color="var(--primary)" strokeWidth={1.5} />
             )}
          </div>
          <h1>{config.nombre_empresa || 'IGO Viajes'}</h1>
          <p>Bienvenido a tu portal de viajes</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-wrapper">
              <User size={18} className="icon" />
              <input type="email" placeholder="usuario@dominio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-wrapper">
              <Lock size={18} className="icon" />
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Verificando...' : 'Iniciar Sesión'} 
            {!isSubmitting && <ArrowRight size={18} />}
          </button>

          {/* ELIMINADO: Bloque de "Registrate aquí" */}
        </form>
      </div>
    </div>
  );
}