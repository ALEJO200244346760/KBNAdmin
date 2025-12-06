import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos al iniciar
  useEffect(() => {
    fetchClases();
  }, []);

  const fetchClases = async () => {
    try {
      // Ajusta la URL a tu puerto real
      const response = await fetch('http://localhost:8080/api/clases/listar');
      const data = await response.json();
      setClases(data);
      setLoading(false);
    } catch (error) {
      console.error("Error cargando clases:", error);
      setLoading(false);
    }
  };

  // Manejar el cambio en el select (solo actualiza el estado local de la fila)
  const handleAssignmentChange = (id, nuevoValor) => {
    setClases(prevClases => 
      prevClases.map(clase => 
        clase.id === id ? { ...clase, asignadoA: nuevoValor } : clase
      )
    );
  };

  // Guardar el cambio en la base de datos
  const guardarAsignacion = async (id, asignadoA) => {
    if (!asignadoA) return alert("Selecciona una opción primero");

    try {
      const response = await fetch(`http://localhost:8080/api/clases/asignar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignadoA })
      });

      if (response.ok) {
        alert("¡Asignado correctamente!");
        // Opcional: recargar datos o marcar visualmente
        fetchClases(); 
      } else {
        alert("Error al guardar");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando panel...</div>;

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Panel de Administración</h1>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma Pago</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignar Ingreso</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clases.map((clase) => (
              <tr key={clase.id} className={clase.revisado ? "bg-green-50" : "bg-white"}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.fecha}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{clase.nombreInstructor}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {clase.actividad} 
                  {clase.descripcionActividad && <span className="text-xs block text-gray-400">{clase.descripcionActividad}</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${clase.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.formaPago}</td>
                
                {/* COLUMNA DE ASIGNACIÓN */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <select 
                    value={clase.asignadoA || ""} 
                    onChange={(e) => handleAssignmentChange(clase.id, e.target.value)}
                    className={`block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      clase.asignadoA === 'IGNA' ? 'text-blue-600 font-bold' : 
                      clase.asignadoA === 'JOSE' ? 'text-green-600 font-bold' : ''
                    }`}
                  >
                    <option value="" disabled>Seleccionar...</option>
                    <option value="IGNA">IGNA</option>
                    <option value="JOSE">JOSE</option>
                    <option value="NINGUNO">NINGUNO (Escuela)</option>
                  </select>
                </td>
                
                {/* BOTÓN GUARDAR */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                    onClick={() => guardarAsignacion(clase.id, clase.asignadoA)}
                    className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm transition-colors"
                  >
                    Confirmar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {clases.length === 0 && (
          <div className="p-6 text-center text-gray-500">No hay clases registradas aún.</div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;