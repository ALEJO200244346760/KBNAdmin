import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

/* =========================
   Helpers
========================= */

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

/* =========================
   Provider
========================= */

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

      // Usuario base desde el JWT
      const initialUser = {
        id: decoded.id || null,
        nombre: decoded.nombre || '',
        apellido: decoded.apellido || '',
        email: decoded.sub,
        role: normalizeRole(decoded.roles?.[0]),
      };

      setUser(initialUser);
      setLoading(false);

      // Si el token NO trae ID, lo buscamos en backend (con JWT)
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

  /* =========================
     Auth actions
  ========================= */

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

/* =========================
   Hook
========================= */

export const useAuth = () => useContext(AuthContext);
