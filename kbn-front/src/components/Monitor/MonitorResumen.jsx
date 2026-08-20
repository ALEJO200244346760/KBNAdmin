import React, { useState } from 'react';
import { NA, MESES_S, labelMon, normName, Tag } from './MonitorShared';

const MonitorResumen = ({ mes, resumen }) => {
  const { clasesMes, ingresosMes, egresosMes, alertasMes, balances } = resumen;
  const [modalInst, setModalInst] = useState(null);

  // 1. Filtramos las clases RECHAZADAS para que no ensucien la estadística
  const clasesActivas = clasesMes.filter(c => c.estado !== 'RECHAZADA');

  const stats = [
    { l:'Clases',    v: clasesActivas.length, c: NA.dark,   icon:'ti-calendar'      },
    { l:'Ingresos',  v: ingresosMes.length,   c:'#065F46',  icon:'ti-trending-up'   },
    { l:'Egresos',   v: egresosMes.length,    c:'#991B1B',  icon:'ti-trending-down' },
    { l:'Sin cobro', v: alertasMes.length,    c:'#9A3412',  icon:'ti-alert-triangle'},
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

  // ── Lógica de Horas ──
  const calcularHorasReales = (item) => {
    if (item.salida) {
      const inicio = item.hora || item.horaInicio || item.inicio; 
      if (inicio) {
        const [h1, m1] = inicio.split(':').map(Number);
        const [h2, m2] = item.salida.split(':').map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          let diff = (h2 + (m2 || 0) / 60) - (h1 + (m1 || 0) / 60);
          if (diff > 0) return Math.round(diff * 100) / 100;
        }
      }
    }
    return Number(item.horas || item.cantidadHoras) || 0;
  };

  // ── Smart Parser para Ingresos Manuales ──
  const esClase = (texto) => {
    if (!texto) return false;
    const t = texto.toLowerCase();
    return ['apk', 'aspk', 'apwf', 'aspwf', 'apws', 'aspws', 'clase', 'curso', 'kite', 'wing', 'windsurf', 'aula'].some(kw => t.includes(kw));
  };

  const parsearIngresoManual = (ing) => {
    // Cortamos la parte del reparto de comisiones (" | Reparto: ...")
    let textoLimpio = ing.detalles ? String(ing.detalles).split('|')[0].trim() : ing.actividad || '';
    let alumno = '';
    let tipoAula = '';

    // 1. Si usaron el punto medio "Alumno · Detalle"
    if (textoLimpio.includes('·')) {
      const partes = textoLimpio.split('·');
      alumno = partes[0].trim();
      textoLimpio = partes[1].trim(); // Analizamos el resto
    }

    // 2. Buscamos las siglas al principio o en el texto
    const regexSiglas = /\b(APK|ASPK|APWF|ASPWF|APWS|ASPWS)\b/i;
    const match = textoLimpio.match(regexSiglas);
    
    if (match) {
      tipoAula = match[1].toUpperCase();
      // Si no sacamos el alumno por el punto medio, lo deducimos limpiando la sigla
      if (!alumno) {
        alumno = textoLimpio.replace(regexSiglas, '').replace(/^-/, '').trim();
      }
    }

    // Si falló todo, ponemos valores por defecto limpios
    if (!alumno) alumno = textoLimpio || 'Sin nombre';
    if (!tipoAula) tipoAula = 'MANUAL';

    return { 
      _alumno: alumno.length > 25 ? alumno.substring(0,25) + '...' : alumno, 
      _tipoAula: tipoAula 
    };
  };

  const instCounts = {};

  // 1. Procesar Agenda
  clasesActivas.forEach(c => {
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

  // 2. Procesar Ingresos Manuales
  ingresosMes.forEach(i => {
    const n = i.instructor?.trim() || i.asignadoA?.trim(); // Toma el instructor o a quien se le asignó
    if (!n || n.toUpperCase() === 'NINGUNO' || n.toUpperCase() === 'SIN ESPECIFICAR') return;

    const { _alumno, _tipoAula } = parsearIngresoManual(i);

    // Detección inteligente para evitar duplicados en la visual
    const yaVinculado = clasesActivas.some(c => {
      // 1. Vínculo duro (conectados por base de datos)
      const vinculoDuro = String(c.ingresoId) === String(i.id) || 
                          (i.agendaIds && i.agendaIds.toString().split(',').map(x=>x.trim()).includes(String(c.id)));
      
      // 2. Vínculo heurístico (coincidencia lógica en pantalla)
      const mismoDia = String(c.fecha) === String(i.fecha);
      const mismoInst = normName(c.nombreInstructor) === normName(n);
      
      // Chequeamos que alguno de los nombres contenga al otro para evitar problemas de tipeo
      const nombreParecido = _alumno && c.alumno && (
        _alumno.toLowerCase().includes(c.alumno.toLowerCase()) || 
        c.alumno.toLowerCase().includes(_alumno.toLowerCase())
      );

      return vinculoDuro || (mismoDia && mismoInst && nombreParecido);
    });

    if (!yaVinculado) {
      const texto = `${i.actividad || ''} ${i.detalles || ''}`;
      if (esClase(texto)) {
        const key = normName(n);
        if (!instCounts[key]) instCounts[key] = { nombre: n, clases: 0, horas: 0, registros: [] };
        
        const hrsCalc = calcularHorasReales(i);

        instCounts[key].clases += 1;
        instCounts[key].horas  += hrsCalc;
        instCounts[key].registros.push({ 
          ...i, 
          _tipo: 'INGRESO_MANUAL', 
          _horasReales: hrsCalc,
          _alumno,
          _tipoAula
        });
      }
    }
  });

  return (
    <div style={{ background:'rgba(255,255,255,.07)', borderRadius:14, border:`0.5px solid rgba(255,255,255,.1)`, overflow:'hidden', marginTop:14 }}>

      {/* Título */}
      <div style={{ padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}`, display:'flex', alignItems:'center', gap:8 }}>
        <i className="ti ti-chart-bar" style={{ fontSize:16, color:NA.dark }}/>
        <p style={{ margin:0, fontWeight:700, fontSize:14, color:'rgba(255,255,255,.9)' }}>
          Resumen {MESES_S[mes.m]} {mes.y}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', background:NA.border, gap:'0.5px' }}>
        {stats.map(({ l, v, c, icon }) => (
          <div key={l} style={{ padding:'14px 10px', background:'rgba(255,255,255,.07)', textAlign:'center' }}>
            <i className={`ti ${icon}`} style={{ fontSize:18, color:c, display:'block', marginBottom:4 }}/>
            <p style={{ margin:0, fontSize:22, fontWeight:800, color:c, lineHeight:1 }}>{v}</p>
            <p style={{ margin:'4px 0 0', fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Movimientos */}
      {Object.keys(totIngresos).length > 0 && (
        <div style={{ padding:'14px 18px', borderTop:`0.5px solid ${NA.border}` }}>
          <p style={{ margin:'0 0 10px', fontSize:10, color:'rgba(255,255,255,.5)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>
            Movimientos del mes
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[...new Set([...Object.keys(totIngresos), ...Object.keys(totEgresos)])].map(m => {
              const entra  = totIngresos[m] || 0;
              const sale   = totEgresos[m]  || 0;
              const neto   = entra - sale;
              const simbol = simbolo(m);
              return (
                <div key={m} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,.04)', borderRadius:10, padding:'10px 14px' }}>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,.5)', fontWeight:500 }}>{m}</span>
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

      {/* Botones de Instructores */}
      {Object.keys(instCounts).length > 0 && (
        <div style={{ padding:'14px 18px', borderTop:`0.5px solid ${NA.border}` }}>
          <p style={{ margin:'0 0 10px', fontSize:10, color:'rgba(255,255,255,.5)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>
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
                    background: 'rgba(46,207,196,.15)', color:'rgba(255,255,255,.9)', border:`1px solid rgba(255,255,255,.1)`,
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

      {/* Alertas */}
      {alertasMes.length > 0 && (
        <div style={{ padding:'12px 18px', borderTop:`0.5px solid ${NA.border}`, background:'rgba(234,88,12,.15)', display:'flex', alignItems:'center', gap:8 }}>
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

// ── COMPONENTE MODAL (Con renderizado unificado para clases/ingresos) ──
const ModalDetalleInstructor = ({ inst, onClose }) => {
  const registrosOrdenados = inst.registros.sort((a, b) => (a.fecha > b.fecha ? 1 : -1));

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(8,80,65,.45)', backdropFilter:'blur(4px)', 
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:16
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'rgba(255,255,255,.07)', borderRadius:20, width:'100%', maxWidth: 440, maxHeight:'85vh', 
        display:'flex', flexDirection:'column', overflow:'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        
        {/* Header del Modal */}
        <div style={{ padding:'18px 20px', borderBottom:`1px solid ${NA.border}`, background:'rgba(255,255,255,.04)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'rgba(255,255,255,.9)', textTransform:'capitalize' }}>{inst.nombre}</h2>
            <div style={{ display:'flex', gap: 12, marginTop: 6 }}>
              <span style={{ fontSize:13, fontWeight:600, color: NA.dark }}>
                <i className="ti ti-calendar" style={{ marginRight:4 }}/> {inst.clases} Clases
              </span>
              <span style={{ fontSize:13, fontWeight:600, color: NA.dark }}>
                <i className="ti ti-clock" style={{ marginRight:4 }}/> {inst.horas} Horas
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ 
            width:30, height:30, borderRadius:10, border:'none', background:'#e5e7eb', color:'#4b5563', cursor:'pointer' 
          }}>
            <i className="ti ti-x" style={{ fontSize:16 }}/>
          </button>
        </div>

        {/* Lista de Registros FUSIONADA */}
        <div style={{ padding:'16px 20px', overflowY:'auto', flex: 1, display:'flex', flexDirection:'column', gap: 10 }}>
          {registrosOrdenados.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, textAlign:'center' }}>No hay registros.</p>
          ) : (
            registrosOrdenados.map((r, i) => {
              const esAgenda = r._tipo === 'AGENDA';
              const alumno = esAgenda ? r.alumno : r._alumno;
              const tipoAula = esAgenda ? (r.tipoAula || 'Sin tipo') : r._tipoAula;
              const bgCard = esAgenda ? '#fff' : '#F0FDF4'; // Las manuales ahora se ven verdes suaves, muy orgánicas
              const borderColor = esAgenda ? NA.border : '#BBF7D0';

              return (
                <div key={i} style={{
                  padding:'14px', borderRadius: 14, background: bgCard,
                  border: `1px solid ${borderColor}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  {/* Fila superior: Fecha y Badge del Origen */}
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6, alignItems:'center' }}>
                    <span style={{ fontSize: 12, fontWeight:700, color: 'rgba(255,255,255,.9)' }}>{r.fecha}</span>
                    <span style={{ fontSize: 10, fontWeight:700, textTransform:'uppercase', color: esAgenda ? NA.text2 : '#059669', background: esAgenda ? NA.bg : '#D1FAE5', padding:'3px 8px', borderRadius:6 }}>
                      {esAgenda ? 'Agenda' : 'Ingreso Auto-Detectado'}
                    </span>
                  </div>
                  
                  {/* Fila del Medio: Alumno y Siglas */}
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight:800, color:'rgba(255,255,255,.9)' }}>
                      {alumno}
                    </span>
                    <Tag label={tipoAula} color={NA.darker} bg={NA.light} small />
                  </div>

                  {/* Fila inferior: Data Dura (Horas, Cobro, etc) */}
                  <div style={{ display:'flex', gap: 12, fontSize:12, color: 'rgba(255,255,255,.9)', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontWeight: 700, color: NA.dark, background: 'rgba(46,207,196,.15)', padding:'2px 6px', borderRadius:4 }}>
                      <i className="ti ti-clock"/> {r._horasReales}h
                    </span>
                    
                    {esAgenda ? (
                      <>
                        <span><i className="ti ti-map-pin"/> {r.lugar || '-'}</span>
                        <span style={{ color: r.cobrada ? '#059669' : '#DC2626', fontWeight:600 }}>
                          <i className={`ti ${r.cobrada ? 'ti-check' : 'ti-alert-circle'}`}/> {r.cobrada ? 'Cobrada' : 'Pendiente'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#059669', fontWeight:600 }}>
                          <i className="ti ti-cash"/> Monto: R$ {parseFloat(r.total||0).toFixed(2)}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,.5)', fontSize:11, fontStyle:'italic' }}>#{r.id}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
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