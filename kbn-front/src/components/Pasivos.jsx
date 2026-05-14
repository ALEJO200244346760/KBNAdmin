import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Pasivos = ({ axiosConfig, setView }) => {
  const [pasivos, setPasivos] = useState([]);
  const [selectedPasivo, setSelectedPasivo] = useState(null);
  
  // Controladores de Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Tipo de operación en los modales
  const [createType, setCreateType] = useState('DEUDA');
  const [transactionType, setTransactionType] = useState('ADELANTO'); // 'ADELANTO' (Egreso) o 'DEUDA' (Aumenta lo que debemos)

  const today = new Date().toISOString().split('T')[0];

  // Formularios
  const initialPasivoForm = { titulo: '', descripcion: '', montoTotal: '', moneda: 'USD', fecha: today };
  const [newPasivo, setNewPasivo] = useState(initialPasivoForm);
  const [editPasivo, setEditPasivo] = useState(initialPasivoForm);

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
      console.error("Error al cargar pasivos", err);
    }
  };

  // 1. Crear nueva cuenta unificada
  const handleCreatePasivo = async (e) => {
    e.preventDefault();
    try {
      // Lógica: Si es Deuda (-), si es Adelanto (+)
      const montoInicial = parseFloat(newPasivo.montoTotal);
      const montoCalculado = createType === 'DEUDA' ? -Math.abs(montoInicial) : Math.abs(montoInicial);
      
      const payload = { ...newPasivo, montoTotal: montoCalculado };
      
      const res = await axios.post('https://kbnadmin-production.up.railway.app/api/pasivos', payload, axiosConfig);
      
      // SOLUCIÓN AL PROBLEMA: Si es un adelanto, la plata sale HOY, por ende debe ir a Egresos
      if (createType === 'ADELANTO') {
        const pasivoCreado = res.data; 
        const egresoPayload = {
          tipoTransaccion: 'EGRESO',
          pasivoId: pasivoCreado.id, // Vinculamos al pasivo recién creado
          total: Math.abs(montoCalculado),
          fecha: newPasivo.fecha,
          moneda: newPasivo.moneda,
          formaPago: 'Efectivo', // Por defecto efectivo, se puede modificar luego
          detalles: `Adelanto inicial otorgado: ${newPasivo.titulo}`,
          actividad: 'Pago Pasivo',
          instructor: 'Secretaria'
        };
        await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', egresoPayload, axiosConfig);
      }

      setShowCreateModal(false);
      setNewPasivo(initialPasivoForm);
      fetchPasivos(); 
    } catch (err) {
      console.error(err);
      alert("Error al guardar. Revisa la consola.");
    }
  };

  // 2. Registrar Movimiento (Nueva Deuda o Nuevo Pago/Adelanto)
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (transactionType === 'ADELANTO') {
        // Es una salida de dinero para pagar deuda o dar más adelanto (EGRESO)
        const payload = {
          tipoTransaccion: 'EGRESO',
          pasivoId: selectedPasivo.id,
          total: transactionData.monto,
          fecha: transactionData.fecha,
          moneda: selectedPasivo.moneda,
          formaPago: transactionData.formaPago,
          detalles: transactionData.detalles || `Adelanto/Pago: ${selectedPasivo.titulo}`,
          actividad: 'Pago Pasivo',
          instructor: 'Secretaria'
        };
        await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload, axiosConfig);
        alert('Movimiento registrado. Se descontó de la caja como Egreso.');
        
      } else {
        // Es sumar DEUDA (Ej: el profe trabajó y le debemos plata). No sale plata de la caja aún.
        // Simulamos un PUT para actualizar el saldo del pasivo en el backend. 
        // IMPORTANTE: Ajustar esta ruta según cómo tu backend actualiza saldos.
        const saldoActual = parseFloat(selectedPasivo.montoTotal);
        const nuevaDeuda = parseFloat(transactionData.monto);
        const nuevoSaldo = saldoActual - nuevaDeuda; // Restamos porque nos endeudamos más (se va a negativo)

        await axios.put(`https://kbnadmin-production.up.railway.app/api/pasivos/${selectedPasivo.id}`, {
            ...selectedPasivo,
            montoTotal: nuevoSaldo
        }, axiosConfig);
        alert('Deuda sumada a la cuenta correctamente.');
      }

      setShowTransactionModal(false);
      setTransactionData(initialTransactionForm);
      fetchPasivos();
    } catch (err) {
      console.error(err);
      alert("Error al registrar la transacción.");
    }
  };

  // 3. Editar y Borrar Pasivo
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`https://kbnadmin-production.up.railway.app/api/pasivos/${editPasivo.id}`, editPasivo, axiosConfig);
      setShowEditModal(false);
      fetchPasivos();
    } catch (err) {
      alert("Error al editar.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("¿Estás seguro de eliminar esta cuenta? Esto no borrará los egresos ya realizados en caja.")){
      try {
        await axios.delete(`https://kbnadmin-production.up.railway.app/api/pasivos/${id}`, axiosConfig);
        fetchPasivos();
      } catch (err) {
        alert("Error al eliminar.");
      }
    }
  };

  // Helpers para abrir modales
  const openTransactionModal = (pasivo, type) => {
    setSelectedPasivo(pasivo);
    setTransactionType(type);
    setTransactionData(initialTransactionForm);
    setShowTransactionModal(true);
  };

  const openEditModal = (pasivo) => {
    setEditPasivo(pasivo);
    setShowEditModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fadeIn">
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black uppercase text-gray-800 italic tracking-tighter">💸 Cuentas Corrientes</h2>
        <button onClick={() => setView('INICIO')} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm uppercase tracking-widest transition-colors">← Volver</button>
      </div>

      {/* ACCIÓN PRINCIPAL UNIFICADA */}
      <div className="mb-8">
        <button onClick={() => { setNewPasivo(initialPasivoForm); setShowCreateModal(true); }} className="w-full bg-gray-900 border-2 border-gray-800 hover:bg-black p-6 rounded-[2rem] flex flex-col items-center transition-all shadow-xl group">
          <span className="text-3xl mb-2 group-hover:scale-125 transition-transform duration-300">🤝</span>
          <span className="font-black text-white uppercase text-sm tracking-widest">Abrir Nueva Cuenta Corriente</span>
          <span className="text-gray-400 text-xs mt-1">(Registrar Deuda o Adelanto Inicial)</span>
        </button>
      </div>

      {/* LISTADO DE TARJETAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pasivos.map(p => {
            const balance = parseFloat(p.montoTotal);
            const isDeuda = balance < 0; // Negativo = Le debemos (Rojo)
            const isAFavor = balance > 0; // Positivo = Nos debe (Verde)
            const isZero = balance === 0;

            let borderColor = isZero ? 'border-gray-400' : (isDeuda ? 'border-rose-500' : 'border-emerald-500');
            let badgeStyle = isZero ? 'bg-gray-100 text-gray-600' : (isDeuda ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700');
            let badgeText = isZero ? 'Saldado (0.00)' : (isDeuda ? 'En Deuda (Negativo)' : 'A Favor (Adelanto)');
            let balanceColor = isZero ? 'text-gray-600' : (isDeuda ? 'text-rose-600' : 'text-emerald-500');

            return (
                <div key={p.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border-t-8 flex flex-col min-h-[220px] transition-all hover:shadow-md ${borderColor}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${badgeStyle}`}>
                            {badgeText}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase">{p.fecha}</span>
                    </div>
                    
                    <h3 className="font-black text-gray-800 uppercase text-xl mt-2 leading-tight">{p.titulo}</h3>
                    <p className="text-xs text-gray-500 mb-4 flex-grow line-clamp-2">{p.descripcion}</p>
                    
                    <div className="bg-gray-50 p-4 rounded-2xl mb-4 text-center">
                        <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">Estado de Cuenta</span>
                        <span className={`text-2xl font-black ${balanceColor}`}>
                            {p.moneda} {balance.toFixed(2)}
                        </span>
                    </div>
                    
                    {/* 5 BOTONES COMPACTOS */}
                    <div className="flex justify-between items-center gap-2 mt-auto bg-gray-50 p-2 rounded-2xl">
                        <button title="Ver Historial" onClick={() => { setSelectedPasivo(p); setShowHistoryModal(true); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:bg-indigo-50 hover:scale-110 transition-all text-lg">
                            📜
                        </button>
                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                        <button title="Registrar Trabajo/Deuda (El profe trabajó)" onClick={() => openTransactionModal(p, 'DEUDA')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:bg-rose-50 hover:scale-110 transition-all text-lg">
                            📉
                        </button>
                        <button title="Dar Adelanto / Pagar (Sale plata)" onClick={() => openTransactionModal(p, 'ADELANTO')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:bg-emerald-50 hover:scale-110 transition-all text-lg">
                            💸
                        </button>
                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                        <button title="Editar" onClick={() => openEditModal(p)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:bg-amber-50 hover:scale-110 transition-all text-lg">
                            ✏️
                        </button>
                        <button title="Borrar" onClick={() => handleDelete(p.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:bg-red-50 hover:scale-110 transition-all text-lg grayscale hover:grayscale-0">
                            🗑️
                        </button>
                    </div>
                </div>
            );
        })}
      </div>

      {/* --- MODALES --- */}

      {/* MODAL 1: CREAR CUENTA (UNIFICADO) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border-4 border-gray-900">
            <h2 className="font-black uppercase italic text-gray-800 mb-6 text-xl text-center">Abrir Cuenta Corriente</h2>
            <form onSubmit={handleCreatePasivo} className="space-y-4">
              <input type="text" placeholder="Referencia (Ej: Profe Juan, Proveedor X)" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-gray-900" value={newPasivo.titulo} onChange={e => setNewPasivo({...newPasivo, titulo: e.target.value})} required />
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Estado Inicial</label>
                <select className="w-full p-4 bg-gray-100 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-gray-900 cursor-pointer" value={createType} onChange={e => setCreateType(e.target.value)}>
                  <option value="DEUDA">📉 Ya le debemos (Deuda / Empieza en negativo)</option>
                  <option value="ADELANTO">📈 Le damos plata hoy (Adelanto / Empieza a favor)</option>
                </select>
                {createType === 'ADELANTO' && <p className="text-[10px] text-emerald-600 font-bold ml-2 mt-1">⚠️ Se registrará un Egreso en caja automáticamente.</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" min="0" placeholder="Monto Inicial" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-gray-900" value={newPasivo.montoTotal} onChange={e => setNewPasivo({...newPasivo, montoTotal: e.target.value})} required />
                <select className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-gray-900" value={newPasivo.moneda} onChange={e => setNewPasivo({...newPasivo, moneda: e.target.value})}>
                  <option value="USD">USD</option><option value="ARS">ARS</option><option value="BRL">BRL</option><option value="EUR">EUR</option>
                </select>
              </div>

              <textarea placeholder="Descripción o detalles..." className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-gray-900" value={newPasivo.descripcion} onChange={e => setNewPasivo({...newPasivo, descripcion: e.target.value})} />
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-1 text-white bg-gray-900 hover:bg-black py-4 rounded-2xl font-black uppercase text-xs shadow-lg transition-colors">Guardar Cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR MOVIMIENTO (DEUDA O ADELANTO) */}
      {showTransactionModal && selectedPasivo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border-4 ${transactionType === 'ADELANTO' ? 'border-emerald-500' : 'border-rose-500'}`}>
            <h2 className={`font-black uppercase italic mb-2 text-xl text-center ${transactionType === 'ADELANTO' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {transactionType === 'ADELANTO' ? '💸 Registrar Pago / Adelanto' : '📉 Sumar Deuda (Trabajo)'}
            </h2>
            <p className="text-center text-[10px] font-bold text-gray-400 uppercase mb-6">
              Cuenta: {selectedPasivo.titulo} 
              {transactionType === 'ADELANTO' ? ' | Impacta en caja (Egreso)' : ' | Solo aumenta el saldo negativo'}
            </p>
            
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Monto</label>
                  <input type="number" step="0.01" min="0.01" className={`w-full p-4 bg-gray-50 rounded-2xl border-none font-black text-lg focus:ring-2 ${transactionType === 'ADELANTO' ? 'text-emerald-600 focus:ring-emerald-500' : 'text-rose-600 focus:ring-rose-500'}`} value={transactionData.monto} onChange={e => setTransactionData({...transactionData, monto: e.target.value})} required />
                </div>
                {transactionType === 'ADELANTO' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Forma de Pago</label>
                    <select className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-emerald-500" value={transactionData.formaPago} onChange={e => setTransactionData({...transactionData, formaPago: e.target.value})}>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Notas / Concepto</label>
                <input type="text" placeholder={transactionType === 'ADELANTO' ? 'Ej: Se le pagó la semana...' : 'Ej: Trabajó 5 horas extras...'} className={`w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 ${transactionType === 'ADELANTO' ? 'focus:ring-emerald-500' : 'focus:ring-rose-500'}`} value={transactionData.detalles} onChange={e => setTransactionData({...transactionData, detalles: e.target.value})} required />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTransactionModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase text-xs hover:bg-gray-200">Cancelar</button>
                <button type="submit" className={`flex-[2] text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl transition-colors ${transactionType === 'ADELANTO' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                  Confirmar {transactionType === 'ADELANTO' ? 'Salida' : 'Deuda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR CUENTA */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h2 className="font-black uppercase italic mb-6 text-xl text-center text-amber-500">✏️ Editar Cuenta</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-amber-500" value={editPasivo.titulo} onChange={e => setEditPasivo({...editPasivo, titulo: e.target.value})} required />
              <textarea className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-amber-500" value={editPasivo.descripcion} onChange={e => setEditPasivo({...editPasivo, descripcion: e.target.value})} />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-1 text-white bg-amber-500 hover:bg-amber-600 py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Actualizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HISTORIAL */}
      {showHistoryModal && selectedPasivo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black uppercase italic text-gray-800 text-lg">Historial: {selectedPasivo.titulo}</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 text-2xl hover:text-gray-700 transition-colors">✕</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2">
              {selectedPasivo.historialPagos?.length > 0 ? (
                selectedPasivo.historialPagos.map(pago => (
                  <div key={pago.id} className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border-l-4 border-indigo-500">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">{pago.fecha}</p>
                      <p className="text-xs font-bold text-gray-700">{pago.nota}</p>
                    </div>
                    <span className="font-black text-indigo-600 text-lg">${pago.montoPagado}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-10 font-bold italic text-sm">No hay movimientos registrados.</p>
              )}
            </div>
            <button onClick={() => setShowHistoryModal(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase shadow-lg text-xs tracking-widest hover:bg-black">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pasivos;