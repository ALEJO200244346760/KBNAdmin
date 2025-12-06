import React, { useState } from 'react';
import axios from '../axiosConfig'; // Usa tu configuración de Axios
import { Link, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext'; // Importa el hook useAuth

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // Extrae la función login del contexto

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('/login', {
        email,
        password,
      });
      
      const token = response.data.token;
      
      // En lugar de solo guardar en localStorage, llama al método login de AuthContext
      login(token);
      
      console.log('Login exitoso:', response.data);
      navigate('/formulario'); // Redirige a la página principal
    } catch (error) {
      console.error('Error en el login:', error.response?.data);
      alert('Error en el inicio de sesión. Verifica tus credenciales.');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h2 className="text-2xl mb-6 text-center font-bold">Iniciar Sesión</h2>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Iniciar Sesión
        </button>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-800">Regístrate</Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
