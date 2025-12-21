import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { token, loading: authLoading } = useAuth();
  
  // Estados de Datos
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // Usuario siendo editado en el modal
  const [newRoleName, setNewRoleName] = useState(""); // Para crear roles

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('https://kbnadmin-production.up.railway.app/usuario', axiosConfig),
        axios.get('https://kbnadmin-production.up.railway.app/administracion/roles', axiosConfig)
      ]);
      setUsuarios(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error(err);
      setError("Error cargando datos.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGICA DE ROLES ---

  const crearRol = async () => {
    if(!newRoleName.trim()) return;
    try {
        await axios.post('https://kbnadmin-production.up.railway.app/administracion/roles', 
            { nombre: newRoleName.toUpperCase() }, 
            axiosConfig
        );
        alert("Rol creado exitosamente");
        setNewRoleName("");
        fetchData();
    } catch (error) {
        alert("Error al crear rol");
    }
  };

  const handleRoleSelectChange = (userId, newRoleId) => {
    // Actualización optimista local
    const rolSeleccionado = roles.find(r => r.id === parseInt(newRoleId));
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rol: rolSeleccionado } : u));
  };

  const guardarCambioRol = async (user) => {
    try {
      await axios.put(
        `https://kbnadmin-production.up.railway.app/administracion/users/${user.id}/roles`,
        { rol: user.rol.nombre },
        axiosConfig
      );
      alert(`Rol actualizado a ${user.rol.nombre}`);
    } catch (err) {
      alert("Error al guardar el rol en servidor.");
      fetchData(); // Revertir cambios si falla
    }
  };

  // --- LOGICA DE EDICIÓN DE USUARIO (MODAL) ---

  const openEditModal = (user) => {
    setEditingUser({ ...user }); // Copia del objeto para editar
    setIsModalOpen(true);
  };

  const handleEditChange = (e) => {
    setEditingUser({ ...editingUser, [e.target.name]: e.target.value });
  };

  const guardarEdicionUsuario = async (e) => {
    e.preventDefault();
    try {
        await axios.put(
            `https://kbnadmin-production.up.railway.app/administracion/users/${editingUser.id}`,
            editingUser,
            axiosConfig
        );
        alert("Usuario actualizado correctamente.");
        setIsModalOpen(false);
        fetchData();
    } catch (error) {
        console.error(error);
        alert("Error al actualizar usuario.");
    }
  };

  // --- ELIMINAR ---
  const eliminarUsuario = async (userId, userName) => {
    if (!window.confirm(`⚠️ ¿ELIMINAR a ${userName}? Esta acción es irreversible.`)) return;
    try {
      await axios.delete(`https://kbnadmin-production.up.railway.app/administracion/users/${userId}`, axiosConfig);
      setUsuarios(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert("Error al eliminar.");
    }
  };

  if (loading || authLoading) return <div className="p-10 text-center text-indigo-600 font-bold">Cargando Admin Panel...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6 bg-white shadow-xl rounded-xl pb-20">
      
      {/* HEADER Y CREAR ROL */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-800">⚙️ Gestión de Usuarios y Roles</h1>
        
        <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border">
            <input 
                type="text" 
                placeholder="Nuevo Rol (ej: MANAGER)" 
                className="p-2 border rounded text-sm"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
            />
            <button 
                onClick={crearRol}
                className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700"
            >
                + Crear Rol
            </button>
        </div>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rol & Permisos</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usuarios.map(user => (
              <tr key={user.id} className="hover:bg-indigo-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{user.nombre} {user.apellido}</div>
                    <div className="text-xs text-gray-500">ID: {user.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                      <select
                        value={user.rol?.id || ''}
                        onChange={(e) => handleRoleSelectChange(user.id, e.target.value)}
                        className="block w-32 py-1 px-2 border border-gray-300 rounded text-xs bg-white focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="" disabled>Sin Rol</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                      </select>
                      <button 
                        onClick={() => guardarCambioRol(user)}
                        title="Guardar cambio de rol"
                        className="text-green-600 hover:text-green-800"
                      >
                        💾
                      </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => openEditModal(user)}
                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-l border border-indigo-200 hover:bg-indigo-100"
                  >
                    Editar Datos
                  </button>
                  <button
                    onClick={() => eliminarUsuario(user.id, user.nombre)}
                    className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-r border border-red-200 hover:bg-red-100 border-l-0"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE EDICIÓN --- */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Editar Usuario</h2>
                <form onSubmit={guardarEdicionUsuario}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input 
                            name="nombre" 
                            value={editingUser.nombre} 
                            onChange={handleEditChange} 
                            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500" 
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Apellido</label>
                        <input 
                            name="apellido" 
                            value={editingUser.apellido} 
                            onChange={handleEditChange} 
                            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500" 
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input 
                            name="email" 
                            value={editingUser.email} 
                            onChange={handleEditChange} 
                            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500" 
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;