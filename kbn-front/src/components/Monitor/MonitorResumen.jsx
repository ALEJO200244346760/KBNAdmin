import React, { useState } from 'react';
import { NA, MESES_S, labelMon, normName } from './MonitorShared';

const MonitorResumen = ({ mes, resumen }) => {
  const { clasesMes, ingresosMes, egresosMes, alertasMes, balances } = resumen;
  const [modalInst, setModalInst] = useState(null);

  const stats = [
    { l:'Clases',    v: clasesMes.length,   c: NA.dark,   icon:'ti-calendar'      },
    { l:'Ingresos',  v: ingresosMes.length,  c:'#065F46',  icon:'ti-trending-up'   },
    { l:'Egresos',   v: egresosMes.length,   c:'#991B1B',  icon:'ti-trending-down' },
    { l:'Sin cobro', v: alertasMes.length,   c:'#9A3412',  icon:'ti-alert-triangle'},
  ];

  const totIngresos = {};
  ingresosMes.forEach(i => {
    const m = baseMoneda(i.moneda);
    totIngresos[m] = (totIngresos[m] || 0) + (parseFloat(i.total) || 0);
  });

  const totEgresos = {};
  egresosMes.forEach(e => {
    const m = baseMoneda(e.moneda);
    totEgresos[m] = (totEgresos[m] || 0) + (parseFloat(e.total) || 0);
  });

  // ── Lógica Inteligente para contar clases y horas ──
  const esClase = (texto) => {
    if (!texto) return false;
    const t = texto.toLowerCase();
    return ['apk', 'aspk', 'apwf', 'aspwf', 'apws', 'aspws', 'clase', 'curso', 'kite', 'wing', 'windsurf', 'aula'].some(kw => t.includes(kw));
  };

  // Función para calcular horas reales (prioriza entrada/salida)
  const calcularHorasReales = (item) => {
    if (item.salida) {
      const inicio = item.hora || item.horaInicio || item.inicio; 
      if (inicio) {
        const [h1, m1] = inicio.split(':').map(Number);
        const [h2, m2] = item.salida.split(':').map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          let diff = (h2 + (m2 || 0) / 60) - (h1 + (m1 || 0) / 60);
          if (diff > 0) {
            return Math.round(diff * 100) / 100; // Redondea a 2 decimales max (ej 2.75)
          }
        }
      }
    }
    // Si no hay salida o falló el cálculo, lee el campo horas del JSON
    return Number(item.horas) || 0;
  };

  const instCounts = {};

  // 1. Contar desde la Agenda formal
  clasesMes.forEach(c => {
    if (c.tipoAula === 'RENTAL') return; 
    
    const n = c.nombreInstructor?.trim();
    if (!n) return;
    
    const key = normName(n);
    if (!instCounts[key]) instCounts[key] = { nombre: n, clases: 0, horas: 0, registros: [] };
    
    const hrsCalc = calcularHorasReales(c);
    
    instCounts[key].clases += 1;
    instCounts[key].horas  += hrsCalc;
    instCounts[key].registros.push({ ...c, _tipo: 'AGENDA', _horasReales: hrsCalc });
  });

  // 2. Contar desde Ingresos "huérfanos" (registros manuales)
  ingresosMes.forEach(i => {
    const n = i.instructor?.trim();
    if (!n || n.toUpperCase() === 'NINGUNO' || n.toUpperCase() === 'SIN ESPECIFICAR') return;

    const yaVinculado = clasesMes.some(c => 
      String(c.ingresoId) === String(i.id) || 
      (i.agendaIds && i.agendaIds.toString().split(',').map(x=>x.trim()).includes(String(c.id)))
    );

    if (!yaVinculado) {
      const texto = `${i.actividad || ''} ${i.detalles || ''}`;
      if (esClase(texto)) {
        const key = normName(n);
        if (!instCounts[key]) instCounts[key] = { nombre: n, clases: 0, horas: 0, registros: [] };
        
        const hrsCalc = calcularHorasReales(i);

        instCounts[key].clases += 1;
        instCounts[key].horas  += hrsCalc;
        instCounts[key].registros.push({ ...i, _tipo: 'INGRESO_MANUAL', _horasReales: hrsCalc });
      }
    }
  });
  // ──────────────────────────────────────────────────────────

  return (
    <div style={{ background:'#fff', borderRadius:14, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginTop:14 }}>

      <div style={{ padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}`, display:'flex', alignItems:'center', gap:8 }}>
        <i className="ti ti-chart-bar" style={{ fontSize:16, color:NA.dark }}/>
        <p style={{ margin:0, fontWeight:700, fontSize:14, color:NA.text }}>
          Resumen {MESES_S[mes.m]} {mes.y}
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', background:NA.border, gap:'0.5px' }}>
        {stats.map(({ l, v, c, icon }) => (
          <div key={l} style={{ padding:'14px 10px', background:'#fff', textAlign:'center' }}>
            <i className={`ti ${icon}`} style={{ fontSize:18, color:c, display:'block', marginBottom:4 }}/>
            <p style={{ margin:0, fontSize:22, fontWeight:800, color:c, lineHeight:1 }}>{v}</p>
            <p style={{ margin:'4px 0 0', fontSize:10, color:NA.text2, textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
          </div>
        ))}
      </div>

      {Object.keys(totIngresos).length > 0 && (
        <div style={{ padding:'14px 18px', borderTop:`0.5px solid ${NA.border}` }}>
          <p style={{ margin:'0 0 10px', fontSize:10, color:NA.text2, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>
            Movimientos del mes
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[...new Set([...Object.keys(totIngresos), ...Object.keys(totEgresos)])].map(m => {
              const entra  = totIngresos[m] || 0;
              const sale   = totEgresos[m]  || 0;
              const neto   = entra - sale;
              const simbol = simbolo(m);
              return (
                <div key={m} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:NA.bg, borderRadius:10, padding:'10px 14px' }}>
                  <span style={{ fontSize:13, color:NA.text2, fontWeight:500 }}>{m}</span>
                  <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#059669' }}>↑ {simbol}{entra.toFixed(2)}</span>
                    {sale > 0 && <span style={{ fontSize:12, color:'#DC2626' }}>↓ {simbol}{sale.toFixed(2)}</span>}
                    <span style={{ fontSize:14, fontWeight:700, color: neto >= 0 ? '#065F46' : '#DC2626', minWidth:80, textAlign:'right' }}>
                      {neto >= 0 ? '+' : ''}{simbol}{neto.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botones de Instructor */}
      {Object.keys(instCounts).length > 0 && (
        <div style={{ padding:'14px 18px', borderTop:`0.5px solid ${NA.border}` }}>
          <p style={{ margin:'0 0 10px', fontSize:10, color:NA.text2, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>
            Clases por Instructor
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {Object.values(instCounts)
              .sort((a,b) => b.clases - a.clases)
              .map((item, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setModalInst(item)}
                  style={{
                    padding:'6px 14px', borderRadius:99, fontSize:13, fontWeight:700,
                    background: NA.light, color: NA.darker, border:`1px solid ${NA.border}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s'
                  }}>
                  {item.nombre}: {item.clases}c <span style={{ color: NA.dark, fontWeight:500 }}>({item.horas}h)</span>
                  <i className="ti ti-hand-click" style={{ fontSize: 14, opacity: 0.6 }}/>
                </button>
            ))}
          </div>
        </div>
      )}

      {alertasMes.length > 0 && (
        <div style={{ padding:'12px 18px', borderTop:`0.5px solid ${NA.border}`, background:'#FFF7ED', display:'flex', alignItems:'center', gap:8 }}>
          <i className="ti ti-alert-triangle" style={{ color:'#EA580C', fontSize:16 }}/>
          <p style={{ margin:0, fontSize:12, color:'#9A3412' }}>
            <strong>{alertasMes.length}</strong> clase{alertasMes.length>1?'s':''} sin cobro este mes.
          </p>
        </div>
      )}

      {/* MODAL */}
      {modalInst && (
        <ModalDetalleInstructor inst={modalInst} onClose={() => setModalInst(null)} />
      )}
    </div>
  );
};

// ── COMPONENTE MODAL ──
const ModalDetalleInstructor = ({ inst, onClose }) => {
  const registrosOrdenados = inst.registros.sort((a, b) => (a.fecha > b.fecha ? 1 : -1));

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(8,80,65,.45)', backdropFilter:'blur(4px)', 
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:16
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'#fff', borderRadius:20, width:'100%', maxWidth: 440, maxHeight:'85vh', 
        display:'flex', flexDirection:'column', overflow:'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        
        {/* Header del Modal */}
        <div style={{ padding:'18px 20px', borderBottom:`1px solid ${NA.border}`, background:NA.bg, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:NA.darker }}>{inst.nombre}</h2>
            <div style={{ display:'flex', gap: 12, marginTop: 6 }}>
              <span style={{ fontSize:13, fontWeight:600, color: NA.dark }}>
                <i className="ti ti-calendar" style={{ marginRight:4 }}/> {inst.clases} Clases
              </span>
              <span style={{ fontSize:13, fontWeight:600, color: NA.dark }}>
                <i className="ti ti-clock" style={{ marginRight:4 }}/> {inst.horas} Horas Totales
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ 
            width:30, height:30, borderRadius:10, border:'none', background:'#e5e7eb', color:'#4b5563', cursor:'pointer' 
          }}>
            <i className="ti ti-x" style={{ fontSize:16 }}/>
          </button>
        </div>

        {/* Lista */}
        <div style={{ padding:'16px 20px', overflowY:'auto', flex: 1, display:'flex', flexDirection:'column', gap: 10 }}>
          {registrosOrdenados.length === 0 ? (
            <p style={{ color: NA.text2, fontSize: 13, textAlign:'center' }}>No hay registros.</p>
          ) : (
            registrosOrdenados.map((r, i) => {
              const esAgenda = r._tipo === 'AGENDA';
              return (
                <div key={i} style={{
                  padding:'12px', borderRadius: 12, background: esAgenda ? '#fff' : '#FFFBEB',
                  border: `1px solid ${esAgenda ? NA.border : '#FDE68A'}`,
                  borderLeft: `4px solid ${esAgenda ? NA.primary : '#F59E0B'}`
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight:700, color: NA.text2 }}>{r.fecha}</span>
                    <span style={{ fontSize: 11, fontWeight:600, color: esAgenda ? NA.dark : '#D97706', background: esAgenda ? NA.light : '#FEF3C7', padding:'2px 8px', borderRadius:99 }}>
                      {esAgenda ? 'Agenda' : 'Ingreso Manual'}
                    </span>
                  </div>
                  
                  {esAgenda ? (
                    <>
                      <div style={{ fontSize: 14, fontWeight:700, color: NA.darker, marginBottom: 4 }}>
                        {r.alumno} <span style={{ fontWeight:400, color:NA.text2, fontSize:12 }}>({r.tipoAula || 'Sin tipo'})</span>
                      </div>
                      <div style={{ display:'flex', gap: 12, fontSize:12, color: NA.text }}>
                        <span style={{ fontWeight: 600, color: NA.dark }}><i className="ti ti-clock"/> {r._horasReales}h</span>
                        <span><i className="ti ti-map-pin"/> {r.lugar || '-'}</span>
                        <span style={{ color: r.cobrada ? '#059669' : '#DC2626' }}>
                          <i className={`ti ${r.cobrada ? 'ti-check' : 'ti-alert-circle'}`}/> {r.cobrada ? 'Cobrada' : 'Pendiente'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, fontWeight:700, color: NA.darker, marginBottom: 4 }}>
                        {r.actividad || 'Sin actividad'}
                      </div>
                      <p style={{ margin:0, fontSize:12, color: NA.text, marginBottom: 6 }}>
                        {r.detalles || 'Sin detalles'}
                      </p>
                      <div style={{ display:'flex', gap: 12, fontSize:12, color: NA.text }}>
                        <span style={{ fontWeight: 600, color: '#D97706' }}><i className="ti ti-clock"/> {r._horasReales}h</span>
                        <span><i className="ti ti-coin"/> Monto: {r.total}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ── Helpers ──
const baseMoneda = (m) => {
  if (!m || m === 'BRL' || m.startsWith('R$_')) return 'R$';
  if (m.startsWith('USD')) return 'US$';
  if (m.startsWith('EUR')) return '€';
  return m;
};

const simbolo = (base) => {
  if (base === 'R$') return 'R$ ';
  if (base === 'US$') return 'US$ ';
  if (base === '€') return '€ ';
  return base + ' ';
};

export default MonitorResumen;
