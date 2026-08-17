import React, { useState, useRef, useCallback } from 'react';
import { NA, fmt, esPasado, HOY, labelMon, Tag, Btn } from './MonitorShared';
import { useAuth } from '../../context/AuthContext';

const HORA_INICIO = 9;
const HORA_FIN    = 18;
const HORAS_TOTAL = HORA_FIN - HORA_INICIO;
const PX_POR_HORA = 80;
const TIMELINE_H  = HORAS_TOTAL * PX_POR_HORA;

const COLOR_TIPO = {
  APK:   { bg:'#DCFCE7', border:'#16A34A', text:'#14532D' },
  ASPK:  { bg:'#D1FAE5', border:'#059669', text:'#064E3B' },
  APWF:  { bg:'#DBEAFE', border:'#2563EB', text:'#1E3A8A' },
  ASPWF: { bg:'#EDE9FE', border:'#7C3AED', text:'#4C1D95' },
  APWS:  { bg:'#FEF9C3', border:'#CA8A04', text:'#713F12' },
  ASPWS: { bg:'#FEF3C7', border:'#D97706', text:'#78350F' },
  RENTAL:{ bg:'#F3F4F6', border:'#6B7280', text:'#1F2937' },
  OTRO:  { bg:'#FEE2E2', border:'#DC2626', text:'#7F1D1D' },
  DEFAULT:{ bg:NA.light,  border:NA.dark,  text:NA.darker },
};
const colorTipo = (tipo, estado) => {
  if (estado === 'RECHAZADA') return { bg:'#FEE2E2', border:'#DC2626', text:'#7F1D1D' };
  if (estado === 'PENDIENTE') return { bg:'#FEF3C7', border:'#D97706', text:'#92400E' };
  if (estado === 'FINALIZADA')return { bg:'#F0FDF4', border:'#059669', text:'#065F46' };
  return COLOR_TIPO[tipo] || COLOR_TIPO.DEFAULT;
};

const horaAMin = (h) => {
  if (!h) return null;
  const [hh, mm] = String(h).substring(0,5).split(':').map(Number);
  return hh * 60 + (mm || 0);
};
const posicion = (min) => Math.max(0, ((min - HORA_INICIO*60) / 60) * PX_POR_HORA);
const altura   = (ini, fin) => Math.max(28, ((fin - ini) / 60) * PX_POR_HORA - 2);

const PRIORIDAD = { APK:0, ASPK:1, APWF:2, ASPWF:3, APWS:4, ASPWS:5, RENTAL:8, OTRO:9 };
const prio = (t) => PRIORIDAD[t] ?? 6;

// ── Drawer de detalle de clase (aparece desde abajo) ──────────────────────────
const ClaseDrawer = ({ clase, ingresoVinc, cobrado, puedeAdmin, onClose,
  cambiarEstado, abrirEditClase, abrirIngreso, liquidarClase, duplicarClase }) => {
  if (!clase) return null;
  const col = colorTipo(clase.tipoAula, clase.estado);
  const pasada = esPasado(clase.fecha?.toString());

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.3)', zIndex:300 }}/>
      {/* Drawer */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:301,
        background:'#fff', borderRadius:'20px 20px 0 0',
        padding:'0 0 env(safe-area-inset-bottom,16px)',
        boxShadow:'0 -4px 32px rgba(0,0,0,.18)',
        maxHeight:'85vh', overflowY:'auto',
      }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
          <div style={{ width:36, height:4, borderRadius:99, background:'#e5e7eb' }}/>
        </div>

        {/* Header de la clase */}
        <div style={{ padding:'14px 20px 12px', borderBottom:`0.5px solid ${NA.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ display:'flex', gap:7, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                <span style={{ fontWeight:800, fontSize:18, color:NA.text }}>{clase.alumno}</span>
                {clase.tipoAula && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:99,
                    background:col.bg, color:col.text, border:`1px solid ${col.border}30` }}>
                    {clase.tipoAula}
                  </span>
                )}
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:99,
                  background: clase.estado==='CONFIRMADA'?'#D1FAE5':clase.estado==='FINALIZADA'?'#D1FAE5':'#FEF3C7',
                  color: clase.estado==='CONFIRMADA'||clase.estado==='FINALIZADA'?'#065F46':'#92400E' }}>
                  {clase.estado}
                </span>
                {pasada && !cobrado && <Tag label="⚠ Sin cobro" color="#9A3412" bg="#FFF7ED" small/>}
                {cobrado && <Tag label="✓ Cobrado" color="#065F46" bg="#D1FAE5" small/>}
              </div>
              <p style={{ margin:0, fontSize:13, color:NA.text2 }}>
                {clase.nombreInstructor || 'Sin instructor'}
                {clase.hora && ` · ${String(clase.hora).substring(0,5)}`}
                {clase.horaSalida && ` → ${String(clase.horaSalida).substring(0,5)}`}
                {clase.horas && ` · ${clase.horas}h`}
                {clase.lugar && ` · ${clase.lugar}`}
              </p>
              {clase.tarifa && (
                <p style={{ margin:'4px 0 0', fontSize:12, color:NA.dark, fontWeight:500 }}>
                  R$ {clase.tarifa}/h{clase.horas ? ` · Total estimado: R$ ${(clase.tarifa * parseFloat(clase.horas)).toFixed(0)}` : ''}
                </p>
              )}
              {ingresoVinc && (
                <p style={{ margin:'4px 0 0', fontSize:12, color:'#059669' }}>
                  💰 Ingreso #{ingresoVinc.id} · {parseFloat(ingresoVinc.total).toFixed(2)} {labelMon(ingresoVinc.moneda)}
                </p>
              )}
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'#f3f4f6', color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="ti ti-x" style={{ fontSize:16 }}/>
            </button>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {/* Confirmar/Rechazar */}
          {clase.estado === 'PENDIENTE' && (
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { cambiarEstado(clase.id,'CONFIRMADA'); onClose(); }}
                style={{ flex:1, padding:'13px', borderRadius:12, border:'none', background:'#D1FAE5', color:'#065F46', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                ✓ Confirmar
              </button>
              <button onClick={() => { cambiarEstado(clase.id,'RECHAZADA'); onClose(); }}
                style={{ flex:1, padding:'13px', borderRadius:12, border:'none', background:'#FEE2E2', color:'#DC2626', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                ✗ Rechazar
              </button>
            </div>
          )}
          {clase.estado === 'CONFIRMADA' && !pasada && (
            <button onClick={() => { cambiarEstado(clase.id,'RECHAZADA'); onClose(); }}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:'#FEE2E2', color:'#DC2626', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              ✗ Rechazar
            </button>
          )}

          {/* Liquidar */}
          {puedeAdmin && clase.estado === 'CONFIRMADA' && (
            <button onClick={() => { liquidarClase(clase); onClose(); }}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:NA.darker, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <i className="ti ti-cash" style={{ fontSize:16 }}/> Liquidar clase
            </button>
          )}
          {clase.estado === 'FINALIZADA' && (
            <div style={{ padding:'12px 16px', borderRadius:12, background:'#D1FAE5', color:'#065F46', fontSize:14, fontWeight:600, textAlign:'center' }}>
              ✓ Clase liquidada
            </div>
          )}

          {/* Cobro, Editar, Duplicar */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {pasada && !cobrado && (
              <button onClick={() => { abrirIngreso(clase.fecha?.toString(), { instructor: clase.nombreInstructor }); onClose(); }}
                style={{ padding:'12px 8px', borderRadius:12, border:`1px solid ${NA.border}`, background:'#fff', color:NA.dark, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <i className="ti ti-cash" style={{ fontSize:18 }}/>Cobro
              </button>
            )}
            <button onClick={() => { abrirEditClase(clase); onClose(); }}
              style={{ padding:'12px 8px', borderRadius:12, border:`1px solid ${NA.border}`, background:'#fff', color:NA.text, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <i className="ti ti-edit" style={{ fontSize:18 }}/>Editar
            </button>
            {duplicarClase && (
              <button onClick={() => { duplicarClase(clase); onClose(); }}
                style={{ padding:'12px 8px', borderRadius:12, border:`1px solid #EDE9FE`, background:'#EDE9FE', color:'#6D28D9', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <i className="ti ti-copy" style={{ fontSize:18 }}/>Duplicar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
const MonitorDia = ({
  diaSelec, evD, agenda, ingresos,
  tieneCobro, ingresoDeClase,
  cambiarEstado, abrirEditClase, abrirIngreso, abrirAgendar,
  liquidarClase, duplicarClase, navDia, onDragHora,
}) => {
  const [claseSelec, setClaseSelec] = useState(null); // clase abierta en drawer
  const timelineRef = useRef(null);
  const dragRef     = useRef(null);
  const { user }    = useAuth();
  const puedeAdmin  = user?.role === 'ADMINISTRADOR' || user?.role === 'SECRETARIA';

  // ── Drag ──────────────────────────────────────────────────────────────────
  const MIN_POR_PX = 60 / PX_POR_HORA;

  const startDrag = useCallback((e, clase) => {
    e.stopPropagation();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { id: clase.id, startY: clientY, horaOriginal: clase.hora };
  }, []);

  const endDrag = useCallback((e) => {
    if (!dragRef.current || !timelineRef.current) { dragRef.current = null; return; }
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const rect    = timelineRef.current.getBoundingClientRect();
    const yRel    = clientY - rect.top;
    const min     = HORA_INICIO*60 + yRel * MIN_POR_PX;
    const snapped = Math.round(min / 15) * 15;
    const hh      = Math.max(HORA_INICIO, Math.min(HORA_FIN-1, Math.floor(snapped/60)));
    const mm      = snapped % 60;
    const nueva   = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    if (onDragHora && nueva !== String(dragRef.current.horaOriginal).substring(0,5)) {
      onDragHora(dragRef.current.id, nueva);
    }
    dragRef.current = null;
  }, [onDragHora]);

  if (!diaSelec) return null;

  const pasado        = esPasado(diaSelec);
  const clasesActivas = evD.clases.filter(a => a.estado !== 'RECHAZADA');
  const clasesRechaz  = evD.clases.filter(a => a.estado === 'RECHAZADA');
  const horasTotales  = clasesActivas.reduce((s,a) => s + (parseFloat(a.horas)||0), 0);
  const clasesCobradas = clasesActivas.filter(a => tieneCobro(a)).length;

  // Suma ingresos del día
  const sumaIngresos = {};
  evD.ingresos.forEach(i => {
    const m = i.moneda?.startsWith('R$')||i.moneda==='BRL' ? 'R$'
            : i.moneda?.startsWith('EUR') ? '€' : 'US$';
    sumaIngresos[m] = (sumaIngresos[m]||0) + (parseFloat(i.total)||0);
  });

  // ── Columnas con prioridad por tipo ───────────────────────────────────────
  const columnas = [];
  const clasesConPos = clasesActivas
    .filter(a => horaAMin(a.hora) !== null)
    .sort((a,b) => {
      const d = horaAMin(a.hora) - horaAMin(b.hora);
      return d !== 0 ? d : prio(a.tipoAula) - prio(b.tipoAula);
    });
  const clasSinHora = clasesActivas.filter(a => horaAMin(a.hora) === null);

  clasesConPos.forEach(clase => {
    const ini = horaAMin(clase.hora);
    const fin = clase.horaSalida
      ? horaAMin(clase.horaSalida)
      : ini + (parseFloat(clase.horas)||1)*60;
    let col = columnas.findIndex(c => {
      const u = c[c.length-1];
      const uFin = u.horaSalida ? horaAMin(u.horaSalida) : horaAMin(u.hora)+(parseFloat(u.horas)||1)*60;
      return uFin <= ini;
    });
    if (col === -1) columnas.push([clase]);
    else            columnas[col].push(clase);
  });

  // Máximo 4 columnas en mobile — el resto van a "sin horario"
  const MAX_COLS  = 4;
  const colsVis   = columnas.slice(0, MAX_COLS);
  const clasesOvf = columnas.slice(MAX_COLS).flat();
  const nCols     = Math.max(1, colsVis.length);

  return (
    <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginBottom:14 }}>

      {/* ── HEADER ── */}
      <div style={{ padding:'14px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {navDia && (
              <button onClick={() => navDia(-1)}
                style={{ width:30, height:30, borderRadius:8, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
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
                style={{ width:30, height:30, borderRadius:8, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <i className="ti ti-chevron-right" style={{ fontSize:14 }}/>
              </button>
            )}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {abrirAgendar && (
              <button onClick={() => abrirAgendar(diaSelec)}
                style={{ padding:'8px 14px', borderRadius:10, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.dark, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-calendar-plus" style={{ fontSize:15 }}/> + Clase
              </button>
            )}
            {!diaSelec > HOY && (
              <button onClick={() => abrirIngreso(diaSelec)}
                style={{ padding:'8px 14px', borderRadius:10, border:'none', background:NA.dark, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-cash" style={{ fontSize:15 }}/> + Ingreso
              </button>
            )}
          </div>
        </div>

        {/* Stats chips */}
        <div style={{ display:'flex', gap:7, marginTop:12, flexWrap:'wrap' }}>
          <Chip icon="ti-calendar"         val={clasesActivas.length}  label="clases"   c={NA.dark}   bg={NA.light}/>
          <Chip icon="ti-clock"            val={`${horasTotales}h`}    label="horas"    c={NA.dark}   bg={NA.light}/>
          <Chip icon="ti-check"            val={clasesCobradas}        label="cobradas" c="#065F46"   bg="#D1FAE5"/>
          {clasesActivas.length - clasesCobradas > 0 && pasado && (
            <Chip icon="ti-alert-triangle" val={clasesActivas.length-clasesCobradas} label="sin cobro" c="#9A3412" bg="#FFF7ED"/>
          )}
          {Object.entries(sumaIngresos).map(([m,v]) => (
            <Chip key={m} icon="ti-cash" val={`${v.toFixed(0)} ${m}`} label="cobrado" c="#065F46" bg="#D1FAE5"/>
          ))}
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div style={{ position:'relative', padding:'0 0 0 44px', overflowX:'hidden' }}
        onMouseUp={endDrag} onMouseLeave={endDrag}
        onTouchEnd={endDrag}>

        {Array.from({ length: HORAS_TOTAL+1 }, (_,i) => {
          const hora = HORA_INICIO + i;
          return (
            <div key={hora} style={{ position:'absolute', left:0, right:0, top:i*PX_POR_HORA+12, borderTop:`0.5px solid ${NA.border}`, zIndex:1 }}>
              <span style={{ position:'absolute', left:2, top:-8, fontSize:9, color:NA.text2, fontWeight:500, width:34, textAlign:'right' }}>
                {hora}:00
              </span>
            </div>
          );
        })}

        {/* Botones + por hora */}
        {Array.from({ length: HORAS_TOTAL }, (_,i) => {
          const hora = HORA_INICIO + i;
          return (
            <button key={hora}
              onClick={() => abrirAgendar && abrirAgendar(diaSelec, `${String(hora).padStart(2,'0')}:00`)}
              style={{ position:'absolute', left:8, top:i*PX_POR_HORA+22, width:20, height:20, borderRadius:5, border:`0.5px dashed ${NA.border}`, background:'transparent', color:NA.border, cursor:'pointer', zIndex:2, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-plus" style={{ fontSize:10 }}/>
            </button>
          );
        })}

        {/* Línea de "ahora" */}
        {diaSelec === HOY && (() => {
          const n = new Date(); const min = n.getHours()*60+n.getMinutes();
          if (min < HORA_INICIO*60 || min > HORA_FIN*60) return null;
          return (
            <div style={{ position:'absolute', left:0, right:0, top:posicion(min)+12, height:2, background:'#EF4444', zIndex:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#EF4444', marginTop:-3, marginLeft:-2 }}/>
            </div>
          );
        })()}

        {/* Bloques de clases */}
        <div ref={timelineRef} style={{ position:'relative', height:TIMELINE_H, marginLeft:4, marginTop:12 }}>
          {colsVis.map((col, colIdx) =>
            col.map(clase => {
              const ini    = horaAMin(clase.hora);
              const finMin = clase.horaSalida ? horaAMin(clase.horaSalida) : ini+(parseFloat(clase.horas)||1)*60;
              const top    = posicion(ini);
              const h      = altura(ini, finMin);
              const color  = colorTipo(clase.tipoAula, clase.estado);
              const cobrado = tieneCobro(clase);
              const colW   = `calc((100% - 2px) / ${nCols})`;
              const colL   = `calc(${colIdx} * (100% - 2px) / ${nCols})`;

              return (
                <div key={clase.id}
                  onClick={() => setClaseSelec(clase)}
                  onMouseDown={puedeAdmin ? e => startDrag(e, clase) : undefined}
                  onTouchStart={puedeAdmin ? e => startDrag(e, clase) : undefined}
                  onTouchEnd={e => { if (!dragRef.current?.moved) setClaseSelec(clase); }}
                  style={{
                    position:'absolute', top, left:colL, width:colW,
                    minHeight:h, zIndex:5,
                    background: color.bg,
                    borderLeft: `3px solid ${color.border}`,
                    borderRadius:'0 6px 6px 0',
                    padding:'4px 6px', boxSizing:'border-box',
                    cursor:'pointer', overflow:'hidden',
                    userSelect:'none',
                  }}>
                  {/* Indicadores top-right */}
                  <div style={{ position:'absolute', top:3, right:4, display:'flex', gap:2 }}>
                    {cobrado && <span style={{ fontSize:9, color:'#059669' }}>✓</span>}
                    {pasado && !cobrado && clase.estado!=='RECHAZADA' && <span style={{ fontSize:9, color:'#EA580C' }}>⚠</span>}
                  </div>
                  {/* Nombre */}
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:color.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:14 }}>
                    {clase.alumno}
                  </p>
                  {h > 32 && (
                    <p style={{ margin:'1px 0 0', fontSize:10, color:color.text, opacity:.8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {clase.tipoAula || ''}
                    </p>
                  )}
                  {h > 48 && (
                    <p style={{ margin:'1px 0 0', fontSize:10, color:color.text, opacity:.6 }}>
                      {String(clase.hora||'').substring(0,5)}
                      {clase.horaSalida && ` → ${String(clase.horaSalida).substring(0,5)}`}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Overflow de columnas → sin horario */}
        {clasesOvf.length > 0 && (
          <div style={{ borderTop:`0.5px solid ${NA.border}`, padding:'8px 8px 8px 4px' }}>
            <p style={{ fontSize:10, color:NA.text2, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'.06em' }}>
              Más clases ({clasesOvf.length})
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {clasesOvf.map(clase => {
                const col = colorTipo(clase.tipoAula, clase.estado);
                return (
                  <div key={clase.id} onClick={() => setClaseSelec(clase)}
                    style={{ background:col.bg, borderLeft:`3px solid ${col.border}`, borderRadius:'0 8px 8px 0', padding:'8px 12px', cursor:'pointer' }}>
                    <span style={{ fontWeight:600, fontSize:13, color:col.text }}>{clase.alumno}</span>
                    <span style={{ fontSize:11, color:col.text, opacity:.75, marginLeft:8 }}>
                      {clase.tipoAula && `${clase.tipoAula} · `}{String(clase.hora||'').substring(0,5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sin horario */}
        {clasSinHora.length > 0 && (
          <div style={{ borderTop:`0.5px solid ${NA.border}`, padding:'8px 8px 8px 4px' }}>
            <p style={{ fontSize:10, color:NA.text2, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'.06em' }}>Sin horario</p>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {clasSinHora.map(clase => {
                const col = colorTipo(clase.tipoAula, clase.estado);
                return (
                  <div key={clase.id} onClick={() => setClaseSelec(clase)}
                    style={{ background:col.bg, borderLeft:`3px solid ${col.border}`, borderRadius:'0 8px 8px 0', padding:'8px 12px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <span style={{ fontWeight:600, fontSize:13, color:col.text }}>{clase.alumno}</span>
                      {clase.tipoAula && <span style={{ fontSize:11, color:col.text, opacity:.75, marginLeft:8 }}>{clase.tipoAula}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rechazadas */}
        {clasesRechaz.length > 0 && (
          <div style={{ borderTop:`0.5px solid ${NA.border}`, padding:'8px 8px 8px 4px' }}>
            <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 4px', textTransform:'uppercase' }}>Rechazadas ({clasesRechaz.length})</p>
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

      {/* ── INGRESOS ── */}
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
                  {i.asignadoA && i.asignadoA!=='NINGUNO'
                    ? <Tag label={i.asignadoA} color={NA.darker} bg={NA.light} small/>
                    : <Tag label="Sin asignar" color="#92400E" bg="#FEF3C7" small/>}
                </div>
                <p style={{ margin:0, fontSize:12, color:NA.text2 }}>
                  {i.actividad}{i.instructor && ` · ${i.instructor}`} · {i.formaPago}
                </p>
                {i.detalles && <p style={{ margin:'2px 0 0', fontSize:11, color:NA.text2, fontStyle:'italic' }}>{i.detalles.split('|')[0].trim()}</p>}
                {clasesVinc.length > 0 && (
                  <p style={{ margin:'4px 0 0', fontSize:11, color:'#065F46' }}>
                    <i className="ti ti-calendar" style={{ fontSize:11, marginRight:3 }}/>{clasesVinc.map(c=>c.alumno).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </Section>
      )}

      {/* ── EGRESOS ── */}
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
              <p style={{ margin:0, fontSize:12, color:NA.text2 }}>{e.detalles||e.actividad} · {e.formaPago}</p>
            </div>
          ))}
        </Section>
      )}

      {clasesActivas.length===0 && evD.ingresos.length===0 && evD.egresos.length===0 && (
        <div style={{ padding:'32px 20px', textAlign:'center', color:NA.text2 }}>
          <i className="ti ti-calendar-off" style={{ fontSize:28, opacity:.3, display:'block', marginBottom:8 }}/>
          Sin eventos para este día.
          {abrirAgendar && (
            <div style={{ marginTop:12 }}>
              <button onClick={() => abrirAgendar(diaSelec)}
                style={{ padding:'9px 20px', background:NA.dark, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Agregar clase
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DRAWER de detalle ── */}
      {claseSelec && (
        <ClaseDrawer
          clase={claseSelec}
          ingresoVinc={ingresoDeClase(claseSelec)}
          cobrado={tieneCobro(claseSelec)}
          puedeAdmin={puedeAdmin}
          onClose={() => setClaseSelec(null)}
          cambiarEstado={cambiarEstado}
          abrirEditClase={abrirEditClase}
          abrirIngreso={abrirIngreso}
          liquidarClase={liquidarClase}
          duplicarClase={duplicarClase}
        />
      )}
    </div>
  );
};

// ── Pequeños helpers ──────────────────────────────────────────────────────────
const Chip = ({ icon, val, label, c, bg }) => (
  <div style={{ display:'flex', alignItems:'center', gap:5, background:bg, padding:'5px 10px', borderRadius:99 }}>
    <i className={`ti ${icon}`} style={{ fontSize:12, color:c }}/>
    <span style={{ fontSize:12, fontWeight:600, color:c }}>{val}</span>
    <span style={{ fontSize:11, color:c, opacity:.7 }}>{label}</span>
  </div>
);

const Section = ({ color, bg, label, children }) => (
  <div>
    <div style={{ padding:'7px 18px', background:bg, borderBottom:`0.5px solid ${NA.border}`, borderTop:`0.5px solid ${NA.border}` }}>
      <span style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</span>
    </div>
    {children}
  </div>
);

export default MonitorDia;