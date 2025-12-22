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
  const clean = backendRole.replace("ROLE_", "");
  const roles = {
    ADMINISTRADOR: "ADMINISTRADOR",
    INSTRUCTOR: "INSTRUCTOR",
    SECRETARIA: "SECRETARIA",
    ALUMNO: "ALUMNO",
  };
  return roles[clean] || clean;
};

/* =========================
   Provider
========================= */
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
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

      // 1️⃣ Cargar usuario inmediato desde el JWT
      const initialUser = {
        id: decoded?.id || null,
        nombre: decoded?.nombre || '',
        apellido: decoded?.apellido || '',
        role: normalizeRole(decoded?.roles?.[0]),
        email: decoded?.sub,
      };

      setUser(initialUser);
      setLoading(false);

      // 2️⃣ Buscar ID real en backend (SIEMPRE con JWT)
      if (!initialUser.id && initialUser.email) {
        try {
          const res = await axios.get(
            'https://kbnadmin-production.up.railway.app/usuario',
            {
              headers: {
                Authorization: `Bearer ${token}`, // ✅ CLAVE
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
          console.error("No se pudo obtener el ID extra del servidor");
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
    <AuthContext.Provider value={{ token, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
