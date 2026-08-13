import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MENUS = {
  ADMINISTRADOR: [
    { icon: 'ti-calendar-event', label: 'Monitor',      sub: 'Clases y cobros',     path: '/monitor',    accent: ['#1ABFA0','#0F6E56'] },
    { icon: 'ti-report-money',   label: 'Secretaría',   sub: 'Caja y finanzas',     path: '/secretaria', accent: ['#3B82F6','#1D4ED8'] },
    { icon: 'ti-chart-dots-3',   label: 'Estadísticas', sub: 'Reportes',            path: '/reportes',   accent: ['#8B5CF6','#6D28D9'] },
    { icon: 'ti-users-group',    label: 'Instructores', sub: 'Agenda del equipo',   path: '/instructor', accent: ['#F59E0B','#B45309'] },
    { icon: 'ti-address-book',   label: 'Clientes',     sub: 'Base de alumnos',     path: '/clientes',   accent: ['#10B981','#065F46'] },
    { icon: 'ti-settings-2',     label: 'Usuarios',     sub: 'Accesos y roles',     path: '/usuarios',   accent: ['#6B7280','#374151'] },
  ],
  SECRETARIA: [
    { icon: 'ti-calendar-event', label: 'Monitor',      sub: 'Clases y cobros',     path: '/monitor',    accent: ['#1ABFA0','#0F6E56'] },
    { icon: 'ti-report-money',   label: 'Secretaría',   sub: 'Caja y finanzas',     path: '/secretaria', accent: ['#3B82F6','#1D4ED8'] },
    { icon: 'ti-address-book',   label: 'Clientes',     sub: 'Base de alumnos',     path: '/clientes',   accent: ['#10B981','#065F46'] },
  ],
  INSTRUCTOR: [
    { icon: 'ti-calendar-event', label: 'Mis clases',   sub: 'Agenda personal',     path: '/instructor', accent: ['#1ABFA0','#0F6E56'] },
    { icon: 'ti-chart-dots-3',   label: 'Estadísticas', sub: 'Horas y resumen',     path: '/mis-stats',  accent: ['#8B5CF6','#6D28D9'] },
  ],
};

export default function Inicio() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const canvasRef = useRef(null);

  const role   = user?.role;
  const nombre = user?.nombre || user?.name || 'Usuario';
  const items  = MENUS[role] || MENUS.INSTRUCTOR;

  const hora   = new Date().getHours();
  const saludo = hora < 6 ? 'Buenas noches' : hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  // ── Fondo animado con partículas ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Partículas
    const pts = Array.from({ length: 28 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random(),
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26,191,160,${p.a * 0.35})`;
        ctx.fill();
      });
      // Líneas entre partículas cercanas
      for (let i = 0; i < pts.length; i++) {
        for (let j = i+1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(26,191,160,${(1 - d/90) * 0.12})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div style={{ minHeight: '100dvh', background: '#060f0d', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Canvas de partículas */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}/>

      {/* Glow orb de fondo */}
      <div style={{ position:'absolute', top:'-15%', right:'-10%', width:340, height:340, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(26,191,160,.18) 0%, transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:'-10%', left:'-8%', width:260, height:260, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(59,130,246,.12) 0%, transparent 70%)', pointerEvents:'none' }}/>

      {/* Contenido */}
      <div style={{ position:'relative', maxWidth:520, margin:'0 auto', padding:'36px 20px 80px' }}>

        {/* Saludo */}
        <div style={{ marginBottom:36 }}>
          <p style={{ margin:0, fontSize:13, color:'rgba(26,191,160,.7)', fontWeight:500, letterSpacing:'.06em', textTransform:'uppercase' }}>
            {saludo}
          </p>
          <h1 style={{ margin:'6px 0 0', fontSize:30, fontWeight:800, color:'#fff', lineHeight:1.1 }}>
            {nombre.split(' ')[0]}
            <span style={{ color:'#1ABFA0' }}> •</span>
          </h1>
          <p style={{ margin:'6px 0 0', fontSize:12, color:'rgba(255,255,255,.3)' }}>
            Náutica Atins · KBN Admin
          </p>
        </div>

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {items.map((item, i) => (
            <MenuCard key={item.path} item={item} idx={i} onClick={() => navigate(item.path)}/>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes kbn-fadein {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes kbn-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
      `}</style>
    </div>
  );
}

// ── Card de menú ─────────────────────────────────────────────────────────────
function MenuCard({ item, idx, onClick }) {
  const ref = useRef(null);
  const [from, to] = item.accent;

  // Efecto de presión táctil
  const press   = () => { if (ref.current) ref.current.style.transform = 'scale(0.95)'; };
  const release = () => { if (ref.current) ref.current.style.transform = 'scale(1)'; };

  return (
    <button ref={ref} onClick={onClick}
      onMouseDown={press} onMouseUp={release}
      onTouchStart={press} onTouchEnd={release}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:12, padding:'26px 14px', borderRadius:20, border:'none',
        cursor:'pointer', textAlign:'center', width:'100%',
        background:`linear-gradient(145deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.02) 100%)`,
        backdropFilter:'blur(12px)',
        boxShadow:`0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.06)`,
        animation:`kbn-fadein .4s ease both`,
        animationDelay:`${idx * 0.07}s`,
        transition:'transform .12s ease, box-shadow .2s ease',
        position:'relative', overflow:'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 0 0 1px ${from}60, 0 8px 32px ${from}25, inset 0 1px 0 rgba(255,255,255,.08)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.06)`;
      }}
    >
      {/* Glow detrás del ícono */}
      <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)',
        width:100, height:100, borderRadius:'50%',
        background:`radial-gradient(circle, ${from}30 0%, transparent 70%)`,
        pointerEvents:'none' }}/>

      {/* Ícono */}
      <div style={{
        width:52, height:52, borderRadius:16, flexShrink:0, position:'relative',
        background:`linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:`0 4px 16px ${from}50`,
      }}>
        <i className={`ti ${item.icon}`} style={{ fontSize:24, color:'#fff' }}/>
      </div>

      {/* Texto */}
      <div>
        <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-.01em' }}>
          {item.label}
        </p>
        {item.sub && (
          <p style={{ margin:'3px 0 0', fontSize:11, color:'rgba(255,255,255,.4)', lineHeight:1.3 }}>
            {item.sub}
          </p>
        )}
      </div>
    </button>
  );
}