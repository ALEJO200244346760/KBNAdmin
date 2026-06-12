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
import Secretaria from './components/Secretaria';

// ── Pantalla de carga global ───────────────────────────────────────────────
const LoadingScreen = ({ mensaje = 'Cargando...' }) => (
  <div
    style={{
      minHeight: '100dvh',           // dvh: respeta la barra del navegador mobile
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid #e5e7eb',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'kbn-spin 0.7s linear infinite',
        margin: '0 auto 12px',
      }} />
      <p style={{
        fontSize: 12, fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#9ca3af',
      }}>
        {mensaje}
      </p>
    </div>
    <style>{`@keyframes kbn-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── Ruta privada por rol ───────────────────────────────────────────────────
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen mensaje="Verificando sesión..." />;
  if (!user?.role) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    switch (user.role) {
      case 'ADMINISTRADOR': return <Navigate to="/admin"       replace />;
      case 'SECRETARIA':    return <Navigate to="/secretaria"  replace />;
      case 'INSTRUCTOR':
      case 'ALUMNO':        return <Navigate to="/instructor"  replace />;
      default:              return <Navigate to="/login"       replace />;
    }
  }

  return children;
};

// ── Redirección raíz según rol ─────────────────────────────────────────────
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen mensaje="Cargando sesión..." />;
  if (!user?.role) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMINISTRADOR': return <Navigate to="/admin"       replace />;
    case 'SECRETARIA':    return <Navigate to="/secretaria"  replace />;
    case 'INSTRUCTOR':
    case 'ALUMNO':        return <Navigate to="/instructor"  replace />;
    default:              return <Navigate to="/login"       replace />;
  }
};

// ── App ────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <HashRouter>
        {/*
          El Header usa position: fixed, así que el contenido necesita
          padding-top igual a la altura real del header.

          Usamos una CSS variable --header-h que el propio Header puede
          setear vía JS si su altura cambia, con fallback a 64px.
          En móviles donde el header se hace más alto (wrap de items),
          esto previene que el contenido quede tapado.
        */}
        <style>{`
          :root { --header-h: 64px; }

          /* Asegura que el scroll funcione bien en iOS Safari */
          html, body, #root {
            height: 100%;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: none;
          }

          /* Evita zoom al tocar inputs en iOS (necesita font-size >= 16px) */
          input[type="text"],
          input[type="email"],
          input[type="password"],
          input[type="number"],
          input[type="tel"],
          input[type="date"],
          select,
          textarea {
            font-size: 16px !important;
          }

          /* Mejora táctil general */
          button, a, select, input, textarea {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
        `}</style>

        <Header />

        {/*
          padding-top usa la variable CSS en lugar de la clase Tailwind pt-16.
          env(safe-area-inset-top) cubre el notch de iPhones.
        */}
        <div style={{
          paddingTop: 'calc(var(--header-h) + env(safe-area-inset-top, 0px))',
          minHeight: '100dvh',
          boxSizing: 'border-box',
          backgroundColor: '#f9fafb',
        }}>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ADMINISTRADOR */}
            <Route
              path="/admin"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/reportes"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                  <ReporteEstadisticas />
                </PrivateRoute>
              }
            />

            {/* SECRETARIA */}
            <Route
              path="/secretaria"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR', 'SECRETARIA']}>
                  <Secretaria key={location.pathname} />
                </PrivateRoute>
              }
            />

            {/* INSTRUCTOR / ALUMNO / ADMIN */}
            <Route
              path="/instructor"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR', 'INSTRUCTOR', 'ALUMNO']}>
                  <InstructorForm />
                </PrivateRoute>
              }
            />

            {/* GESTIÓN DE USUARIOS */}
            <Route
              path="/usuarios"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                  <UserManagement />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;