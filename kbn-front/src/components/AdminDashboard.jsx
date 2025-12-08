import React, { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext'; // Descomentar en la implementación final

const AdminDashboard = () => {
  // const { user } = useAuth(); // Descomentar y usar para obtener el token/usuario
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);

  // if (!user) return <div className="p-10 text-center">Cargando sesión...</div>;

  useEffect(() => {
    fetchClases();
  }, []);

  const fetchClases = async () => {
    try {
      const response = await fetch('https://kbnadmin-production.up.railway.app/api/clases/listar');
      const data = await response.json();
      setClases(data.map(clase => ({ ...clase, asignadoA: clase.asignadoA || "" })));
    } catch (error) {
      console.error("Error cargando clases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentChange = (id, nuevoValor) => {
    setClases(prev => prev.map(clase => clase.id === id ? { ...clase, asignadoA: nuevoValor } : clase));
  };

  const guardarAsignacion = async (id, asignadoA) => {
    if (!asignadoA) return alert("Selecciona una opción primero");

    try {
      const response = await fetch(`https://kbnadmin-production.up.railway.app/api/clases/asignar/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json' 
            // Añadir Authorization header aquí si se implementa JWT
        },
        body: JSON.stringify({ asignadoA })
      });

      if (response.ok) {
        alert("¡Asignado correctamente!");
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instructor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actividad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total/Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignar Ingreso</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clases.length > 0 ? clases.map(clase => (
              <tr key={clase.id} className={clase.revisado ? "bg-green-50" : "bg-white"}>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${clase.tipoTransaccion === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                    {clase.tipoTransaccion}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.fecha || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{clase.instructor || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.actividad || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    {clase.tipoTransaccion === 'INGRESO' ? `$${clase.total || 0}` : `-$${clase.gastosAsociados || 0}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select 
                    value={clase.asignadoA} 
                    onChange={(e) => handleAssignmentChange(clase.id, e.target.value)}
                    disabled={clase.tipoTransaccion === 'EGRESO'}
                    className="block w-full py-2 px-3 border border-gray-300"
                  >
                    <option value="" disabled>Seleccionar...</option>
                    <option value="IGNA">IGNA</option>
                    <option value="JOSE">JOSE</option>
                    <option value="NINGUNO">NINGUNO (Escuela)</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                    onClick={() => guardarAsignacion(clase.id, clase.asignadoA)}
                    className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm transition-colors"
                  >
                    Confirmar
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">No hay clases registradas aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;