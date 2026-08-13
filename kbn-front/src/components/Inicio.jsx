import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Paleta extraída del logo ──────────────────────────────────────────────────
// Turquesa brillante: #2ECFC4  (color principal del logo)
// Turquesa oscuro:    #1A9E95  (sombras/hover)
// Negro profundo:     #0a0e0d  (fondo)
// Azul pizarra:       #5B7A8A  (borde del logo)

const MENUS = {
  ADMINISTRADOR: [
    { icon: 'ti-calendar-event', label: 'Monitor',      sub: 'Clases y cobros',   path: '/monitor',    g: ['#2ECFC4','#1A9E95'] },
    { icon: 'ti-report-money',   label: 'Secretaría',   sub: 'Caja y finanzas',   path: '/secretaria', g: ['#5B9EAD','#3D7080'] },
    { icon: 'ti-chart-dots-3',   label: 'Estadísticas', sub: 'Reportes',          path: '/reportes',   g: ['#2ECFC4','#3D7080'] },
    { icon: 'ti-users-group',    label: 'Instructores', sub: 'Agenda del equipo', path: '/instructor', g: ['#1A9E95','#0F6E65'] },
    { icon: 'ti-address-book',   label: 'Clientes',     sub: 'Base de alumnos',   path: '/clientes',   g: ['#5B7A8A','#3A5A6A'] },
    { icon: 'ti-settings-2',     label: 'Usuarios',     sub: 'Accesos y roles',   path: '/usuarios',   g: ['#3A5A6A','#243840'] },
  ],
  SECRETARIA: [
    { icon: 'ti-calendar-event', label: 'Monitor',      sub: 'Clases y cobros',   path: '/monitor',    g: ['#2ECFC4','#1A9E95'] },
    { icon: 'ti-report-money',   label: 'Secretaría',   sub: 'Caja y finanzas',   path: '/secretaria', g: ['#5B9EAD','#3D7080'] },
    { icon: 'ti-address-book',   label: 'Clientes',     sub: 'Base de alumnos',   path: '/clientes',   g: ['#5B7A8A','#3A5A6A'] },
  ],
  INSTRUCTOR: [
    { icon: 'ti-calendar-event', label: 'Mis clases',   sub: 'Agenda personal',   path: '/instructor', g: ['#2ECFC4','#1A9E95'] },
    { icon: 'ti-chart-dots-3',   label: 'Estadísticas', sub: 'Horas y resumen',   path: '/mis-stats',  g: ['#5B9EAD','#3D7080'] },
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

  // ── Partículas con olas (del logo) ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Partículas
    const pts = Array.from({ length: 32 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      a: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.008;

      // Olas suaves en el fondo — referencia visual al logo
      const waveY = canvas.height * 0.72;
      ctx.beginPath();
      ctx.moveTo(0, waveY);
      for (let x = 0; x <= canvas.width; x += 4) {
        const y = waveY + Math.sin(x * 0.012 + t) * 7 + Math.sin(x * 0.022 + t * 1.3) * 4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(46,207,196,0.04)';
      ctx.fill();

      // Segunda ola
      ctx.beginPath();
      ctx.moveTo(0, waveY - 18);
      for (let x = 0; x <= canvas.width; x += 4) {
        const y = waveY - 18 + Math.sin(x * 0.015 + t * 0.8 + 1) * 5 + Math.sin(x * 0.028 + t) * 3;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(46,207,196,0.08)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Partículas
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(46,207,196,${p.a * 0.4})`;
        ctx.fill();
      });

      // Líneas entre partículas cercanas
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 85) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(46,207,196,${(1 - d/85) * 0.1})`;
            ctx.lineWidth = 0.7;
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
    <div style={{ minHeight:'100dvh', background:'linear-gradient(160deg, #0a0e0d 0%, #0d1a18 50%, #0a1215 100%)', fontFamily:'system-ui,sans-serif', position:'relative', overflow:'hidden' }}>

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}/>

      {/* Glow orbs */}
      <div style={{ position:'absolute', top:'-8%', right:'-5%', width:380, height:380, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(46,207,196,.15) 0%, transparent 65%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:'15%', left:'-12%', width:280, height:280, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(91,122,138,.12) 0%, transparent 65%)', pointerEvents:'none' }}/>

      {/* Contenido */}
      <div style={{ position:'relative', maxWidth:520, margin:'0 auto', padding:'36px 20px 80px' }}>

        {/* Logo + Saludo */}
        <div style={{ marginBottom:36, display:'flex', alignItems:'center', gap:16 }}>
          {/* Mini logo circular */}
          <div style={{ width:54, height:54, borderRadius:'50%', flexShrink:0, overflow:'hidden',
            border:'2px solid rgba(46,207,196,.4)',
            boxShadow:'0 0 20px rgba(46,207,196,.25)',
            background:'#2ECFC4', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src="/logo.png" alt="NA" style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={e => { e.target.style.display='none'; }}/>
          </div>
          <div>
            <p style={{ margin:0, fontSize:11, color:'rgba(46,207,196,.7)', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase' }}>
              {saludo}
            </p>
            <h1 style={{ margin:'4px 0 0', fontSize:26, fontWeight:800, color:'#fff', lineHeight:1, letterSpacing:'-.02em' }}>
              {nombre.split(' ')[0]}
            </h1>
            <p style={{ margin:'3px 0 0', fontSize:11, color:'rgba(255,255,255,.25)', letterSpacing:'.04em' }}>
              Náutica Atins · KBN Admin
            </p>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {items.map((item, i) => (
            <MenuCard key={item.path} item={item} idx={i} onClick={() => navigate(item.path)}/>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes na-in { from { opacity:0; transform:translateY(18px) scale(.97); } to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function MenuCard({ item, idx, onClick }) {
  const ref = useRef(null);
  const [from, to] = item.g;

  const press   = () => { if (ref.current) ref.current.style.transform = 'scale(0.94)'; };
  const release = () => { if (ref.current) ref.current.style.transform = 'scale(1)'; };

  return (
    <button ref={ref} onClick={onClick}
      onMouseDown={press} onMouseUp={release}
      onTouchStart={press} onTouchEnd={release}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:14, padding:'28px 14px 22px', borderRadius:22, border:'none',
        cursor:'pointer', textAlign:'center', width:'100%',
        background:'rgba(255,255,255,.04)',
        backdropFilter:'blur(16px)',
        boxShadow:`0 0 0 1px rgba(46,207,196,.12), inset 0 1px 0 rgba(255,255,255,.05)`,
        animation:'na-in .45s ease both',
        animationDelay:`${idx * 0.08}s`,
        transition:'transform .13s ease, box-shadow .2s ease',
        position:'relative', overflow:'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 0 0 1px ${from}70, 0 8px 28px ${from}20, inset 0 1px 0 rgba(255,255,255,.07)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = `0 0 0 1px rgba(46,207,196,.12), inset 0 1px 0 rgba(255,255,255,.05)`;
      }}
    >
      {/* Glow difuso detrás del ícono */}
      <div style={{ position:'absolute', top:'-30%', left:'50%', transform:'translateX(-50%)',
        width:110, height:110, borderRadius:'50%',
        background:`radial-gradient(circle, ${from}28 0%, transparent 70%)`,
        pointerEvents:'none' }}/>

      {/* Ícono con gradiente del logo */}
      <div style={{
        width:56, height:56, borderRadius:18, flexShrink:0,
        background:`linear-gradient(140deg, ${from} 0%, ${to} 100%)`,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:`0 6px 20px ${from}45, inset 0 1px 0 rgba(255,255,255,.2)`,
        position:'relative', zIndex:1,
      }}>
        <i className={`ti ${item.icon}`} style={{ fontSize:26, color:'#fff' }}/>
      </div>

      {/* Texto */}
      <div style={{ position:'relative', zIndex:1 }}>
        <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-.01em' }}>
          {item.label}
        </p>
        {item.sub && (
          <p style={{ margin:'4px 0 0', fontSize:11, color:'rgba(255,255,255,.38)', lineHeight:1.3 }}>
            {item.sub}
          </p>
        )}
      </div>
    </button>
  );
}