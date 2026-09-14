// ── PasivosShared.jsx ───────────────────────────────────────────────────────
// Paleta, estilos, helpers y constantes compartidas por todos los
// sub-componentes de Pasivos. No renderiza nada por sí solo.

export const NA = {
  primary: '#1ABFA0',
  dark:    '#0F6E56',
  darker:  '#085041',
  light:   '#E1F5EE',
  mid:     '#9FE1CB',
  bg:      '#f0faf7',
  text:    '#0a2e27',
  text2:   '#3a6b5e',
  border:  '#c5e8df',
};

// ── Estilos reutilizables ───────────────────────────────────────────────────
// ── Tokens del tema oscuro ──────────────────────────────────────────────────
// Los mismos que usan las tarjetas y el resto de la app.
export const T = {
  superficie:  'rgba(255,255,255,.045)',
  superficie2: 'rgba(255,255,255,.07)',
  linea:       'rgba(255,255,255,.09)',
  texto:       'rgba(255,255,255,.92)',
  medio:       'rgba(255,255,255,.55)',
  tenue:       'rgba(255,255,255,.32)',
  deben:       '#F98A8A',
  favor:       '#2ECFC4',
  fondoModal:  '#11201E',
};

export const sx = {
  label: { fontSize: 11.5, color: T.tenue, display: 'block', marginBottom: 6 },
  input: {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: 'none', boxShadow: `inset 0 0 0 1px ${T.linea}`,
    background: 'rgba(255,255,255,.05)',
    color: T.texto, fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'box-shadow .15s',
  },
  field: { marginBottom: 16 },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(4,10,9,.7)', backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
  },
  modal: {
    background: T.fondoModal, borderRadius: 20, padding: 26, width: '100%', maxWidth: 440,
    maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box',
    boxShadow: `0 0 0 1px ${T.linea}, 0 24px 60px rgba(0,0,0,.5)`,
    color: T.texto,
  },
};

// ── Focus handlers ──────────────────────────────────────────────────────────
export const focusOn  = (e) => { e.target.style.boxShadow = `inset 0 0 0 1px ${T.favor}, 0 0 0 3px rgba(46,207,196,.15)`; };
export const focusOff = (e) => { e.target.style.boxShadow = `inset 0 0 0 1px ${T.linea}`; };

// ── Prefix para tarifa de instructor en descripción ─────────────────────────
export const TARIFA_PREFIX = '__tarifa__:';

export const encodeTarifa = (tarifaHora, descripcion) => {
  if (!tarifaHora) return descripcion || '';
  return `${TARIFA_PREFIX}${tarifaHora}||${descripcion || ''}`;
};

export const decodeTarifa = (descripcionRaw) => {
  if (!descripcionRaw || !descripcionRaw.startsWith(TARIFA_PREFIX)) {
    return { tarifaHora: null, descripcion: descripcionRaw || '', esInstructor: false };
  }
  const sin = descripcionRaw.slice(TARIFA_PREFIX.length);
  const sep = sin.indexOf('||');
  const tarifaHora = parseFloat(sin.slice(0, sep));
  const descripcion = sin.slice(sep + 2);
  return { tarifaHora, descripcion, esInstructor: true };
};

// ── Estado visual del saldo ─────────────────────────────────────────────────
export const getEstado = (balance) => {
  if (balance < -0.01) return { color: '#F98A8A', bg: 'rgba(249,138,138,.12)', border: 'rgba(249,138,138,.3)', label: 'Les debemos', icon: 'ti-arrow-up-right' };
  if (balance >  0.01) return { color: '#2ECFC4', bg: 'rgba(46,207,196,.12)',  border: 'rgba(46,207,196,.3)',  label: 'Nos deben',   icon: 'ti-arrow-down-left' };
  return                       { color: 'rgba(255,255,255,.4)', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)', label: 'Saldado', icon: 'ti-check' };
};

// ── Config de los 3 tipos de transacción ───────────────────────────────────
export const TX_CONFIG = {
  NUEVA_DEUDA: { title: 'Registrar deuda nueva',   color: '#B91C1C', bg: '#FEF2F2', icon: 'ti-trending-down', showCaja: false },
  PAGO_DEUDA:  { title: 'Registrar pago de deuda', color: '#92400E', bg: '#FFFBEB', icon: 'ti-receipt',       showCaja: true  },
  ADELANTO:    { title: 'Dar adelanto',             color: NA.dark,   bg: NA.light,  icon: 'ti-trending-up',  showCaja: true  },
};

// ── Helpers de moneda ──────────────────────────────────────────────────────
const MONEDA_LABELS = {
  R$_STONE_JOSE: 'R$ Stone José',
  R$_STONE_IGNA: 'R$ Stone Igna',
  R$_EFECTIVO:   'R$ Efectivo',
  USD_EFECTIVO:  'USD Efectivo',
  USD_MARIANA:   'USD Mariana',
  EUR_WIZE_IGNA: '€ Wize Igna',
  BRL: 'Reales (BRL)',
  USD: 'Dólares (USD)',
  EUR: 'Euros (EUR)',
  ARS: 'Pesos (ARS)',
};
// Nombre de la CAJA donde está la plata.
// Ojo: no es la moneda del monto. Todos los montos están en reales; el canal
// sólo indica de qué cuenta salió o entró (Wise, Stone, efectivo...).
export const labelCaja = (m) => {
  if (!m) return 'Reales';
  const mapa = {
    'BRL':            'Reales',
    'R$_STONE_JOSE':  'Stone José',
    'R$_STONE_IGNA':  'Stone Igna',
    'R$_EFECTIVO':    'Efectivo R$',
    'EUR_WIZE_IGNA':  'Wise Igna',
    'USD_EFECTIVO':   'Efectivo USD',
    'USD_MARIANA':    'Mariana USD',
  };
  if (mapa[m]) return mapa[m];
  if (m.startsWith('R$_'))  return m.replace('R$_', '').replace(/_/g, ' ');
  if (m.startsWith('EUR'))  return m.replace('EUR_', 'Wise ').replace(/_/g, ' ');
  if (m.startsWith('USD'))  return m.replace('USD_', 'USD ').replace(/_/g, ' ');
  return m.replace(/_/g, ' ');
};

export const labelMoneda = (m) => {
  if (!m) return 'BRL';
  if (m === 'BRL' || m.startsWith('R$_')) return 'Reales (BRL)';
  if (m === 'USD' || m.startsWith('USD')) return 'Dólares (USD)';
  if (m === 'EUR' || m.startsWith('EUR')) return 'Euros (EUR)';
  if (m === 'ARS') return 'Pesos (ARS)';
  if (m === 'CLP') return 'Pesos CLP';
  return m;
};

// Devuelve el símbolo corto para mostrar en chips de saldo
export const simboloMoneda = (m) => {
  if (!m || m === 'BRL' || m.startsWith('R$_')) return 'R$';
  if (m === 'USD' || m.startsWith('USD')) return 'US$';
  if (m === 'EUR' || m.startsWith('EUR')) return '€';
  if (m === 'ARS') return '$';
  return m;
};

// ── Canales de caja (mismo orden que en Ingreso/Egreso) ────────────────────
// Solo se muestran en PAGO_DEUDA y ADELANTO, ya que son los únicos donde
// sale plata real del pozo. Permite saber de qué caja salió el dinero.
export const MONEDAS_CAJA = [
  { value: 'R$_STONE_JOSE', label: 'R$ Stone José' },
  { value: 'R$_STONE_IGNA', label: 'R$ Stone Igna' },
  { value: 'R$_EFECTIVO',   label: 'R$ Efectivo'   },
  { value: 'USD_EFECTIVO',  label: 'USD Efectivo'  },
  { value: 'USD_MARIANA',   label: 'USD Mariana'   },
  { value: 'EUR_WIZE_IGNA', label: '€ Wize Igna'  },
  { divider: true },
  { value: 'BRL', label: 'Reales (BRL)'         },
  { value: 'USD', label: 'Dólares (USD)'         },
  { value: 'EUR', label: 'Euros (EUR)'           },
  { value: 'ARS', label: 'Pesos (ARS)'           },
];

// ── Componentes atómicos compartidos ───────────────────────────────────────
import React from 'react';

export const Field = ({ label, children }) => (
  <div style={sx.field}>
    <label style={sx.label}>{label}</label>
    {children}
  </div>
);

export const TextInput = (props) => (
  <input {...props} style={{ ...sx.input, ...(props.style || {}) }} onFocus={focusOn} onBlur={focusOff} />
);

export const Select = ({ children, ...props }) => (
  <select {...props} style={{ ...sx.input, cursor: 'pointer', ...(props.style || {}) }} onFocus={focusOn} onBlur={focusOff}>
    {children}
  </select>
);