import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../axiosConfig';

const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

const sx = {
  label: { fontSize: 11, color: NA.text2, display: 'block', marginBottom: 5, fontWeight: 500 },
  input: {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text,
    fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  },
};

const NACIONALIDADES = [
  'Argentina','Brasil','Uruguay','Chile','Paraguay','Bolivia','Colombia','Venezuela',
  'España','Francia','Italia','Alemania','Reino Unido','Portugal','Holanda','Bélgica',
  'Suiza','Australia','Estados Unidos','Canadá','México','Otra',
];

const VACIO = {
  nombre: '', apellido: '', email: '', telefono: '', nacionalidad: '',
  esNino: false,
  nombrePadre: '', apellidoPadre: '', emailPadre: '', telefonoPadre: '',
  notas: '',
};

// ── Componentes atómicos ──────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 13 }}>
    <label style={sx.label}>{label}</label>
    {children}
  </div>
);

const TxtInput = (props) => (
  <input {...props}
    style={{ ...sx.input, ...(props.style || {}) }}
    onFocus={e => { e.target.style.borderColor = NA.primary; e.target.style.boxShadow = `0 0 0 3px ${NA.light}`; }}
    onBlur={e =>  { e.target.style.borderColor = NA.border;  e.target.style.boxShadow = 'none'; }}
  />
);

// ── Tarjeta de cliente ────────────────────────────────────────────────────────
const ClienteCard = ({ c, onEdit, onDelete, eliminando }) => (
  <div style={{
    background: '#fff', borderRadius: 14, border: `0.5px solid ${NA.border}`,
    padding: 16, display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Nombre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: NA.text }}>
          {c.nombre} {c.apellido}
        </span>
        {c.esNino && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 99, background: '#FEF9C3', color: '#713F12' }}>
            👶 Menor
          </span>
        )}
        {c.nacionalidad && (
          <span style={{ fontSize: 11, color: NA.text2 }}>{c.nacionalidad}</span>
        )}
      </div>

      {/* Contacto */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: NA.text2 }}>
        {c.email    && <span><i className="ti ti-mail"  style={{ marginRight: 4 }}/>{c.email}</span>}
        {c.telefono && <span><i className="ti ti-phone" style={{ marginRight: 4 }}/>{c.telefono}</span>}
      </div>

      {/* Padre/tutor si es niño */}
      {c.esNino && (c.nombrePadre || c.emailPadre) && (
        <div style={{ marginTop: 6, padding: '6px 10px', background: NA.bg, borderRadius: 8, fontSize: 12, color: NA.text2 }}>
          <span style={{ fontWeight: 500 }}>Padre/Tutor: </span>
          {c.nombrePadre} {c.apellidoPadre}
          {c.telefonoPadre && ` · ${c.telefonoPadre}`}
          {c.emailPadre    && ` · ${c.emailPadre}`}
        </div>
      )}

      {c.notas && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: NA.text2, fontStyle: 'italic' }}>
          {c.notas}
        </p>
      )}
    </div>

    {/* Acciones */}
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
      <button onClick={() => onEdit(c)} aria-label="Editar"
        style={{ width: 34, height: 34, borderRadius: 9, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.dark, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="ti ti-edit" style={{ fontSize: 16 }}/>
      </button>
      <button onClick={() => onDelete(c)} disabled={eliminando} aria-label="Eliminar"
        style={{ width: 34, height: 34, borderRadius: 9, border: '0.5px solid #FECACA', background: '#fff', color: eliminando ? '#9ca3af' : '#DC2626', cursor: eliminando ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`ti ${eliminando ? 'ti-loader-2' : 'ti-trash'}`} style={{ fontSize: 16, ...(eliminando ? { animation: 'cspin .7s linear infinite' } : {}) }}/>
      </button>
    </div>
  </div>
);

// ── Modal de formulario ───────────────────────────────────────────────────────
const ModalCliente = ({ form, setForm, onSubmit, onClose, guardando, editando }) => {
  const onChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,80,65,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: NA.text }}>
            {editando ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-x" style={{ fontSize: 15 }}/>
          </button>
        </div>

        {/* Toggle niño */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '10px 14px', borderRadius: 10, background: form.esNino ? '#FEF9C3' : NA.bg, border: `0.5px solid ${form.esNino ? '#FDE68A' : NA.border}` }}>
          <button type="button"
            onClick={() => onChange('esNino', !form.esNino)}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: form.esNino ? '#F59E0B' : '#D1D5DB', position: 'relative', flexShrink: 0,
              transition: 'background .2s',
            }}>
            <span style={{
              position: 'absolute', top: 2, left: form.esNino ? 20 : 2, width: 18, height: 18,
              borderRadius: '50%', background: '#fff', transition: 'left .2s',
            }}/>
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: NA.text }}>
              {form.esNino ? '👶 Es menor de edad' : 'Adulto'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: NA.text2 }}>
              {form.esNino ? 'Se pedirán los datos del padre/tutor' : 'Activá si el alumno es un niño'}
            </p>
          </div>
        </div>

        {/* Datos del alumno */}
        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: NA.text2, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {form.esNino ? 'Datos del niño' : 'Datos del alumno'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Nombre">
            <TxtInput placeholder="Juan" value={form.nombre} onChange={e => onChange('nombre', e.target.value)}/>
          </Field>
          <Field label="Apellido">
            <TxtInput placeholder="García" value={form.apellido} onChange={e => onChange('apellido', e.target.value)}/>
          </Field>
        </div>

        {!form.esNino && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Email">
              <TxtInput type="email" placeholder="juan@mail.com" value={form.email} onChange={e => onChange('email', e.target.value)}/>
            </Field>
            <Field label="Teléfono">
              <TxtInput placeholder="+54 9 11..." value={form.telefono} onChange={e => onChange('telefono', e.target.value)}/>
            </Field>
          </div>
        )}

        <Field label="Nacionalidad">
          <select value={form.nacionalidad} onChange={e => onChange('nacionalidad', e.target.value)}
            style={{ ...sx.input, cursor: 'pointer' }}>
            <option value="">Seleccionar...</option>
            {NACIONALIDADES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>

        {/* Datos del padre/tutor (solo si es niño) */}
        {form.esNino && (
          <>
            <div style={{ margin: '16px 0 10px', height: 1, background: NA.border }}/>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: NA.text2, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Datos del padre / tutor
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Nombre">
                <TxtInput placeholder="Roberto" value={form.nombrePadre} onChange={e => onChange('nombrePadre', e.target.value)}/>
              </Field>
              <Field label="Apellido">
                <TxtInput placeholder="García" value={form.apellidoPadre} onChange={e => onChange('apellidoPadre', e.target.value)}/>
              </Field>
              <Field label="Email">
                <TxtInput type="email" placeholder="papa@mail.com" value={form.emailPadre} onChange={e => onChange('emailPadre', e.target.value)}/>
              </Field>
              <Field label="Teléfono">
                <TxtInput placeholder="+54 9 11..." value={form.telefonoPadre} onChange={e => onChange('telefonoPadre', e.target.value)}/>
              </Field>
            </div>
          </>
        )}

        {/* Notas */}
        <Field label="Notas (opcional)">
          <textarea rows={2} placeholder="Nivel, preferencias, historial..." value={form.notas}
            onChange={e => onChange('notas', e.target.value)}
            style={{ ...sx.input, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}/>
        </Field>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onSubmit} disabled={guardando || !form.nombre.trim()}
            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: guardando || !form.nombre.trim() ? NA.mid : NA.dark, color: '#fff', fontSize: 13, fontWeight: 600, cursor: guardando ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {guardando
              ? <><i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'cspin .7s linear infinite' }}/> Guardando...</>
              : <><i className="ti ti-check" style={{ fontSize: 16 }}/> {editando ? 'Guardar cambios' : 'Crear cliente'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function Clientes() {
  const [clientes,  setClientes]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando,  setEditando]  = useState(null); // cliente siendo editado
  const [form,      setForm]      = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const enviandoRef = useRef(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/clientes');
      setClientes(res.data);
    } catch (e) {
      console.error('Clientes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Búsqueda con debounce ─────────────────────────────────────────────────
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  useEffect(() => {
    if (!query.trim()) { setClientesFiltrados(clientes); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/api/clientes/buscar?q=${encodeURIComponent(query)}`);
        setClientesFiltrados(res.data);
      } catch { setClientesFiltrados(clientes); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, clientes]);

  // ── Abrir modal nuevo ─────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setEditando(null);
    setForm(VACIO);
    setShowModal(true);
  };

  // ── Abrir modal edición ───────────────────────────────────────────────────
  const abrirEditar = (c) => {
    setEditando(c);
    setForm({
      nombre: c.nombre || '', apellido: c.apellido || '',
      email: c.email || '', telefono: c.telefono || '',
      nacionalidad: c.nacionalidad || '', esNino: c.esNino || false,
      nombrePadre: c.nombrePadre || '', apellidoPadre: c.apellidoPadre || '',
      emailPadre: c.emailPadre || '', telefonoPadre: c.telefonoPadre || '',
      notas: c.notas || '',
    });
    setShowModal(true);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/api/clientes/${editando.id}`, form);
      } else {
        await api.post('/api/clientes', form);
      }
      setShowModal(false);
      await cargar();
    } catch (e) {
      alert('No se pudo guardar. Probá de nuevo.');
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar a ${c.nombre} ${c.apellido}? Esta acción no se puede deshacer.`)) return;
    setEliminandoId(c.id);
    try {
      await api.delete(`/api/clientes/${c.id}`);
      setClientes(p => p.filter(x => x.id !== c.id));
    } catch {
      alert('No se pudo eliminar.');
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 14px 80px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes cspin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: NA.text }}>Clientes</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: NA.text2 }}>
            {clientes.length} registrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirNuevo}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: NA.dark, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <i className="ti ti-user-plus" style={{ fontSize: 16 }}/> Nuevo cliente
        </button>
      </div>

      {/* ── Buscador ── */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <i className="ti ti-search" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: NA.text2, pointerEvents: 'none' }}/>
        <input
          type="text" placeholder="Buscar por nombre, apellido o email..."
          value={query} onChange={e => setQuery(e.target.value)}
          style={{ ...sx.input, paddingLeft: 38 }}
        />
        {query && (
          <button onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: NA.text2, fontSize: 16 }}>
            <i className="ti ti-x"/>
          </button>
        )}
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: NA.text2 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'cspin .7s linear infinite', display: 'block', marginBottom: 8 }}/>
          Cargando clientes...
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: NA.text2 }}>
          <i className="ti ti-users-group" style={{ fontSize: 36, opacity: .25, display: 'block', marginBottom: 10 }}/>
          {query ? `Sin resultados para "${query}"` : 'Todavía no hay clientes registrados.'}
          {!query && (
            <div style={{ marginTop: 14 }}>
              <button onClick={abrirNuevo}
                style={{ padding: '9px 20px', background: NA.dark, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Agregar el primero
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clientesFiltrados.map(c => (
            <ClienteCard
              key={c.id} c={c}
              onEdit={abrirEditar}
              onDelete={eliminar}
              eliminando={eliminandoId === c.id}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <ModalCliente
          form={form} setForm={setForm}
          onSubmit={guardar} onClose={() => setShowModal(false)}
          guardando={guardando} editando={!!editando}
        />
      )}
    </div>
  );
}