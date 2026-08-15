import React, { useState, useRef, useCallback } from 'react';
import { NA, fmt, esPasado, HOY, labelMon, Tag, Btn, TIPOS_AULA } from './MonitorShared';
import { useAuth } from '../../context/AuthContext';

// ── Constantes del timeline ───────────────────────────────────────────────────
const HORA_INICIO  = 9;   // 9:00
const HORA_FIN     = 18;  // 18:00
const HORAS_TOTAL  = HORA_FIN - HORA_INICIO;
const PX_POR_HORA  = 68;  // altura en px de cada franja horaria
const TIMELINE_H   = HORAS_TOTAL * PX_POR_HORA;

// Colores por tipo de aula
const COLOR_TIPO = {
  APK:   { bg: '#DCFCE7', border: '#16A34A', text: '#14532D' },
  ASPK:  { bg: '#D1FAE5', border: '#059669', text: '#064E3B' },
  APWF:  { bg: '#DBEAFE', border: '#2563EB', text: '#1E3A8A' },
  ASPWF: { bg: '#EDE9FE', border: '#7C3AED', text: '#4C1D95' },
  APWS:  { bg: '#FEF9C3', border: '#CA8A04', text: '#713F12' },
  ASPWS: { bg: '#FEF3C7', border: '#D97706', text: '#78350F' },
  RENTAL:{ bg: '#F3F4F6', border: '#6B7280', text: '#1F2937' },
  OTRO:  { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' },
  DEFAULT:{ bg: NA.light, border: NA.dark,  text: NA.darker  },
};

const colorDeTipo = (tipoAula, estado) => {
  if (estado === 'RECHAZADA') return { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' };
  if (estado === 'PENDIENTE') return { bg: '#FEF3C7', border: '#D97706', text: '#92400E' };
  return COLOR_TIPO[tipoAula] || COLOR_TIPO.DEFAULT;
};

// Convierte "HH:MM:SS" o "HH:MM" a minutos desde medianoche
const horaAMin = (h) => {
  if (!h) return null;
  const str = String(h).substring(0, 5);
  const [hh, mm] = str.split(':').map(Number);
  return hh * 60 + (mm || 0);
};

// Posición y altura en px dentro del timeline
const posicion = (minutos) => {
  const minRelativo = minutos - HORA_INICIO * 60;
  return Math.max(0, (minRelativo / 60) * PX_POR_HORA);
};

const altura = (minInicio, minFin) => {
  if (!minFin || minFin <= minInicio) return PX_POR_HORA; // fallback 1h
  return Math.max(28, ((minFin - minInicio) / 60) * PX_POR_HORA - 2);
};

// ── Componente principal ──────────────────────────────────────────────────────
const MonitorDia = ({
  diaSelec, evD, agenda, ingresos,
  tieneCobro, ingresoDeClase,
  cambiarEstado, abrirEditClase, abrirIngreso, abrirAgendar,
  liquidarClase, duplicarClase, navDia, onDragHora,
}) => {
  const [claseExpandida, setClaseExpandida] = useState(null);
  const [dragging,       setDragging]       = useState(null); // { id, startY, startMin }
  const [dragY,          setDragY]          = useState(null); // posición Y actual
  const timelineRef = useRef(null);
  const { user } = useAuth();
  const puedeAdmin = user?.role === 'ADMINISTRADOR' || user?.role === 'SECRETARIA';

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const MIN_POR_PX = 60 / PX_POR_HORA; // minutos por pixel

  const startDrag = useCallback((e, clase) => {
    e.stopPropagation();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragging({ id: clase.id, startY: clientY, horaOriginal: clase.hora });
    setDragY(clientY);
  }, []);

  const onDrag = useCallback((e) => {
    if (!dragging) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragY(clientY);
  }, [dragging]);

  const endDrag = useCallback((e) => {
    if (!dragging || !timelineRef.current) { setDragging(null); setDragY(null); return; }

    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const rect    = timelineRef.current.getBoundingClientRect();
    const yRel    = clientY - rect.top;
    const minutos = HORA_INICIO * 60 + yRel * MIN_POR_PX;

    // Snap a intervalos de 15 minutos
    const snapped   = Math.round(minutos / 15) * 15;
    const hh        = Math.floor(snapped / 60);
    const mm        = snapped % 60;
    const nuevaHora = `${String(Math.max(HORA_INICIO, Math.min(HORA_FIN - 1, hh))).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;

    if (onDragHora && nuevaHora !== dragging.horaOriginal?.substring(0, 5)) {
      onDragHora(dragging.id, nuevaHora);
    }
    setDragging(null);
    setDragY(null);
  }, [dragging, onDragHora]);


  if (!diaSelec) return null;

  const pasado  = esPasado(diaSelec);
  const esFutur = diaSelec > HOY;
  const clasesActivas = evD.clases.filter(a => a.estado !== 'RECHAZADA');
  const clasesRechaz  = evD.clases.filter(a => a.estado === 'RECHAZADA');

  // ── Estadísticas del día ──────────────────────────────────────────────────
  const horasTotales   = clasesActivas.reduce((s, a) => s + (parseFloat(a.horas) || 0), 0);
  const clasesCobradas = clasesActivas.filter(a => tieneCobro(a)).length;
  const sumaIngresos   = {};
  evD.ingresos.forEach(i => {
    const m = i.moneda?.startsWith('R$') || i.moneda === 'BRL' ? 'R$'
            : i.moneda?.startsWith('EUR') ? '€'
            : i.moneda?.startsWith('USD') ? 'US$' : (i.moneda || 'R$');
    sumaIngresos[m] = (sumaIngresos[m] || 0) + (parseFloat(i.total) || 0);
  });

  // ── Agrupar clases en columnas (para solapamientos) ───────────────────────
  // Prioridad de tipo: clases privadas/semiprivadas primero, rental/otro al final
  const PRIORIDAD_TIPO = { APK:0, ASPK:1, APWF:2, ASPWF:3, APWS:4, ASPWS:5, RENTAL:8, OTRO:9 };
  const prioTipo = (t) => PRIORIDAD_TIPO[t] ?? 6;

  const columnas = [];
  const clasesConPos = clasesActivas
    .filter(a => horaAMin(a.hora) !== null)
    .sort((a, b) => {
      const horaDiff = horaAMin(a.hora) - horaAMin(b.hora);
      if (horaDiff !== 0) return horaDiff;
      // Misma hora → prioridad por tipo (APK antes que RENTAL)
      return prioTipo(a.tipoAula) - prioTipo(b.tipoAula);
    });
  const clasSinHora = clasesActivas.filter(a => horaAMin(a.hora) === null);

  clasesConPos.forEach(clase => {
    const ini = horaAMin(clase.hora);
    const fin = clase.horaSalida
      ? horaAMin(clase.horaSalida)
      : ini + (parseFloat(clase.horas) || 1) * 60;

    let col = columnas.findIndex(c => {
      const ultimo = c[c.length - 1];
      const ultimoFin = ultimo.horaSalida
        ? horaAMin(ultimo.horaSalida)
        : horaAMin(ultimo.hora) + (parseFloat(ultimo.horas) || 1) * 60;
      return ultimoFin <= ini;
    });
    if (col === -1) { columnas.push([clase]); }
    else            { columnas[col].push(clase); }
  });

  const nCols = Math.max(1, columnas.length);

  return (
    <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginBottom:14 }}>

      {/* ══ HEADER + ESTADÍSTICAS ══ */}
      <div style={{ padding:'14px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Flechas de navegación entre días */}
            {navDia && (
              <button onClick={() => navDia(-1)}
                style={{ width:30, height:30, borderRadius:8, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                <i className="ti ti-chevron-left" style={{ fontSize:14 }}/>
              </button>
            )}
            <div>
              <p style={{ margin:0, fontWeight:700, fontSize:17, color:NA.text }}>{fmt(diaSelec)}</p>
              <p style={{ margin:'2px 0 0', fontSize:11, color:NA.text2 }}>
                {clasesActivas.length} clase{clasesActivas.length!==1?'s':''} · {horasTotales}h en total
              </p>
            </div>
            {navDia && (
              <button onClick={() => navDia(1)}
                style={{ width:30, height:30, borderRadius:8, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                <i className="ti ti-chevron-right" style={{ fontSize:14 }}/>
              </button>
            )}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {abrirAgendar && (
              <Btn label="+ Clase" icon="ti-calendar-plus" bg={NA.light} color={NA.darker} small
                onClick={() => abrirAgendar(diaSelec)}/>
            )}
            {!esFutur && (
              <Btn label="+ Ingreso" icon="ti-cash" small
                onClick={() => abrirIngreso(diaSelec)}/>
            )}
          </div>
        </div>

        {/* Chips de estadísticas */}
        <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
          <StatChip icon="ti-calendar" val={clasesActivas.length} label="clases" color={NA.dark} bg={NA.light}/>
          <StatChip icon="ti-clock"    val={horasTotales}          label="horas"  color={NA.dark} bg={NA.light}/>
          <StatChip icon="ti-check"    val={clasesCobradas}        label="cobradas" color="#065F46" bg="#D1FAE5"/>
          {clasesActivas.length - clasesCobradas > 0 && pasado && (
            <StatChip icon="ti-alert-triangle" val={clasesActivas.length - clasesCobradas} label="sin cobro" color="#9A3412" bg="#FFF7ED"/>
          )}
          {Object.entries(sumaIngresos).map(([m,v]) => (
            <StatChip key={m} icon="ti-cash" val={`${v.toFixed(0)} ${m}`} label="cobrado" color="#065F46" bg="#D1FAE5"/>
          ))}
        </div>
      </div>

      {/* ══ TIMELINE ══ */}
      <div style={{ position:'relative', padding:'0 0 0 48px', overflowX:'hidden' }}
        onMouseMove={onDrag}  onMouseUp={endDrag}  onMouseLeave={endDrag}
        onTouchMove={onDrag}  onTouchEnd={endDrag}>

        {/* Líneas horizontales por hora */}
        {Array.from({ length: HORAS_TOTAL + 1 }, (_, i) => {
          const hora = HORA_INICIO + i;
          return (
            <div key={hora} style={{ position:'absolute', left:0, right:0, top: i * PX_POR_HORA, borderTop:`0.5px solid ${NA.border}`, zIndex:1 }}>
              <span style={{ position:'absolute', left:4, top:-8, fontSize:10, color:NA.text2, fontWeight:500, width:38, textAlign:'right' }}>
                {hora}:00
              </span>
            </div>
          );
        })}

        {/* Área de bloques */}
        <div ref={timelineRef} style={{ position:'relative', height: TIMELINE_H, marginLeft:4 }}>

          {/* Botones "+" en cada hora */}
          {Array.from({ length: HORAS_TOTAL }, (_, i) => {
            const hora = HORA_INICIO + i;
            return (
              <button key={hora}
                onClick={() => abrirAgendar && abrirAgendar(diaSelec, `${String(hora).padStart(2,'0')}:00`)}
                title={`Agregar clase a las ${hora}:00`}
                style={{
                  position:'absolute', left:2, top: i * PX_POR_HORA + 2,
                  width:28, height:28, borderRadius:8,
                  border:`0.5px dashed ${NA.border}`, background:'transparent',
                  color: NA.border, cursor:'pointer', zIndex:2, fontSize:14,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = NA.light; e.currentTarget.style.color = NA.dark; e.currentTarget.style.borderColor = NA.dark; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = NA.border; e.currentTarget.style.borderColor = NA.border; }}
              >
                <i className="ti ti-plus" style={{ fontSize:12 }}/>
              </button>
            );
          })}

          {/* Línea de "ahora" si es hoy */}
          {diaSelec === HOY && (() => {
            const now   = new Date();
            const minNow = now.getHours() * 60 + now.getMinutes();
            if (minNow < HORA_INICIO*60 || minNow > HORA_FIN*60) return null;
            return (
              <div style={{
                position:'absolute', left:0, right:0, top: posicion(minNow),
                height:2, background:'#EF4444', zIndex:10,
              }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#EF4444', marginTop:-3, marginLeft:-4 }}/>
              </div>
            );
          })()}

          {/* Bloques de clases */}
          {columnas.map((col, colIdx) =>
            col.map(clase => {
              const ini    = horaAMin(clase.hora);
              const finMin = clase.horaSalida
                ? horaAMin(clase.horaSalida)
                : ini + (parseFloat(clase.horas) || 1) * 60;
              const top    = posicion(ini);
              const h      = altura(ini, finMin);
              const color  = colorDeTipo(clase.tipoAula, clase.estado);
              const cobrado = tieneCobro(clase);
              const ingVinc = ingresoDeClase(clase);
              const expandida = claseExpandida === clase.id;

              const colW   = `calc((100% - 36px) / ${nCols})`;
              const colL   = `calc(36px + ${colIdx} * (100% - 36px) / ${nCols})`;

              const isDragging = dragging?.id === clase.id;
              const dragOffset = isDragging && dragY !== null
                ? (dragY - dragging.startY)
                : 0;

              return (
                <div key={clase.id}
                  onClick={() => !isDragging && setClaseExpandida(expandida ? null : clase.id)}
                  style={{
                    position:'absolute',
                    top: top + dragOffset,
                    left: colL, width: colW,
                    minHeight: h, zIndex: isDragging ? 50 : expandida ? 20 : 5,
                    background: color.bg,
                    borderLeft: `3px solid ${color.border}`,
                    borderRadius:'0 8px 8px 0',
                    padding:'4px 8px', boxSizing:'border-box',
                    cursor: isDragging ? 'grabbing' : 'pointer',
                    overflow: expandida ? 'visible' : 'hidden',
                    boxShadow: isDragging
                      ? '0 8px 24px rgba(0,0,0,.25)'
                      : expandida ? '0 4px 20px rgba(0,0,0,.15)' : 'none',
                    opacity: isDragging ? 0.85 : 1,
                    transition: isDragging ? 'none' : 'box-shadow .15s',
                    userSelect: 'none',
                  }}>
                  {/* Contenido compacto siempre visible */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    {/* Handle de drag — solo visible en admin/secretaria */}
                    {puedeAdmin && (
                      <div
                        onMouseDown={e => startDrag(e, clase)}
                        onTouchStart={e => startDrag(e, clase)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          cursor:'grab', padding:'2px 3px 2px 0', flexShrink:0,
                          display:'flex', flexDirection:'column', gap:2, marginTop:2,
                          opacity: .4,
                        }}
                        title="Arrastrar para cambiar hora">
                        {[0,1,2].map(i => (
                          <span key={i} style={{ display:'block', width:10, height:1.5, borderRadius:1, background:color.border }}/>
                        ))}
                      </div>
                    )}
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ margin:0, fontSize:11, fontWeight:700, color: color.text, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace: expandida ? 'normal' : 'nowrap' }}>
                        {clase.alumno}
                      </p>
                      {h > 36 && (
                        <p style={{ margin:'1px 0 0', fontSize:10, color: color.text, opacity:.75, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {clase.nombreInstructor}
                          {clase.tipoAula && ` · ${clase.tipoAula}`}
                        </p>
                      )}
                      {h > 52 && (
                        <p style={{ margin:'1px 0 0', fontSize:10, color: color.text, opacity:.6 }}>
                          {String(clase.hora||'').substring(0,5)}
                          {clase.horaSalida && ` → ${String(clase.horaSalida).substring(0,5)}`}
                        </p>
                      )}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2, alignItems:'flex-end', flexShrink:0, marginLeft:3 }}>
                      {cobrado && <i className="ti ti-check" style={{ fontSize:10, color:'#065F46' }}/>}
                      {esPasado(diaSelec) && !cobrado && <i className="ti ti-alert-triangle" style={{ fontSize:10, color:'#EA580C' }}/>}
                    </div>
                  </div>

                  {/* Panel expandido al tocar */}
                  {expandida && (
                    <div style={{ marginTop:8, paddingTop:8, borderTop:`0.5px solid ${color.border}40` }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:6 }}>
                        <Tag label={clase.estado} color={color.text} bg={`${color.border}22`} small/>
                        {clase.tipoAula && <Tag label={clase.tipoAula} color={color.text} bg={`${color.border}22`} small/>}
                        {esPasado(diaSelec) && !cobrado && <Tag label="⚠ Sin cobro" color="#9A3412" bg="#FFF7ED" small/>}
                        {cobrado && <Tag label="✓ Cobrado" color="#065F46" bg="#D1FAE5" small/>}
                      </div>
                      {clase.tarifa && (
                        <p style={{ margin:'0 0 4px', fontSize:11, color: color.text }}>
                          R$ {clase.tarifa}/h · {clase.horas}h
                          {clase.horasPagadas ? ` · Pagado: R$ ${clase.horasPagadas}` : ''}
                        </p>
                      )}
                      {ingVinc && (
                        <p style={{ margin:'0 0 6px', fontSize:10, color:'#059669' }}>
                          💰 Ingreso #{ingVinc.id} · {parseFloat(ingVinc.total).toFixed(2)} {labelMon(ingVinc.moneda)}
                        </p>
                      )}
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                        {clase.estado === 'PENDIENTE' && (<>
                          <Btn label="✓" bg="#D1FAE5" color="#065F46" small onClick={() => { cambiarEstado(clase.id,'CONFIRMADA'); setClaseExpandida(null); }}/>
                          <Btn label="✗" bg="#FEE2E2" color="#DC2626" small onClick={() => { cambiarEstado(clase.id,'RECHAZADA'); setClaseExpandida(null); }}/>
                        </>)}
                        {clase.estado === 'CONFIRMADA' && !esPasado(diaSelec) && (
                          <Btn label="Rechazar" bg="#FEE2E2" color="#DC2626" small onClick={() => cambiarEstado(clase.id,'RECHAZADA')}/>
                        )}
                        {/* Liquidar: solo admin/secretaria, clase confirmada en día pasado */}
                        {puedeAdmin && clase.estado === 'CONFIRMADA' && liquidarClase && (
                          <Btn label="💰 Liquidar" bg='#085041' color='#fff' small
                            onClick={() => { liquidarClase(clase); setClaseExpandida(null); }}/>
                        )}
                        {clase.estado === 'FINALIZADA' && (
                          <span style={{ fontSize:11, color:'#065F46', fontWeight:600,
                            padding:'4px 10px', borderRadius:8, background:'#D1FAE5',
                            display:'flex', alignItems:'center', gap:4 }}>
                            <i className="ti ti-check" style={{ fontSize:12 }}/> Liquidada
                          </span>
                        )}
                        <Btn label="Editar" bg={NA.light} color={NA.darker} small icon="ti-edit"
                          onClick={() => { abrirEditClase(clase); setClaseExpandida(null); }}/>
                        {duplicarClase && (
                          <Btn label="Duplicar" bg='#EDE9FE' color='#6D28D9' small icon="ti-copy"
                            onClick={() => { duplicarClase(clase); setClaseExpandida(null); }}/>
                        )}
                        {esPasado(diaSelec) && !cobrado && (
                          <Btn label="Cobro" small icon="ti-cash"
                            onClick={() => { abrirIngreso(diaSelec, { instructor: clase.nombreInstructor }); setClaseExpandida(null); }}/>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Clases sin hora al final del timeline */}
        {clasSinHora.length > 0 && (
          <div style={{ borderTop:`0.5px solid ${NA.border}`, padding:'8px 8px 8px 4px' }}>
            <p style={{ fontSize:10, color:NA.text2, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'.06em' }}>Sin horario asignado</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {clasSinHora.map(clase => {
                const cobrado = tieneCobro(clase);
                const color   = colorDeTipo(clase.tipoAula, clase.estado);
                return (
                  <div key={clase.id} style={{ background: color.bg, borderLeft:`3px solid ${color.border}`, borderRadius:'0 8px 8px 0', padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                    <div>
                      <span style={{ fontWeight:600, fontSize:13, color: color.text }}>{clase.alumno}</span>
                      <span style={{ fontSize:11, color: color.text, opacity:.75, marginLeft:6 }}>
                        {clase.nombreInstructor}{clase.tipoAula && ` · ${clase.tipoAula}`}{clase.horas && ` · ${clase.horas}h`}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <Btn label="Editar" bg={NA.light} color={NA.darker} small icon="ti-edit" onClick={() => abrirEditClase(clase)}/>
                      {esPasado(diaSelec) && !cobrado && (
                        <Btn label="Cobro" small icon="ti-cash" onClick={() => abrirIngreso(diaSelec, { instructor: clase.nombreInstructor })}/>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clases rechazadas colapsadas al final */}
        {clasesRechaz.length > 0 && (
          <div style={{ borderTop:`0.5px solid ${NA.border}`, padding:'8px 8px 8px 4px' }}>
            <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'.06em' }}>
              Rechazadas ({clasesRechaz.length})
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {clasesRechaz.map(c => (
                <span key={c.id} style={{ fontSize:11, color:'#9ca3af', background:'#F9FAFB', padding:'3px 10px', borderRadius:99, border:'0.5px solid #E5E7EB' }}>
                  {c.alumno} · {String(c.hora||'').substring(0,5)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ INGRESOS (abajo) ══ */}
      {evD.ingresos.length > 0 && (
        <Section color="#065F46" bg="#F0FDF4" label="Ingresos">
          {evD.ingresos.map(i => {
            const clasesVinc = agenda.filter(a => a.ingresoId === i.id);
            return (
              <div key={i.id} style={{ padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
                <div style={{ display:'flex', gap:8, alignItems:'baseline', flexWrap:'wrap', marginBottom:3 }}>
                  <span style={{ fontWeight:700, fontSize:15, color:'#065F46' }}>
                    + {parseFloat(i.total||0).toFixed(2)} {labelMon(i.moneda)}
                  </span>
                  <span style={{ fontSize:11, color:'#9ca3af' }}>#{i.id}</span>
                  {i.asignadoA && i.asignadoA !== 'NINGUNO'
                    ? <Tag label={i.asignadoA} color={NA.darker} bg={NA.light} small/>
                    : <Tag label="Sin asignar" color="#92400E" bg="#FEF3C7" small/>}
                </div>
                <p style={{ margin:0, fontSize:12, color:NA.text2 }}>
                  {i.actividad}{i.instructor && ` · ${i.instructor}`} · {i.formaPago}
                </p>
                {i.detalles && <p style={{ margin:'2px 0 0', fontSize:11, color:NA.text2, fontStyle:'italic' }}>{i.detalles.split('|')[0].trim()}</p>}
                {clasesVinc.length > 0 && (
                  <p style={{ margin:'4px 0 0', fontSize:11, color:'#065F46' }}>
                    <i className="ti ti-calendar" style={{ fontSize:11, marginRight:3 }}/>
                    {clasesVinc.map(c => c.alumno).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </Section>
      )}

      {/* ══ EGRESOS (abajo) ══ */}
      {evD.egresos.length > 0 && (
        <Section color="#991B1B" bg="#FEF2F2" label="Egresos">
          {evD.egresos.map(e => (
            <div key={e.id} style={{ padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
              <div style={{ display:'flex', gap:8, alignItems:'baseline', marginBottom:3, flexWrap:'wrap' }}>
                <span style={{ fontWeight:700, fontSize:15, color:'#DC2626' }}>
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

      {clasesActivas.length === 0 && evD.ingresos.length === 0 && evD.egresos.length === 0 && (
        <div style={{ padding:'32px 20px', textAlign:'center', color:NA.text2 }}>
          <i className="ti ti-calendar-off" style={{ fontSize:28, opacity:.3, display:'block', marginBottom:8 }}/>
          Sin eventos para este día.
          {abrirAgendar && (
            <div style={{ marginTop:12 }}>
              <Btn label="Agregar clase" icon="ti-plus" bg={NA.light} color={NA.dark}
                onClick={() => abrirAgendar(diaSelec)}/>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Chip de estadística ───────────────────────────────────────────────────────
const StatChip = ({ icon, val, label, color, bg }) => (
  <div style={{ display:'flex', alignItems:'center', gap:5, background: bg, padding:'5px 10px', borderRadius:99 }}>
    <i className={`ti ${icon}`} style={{ fontSize:12, color }}/>
    <span style={{ fontSize:12, fontWeight:600, color }}>{val}</span>
    <span style={{ fontSize:11, color, opacity:.7 }}>{label}</span>
  </div>
);

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