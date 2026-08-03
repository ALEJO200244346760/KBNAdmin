import React from 'react';
import { NA, MESES_S, labelMon, normName } from './MonitorShared';

const MonitorResumen = ({ mes, resumen }) => {
  const { clasesMes, ingresosMes, egresosMes, alertasMes, balances } = resumen;

  const stats = [
    { l:'Clases',    v: clasesMes.length,   c: NA.dark,   icon:'ti-calendar'      },
    { l:'Ingresos',  v: ingresosMes.length,  c:'#065F46',  icon:'ti-trending-up'   },
    { l:'Egresos',   v: egresosMes.length,   c:'#991B1B',  icon:'ti-trending-down' },
    { l:'Sin cobro', v: alertasMes.length,   c:'#9A3412',  icon:'ti-alert-triangle'},
  ];

  // Suma de ingresos por moneda base
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

  // ── Lógica Inteligente para contar clases por Instructor ──
  const esClase = (texto) => {
    if (!texto) return false;
    const t = texto.toLowerCase();
    // Palabras clave que indican que el registro manual fue una clase
    return ['apk', 'aspk', 'apwf', 'aspwf', 'apws', 'aspws', 'clase', 'curso', 'kite', 'wing', 'windsurf', 'aula'].some(kw => t.includes(kw));
  };

  const instCounts = {};

  // 1. Contar desde la Agenda formal
  clasesMes.forEach(c => {
    if (c.tipoAula === 'RENTAL') return; // Ignoramos si es puramente rental
    
    const n = c.nombreInstructor?.trim();
    if (!n) return;
    
    const key = normName(n);
    if (!instCounts[key]) instCounts[key] = { nombre: n, clases: 0 };
    instCounts[key].clases += 1;
  });

  // 2. Contar desde Ingresos "huérfanos" (registros viejos o sin agenda)
  ingresosMes.forEach(i => {
    const n = i.instructor?.trim();
    if (!n || n.toUpperCase() === 'NINGUNO' || n.toUpperCase() === 'SIN ESPECIFICAR') return;

    // Verificamos que este ingreso NO esté vinculado a ninguna clase de este mes (para no contar doble)
    const yaVinculado = clasesMes.some(c => 
      String(c.ingresoId) === String(i.id) || 
      (i.agendaIds && i.agendaIds.toString().split(',').map(x=>x.trim()).includes(String(c.id)))
    );

    if (!yaVinculado) {
      // Acá "sabemos leerlas": escaneamos la actividad y los detalles
      const texto = `${i.actividad || ''} ${i.detalles || ''}`;
      if (esClase(texto)) {
        const key = normName(n);
        if (!instCounts[key]) instCounts[key] = { nombre: n, clases: 0 };
        instCounts[key].clases += 1;
      }
    }
  });
  // ──────────────────────────────────────────────────────────

  return (
    <div style={{ background:'#fff', borderRadius:14, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginTop:14 }}>

      {/* Título */}
      <div style={{ padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}`, display:'flex', alignItems:'center', gap:8 }}>
        <i className="ti ti-chart-bar" style={{ fontSize:16, color:NA.dark }}/>
        <p style={{ margin:0, fontWeight:700, fontSize:14, color:NA.text }}>
          Resumen {MESES_S[mes.m]} {mes.y}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', background:NA.border, gap:'0.5px' }}>
        {stats.map(({ l, v, c, icon }) => (
          <div key={l} style={{ padding:'14px 10px', background:'#fff', textAlign:'center' }}>
            <i className={`ti ${icon}`} style={{ fontSize:18, color:c, display:'block', marginBottom:4 }}/>
            <p style={{ margin:0, fontSize:22, fontWeight:800, color:c, lineHeight:1 }}>{v}</p>
            <p style={{ margin:'4px 0 0', fontSize:10, color:NA.text2, textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Totales por moneda */}
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

      {/* Balance neto (de saldosPorMoneda del backend si existe) */}
      {Object.keys(balances).length > 0 && (
        <div style={{ padding:'14px 18px', borderTop:`0.5px solid ${NA.border}` }}>
          <p style={{ margin:'0 0 8px', fontSize:10, color:NA.text2, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>
            Balance neto del mes
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {Object.entries(balances).map(([mo, val]) => (
              <div key={mo} style={{
                padding:'6px 14px', borderRadius:99, fontSize:13, fontWeight:700,
                background: val >= 0 ? '#D1FAE5' : '#FEE2E2',
                color:      val >= 0 ? '#065F46' : '#991B1B',
              }}>
                {labelMon(mo)}: {val >= 0 ? '+' : ''}{val.toFixed(2)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NUEVO: Resumen de Clases por Instructor ── */}
      {Object.keys(instCounts).length > 0 && (
        <div style={{ padding:'14px 18px', borderTop:`0.5px solid ${NA.border}` }}>
          <p style={{ margin:'0 0 10px', fontSize:10, color:NA.text2, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>
            Clases por Instructor
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {Object.values(instCounts)
              .sort((a,b) => b.clases - a.clases)
              .map((item, idx) => (
                <div key={idx} style={{
                  padding:'6px 14px', borderRadius:99, fontSize:13, fontWeight:700,
                  background: NA.light, color: NA.darker, border:`1px solid ${NA.border}`
                }}>
                  {item.nombre}: {item.clases}
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta si hay clases sin cobro */}
      {alertasMes.length > 0 && (
        <div style={{ padding:'12px 18px', borderTop:`0.5px solid ${NA.border}`, background:'#FFF7ED', display:'flex', alignItems:'center', gap:8 }}>
          <i className="ti ti-alert-triangle" style={{ color:'#EA580C', fontSize:16 }}/>
          <p style={{ margin:0, fontSize:12, color:'#9A3412' }}>
            <strong>{alertasMes.length}</strong> clase{alertasMes.length>1?'s':''} sin cobro este mes.
            Revisalas en el calendario o en la sección ⚠️ Sin cobro.
          </p>
        </div>
      )}
    </div>
  );
};

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
