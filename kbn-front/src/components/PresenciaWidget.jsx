import React, { useState } from 'react';
import { usePresencia, OPCIONES_PRESENCIA } from '../hooks/usePresencia';
import { useAuth } from '../context/AuthContext';

const NA = {
  dark: '#0F6E56', light: '#E1F5EE', border: '#c5e8df', text2: '#3a6b5e',
};

// ── PresenciaWidget ──────────────────────────────────────────────────────────
// Chip compacto que muestra quién está presente hoy.
// Al tocarlo abre un selector (solo ADMINISTRADOR y SECRETARIA pueden cambiar).
// Se coloca arriba de todo en las vistas de Secretaria y Admin.
export default function PresenciaWidget() {
  const { user }                                    = useAuth();
  const { opcionActual, guardando, setPresentes }   = usePresencia();
  const [open, setOpen]                             = useState(false);

  const puedeEditar = user?.role === 'ADMINISTRADOR' || user?.role === 'SECRETARIA';
  const nombre      = user?.nombre || user?.name || '';

  const handleSelect = async (valor) => {
    setOpen(false);
    await setPresentes(valor, nombre);
  };

  return (
    <div style={{ position: 'relative', fontFamily: 'system-ui, sans-serif' }}>

      {/* Chip principal */}
      <button
        onClick={() => puedeEditar && setOpen(o => !o)}
        disabled={guardando}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 14px', borderRadius: 99,
          background: opcionActual.bg,
          border: `1.5px solid ${opcionActual.color}30`,
          cursor: puedeEditar ? 'pointer' : 'default',
          color: opcionActual.color,
          fontSize: 13, fontWeight: 600,
          transition: 'all .15s',
        }}
      >
        {/* Dot de estado */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: guardando ? '#9ca3af' : opcionActual.color,
          flexShrink: 0,
          animation: guardando ? 'ppulse 1s infinite' : 'none',
        }}/>
        {opcionActual.label}
        {puedeEditar && (
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ fontSize: 13, marginLeft: 2 }}/>
        )}
      </button>

      {/* Dropdown de opciones */}
      {open && puedeEditar && (
        <>
          {/* Backdrop para cerrar */}
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 98 }}/>

          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            background: '#fff', borderRadius: 14, zIndex: 99,
            border: `0.5px solid ${NA.border}`,
            boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            minWidth: 200, overflow: 'hidden',
          }}>
            <p style={{ margin: 0, padding: '10px 14px 6px', fontSize: 10, color: NA.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              ¿Quién está presente hoy?
            </p>
            {OPCIONES_PRESENCIA.map(op => (
              <button key={op.value} onClick={() => handleSelect(op.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '11px 14px',
                  background: opcionActual.value === op.value ? op.bg : 'transparent',
                  border: 'none', borderBottom: `0.5px solid ${NA.border}`,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: op.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 13, fontWeight: opcionActual.value === op.value ? 700 : 400, color: op.color }}>
                  {op.label}
                </span>
                {opcionActual.value === op.value && (
                  <i className="ti ti-check" style={{ fontSize: 14, color: op.color, marginLeft: 'auto' }}/>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes ppulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  );
}