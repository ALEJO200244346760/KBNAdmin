import React, { useState } from 'react';

const Estadisticas = ({ clases }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Filtrado de clases por mes y año
  const clasesFiltradas = clases.filter(clase => {
    const fecha = new Date(clase.fecha);
    return fecha.getMonth() === selectedMonth && fecha.getFullYear() === selectedYear;
  });

  // Cálculos
  const totalGenerado = clasesFiltradas.reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
  const miComision = totalGenerado * 0.30;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Filtros */}
      <div className="flex gap-3 bg-white p-4 rounded-[2rem] shadow-sm border border-gray-50 overflow-x-auto">
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="bg-gray-50 border-none rounded-xl font-bold text-xs uppercase p-3 focus:ring-2 focus:ring-indigo-500"
        >
          {meses.map((mes, index) => (
            <option key={mes} value={index}>{mes}</option>
          ))}
        </select>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="bg-gray-50 border-none rounded-xl font-bold text-xs uppercase p-3 focus:ring-2 focus:ring-indigo-500"
        >
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-b-4 border-indigo-500">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Generado (Escuela)</p>
          <h2 className="text-3xl font-black text-gray-800">${totalGenerado.toLocaleString()}</h2>
        </div>
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 text-white">
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Mi Ganancia (30%)</p>
          <h2 className="text-3xl font-black">${miComision.toLocaleString()}</h2>
        </div>
      </div>

      {/* Listado Detallado */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="font-black text-gray-800 uppercase text-sm italic">Detalle de Clases - {meses[selectedMonth]}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
                <th className="p-4 pl-8">Fecha</th>
                <th className="p-4">Detalles</th>
                <th className="p-4 text-right">Valor Clase</th>
                <th className="p-4 text-right pr-8">Mi 30%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clasesFiltradas.length > 0 ? (
                clasesFiltradas.map((clase, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-8 text-[11px] font-bold text-gray-500">{clase.fecha}</td>
                    <td className="p-4">
                      <p className="text-xs font-black text-gray-800 uppercase">{clase.actividad}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{clase.detalles || 'Sin detalles'}</p>
                    </td>
                    <td className="p-4 text-right text-xs font-black text-gray-600">${clase.total}</td>
                    <td className="p-4 text-right pr-8 text-xs font-black text-indigo-600">
                      ${(parseFloat(clase.total) * 0.30).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-gray-400 font-bold uppercase text-[10px]">
                    No hay registros para este período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Estadisticas;