import { useState, useEffect } from 'react'; // <--- NUEVO: Agregamos useEffect
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // <--- NUEVO: Importamos el "GPS"
import { User, Lock, ArrowRight, Plane } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, user } = useAuth(); // <--- Traemos 'user' para saber si ya existe
  const navigate = useNavigate(); // <--- NUEVO: Inicializamos el GPS

  // NUEVO: Efecto de "Portero Inverso"
  // Si el usuario YA existe (porque acabó de entrar o ya estaba guardado),
  // lo mandamos al Dashboard inmediatamente.
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    if (!email || !password) {
      setError('Por favor llena todos los campos');
      setIsSubmitting(false);
      return;
    }

    const resultado = await login(email, password);
    
    if (!resultado.exito) {
      setError(resultado.error);
      setIsSubmitting(false);
    } else {
      // NUEVO: Si fue éxito, no hacemos nada más aquí.
      // El useEffect de arriba detectará el cambio de 'user' 
      // y hará la redirección automática.
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <Plane size={32} color="white" />
          </div>
          <h1>IGO Viajes</h1>
          <p>Tu portal de gestión de aventuras</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-wrapper">
              <User size={18} className="icon" />
              <input 
                type="email" 
                placeholder="usuario@igo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-wrapper">
              <Lock size={18} className="icon" />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-login" disabled={isSubmitting}>
            {isSubmitting ? 'Verificando...' : 'Iniciar Sesión'} 
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}