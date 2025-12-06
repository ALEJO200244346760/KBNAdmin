import React, { useState, useEffect } from 'react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Endpoint para listar todos los usuarios
      const response = await fetch('http://localhost:8080/api/users/all'); 
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      setLoading(false);
    }
  };

  const handleRoleChange = (userId, newRole) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
  };

  const saveRole = async (userId, role) => {
    try {
      const response = await fetch(`http://localhost:8080/api/users/role/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      if (response.ok) {
        alert("Rol actualizado con éxito!");
        // Opcional: recargar datos para asegurar consistencia
        fetchUsers(); 
      } else {
        alert("Error al actualizar el rol.");
      }
    } catch (error) {
      console.error("Error guardando rol:", error);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando usuarios...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestión de Usuarios y Roles</h1>
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol Actual</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cambiar Rol</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select 
                  value={user.role} 
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
                >
                  <option value="ADMIN">ADMINISTRADOR</option>
                  <option value="INSTRUCTOR">INSTRUCTOR</option>
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button 
                  onClick={() => saveRole(user.id, user.role)}
                  className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition-colors"
                >
                  Guardar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;