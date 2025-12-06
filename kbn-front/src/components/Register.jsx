import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig'; // Usa tu configuración de Axios

function Register() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [ubicacionId, setUbicacion] = useState('');
  const [password, setPassword] = useState('');
  const [ubicaciones, setUbicaciones] = useState([]);

  useEffect(() => {
    // Obtener ubicaciones desde el backend
    const fetchUbicaciones = async () => {
      try {
        const response = await axios.get('/ubicaciones');
        setUbicaciones(response.data);
      } catch (error) {
        console.error('Error obteniendo ubicaciones:', error);
      }
    };

    fetchUbicaciones();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('/register', {
        nombre,
        apellido,
        email,
        ubicacionId,
        password,
      });
      console.log('Usuario registrado:', response.data);
      // Puedes redirigir al usuario o mostrar un mensaje de éxito aquí
    } catch (error) {
      console.error('Error registrando usuario:', error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-center">Registrar Usuario</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Nombre:</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Apellido:</label>
            <input
              type="text"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Ubicación:</label>
            <select
              value={ubicacionId}
              onChange={(e) => setUbicacion(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Seleccione una ubicación</option>
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Registrar
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
