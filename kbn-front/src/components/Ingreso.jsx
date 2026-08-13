import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { usePresencia } from '../hooks/usePresencia';

// ── Reparto de dueños ─────────────────────────────────────────────────────────
// Porcentajes según quién está presente (mismo que ReporteEstadisticas)
const HANS_PCT = 5;
const PASIVO_TITULOS = {
  JOSE: 'José Sánchez',
  IGNA: 'Igna Krebs',
  HANS: 'Hans Leonhard Wurbs',
};

const calcularReparto = (asignadoA, montoBase) => {
  let pIgna = 8, pJose = 8;
  if      (asignadoA === 'IGNA')  { pIgna = 16; pJose = 8;    }
  else if (asignadoA === 'JOSE')  { pIgna = 8;  pJose = 16;   }
  else if (asignadoA === 'AMBOS') { pIgna = 12.5; pJose = 12.5; }
  else                            { pIgna = 10; pJose = 10;   }
  const pHans = HANS_PCT;
  return {
    pIgna, pJose, pHans,
    mIgna: Math.round((montoBase * pIgna / 100) * 100) / 100,
    mJose: Math.round((montoBase * pJose / 100) * 100) / 100,
    mHans: Math.round((montoBase * pHans / 100) * 100) / 100,
  };
};

const labelMon = (m) => {
  if (!m) return 'R$';
  if (m === 'BRL' || m.startsWith('R$_')) return 'R$';
  if (m.startsWith('EUR')) return '€';
  if (m.startsWith('USD')) return 'US$';
  return m;
};

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

  // ── Presencia del día (reemplaza campo manual de instructor) ────────────────
  const { asignadoAuto, opcionActual } = usePresencia();

  // ── Pasos del wizard ──
  // 0 = tipo de clase  |  1 = detalles + pago  |  2 = confirmación
  const [paso, setPaso]           = useState(0);
  const [guardando, setGuardando] = useState(false);
  const enviandoRef               = useRef(false);

  // ── Selecciones del paso 0 ──
  const [tipoBase, setTipoBase]   = useState(null);
  const [codigoAula, setCodigoAula] = useState(null);
  const [rentalTipo, setRentalTipo] = useState(null);
  const [rentalPeriodo, setRentalPeriodo] = useState(null);

  // ── Datos del paso 1 ──
  const today = new Date().toISOString().split('T')[0];
  const [fecha,          setFecha]          = useState(formData.fecha || today);
  const [horas,          setHoras]          = useState('');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [moneda,         setMoneda]         = useState(formData.moneda || 'R$_STONE_IGNA');
  const [formaPago,      setFormaPago]      = useState('Efectivo');
  const [detalles,       setDetalles]       = useState('');
  const [vendedor,       setVendedor]       = useState('');
  const [gastos,         setGastos]         = useState('');
  const [nombreAlumno,   setNombreAlumno]   = useState('');

  // ── Pasivos de los DUEÑOS (para acumular reparto) ────────────────────────
  // José, Igna y Hans tienen cada uno su tarjeta de pasivo.
  // Al guardar un ingreso se les acumula su % automáticamente.
  const [pasivos, setPasivos] = useState([]);

  // ── Clases de agenda del día (para marcar como cobradas) ──────────────────
  const [clasesDelDia,        setClasesDelDia]        = useState([]);
  const [clasesSeleccionadas, setClasesSeleccionadas] = useState([]);

  useEffect(() => {
    if (!axiosConfig) return;
    axios.get('https://kbn-admin-production.up.railway.app/api/pasivos', axiosConfig)
      .then(r => setPasivos(r.data))
      .catch(console.error);
  }, [axiosConfig]);

  // Fetch clases de la fecha seleccionada
  useEffect(() => {
    if (!axiosConfig || !fecha) return;
    axios.get('https://kbn-admin-production.up.railway.app/api/agenda/listar', axiosConfig)
      .then(r => {
        const delDia = r.data.filter(a =>
          a.fecha?.toString() === fecha && a.estado !== 'RECHAZADA'
        );
        setClasesDelDia(delDia);
        setClasesSeleccionadas([]);
      })
      .catch(console.error);
  }, [fecha, axiosConfig]);

  const toggleClase = (id) =>
    setClasesSeleccionadas(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

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

  // ── Reparto de dueños ──────────────────────────────────────────────────────
  // Calculado sobre el totalFinal (después de descuentos)
  // Se acumula en los pasivos de José, Igna y Hans al confirmar.
  // Los pasivos de dueños se identifican por título exacto.
  const buscarPasivoDueno = (titulo) =>
    pasivos.find(p => p.titulo?.trim().toLowerCase() === titulo.trim().toLowerCase());

  // ── Etiqueta de actividad para guardar ─────────────────────────────────────
  const actividadLabel = () => {
    if (tipoBase === 'AULA'   && aula)   return aula.label;
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
        // El instructor ya no se pide manualmente — viene de la presencia del día
        instructor: opcionActual.label,
        // asignadoA se precarga desde la presencia (JOSE/IGNA/AMBOS/AUSENTES)
        asignadoA: asignadoAuto,
        cantidadHoras: esRentalDia ? null : String(horasNum),
        tarifaPorHora: String(precioNum),
        total: String(totalFinal),
        gastosAsociados: String(gastosNum),
        comision: String(descuentoTarj),
        moneda,
        formaPago,
        detalleFormaPago: formaPago === 'Tarjeta Credito' ? '-5% banco' : null,
        // IDs de clases de agenda que cubre este pago → backend las marca cobradas
        agendaIds: clasesSeleccionadas.length > 0 ? clasesSeleccionadas.join(',') : null,
      };

      const savedIngreso = await axios.post(
        'https://kbn-admin-production.up.railway.app/api/clases/guardar',
        payload,
        axiosConfig
      );

      // ── Acumular reparto en pasivos de dueños ──────────────────────────────
      // José, Igna y Hans reciben su % sobre el total según quién estuvo presente.
      if (totalFinal > 0 && axiosConfig && pasivos.length > 0) {
        const { pIgna, pJose, pHans, mIgna, mJose, mHans } =
          calcularReparto(asignadoAuto, totalFinal);

        const notaSufijo = `${actividadLabel()}${nombreAlumno ? ` (${nombreAlumno})` : ''} — ${fecha}`;
        const notaPct = ` | Reparto: IGNA ${pIgna}% ($${mIgna.toFixed(2)}) - JOSE ${pJose}% ($${mJose.toFixed(2)}) - HANS ${pHans}% ($${mHans.toFixed(2)})`;

        const acumular = async (titulo, monto) => {
          const pasivo = buscarPasivoDueno(titulo);
          if (!pasivo || monto <= 0) return;
          const nota = `${pIgna === pJose ? '12,5' : titulo === PASIVO_TITULOS.JOSE ? pJose : titulo === PASIVO_TITULOS.IGNA ? pIgna : pHans}% de ${notaSufijo}${notaPct}`;
          await axios.put(
            `https://kbn-admin-production.up.railway.app/api/pasivos/${pasivo.id}/acumular`,
            { monto: -monto, nota, fecha, moneda },
            axiosConfig
          );
        };

        await Promise.allSettled([
          acumular(PASIVO_TITULOS.JOSE, mJose),
          acumular(PASIVO_TITULOS.IGNA, mIgna),
          acumular(PASIVO_TITULOS.HANS, mHans),
        ]);
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
            <div style={{ width: '100%', overflow: 'hidden' }}>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                style={{
                  ...sx.input,
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                }}
                onFocus={focusOn}
                onBlur={focusOff}
                required
              />
            </div>
          </Section>

          {/* ── Selector de clases del día ── */}
          {clasesDelDia.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ ...sx.label, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                Clases de este día — ¿cuáles cubre este pago?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clasesDelDia.map(a => {
                  const sel     = clasesSeleccionadas.includes(a.id);
                  const cobrada = a.cobrada;
                  const col = a.tipoAula === 'APK'  ? { border:'#16A34A', bg:'#DCFCE7', text:'#14532D' }
                            : a.tipoAula === 'ASPK' ? { border:'#059669', bg:'#D1FAE5', text:'#064E3B' }
                            : a.tipoAula === 'APWF' ? { border:'#2563EB', bg:'#DBEAFE', text:'#1E3A8A' }
                            : a.tipoAula === 'ASPWF'? { border:'#7C3AED', bg:'#EDE9FE', text:'#4C1D95' }
                            : a.tipoAula === 'APWS' ? { border:'#CA8A04', bg:'#FEF9C3', text:'#713F12' }
                            : a.tipoAula === 'ASPWS'? { border:'#D97706', bg:'#FEF3C7', text:'#78350F' }
                            : { border: NA.dark, bg: NA.light, text: NA.darker };
                  return (
                    <button key={a.id} type="button"
                      onClick={() => !cobrada && toggleClase(a.id)}
                      style={{
                        padding: '11px 14px', borderRadius: 12, textAlign: 'left',
                        cursor: cobrada ? 'default' : 'pointer',
                        opacity: cobrada ? 0.5 : 1,
                        border: `1.5px solid ${sel ? col.border : cobrada ? '#D1FAE5' : NA.border}`,
                        background: sel ? col.bg : cobrada ? '#F0FDF4' : '#fff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                      }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: sel ? col.text : NA.text }}>
                            {a.alumno}
                          </span>
                          {a.tipoAula && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: col.bg, color: col.text, border: `1px solid ${col.border}30` }}>
                              {a.tipoAula}
                            </span>
                          )}
                          {cobrada && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: '#D1FAE5', color: '#065F46' }}>
                              ✓ Ya cobrada
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: NA.text2 }}>
                          {a.nombreInstructor}
                          {a.hora && ` · ${String(a.hora).substring(0,5)}`}
                          {a.horas && ` · ${a.horas}h`}
                          {a.tarifa && ` · R$ ${a.tarifa}/h`}
                        </span>
                      </div>
                      {/* Checkbox visual */}
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${sel ? col.border : NA.border}`,
                        background: sel ? col.border : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {sel     && <i className="ti ti-check" style={{ fontSize: 12, color: '#fff' }}/>}
                        {cobrada && <i className="ti ti-lock"  style={{ fontSize: 11, color: '#9ca3af' }}/>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {clasesSeleccionadas.length > 0 && (
                <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 10, background: NA.light, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-check-circle" style={{ fontSize: 16, color: NA.dark }}/>
                  <p style={{ margin: 0, fontSize: 12, color: NA.darker, fontWeight: 500 }}>
                    {clasesSeleccionadas.length} clase{clasesSeleccionadas.length > 1 ? 's' : ''} seleccionada{clasesSeleccionadas.length > 1 ? 's' : ''} — se marcarán como cobradas al guardar
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Alumno + Presencia del día ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <p style={sx.label}>Nombre alumno</p>
              <input type="text" placeholder="Juan..." value={nombreAlumno} onChange={e => setNombreAlumno(e.target.value)}
                style={sx.input} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <p style={sx.label}>Asignado a (presencia de hoy)</p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 13px', borderRadius: 10,
                border: `0.5px solid ${opcionActual.color}40`,
                background: opcionActual.bg,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: opcionActual.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 14, fontWeight: 600, color: opcionActual.color }}>
                  {opcionActual.short}
                </span>
                <span style={{ fontSize: 11, color: opcionActual.color, opacity: .7 }}>
                  {opcionActual.label}
                </span>
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
              { label: 'Fecha',          value: fecha },
              { label: 'Asignado a',     value: opcionActual.label },
              { label: 'Canal de cobro', value: MONEDAS.find(m => m.value === moneda)?.label || moneda },
              { label: 'Forma de pago',  value: formaPago },
              !esRentalDia && { label: 'Horas',  value: `${horasNum}h` },
              { label: 'Precio',         value: `R$ ${precioUnitario}/${esRentalDia ? 'día' : 'h'}` },
              subtotal !== totalFinal && { label: 'Descuento tarjeta', value: `-R$ ${descuentoTarj.toFixed(2)}` },
              gastosNum > 0 && { label: 'Gastos',   value: `R$ ${gastosNum.toFixed(2)}` },
              vendedor  &&     { label: 'Vendedor',  value: vendedor },
              detalles  &&     { label: 'Detalles',  value: detalles },
              clasesSeleccionadas.length > 0 && {
                label: `Clases (${clasesSeleccionadas.length})`,
                value: clasesDelDia
                  .filter(a => clasesSeleccionadas.includes(a.id))
                  .map(a => a.alumno)
                  .join(', '),
              },
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 20px', borderBottom: `0.5px solid ${NA.border}` }}>
                <span style={{ fontSize: 13, color: NA.text2 }}>{label}</span>
                <span style={{ fontSize: 13, color: label === 'Asignado a' ? opcionActual.color : NA.text, fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
              </div>
            ))}

            {/* Total grande */}
            <div style={{ padding: '18px 20px', background: NA.light, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: NA.darker, fontWeight: 600 }}>TOTAL A COBRAR</span>
              <span style={{ fontSize: 26, color: NA.darker, fontWeight: 800 }}>R$ {totalFinal.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Reparto de dueños ── */}
          {totalFinal > 0 && (() => {
            const { pIgna, pJose, pHans, mIgna, mJose, mHans } =
              calcularReparto(asignadoAuto, totalFinal);
            return (
              <div style={{ background: NA.light, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: NA.darker, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Reparto automático
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { nombre: 'Igna',  pct: pIgna, monto: mIgna },
                    { nombre: 'José',  pct: pJose, monto: mJose },
                    { nombre: 'Hans',  pct: pHans, monto: mHans },
                  ].map(({ nombre, pct, monto }) => (
                    <div key={nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: NA.text2 }}>
                        {nombre} <span style={{ fontSize: 11, opacity: .7 }}>({pct}%)</span>
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: NA.darker }}>
                        {labelMon(moneda)} {monto.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

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