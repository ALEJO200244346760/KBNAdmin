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
  const [user, setUser] = useState({ 
    nombre: '', 
    apellido: '', 
    role: '', 
    ubicacion: '',
  });

  useEffect(() => {
    if (token) {
      const decodedToken = decodeToken(token);
      setRoles(decodedToken?.roles || []);
      setUser({
        nombre: decodedToken?.nombre || '',
        apellido: decodedToken?.apellido || '',
        role: decodedToken?.role || '',
        ubicacion: decodedToken?.ubicacion || '',
      });
    } else {
      setRoles([]);
      setUser({ nombre: '', apellido: '', role: '', ubicacion: '' });
    }
  }, [token]);

  const login = (token) => {
    localStorage.setItem('token', token);
    setToken(token);
    const decodedToken = decodeToken(token);
    setRoles(decodedToken?.roles || []);
    setUser({
      nombre: decodedToken?.nombre || '',
      apellido: decodedToken?.apellido || '',
      role: decodedToken?.role || '',
      ubicacion: decodedToken?.ubicacion || '',
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setRoles([]);
    setUser({ nombre: '', apellido: '', role: '', ubicacion: '' });
  };

  return (
    <AuthContext.Provider value={{ token, roles, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
export const useAuth = () => useContext(AuthContext);
