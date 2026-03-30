import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, User, Briefcase, Shield } from 'lucide-react';

export default function ProfileSwitcher() {
  const { profiles, activeProfile, switchProfile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!activeProfile) return null;

  const getIcon = (tipo) => {
    if (tipo === 'Administrador') return <Shield size={16} />;
    if (tipo === 'Cliente') return <Briefcase size={16} />;
    return <User size={16} />;
  };

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          background: 'white', border: '1px solid #e2e8f0', padding: '8px 16px', 
          borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', 
          gap: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', minWidth: '220px', justifyContent:'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
          <div style={{ color: 'var(--primary)' }}>{getIcon(activeProfile.tipo)}</div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>{activeProfile.tipo}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeProfile.nombre}</div>
          </div>
        </div>
        <ChevronDown size={16} color="#64748b" />
      </button>

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '120%', right: 0, width: '260px', 
          background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', 
          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden', padding: '8px' 
        }}>
          <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>CAMBIAR CUENTA</div>
          {profiles.map((p) => (
            <div 
              key={`${p.tipo}-${p.id}`} 
              onClick={() => { switchProfile(p.id, p.tipo); setIsOpen(false); }}
              style={{ 
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', 
                cursor: 'pointer', borderRadius: '8px', transition: '0.2s',
                background: (activeProfile.id === p.id && activeProfile.tipo === p.tipo) ? '#f0f9ff' : 'transparent',
                border: (activeProfile.id === p.id && activeProfile.tipo === p.tipo) ? '1px solid #bae6fd' : '1px solid transparent'
              }}
              onMouseEnter={(e) => { if(activeProfile.id !== p.id) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={(e) => { if(activeProfile.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ color: (activeProfile.id === p.id && activeProfile.tipo === p.tipo) ? 'var(--primary)' : '#64748b' }}>{getIcon(p.tipo)}</div>
              <div style={{ flex: 1 }}>
                 <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>{p.nombre}</div>
                 <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.tipo}</div>
              </div>
              {(activeProfile.id === p.id && activeProfile.tipo === p.tipo) && <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'var(--primary)'}}></div>}
            </div>
          ))}
          <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }}></div>
          <button onClick={logout} style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}
