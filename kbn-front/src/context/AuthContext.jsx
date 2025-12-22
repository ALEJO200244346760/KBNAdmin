import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

/* ---------------------------------------------------
   Decodificar JWT sin librerías
--------------------------------------------------- */
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

/* ---------------------------------------------------
   Normalizar roles del backend → roles del frontend
--------------------------------------------------- */
const normalizeRole = (backendRole) => {
  if (!backendRole) return null;

  const clean = backendRole.replace("ROLE_", "");

  switch (clean) {
    case "ADMINISTRADOR":
      return "ADMINISTRADOR";
    case "INSTRUCTOR":
      return "INSTRUCTOR";
    case "SECRETARIA":   // <-- agregado
      return "SECRETARIA";
    case "ALUMNO":
      return "ALUMNO";
    default:
      return clean;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [roles, setRoles] = useState([]);
  const [user, setUser] = useState({ id: null, nombre: '', apellido: '', role: '' });
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------------
     Cada vez que token cambie, actualizamos usuario
  --------------------------------------------------- */
  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);

      const backendRole = decoded?.roles?.[0] || null;
      const normalizedRole = normalizeRole(backendRole);

      setRoles(decoded?.roles || []);
      setUser({
        id: decoded?.id || decoded?.sub || null, // <-- agregamos ID
        nombre: decoded?.nombre || '',
        apellido: decoded?.apellido || '',
        role: normalizedRole || '',
      });

      console.log("🔐 JWT completo decodificado:", decoded);
      console.log("🔐 JWT ROLE:", backendRole);
      console.log("🎭 FRONT ROLE:", normalizedRole);

    } else {
      setRoles([]);
      setUser({ id: null, nombre: '', apellido: '', role: '' });
    }

    setLoading(false);
  }, [token]);

  /* ---------------------------------------------------
     Login: guardar y activar token
  --------------------------------------------------- */
  const login = (token) => {
    localStorage.setItem('token', token);
    setToken(token);
  };

  /* ---------------------------------------------------
     Logout
  --------------------------------------------------- */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setRoles([]);
    setUser({ id: null, nombre: '', apellido: '', role: '' });
  };

  return (
    <AuthContext.Provider value={{ token, roles, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { AuthContext };
