import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  ADMINISTRADOR: "Administrador",
  SECRETARIA: "Secretaria",
  INSTRUCTOR: "Instructor",
  ALUMNO: "Alumno",
};

const ROLE_INITIALS = {
  ADMINISTRADOR: "AD",
  SECRETARIA: "SE",
  INSTRUCTOR: "IN",
  ALUMNO: "AL",
};

const NA = {
  primary: "#1ABFA0",
  dark:    "#0F6E56",
  darker:  "#085041",
  light:   "#E1F5EE",
  mid:     "#9FE1CB",
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const headerRef = useRef(null);

  const isLoginPage  = location.pathname === "/login";
  const isLogged     = !!user?.role;
  const role         = user?.role;
  const isAdmin      = role === "ADMINISTRADOR";
  const isSecretaria = role === "SECRETARIA";
  const isInstructor = role === "INSTRUCTOR" || role === "ALUMNO";

  const displayName = user?.nombre || user?.name || user?.email?.split("@")[0] || "Usuario";
  const initials    = ROLE_INITIALS[role] || "?";

  // ── Medir altura real y actualizar --header-h ─────────────────
  useEffect(() => {
    const update = () => {
      if (headerRef.current) {
        const h = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [isLogged, menuOpen, role]);

  // ── Cerrar menú al navegar ────────────────────────────────────
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // ── Bloquear scroll cuando el menú está abierto (mobile) ─────
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const goTo = (path) => {
    setMenuOpen(false);
    setActiveTab(path);
    navigate(path, { replace: true });
  };

  const isActive = (path) => activeTab === path || location.pathname === path;

  const navItems = [
    { path: "/admin",      label: "Panel admin",  icon: "ti-layout-dashboard", show: isAdmin },
    { path: "/instructor", label: "Instructor",   icon: "ti-school",            show: isAdmin || isInstructor },
    { path: "/secretaria", label: "Secretaria",   icon: "ti-file-text",         show: isAdmin || isSecretaria },
    { path: "/reportes",   label: "Estadísticas", icon: "ti-chart-bar",         show: isAdmin },
  ].filter((i) => i.show);

  return (
    <>
      <header
        ref={headerRef}
        style={{
          position: "fixed", top: 0, left: 0, width: "100%", zIndex: 50,
          background: "#fff", borderBottom: "0.5px solid #e5e7eb",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* ── Barra principal ────────────────────────────────── */}
        <div style={{
          height: 56, maxWidth: 1200, margin: "0 auto",
          padding: "0 16px", display: "flex",
          alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>

          {/* Logo */}
          <div onClick={() => goTo("/")} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", background: NA.primary,
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <img src="/logo.png" alt="Náutica Atins" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>KBN Admin</span>
              <span style={{ fontSize: 10, color: "#9ca3af", letterSpacing: ".04em" }}>Náutica Atins</span>
            </div>
          </div>

          {/* ── Desktop nav (md+) ── */}
          <div className="kbn-desktop-nav" style={{ display: "none", alignItems: "center", gap: 6 }}>
            {isLogged && (
              <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 99, background: NA.light, color: NA.darker, border: `0.5px solid ${NA.mid}`, marginRight: 6 }}>
                {ROLE_LABELS[role] || role}
              </span>
            )}
            {isLogged && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 10px 3px 3px", borderRadius: 99, border: "0.5px solid #e5e7eb", background: "#f9fafb", marginRight: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: NA.dark, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
                  {initials}
                </div>
                <span style={{ fontSize: 12, color: "#374151" }}>{displayName}</span>
              </div>
            )}
            {!isLogged && !isLoginPage && (
              <button onClick={() => goTo("/login")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: NA.dark, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "system-ui,sans-serif" }}>
                <i className="ti ti-login" style={{ fontSize: 15 }} aria-hidden="true" /> Iniciar sesión
              </button>
            )}
            {isLogged && (
              <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "transparent", color: "#dc2626", border: "0.5px solid #fca5a5", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "system-ui,sans-serif" }}>
                <i className="ti ti-logout" style={{ fontSize: 15 }} aria-hidden="true" /> Cerrar sesión
              </button>
            )}
          </div>

          {/* ── Mobile right (badge + burger) ── */}
          <div className="kbn-mobile-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isLogged && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: NA.light, color: NA.darker, border: `0.5px solid ${NA.mid}`, whiteSpace: "nowrap" }}>
                {ROLE_LABELS[role] || role}
              </span>
            )}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              style={{ width: 36, height: 36, borderRadius: 8, border: "0.5px solid #e5e7eb", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280", flexShrink: 0 }}
            >
              <i className={`ti ${menuOpen ? "ti-x" : "ti-menu-2"}`} style={{ fontSize: 20 }} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Desktop tab bar ── */}
        {isLogged && navItems.length > 0 && (
          <div className="kbn-tab-bar" style={{ display: "none", borderTop: "0.5px solid #e5e7eb", padding: "0 16px", overflowX: "auto" }}>
            {navItems.map((item) => (
              <button key={item.path} onClick={() => goTo(item.path)} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "0 14px", height: 40, fontSize: 13, whiteSpace: "nowrap",
                border: "none", borderBottom: `2px solid ${isActive(item.path) ? NA.dark : "transparent"}`,
                background: "transparent", color: isActive(item.path) ? NA.dark : "#6b7280",
                fontWeight: isActive(item.path) ? 500 : 400, cursor: "pointer",
                transition: "color .15s, border-color .15s", fontFamily: "system-ui,sans-serif",
              }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Mobile menu drawer ── */}
        {menuOpen && (
          <div className="kbn-mobile-menu" style={{ borderTop: "0.5px solid #e5e7eb", background: "#fff" }}>

            {isLogged && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "0.5px solid #f3f4f6" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: NA.dark, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                  {initials}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#111827" }}>{displayName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{ROLE_LABELS[role] || role}</p>
                </div>
              </div>
            )}

            {navItems.map((item) => (
              <button key={item.path} onClick={() => goTo(item.path)} style={{
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "15px 16px",
                background: isActive(item.path) ? NA.light : "transparent",
                border: "none", borderBottom: "0.5px solid #f3f4f6",
                color: isActive(item.path) ? NA.darker : "#374151",
                fontSize: 15, fontFamily: "system-ui,sans-serif",
                cursor: "pointer", textAlign: "left",
              }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 20, width: 24, flexShrink: 0, color: isActive(item.path) ? NA.dark : "#9ca3af" }} aria-hidden="true" />
                <span style={{ flex: 1 }}>{item.label}</span>
                <i className="ti ti-chevron-right" style={{ fontSize: 14, color: "#d1d5db" }} aria-hidden="true" />
              </button>
            ))}

            <div style={{ height: 8, background: "#f9fafb" }} />

            {!isLogged && !isLoginPage && (
              <button onClick={() => goTo("/login")} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "15px 16px", background: "transparent", border: "none", color: NA.dark, fontSize: 15, fontFamily: "system-ui,sans-serif", cursor: "pointer" }}>
                <i className="ti ti-login" style={{ fontSize: 20, width: 24 }} aria-hidden="true" /> Iniciar sesión
              </button>
            )}
            {isLogged && (
              <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "15px 16px", background: "transparent", border: "none", color: "#dc2626", fontSize: 15, fontFamily: "system-ui,sans-serif", cursor: "pointer" }}>
                <i className="ti ti-logout" style={{ fontSize: 20, width: 24 }} aria-hidden="true" /> Cerrar sesión
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── Responsive CSS ── */}
      <style>{`
        @media (min-width: 768px) {
          .kbn-mobile-right { display: none !important; }
          .kbn-mobile-menu  { display: none !important; }
          .kbn-desktop-nav  { display: flex !important; }
          .kbn-tab-bar      { display: flex !important; }
        }
        @media (max-width: 767px) {
          .kbn-desktop-nav  { display: none !important; }
          .kbn-tab-bar      { display: none !important; }
        }
      `}</style>
    </>
  );
}