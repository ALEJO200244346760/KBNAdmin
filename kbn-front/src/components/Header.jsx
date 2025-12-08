import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isLoginPage = location.pathname === "/login";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path, { replace: true });
  };

  return (
    <header className="bg-white shadow-md fixed top-0 left-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo + KBN */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => goTo("/")}>
          <img src="/logo.png" alt="KBN Logo" className="h-10 w-10 object-contain" />
          <span className="text-2xl font-bold tracking-wide text-gray-800">KBN</span>
        </div>

        {/* Botón menú móvil */}
        <button className="md:hidden p-2 rounded focus:outline-none" onClick={() => setMenuOpen(!menuOpen)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
            )}
          </svg>
        </button>

        {/* Opciones escritorio */}
        <nav className="hidden md:flex items-center gap-6 text-gray-700 font-medium">
          {user?.role === "ADMINISTRADOR" && (
            <>
              <button onClick={() => goTo("/admin")} className="hover:text-blue-600 transition-colors">Panel Admin</button>
              <button onClick={() => goTo("/instructor")} className="hover:text-blue-600 transition-colors">Instructor</button>
              <button onClick={() => goTo("/reportes")} className="hover:text-blue-600 transition-colors">Estadísticas</button>
            </>
          )}

          {(user?.role === "INSTRUCTOR" || user?.role === "ALUMNO") && (
            <button onClick={() => goTo("/instructor")} className="hover:text-blue-600 transition-colors">Instructor</button>
          )}

          {!user && !isLoginPage && (
            <button onClick={() => goTo("/login")} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">Iniciar sesión</button>
          )}

          {user && (
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition">Cerrar sesión</button>
          )}
        </nav>
      </div>

      {/* Menú móvil */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-md py-3 px-4 space-y-3 text-gray-700 font-medium">
          {user?.role === "ADMINISTRADOR" && (
            <>
              <button className="block py-1 w-full text-left" onClick={() => goTo("/admin")}>Panel Admin</button>
              <button className="block py-1 w-full text-left" onClick={() => goTo("/instructor")}>Instructor</button>
              <button className="block py-1 w-full text-left" onClick={() => goTo("/reportes")}>Estadísticas</button>
            </>
          )}

          {(user?.role === "INSTRUCTOR" || user?.role === "ALUMNO") && (
            <button className="block py-1 w-full text-left" onClick={() => goTo("/instructor")}>Instructor</button>
          )}

          {!user && !isLoginPage && (
            <button className="block bg-blue-600 text-white py-2 px-3 rounded-md w-full text-center" onClick={() => goTo("/login")}>Iniciar sesión</button>
          )}

          {user && (
            <button onClick={handleLogout} className="w-full bg-red-500 text-white py-2 rounded-md">Cerrar sesión</button>
          )}
        </div>
      )}
    </header>
  );
}
