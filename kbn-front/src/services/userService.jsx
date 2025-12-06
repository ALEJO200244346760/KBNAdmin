// src/services/userService.js
import axios from '../axiosConfig'; // Importa la instancia de Axios

// Obtener todos los usuarios
export const getUsers = async () => {
  try {
    const response = await axios.get('/usuario');
    return response.data;
  } catch (error) {
    handleAxiosError(error); // Manejo de errores con Axios
  }
};

// Manejo de errores de Axios
const handleAxiosError = (error) => {
  if (error.response) {
    console.error('Error en la respuesta:', error.response.data);
    throw new Error(error.response.data.message || 'Error en la solicitud');
  } else if (error.request) {
    console.error('No se recibió respuesta:', error.request);
    throw new Error('No se recibió respuesta del servidor');
  } else {
    console.error('Error:', error.message);
    throw new Error(error.message);
  }
};

// Actualizar rol de un usuario
export const updateUserRoleAndLocation = async (userId, roleName) => {
  try {
    const response = await axios.put(`/administracion/users/${userId}/roles`, {
      rol: roleName,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
};

// Actualizar ubicación de un usuario
export const updateUserLocation = async (userId, location) => {
  try {
    const response = await axios.put(`/usuario/${userId}/ubicacion`, location);
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
};

// Eliminar un usuario
export const deleteUser = async (userId) => {
  try {
    await axios.delete(`/administracion/users/${userId}`);
  } catch (error) {
    handleAxiosError(error);
  }
};

// Obtener todas las ubicaciones
export const getLocations = async () => {
  try {
    const response = await axios.get('/ubicaciones');
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
};

// Agregar una nueva ubicación
export const addLocation = async (locationName) => {
  if (!locationName || typeof locationName !== 'string') {
    throw new Error('El nombre de la ubicación debe ser un string válido');
  }

  try {
    const response = await axios.post('/ubicaciones', {
      nombre: locationName,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
};

// Actualizar una ubicación existente
export const updateLocation = async (locationId, locationName) => {
  if (!locationName || typeof locationName !== 'string') {
    throw new Error('El nombre de la ubicación debe ser un string válido');
  }

  try {
    const response = await axios.patch(`/ubicaciones/${locationId}`, {
      nombre: locationName,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
};

// Eliminar una ubicación
export const deleteLocation = async (locationId) => {
  try {
    await axios.delete(`/ubicaciones/${locationId}`);
  } catch (error) {
    handleAxiosError(error);
  }
};

// Obtener todos los roles
export const getRoles = async () => {
  try {
    const response = await axios.get('/administracion/roles');
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
};

// Agregar un nuevo rol
export const addRole = async (roleName) => {
  if (!roleName || typeof roleName !== 'string') {
    throw new Error('El nombre del rol debe ser un string válido');
  }

  try {
    const response = await axios.post('/administracion/roles', {
      nombre: roleName,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
};

// Actualizar un rol existente
export const updateRole = async (roleId, roleName) => {
  if (!roleName || typeof roleName !== 'string') {
    throw new Error('El nombre del rol debe ser un string válido');
  }

  try {
    const response = await axios.put(`/administracion/roles/${roleId}`, {
      nombre: roleName,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
};

// Eliminar un rol
export const deleteRole = async (roleId) => {
  try {
    await axios.delete(`/administracion/roles/${roleId}`);
  } catch (error) {
    handleAxiosError(error);
  }
};

// Obtener la información del usuario
export const getUserInfo = async (userId) => {
  try {
    const response = await axios.get(`/usuario/${userId}`);
    return response.data; // Asumiendo que la respuesta incluye la ubicación
  } catch (error) {
    handleAxiosError(error);
  }
};
