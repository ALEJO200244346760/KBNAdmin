import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../axiosConfig';

// ── Paleta NA ─────────────────────────────────────────────────────────────────
const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

// ── Tipos de aula (espejados del Ingreso.jsx) ─────────────────────────────────
const TIPOS_AULA = [
  { v: 'APK',   l: 'APK — Privada Kite'         },
  { v: 'ASPK',  l: 'ASPK — Semiprivada Kite'    },
  { v: 'APWF',  l: 'APWF — Privada Wingfoil'    },
  { v: 'ASPWF', l: 'ASPWF — Semiprivada Wingfoil'},
  { v: 'APWS',  l: 'APWS — Privada Windsurf'    },
  { v: 'ASPWS', l: 'ASPWS — Semiprivada Windsurf'},
  { v: 'RENTAL',l: 'Rental de equipo'            },
  { v: 'OTRO',  l: 'Otro'                        },
];

const MONEDAS = [
  { v: 'R$_STONE_JOSE', l: 'R$ Stone José' },
  { v: 'R$_STONE_IGNA', l: 'R$ Stone Igna' },
  { v: 'R$_EFECTIVO',   l: 'R$ Efectivo'   },
  { v: 'USD_EFECTIVO',  l: 'USD Efectivo'  },
  { v: 'USD_MARIANA',   l: 'USD Mariana'   },
  { v: 'EUR_WIZE_IGNA', l: '€ Wize Igna'  },
  { v: 'BRL', l: 'BRL genérico' }, { v: 'USD', l: 'USD genérico' },
  { v: 'EUR', l: 'EUR' }, { v: 'ARS', l: 'ARS' },
];

const FORMAS_PAGO = ['Efectivo', 'Transferencia', 'MercadoPago', 'Tarjeta Crédito'];

const DIAS_S  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_S = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const toYMD    = (d) => d.toISOString().split('T')[0];
const HOY      = toYMD(new Date());
const fmt      = (ymd) => { if (!ymd) return ''; const [y,m,d] = ymd.split('-'); return `${d}/${m}/${y}`; };
const esHoy    = (ymd) => ymd === HOY;
const esPasado = (ymd) => ymd < HOY;
const labelMon = (m) => {
  const MAP = { R$_STONE_JOSE:'R$ Stone José', R$_STONE_IGNA:'R$ Stone Igna', R$_EFECTIVO:'R$ Efect.',
    USD_EFECTIVO:'USD Efect.', USD_MARIANA:'USD Mariana', EUR_WIZE_IGNA:'€ Wize' };
  return MAP[m] || m;
};
const normName = (s) => (s||'').toLowerCase().replace(/\s+/g,' ').trim();

// ── Pequeños componentes ──────────────────────────────────────────────────────
const Tag = ({ label, color, bg, small }) => (
  <span style={{ fontSize: small ? 10 : 11, fontWeight: 600, padding: small ? '1px 6px' : '2px 8px',
    borderRadius: 99, background: bg, color, whiteSpace: 'nowrap', display:'inline-block' }}>{label}</span>
);
const Dot = ({ color, n }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:1 }}>
    <span style={{ width:6, height:6, borderRadius:'50%', background:color, display:'inline-block' }}/>
    {n > 1 && <span style={{ fontSize:9, color, fontWeight:700 }}>{n}</span>}
  </span>
);
const Btn = ({ label, color='#fff', bg=NA.dark, onClick, small, icon, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ padding: small ? '5px 10px' : '9px 16px', borderRadius:9, border:'none', background: disabled ? '#e5e7eb' : bg,
      color: disabled ? '#9ca3af' : color, fontSize: small ? 11 : 13, fontWeight:600, cursor: disabled ? 'default' : 'pointer',
      display:'flex', alignItems:'center', gap:5 }}>
    {icon && <i className={`ti ${icon}`} style={{ fontSize: small ? 12 : 15 }}/>}{label}
  </button>
);
const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:11, color:NA.text2, display:'block', marginBottom:4, fontWeight:500 }}>{label}</label>}
    <input {...props} style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid ${NA.border}`,
      fontSize:14, color:NA.text, background:'#fff', boxSizing:'border-box', fontFamily:'inherit', ...(props.style||{}) }}/>
  </div>
);

// ── Monitor ───────────────────────────────────────────────────────────────────
const Monitor = () => {
  const [mes, setMes] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [agenda,   setAgenda]   = useState([]);
  const [clases,   setClases]   = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Panel lateral
  const [diaSelec, setDiaSelec] = useState(null);

  // Filtros
  const [filtroInst, setFiltroInst] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODO');

  // Modal de edición de clase (tipoAula, horaSalida)
  const [editClase, setEditClase] = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const guardandoEditRef = useRef(false);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Modal de nuevo ingreso con selector de clases
  const [showIngreso, setShowIngreso] = useState(false);
  const [ingresoFecha, setIngresoFecha] = useState(null);
  const [ingresoForm, setIngresoForm] = useState({});
  const [clasesSelec, setClasesSelec] = useState([]); // IDs de agenda seleccionadas
  const enviandoRef = useRef(false);
  const [enviando, setEnviando] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [rA, rC, rU] = await Promise.all([
        api.get('/api/agenda/listar'),
        api.get('/api/clases/listar'),
        api.get('/usuario'),
      ]);
      setAgenda(rA.data);
      setClases(rC.data);
      setUsuarios(rU.data);
    } catch(e) { console.error('Monitor:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Derivaciones ──────────────────────────────────────────────────────────
  const ingresos = useMemo(() => clases.filter(c => c.tipoTransaccion === 'INGRESO'), [clases]);
  const egresos  = useMemo(() => clases.filter(c => c.tipoTransaccion === 'EGRESO'),  [clases]);

  // Instructores únicos
  const instructores = useMemo(() => {
    const set = new Set();
    agenda.forEach(a => a.nombreInstructor && set.add(a.nombreInstructor));
    usuarios.forEach(u => set.add(`${u.nombre} ${u.apellido}`.replace(/\s+/g,' ').trim()));
    return Array.from(set).filter(Boolean).sort();
  }, [agenda, usuarios]);

  // Clase agenda → ingreso vinculado (por cobrada+ingresoId o por fecha+instructor)
  const ingresoDeClase = useCallback((clase) => {
    if (clase.cobrada && clase.ingresoId) {
      return ingresos.find(i => i.id === clase.ingresoId) || null;
    }
    // Fallback: heurística fecha + instructor
    const f = clase.fecha?.toString();
    return ingresos.find(i => i.fecha === f && normName(i.instructor) === normName(clase.nombreInstructor)) || null;
  }, [ingresos]);

  const tieneCobro = (clase) => clase.cobrada || !!ingresoDeClase(clase);

  // ── Alertas: clases pasadas sin cobro ────────────────────────────────────
  const alertas = useMemo(() => agenda.filter(a => {
    const f = a.fecha?.toString();
    return f && esPasado(f) && a.estado !== 'RECHAZADA' && !tieneCobro(a);
  }), [agenda, ingresos]);

  // ── Filtro aplicado ───────────────────────────────────────────────────────
  const agendaF = useMemo(() => agenda.filter(a => {
    if (filtroInst && a.nombreInstructor !== filtroInst) return false;
    if (filtroTipo === 'INGRESOS' || filtroTipo === 'EGRESOS') return false;
    if (filtroTipo === 'ALERTAS') {
      const f = a.fecha?.toString();
      return f && esPasado(f) && a.estado !== 'RECHAZADA' && !tieneCobro(a);
    }
    return true;
  }), [agenda, filtroInst, filtroTipo, alertas]);

  const ingresosF = useMemo(() => ingresos.filter(i => {
    if (filtroInst && normName(i.instructor) !== normName(filtroInst)) return false;
    if (filtroTipo === 'CLASES' || filtroTipo === 'ALERTAS') return false;
    return true;
  }), [ingresos, filtroInst, filtroTipo]);

  const egresosF = useMemo(() => egresos.filter(e => {
    if (filtroTipo === 'CLASES' || filtroTipo === 'ALERTAS') return false;
    return true;
  }), [egresos, filtroTipo]);

  // ── Grilla del mes ────────────────────────────────────────────────────────
  const grilla = useMemo(() => {
    const { y, m } = mes;
    const primer = new Date(y, m, 1).getDay();
    const ultimo = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < primer; i++) cells.push(null);
    for (let d = 1; d <= ultimo; d++) cells.push(toYMD(new Date(y, m, d)));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [mes]);

  // ── Dots por día ─────────────────────────────────────────────────────────
  const dotsD = useMemo(() => {
    const map = {};
    const add = (f, tipo) => { if (!f) return; if (!map[f]) map[f] = {}; map[f][tipo] = (map[f][tipo]||0)+1; };
    agendaF.forEach(a => {
      const f = a.fecha?.toString();
      const esAlerta = f && esPasado(f) && a.estado !== 'RECHAZADA' && !tieneCobro(a);
      add(f, esAlerta ? 'alerta' : 'clase');
    });
    ingresosF.forEach(i => add(i.fecha, 'ingreso'));
    egresosF.forEach(e => add(e.fecha, 'egreso'));
    return map;
  }, [agendaF, ingresosF, egresosF]);

  // ── Eventos del día ───────────────────────────────────────────────────────
  const evD = useMemo(() => {
    if (!diaSelec) return { clases:[], ingresos:[], egresos:[] };
    return {
      clases:   agendaF.filter(a => a.fecha?.toString() === diaSelec),
      ingresos: ingresosF.filter(i => i.fecha === diaSelec),
      egresos:  egresosF.filter(e => e.fecha === diaSelec),
    };
  }, [diaSelec, agendaF, ingresosF, egresosF]);

  // ── Clases del día para selector de ingreso (todas las clases del período) ─
  const clasesParaIngreso = useMemo(() => {
    if (!ingresoFecha) return [];
    return agenda.filter(a => a.fecha?.toString() === ingresoFecha && a.estado !== 'RECHAZADA');
  }, [agenda, ingresoFecha]);

  // ── Navegar mes ───────────────────────────────────────────────────────────
  const navMes = (dir) => {
    setMes(p => {
      let m = p.m + dir, y = p.y;
      if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
      return { y, m };
    });
    setDiaSelec(null);
  };

  // ── Cambiar estado agenda ─────────────────────────────────────────────────
  const cambiarEstado = async (id, estado) => {
    await api.put(`/api/agenda/${id}/estado`, estado, { headers: {'Content-Type':'text/plain'} });
    setAgenda(p => p.map(a => a.id === id ? {...a, estado} : a));
  };

  // ── Abrir modal de edición de clase ──────────────────────────────────────
  const abrirEditClase = (clase) => {
    setEditClase(clase);
    setEditForm({
      tipoAula:   clase.tipoAula || '',
      horaSalida: clase.horaSalida ? clase.horaSalida.substring(0,5) : '',
      horas:      clase.horas || '',
      lugar:      clase.lugar || '',
      tarifa:     clase.tarifa || '',
    });
  };

  const guardarEditClase = async () => {
    if (guardandoEditRef.current) return;
    guardandoEditRef.current = true;
    setGuardandoEdit(true);
    try {
      const payload = {
        tipoAula: editForm.tipoAula || null,
        horaSalida: editForm.horaSalida || null,
        horas: editForm.horas ? parseFloat(editForm.horas) : null,
        lugar: editForm.lugar || null,
        tarifa: editForm.tarifa ? parseFloat(editForm.tarifa) : null,
      };
      const res = await api.patch(`/api/agenda/${editClase.id}`, payload);
      setAgenda(p => p.map(a => a.id === editClase.id ? res.data : a));
      setEditClase(null);
    } catch(e) { alert('No se pudo guardar.'); }
    finally { guardandoEditRef.current = false; setGuardandoEdit(false); }
  };

  // ── Abrir modal de ingreso ────────────────────────────────────────────────
  const abrirIngreso = (fecha, prefill = {}) => {
    setIngresoFecha(fecha);
    setClasesSelec([]);
    setIngresoForm({
      fecha:      fecha,
      total:      '',
      moneda:     'R$_STONE_IGNA',
      formaPago:  'Efectivo',
      detalles:   '',
      instructor: prefill.instructor || '',
      actividad:  'Clase de Kite',
      asignadoA:  'JOSE',
    });
    setShowIngreso(true);
  };

  const toggleClaseSelec = (id) => {
    setClasesSelec(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  // Cuando se seleccionan clases, inferir instructor/total automáticamente
  useEffect(() => {
    if (clasesSelec.length === 0) return;
    const seleccionadas = clasesParaIngreso.filter(c => clasesSelec.includes(c.id));
    // Suma de tarifas * horas si están disponibles
    const totalAuto = seleccionadas.reduce((sum, c) => {
      if (c.tarifa && c.horas) return sum + (c.tarifa * c.horas);
      return sum;
    }, 0);
    const instructorAuto = seleccionadas.length === 1 ? seleccionadas[0].nombreInstructor : '';
    const alumnos = seleccionadas.map(c => c.alumno).filter(Boolean).join(', ');
    setIngresoForm(p => ({
      ...p,
      instructor: instructorAuto || p.instructor,
      total: totalAuto > 0 ? String(totalAuto) : p.total,
      detalles: alumnos || p.detalles,
    }));
  }, [clasesSelec]);

  const guardarIngreso = async () => {
    if (enviandoRef.current) return;
    if (!ingresoForm.total || parseFloat(ingresoForm.total) < 0) return alert('Ingresá el monto.');
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const descuento = ingresoForm.formaPago === 'Tarjeta Crédito' ? parseFloat(ingresoForm.total)*0.05 : 0;
      const totalFinal = parseFloat(ingresoForm.total) - descuento;

      const payload = {
        tipoTransaccion: 'INGRESO',
        fecha:      ingresoForm.fecha,
        actividad:  ingresoForm.actividad || 'Clase',
        detalles:   ingresoForm.detalles,
        instructor: ingresoForm.instructor,
        total:      String(totalFinal),
        moneda:     ingresoForm.moneda,
        formaPago:  ingresoForm.formaPago,
        comision:   String(descuento),
        asignadoA:  ingresoForm.asignadoA || null,
        agendaIds:  clasesSelec.length > 0 ? clasesSelec.join(',') : null,
      };

      const res = await api.post('/api/clases/guardar', payload);

      // Marcar las clases de agenda como cobradas (el backend ya lo hace via FinanzasService,
      // pero actualizamos el estado local también para UI inmediata)
      if (clasesSelec.length > 0) {
        setAgenda(p => p.map(a =>
          clasesSelec.includes(a.id) ? {...a, cobrada: true, ingresoId: res.data.id} : a
        ));
      }

      await cargar(); // Refetch para datos frescos
      setShowIngreso(false);
    } catch(e) {
      console.error(e);
      alert('Error al guardar el ingreso.');
    } finally { enviandoRef.current = false; setEnviando(false); }
  };

  // ── Resumen del mes ───────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const { y, m } = mes;
    const inMes = (f) => { if (!f) return false; const [fy,fm] = f.split('-'); return parseInt(fy)===y && parseInt(fm)-1===m; };
    const clasesMes    = agendaF.filter(a => inMes(a.fecha?.toString()));
    const ingresosMes  = ingresosF.filter(i => inMes(i.fecha));
    const egresosMes   = egresosF.filter(e => inMes(e.fecha));
    const alertasMes   = alertas.filter(a => inMes(a.fecha?.toString()));

    const balances = {};
    ingresosMes.forEach(i => { const mo = i.moneda||'BRL'; balances[mo] = (balances[mo]||0) + (parseFloat(i.total)||0); });
    egresosMes.forEach(e  => { const mo = e.moneda||'BRL'; balances[mo] = (balances[mo]||0) - (parseFloat(e.total)||0); });

    return { clasesMes, ingresosMes, egresosMes, alertasMes, balances };
  }, [mes, agendaF, ingresosF, egresosF, alertas]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', background:NA.bg }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:`3px solid ${NA.mid}`, borderTopColor:NA.dark, borderRadius:'50%', animation:'mspin .7s linear infinite', margin:'0 auto 12px' }}/>
        <p style={{ color:NA.text2, fontSize:13 }}>Cargando monitor...</p>
        <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:940, margin:'0 auto', padding:'0 4px 80px', fontFamily:'system-ui,sans-serif' }}>
      <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>

      {/* ── BANNER ALERTAS ── */}
      {alertas.length > 0 && (
        <details style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:14, padding:'12px 16px', marginBottom:14 }}>
          <summary style={{ fontWeight:700, color:'#9A3412', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:8, listStyle:'none' }}>
            <i className="ti ti-alert-triangle" style={{ color:'#EA580C', fontSize:17 }}/>
            {alertas.length} clase{alertas.length>1?'s':''} sin cobro registrado
          </summary>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
            {alertas.map(a => {
              const f = a.fecha?.toString();
              return (
                <div key={a.id} style={{ background:'#fff', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                  <div>
                    <p style={{ margin:0, fontWeight:600, color:NA.text, fontSize:13 }}>{a.alumno}</p>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:NA.text2 }}>{fmt(f)} · {a.nombreInstructor} · {a.horas}h {a.tipoAula && `· ${a.tipoAula}`}</p>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <Btn label="Ver día" bg='#fff' color={NA.dark} small
                      onClick={() => { setDiaSelec(f); }}/>
                    <Btn label="+ Ingreso" small icon="ti-cash"
                      onClick={() => abrirIngreso(f, { instructor: a.nombreInstructor })}/>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* ── FILTROS ── */}
      <div style={{ background:'#fff', borderRadius:14, border:`0.5px solid ${NA.border}`, padding:'10px 14px', marginBottom:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        {[
          { v:'TODO',     l:'Todo'    },
          { v:'CLASES',   l:'📅 Clases'  },
          { v:'INGRESOS', l:'💰 Ingresos' },
          { v:'EGRESOS',  l:'💸 Egresos'  },
          { v:'ALERTAS',  l:`⚠️ Sin cobro${alertas.length>0?` (${alertas.length})`:''}`},
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setFiltroTipo(v)}
            style={{ padding:'5px 12px', borderRadius:99, border:'none', fontSize:12, fontWeight:500, cursor:'pointer',
              background: filtroTipo===v ? NA.dark : NA.light, color: filtroTipo===v ? '#fff' : NA.text2 }}>
            {l}
          </button>
        ))}
        <select value={filtroInst} onChange={e => setFiltroInst(e.target.value)}
          style={{ padding:'6px 10px', borderRadius:8, border:`0.5px solid ${NA.border}`, fontSize:12, color:NA.text, background:NA.bg, marginLeft:'auto' }}>
          <option value="">Todos los instructores</option>
          {instructores.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <button onClick={cargar}
          style={{ padding:'6px 12px', borderRadius:8, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-refresh" style={{ fontSize:14 }}/> Actualizar
        </button>
      </div>

      {/* ── CALENDARIO ── */}
      <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginBottom:14 }}>
        {/* Header mes */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
          <button onClick={() => navMes(-1)} style={{ width:32, height:32, borderRadius:8, border:`0.5px solid ${NA.border}`, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="ti ti-chevron-left" style={{ fontSize:15, color:NA.text2 }}/>
          </button>
          <span style={{ fontWeight:700, fontSize:16, color:NA.text }}>{MESES[mes.m]} {mes.y}</span>
          <button onClick={() => navMes(1)} style={{ width:32, height:32, borderRadius:8, border:`0.5px solid ${NA.border}`, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="ti ti-chevron-right" style={{ fontSize:15, color:NA.text2 }}/>
          </button>
        </div>
        {/* Días semana */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:`0.5px solid ${NA.border}` }}>
          {DIAS_S.map(d => <div key={d} style={{ textAlign:'center', padding:'7px 0', fontSize:11, fontWeight:600, color:NA.text2 }}>{d}</div>)}
        </div>
        {/* Celdas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {grilla.map((dia, idx) => {
            if (!dia) return <div key={`e${idx}`} style={{ minHeight:56, borderRight:`0.5px solid ${NA.border}`, borderBottom:`0.5px solid ${NA.border}`, background:'#fafafa' }}/>;
            const ev = dotsD[dia] || {};
            const selec = diaSelec === dia;
            const hoy   = esHoy(dia);
            return (
              <div key={dia} onClick={() => setDiaSelec(selec ? null : dia)}
                style={{ minHeight:56, padding:'5px', cursor:'pointer', boxSizing:'border-box',
                  borderRight:`0.5px solid ${NA.border}`, borderBottom:`0.5px solid ${NA.border}`,
                  background: selec ? NA.light : hoy ? '#F0FDF4' : '#fff', transition:'background .1s' }}>
                <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:3,
                  background: hoy ? NA.dark : 'transparent', color: hoy ? '#fff' : NA.text, fontSize:12, fontWeight: hoy ? 700 : 400 }}>
                  {parseInt(dia.split('-')[2])}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                  {ev.alerta  > 0 && <Dot color="#EA580C" n={ev.alerta} />}
                  {ev.clase   > 0 && <Dot color={NA.dark}  n={ev.clase}  />}
                  {ev.ingreso > 0 && <Dot color="#059669"  n={ev.ingreso}/>}
                  {ev.egreso  > 0 && <Dot color="#DC2626"  n={ev.egreso} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LEYENDA ── */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:14 }}>
        {[['#EA580C','Sin cobro'],['#0F6E56','Clase'],[' #059669','Ingreso'],['#DC2626','Egreso']].map(([c,l]) => (
          <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:NA.text2 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>{l}
          </span>
        ))}
      </div>

      {/* ── PANEL DEL DÍA ── */}
      {diaSelec && (
        <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginBottom:14 }}>
          {/* Header día */}
          <div style={{ padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div>
              <p style={{ margin:0, fontWeight:700, fontSize:16, color:NA.text }}>{fmt(diaSelec)}</p>
              <p style={{ margin:'2px 0 0', fontSize:11, color:NA.text2 }}>
                {evD.clases.length} clase{evD.clases.length!==1?'s':''} · {evD.ingresos.length} ingreso{evD.ingresos.length!==1?'s':''} · {evD.egresos.length} egreso{evD.egresos.length!==1?'s':''}
              </p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {!esPasado(diaSelec) ? null : (
                <Btn label="+ Ingreso del día" icon="ti-cash"
                  onClick={() => abrirIngreso(diaSelec)}/>
              )}
            </div>
          </div>

          {/* ── CLASES DEL DÍA ── */}
          {evD.clases.length > 0 && (
            <>
              <div style={{ padding:'7px 18px', background:NA.bg, borderBottom:`0.5px solid ${NA.border}` }}>
                <span style={{ fontSize:10, fontWeight:700, color:NA.text2, textTransform:'uppercase', letterSpacing:'.08em' }}>Clases agendadas</span>
              </div>
              {evD.clases.map(a => {
                const cobrado  = tieneCobro(a);
                const ingVinc  = ingresoDeClase(a);
                const pasada   = esPasado(a.fecha?.toString());
                const colorEst = a.estado==='CONFIRMADA' ? {c:'#065F46',bg:'#D1FAE5'} : a.estado==='RECHAZADA' ? {c:'#991B1B',bg:'#FEE2E2'} : {c:'#92400E',bg:'#FEF3C7'};
                return (
                  <div key={a.id} style={{ padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:4, alignItems:'center' }}>
                          <span style={{ fontWeight:700, fontSize:14, color:NA.text }}>{a.alumno}</span>
                          <Tag label={a.estado} color={colorEst.c} bg={colorEst.bg} small/>
                          {a.tipoAula && <Tag label={a.tipoAula} color={NA.darker} bg={NA.light} small/>}
                          {pasada && !cobrado && <Tag label="⚠ Sin cobro" color="#9A3412" bg="#FFF7ED" small/>}
                          {cobrado && <Tag label="✓ Cobrado" color="#065F46" bg="#D1FAE5" small/>}
                        </div>
                        <p style={{ margin:0, fontSize:12, color:NA.text2 }}>
                          {a.nombreInstructor}
                          {a.hora && ` · ${String(a.hora).substring(0,5)}`}
                          {a.horaSalida && ` → ${String(a.horaSalida).substring(0,5)}`}
                          {a.horas && ` · ${a.horas}h`}
                          {a.lugar && ` · ${a.lugar}`}
                        </p>
                        {a.tarifa && <p style={{ margin:'2px 0 0', fontSize:11, color:NA.dark }}>Tarifa: R$ {a.tarifa}{a.horasPagadas ? ` · Pagado: R$ ${a.horasPagadas}` : ''}</p>}
                        {ingVinc && (
                          <p style={{ margin:'4px 0 0', fontSize:11, color:'#059669' }}>
                            💰 Ingreso #{ingVinc.id} · R$ {parseFloat(ingVinc.total).toFixed(2)} {labelMon(ingVinc.moneda)}
                          </p>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end' }}>
                        {/* Cambiar estado */}
                        {a.estado === 'PENDIENTE' && (
                          <div style={{ display:'flex', gap:4 }}>
                            <Btn label="✓" bg="#D1FAE5" color="#065F46" small onClick={() => cambiarEstado(a.id,'CONFIRMADA')}/>
                            <Btn label="✗" bg="#FEE2E2" color="#DC2626" small onClick={() => cambiarEstado(a.id,'RECHAZADA')}/>
                          </div>
                        )}
                        {a.estado === 'CONFIRMADA' && !pasada && (
                          <Btn label="Rechazar" bg="#FEE2E2" color="#DC2626" small onClick={() => cambiarEstado(a.id,'RECHAZADA')}/>
                        )}
                        {/* Editar clase */}
                        <Btn label="Editar clase" bg={NA.light} color={NA.darker} small icon="ti-edit"
                          onClick={() => abrirEditClase(a)}/>
                        {/* Registrar cobro si pasada y sin cobro */}
                        {pasada && !cobrado && (
                          <Btn label="Registrar cobro" small icon="ti-cash"
                            onClick={() => abrirIngreso(a.fecha?.toString(), { instructor: a.nombreInstructor })}/>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── INGRESOS DEL DÍA ── */}
          {evD.ingresos.length > 0 && (
            <>
              <div style={{ padding:'7px 18px', background:'#F0FDF4', borderBottom:`0.5px solid ${NA.border}` }}>
                <span style={{ fontSize:10, fontWeight:700, color:'#065F46', textTransform:'uppercase', letterSpacing:'.08em' }}>Ingresos</span>
              </div>
              {evD.ingresos.map(i => {
                // Clases de agenda vinculadas a este ingreso
                const clasesVinc = agenda.filter(a => a.ingresoId === i.id || (i.agendaIds||'').split(',').map(x=>parseInt(x)).includes(a.id));
                return (
                  <div key={i.id} style={{ padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'baseline', flexWrap:'wrap', marginBottom:3 }}>
                          <span style={{ fontWeight:700, fontSize:15, color:'#065F46' }}>
                            + {parseFloat(i.total||0).toFixed(2)} {labelMon(i.moneda)}
                          </span>
                          <span style={{ fontSize:11, color:NA.text2 }}>#{i.id}</span>
                          {i.asignadoA && i.asignadoA !== 'NINGUNO' && <Tag label={i.asignadoA} color={NA.darker} bg={NA.light} small/>}
                          {(!i.asignadoA || i.asignadoA==='NINGUNO') && <Tag label="Sin asignar" color="#92400E" bg="#FEF3C7" small/>}
                        </div>
                        <p style={{ margin:0, fontSize:12, color:NA.text2 }}>
                          {i.actividad}{i.instructor && ` · ${i.instructor}`} · {i.formaPago}
                        </p>
                        {i.detalles && <p style={{ margin:'2px 0 0', fontSize:11, color:NA.text2, fontStyle:'italic' }}>{i.detalles.split('|')[0].trim()}</p>}
                        {clasesVinc.length > 0 && (
                          <p style={{ margin:'4px 0 0', fontSize:11, color:'#065F46' }}>
                            📅 Clases vinculadas: {clasesVinc.map(c => c.alumno).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── EGRESOS DEL DÍA ── */}
          {evD.egresos.length > 0 && (
            <>
              <div style={{ padding:'7px 18px', background:'#FEF2F2', borderBottom:`0.5px solid ${NA.border}` }}>
                <span style={{ fontSize:10, fontWeight:700, color:'#991B1B', textTransform:'uppercase', letterSpacing:'.08em' }}>Egresos</span>
              </div>
              {evD.egresos.map(e => (
                <div key={e.id} style={{ padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
                  <div style={{ display:'flex', gap:8, alignItems:'baseline', marginBottom:3, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700, fontSize:15, color:'#DC2626' }}>
                      - {parseFloat(e.total||0).toFixed(2)} {labelMon(e.moneda)}
                    </span>
                    <span style={{ fontSize:11, color:NA.text2 }}>#{e.id}</span>
                    {e.tipoMovimientoPasivo && <Tag label={e.tipoMovimientoPasivo} color="#991B1B" bg="#FEE2E2" small/>}
                  </div>
                  <p style={{ margin:0, fontSize:12, color:NA.text2 }}>{e.detalles || e.actividad} · {e.formaPago}</p>
                </div>
              ))}
            </>
          )}

          {evD.clases.length===0 && evD.ingresos.length===0 && evD.egresos.length===0 && (
            <p style={{ textAlign:'center', color:NA.text2, padding:'28px 0', fontSize:14 }}>Sin eventos para este día.</p>
          )}
        </div>
      )}

      {/* ── RESUMEN DEL MES ── */}
      <div style={{ background:'#fff', borderRadius:14, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginBottom:14 }}>
        <div style={{ padding:'10px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
          <p style={{ margin:0, fontWeight:700, fontSize:14, color:NA.text }}>Resumen {MESES_S[mes.m]} {mes.y}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:1, background:NA.border }}>
          {[
            { l:'Clases', v:resumen.clasesMes.length,   c:NA.dark,  bg:NA.light,  icon:'ti-calendar'     },
            { l:'Ingresos', v:resumen.ingresosMes.length, c:'#065F46',bg:'#D1FAE5', icon:'ti-trending-up'  },
            { l:'Egresos',  v:resumen.egresosMes.length,  c:'#991B1B',bg:'#FEE2E2', icon:'ti-trending-down' },
            { l:'Sin cobro', v:resumen.alertasMes.length, c:'#9A3412',bg:'#FFF7ED', icon:'ti-alert-triangle'},
          ].map(({ l, v, c, bg, icon }) => (
            <div key={l} style={{ padding:'14px 12px', background:'#fff', textAlign:'center' }}>
              <i className={`ti ${icon}`} style={{ fontSize:20, color:c, display:'block', marginBottom:3 }}/>
              <p style={{ margin:0, fontSize:22, fontWeight:700, color:c }}>{v}</p>
              <p style={{ margin:'2px 0 0', fontSize:11, color:NA.text2 }}>{l}</p>
            </div>
          ))}
        </div>
        {Object.keys(resumen.balances).length > 0 && (
          <div style={{ padding:'12px 18px', borderTop:`0.5px solid ${NA.border}` }}>
            <p style={{ margin:'0 0 8px', fontSize:11, color:NA.text2, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Balance neto</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {Object.entries(resumen.balances).map(([mo, val]) => (
                <div key={mo} style={{ padding:'5px 14px', borderRadius:99, background: val>=0 ? '#D1FAE5' : '#FEE2E2', color: val>=0 ? '#065F46' : '#991B1B', fontSize:13, fontWeight:600 }}>
                  {labelMon(mo)}: {val>=0?'+':''}{val.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          MODAL: EDITAR CLASE (tipoAula, horaSalida, horas, etc.)
          ════════════════════════════════════════════════════════ */}
      {editClase && (
        <div style={{ position:'fixed', inset:0, background:'rgba(8,80,65,.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}
          onClick={() => setEditClase(null)}>
          <div style={{ background:'#fff', borderRadius:20, padding:24, width:'100%', maxWidth:420, maxHeight:'90vh', overflowY:'auto', boxSizing:'border-box' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:17, fontWeight:700, color:NA.text, margin:'0 0 4px' }}>Editar clase</h2>
            <p style={{ margin:'0 0 18px', fontSize:12, color:NA.text2 }}>{editClase.alumno} · {fmt(editClase.fecha?.toString())}</p>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:NA.text2, display:'block', marginBottom:4, fontWeight:500 }}>Tipo de aula</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {TIPOS_AULA.map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setEditForm(p => ({...p, tipoAula:v}))}
                    style={{ padding:'9px 8px', borderRadius:10, border:`1.5px solid ${editForm.tipoAula===v ? NA.dark : NA.border}`,
                      background: editForm.tipoAula===v ? NA.dark : '#fff', color: editForm.tipoAula===v ? '#fff' : NA.text,
                      fontSize:11, fontWeight:600, cursor:'pointer', textAlign:'center' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Hora entrada" type="time" value={editForm.horaSalida ? (editClase.hora?.substring(0,5)||'') : (editClase.hora?.substring(0,5)||'')}
                style={{ background:'#f9fafb', color:'#9ca3af' }} readOnly/>
              <Input label="Hora salida" type="time" value={editForm.horaSalida}
                onChange={e => setEditForm(p => ({...p, horaSalida: e.target.value}))}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Horas" type="number" step="0.5" value={editForm.horas}
                onChange={e => setEditForm(p => ({...p, horas: e.target.value}))}/>
              <Input label="Tarifa (R$/h)" type="number" value={editForm.tarifa}
                onChange={e => setEditForm(p => ({...p, tarifa: e.target.value}))}/>
            </div>
            <Input label="Lugar" type="text" value={editForm.lugar}
              onChange={e => setEditForm(p => ({...p, lugar: e.target.value}))}/>

            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              <Btn label="Cancelar" bg='#fff' color={NA.text2} onClick={() => setEditClase(null)}/>
              <Btn label={guardandoEdit ? 'Guardando...' : 'Guardar cambios'} disabled={guardandoEdit}
                onClick={guardarEditClase}/>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL: NUEVO INGRESO con selector de clases
          ════════════════════════════════════════════════════════ */}
      {showIngreso && (
        <div style={{ position:'fixed', inset:0, background:'rgba(8,80,65,.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}
          onClick={() => setShowIngreso(false)}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:480, maxHeight:'92vh', overflowY:'auto', boxSizing:'border-box' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding:'18px 22px', borderBottom:`0.5px solid ${NA.border}` }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:NA.text }}>Registrar ingreso</h2>
              <p style={{ margin:'3px 0 0', fontSize:12, color:NA.text2 }}>{fmt(ingresoFecha)}</p>
            </div>

            <div style={{ padding:'18px 22px' }}>

              {/* ── Selector de clases ── */}
              {clasesParaIngreso.length > 0 && (
                <div style={{ marginBottom:18 }}>
                  <p style={{ margin:'0 0 8px', fontSize:11, color:NA.text2, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>
                    Clases de este día — seleccioná las que cubre este pago
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {clasesParaIngreso.map(a => {
                      const sel = clasesSelec.includes(a.id);
                      const cobrado = tieneCobro(a);
                      return (
                        <button key={a.id} type="button"
                          onClick={() => !cobrado && toggleClaseSelec(a.id)}
                          style={{ padding:'10px 14px', borderRadius:12, border:`1.5px solid ${sel ? NA.dark : cobrado ? '#D1FAE5' : NA.border}`,
                            background: sel ? NA.light : cobrado ? '#F0FDF4' : '#fff',
                            cursor: cobrado ? 'default' : 'pointer', textAlign:'left', opacity: cobrado ? 0.6 : 1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div>
                              <span style={{ fontWeight:600, fontSize:13, color:NA.text }}>{a.alumno}</span>
                              <span style={{ fontSize:11, color:NA.text2, marginLeft:8 }}>
                                {a.nombreInstructor} {a.tipoAula && `· ${a.tipoAula}`} {a.horas && `· ${a.horas}h`}
                                {a.hora && ` · ${String(a.hora).substring(0,5)}`}
                              </span>
                            </div>
                            <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${sel ? NA.dark : NA.border}`,
                              background: sel ? NA.dark : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              {sel && <i className="ti ti-check" style={{ fontSize:11, color:'#fff' }}/>}
                              {cobrado && <i className="ti ti-lock" style={{ fontSize:11, color:'#9ca3af' }}/>}
                            </div>
                          </div>
                          {cobrado && <span style={{ fontSize:10, color:'#9ca3af' }}>Ya tiene ingreso registrado</span>}
                        </button>
                      );
                    })}
                  </div>
                  {clasesSelec.length > 0 && (
                    <p style={{ margin:'8px 0 0', fontSize:11, color:NA.dark }}>
                      ✓ {clasesSelec.length} clase{clasesSelec.length>1?'s':''} seleccionada{clasesSelec.length>1?'s':''} — este ingreso las marcará como cobradas
                    </p>
                  )}
                </div>
              )}

              {/* ── Monto ── */}
              <div style={{ background:NA.darker, borderRadius:14, padding:16, marginBottom:16 }}>
                <p style={{ margin:'0 0 12px', fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>Monto</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:4 }}>Total (R$)</label>
                    <input type="number" step="0.01" value={ingresoForm.total}
                      onChange={e => setIngresoForm(p => ({...p, total:e.target.value}))}
                      style={{ width:'100%', padding:'12px 13px', borderRadius:10, border:'0.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:18, fontWeight:700, boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:4 }}>Canal</label>
                    <select value={ingresoForm.moneda} onChange={e => setIngresoForm(p => ({...p, moneda:e.target.value}))}
                      style={{ width:'100%', padding:'12px 10px', borderRadius:10, border:'0.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:13, boxSizing:'border-box' }}>
                      {MONEDAS.map(m => <option key={m.v} value={m.v} style={{ background:'#1a1a1a' }}>{m.l}</option>)}
                    </select>
                  </div>
                </div>
                {ingresoForm.formaPago === 'Tarjeta Crédito' && ingresoForm.total && (
                  <p style={{ margin:'8px 0 0', fontSize:11, color:'#FCA5A5' }}>
                    -5% banco: -{(parseFloat(ingresoForm.total)*0.05).toFixed(2)} → Total final: {(parseFloat(ingresoForm.total)*0.95).toFixed(2)}
                  </p>
                )}
              </div>

              {/* ── Forma de pago ── */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, color:NA.text2, display:'block', marginBottom:6, fontWeight:500 }}>Forma de pago</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
                  {FORMAS_PAGO.map(f => (
                    <button key={f} type="button" onClick={() => setIngresoForm(p => ({...p, formaPago:f}))}
                      style={{ padding:'9px', borderRadius:10, border:`1.5px solid ${ingresoForm.formaPago===f ? NA.dark : NA.border}`,
                        background: ingresoForm.formaPago===f ? NA.dark : '#fff', color: ingresoForm.formaPago===f ? '#fff' : NA.text,
                        fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Instructor + Asignado ── */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:11, color:NA.text2, display:'block', marginBottom:4, fontWeight:500 }}>Instructor</label>
                  <select value={ingresoForm.instructor} onChange={e => setIngresoForm(p => ({...p, instructor:e.target.value}))}
                    style={{ width:'100%', padding:'10px 10px', borderRadius:10, border:`0.5px solid ${NA.border}`, fontSize:13, color:NA.text, background:'#fff', boxSizing:'border-box' }}>
                    <option value="">Sin especificar</option>
                    {instructores.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:NA.text2, display:'block', marginBottom:4, fontWeight:500 }}>Asignado a</label>
                  <select value={ingresoForm.asignadoA} onChange={e => setIngresoForm(p => ({...p, asignadoA:e.target.value}))}
                    style={{ width:'100%', padding:'10px 10px', borderRadius:10, border:`0.5px solid ${NA.border}`, fontSize:13, color:NA.text, background:'#fff', boxSizing:'border-box' }}>
                    <option value="JOSE">JOSE</option>
                    <option value="IGNA">IGNA</option>
                    <option value="AMBOS">AMBOS</option>
                    <option value="ALE">ALE (ausentes)</option>
                    <option value="NINGUNO">Sin asignar</option>
                  </select>
                </div>
              </div>

              {/* ── Actividad + Detalles ── */}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:NA.text2, display:'block', marginBottom:4, fontWeight:500 }}>Actividad</label>
                <input type="text" value={ingresoForm.actividad} onChange={e => setIngresoForm(p => ({...p, actividad:e.target.value}))}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid ${NA.border}`, fontSize:13, color:NA.text, background:'#fff', boxSizing:'border-box' }}/>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11, color:NA.text2, display:'block', marginBottom:4, fontWeight:500 }}>Detalles / Alumnos</label>
                <textarea rows={2} value={ingresoForm.detalles} onChange={e => setIngresoForm(p => ({...p, detalles:e.target.value}))}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid ${NA.border}`, fontSize:13, color:NA.text, background:'#fff', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }}/>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <Btn label="Cancelar" bg='#fff' color={NA.text2} onClick={() => setShowIngreso(false)}/>
                <Btn label={enviando ? 'Guardando...' : `Guardar ingreso${clasesSelec.length>0 ? ` (${clasesSelec.length} clase${clasesSelec.length>1?'s':''})` : ''}`}
                  disabled={enviando || !ingresoForm.total || parseFloat(ingresoForm.total||0)<=0}
                  icon="ti-check" onClick={guardarIngreso}/>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Monitor;