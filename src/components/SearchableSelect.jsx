import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SearchableSelect - Componente reutilizable para Dropdowns con búsqueda.
 * Principio SOLID: Single Responsibility (Solo maneja la selección y filtrado de una lista).
 * * @param {Array} options - Array de objetos { id, nombre, ... }
 * @param {String|Number} value - El ID seleccionado actualmente
 * @param {Function} onChange - Función que recibe el ID seleccionado (no el evento completo)
 * @param {String} placeholder - Texto placeholder
 * @param {String} labelKey - (Opcional) Nombre de la propiedad a mostrar (default: 'nombre')
 * @param {String} valueKey - (Opcional) Nombre de la propiedad del valor (default: 'id')
 * @param {Boolean} required - Si es obligatorio
 * @param {Boolean} disabled - Si está deshabilitado
 */
export default function SearchableSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  labelKey = 'nombre',
  valueKey = 'id',
  required = false,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Encontrar el objeto seleccionado actual para mostrar su nombre
  const selectedOption = options.find(opt => String(opt[valueKey]) === String(value));

  // Efecto para cerrar el dropdown si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Resetear término de búsqueda al cerrar para que la próxima vez aparezcan todos
        setSearchTerm(''); 
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Filtrado de opciones
  const filteredOptions = options.filter(opt => {
    if (!searchTerm) return true;
    const label = String(opt[labelKey] || '').toLowerCase();
    const subLabel = String(opt.razonSocial || opt.rfc || opt.nombreCliente || '').toLowerCase(); // Búsqueda extendida opcional
    return label.includes(searchTerm.toLowerCase()) || subLabel.includes(searchTerm.toLowerCase());
  });

  const handleSelect = (option) => {
    onChange(option[valueKey]); // Devolvemos SOLO el valor (ID)
    setIsOpen(false);
    setSearchTerm('');
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* 1. EL "INPUT" VISUAL (TRIGGER) */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          ...inputStyle,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: disabled ? '#e2e8f0' : (isOpen ? 'white' : '#f8fafc'),
          borderColor: isOpen ? 'var(--primary)' : '#e2e8f0',
          opacity: disabled ? 0.7 : 1
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selectedOption ? 'var(--text-main)' : '#94a3b8' }}>
          {selectedOption ? (selectedOption[labelKey] || selectedOption.nombre) : placeholder}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {selectedOption && !disabled && (
            <div onClick={clearSelection} style={{ padding: '2px', cursor: 'pointer', color: '#94a3b8', display:'flex' }}>
              <X size={16} />
            </div>
          )}
          <ChevronDown size={16} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
        </div>
      </div>

      {/* 2. EL DROPDOWN FLOTANTE */}
      {isOpen && !disabled && (
        <div style={dropdownStyle}>
          {/* Barra de búsqueda interna */}
          <div style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
              <input 
                autoFocus
                type="text" 
                placeholder="Escribe para buscar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={searchBoxStyle}
                onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer click en el input
              />
            </div>
          </div>

          {/* Lista de Opciones */}
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => (
                <div 
                  key={opt[valueKey] || idx} 
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f8fafc',
                    background: String(opt[valueKey]) === String(value) ? '#eff6ff' : 'white',
                    color: String(opt[valueKey]) === String(value) ? 'var(--primary)' : '#334155',
                    fontSize: '0.95rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = String(opt[valueKey]) === String(value) ? '#eff6ff' : 'white'}
                >
                  <div style={{ fontWeight: '600' }}>{opt[labelKey]}</div>
                  {/* Mostrar información extra si existe (ej: Razón Social para clientes) */}
                  {(opt.razonSocial || opt.rfc || opt.nombreCliente) && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {opt.razonSocial || opt.rfc || opt.nombreCliente}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '15px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                No se encontraron resultados.
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Input oculto para validación de formularios HTML nativa si fuera necesario */}
      <input 
        type="hidden" 
        value={value || ''} 
        required={required} 
        onChange={() => {}}
      />
    </div>
  );
}

// Estilos encapsulados para mantener limpieza
const inputStyle = {
  width: '100%',
  padding: '12px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  boxSizing: 'border-box',
  fontSize: '1rem',
  transition: 'all 0.2s',
  minHeight: '45px'
};

const dropdownStyle = {
  position: 'absolute',
  top: '105%',
  left: 0,
  right: 0,
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
  zIndex: 1000,
  overflow: 'hidden',
  animation: 'fadeIn 0.1s ease-out'
};

const searchBoxStyle = {
  width: '100%',
  padding: '8px 8px 8px 32px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '0.9rem',
  outline: 'none',
  background: '#f8fafc'
};