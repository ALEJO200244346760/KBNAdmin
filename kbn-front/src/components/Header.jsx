import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NA = {
  primary: "#1ABFA0", dark: "#0F6E56", darker: "#085041",
  light: "#E1F5EE", mid: "#9FE1CB",
};

const ROLE_LABELS = {
  ADMINISTRADOR: "Administrador",
  SECRETARIA:    "Secretaria",
  INSTRUCTOR:    "Instructor",
  ALUMNO:        "Alumno",
};

// Rutas donde NO mostramos la flecha de volver (son "home" por rol)
const HOME_ROUTES = ["/", "/admin", "/secretaria", "/instructor", "/inicio"];

export default function Header() {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const headerRef = useRef(null);

  const isLoginPage = ["/login", "/forgot-password", "/reset-password", "/register"].includes(location.pathname);
  const isLogged    = !!user?.role;
  const role        = user?.role;
  const isHome      = HOME_ROUTES.includes(location.pathname);
  const displayName = user?.nombre || user?.name || user?.email?.split("@")[0] || "";

  // Actualizar --header-h con la altura real
  useEffect(() => {
    const update = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty("--header-h", `${headerRef.current.offsetHeight}px`);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [isLogged, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleBack = () => {
    // Volver al inicio según el rol
    switch (role) {
      case "ADMINISTRADOR": navigate("/inicio", { replace: true }); break;
      case "SECRETARIA":    navigate("/inicio", { replace: true }); break;
      case "INSTRUCTOR":    navigate("/inicio", { replace: true }); break;
      default:              navigate("/",       { replace: true }); break;
    }
  };

  // En páginas de login no mostramos header
  if (isLoginPage) return null;

  return (
    <header ref={headerRef} style={{
      position: "fixed", top: 0, left: 0, width: "100%", zIndex: 50,
      background: "#fff", borderBottom: "0.5px solid #e5e7eb",
      fontFamily: "system-ui, sans-serif",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      <div style={{
        height: 52, maxWidth: 1200, margin: "0 auto",
        padding: "0 14px", display: "flex",
        alignItems: "center", justifyContent: "space-between", gap: 10,
      }}>

        {/* Izquierda: flecha de volver O logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          {isLogged && !isHome ? (
            <button onClick={handleBack} aria-label="Volver al inicio"
              style={{ width: 36, height: 36, borderRadius: 10, border: "0.5px solid #e5e7eb", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280", flexShrink: 0 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 18 }} />
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              onClick={() => isLogged && navigate("/inicio")}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: NA.primary, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src="/logo.png" alt="NA" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { e.target.style.display = "none"; }} />
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>KBN Admin</p>
                <p style={{ margin: 0, fontSize: 10, color: "#9ca3af" }}>Náutica Atins</p>
              </div>
            </div>
          )}
        </div>

        {/* Centro: título de la sección actual (opcional, solo mobile) */}
        {isLogged && !isHome && (
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
            <PageTitle pathname={location.pathname} />
          </div>
        )}

        {/* Derecha: usuario + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
          {isLogged && (
            <>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{displayName}</span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{ROLE_LABELS[role] || role}</span>
              </div>
              <button onClick={handleLogout} aria-label="Cerrar sesión"
                style={{ width: 36, height: 36, borderRadius: 10, border: "0.5px solid #fca5a5", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#dc2626", flexShrink: 0 }}>
                <i className="ti ti-logout" style={{ fontSize: 17 }} />
              </button>
            </>
          )}
          {!isLogged && (
            <button onClick={() => navigate("/login")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: NA.dark, color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <i className="ti ti-login" style={{ fontSize: 14 }} /> Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// Muestra el nombre de la sección según la ruta
const PAGE_TITLES = {
  "/admin":      "Panel admin",
  "/secretaria": "Secretaría",
  "/reportes":   "Estadísticas",
  "/instructor": "Instructor",
  "/usuarios":   "Usuarios",
  "/monitor":    "Monitor",
  "/clientes":   "Clientes",
};

const PageTitle = ({ pathname }) => {
  const title = PAGE_TITLES[pathname];
  if (!title) return null;
  return <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{title}</span>;
};