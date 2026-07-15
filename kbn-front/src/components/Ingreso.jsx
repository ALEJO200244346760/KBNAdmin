import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

const sx = {
  label: { fontSize: 11, color: NA.text2, display: 'block', marginBottom: 5, fontWeight: 500 },
  input: {
    width: '100%', padding: '13px 14px', borderRadius: 12,
    border: `0.5px solid ${NA.border}`, background: '#fff',
    color: NA.text, fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box',
    outline: 'none',
  },
};

const focusOn  = (e) => { e.target.style.borderColor = NA.primary; e.target.style.boxShadow = `0 0 0 3px ${NA.light}`; };
const focusOff = (e) => { e.target.style.borderColor = NA.border;  e.target.style.boxShadow = 'none'; };

// ── Tarifas de la foto ──────────────────────────────────────────────────────
// precio/h según modalidad + deporte + duración (1h vs paquete ≥6h)
const TARIFAS = {
  APK:   { label: 'Aula Privada Kite',        codigo: 'APK',   tarifa1h: 400, tarifa6h: 350, instructorFijo: null },
  ASPK:  { label: 'Aula Semiprivada Kite',    codigo: 'ASPK',  tarifa1h: 530, tarifa6h: 460, instructorFijo: 150 },
  APWF:  { label: 'Aula Privada Wingfoil',    codigo: 'APWF',  tarifa1h: 420, tarifa6h: 370, instructorFijo: null },
  ASPWF: { label: 'Aula Semiprivada Wingfoil',codigo: 'ASPWF', tarifa1h: 550, tarifa6h: 480, instructorFijo: 150 },
  APWS:  { label: 'Aula Privada Windsurf',    codigo: 'APWS',  tarifa1h: 370, tarifa6h: 330, instructorFijo: null },
  ASPWS: { label: 'Aula Semiprivada Windsurf',codigo: 'ASPWS', tarifa1h: 500, tarifa6h: 440, instructorFijo: 150 },
};

const RENTAL_PRECIOS = {
  KITE:    { label: 'Rental Kite',     hora: 360, dia: 830  },
  WINGFOIL:{ label: 'Rental Wingfoil', hora: 370, dia: 900  },
  WINDSURF:{ label: 'Rental Windsurf', hora: 330, dia: 820  },
};

const MONEDAS = [
  { value: 'R$_STONE_JOSE', label: 'R$ Stone José' },
  { value: 'R$_STONE_IGNA', label: 'R$ Stone Igna' },
  { value: 'R$_EFECTIVO',   label: 'R$ Efectivo'   },
  { value: 'USD_EFECTIVO',  label: 'USD Efectivo'  },
  { value: 'USD_MARIANA',   label: 'USD Mariana'   },
  { value: 'EUR_WIZE_IGNA', label: '€ Wize Igna'  },
  { divider: true },
  { value: 'BRL', label: 'Reales (BRL)'   },
  { value: 'USD', label: 'Dólares (USD)'  },
  { value: 'EUR', label: 'Euros (EUR)'    },
  { value: 'ARS', label: 'Pesos (ARS)'   },
];

const FORMAS_PAGO = [
  { value: 'Efectivo',        label: 'Efectivo',         desc: 'Sin cargo extra'  },
  { value: 'Transferencia',   label: 'Transferencia',    desc: 'Sin cargo extra'  },
  { value: 'MercadoPago',     label: 'Mercado Pago',     desc: 'Sin cargo extra'  },
  { value: 'Tarjeta Credito', label: 'Tarjeta Crédito',  desc: '-5% del banco'   },
];

const TARIFA_PREFIX = '__tarifa__:';
const decodeTarifa = (raw) => {
  if (!raw || !raw.startsWith(TARIFA_PREFIX)) return { tarifaHora: null, esInstructor: false };
  const sin = raw.slice(TARIFA_PREFIX.length);
  const sep = sin.indexOf('||');
  return { tarifaHora: parseFloat(sin.slice(0, sep)), esInstructor: true };
};

// ── Chip de botón reutilizable ───────────────────────────────────────────────
const Chip = ({ label, sub, active, onClick, accent = NA.dark }) => (
  <button
    type="button" onClick={onClick}
    style={{
      padding: '12px 10px', borderRadius: 14, border: `1.5px solid ${active ? accent : NA.border}`,
      background: active ? accent : '#fff', color: active ? '#fff' : NA.text,
      cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}
  >
    <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    {sub && <span style={{ fontSize: 10, opacity: active ? .85 : .55 }}>{sub}</span>}
  </button>
);

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <p style={{ fontSize: 10, color: NA.text2, textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 10px', fontWeight: 600 }}>{title}</p>
    {children}
  </div>
);

// ── Componente principal ─────────────────────────────────────────────────────
const Ingreso = ({ formData, handleChange, handleSubmit: originalHandleSubmit, InstructorField, setView, axiosConfig }) => {

  // ── Pasos del wizard ──
  // 0 = tipo de clase  |  1 = detalles + pago  |  2 = confirmación
  const [paso, setPaso]           = useState(0);
  const [guardando, setGuardando] = useState(false);
  const enviandoRef               = useRef(false);

  // ── Selecciones del paso 0 ──
  const [tipoBase, setTipoBase]   = useState(null); // 'AULA' | 'RENTAL' | 'OTRO'
  const [codigoAula, setCodigoAula] = useState(null); // 'APK' | 'ASPK' | etc.
  const [rentalTipo, setRentalTipo] = useState(null); // 'KITE' | 'WINGFOIL' | 'WINDSURF'
  const [rentalPeriodo, setRentalPeriodo] = useState(null); // 'HORA' | 'DIA'

  // ── Datos del paso 1 ──
  const today = new Date().toISOString().split('T')[0];
  const [fecha,      setFecha]      = useState(formData.fecha || today);
  const [horas,      setHoras]      = useState('');
  const [precioUnitario, setPrecioUnitario] = useState(''); // precio/h o precio/día editable
  const [moneda,     setMoneda]     = useState(formData.moneda || 'R$_STONE_IGNA');
  const [formaPago,  setFormaPago]  = useState('Efectivo');
  const [detalles,   setDetalles]   = useState('');
  const [vendedor,   setVendedor]   = useState('');
  const [gastos,     setGastos]     = useState('');
  const [nombreAlumno, setNombreAlumno] = useState('');
  const [instructor, setInstructor] = useState('');

  // ── Pasivos para vínculo de cuenta corriente ──
  const [pasivos, setPasivos] = useState([]);

  useEffect(() => {
    if (!axiosConfig) return;
    axios.get('https://kbn-admin-production.up.railway.app/api/pasivos', axiosConfig)
      .then(r => setPasivos(r.data))
      .catch(console.error);
  }, [axiosConfig]);

  // ── Cálculos derivados ──────────────────────────────────────────────────────
  const aula   = codigoAula ? TARIFAS[codigoAula] : null;
  const rental = rentalTipo ? RENTAL_PRECIOS[rentalTipo] : null;

  // Cuando cambia el código de aula o rental, sugiere el precio por defecto
  useEffect(() => {
    if (aula) {
      // Si ya hay horas cargadas y son ≥6, usar tarifa6h; si no, tarifa1h
      const h = parseFloat(horas) || 1;
      setPrecioUnitario(String(h >= 6 ? aula.tarifa6h : aula.tarifa1h));
    }
  }, [codigoAula]);

  useEffect(() => {
    if (rental && rentalPeriodo) {
      setPrecioUnitario(String(rentalPeriodo === 'DIA' ? rental.dia : rental.hora));
    }
  }, [rentalTipo, rentalPeriodo]);

  // Cuando cambian horas, ajustar precio sugerido de aula
  useEffect(() => {
    if (!aula) return;
    const h = parseFloat(horas) || 0;
    if (h >= 6) setPrecioUnitario(String(aula.tarifa6h));
    else if (h > 0) setPrecioUnitario(String(aula.tarifa1h));
  }, [horas]);

  const horasNum  = parseFloat(horas)  || 0;
  const precioNum = parseFloat(precioUnitario) || 0;
  const gastosNum = parseFloat(gastos) || 0;

  const esRentalDia   = tipoBase === 'RENTAL' && rentalPeriodo === 'DIA';
  const subtotal      = esRentalDia ? precioNum : horasNum * precioNum;
  const descuentoTarj = formaPago === 'Tarjeta Credito' ? subtotal * 0.05 : 0;
  const totalFinal = subtotal - descuentoTarj - gastosNum;

  // ── Cuenta corriente vinculada ──────────────────────────────────────────────
  const pasivoInstructor = pasivos.find(p => {
    const { esInstructor } = decodeTarifa(p.descripcion);
    if (!esInstructor) return false;
    const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    return norm(p.titulo) === norm(instructor);
  });

  // Para semiprivadas el instructor cobra 150 R$/h fijo, no su tarifa de pasivo
  const esSemiprivada = aula && aula.instructorFijo !== null;
  const tarifaInstructorEfectiva = esSemiprivada
    ? aula.instructorFijo
    : pasivoInstructor ? decodeTarifa(pasivoInstructor.descripcion).tarifaHora : null;

  const deudaInstructor = tarifaInstructorEfectiva && horasNum > 0
    ? Math.round(tarifaInstructorEfectiva * horasNum * 100) / 100
    : 0;

  // ── Etiqueta de actividad para guardar ─────────────────────────────────────
  const actividadLabel = () => {
    if (tipoBase === 'AULA' && aula)   return aula.label;
    if (tipoBase === 'RENTAL' && rental) return rental.label;
    return detalles || 'Otro';
  };

  // ── Validación antes de confirmar ──────────────────────────────────────────
  const puedeConfirmar = () => {
    if (!fecha) return false;
    if (tipoBase === 'AULA' && !codigoAula) return false;
    if (tipoBase === 'RENTAL' && (!rentalTipo || !rentalPeriodo)) return false;
    if (!esRentalDia && horasNum <= 0) return false;
    if (precioNum <= 0) return false;
    return true;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);

    try {
      // Construimos el payload manualmente para tener control total
      const payload = {
        tipoTransaccion: 'INGRESO',
        fecha,
        actividad: actividadLabel(),
        detalles: [nombreAlumno, detalles].filter(Boolean).join(' · '),
        vendedor,
        instructor,
        cantidadHoras: esRentalDia ? null : String(horasNum),
        tarifaPorHora: String(precioNum),
        total: String(totalFinal),
        gastosAsociados: String(gastosNum),
        comision: String(descuentoTarj),
        moneda,
        formaPago,
        detalleFormaPago: formaPago === 'Tarjeta Credito' ? '-5% banco' : null,
      };

      await axios.post(
        'https://kbn-admin-production.up.railway.app/api/clases/guardar',
        payload,
        axiosConfig
      );

      // Acumular deuda del instructor si corresponde
      if (deudaInstructor > 0 && axiosConfig) {
        const pasivoTarget = esSemiprivada
          ? pasivos.find(p => { const n = (s) => s.toLowerCase().replace(/\s+/g,' ').trim(); return n(p.titulo) === n(instructor); })
          : pasivoInstructor;

        if (pasivoTarget) {
          const nota = `${actividadLabel()} · ${horasNum}h × ${tarifaInstructorEfectiva} BRL/h = ${deudaInstructor.toFixed(2)} BRL${nombreAlumno ? ` (${nombreAlumno})` : ''} — ${fecha}`;
          await axios.put(
            `https://kbn-admin-production.up.railway.app/api/pasivos/${pasivoTarget.id}/acumular`,
            { monto: -deudaInstructor, nota, fecha },
            axiosConfig
          );
        }
      }

      setView();
    } catch (err) {
      console.error('Error guardando ingreso:', err);
      alert('No se pudo guardar el ingreso. Revisá la conexión y probá de nuevo.');
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 80px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes kbn-spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, padding: '0 2px' }}>
        <button
          type="button"
          onClick={() => paso === 0 ? setView() : setPaso(p => p - 1)}
          style={{ width: 38, height: 38, borderRadius: 11, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 18 }} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: NA.text, margin: 0 }}>Nuevo ingreso</h1>
          <p style={{ fontSize: 11, color: NA.text2, margin: '2px 0 0' }}>
            {paso === 0 ? 'Paso 1 — ¿Qué fue?' : paso === 1 ? 'Paso 2 — Detalles y pago' : 'Paso 3 — Confirmar'}
          </p>
        </div>
        {/* Indicador de pasos */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: i === paso ? 22 : 8, height: 8, borderRadius: 99, background: i <= paso ? NA.dark : NA.border, transition: 'all .2s' }} />
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          PASO 0 — Tipo de clase
          ════════════════════════════════════════════════════════ */}
      {paso === 0 && (
        <div>
          {/* Selector de tipo base */}
          <Section title="Tipo de actividad">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <Chip label="🪁 Aula"   active={tipoBase === 'AULA'}   onClick={() => { setTipoBase('AULA');   setCodigoAula(null); setRentalTipo(null); }} />
              <Chip label="🏄 Rental" active={tipoBase === 'RENTAL'} onClick={() => { setTipoBase('RENTAL'); setCodigoAula(null); }} />
              <Chip label="✏️ Otro"   active={tipoBase === 'OTRO'}   onClick={() => { setTipoBase('OTRO');   setCodigoAula(null); setRentalTipo(null); }} />
            </div>
          </Section>

          {/* Sub-opciones de aula */}
          {tipoBase === 'AULA' && (
            <>
              <Section title="Deporte">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {[
                    { k: 'kite',     label: '🪁 Kite'     },
                    { k: 'wingfoil', label: '🦅 Wingfoil' },
                    { k: 'windsurf', label: '🌊 Windsurf' },
                  ].map(({ k, label }) => {
                    const deporteActivo = codigoAula && codigoAula.toLowerCase().includes(k === 'kite' ? 'k' : k === 'wingfoil' ? 'wf' : 'ws');
                    return <Chip key={k} label={label} active={deporteActivo} onClick={() => {}} />;
                  })}
                </div>
              </Section>

              <Section title="Modalidad">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
                  {/* Privadas */}
                  {[
                    { codigo: 'APK',   emoji: '🪁', sport: 'Kite',     tipo: 'Privada',    p1h: 400, p6h: 350 },
                    { codigo: 'ASPK',  emoji: '🪁', sport: 'Kite',     tipo: 'Semiprivada',p1h: 530, p6h: 460 },                    
                    { codigo: 'APWF',  emoji: '🦅', sport: 'Wingfoil', tipo: 'Privada',    p1h: 420, p6h: 370 },
                    { codigo: 'ASPWF', emoji: '🦅', sport: 'Wingfoil', tipo: 'Semiprivada',p1h: 550, p6h: 480 },
                    { codigo: 'APWS',  emoji: '🌊', sport: 'Windsurf', tipo: 'Privada',    p1h: 370, p6h: 330 },
                    { codigo: 'ASPWS', emoji: '🌊', sport: 'Windsurf', tipo: 'Semiprivada',p1h: 500, p6h: 440 },
                  ].map(({ codigo, emoji, sport, tipo, p1h, p6h }) => (
                    <Chip
                      key={codigo}
                      label={`${emoji} ${sport} — ${tipo}`}
                      sub={`${p1h} R$/h · 6h=${p6h}/h`}
                      active={codigoAula === codigo}
                      onClick={() => setCodigoAula(codigo)}
                    />
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* Sub-opciones de rental */}
          {tipoBase === 'RENTAL' && (
            <>
              <Section title="Equipo">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {Object.entries(RENTAL_PRECIOS).map(([k, v]) => (
                    <Chip key={k} label={v.label.replace('Rental ','')} active={rentalTipo === k} onClick={() => setRentalTipo(k)} />
                  ))}
                </div>
              </Section>
              {rentalTipo && (
                <Section title="Período">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Chip label="Por hora" sub={`R$ ${RENTAL_PRECIOS[rentalTipo].hora}/h`} active={rentalPeriodo === 'HORA'} onClick={() => setRentalPeriodo('HORA')} />
                    <Chip label="Diario"   sub={`R$ ${RENTAL_PRECIOS[rentalTipo].dia}/día`} active={rentalPeriodo === 'DIA'}  onClick={() => setRentalPeriodo('DIA')}  />
                  </div>
                </Section>
              )}
            </>
          )}

          {tipoBase === 'OTRO' && (
            <Section title="Descripción">
              <input
                type="text" placeholder="Ej: Curso teórico, downwind..." value={detalles}
                onChange={e => setDetalles(e.target.value)}
                style={{ ...sx.input }} onFocus={focusOn} onBlur={focusOff}
              />
            </Section>
          )}

          <button
            type="button"
            disabled={
              !tipoBase ||
              (tipoBase === 'AULA' && !codigoAula) ||
              (tipoBase === 'RENTAL' && (!rentalTipo || !rentalPeriodo))
            }
            onClick={() => setPaso(1)}
            style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none',
              background: (
                !tipoBase ||
                (tipoBase === 'AULA' && !codigoAula) ||
                (tipoBase === 'RENTAL' && (!rentalTipo || !rentalPeriodo))
              ) ? NA.border : NA.dark,
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 10,
            }}
          >
            Continuar →
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          PASO 1 — Detalles y pago
          ════════════════════════════════════════════════════════ */}
      {paso === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); if (puedeConfirmar()) setPaso(2); }}>

          {/* ── Fecha ── */}
          <Section title="Fecha">
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              style={{
                ...sx.input,
                minWidth: 0,
                fontSize: window.innerWidth < 480 ? 14 : 15,
              }}
              onFocus={focusOn}
              onBlur={focusOff}
              required
            />
          </Section>

          {/* ── Alumno / Instructor ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <p style={sx.label}>Nombre alumno</p>
              <input type="text" placeholder="Juan..." value={nombreAlumno} onChange={e => setNombreAlumno(e.target.value)}
                style={sx.input} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <p style={sx.label}>Instructor</p>
              <div onChange={e => { if (e.target.tagName === 'SELECT') setInstructor(e.target.value); }}>
                <InstructorField />
              </div>
            </div>
          </div>

          {/* ── Horas + precio editable ── */}
          <div style={{ background: NA.darker, borderRadius: 16, padding: 18, marginBottom: 18 }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 14px', fontWeight: 600 }}>
              {aula ? aula.label : rental ? rental.label : 'Monto'}
            </p>

            {!esRentalDia && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ ...sx.label, color: 'rgba(255,255,255,.6)' }}>Horas</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[0.5, 1, 1.5, 2, 3, 4, 5, 6].map(h => (
                    <button key={h} type="button" onClick={() => setHoras(String(h))}
                      style={{
                        flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none',
                        background: parseFloat(horas) === h ? NA.primary : 'rgba(255,255,255,.12)',
                        color: parseFloat(horas) === h ? NA.darker : 'rgba(255,255,255,.7)',
                        fontWeight: 600, fontSize: 12, cursor: 'pointer',
                      }}>
                      {h}
                    </button>
                  ))}
                </div>
                <input type="number" step="0.5" placeholder="Otra cantidad..." value={horas}
                  onChange={e => setHoras(e.target.value)}
                  style={{ ...sx.input, marginTop: 8, background: 'rgba(255,255,255,.1)', border: '0.5px solid rgba(255,255,255,.2)', color: '#fff', fontSize: 13 }}
                  onFocus={focusOn} onBlur={focusOff}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <p style={{ ...sx.label, color: 'rgba(255,255,255,.6)' }}>
                  {esRentalDia ? 'Precio/día' : 'Precio/hora'} (editable)
                </p>
                <input type="number" step="0.01" value={precioUnitario} onChange={e => setPrecioUnitario(e.target.value)}
                  style={{ ...sx.input, background: 'rgba(255,255,255,.1)', border: '0.5px solid rgba(255,255,255,.2)', color: '#fff', fontSize: 16, fontWeight: 600 }}
                  onFocus={focusOn} onBlur={focusOff}
                />
              </div>
              <div>
                <p style={{ ...sx.label, color: 'rgba(255,255,255,.6)' }}>Subtotal</p>
                <div style={{ padding: '13px 14px', borderRadius: 12, background: NA.primary, color: NA.darker, fontSize: 20, fontWeight: 700, textAlign: 'center' }}>
                  {subtotal.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Canal de cobro ── */}
          <Section title="Canal de cobro">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {MONEDAS.filter(m => !m.divider).map(m => (
                <Chip key={m.value} label={m.label} active={moneda === m.value}
                  onClick={() => setMoneda(m.value)} accent={NA.dark} />
              ))}
            </div>
          </Section>

          {/* ── Forma de pago ── */}
          <Section title="Forma de pago">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {FORMAS_PAGO.map(f => (
                <Chip key={f.value} label={f.label} sub={f.desc}
                  active={formaPago === f.value}
                  onClick={() => setFormaPago(f.value)}
                  accent={f.value === 'Tarjeta Credito' ? '#B91C1C' : NA.dark}
                />
              ))}
            </div>
            {formaPago === 'Tarjeta Credito' && (
              <div style={{ background: '#FEF2F2', color: '#B91C1C', fontSize: 12, padding: '10px 14px', borderRadius: 10, marginTop: 10 }}>
                Se descuenta el 5% del banco: -{descuentoTarj.toFixed(2)} R$
              </div>
            )}
          </Section>

          {/* ── Gastos y vendedor ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <p style={sx.label}>Gastos (no restan)</p>
              <input type="number" step="0.01" placeholder="0" value={gastos} onChange={e => setGastos(e.target.value)}
                style={sx.input} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <p style={sx.label}>Vendedor (opcional)</p>
              <input type="text" placeholder="Nombre..." value={vendedor} onChange={e => setVendedor(e.target.value)}
                style={sx.input} onFocus={focusOn} onBlur={focusOff} />
            </div>
          </div>

          {/* ── Detalles adicionales ── */}
          <Section title="Detalles adicionales (opcional)">
            <textarea rows={2} placeholder="Ej: alumno con experiencia previa..."
              value={detalles} onChange={e => setDetalles(e.target.value)}
              style={{ ...sx.input, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              onFocus={focusOn} onBlur={focusOff}
            />
          </Section>

          <button type="submit" disabled={!puedeConfirmar()}
            style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none',
              background: puedeConfirmar() ? NA.dark : NA.border,
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: puedeConfirmar() ? 'pointer' : 'default',
            }}>
            Ver resumen →
          </button>
        </form>
      )}

      {/* ════════════════════════════════════════════════════════
          PASO 2 — Confirmación
          ════════════════════════════════════════════════════════ */}
      {paso === 2 && (
        <form onSubmit={handleSubmit}>
          {/* ── Resumen en card ── */}
          <div style={{ background: '#fff', borderRadius: 18, border: `0.5px solid ${NA.border}`, overflow: 'hidden', marginBottom: 16 }}>

            {/* Header del resumen */}
            <div style={{ background: NA.darker, padding: '16px 20px' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 4px' }}>Actividad</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{actividadLabel()}</p>
              {nombreAlumno && <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', margin: '4px 0 0' }}>{nombreAlumno}</p>}
            </div>

            {/* Filas de datos */}
            {[
              { label: 'Fecha',         value: fecha },
              { label: 'Instructor',    value: instructor || '—' },
              { label: 'Canal de cobro',value: MONEDAS.find(m => m.value === moneda)?.label || moneda },
              { label: 'Forma de pago', value: formaPago },
              !esRentalDia && { label: 'Horas',          value: `${horasNum}h` },
              { label: 'Precio',        value: `R$ ${precioUnitario}/h${esRentalDia ? 'día' : ''}` },
              subtotal !== totalFinal && { label: 'Descuento tarjeta', value: `-R$ ${descuentoTarj.toFixed(2)}` },
              gastosNum > 0 && { label: 'Gastos (aparte)',  value: `R$ ${gastosNum.toFixed(2)}` },
              vendedor && { label: 'Vendedor', value: vendedor },
              detalles && { label: 'Detalles', value: detalles },
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 20px', borderBottom: `0.5px solid ${NA.border}` }}>
                <span style={{ fontSize: 13, color: NA.text2 }}>{label}</span>
                <span style={{ fontSize: 13, color: NA.text, fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
              </div>
            ))}

            {/* Total grande */}
            <div style={{ padding: '18px 20px', background: NA.light, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: NA.darker, fontWeight: 600 }}>TOTAL A COBRAR</span>
              <span style={{ fontSize: 26, color: NA.darker, fontWeight: 800 }}>R$ {totalFinal.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Vínculo con cuenta corriente del instructor ── */}
          {deudaInstructor > 0 && (
            <div style={{ background: NA.light, borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <i className="ti ti-link" style={{ fontSize: 18, color: NA.dark, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: NA.darker, margin: '0 0 2px' }}>
                  Cuenta corriente de {instructor}
                </p>
                <p style={{ fontSize: 12, color: NA.text2, margin: 0 }}>
                  Se acumularán <strong>R$ {deudaInstructor.toFixed(2)}</strong> ({horasNum}h × {tarifaInstructorEfectiva} BRL/h
                  {esSemiprivada ? ' — tarifa semiprivada fija' : ''})
                </p>
              </div>
            </div>
          )}

          {/* ── Botones ── */}
          <button type="submit" disabled={guardando}
            style={{
              width: '100%', padding: '17px', borderRadius: 14, border: 'none',
              background: guardando ? NA.mid : NA.dark, color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: guardando ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
            {guardando ? (
              <><i className="ti ti-loader-2" style={{ fontSize: 19, animation: 'kbn-spin .7s linear infinite' }} /> Guardando...</>
            ) : (
              <><i className="ti ti-check" style={{ fontSize: 19 }} /> Confirmar ingreso</>
            )}
          </button>

          <button type="button" onClick={() => setPaso(1)}
            style={{ width: '100%', padding: '13px', borderRadius: 14, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 10 }}>
            ← Volver a editar
          </button>
        </form>
      )}
    </div>
  );
};

export default Ingreso;