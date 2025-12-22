import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
};

const normalizeRole = (backendRole) => {
  if (!backendRole) return null;
  return backendRole.replace('ROLE_', '');
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const decoded = decodeToken(token);

      if (!decoded) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const initialUser = {
        id: decoded.id || null,
        nombre: decoded.nombre || '',
        apellido: decoded.apellido || '',
        email: decoded.sub,
        role: normalizeRole(decoded.roles?.[0]),
      };

      setUser(initialUser);
      setLoading(false);

      if (!initialUser.id && initialUser.email) {
        try {
          const res = await axios.get(
            'https://kbnadmin-production.up.railway.app/usuario',
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const usuarioEncontrado = res.data.find(
            (u) => u.email === initialUser.email
          );

          if (usuarioEncontrado) {
            setUser((prev) => ({
              ...prev,
              id: usuarioEncontrado.id,
            }));
          }
        } catch (error) {
          console.error('No se pudo obtener el ID extra del servidor');
        }
      }
    };

    initializeAuth();
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
