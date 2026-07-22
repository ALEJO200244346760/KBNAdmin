import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../axiosConfig';

// ── Paleta NA ────────────────────────────────────────────────────────────────
const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

// ── Colores por tipo de evento ────────────────────────────────────────────────
const COLOR = {
  CONFIRMADA:  { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  PENDIENTE:   { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
  RECHAZADA:   { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  FINALIZADA:  { bg: '#E0E7FF', text: '#3730A3', dot: '#6366F1' },
  INGRESO:     { bg: '#D1FAE5', text: NA.darker, dot: NA.dark   },
  EGRESO:      { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  SIN_INGRESO: { bg: '#FFF7ED', text: '#9A3412', dot: '#EA580C' },
};

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Helpers ──────────────────────────────────────────────────────────────────
const toYMD  = (d)  => d.toISOString().split('T')[0];
const hoy    = ()   => toYMD(new Date());

const formatFecha = (ymd) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
};

const labelMoneda = (m) => {
  const MAP = {
    R$_STONE_JOSE: 'R$ Stone José', R$_STONE_IGNA: 'R$ Stone Igna',
    R$_EFECTIVO: 'R$ Efect.', USD_EFECTIVO: 'USD Efect.',
    USD_MARIANA: 'USD Mariana', EUR_WIZE_IGNA: '€ Wize',
  };
  return MAP[m] || m;
};

// ── Chip pequeño ─────────────────────────────────────────────────────────────
const Tag = ({ label, color, bg }) => (
  <span style={{
    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
    background: bg, color, whiteSpace: 'nowrap',
  }}>{label}</span>
);

// ── Monitor principal ─────────────────────────────────────────────────────────
const Monitor = ({ onNuevoIngreso, onVerDetalle }) => {
  const today = hoy();
  const [mesActual, setMesActual] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [agenda,    setAgenda]    = useState([]);
  const [clases,    setClases]    = useState([]);  // ClaseRegistro (ingresos + egresos)
  const [usuarios,  setUsuarios]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [diaSelec,  setDiaSelec]  = useState(null);
  const [filtroInstructor, setFiltroInstructor] = useState('');
  const [filtroTipo, setFiltroTipo]             = useState('TODO'); // TODO | CLASES | INGRESOS | EGRESOS | ALERTAS
  const [expandAlerta, setExpandAlerta]          = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [rAgenda, rClases, rUsuarios] = await Promise.all([
        api.get('/api/agenda/listar'),
        api.get('/api/clases/listar'),
        api.get('/usuario'),
      ]);
      setAgenda(rAgenda.data);
      setClases(rClases.data);
      setUsuarios(rUsuarios.data);
    } catch (e) {
      console.error('Monitor: error cargando datos', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Instructores únicos (para filtro) ────────────────────────────────────
  const instructores = useMemo(() => {
    const set = new Set(agenda.map(a => a.nombreInstructor).filter(Boolean));
    clases.forEach(c => { if (c.instructor) set.add(c.instructor); });
    return Array.from(set).sort();
  }, [agenda, clases]);

  // ── Ingresos filtrados (solo INGRESO, no egresos) ────────────────────────
  const ingresos = useMemo(() => clases.filter(c => c.tipoTransaccion === 'INGRESO'), [clases]);
  const egresos  = useMemo(() => clases.filter(c => c.tipoTransaccion === 'EGRESO'), [clases]);

  // ── Vincular clase de agenda con ingreso (misma fecha + instructor) ───────
  const claseTieneIngreso = useCallback((clase) => {
    const fechaClase = typeof clase.fecha === 'string'
      ? clase.fecha
      : clase.fecha?.toString();
    return ingresos.some(i => {
      const mismaFecha = i.fecha === fechaClase;
      const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const mismoInstructor = norm(i.instructor) === norm(clase.nombreInstructor);
      return mismaFecha && mismoInstructor;
    });
  }, [ingresos]);

  // ── Alertas: clases pasadas sin ingreso ──────────────────────────────────
  const alertas = useMemo(() => agenda.filter(a => {
    const fecha = typeof a.fecha === 'string' ? a.fecha : a.fecha?.toString();
    if (!fecha) return false;
    const esPasada = fecha < today;
    const estaActiva = a.estado !== 'RECHAZADA';
    return esPasada && estaActiva && !claseTieneIngreso(a);
  }), [agenda, today, claseTieneIngreso]);

  // ── Aplicar filtros globales ─────────────────────────────────────────────
  const agendaFiltrada = useMemo(() => agenda.filter(a => {
    if (filtroInstructor && a.nombreInstructor !== filtroInstructor) return false;
    if (filtroTipo === 'INGRESOS' || filtroTipo === 'EGRESOS') return false;
    if (filtroTipo === 'ALERTAS') {
      const fecha = typeof a.fecha === 'string' ? a.fecha : a.fecha?.toString();
      return fecha < today && a.estado !== 'RECHAZADA' && !claseTieneIngreso(a);
    }
    return true;
  }), [agenda, filtroInstructor, filtroTipo, today, claseTieneIngreso]);

  const ingresosFiltrados = useMemo(() => ingresos.filter(i => {
    if (filtroInstructor && i.instructor !== filtroInstructor) return false;
    if (filtroTipo === 'CLASES' || filtroTipo === 'ALERTAS') return false;
    return true;
  }), [ingresos, filtroInstructor, filtroTipo]);

  const egresosFiltrados = useMemo(() => egresos.filter(e => {
    if (filtroInstructor && e.instructor !== filtroInstructor) return false;
    if (filtroTipo === 'CLASES' || filtroTipo === 'ALERTAS') return false;
    return true;
  }), [egresos, filtroInstructor, filtroTipo]);

  // ── Construir grilla del mes ─────────────────────────────────────────────
  const grilla = useMemo(() => {
    const { year, month } = mesActual;
    const primerDia  = new Date(year, month, 1);
    const ultimoDia  = new Date(year, month + 1, 0);
    const celdas     = [];

    // Relleno inicial
    for (let i = 0; i < primerDia.getDay(); i++) celdas.push(null);
    // Días del mes
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      celdas.push(toYMD(new Date(year, month, d)));
    }
    // Relleno final para completar semanas
    while (celdas.length % 7 !== 0) celdas.push(null);
    return celdas;
  }, [mesActual]);

  // ── Eventos por día (para dots en el calendario) ─────────────────────────
  const eventosPorDia = useMemo(() => {
    const map = {};
    const add = (fecha, tipo) => {
      if (!fecha) return;
      if (!map[fecha]) map[fecha] = { clases: 0, ingresos: 0, egresos: 0, alertas: 0 };
      map[fecha][tipo]++;
    };
    agendaFiltrada.forEach(a => {
      const f = typeof a.fecha === 'string' ? a.fecha : a.fecha?.toString();
      const esAlerta = f < today && a.estado !== 'RECHAZADA' && !claseTieneIngreso(a);
      add(f, esAlerta ? 'alertas' : 'clases');
    });
    ingresosFiltrados.forEach(i => add(i.fecha, 'ingresos'));
    egresosFiltrados.forEach(e => add(e.fecha, 'egresos'));
    return map;
  }, [agendaFiltrada, ingresosFiltrados, egresosFiltrados, today, claseTieneIngreso]);

  // ── Eventos del día seleccionado ─────────────────────────────────────────
  const eventosDelDia = useMemo(() => {
    if (!diaSelec) return { clases: [], ingresos: [], egresos: [] };
    const clasesDia = agendaFiltrada.filter(a => {
      const f = typeof a.fecha === 'string' ? a.fecha : a.fecha?.toString();
      return f === diaSelec;
    });
    const ingresosDia = ingresosFiltrados.filter(i => i.fecha === diaSelec);
    const egresosDia  = egresosFiltrados.filter(e  => e.fecha  === diaSelec);
    return { clases: clasesDia, ingresos: ingresosDia, egresos: egresosDia };
  }, [diaSelec, agendaFiltrada, ingresosFiltrados, egresosFiltrados]);

  // ── Navegar mes ──────────────────────────────────────────────────────────
  const navMes = (dir) => {
    setMesActual(prev => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m < 0)  { m = 11; y--; }
      if (m > 11) { m = 0;  y++; }
      return { year: y, month: m };
    });
    setDiaSelec(null);
  };

  // ── Cambiar estado de agenda ─────────────────────────────────────────────
  const cambiarEstado = async (id, estado) => {
    try {
      await api.put(`/api/agenda/${id}/estado`, estado, {
        headers: { 'Content-Type': 'text/plain' }
      });
      setAgenda(prev => prev.map(a => a.id === id ? { ...a, estado } : a));
    } catch (e) {
      alert('No se pudo actualizar el estado.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${NA.mid}`, borderTopColor: NA.dark, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: NA.text2, fontSize: 13 }}>Cargando monitor...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  const { year, month } = mesActual;
  const esHoy = (ymd) => ymd === today;
  const esFuturo = (ymd) => ymd > today;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 4px 80px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>

      {/* ── ALERTAS BANNER ── */}
      {alertas.length > 0 && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setExpandAlerta(e => !e)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-alert-triangle" style={{ color: '#EA580C', fontSize: 18 }} />
              <span style={{ fontWeight: 600, color: '#9A3412', fontSize: 14 }}>
                {alertas.length} clase{alertas.length > 1 ? 's' : ''} sin ingreso registrado
              </span>
            </div>
            <i className={`ti ti-chevron-${expandAlerta ? 'up' : 'down'}`} style={{ color: '#EA580C' }} />
          </div>
          {expandAlerta && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alertas.map(a => {
                const f = typeof a.fecha === 'string' ? a.fecha : a.fecha?.toString();
                return (
                  <div key={a.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: NA.text, fontSize: 13 }}>{a.alumno}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: NA.text2 }}>
                        {formatFecha(f)} · {a.nombreInstructor} · {a.horas}h
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => { setDiaSelec(f); setExpandAlerta(false); }}
                        style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${NA.border}`, background: '#fff', color: NA.dark, fontSize: 12, cursor: 'pointer' }}>
                        Ver día
                      </button>
                      {onNuevoIngreso && (
                        <button
                          onClick={() => onNuevoIngreso({ instructor: a.nombreInstructor, fecha: f, horas: a.horas })}
                          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: NA.dark, color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                          + Ingreso
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FILTROS ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: `0.5px solid ${NA.border}`, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Tipo */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { v: 'TODO',     l: 'Todo'    },
            { v: 'CLASES',   l: '📅 Clases'  },
            { v: 'INGRESOS', l: '💰 Ingresos'},
            { v: 'EGRESOS',  l: '💸 Egresos' },
            { v: 'ALERTAS',  l: `⚠️ Alertas${alertas.length > 0 ? ` (${alertas.length})` : ''}` },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setFiltroTipo(v)}
              style={{ padding: '5px 12px', borderRadius: 99, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: filtroTipo === v ? NA.dark : NA.light,
                color: filtroTipo === v ? '#fff' : NA.text2 }}>
              {l}
            </button>
          ))}
        </div>
        {/* Instructor */}
        <select value={filtroInstructor} onChange={e => setFiltroInstructor(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: `0.5px solid ${NA.border}`, fontSize: 12, color: NA.text, background: NA.bg, marginLeft: 'auto' }}>
          <option value="">Todos los instructores</option>
          {instructores.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <button onClick={cargarDatos}
          style={{ padding: '6px 12px', borderRadius: 8, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-refresh" style={{ fontSize: 14 }} /> Actualizar
        </button>
      </div>

      {/* ── CALENDARIO ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}`, overflow: 'hidden', marginBottom: 16 }}>

        {/* Header del mes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `0.5px solid ${NA.border}` }}>
          <button onClick={() => navMes(-1)}
            style={{ width: 34, height: 34, borderRadius: 9, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-chevron-left" style={{ fontSize: 16 }} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, color: NA.text }}>
            {MESES[month]} {year}
          </span>
          <button onClick={() => navMes(1)}
            style={{ width: 34, height: 34, borderRadius: 9, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-chevron-right" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Días de la semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: `0.5px solid ${NA.border}` }}>
          {DIAS.map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontWeight: 600, color: NA.text2 }}>{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {grilla.map((dia, idx) => {
            if (!dia) return <div key={`empty-${idx}`} style={{ minHeight: 64, borderRight: `0.5px solid ${NA.border}`, borderBottom: `0.5px solid ${NA.border}`, background: '#fafafa' }} />;

            const ev     = eventosPorDia[dia] || {};
            const selec  = diaSelec === dia;
            const hoyDia = esHoy(dia);
            const futuro = esFuturo(dia);

            return (
              <div key={dia} onClick={() => setDiaSelec(selec ? null : dia)}
                style={{
                  minHeight: 64, padding: '6px 5px', cursor: 'pointer',
                  borderRight: `0.5px solid ${NA.border}`, borderBottom: `0.5px solid ${NA.border}`,
                  background: selec ? NA.light : hoyDia ? '#F0FDF4' : '#fff',
                  position: 'relative', transition: 'background .1s',
                }}>
                {/* Número del día */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: hoyDia ? NA.dark : 'transparent',
                  color: hoyDia ? '#fff' : futuro ? NA.text2 : NA.text,
                  fontSize: 13, fontWeight: hoyDia ? 700 : 400, marginBottom: 4,
                }}>
                  {parseInt(dia.split('-')[2])}
                </div>

                {/* Dots de eventos */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {ev.alertas  > 0 && <Dot color="#EA580C" count={ev.alertas} />}
                  {ev.clases   > 0 && <Dot color={NA.dark}   count={ev.clases}  />}
                  {ev.ingresos > 0 && <Dot color="#059669"   count={ev.ingresos}/>}
                  {ev.egresos  > 0 && <Dot color="#DC2626"   count={ev.egresos} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LEYENDA ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { color: '#EA580C', label: 'Sin ingreso' },
          { color: NA.dark,   label: 'Clase'       },
          { color: '#059669', label: 'Ingreso'      },
          { color: '#DC2626', label: 'Egreso'       },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: NA.text2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* ── PANEL DEL DÍA SELECCIONADO ── */}
      {diaSelec && (
        <div style={{ background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}`, overflow: 'hidden' }}>

          {/* Header del día */}
          <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${NA.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: NA.text }}>{formatFecha(diaSelec)}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: NA.text2 }}>
                {eventosDelDia.clases.length} clase{eventosDelDia.clases.length !== 1 ? 's' : ''} ·{' '}
                {eventosDelDia.ingresos.length} ingreso{eventosDelDia.ingresos.length !== 1 ? 's' : ''} ·{' '}
                {eventosDelDia.egresos.length} egreso{eventosDelDia.egresos.length !== 1 ? 's' : ''}
              </p>
            </div>
            {onNuevoIngreso && !esFuturo(diaSelec) && (
              <button
                onClick={() => onNuevoIngreso({ fecha: diaSelec })}
                style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: NA.dark, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-plus" style={{ fontSize: 15 }} /> Ingreso
              </button>
            )}
          </div>

          {/* Clases del día */}
          {eventosDelDia.clases.length > 0 && (
            <Section title="Clases">
              {eventosDelDia.clases.map(a => {
                const tieneIngreso = claseTieneIngreso(a);
                const esPasada     = (typeof a.fecha === 'string' ? a.fecha : a.fecha?.toString()) < today;
                const col          = COLOR[a.estado] || COLOR.PENDIENTE;
                return (
                  <div key={a.id} style={{ padding: '12px 18px', borderBottom: `0.5px solid ${NA.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: NA.text }}>{a.alumno}</span>
                          <Tag label={a.estado} color={col.text} bg={col.bg} />
                          {esPasada && !tieneIngreso && (
                            <Tag label="⚠ Sin ingreso" color="#9A3412" bg="#FFF7ED" />
                          )}
                          {esPasada && tieneIngreso && (
                            <Tag label="✓ Con ingreso" color="#065F46" bg="#D1FAE5" />
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: NA.text2 }}>
                          {a.nombreInstructor}
                          {a.hora && ` · ${String(a.hora).substring(0,5)} hs`}
                          {a.horas && ` · ${a.horas}h`}
                          {a.lugar && ` · ${a.lugar}`}
                        </p>
                        {a.hotelDerivacion && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: NA.text2 }}>🏨 {a.hotelDerivacion}</p>
                        )}
                        {a.tarifa && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: NA.dark }}>
                            Tarifa: R$ {a.tarifa} · Pagado: R$ {a.horasPagadas || 0}
                          </p>
                        )}
                      </div>
                      {/* Acciones */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        {/* Cambiar estado si está pendiente o confirmada */}
                        {a.estado === 'PENDIENTE' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <EstadoBtn label="✓ Confirmar" color="#059669" bg="#D1FAE5" onClick={() => cambiarEstado(a.id, 'CONFIRMADA')} />
                            <EstadoBtn label="✗ Rechazar"  color="#DC2626" bg="#FEE2E2" onClick={() => cambiarEstado(a.id, 'RECHAZADA')} />
                          </div>
                        )}
                        {a.estado === 'CONFIRMADA' && !esPasada && (
                          <EstadoBtn label="✗ Rechazar" color="#DC2626" bg="#FEE2E2" onClick={() => cambiarEstado(a.id, 'RECHAZADA')} />
                        )}
                        {/* Si es pasada y sin ingreso, botón rápido */}
                        {esPasada && !tieneIngreso && onNuevoIngreso && (
                          <button
                            onClick={() => onNuevoIngreso({ instructor: a.nombreInstructor, fecha: typeof a.fecha === 'string' ? a.fecha : a.fecha?.toString(), horas: a.horas })}
                            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: NA.dark, color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                            + Registrar ingreso
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          {/* Ingresos del día */}
          {eventosDelDia.ingresos.length > 0 && (
            <Section title="Ingresos">
              {eventosDelDia.ingresos.map(i => (
                <div key={i.id} style={{ padding: '12px 18px', borderBottom: `0.5px solid ${NA.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: NA.dark }}>
                        + {parseFloat(i.total || 0).toFixed(2)} {labelMoneda(i.moneda)}
                      </span>
                      {i.asignadoA && i.asignadoA !== 'NINGUNO' && (
                        <Tag label={i.asignadoA} color={NA.darker} bg={NA.light} />
                      )}
                      {(!i.asignadoA || i.asignadoA === 'NINGUNO') && (
                        <Tag label="Sin asignar" color="#92400E" bg="#FEF3C7" />
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: NA.text2 }}>
                      {i.actividad}
                      {i.instructor && ` · ${i.instructor}`}
                      {i.formaPago && ` · ${i.formaPago}`}
                    </p>
                    {i.detalles && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: NA.text2, fontStyle: 'italic' }}>
                        {i.detalles.split('|')[0].trim()}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>#{i.id}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Egresos del día */}
          {eventosDelDia.egresos.length > 0 && (
            <Section title="Egresos">
              {eventosDelDia.egresos.map(e => (
                <div key={e.id} style={{ padding: '12px 18px', borderBottom: `0.5px solid ${NA.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#DC2626' }}>
                        - {parseFloat(e.total || 0).toFixed(2)} {labelMoneda(e.moneda)}
                      </span>
                      {e.tipoMovimientoPasivo && (
                        <Tag label={e.tipoMovimientoPasivo} color="#991B1B" bg="#FEE2E2" />
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: NA.text2 }}>
                      {e.detalles || e.actividad || 'Egreso'}
                      {e.formaPago && ` · ${e.formaPago}`}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>#{e.id}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Sin eventos */}
          {eventosDelDia.clases.length === 0 && eventosDelDia.ingresos.length === 0 && eventosDelDia.egresos.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: NA.text2, fontSize: 14 }}>
              No hay eventos para este día.
            </div>
          )}
        </div>
      )}

      {/* ── RESUMEN DEL MES ── */}
      <ResumenMes
        year={year} month={month}
        ingresos={ingresosFiltrados} egresos={egresosFiltrados}
        agenda={agendaFiltrada} alertas={alertas}
      />
    </div>
  );
};

// ── Sub-componentes ──────────────────────────────────────────────────────────

const Dot = ({ color, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
    {count > 1 && <span style={{ fontSize: 9, color, fontWeight: 700 }}>{count}</span>}
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <p style={{ margin: 0, padding: '8px 18px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: NA.text2, background: NA.bg, borderBottom: `0.5px solid ${NA.border}` }}>
      {title}
    </p>
    {children}
  </div>
);

const EstadoBtn = ({ label, color, bg, onClick }) => (
  <button onClick={onClick}
    style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${color}20`, background: bg, color, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
    {label}
  </button>
);

const ResumenMes = ({ year, month, ingresos, egresos, agenda, alertas }) => {
  const ingresosDelMes = ingresos.filter(i => {
    const [y, m] = (i.fecha || '').split('-');
    return parseInt(y) === year && parseInt(m) - 1 === month;
  });
  const egresosDelMes = egresos.filter(e => {
    const [y, m] = (e.fecha || '').split('-');
    return parseInt(y) === year && parseInt(m) - 1 === month;
  });
  const clasesDelMes = agenda.filter(a => {
    const f = typeof a.fecha === 'string' ? a.fecha : a.fecha?.toString() || '';
    const [y, m] = f.split('-');
    return parseInt(y) === year && parseInt(m) - 1 === month;
  });

  // Totales por moneda
  const totalPorMoneda = {};
  ingresosDelMes.forEach(i => {
    const m = i.moneda || 'BRL';
    totalPorMoneda[m] = (totalPorMoneda[m] || 0) + (parseFloat(i.total) || 0);
  });
  egresosDelMes.forEach(e => {
    const m = e.moneda || 'BRL';
    totalPorMoneda[m] = (totalPorMoneda[m] || 0) - (parseFloat(e.total) || 0);
  });

  const MESES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  return (
    <div style={{ marginTop: 16, background: '#fff', borderRadius: 14, border: `0.5px solid ${NA.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: `0.5px solid ${NA.border}` }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: NA.text }}>Resumen {MESES_SHORT[month]}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 1, background: NA.border }}>
        {[
          { label: 'Clases', value: clasesDelMes.length, color: NA.dark, bg: NA.light, icon: 'ti-calendar' },
          { label: 'Ingresos', value: ingresosDelMes.length, color: '#065F46', bg: '#D1FAE5', icon: 'ti-trending-up' },
          { label: 'Egresos', value: egresosDelMes.length, color: '#991B1B', bg: '#FEE2E2', icon: 'ti-trending-down' },
          { label: 'Sin ingreso', value: alertas.filter(a => { const f = typeof a.fecha === 'string' ? a.fecha : a.fecha?.toString() || ''; const [y,m] = f.split('-'); return parseInt(y) === year && parseInt(m)-1 === month; }).length, color: '#9A3412', bg: '#FFF7ED', icon: 'ti-alert-triangle' },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ padding: '14px 16px', background: '#fff', textAlign: 'center' }}>
            <i className={`ti ${icon}`} style={{ fontSize: 20, color, marginBottom: 4, display: 'block' }} />
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color }}>{value}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: NA.text2 }}>{label}</p>
          </div>
        ))}
      </div>
      {Object.keys(totalPorMoneda).length > 0 && (
        <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${NA.border}` }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: NA.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Balance neto del mes</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(totalPorMoneda).map(([moneda, val]) => (
              <div key={moneda} style={{ padding: '6px 14px', borderRadius: 99, background: val >= 0 ? '#D1FAE5' : '#FEE2E2', color: val >= 0 ? '#065F46' : '#991B1B', fontSize: 13, fontWeight: 600 }}>
                {labelMoneda(moneda)}: {val >= 0 ? '+' : ''}{val.toFixed(2)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Monitor;