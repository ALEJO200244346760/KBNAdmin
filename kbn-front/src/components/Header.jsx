import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  ADMINISTRADOR: "Administrador",
  SECRETARIA:    "Secretaria",
  INSTRUCTOR:    "Instructor",
  ALUMNO:        "Alumno",
};

const HOME_ROUTES = ["/", "/admin", "/secretaria", "/instructor", "/inicio"];
const DARK_ROUTES = ["/inicio", "/secretaria", "/monitor"];

export default function Header() {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const headerRef = useRef(null);

  const isLoginPage  = ["/login", "/forgot-password", "/reset-password", "/register"].includes(location.pathname);
  const isLogged     = !!user?.role;
  const role         = user?.role;
  const isHome       = HOME_ROUTES.includes(location.pathname);
  const isDark       = DARK_ROUTES.includes(location.pathname);
  const displayName  = user?.nombre || user?.name || user?.email?.split("@")[0] || "";

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

  const handleLogout = async () => { await logout(); navigate("/login", { replace: true }); };
  const handleBack   = () => navigate("/inicio", { replace: true });

  if (isLoginPage) return null;

  const textColor   = isDark ? "rgba(255,255,255,.9)"  : "#111827";
  const subColor    = isDark ? "rgba(255,255,255,.4)"  : "#9ca3af";
  const borderColor = isDark ? "rgba(255,255,255,.1)"  : "#e5e7eb";
  const bgHeader    = isDark ? "transparent"            : "#fff";

  return (
    <header ref={headerRef} style={{
      position: "fixed", top: 0, left: 0, width: "100%", zIndex: 50,
      background: bgHeader,
      borderBottom: isDark ? "none" : `0.5px solid ${borderColor}`,
      fontFamily: "system-ui, sans-serif",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      <div style={{
        height: 56, maxWidth: 1200, margin: "0 auto",
        padding: "0 16px", display: "flex",
        alignItems: "center", justifyContent: "space-between", gap: 10,
      }}>

        {/* Izquierda */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          {isLogged && !isHome ? (
            <button onClick={handleBack}
              style={{ width: 36, height: 36, borderRadius: 10,
                border: `0.5px solid ${borderColor}`,
                background: isDark ? "rgba(255,255,255,.08)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: textColor, flexShrink: 0 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 18 }} />
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              onClick={() => isLogged && navigate("/inicio")}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                border: `2px solid ${isDark ? "rgba(46,207,196,.5)" : "#2ECFC440"}`,
                boxShadow: isDark ? "0 0 16px rgba(46,207,196,.3)" : "none",
              }}>
                <img src="/logo.png" alt="NA"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { e.target.style.display = "none"; }} />
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textColor }}>KBN Admin</p>
                <p style={{ margin: 0, fontSize: 10, color: subColor }}>Náutica Atins</p>
              </div>
            </div>
          )}
        </div>

        {/* Centro */}
        {isLogged && !isHome && (
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
            <PageTitle pathname={location.pathname} color={textColor} />
          </div>
        )}

        {/* Derecha */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
          {isLogged && (
            <>
              <div style={{ textAlign: "right", lineHeight: 1.3 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: textColor }}>{displayName}</p>
                <p style={{ margin: 0, fontSize: 10, color: subColor }}>{ROLE_LABELS[role] || role}</p>
              </div>
              <button onClick={handleLogout}
                style={{ width: 36, height: 36, borderRadius: 10,
                  border: `0.5px solid ${isDark ? "rgba(239,68,68,.4)" : "#fca5a5"}`,
                  background: isDark ? "rgba(239,68,68,.1)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#ef4444", flexShrink: 0 }}>
                <i className="ti ti-logout" style={{ fontSize: 17 }} />
              </button>
            </>
          )}
          {!isLogged && (
            <button onClick={() => navigate("/login")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9,
                fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <i className="ti ti-login" style={{ fontSize: 14 }} /> Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

const PAGE_TITLES = {
  "/secretaria": "Secretaría",
  "/reportes":   "Estadísticas",
  "/instructor": "Instructores",
  "/usuarios":   "Usuarios",
  "/monitor":    "Monitor",
  "/clientes":   "Clientes",
  "/mis-stats":  "Mis estadísticas",
};

const PageTitle = ({ pathname, color }) => {
  const title = PAGE_TITLES[pathname];
  if (!title) return null;
  return <span style={{ fontSize: 15, fontWeight: 700, color }}>{title}</span>;
};