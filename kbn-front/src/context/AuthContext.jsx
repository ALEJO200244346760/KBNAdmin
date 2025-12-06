import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (e) {
    console.error('Error decoding token:', e);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [roles, setRoles] = useState([]);
  const [user, setUser] = useState({ nombre: '', apellido: '', role: '' });
  const [loading, setLoading] = useState(true); // NUEVO: estado de carga

  useEffect(() => {
    if (token) {
      const decodedToken = decodeToken(token);
      setRoles(decodedToken?.roles || []);
      setUser({
        nombre: decodedToken?.nombre || '',
        apellido: decodedToken?.apellido || '',
        role: decodedToken?.role || '',
      });
    } else {
      setRoles([]);
      setUser({ nombre: '', apellido: '', role: '' });
    }
    setLoading(false); // sesión cargada
  }, [token]);

  const login = (token) => {
    localStorage.setItem('token', token);
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setRoles([]);
    setUser({ nombre: '', apellido: '', role: '' });
  };

  return (
    <AuthContext.Provider value={{ token, roles, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { AuthContext };
