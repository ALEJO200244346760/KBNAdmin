import React from 'react';
import { NA, DIAS_S, MESES, HOY, esHoy, esPasado, fmt, Dot, Btn } from './MonitorShared';

const D = {
  card:   'rgba(255,255,255,.06)',
  border: 'rgba(255,255,255,.1)',
  text:   'rgba(255,255,255,.9)',
  text2:  'rgba(255,255,255,.45)',
  empty:  'rgba(0,0,0,.15)',
};

const MonitorCalendario = ({
  mes, navMes, grilla, dotsD, diaSelec, setDiaSelec,
  filtroTipo, setFiltroTipo, filtroInst, setFiltroInst,
  instructores, alertas, cargar, abrirIngreso,
}) => (
  <div>
    {/* ── BANNER ALERTAS ── */}
    {alertas.length > 0 && (
      <details style={{ background:'rgba(234,88,12,.15)', border:'1px solid rgba(234,88,12,.3)', borderRadius:14, padding:'12px 16px', marginBottom:14 }}>
        <summary style={{ fontWeight:700, color:'#FDBA74', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:8, listStyle:'none' }}>
          <i className="ti ti-alert-triangle" style={{ color:'#FB923C', fontSize:17 }}/>
          {alertas.length} clase{alertas.length>1?'s':''} sin cobro registrado
        </summary>
        <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
          {alertas.map(a => {
            const f = a.fecha?.toString();
            return (
              <div key={a.id} style={{ background:'rgba(255,255,255,.08)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                <div>
                  <p style={{ margin:0, fontWeight:600, color:'rgba(255,255,255,.9)', fontSize:13 }}>{a.alumno}</p>
                  <p style={{ margin:'2px 0 0', fontSize:11, color:D.text2 }}>
                    {fmt(f)} · {a.nombreInstructor} · {a.horas}h {a.tipoAula && `· ${a.tipoAula}`}
                  </p>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <Btn label="Ver día" bg='rgba(255,255,255,.1)' color='rgba(255,255,255,.9)' small onClick={() => setDiaSelec(f)}/>
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
    <div style={{ background:D.card, borderRadius:14, border:`0.5px solid ${D.border}`, padding:'10px 14px', marginBottom:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
      {[
        { v:'TODO',     l:'Todo'       },
        { v:'CLASES',   l:'📅 Clases'  },
        { v:'INGRESOS', l:'💰 Ingresos' },
        { v:'EGRESOS',  l:'💸 Egresos'  },
        { v:'ALERTAS',  l:`⚠️ Sin cobro${alertas.length>0?` (${alertas.length})`:''}`},
      ].map(({ v, l }) => (
        <button key={v} onClick={() => setFiltroTipo(v)}
          style={{ padding:'5px 12px', borderRadius:99, border:'none', fontSize:12, fontWeight:500, cursor:'pointer',
            background: filtroTipo===v ? NA.dark : 'rgba(255,255,255,.1)',
            color:      filtroTipo===v ? '#fff'  : D.text2 }}>
          {l}
        </button>
      ))}
      <select value={filtroInst} onChange={e => setFiltroInst(e.target.value)}
        style={{ padding:'6px 10px', borderRadius:8, border:`0.5px solid ${D.border}`, fontSize:12, color:D.text, background:'rgba(255,255,255,.08)', marginLeft:'auto' }}>
        <option value="">Todos los instructores</option>
        {instructores.map(i => <option key={i} value={i}>{i}</option>)}
      </select>
      <button onClick={cargar}
        style={{ padding:'6px 12px', borderRadius:8, border:`0.5px solid ${D.border}`, background:D.card, color:D.text2, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
        <i className="ti ti-refresh" style={{ fontSize:14 }}/> Actualizar
      </button>
    </div>

    {/* ── CALENDARIO ── */}
    <div style={{ background:D.card, borderRadius:16, border:`0.5px solid ${D.border}`, overflow:'hidden', marginBottom:14 }}>
      {/* Header mes */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderBottom:`0.5px solid ${D.border}` }}>
        <button onClick={() => navMes(-1)} style={{ width:32, height:32, borderRadius:8, border:`0.5px solid ${D.border}`, background:D.card, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-chevron-left" style={{ fontSize:15, color:D.text2 }}/>
        </button>
        <span style={{ fontWeight:700, fontSize:16, color:D.text }}>{MESES[mes.m]} {mes.y}</span>
        <button onClick={() => navMes(1)} style={{ width:32, height:32, borderRadius:8, border:`0.5px solid ${D.border}`, background:D.card, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-chevron-right" style={{ fontSize:15, color:D.text2 }}/>
        </button>
      </div>

      {/* Días semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:`0.5px solid ${D.border}`, background:'rgba(255,255,255,.04)' }}>
        {DIAS_S.map(d => (
          <div key={d} style={{ textAlign:'center', padding:'7px 0', fontSize:11, fontWeight:600, color:D.text2 }}>{d}</div>
        ))}
      </div>

      {/* Celdas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {grilla.map((dia, idx) => {
          if (!dia) return (
            <div key={`e${idx}`} style={{ minHeight:56, borderRight:`0.5px solid ${D.border}`, borderBottom:`0.5px solid ${D.border}`, background:D.empty }}/>
          );
          const ev    = dotsD[dia] || {};
          const selec = diaSelec === dia;
          const hoy   = esHoy(dia);
          return (
            <div key={dia} onClick={() => setDiaSelec(selec ? null : dia)}
              style={{ minHeight:56, padding:'5px', cursor:'pointer', boxSizing:'border-box',
                borderRight:`0.5px solid ${D.border}`, borderBottom:`0.5px solid ${D.border}`,
                background: selec ? 'rgba(46,207,196,.25)' : hoy ? 'rgba(46,207,196,.1)' : 'transparent',
                transition:'background .1s' }}>
              <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:3,
                background: hoy ? '#2ECFC4' : 'transparent',
                color:      hoy ? '#0a0e0d' : D.text,
                fontSize:12, fontWeight: hoy ? 700 : 400 }}>
                {parseInt(dia.split('-')[2])}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                {ev.alerta  > 0 && <Dot color="#FB923C" n={ev.alerta}  />}
                {ev.clase   > 0 && <Dot color="#2ECFC4" n={ev.clase}   />}
                {ev.ingreso > 0 && <Dot color="#34D399" n={ev.ingreso} />}
                {ev.egreso  > 0 && <Dot color="#F87171" n={ev.egreso}  />}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* ── LEYENDA ── */}
    <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:14 }}>
      {[['#FB923C','Sin cobro'],['#2ECFC4','Clase'],['#34D399','Ingreso'],['#F87171','Egreso']].map(([c,l]) => (
        <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:D.text2 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>{l}
        </span>
      ))}
    </div>
  </div>
);

export default MonitorCalendario;