// src/context/UserContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../axiosConfig'; // Importa la instancia de Axios
const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const userData = await getUser(); // Obtiene el usuario actual
            setUser(userData);
        };

        fetchUser();
    }, []);

    return (
        <UserContext.Provider value={{ user }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    return useContext(UserContext);
};


// src/services/userService.js
export const getUser = async () => {
    const userId = localStorage.getItem('userId'); // Obtiene el ID del usuario almacenado
    if (!userId) return null;

    try {
        const response = await axios.get(`/usuario/${userId}`);
        return response.data; // Retorna solo el usuario actual
    } catch (error) {
        console.log(error);
        return null;
    }
};