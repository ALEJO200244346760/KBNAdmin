import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

// Botón de menú grande tipo card
const MenuBtn = ({ icon, label, sub, color, bg, border, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    gap: 10, padding: '20px 18px', borderRadius: 16,
    background: bg || '#fff', border: `1px solid ${border || NA.border}`,
    cursor: 'pointer', textAlign: 'left', width: '100%',
    transition: 'transform .12s, box-shadow .12s',
    boxShadow: '0 1px 4px rgba(0,0,0,.04)',
  }}
    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
  >
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: color || NA.primary, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 22, color: '#fff' }}/>
    </div>
    <div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: NA.text }}>{label}</p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 12, color: NA.text2 }}>{sub}</p>}
    </div>
  </button>
);

const MENUS = {
  ADMINISTRADOR: [
    { icon: 'ti-calendar',        label: 'Monitor',       sub: 'Calendario de clases y cobros',  path: '/monitor'    },
    { icon: 'ti-file-text',       label: 'Secretaría',    sub: 'Ingresos, egresos y pasivos',    path: '/secretaria' },
    { icon: 'ti-chart-bar',       label: 'Estadísticas',  sub: 'Reportes y liquidación',         path: '/reportes'   },
    { icon: 'ti-school',          label: 'Instructores',  sub: 'Vista y agenda del equipo',      path: '/instructor' },
    { icon: 'ti-users',           label: 'Clientes',      sub: 'Base de datos de alumnos',       path: '/clientes'   },
    { icon: 'ti-shield',          label: 'Usuarios',      sub: 'Gestión de accesos y roles',     path: '/usuarios',
      color: '#6B7280', border: '#E5E7EB' },
  ],
  SECRETARIA: [
    { icon: 'ti-calendar',        label: 'Monitor',       sub: 'Calendario de clases',           path: '/monitor'    },
    { icon: 'ti-cash',            label: 'Secretaría',    sub: 'Ingresos y egresos',             path: '/secretaria' },
    { icon: 'ti-users',           label: 'Clientes',      sub: 'Base de datos de alumnos',       path: '/clientes'   },
  ],
  INSTRUCTOR: [
    { icon: 'ti-calendar',        label: 'Mis clases',    sub: 'Calendario y agenda personal',   path: '/instructor' },
    { icon: 'ti-chart-bar',       label: 'Mis estadísticas', sub: 'Horas, clases y resumen',    path: '/mis-stats'  },
  ],
};

const COLOR_MENU = [NA.dark, '#2563EB', '#7C3AED', '#D97706', '#059669', '#6B7280'];

export default function Inicio() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const role      = user?.role;
  const nombre    = user?.nombre || user?.name || 'Usuario';
  const items     = MENUS[role] || MENUS.INSTRUCTOR;

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 80px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Saludo */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: 0, fontSize: 13, color: NA.text2 }}>{saludo},</p>
        <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 700, color: NA.text }}>
          {nombre.split(' ')[0]} 👋
        </h1>
      </div>

      {/* Grid de botones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {items.map((item, i) => (
          <MenuBtn
            key={item.path}
            icon={item.icon}
            label={item.label}
            sub={item.sub}
            color={item.color || COLOR_MENU[i % COLOR_MENU.length]}
            bg={item.bg}
            border={item.border}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>

      {/* Versión / créditos */}
      <p style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: '#d1d5db' }}>
        KBN Admin · Náutica Atins
      </p>
    </div>
  );
}