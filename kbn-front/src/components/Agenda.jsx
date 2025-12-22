import React from 'react';

const Agenda = ({ agendaItems, loadingAgenda, handleStatusChange }) => {
  if (loadingAgenda) {
    return (
      <p className="text-center py-10 font-bold text-gray-400 animate-pulse">
        ACTUALIZANDO CLASES...
      </p>
    );
  }

  if (agendaItems.length === 0) {
    return (
      <div className="bg-white p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-100">
        <span className="text-5xl block mb-4">🏄‍♂️</span>
        <p className="text-gray-400 font-black uppercase text-sm tracking-tighter">
          No tienes clases asignadas hoy
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {agendaItems.map(item => (
        <div
          key={item.id}
          className={`bg-white p-6 rounded-[2rem] shadow-sm border-t-8 transition-all ${
            item.estado === 'PENDIENTE' ? 'border-amber-400 shadow-amber-50' :
            item.estado === 'CONFIRMADA' ? 'border-emerald-500' : 'border-gray-200 opacity-60'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {item.fecha} • {item.hora?.substring(0,5)} HS
              </span>
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-tight">
                {item.alumno}
              </h3>
            </div>
            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${
              item.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 
              item.estado === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {item.estado === 'PENDIENTE' ? '⏳ Pendiente' : item.estado}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] mb-5 bg-gray-50 p-4 rounded-2xl font-bold">
            <div><p className="text-gray-400 uppercase text-[9px]">📍 Lugar</p><p className="truncate text-gray-700">{item.lugar}</p></div>
            <div><p className="text-gray-400 uppercase text-[9px]">⏱️ Tiempo</p><p className="text-gray-700">{item.horas}hs</p></div>
            <div><p className="text-gray-400 uppercase text-[9px]">💵 Tarifa</p><p className="text-gray-700">${item.tarifa}</p></div>
            <div><p className="text-gray-400 uppercase text-[9px]">💳 Pagado</p><p className="text-emerald-600">${item.horasPagadas || 0}</p></div>
            <div><p className="text-gray-400 uppercase text-[9px]">🏨 Descripción</p><p className="truncate text-gray-700">{item.hotelDerivacion}</p></div>
          </div>

          {item.estado === 'PENDIENTE' && (
            <div className="flex gap-3">
              <button 
                onClick={() => handleStatusChange(item.id, 'CONFIRMADA')} 
                className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 transition shadow-lg shadow-emerald-100 active:scale-95"
              >
                Confirmar Asistencia
              </button>
              <button 
                onClick={() => handleStatusChange(item.id, 'RECHAZADA')} 
                className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 transition active:scale-95"
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Agenda;
