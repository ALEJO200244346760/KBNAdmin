import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
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
    // Redirige según rol
    switch (user.role) {
      case 'ADMINISTRADOR':
        return <Navigate to="/reportes" replace />;
      case 'INSTRUCTOR':
      case 'ALUMNO':
        return <Navigate to="/instructor" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Redirección raíz según sesión y rol
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Cargando sesión...</div>;

  if (!user?.role) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMINISTRADOR':
      return <Navigate to="/reportes" replace />;
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
      <HashRouter>
        {/* HEADER SIEMPRE VISIBLE */}
        <Header />

        {/* CONTENIDO */}
        <div className="pt-16">{/* espacio para header fijo */}
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ADMINISTRADOR */}
            <Route
              path="/reportes"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                  <ReporteEstadisticas />
                </PrivateRoute>
              }
            />

            {/* INSTRUCTOR / ALUMNO / ADMIN también puede ver InstructorForm */}
            <Route
              path="/instructor"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR','INSTRUCTOR','ALUMNO']}>
                  <InstructorForm />
                </PrivateRoute>
              }
            />

            <Route path="/usuarios" element={<UserManagement />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
