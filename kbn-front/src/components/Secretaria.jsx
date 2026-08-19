import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation } from "react-router-dom";

// Componentes financieros reutilizados
import Ingreso from './Ingreso';
import Egreso from './Egreso';
import Pasivos from './Pasivos';
import Monitor from './Monitor';
import PresenciaWidget from './PresenciaWidget';
import { usePresencia } from '../hooks/usePresencia';

// ── Paleta Náutica Atins ───────────────────────────────────────────────────
const NA = {
  primary: '#1ABFA0',
  dark: '#0F6E56',
  darker: '#085041',
  light: '#E1F5EE',
  mid: '#9FE1CB',
  bg: '#f0faf7',
  text: '#0a2e27',
  text2: '#3a6b5e',
  border: '#c5e8df',
};

const sx = {
  label: { fontSize: 11, color: NA.text2, display: 'block', marginBottom: 5, fontWeight: 500 },
  input: {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: `0.5px solid ${NA.border}`, background: '#fff',
    color: NA.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .15s, box-shadow .15s',
  },
};
const focusOn = (e) => { e.target.style.borderColor = NA.primary; e.target.style.boxShadow = `0 0 0 3px ${NA.light}`; };
const focusOff = (e) => { e.target.style.borderColor = NA.border; e.target.style.boxShadow = 'none'; };

const Secretaria = () => {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRADOR';
  const [view, setView] = useState('INICIO');
  const [instructors, setInstructors] = useState([]);
  const [agendaList, setAgendaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Configuramos las cabeceras de autorización de forma centralizada
  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const today = new Date().toISOString().split('T')[0];

  const initialAgendaData = {
    alumno: '', fecha: today, hora: '10:00', horaSalida: '',
    instructorId: '', tipoAula: '', lugar: '',
    tarifa: '', horas: 1, horasPagadas: 0,
    hotelDerivacion: '', notas: '', estado: 'PENDIENTE'
  };
  const [agendaData, setAgendaData] = useState(initialAgendaData);

  // AGREGAMOS pasivoId PARA PODER VINCULAR EL EGRESO CON LA DEUDA
  const initialFinanceData = {
    tipoTransaccion: 'INGRESO', fecha: today, actividad: 'Clases',
    actividadOtro: '', vendedor: '', instructor: '', detalles: '',
    horas: 0, tarifa: 0, total: 0, gastos: 0, comision: 0,
    formaPago: 'Efectivo', formaPagoOtro: '', moneda: 'R$_STONE_IGNA',
    pasivoId: '' // <- CLAVE PARA PAGAR PASIVOS
  };
  const [financeData, setFinanceData] = useState(initialFinanceData);

  // --- CARGA DE DATOS CON SEGURIDAD (TOKEN) ---
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [resUsers, resAgenda] = await Promise.all([
        axios.get('https://kbn-admin-production.up.railway.app/usuario', axiosConfig),
        axios.get('https://kbn-admin-production.up.railway.app/api/agenda/listar', axiosConfig)
      ]);

      setInstructors(resUsers.data);

      const sorted = resAgenda.data.sort((a, b) => {
        const order = { 'RECHAZADA': 0, 'PENDIENTE': 1, 'CONFIRMADA': 2 };
        return order[a.estado] - order[b.estado] || new Date(b.fecha) - new Date(a.fecha);
      });
      setAgendaList(sorted);
    } catch (err) {
      console.error('Error cargando datos de Secretaria:', err);
    } finally {
      setLoading(false);
    }
  }, [token, axiosConfig]);

  useEffect(() => {
    fetchData();
  }, [fetchData, view]);

  useEffect(() => {
    const total = Number(financeData.horas) * Number(financeData.tarifa);
    setFinanceData(prev => ({
      ...prev,
      total
    }));
  }, [financeData.horas, financeData.tarifa]);

  // --- MANEJADORES DE EVENTOS ---
  const handleAgendaSubmit = async (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...agendaData,
      instructorId:  agendaData.instructorId ? Number(agendaData.instructorId) : null,
      tarifa:        Number(agendaData.tarifa),
      horas:         Number(agendaData.horas),
      horasPagadas:  Number(agendaData.horasPagadas),
      tipoAula:      agendaData.tipoAula   || null,
      horaSalida:    agendaData.horaSalida || null,
      notas:         agendaData.notas      || null,
    };

    try {
      await axios.post('https://kbn-admin-production.up.railway.app/api/agenda/crear', dataToSubmit, axiosConfig);
      alert(agendaData.id ? "Clase reasignada con éxito" : "Clase agendada con éxito");
      setAgendaData(initialAgendaData);
      setView('MONITOR');
    } catch (err) {
      console.error("Detalle del error:", err.response?.data);
      alert("Error al guardar en agenda. Verifica los permisos.");
    }
  };

  const prepararReasignacion = (clase) => {
    setAgendaData({ ...clase, estado: 'PENDIENTE' });
    setView('CALENDARIO');
  };

  const handleFinanceSubmit = async (e) => {
    e.preventDefault();
    try {
      // Si el pasivoId está vacío, lo mandamos como null para que el backend no falle
      const payload = {
        ...financeData,
        tipoTransaccion: view,
        pasivoId: financeData.pasivoId ? Number(financeData.pasivoId) : null
      };
      await axios.post('https://kbn-admin-production.up.railway.app/api/clases/guardar', payload, axiosConfig);
      setFinanceData(initialFinanceData);
      setView('INICIO');
    } catch (err) {
      console.error("Error finanzas:", err);
      alert("Error al registrar movimiento financiero");
    }
  };

  // --- SUB-COMPONENTES ---
  const InstructorSelector = ({ value, onChange, label, name, isFinance = false }) => (
    <div style={{ marginBottom: 0 }}>
      <label style={sx.label}>{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        style={{ ...sx.input, cursor: 'pointer' }}
        onFocus={focusOn}
        onBlur={focusOff}
        required={!isFinance} // No obligatorio en egresos generales
      >
        <option value="">Seleccionar...</option>
        {instructors.map(i => {
          const nombreCompleto = `${i.nombre} ${i.apellido}`.replace(/\s+/g, ' ').trim();
          return (
            <option key={i.id} value={isFinance ? nombreCompleto : i.id}>
              {nombreCompleto}
            </option>
          );
        })}
      </select>
    </div>
  );

  const MenuCard = ({ icon, title, sub, color, onClick }) => (
    <button onClick={onClick}
      onMouseDown={e => e.currentTarget.style.transform='scale(0.95)'}
      onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
      onTouchStart={e => e.currentTarget.style.transform='scale(0.95)'}
      onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:12, padding:'26px 14px 22px', borderRadius:20, border:'none',
        background:'rgba(255,255,255,.06)',
        cursor:'pointer', textAlign:'center', width:'100%',
        transition:'transform .12s ease', position:'relative', overflow:'hidden',
        boxShadow:'0 0 0 1px rgba(255,255,255,.08)',
      }}>
      <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)',
        width:110, height:110, borderRadius:'50%',
        background:`radial-gradient(circle, ${color}28 0%, transparent 70%)`, pointerEvents:'none' }}/>
      <div style={{ width:54, height:54, borderRadius:18,
        background:`linear-gradient(140deg, ${color} 0%, ${color}bb 100%)`,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:`0 6px 20px ${color}50, inset 0 1px 0 rgba(255,255,255,.2)`,
        position:'relative', zIndex:1 }}>
        <i className={`ti ${icon}`} style={{ fontSize:26, color:'#fff' }}/>
      </div>
      <div style={{ position:'relative', zIndex:1 }}>
        <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-.01em' }}>{title}</p>
        {sub && <p style={{ margin:'4px 0 0', fontSize:11, color:'rgba(255,255,255,.38)' }}>{sub}</p>}
      </div>
    </button>
  );

  // --- RENDERIZADO DE VISTAS ---
  if (view === 'INICIO') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 60px' }}>
        {/* Presencia del día */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin:0, fontSize:11, color:'rgba(46,207,196,.7)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase' }}>Panel de</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '4px 0 0', letterSpacing:'-.02em' }}>Secretaría</h1>
          </div>
          <PresenciaWidget />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <MenuCard icon="ti-device-desktop" title="Monitor"    sub="Estados"      color={NA.darker}  onClick={() => setView('MONITOR')} />
          <MenuCard icon="ti-calendar-plus"  title="Agendar"    sub="Nueva clase"  color={NA.dark}    onClick={() => setView('CALENDARIO')} />
          {isAdmin && (
            <MenuCard icon="ti-receipt-2"    title="Pasivos"    sub="Deudas"       color="#92400E"    onClick={() => setView('PASIVOS')} />
          )}
          <MenuCard icon="ti-cash"           title="Ingreso"    sub="Caja"         color={NA.primary} onClick={() => setView('INGRESO')} />
          <MenuCard icon="ti-minus"          title="Egreso"     sub="Gastos"       color="#c23a3a"    onClick={() => setView('EGRESO')} />
        </div>
      </div>
    );
  }

  if (view === 'MONITOR') {
    return (
      <Monitor
        agendaList={agendaList}
        loading={loading}
        prepararReasignacion={prepararReasignacion}
        setView={setView}
        NA={NA}
      />
    );
  }

  if (view === 'CALENDARIO') {

    // Tipos de aula con precio sugerido (mismo que Ingreso.jsx)
    const TIPOS = [
      { v:'APK',   l:'Kite Privada',         emoji:'🪁', tarifa:400  },
      { v:'ASPK',  l:'Kite Semiprivada',      emoji:'🪁', tarifa:530  },
      { v:'APWF',  l:'Wingfoil Privada',      emoji:'🦅', tarifa:420  },
      { v:'ASPWF', l:'Wingfoil Semiprivada',  emoji:'🦅', tarifa:550  },
      { v:'APWS',  l:'Windsurf Privada',      emoji:'🌊', tarifa:370  },
      { v:'ASPWS', l:'Windsurf Semiprivada',  emoji:'🌊', tarifa:500  },
      { v:'RENTAL',l:'Rental',                emoji:'🏄', tarifa:360  },
      { v:'OTRO',  l:'Otro',                  emoji:'✏️', tarifa:null },
    ];

    const COLOR_T = {
      APK:'#16A34A', ASPK:'#059669', APWF:'#2563EB', ASPWF:'#7C3AED',
      APWS:'#CA8A04', ASPWS:'#D97706', RENTAL:'#6B7280', OTRO:'#DC2626',
    };

    const set = (k, v) => setAgendaData(p => ({ ...p, [k]: v }));

    // Auto-sugerir tarifa al elegir tipo
    const elegirTipo = (v) => {
      const t = TIPOS.find(x => x.v === v);
      setAgendaData(p => ({
        ...p,
        tipoAula: v,
        tarifa: t?.tarifa ? String(t.tarifa) : p.tarifa,
      }));
    };

    // Calcular horas automático si hay hora entrada y salida
    const calcularHoras = (entrada, salida) => {
      if (!entrada || !salida) return;
      const [h1,m1] = entrada.split(':').map(Number);
      const [h2,m2] = salida.split(':').map(Number);
      const diff = (h2*60+m2 - h1*60-m1) / 60;
      if (diff > 0) setAgendaData(p => ({ ...p, horas: Math.round(diff * 100)/100 }));
    };

    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 4px 80px', fontFamily:'system-ui,sans-serif' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={() => setView('INICIO')}
            style={{ width:36, height:36, borderRadius:10, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <i className="ti ti-arrow-left" style={{ fontSize:17 }}/>
          </button>
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:NA.text, margin:0 }}>
              {agendaData.id ? 'Reasignar clase' : 'Agendar clase'}
            </h2>
            <p style={{ fontSize:11, color:NA.text2, margin:'2px 0 0' }}>
              Completá los datos de la clase
            </p>
          </div>
        </div>

        <form onSubmit={handleAgendaSubmit}>

          {/* ── Tipo de aula ── */}
          <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, padding:20, marginBottom:14 }}>
            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:NA.text2, textTransform:'uppercase', letterSpacing:'.07em' }}>
              Tipo de clase
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
              {TIPOS.map(t => {
                const sel = agendaData.tipoAula === t.v;
                const col = COLOR_T[t.v] || NA.dark;
                return (
                  <button key={t.v} type="button" onClick={() => elegirTipo(t.v)}
                    style={{
                      padding:'11px 10px', borderRadius:12, textAlign:'left', cursor:'pointer',
                      border:`1.5px solid ${sel ? col : NA.border}`,
                      background: sel ? `${col}15` : '#fff',
                      display:'flex', alignItems:'center', gap:8,
                    }}>
                    <span style={{ fontSize:18 }}>{t.emoji}</span>
                    <div>
                      <p style={{ margin:0, fontSize:12, fontWeight:700, color: sel ? col : NA.text }}>{t.l}</p>
                      {t.tarifa && <p style={{ margin:0, fontSize:10, color: sel ? col : NA.text2, opacity:.8 }}>R$ {t.tarifa}/h</p>}
                    </div>
                    {sel && <i className="ti ti-check" style={{ fontSize:14, color:col, marginLeft:'auto' }}/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Alumno + Instructor ── */}
          <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, padding:20, marginBottom:14 }}>
            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:NA.text2, textTransform:'uppercase', letterSpacing:'.07em' }}>
              Alumno e instructor
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={sx.label}>Nombre alumno *</label>
                <input type="text" placeholder="Juan García" value={agendaData.alumno}
                  onChange={e => set('alumno', e.target.value)}
                  style={sx.input} onFocus={focusOn} onBlur={focusOff} required/>
              </div>
              <InstructorSelector
                label="Instructor (opcional — asignar después)"
                name="instructorId"
                value={agendaData.instructorId}
                onChange={e => set('instructorId', e.target.value)}
              />
            </div>
            <div>
              <label style={sx.label}>Hotel / Derivación</label>
              <input type="text" placeholder="Pousada do Sol..." value={agendaData.hotelDerivacion}
                onChange={e => set('hotelDerivacion', e.target.value)}
                style={sx.input} onFocus={focusOn} onBlur={focusOff}/>
            </div>
          </div>

          {/* ── Fecha y horario ── */}
          <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, padding:20, marginBottom:14 }}>
            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:NA.text2, textTransform:'uppercase', letterSpacing:'.07em' }}>
              Fecha y horario
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={sx.label}>Fecha</label>
                <input type="date" value={agendaData.fecha}
                  onChange={e => set('fecha', e.target.value)}
                  style={sx.input} onFocus={focusOn} onBlur={focusOff}/>
              </div>
              <div>
                <label style={sx.label}>Hora entrada</label>
                <input type="time" value={agendaData.hora}
                  onChange={e => {
                    set('hora', e.target.value);
                    calcularHoras(e.target.value, agendaData.horaSalida);
                  }}
                  style={sx.input} onFocus={focusOn} onBlur={focusOff}/>
              </div>
              <div>
                <label style={sx.label}>Hora salida</label>
                <input type="time" value={agendaData.horaSalida}
                  onChange={e => {
                    set('horaSalida', e.target.value);
                    calcularHoras(agendaData.hora, e.target.value);
                  }}
                  style={sx.input} onFocus={focusOn} onBlur={focusOff}/>
              </div>
              <div>
                <label style={sx.label}>Horas</label>
                <input type="number" step="0.5" value={agendaData.horas}
                  onChange={e => set('horas', e.target.value)}
                  style={sx.input} onFocus={focusOn} onBlur={focusOff}/>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <label style={sx.label}>Lugar / Spot</label>
              <input type="text" placeholder="Escola, Caburé, Lagoa..."
                value={agendaData.lugar}
                onChange={e => set('lugar', e.target.value)}
                style={sx.input} onFocus={focusOn} onBlur={focusOff}/>
            </div>
          </div>

          {/* ── Condiciones económicas ── */}
          <div style={{ background:NA.darker, borderRadius:16, padding:20, marginBottom:14 }}>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 14px', fontWeight:600 }}>
              Condiciones económicas
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div>
                <label style={{ ...sx.label, color:'rgba(255,255,255,.6)' }}>Tarifa (R$/h)</label>
                <input type="number" value={agendaData.tarifa}
                  onChange={e => set('tarifa', e.target.value)}
                  style={{ ...sx.input, background:'rgba(255,255,255,.1)', border:'0.5px solid rgba(255,255,255,.15)', color:'#fff', fontWeight:600 }}/>
              </div>
              <div>
                <label style={{ ...sx.label, color:'rgba(255,255,255,.6)' }}>Horas</label>
                <input type="number" step="0.5" value={agendaData.horas}
                  onChange={e => set('horas', e.target.value)}
                  style={{ ...sx.input, background:'rgba(255,255,255,.1)', border:'0.5px solid rgba(255,255,255,.15)', color:'#fff' }}/>
              </div>
              <div>
                <label style={{ ...sx.label, color:'rgba(255,255,255,.6)' }}>Total est.</label>
                <div style={{ padding:'11px 13px', borderRadius:10, background:NA.primary, color:NA.darker, fontSize:16, fontWeight:700, textAlign:'right' }}>
                  {agendaData.tarifa && agendaData.horas
                    ? (Number(agendaData.tarifa) * Number(agendaData.horas)).toFixed(0)
                    : '—'}
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
              <div>
                <label style={{ ...sx.label, color:'rgba(255,255,255,.6)' }}>Seña / Pagado</label>
                <input type="number" value={agendaData.horasPagadas}
                  onChange={e => set('horasPagadas', e.target.value)}
                  style={{ ...sx.input, background:'rgba(255,255,255,.1)', border:'0.5px solid rgba(255,255,255,.15)', color:'#fff' }}/>
              </div>
              <div>
                <label style={{ ...sx.label, color:'rgba(255,255,255,.6)' }}>Resto a cobrar</label>
                <div style={{ padding:'11px 13px', borderRadius:10, background:'rgba(255,255,255,.08)', border:'0.5px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.8)', fontSize:14, fontWeight:600, textAlign:'right' }}>
                  {agendaData.tarifa && agendaData.horas
                    ? Math.max(0, Number(agendaData.tarifa)*Number(agendaData.horas) - Number(agendaData.horasPagadas||0)).toFixed(0)
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Notas ── */}
          <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, padding:20, marginBottom:18 }}>
            <label style={sx.label}>Notas adicionales</label>
            <textarea rows={2} placeholder="Nivel del alumno, preferencias, observaciones..."
              value={agendaData.notas || ''}
              onChange={e => set('notas', e.target.value)}
              style={{ ...sx.input, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }}/>
          </div>

          {/* Botones */}
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={() => setView('INICIO')}
              style={{ flex:1, padding:'14px', borderRadius:12, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, fontSize:14, fontWeight:500, cursor:'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={!agendaData.alumno}
              style={{ flex:2, padding:'14px', borderRadius:12, border:'none',
                background: !agendaData.alumno ? NA.mid : NA.dark,
                color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <i className="ti ti-check" style={{ fontSize:16 }}/>
              {agendaData.id ? 'Confirmar reasignación' : 'Agendar clase'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'INGRESO' || view === 'EGRESO') {
    const Component = view === 'INGRESO' ? Ingreso : Egreso;
    // Sin wrapper extra: Ingreso/Egreso ya traen su propio header,
    // padding y botón de volver con el diseño Náutica Atins.
    return (
      <Component
        formData={financeData}
        handleChange={e => setFinanceData({ ...financeData, [e.target.name]: e.target.value })}
        handleSubmit={handleFinanceSubmit}
        axiosConfig={axiosConfig}
        InstructorField={() => (
          <InstructorSelector
            label="Instructor relacionado (opcional)"
            name="instructor"
            isFinance={true}
            value={financeData.instructor}
            onChange={e => setFinanceData({ ...financeData, instructor: e.target.value })}
          />
        )}
        setView={(v) => setView(v || 'INICIO')}
      />
    );
  }

  if (view === 'PASIVOS') {
    return <Pasivos axiosConfig={axiosConfig} setView={setView} />;
  }
  return null;
};

export default Secretaria;