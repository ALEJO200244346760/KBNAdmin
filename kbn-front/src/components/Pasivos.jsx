import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Pasivos = ({ axiosConfig, setView }) => {
  const [pasivos, setPasivos] = useState([]);
  const [selectedPasivo, setSelectedPasivo] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // ADELANTO    = le damos plata, nos quedan debiendo (saldo positivo, verde)
  // PAGO_DEUDA  = pagamos lo que debemos (reduce saldo negativo, mueve caja)
  // NUEVA_DEUDA = registramos que debemos más (NO mueve caja)
  const [transactionType, setTransactionType] = useState('PAGO_DEUDA');

  const today = new Date().toISOString().split('T')[0];

  const initialPasivoForm = {
    titulo: '',
    descripcion: '',
    montoInicial: '',
    moneda: 'BRL',
    fecha: today,
    tipoRegistro: 'DEUDA',
  };
  const [newPasivo, setNewPasivo] = useState(initialPasivoForm);
  const [editPasivo, setEditPasivo] = useState({});

  const initialTransactionForm = { monto: '', fecha: today, formaPago: 'Efectivo', detalles: '' };
  const [transactionData, setTransactionData] = useState(initialTransactionForm);

  useEffect(() => {
    fetchPasivos();
  }, []);

  const fetchPasivos = async () => {
    try {
      const res = await axios.get('https://kbnadmin-production.up.railway.app/api/pasivos', axiosConfig);
      setPasivos(res.data);
    } catch (err) {
      console.error('Error al cargar pasivos', err);
    }
  };

  // ---------------------------------------------------------------
  // FUENTE DE VERDAD: el montoTotal del backend ya está calculado.
  // Negativo = les debemos (rojo). Positivo = nos deben (verde).
  // ---------------------------------------------------------------
  const getBalance = (pasivo) => parseFloat(pasivo.montoTotal) || 0;

  // ---------------------------------------------------------------
  // CREAR PASIVO
  // DEUDA inicial    → montoTotal negativo. NO mueve caja.
  // ADELANTO inicial → arranca en 0, el egreso de caja suma y lo deja positivo.
  // ---------------------------------------------------------------
  const handleCreatePasivo = async (e) => {
    e.preventDefault();
    try {
      const monto = parseFloat(newPasivo.montoInicial) || 0;
      const esAdelanto = newPasivo.tipoRegistro === 'ADELANTO';

      const pasivoRes = await axios.post(
        'https://kbnadmin-production.up.railway.app/api/pasivos',
        {
          titulo: newPasivo.titulo,
          descripcion: newPasivo.descripcion,
          moneda: newPasivo.moneda,
          fecha: newPasivo.fecha,
          montoTotal: esAdelanto ? 0 : -Math.abs(monto),
          historialPagos: [],
        },
        axiosConfig
      );

      if (esAdelanto) {
        // El backend suma el monto al pasivo → queda positivo (nos deben)
        await axios.post(
          'https://kbnadmin-production.up.railway.app/api/clases/guardar',
          {
            tipoTransaccion: 'EGRESO',
            tipoMovimientoPasivo: 'ADELANTO',
            pasivoId: pasivoRes.data.id,
            total: String(Math.abs(monto)),
            fecha: newPasivo.fecha,
            moneda: newPasivo.moneda,
            formaPago: 'Efectivo',
            detalles: `Adelanto inicial: ${newPasivo.titulo}`,
            actividad: 'Pago Pasivo',
            instructor: 'Secretaria',
          },
          axiosConfig
        );
      }

      setShowCreateModal(false);
      setNewPasivo(initialPasivoForm);
      setTimeout(fetchPasivos, 1000);
    } catch (err) {
      console.error(err);
      alert('Error al guardar.');
    }
  };

  // ---------------------------------------------------------------
  // TRANSACCIONES SOBRE UN PASIVO EXISTENTE
  //
  // NUEVA_DEUDA → Solo actualiza montoTotal del pasivo (resta). NO sale de caja.
  // PAGO_DEUDA  → EGRESO de caja. Backend suma al montoTotal (reduce deuda negativa).
  // ADELANTO    → EGRESO de caja. Backend suma al montoTotal (lo lleva a positivo).
  // ---------------------------------------------------------------
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      const monto = parseFloat(transactionData.monto);

      if (transactionType === 'NUEVA_DEUDA') {
        // No sale plata de caja. Solo crece la deuda.
        const montoActual = parseFloat(selectedPasivo.montoTotal) || 0;
        await axios.put(
          `https://kbnadmin-production.up.railway.app/api/pasivos/${selectedPasivo.id}`,
          { ...selectedPasivo, montoTotal: montoActual - Math.abs(monto) },
          axiosConfig
        );
      } else {
        // PAGO_DEUDA o ADELANTO: sale plata de caja, backend suma al pasivo
        await axios.post(
          'https://kbnadmin-production.up.railway.app/api/clases/guardar',
          {
            tipoTransaccion: 'EGRESO',
            tipoMovimientoPasivo: transactionType,
            pasivoId: selectedPasivo.id,
            total: String(Math.abs(monto)),
            fecha: transactionData.fecha,
            moneda: selectedPasivo.moneda,
            formaPago: transactionData.formaPago,
            detalles: transactionData.detalles || `${transactionType === 'ADELANTO' ? 'Adelanto' : 'Pago'}: ${selectedPasivo.titulo}`,
            actividad: 'Pago Pasivo',
            instructor: 'Secretaria',
          },
          axiosConfig
        );
      }

      setShowTransactionModal(false);
      setTransactionData(initialTransactionForm);
      setTimeout(() => {
        fetchPasivos();
        alert('Operación realizada con éxito.');
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Error en la transacción.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `https://kbnadmin-production.up.railway.app/api/pasivos/${editPasivo.id}`,
        editPasivo,
        axiosConfig
      );
      setShowEditModal(false);
      fetchPasivos();
      alert('Datos actualizados');
    } catch (err) {
      console.error(err);
      alert('Error al actualizar');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta cuenta corriente?')) {
      try {
        await axios.delete(`https://kbnadmin-production.up.railway.app/api/pasivos/${id}`, axiosConfig);
        fetchPasivos();
      } catch (err) {
        alert('Error al eliminar.');
      }
    }
  };

  // ---------------------------------------------------------------
  // UI HELPERS
  // ---------------------------------------------------------------
  const getCardStyle = (balance) => {
    if (balance < -0.01) return {
      border: 'border-rose-500', bg: 'bg-rose-50',
      text: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', label: 'Les debemos',
    };
    if (balance > 0.01) return {
      border: 'border-emerald-500', bg: 'bg-emerald-50',
      text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', label: 'Nos deben',
    };
    return {
      border: 'border-gray-300', bg: 'bg-gray-50',
      text: 'text-gray-400', badge: 'bg-gray-100 text-gray-600', label: 'Saldado',
    };
  };

  const transactionConfig = {
    NUEVA_DEUDA: {
      title: 'Registrar Deuda Nueva',
      subtitle: 'No mueve caja — solo registra que debemos más',
      borderColor: 'border-rose-500',
      btnColor: 'bg-rose-600 hover:bg-rose-700',
      textColor: 'text-rose-600',
      showFormaPago: false,
    },
    PAGO_DEUDA: {
      title: 'Registrar Pago de Deuda',
      subtitle: 'Sale de caja — reducimos lo que debíamos',
      borderColor: 'border-amber-500',
      btnColor: 'bg-amber-500 hover:bg-amber-600',
      textColor: 'text-amber-600',
      showFormaPago: true,
    },
    ADELANTO: {
      title: 'Dar Adelanto',
      subtitle: 'Sale de caja — nos quedan debiendo',
      borderColor: 'border-emerald-500',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
      textColor: 'text-emerald-600',
      showFormaPago: true,
    },
  };

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fadeIn">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black uppercase text-gray-800 italic tracking-tighter">Cuentas Corrientes</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestión de Deudas y Adelantos</p>
        </div>
        <button onClick={() => setView('INICIO')} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all">
          ← Volver
        </button>
      </div>

      {/* LEYENDA */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <span className="flex items-center gap-2 bg-rose-50 text-rose-700 text-[10px] font-black uppercase px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Les debemos = rojo
        </span>
        <span className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Nos deben = verde
        </span>
        <span className="flex items-center gap-2 bg-gray-50 text-gray-500 text-[10px] font-black uppercase px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Saldado = gris
        </span>
      </div>

      {/* BOTÓN CREAR */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full mb-8 bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all group"
      >
        <span className="text-2xl font-black group-hover:scale-110 transition-transform">+ Nueva Cuenta Corriente</span>
      </button>

      {/* GRID DE TARJETAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pasivos.map((p) => {
          const balance = getBalance(p);
          const style = getCardStyle(balance);
          return (
            <div key={p.id} className={`bg-white rounded-[2.5rem] p-6 shadow-sm border-t-[12px] flex flex-col transition-all hover:shadow-md ${style.border}`}>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${style.badge}`}>
                  {style.label}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditPasivo(p); setShowEditModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg text-lg">✏️</button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-rose-50 rounded-lg text-lg">🗑️</button>
                </div>
              </div>

              <h3 className="font-black text-gray-800 uppercase text-xl leading-tight mb-1">{p.titulo}</h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase mb-4 h-8 overflow-hidden">{p.descripcion}</p>

              <div className={`${style.bg} p-5 rounded-3xl mb-6 text-center`}>
                <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">Saldo Actual</span>
                <span className={`text-3xl font-black tracking-tighter ${style.text}`}>
                  {p.moneda} {Math.abs(balance).toFixed(2)}
                </span>
              </div>

              <div className="space-y-2 mt-auto">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { setTransactionType('NUEVA_DEUDA'); setSelectedPasivo(p); setTransactionData(initialTransactionForm); setShowTransactionModal(true); }}
                    className="bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-tighter transition-all"
                  >+ Deuda</button>
                  <button
                    onClick={() => { setTransactionType('PAGO_DEUDA'); setSelectedPasivo(p); setTransactionData(initialTransactionForm); setShowTransactionModal(true); }}
                    className="bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-tighter transition-all"
                  >✓ Pagar</button>
                  <button
                    onClick={() => { setTransactionType('ADELANTO'); setSelectedPasivo(p); setTransactionData(initialTransactionForm); setShowTransactionModal(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-tighter transition-all"
                  >↑ Adelanto</button>
                </div>
                <button
                  onClick={() => { setSelectedPasivo(p); setShowHistoryModal(true); }}
                  className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >Ver Historial</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CREAR */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 text-gray-800">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
            <h2 className="font-black uppercase italic mb-2 text-2xl text-center">Nueva Cuenta</h2>
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase mb-6">Registrá una deuda o un adelanto inicial</p>
            <form onSubmit={handleCreatePasivo} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre (Ej: Profe Facu)"
                className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold outline-none"
                value={newPasivo.titulo}
                onChange={(e) => setNewPasivo({ ...newPasivo, titulo: e.target.value })}
                required
              />

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">¿Qué es?</label>
                <select
                  className="w-full p-4 bg-gray-100 rounded-2xl border-none font-bold outline-none"
                  value={newPasivo.tipoRegistro}
                  onChange={(e) => setNewPasivo({ ...newPasivo, tipoRegistro: e.target.value })}
                >
                  <option value="DEUDA">Deuda — les debemos plata (rojo)</option>
                  <option value="ADELANTO">Adelanto — nos quedan debiendo (verde)</option>
                </select>
              </div>

              {newPasivo.tipoRegistro === 'DEUDA' && (
                <div className="bg-rose-50 text-rose-700 text-[10px] font-black uppercase px-4 py-3 rounded-2xl">
                  ⚠️ Solo registra la deuda. No sale plata de caja.
                </div>
              )}
              {newPasivo.tipoRegistro === 'ADELANTO' && (
                <div className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-4 py-3 rounded-2xl">
                  ✓ Sale de caja. El saldo queda en verde (nos deben).
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Descripción / Nota</label>
                <input
                  type="text"
                  placeholder="Ej: Pago de clases enero"
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold outline-none"
                  value={newPasivo.descripcion}
                  onChange={(e) => setNewPasivo({ ...newPasivo, descripcion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto"
                  className="p-4 bg-gray-50 rounded-2xl border-none font-bold outline-none"
                  value={newPasivo.montoInicial}
                  onChange={(e) => setNewPasivo({ ...newPasivo, montoInicial: e.target.value })}
                  required
                />
                <select
                  className="p-4 bg-gray-50 rounded-2xl border-none font-bold outline-none"
                  value={newPasivo.moneda}
                  onChange={(e) => setNewPasivo({ ...newPasivo, moneda: e.target.value })}
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 font-black uppercase text-xs text-gray-400">Cancelar</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Crear Cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSACCION */}
      {showTransactionModal && selectedPasivo && (() => {
        const cfg = transactionConfig[transactionType];
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 text-gray-800">
            <div className={`bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border-t-[15px] ${cfg.borderColor}`}>
              <h2 className={`font-black uppercase text-2xl text-center mb-1 ${cfg.textColor}`}>{cfg.title}</h2>
              <p className="text-center text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">{selectedPasivo.titulo}</p>
              <p className="text-center text-[10px] font-bold text-gray-300 uppercase mb-8">{cfg.subtitle}</p>

              <form onSubmit={handleTransactionSubmit} className="space-y-4">
                <div className={`grid gap-4 ${cfg.showFormaPago ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Monto"
                    className="p-4 bg-gray-50 rounded-2xl border-none font-black text-xl outline-none"
                    value={transactionData.monto}
                    onChange={(e) => setTransactionData({ ...transactionData, monto: e.target.value })}
                    required
                  />
                  {cfg.showFormaPago && (
                    <select
                      className="p-4 bg-gray-50 rounded-2xl border-none font-bold outline-none"
                      value={transactionData.formaPago}
                      onChange={(e) => setTransactionData({ ...transactionData, formaPago: e.target.value })}
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Concepto (Ej: Pago de clases enero)"
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold outline-none"
                  value={transactionData.detalles}
                  onChange={(e) => setTransactionData({ ...transactionData, detalles: e.target.value })}
                  required
                />

                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setShowTransactionModal(false)} className="flex-1 font-black uppercase text-xs text-gray-400">Cancelar</button>
                  <button type="submit" className={`flex-[2] py-4 rounded-2xl font-black uppercase text-xs text-white shadow-xl ${cfg.btnColor}`}>
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL EDITAR */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 text-gray-800">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border-t-[15px] border-amber-500">
            <h2 className="font-black uppercase italic mb-6 text-2xl text-center text-amber-600">Editar Perfil</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nombre / Referencia</label>
                <input
                  type="text"
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold outline-none"
                  value={editPasivo.titulo || ''}
                  onChange={(e) => setEditPasivo({ ...editPasivo, titulo: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Descripción</label>
                <textarea
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold h-24 outline-none"
                  value={editPasivo.descripcion || ''}
                  onChange={(e) => setEditPasivo({ ...editPasivo, descripcion: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 font-black uppercase text-xs text-gray-400">Cancelar</button>
                <button type="submit" className="flex-[2] bg-amber-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL */}
      {showHistoryModal && selectedPasivo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 text-gray-800">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-black uppercase text-xl italic text-gray-800">{selectedPasivo.titulo}</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-2xl hover:scale-110 transition-transform">✕</button>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-8 tracking-widest">Historial de movimientos</p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 mb-8">
              {selectedPasivo.historialPagos?.length > 0 ? (
                [...selectedPasivo.historialPagos].reverse().map((mov, idx) => {
                  const monto = parseFloat(mov.montoPagado) || 0;
                  const esPositivo = monto > 0;
                  return (
                    <div
                      key={idx}
                      className={`bg-gray-50 p-5 rounded-3xl flex justify-between items-center border-l-8 ${esPositivo ? 'border-emerald-500' : 'border-rose-500'}`}
                    >
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">{mov.fecha}</p>
                        <p className="text-sm font-black text-gray-700">{mov.nota}</p>
                      </div>
                      <span className={`font-black text-lg ${esPositivo ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {esPositivo ? `+ ${monto.toFixed(2)}` : `- ${Math.abs(monto).toFixed(2)}`}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-gray-400 font-bold italic">Sin movimientos registrados.</div>
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-xs transition-all hover:bg-black"
            >Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pasivos;