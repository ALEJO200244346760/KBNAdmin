import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header'; // <-- importamos
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import InstructorForm from './components/InstructorForm';
import ReporteEstadisticas from './components/ReporteEstadisticas';
import UserManagement from './components/UserManagement';

// Componente para rutas privadas con rol
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Cargando...</div>;

  if (!user?.role) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
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
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Cargando sesión...</div>;

  if (!user?.role) return <Navigate to="/login" replace />;

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
        {/* HEADER SIEMPRE VISIBLE */}
        <Header />

        {/* CONTENIDO */}
        <div className="pt-16"> {/* espacio para el header fijo */}
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

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
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
