import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Usa tu AuthContext

const AdminDashboard = () => {
  const { token, loading: authLoading } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configuración de axios con token
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]); // Solo cargamos datos cuando AuthContext terminó de cargar

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersResponse = await axios.get(
        'https://kbnadmin-production.up.railway.app/usuario',
        axiosConfig
      );
      setUsuarios(usersResponse.data);

      const rolesResponse = await axios.get(
        'https://kbnadmin-production.up.railway.app/administracion/roles',
        axiosConfig
      );
      setRoles(rolesResponse.data);

    } catch (err) {
      console.error("Error cargando datos de administración:", err);
      setError("Error al cargar usuarios o roles. Verifique el backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId, newRoleId) => {
    setUsuarios(prev => prev.map(user =>
      user.id === userId
        ? { ...user, rol: roles.find(r => r.id === parseInt(newRoleId)) }
        : user
    ));
  };

  const getRoleName = (rolObj) => rolObj ? rolObj.nombre : 'SIN ROL';

  const guardarEdicion = async (userId) => {
    const userToUpdate = usuarios.find(u => u.id === userId);
    if (!userToUpdate || !userToUpdate.rol?.nombre) {
      alert("El usuario o el rol no son válidos.");
      return;
    }

    try {
      await axios.put(
        `https://kbnadmin-production.up.railway.app/administracion/users/${userId}/roles`,
        { rol: userToUpdate.rol.nombre },
        axiosConfig
      );
      alert(`Rol de ${userToUpdate.nombre} actualizado a ${userToUpdate.rol.nombre}.`);
      fetchData();
    } catch (err) {
      console.error("Error al guardar rol:", err);
      alert("Error al actualizar el rol. Verifique el servidor.");
    }
  };

  const eliminarUsuario = async (userId, userName) => {
    if (!window.confirm(`¿Estás seguro de eliminar el usuario ${userName}?`)) return;

    try {
      await axios.delete(
        `https://kbnadmin-production.up.railway.app/administracion/users/${userId}`,
        axiosConfig
      );
      alert(`Usuario ${userName} eliminado.`);
      fetchData();
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      alert("Error al eliminar el usuario.");
    }
  };

  if (loading || authLoading)
    return <div className="p-10 text-center text-indigo-600">Cargando panel de administración de usuarios...</div>;
  if (error) return <div className="p-10 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">⚙️ Panel de Gestión de Usuarios</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apellido</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol Actual</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usuarios.length > 0 ? usuarios.map(usuario => (
              <tr key={usuario.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{usuario.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.apellido}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={usuario.rol ? usuario.rol.id : ''}
                    onChange={(e) => handleRoleChange(usuario.id, e.target.value)}
                    className="block w-32 py-2 px-3 border border-gray-300 rounded text-sm"
                  >
                    <option value="" disabled>Actual: {getRoleName(usuario.rol)}</option>
                    {roles.map(rol => (
                      <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => guardarEdicion(usuario.id)}
                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded text-xs border border-indigo-200"
                  >
                    Guardar Rol
                  </button>
                  <button
                    onClick={() => eliminarUsuario(usuario.id, usuario.nombre)}
                    className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded text-xs border border-red-200"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">No hay usuarios registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
