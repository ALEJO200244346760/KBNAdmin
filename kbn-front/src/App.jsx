import { useState } from "react";
import "./App.css";

import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import InstructorForm from "./components/InstructorForm";
import Register from "./components/Register";
import ReporteEstadisticas from "./components/ReporteEstadisticas";
import UserManagement from "./components/UserManagement";

function App() {
  const [userLogged, setUserLogged] = useState(false);

  // Cuando el usuario inicia sesión, se actualiza el estado
  const handleLoginSuccess = () => {
    setUserLogged(true);
  };

  return (
    <>
      {!userLogged ? (
        // 👇 Primera pantalla: LOGIN
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        // 👇 Pantalla después de iniciar sesión
        <AdminDashboard />
      )}
    </>
  );
}

export default App;
