import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { IMGS } from "../imagenes";
import { useAuth } from "../context/AuthContext.jsx";
import { RUTA_CONTENIDO, SECCIONES_CONTENIDO, enlaceSeccion } from "../seccionesContenido.js";

export default function AdminLateral() {
  const { esAdmin, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const enContenido = pathname === RUTA_CONTENIDO;
  const seccionActual = enContenido ? params.get("seccion") : null;
  // El submenú de Contenido institucional se abre al entrar a esa pantalla y se puede plegar a mano.
  const [abierto, setAbierto] = useState(enContenido);

  const cls = (...rutas) => "item" + (rutas.includes(pathname) ? " actual" : "");
  const salir = (e) => {
    e.preventDefault();
    logout();
    navigate("/login");
  };

  return (
    <aside className="lateral">
      <Link className="marca" to="/admin">
        <img src={IMGS.LOGO} alt="Logo del IFTS N.° 2" />
        <span>
          <strong>IFTS N.° 2</strong>
          <small>Panel de administración</small>
        </span>
      </Link>
      <Link className={cls("/admin")} to="/admin">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
        <span>Inicio</span>
      </Link>
      {esAdmin && (
        <Link className={cls("/admin-eventos", "/admin-evento-nuevo")} to="/admin-eventos">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
          <span>Eventos</span>
        </Link>
      )}
      <Link className={cls("/admin-academica", "/admin-mesas")} to="/admin-academica">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>Información académica</span>
      </Link>
      {esAdmin && (
        <>
          {enContenido ? (
            <button
              type="button"
              className="item actual"
              aria-expanded={abierto}
              aria-controls="submenu-contenido"
              onClick={() => setAbierto((v) => !v)}
            >
              <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <path d="M14 3v6h6M8 13h8M8 17h5" />
          </svg>
              <span>Contenido institucional</span>
              <svg className={"flecha-sub" + (abierto ? " abierta" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          ) : (
            <Link className="item" to={RUTA_CONTENIDO}>
              <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <path d="M14 3v6h6M8 13h8M8 17h5" />
          </svg>
              <span>Contenido institucional</span>
              <svg className="flecha-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </Link>
          )}
          {enContenido && abierto && (
            <ul className="submenu" id="submenu-contenido">
              {SECCIONES_CONTENIDO.map((s) => (
                <li key={s.clave}>
                  {s.clave === seccionActual ? (
                    <button type="button" className="subitem actual" aria-current="page">
                      {s.titulo}
                    </button>
                  ) : (
                    <Link className="subitem" to={enlaceSeccion(s.clave)}>
                      {s.titulo}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}{" "}
      {esAdmin && (
        <Link className={cls("/admin-usuarios")} to="/admin-usuarios">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.2.7 4 2.5 4 5.5" />
          </svg>
          <span>Usuarios</span>
        </Link>
      )}
      <div className="abajo">
        <Link className="item" to="/">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Ver el sitio</span>
        </Link>
        <Link className="item" to="/login" onClick={salir}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span>Cerrar sesión</span>
        </Link>
      </div>
    </aside>
  );
}
