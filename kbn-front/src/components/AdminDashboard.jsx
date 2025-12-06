import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!user) return <div className="p-10 text-center">Cargando sesión...</div>;

  useEffect(() => {
    fetchClases();
  }, []);

  const fetchClases = async () => {
    try {
      const response = await fetch('https://kbnadmin-production.up.railway.app/api/clases/listar');
      const data = await response.json();
      console.log("Clases recibidas:", data);
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
        headers: { 'Content-Type': 'application/json' },
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
              <th>Fecha</th>
              <th>Instructor</th>
              <th>Actividad</th>
              <th>Total</th>
              <th>Forma Pago</th>
              <th>Asignar Ingreso</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clases.length > 0 ? clases.map(clase => (
              <tr key={clase.id} className={clase.revisado ? "bg-green-50" : "bg-white"}>
                <td>{clase.fecha || "-"}</td>
                <td>{clase.nombreInstructor || "-"}</td>
                <td>
                  {clase.actividad || "-"} 
                  {clase.descripcionActividad && <span className="text-xs block text-gray-400">{clase.descripcionActividad}</span>}
                </td>
                <td>${clase.total || 0}</td>
                <td>{clase.formaPago || "-"}</td>
                <td>
                  <select 
                    value={clase.asignadoA} 
                    onChange={(e) => handleAssignmentChange(clase.id, e.target.value)}
                  >
                    <option value="" disabled>Seleccionar...</option>
                    <option value="IGNA">IGNA</option>
                    <option value="JOSE">JOSE</option>
                    <option value="NINGUNO">NINGUNO (Escuela)</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => guardarAsignacion(clase.id, clase.asignadoA)}>Confirmar</button>
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
