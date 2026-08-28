import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../axiosConfig';
import { useAuth } from '../context/AuthContext';

// ── Paleta NA ─────────────────────────────────────────────────────────────────
const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const toYMD   = (d) => d.toISOString().split('T')[0];
const HOY     = toYMD(new Date());
const fmt     = (ymd) => { if (!ymd) return ''; const [y,m,d] = ymd.split('-'); return `${d}/${m}/${y}`; };
const MESES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_S  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// Colores por tipo de aula
const COLOR_TIPO = {
  APK:    { bg: '#DCFCE7', border: '#16A34A', text: '#14532D' },
  ASPK:   { bg: '#D1FAE5', border: '#059669', text: '#064E3B' },
  APWF:   { bg: '#DBEAFE', border: '#2563EB', text: '#1E3A8A' },
  ASPWF:  { bg: '#EDE9FE', border: '#7C3AED', text: '#4C1D95' },
  APWS:   { bg: '#FEF9C3', border: '#CA8A04', text: '#713F12' },
  ASPWS:  { bg: '#FEF3C7', border: '#D97706', text: '#78350F' },
  RENTAL: { bg: '#F3F4F6', border: '#6B7280', text: '#1F2937' },
  DEFAULT:{ bg: NA.light,  border: NA.dark,   text: NA.darker },
};
const colorTipo = (tipo) => COLOR_TIPO[tipo] || COLOR_TIPO.DEFAULT;

// Decodifica tarifa del pasivo
const TARIFA_PREFIX = '__tarifa__:';
const decodeTarifa = (raw) => {
  if (!raw || !raw.startsWith(TARIFA_PREFIX)) return { tarifaHora: null };
  const sin = raw.slice(TARIFA_PREFIX.length);
  const sep = sin.indexOf('||');
  return { tarifaHora: parseFloat(sin.slice(0, sep)) };
};

// ── Componentes atómicos ──────────────────────────────────────────────────────
const Tag = ({ label, color, bg, small }) => (
  <span style={{
    fontSize: small ? 10 : 11, fontWeight: 600,
    padding: small ? '1px 6px' : '2px 8px',
    borderRadius: 99, background: bg, color, whiteSpace: 'nowrap',
  }}>{label}</span>
);

const Stat = ({ icon, value, label, color = NA.dark, bg = NA.light }) => (
  <div style={{ background: bg, borderRadius: 12, padding: '12px 14px', textAlign: 'center', flex: 1, minWidth: 80 }}>
    <i className={`ti ${icon}`} style={{ fontSize: 18, color, display: 'block', marginBottom: 4 }}/>
    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color }}>{value}</p>
    <p style={{ margin: '2px 0 0', fontSize: 10, color, opacity: .7, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
  </div>
);

// ── InstructorForm (Dashboard) ────────────────────────────────────────────────
const InstructorForm = () => {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRADOR' || user?.role === 'SECRETARIA';
  const [seccion, setSeccion] = useState('HOY');

  // Selector de instructor (solo admin)
  const [instructores,     setInstructores]     = useState([]);
  const [instructorSelec,  setInstructorSelec]  = useState(null); // { id, nombre, apellido }

  // El instructor "activo" es el seleccionado (si admin) o el propio usuario
  const instructorActivo = instructorSelec || {
    id:      user?.id,
    nombre:  user?.nombre,
    apellido: user?.apellido,
  };

  // Datos
  const [agenda,  setAgenda]  = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendario
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [diaSelec, setDiaSelec] = useState(HOY);

  const nombreCompleto = useMemo(() =>
    `${instructorActivo.nombre || ''} ${instructorActivo.apellido || ''}`.replace(/\s+/g, ' ').trim()
  , [instructorActivo]);

  // Cargar lista de instructores (solo admin)
  useEffect(() => {
    if (!isAdmin || !token) return;
    api.get('/api/agenda/listar')
      .then(r => {
        // Extraer instructores únicos de la agenda
        const mapa = {};
        r.data.forEach(a => {
          if (a.instructorId && a.nombreInstructor) {
            mapa[a.instructorId] = a.nombreInstructor;
          }
        });
        const lista = Object.entries(mapa).map(([id, nombre]) => ({
          id: Number(id),
          nombre: nombre.split(' ')[0],
          apellido: nombre.split(' ').slice(1).join(' '),
          nombreCompleto: nombre,
        }));
        setInstructores(lista);
      })
      .catch(console.error);
  }, [isAdmin, token]);

  // ── Fetch agenda ──────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    if (!token || !instructorActivo.id) return;
    setLoading(true);
    try {
      const rAgenda = await api.get('/api/agenda/listar');
      const misClases = rAgenda.data.filter(a => {
        const norm = (s) => (s||'').toLowerCase().replace(/\s+/g,' ').trim();
        return String(a.instructorId) === String(instructorActivo.id)
          || norm(a.nombreInstructor) === norm(nombreCompleto);
      });
      setAgenda(misClases);
    } catch (e) {
      console.error('InstructorForm:', e);
    } finally {
      setLoading(false);
    }
  }, [token, instructorActivo.id, nombreCompleto]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Derivaciones ──────────────────────────────────────────────────────────
  const clasesDelDia = useMemo(() =>
    agenda.filter(a => a.fecha?.toString() === diaSelec && a.estado !== 'RECHAZADA')
  , [agenda, diaSelec]);

  const clasesActivas = useMemo(() =>
    agenda.filter(a => a.estado !== 'RECHAZADA')
  , [agenda]);

  // Horas totales
  const horasTotales = useMemo(() =>
    clasesActivas.reduce((s, a) => s + (parseFloat(a.horas) || 0), 0)
  , [clasesActivas]);

  // Horas por tipo de aula
  const horasPorTipo = useMemo(() => {
    const map = {};
    clasesActivas.forEach(a => {
      const t = a.tipoAula || 'Sin tipo';
      map[t] = (map[t] || 0) + (parseFloat(a.horas) || 0);
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]);
  }, [clasesActivas]);

  // Resumen por período (últimos 10 días / mes actual)
  const hoy = new Date();
  const hace10 = new Date(hoy); hace10.setDate(hoy.getDate() - 10);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const horas10dias = useMemo(() =>
    clasesActivas
      .filter(a => a.fecha && new Date(a.fecha) >= hace10)
      .reduce((s,a) => s + (parseFloat(a.horas)||0), 0)
  , [clasesActivas]);

  const horasMes = useMemo(() =>
    clasesActivas
      .filter(a => a.fecha && new Date(a.fecha) >= inicioMes)
      .reduce((s,a) => s + (parseFloat(a.horas)||0), 0)
  , [clasesActivas]);

  // Clases por día del mes para el calendario
  const clasPorDia = useMemo(() => {
    const map = {};
    clasesActivas.forEach(a => {
      const f = a.fecha?.toString();
      if (!f) return;
      if (!map[f]) map[f] = [];
      map[f].push(a);
    });
    return map;
  }, [clasesActivas]);

  // Grilla del mes
  const grilla = useMemo(() => {
    const primer = new Date(mes.y, mes.m, 1).getDay();
    const ultimo = new Date(mes.y, mes.m+1, 0).getDate();
    const cells = [];
    for (let i = 0; i < primer; i++) cells.push(null);
    for (let d = 1; d <= ultimo; d++) cells.push(toYMD(new Date(mes.y, mes.m, d)));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [mes]);

  // Saldo de cuenta corriente

  // ── Nav por sección ───────────────────────────────────────────────────────
  const navItems = [
    { id: 'HOY',        icon: 'ti-sun',       label: 'Hoy'        },
    { id: 'CALENDARIO', icon: 'ti-calendar',  label: 'Calendario' },
    { id: 'RESUMEN',    icon: 'ti-chart-bar', label: 'Resumen'    },
  ];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:`3px solid ${NA.mid}`, borderTopColor:NA.dark, borderRadius:'50%', animation:'ispin .7s linear infinite', margin:'0 auto 12px' }}/>
        <p style={{ color:NA.text2, fontSize:13 }}>Cargando tus clases...</p>
        <style>{`@keyframes ispin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 12px 100px', fontFamily: 'system-ui, sans-serif', minHeight: '100dvh' }}>
      <style>{`@keyframes ispin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header personal ── */}
      <div style={{ padding: '20px 0 16px' }}>
        <p style={{ margin: 0, fontSize: 12, color: NA.text2 }}>
          {isAdmin && instructorSelec ? 'Viendo clases de' : 'Hola,'}
        </p>

        {/* Selector de instructor para admin */}
        {isAdmin ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4, flexWrap:'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: NA.text }}>
              {instructorSelec ? instructorSelec.nombreCompleto : `${user?.nombre?.split(' ')[0]} (yo)`}
            </h1>
            <select
              value={instructorSelec?.id || ''}
              onChange={e => {
                const id = Number(e.target.value);
                if (!id) { setInstructorSelec(null); return; }
                const inst = instructores.find(i => i.id === id);
                setInstructorSelec(inst || null);
              }}
              style={{ padding:'6px 12px', borderRadius:10, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text, fontSize:13, cursor:'pointer' }}>
              <option value="">👤 Mis clases</option>
              {instructores
                .filter(i => i.id !== user?.id)
                .map(i => (
                  <option key={i.id} value={i.id}>{i.nombreCompleto}</option>
                ))}
            </select>
          </div>
        ) : (
          <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: NA.text }}>
            {user?.nombre?.split(' ')[0]} 👋
          </h1>
        )}
      </div>

      {/* ── Stats rápidas ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Stat icon="ti-clock"    value={`${horasMes}h`}  label="este mes"   />
        <Stat icon="ti-calendar" value={clasesActivas.filter(a => {
          const f = a.fecha?.toString() || '';
          return f >= toYMD(inicioMes);
        }).length} label="clases mes" />
        <Stat icon="ti-calendar-check" value={clasesActivas.filter(a => a.estado === 'CONFIRMADA').length} label="confirmadas" color="#065F46" bg="#D1FAE5"/>
      </div>

      {/* ── Nav ── */}
      <div style={{ display: 'flex', background: '#fff', borderRadius: 14, border: `0.5px solid ${NA.border}`, padding: 4, gap: 4, marginBottom: 18 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setSeccion(n.id)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
              background: seccion === n.id ? NA.dark : 'transparent',
              color: seccion === n.id ? '#fff' : NA.text2,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
            <i className={`ti ${n.icon}`} style={{ fontSize: 16 }}/>
            {n.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          SECCIÓN: HOY
          ════════════════════════════════════════════════════════ */}
      {seccion === 'HOY' && (
        <div>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: NA.text2 }}>
            {fmt(HOY)} · {clasesDelDia.length === 0 ? 'Sin clases hoy' : `${clasesDelDia.length} clase${clasesDelDia.length>1?'s':''}`}
          </p>

          {clasesDelDia.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}` }}>
              <i className="ti ti-beach" style={{ fontSize: 36, opacity: .25, display: 'block', marginBottom: 8, color: NA.dark }}/>
              <p style={{ color: NA.text2, fontSize: 14 }}>No tenés clases agendadas para hoy.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {clasesDelDia
                .sort((a,b) => (a.hora||'').localeCompare(b.hora||''))
                .map(clase => {
                  const col = colorTipo(clase.tipoAula);
                  return (
                    <ClaseCard key={clase.id} clase={clase} col={col} mostrarConfirmar
                      onConfirmar={async () => {
                        try {
                          await api.put(`/api/agenda/${clase.id}/estado`, 'CONFIRMADA', { headers: {'Content-Type':'text/plain'} });
                          setAgenda(p => p.map(a => a.id===clase.id ? {...a, estado:'CONFIRMADA'} : a));
                        } catch { alert('No se pudo confirmar.'); }
                      }}
                    />
                  );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          SECCIÓN: CALENDARIO
          ════════════════════════════════════════════════════════ */}
      {seccion === 'CALENDARIO' && (
        <div>
          {/* Header mes */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <button onClick={() => setMes(p => { let m=p.m-1,y=p.y; if(m<0){m=11;y--;} return{y,m}; })}
              style={{ width:34, height:34, borderRadius:9, border:`0.5px solid ${NA.border}`, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:NA.text2 }}>
              <i className="ti ti-chevron-left" style={{ fontSize:15 }}/>
            </button>
            <span style={{ fontWeight:700, fontSize:15, color:NA.text }}>{MESES[mes.m]} {mes.y}</span>
            <button onClick={() => setMes(p => { let m=p.m+1,y=p.y; if(m>11){m=0;y++;} return{y,m}; })}
              style={{ width:34, height:34, borderRadius:9, border:`0.5px solid ${NA.border}`, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:NA.text2 }}>
              <i className="ti ti-chevron-right" style={{ fontSize:15 }}/>
            </button>
          </div>

          {/* Grilla */}
          <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:`0.5px solid ${NA.border}` }}>
              {DIAS_S.map(d => <div key={d} style={{ textAlign:'center', padding:'7px 0', fontSize:10, fontWeight:600, color:NA.text2 }}>{d}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
              {grilla.map((dia, idx) => {
                if (!dia) return <div key={`e${idx}`} style={{ minHeight:48, borderRight:`0.5px solid ${NA.border}`, borderBottom:`0.5px solid ${NA.border}`, background:'#fafafa' }}/>;
                const clasesDia = clasPorDia[dia] || [];
                const esHoy   = dia === HOY;
                const selec   = dia === diaSelec;
                return (
                  <div key={dia} onClick={() => setDiaSelec(dia)}
                    style={{ minHeight:48, padding:'4px', cursor:'pointer', boxSizing:'border-box',
                      borderRight:`0.5px solid ${NA.border}`, borderBottom:`0.5px solid ${NA.border}`,
                      background: selec ? NA.light : esHoy ? '#F0FDF4' : '#fff' }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:2,
                      background: esHoy ? NA.dark : 'transparent',
                      color: esHoy ? '#fff' : NA.text, fontSize:11, fontWeight: esHoy?700:400 }}>
                      {parseInt(dia.split('-')[2])}
                    </div>
                    {clasesDia.slice(0,3).map((c,i) => {
                      const col = colorTipo(c.tipoAula);
                      return <div key={i} style={{ height:4, borderRadius:99, background:col.border, marginBottom:1 }}/>;
                    })}
                    {clasesDia.length > 3 && <div style={{ fontSize:8, color:NA.text2, textAlign:'center' }}>+{clasesDia.length-3}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clases del día seleccionado */}
          {diaSelec && (
            <div>
              <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:600, color:NA.text }}>
                {fmt(diaSelec)} · {(clasPorDia[diaSelec]||[]).length} clase{(clasPorDia[diaSelec]||[]).length!==1?'s':''}
              </p>
              {(clasPorDia[diaSelec]||[]).length === 0 ? (
                <p style={{ color:NA.text2, fontSize:13, textAlign:'center', padding:'20px 0' }}>Sin clases este día.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(clasPorDia[diaSelec]||[])
                    .sort((a,b) => (a.hora||'').localeCompare(b.hora||''))
                    .map(clase => <ClaseCard key={clase.id} clase={clase} col={colorTipo(clase.tipoAula)} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          SECCIÓN: RESUMEN
          ════════════════════════════════════════════════════════ */}
      {seccion === 'RESUMEN' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Períodos */}
          <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, padding:18 }}>
            <p style={{ margin:'0 0 14px', fontSize:11, fontWeight:700, color:NA.text2, textTransform:'uppercase', letterSpacing:'.06em' }}>Horas trabajadas</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <PeriodStat label="Últimos 10 días" value={horas10dias} />
              <PeriodStat label={`${MESES[hoy.getMonth()].slice(0,3)}.`} value={horasMes} />
              <PeriodStat label="Total historial"  value={horasTotales} />
            </div>
          </div>

          {/* Por tipo de aula */}
          {horasPorTipo.length > 0 && (
            <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, padding:18 }}>
              <p style={{ margin:'0 0 14px', fontSize:11, fontWeight:700, color:NA.text2, textTransform:'uppercase', letterSpacing:'.06em' }}>Horas por tipo de clase</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {horasPorTipo.map(([tipo, hs]) => {
                  const col = colorTipo(tipo);
                  const pct = horasTotales > 0 ? (hs/horasTotales)*100 : 0;
                  return (
                    <div key={tipo}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:col.text, background:col.bg, padding:'1px 8px', borderRadius:99 }}>{tipo}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:NA.text }}>{hs}h</span>
                      </div>
                      <div style={{ height:6, borderRadius:99, background:NA.border }}>
                        <div style={{ height:6, borderRadius:99, background:col.border, width:`${pct}%`, transition:'width .4s' }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DEUDA POR CLASES FINALIZADAS ── */}
          {(() => {
            const finalizadas = clasesActivas.filter(a => a.estado === 'FINALIZADA' && a.tarifa && a.horas);
            if (finalizadas.length === 0) return null;

            // Agrupar por moneda/canal
            const totales = {};
            finalizadas.forEach(a => {
              const moneda = 'BRL';
              const total  = parseFloat(a.tarifa) * parseFloat(a.horas);
              totales[moneda] = (totales[moneda] || 0) + total;
            });

            return (
              <div style={{ background:'#fff', borderRadius:16, border:`1.5px solid ${NA.dark}`, padding:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <p style={{ margin:0, fontSize:11, fontWeight:700, color:NA.text2, textTransform:'uppercase', letterSpacing:'.06em' }}>
                    Clases finalizadas — a pagar
                  </p>
                  <span style={{ fontSize:11, color:NA.text2 }}>{finalizadas.length} clase{finalizadas.length>1?'s':''}</span>
                </div>

                {/* Total por moneda */}
                {Object.entries(totales).map(([m, total]) => (
                  <div key={m} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:13, color:NA.text2 }}>{m}</span>
                    <span style={{ fontSize:24, fontWeight:800, color:NA.dark }}>R$ {total.toFixed(0)}</span>
                  </div>
                ))}

                {/* Lista de clases */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, borderTop:`0.5px solid ${NA.border}`, paddingTop:12 }}>
                  {finalizadas.sort((a,b) => String(b.fecha).localeCompare(String(a.fecha))).map(a => {
                    const col   = colorTipo(a.tipoAula);
                    const total = (parseFloat(a.tarifa) * parseFloat(a.horas)).toFixed(0);
                    return (
                      <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:10, background:NA.bg }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
                            <span style={{ fontWeight:600, fontSize:13, color:NA.text }}>{a.alumno}</span>
                            {a.tipoAula && <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99, background:col.bg, color:col.text }}>{a.tipoAula}</span>}
                          </div>
                          <span style={{ fontSize:11, color:NA.text2 }}>
                            {String(a.fecha).substring(5)} · {a.horas}h × R$ {a.tarifa}/h
                            {a.hotelDerivacion && <span style={{ color:NA.dark, fontWeight:600 }}> · {a.hotelDerivacion}</span>}
                          </span>
                        </div>
                        <span style={{ fontWeight:700, fontSize:14, color:NA.darker, flexShrink:0, marginLeft:8 }}>
                          R$ {total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Cuenta corriente */}
          <div style={{ background: NA.darker, borderRadius:16, padding:18 }}>
            <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.06em' }}>
              Cuenta corriente
            </p>
            <p style={{ color:'rgba(255,255,255,.5)', fontSize:13, margin:0 }}>
              Tu saldo lo podés consultar con la administración.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── ClaseCard ─────────────────────────────────────────────────────────────────
const ClaseCard = ({ clase, col, mostrarConfirmar, onConfirmar }) => {
  const esPendiente = clase.estado === 'PENDIENTE';
  const colorEst = clase.estado === 'CONFIRMADA'
    ? { c:'#065F46', bg:'#D1FAE5' }
    : { c:'#92400E', bg:'#FEF3C7' };

  return (
    <div style={{ background:'#fff', borderRadius:14, border:`0.5px solid ${NA.border}`, borderLeft:`4px solid ${col.border}`, padding:'14px 16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:5 }}>
            <span style={{ fontWeight:700, fontSize:15, color:NA.text }}>{clase.alumno}</span>
            {clase.tipoAula && <Tag label={clase.tipoAula} color={col.text} bg={col.bg} small/>}
            <Tag label={clase.estado} color={colorEst.c} bg={colorEst.bg} small/>
          </div>
          <div style={{ fontSize:12, color:NA.text2, display:'flex', flexWrap:'wrap', gap:10 }}>
            {clase.hora       && <span><i className="ti ti-clock"     style={{ marginRight:3 }}/>{String(clase.hora).substring(0,5)}{clase.horaSalida && ` → ${String(clase.horaSalida).substring(0,5)}`}</span>}
            {clase.horas      && <span><i className="ti ti-hourglass" style={{ marginRight:3 }}/>{clase.horas}h</span>}
            {clase.lugar      && <span><i className="ti ti-map-pin"   style={{ marginRight:3 }}/>{clase.lugar}</span>}
          </div>
          {clase.tarifa && (
            <p style={{ margin:'4px 0 0', fontSize:11, color:NA.dark }}>
              R$ {clase.tarifa}/h
              {clase.horas && ` · Total: R$ ${(clase.tarifa * parseFloat(clase.horas)).toFixed(0)}`}
            </p>
          )}
        </div>

        {/* Botón confirmar (solo en sección HOY para pendientes) */}
        {mostrarConfirmar && esPendiente && onConfirmar && (
          <button onClick={onConfirmar}
            style={{ padding:'7px 14px', borderRadius:9, border:'none', background:'#D1FAE5', color:'#065F46', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
            ✓ Confirmar
          </button>
        )}
      </div>
    </div>
  );
};

// ── PeriodStat ────────────────────────────────────────────────────────────────
const PeriodStat = ({ label, value }) => (
  <div style={{ textAlign:'center', background:NA.bg, borderRadius:12, padding:'12px 8px' }}>
    <p style={{ margin:0, fontSize:22, fontWeight:800, color:NA.dark }}>{value}</p>
    <p style={{ margin:'3px 0 0', fontSize:10, color:NA.text2, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1.3 }}>{label}</p>
  </div>
);

export default InstructorForm;