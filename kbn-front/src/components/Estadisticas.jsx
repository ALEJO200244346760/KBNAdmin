import React, { useState } from 'react';

const Estadisticas = ({ clases }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Filtrar por el período seleccionado
  const clasesDelMes = clases.filter(clase => {
    const fecha = new Date(clase.fecha);
    return fecha.getMonth() === selectedMonth && fecha.getFullYear() === selectedYear;
  });

  // Cálculos de Ganancias Personales
  // Sumamos el 30% de cada "total" de clase
  const misGananciasTotales = clasesDelMes.reduce((acc, curr) => {
    const gananciaClase = parseFloat(curr.total || 0) * 0.30;
    return acc + gananciaClase;
  }, 0);

  const totalHorasDictadas = clasesDelMes.reduce((acc, curr) => acc + parseFloat(curr.cantidadHoras || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Selector de Período */}
      <div className="flex gap-3 bg-white p-4 rounded-[2rem] shadow-sm border border-gray-50 overflow-x-auto">
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="bg-gray-50 border-none rounded-xl font-black text-[10px] uppercase p-3 focus:ring-2 focus:ring-indigo-500"
        >
          {meses.map((mes, index) => (
            <option key={mes} value={index}>{mes}</option>
          ))}
        </select>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="bg-gray-50 border-none rounded-xl font-black text-[10px] uppercase p-3 focus:ring-2 focus:ring-indigo-500"
        >
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Cards de Rendimiento Personal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 text-white">
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Mi Ganancia Acumulada (30%)</p>
          <h2 className="text-4xl font-black italic tracking-tighter">
            ${misGananciasTotales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-[9px] mt-2 font-bold opacity-80 uppercase">Período: {meses[selectedMonth]} {selectedYear}</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Horas en el Agua</p>
          <h2 className="text-4xl font-black text-gray-800 italic tracking-tighter">
            {totalHorasDictadas} <span className="text-sm not-italic opacity-30">HS</span>
          </h2>
          <p className="text-[9px] mt-2 font-bold text-indigo-600 uppercase">Total de {clasesDelMes.length} clases dadas</p>
        </div>
      </div>

      {/* Tabla de Liquidación Detallada */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
          <h3 className="font-black text-gray-800 uppercase text-xs italic">Desglose de mis clases</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <th className="p-5 pl-8">Fecha</th>
                <th className="p-5">Alumno / Detalles</th>
                <th className="p-5 text-center">Horas</th>
                <th className="p-5 text-right">Valor Total</th>
                <th className="p-5 text-right pr-8 text-indigo-600">Mi 30%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clasesDelMes.length > 0 ? (
                clasesDelMes.map((clase) => (
                  <tr key={clase.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 pl-8 text-[10px] font-bold text-gray-400">
                      {clase.fecha}
                    </td>
                    <td className="p-5">
                      <p className="text-[11px] font-black text-gray-800 uppercase leading-none mb-1">
                        {clase.detalles || 'Clase de Kitesurf'}
                      </p>
                      <span className="text-[9px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                        {clase.formaPago}
                      </span>
                    </td>
                    <td className="p-5 text-center text-[11px] font-black text-gray-700">
                      {clase.cantidadHoras}h
                    </td>
                    <td className="p-5 text-right text-[11px] font-bold text-gray-400">
                      ${clase.total}
                    </td>
                    <td className="p-5 text-right pr-8">
                      <span className="text-[12px] font-black text-indigo-600">
                        ${(parseFloat(clase.total) * 0.30).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No hay ingresos registrados en este mes</p>
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