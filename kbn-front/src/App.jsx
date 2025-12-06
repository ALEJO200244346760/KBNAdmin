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
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Si el rol no está permitido, redirige a la ruta alternativa
    return <Navigate to="/instructor" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
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
