import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Cartel que se muestra sobre el sitio público cuando hay una sesión iniciada.
// Cerrado es un botón chico; al tocarlo se abre con el rol, el acceso al panel y el cierre de sesión.
export default function SesionFlotante() {
  const { usuario, autenticado, esAdmin, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  // Se cierra al cambiar de página.
  useEffect(() => setAbierto(false), [pathname]);

  // Se cierra con Escape y al tocar fuera del cartel.
  useEffect(() => {
    if (!abierto) return undefined;
    const tecla = (e) => e.key === "Escape" && setAbierto(false);
    const fuera = (e) => caja.current && !caja.current.contains(e.target) && setAbierto(false);
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", fuera);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("pointerdown", fuera);
    };
  }, [abierto]);

  if (!autenticado) return null;

  const rol = esAdmin ? "Administración" : "Bedelía";
  const salir = () => {
    logout();
    setAbierto(false);
    navigate("/login");
  };

  return (
    <div className="sesion-flotante" ref={caja}>
      {abierto && (
        <div className="sesion-caja" id="sesion-caja" role="region" aria-label="Sesión iniciada">
          <p>
            Sesión iniciada como
            <strong>{rol}</strong>
          </p>
          <Link className="sesion-panel" to="/admin">
            Volver al panel
          </Link>
          <button type="button" className="sesion-salir" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      )}
      <button
        type="button"
        className="sesion-boton"
        aria-expanded={abierto}
        aria-controls="sesion-caja"
        onClick={() => setAbierto((v) => !v)}
      >
        <span className="sesion-avatar" aria-hidden="true">
          {usuario.iniciales}
        </span>
        <span className="sesion-texto">{abierto ? "Cerrar menú" : "Sesión"}</span>
      </button>
    </div>
  );
}
