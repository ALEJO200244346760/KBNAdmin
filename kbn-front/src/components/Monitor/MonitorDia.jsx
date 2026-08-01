import React from 'react';
import { NA, fmt, esPasado, labelMon, Tag, Btn } from './MonitorShared';

const MonitorDia = ({ diaSelec, evD, agenda, ingresos, tieneCobro, ingresoDeClase, cambiarEstado, abrirEditClase, abrirIngreso }) => {
  if (!diaSelec) return null;

  const pasado = esPasado(diaSelec);
  
  // 1. Filtramos las clases rechazadas para que no invadan la visual
  const clasesActivas = evD.clases.filter(a => a.estado !== 'RECHAZADA');
  
  const totalClases   = clasesActivas.length;
  const totalIngresos = evD.ingresos.length;
  const totalEgresos  = evD.egresos.length;

  // Suma rápida de ingresos del día por moneda base
  const sumaIngresos = {};
  evD.ingresos.forEach(i => {
    const m = i.moneda?.startsWith('R$') || i.moneda === 'BRL' ? 'R$'
            : i.moneda?.startsWith('EUR') ? '€'
            : i.moneda?.startsWith('USD') ? 'US$' : (i.moneda || 'R$');
    sumaIngresos[m] = (sumaIngresos[m] || 0) + (parseFloat(i.total) || 0);
  });

  return (
    <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginBottom:14 }}>

      {/* ── Header del día ── */}
      <div style={{ padding:'14px 18px', borderBottom:`0.5px solid ${NA.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div>
          <p style={{ margin:0, fontWeight:700, fontSize:17, color:NA.text }}>{fmt(diaSelec)}</p>
          <p style={{ margin:'3px 0 0', fontSize:11, color:NA.text2 }}>
            {totalClases} clase{totalClases!==1?'s':''} ·{' '}
            {totalIngresos} ingreso{totalIngresos!==1?'s':''} ·{' '}
            {totalEgresos} egreso{totalEgresos!==1?'s':''}
            {Object.entries(sumaIngresos).map(([m,v]) => (
              <span key={m} style={{ marginLeft:6, color:'#059669', fontWeight:600 }}>+{v.toFixed(2)} {m}</span>
            ))}
          </p>
        </div>
        {pasado && (
          <Btn label="+ Ingreso del día" icon="ti-cash"
            onClick={() => abrirIngreso(diaSelec)}/>
        )}
      </div>

      {/* ── CLASES ── */}
      {totalClases > 0 && (
        <Section color="#0F6E56" bg={NA.bg} label="Clases agendadas">
          {clasesActivas.map(a => { // Iteramos sobre clasesActivas en lugar de evD.clases
            const cobrado = tieneCobro(a);
            const ingVinc = ingresoDeClase(a);
            const f       = a.fecha?.toString();
            // Ya no calculamos RECHAZADA en los colores porque no aparecerán
            const colorEst = a.estado==='CONFIRMADA' ? {c:'#065F46',bg:'#D1FAE5'} : {c:'#92400E',bg:'#FEF3C7'};
            
            return (
              <div key={a.id} style={{ padding:'13px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Nombre + badges */}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:4, alignItems:'center' }}>
                      <span style={{ fontWeight:700, fontSize:15, color:NA.text }}>{a.alumno}</span>
                      <Tag label={a.estado} color={colorEst.c} bg={colorEst.bg} small/>
                      {a.tipoAula && <Tag label={a.tipoAula} color={NA.darker} bg={NA.light} small/>}
                      {esPasado(f) && !cobrado && <Tag label="⚠ Sin cobro" color="#9A3412" bg="#FFF7ED" small/>}
                      {cobrado     &&              <Tag label="✓ Cobrado"   color="#065F46" bg="#D1FAE5" small/>}
                    </div>

                    {/* Detalles */}
                    <p style={{ margin:0, fontSize:12, color:NA.text2 }}>
                      {a.nombreInstructor}
                      {a.hora       && ` · ${String(a.hora).substring(0,5)}`}
                      {a.horaSalida && ` → ${String(a.horaSalida).substring(0,5)}`}
                      {a.horas      && ` · ${a.horas}h`}
                      {a.lugar      && ` · ${a.lugar}`}
                    </p>
                    {a.tarifa && (
                      <p style={{ margin:'2px 0 0', fontSize:11, color:NA.dark }}>
                        Tarifa: R$ {a.tarifa}
                        {a.horasPagadas ? ` · Pagado: R$ ${a.horasPagadas}` : ''}
                      </p>
                    )}

                    {/* Ingreso vinculado */}
                    {ingVinc && (
                      <p style={{ margin:'5px 0 0', fontSize:11, color:'#059669', display:'flex', alignItems:'center', gap:4 }}>
                        <i className="ti ti-cash" style={{ fontSize:13 }}/>
                        Ingreso #{ingVinc.id} · {parseFloat(ingVinc.total).toFixed(2)} {labelMon(ingVinc.moneda)}
                        {ingVinc.detalles && ` · ${ingVinc.detalles.split('|')[0].trim()}`}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end', flexShrink:0 }}>
                    {a.estado === 'PENDIENTE' && (
                      <div style={{ display:'flex', gap:4 }}>
                        <Btn label="✓" bg="#D1FAE5" color="#065F46" small onClick={() => cambiarEstado(a.id,'CONFIRMADA')}/>
                        <Btn label="✗" bg="#FEE2E2" color="#DC2626" small onClick={() => cambiarEstado(a.id,'RECHAZADA')}/>
                      </div>
                    )}
                    {a.estado === 'CONFIRMADA' && !esPasado(f) && (
                      <Btn label="Rechazar" bg="#FEE2E2" color="#DC2626" small onClick={() => cambiarEstado(a.id,'RECHAZADA')}/>
                    )}
                    <Btn label="Editar clase" bg={NA.light} color={NA.darker} small icon="ti-edit"
                      onClick={() => abrirEditClase(a)}/>
                    {esPasado(f) && !cobrado && (
                      <Btn label="Registrar cobro" small icon="ti-cash"
                        onClick={() => abrirIngreso(f, { instructor: a.nombreInstructor })}/>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* ── INGRESOS ── */}
      {totalIngresos > 0 && (
        <Section color="#065F46" bg="#F0FDF4" label="Ingresos">
          {evD.ingresos.map(i => {
            const clasesVinc = agenda.filter(a => a.ingresoId === i.id);
            return (
              <div key={i.id} style={{ padding:'13px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'baseline', flexWrap:'wrap', marginBottom:3 }}>
                      <span style={{ fontWeight:700, fontSize:16, color:'#065F46' }}>
                        + {parseFloat(i.total||0).toFixed(2)} {labelMon(i.moneda)}
                      </span>
                      <span style={{ fontSize:11, color:'#9ca3af' }}>#{i.id}</span>
                      {i.asignadoA && i.asignadoA !== 'NINGUNO'
                        ? <Tag label={i.asignadoA} color={NA.darker} bg={NA.light} small/>
                        : <Tag label="Sin asignar"  color="#92400E"  bg="#FEF3C7"  small/>}
                    </div>
                    <p style={{ margin:0, fontSize:12, color:NA.text2 }}>
                      {i.actividad}{i.instructor && ` · ${i.instructor}`} · {i.formaPago}
                    </p>
                    {i.detalles && (
                      <p style={{ margin:'2px 0 0', fontSize:11, color:NA.text2, fontStyle:'italic' }}>
                        {i.detalles.split('|')[0].trim()}
                      </p>
                    )}
                    {clasesVinc.length > 0 && (
                      <p style={{ margin:'5px 0 0', fontSize:11, color:'#065F46', display:'flex', alignItems:'center', gap:4 }}>
                        <i className="ti ti-calendar" style={{ fontSize:12 }}/>
                        Clases vinculadas: {clasesVinc.map(c => c.alumno).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* ── EGRESOS ── */}
      {totalEgresos > 0 && (
        <Section color="#991B1B" bg="#FEF2F2" label="Egresos">
          {evD.egresos.map(e => (
            <div key={e.id} style={{ padding:'13px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
              <div style={{ display:'flex', gap:8, alignItems:'baseline', marginBottom:3, flexWrap:'wrap' }}>
                <span style={{ fontWeight:700, fontSize:16, color:'#DC2626' }}>
                  - {parseFloat(e.total||0).toFixed(2)} {labelMon(e.moneda)}
                </span>
                <span style={{ fontSize:11, color:'#9ca3af' }}>#{e.id}</span>
                {e.tipoMovimientoPasivo && <Tag label={e.tipoMovimientoPasivo} color="#991B1B" bg="#FEE2E2" small/>}
              </div>
              <p style={{ margin:0, fontSize:12, color:NA.text2 }}>
                {e.detalles || e.actividad} · {e.formaPago}
              </p>
            </div>
          ))}
        </Section>
      )}

      {totalClases === 0 && totalIngresos === 0 && totalEgresos === 0 && (
        <p style={{ textAlign:'center', color:NA.text2, padding:'28px 0', fontSize:14 }}>
          Sin eventos para este día.
        </p>
      )}
    </div>
  );
};

// ── Sección con header coloreado ──────────────────────────────────────────────
const Section = ({ color, bg, label, children }) => (
  <div>
    <div style={{ padding:'7px 18px', background: bg, borderBottom:`0.5px solid ${NA.border}`, borderTop:`0.5px solid ${NA.border}` }}>
      <span style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</span>
    </div>
    {children}
  </div>
);

export default MonitorDia;