import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import InstructorForm from './components/InstructorForm';
import ReporteEstadisticas from './components/ReporteEstadisticas';
import UserManagement from './components/UserManagement';

// Componente para rutas privadas con rol
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user?.role) {
    // Si no hay rol definido, redirige al login
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Si el rol no está permitido, redirige a la ruta según rol
    switch (user.role) {
      case 'ADMINISTRADOR':
        return <Navigate to="/admin" replace />;
      case 'INSTRUCTOR':
      case 'ALUMNO':
        return <Navigate to="/instructor" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Componente para redirigir desde la raíz según sesión y rol
const HomeRedirect = () => {
  const { user } = useAuth();

  if (!user) {
    // No hay sesión, ir a login
    return <Navigate to="/login" replace />;
  }

  // Redirige según el rol
  switch (user.role) {
    case 'ADMINISTRADOR':
      return <Navigate to="/admin" replace />;
    case 'INSTRUCTOR':
    case 'ALUMNO':
      return <Navigate to="/instructor" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta raíz inteligente */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas privadas */}
          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/instructor"
            element={
              <PrivateRoute allowedRoles={['INSTRUCTOR', 'ALUMNO']}>
                <InstructorForm />
              </PrivateRoute>
            }
          />

          <Route path="/reportes" element={<ReporteEstadisticas />} />
          <Route path="/usuarios" element={<UserManagement />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
