import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";
import { datosDelInicio } from "../adminInicio.js";

export default function AdminInicio() {
  const { esAdmin, usuario } = useAuth();
  // Cada consulta: null mientras carga; después { ok: true, datos } u { ok: false }.
  const [eventos, setEventos] = useState(null);
  const [horarios, setHorarios] = useState(null);

  useEffect(() => {
    let activo = true;
    const consultar = (ruta, guardar) =>
      api(ruta).then(
        (datos) => activo && guardar({ ok: true, datos }),
        () => activo && guardar({ ok: false }),
      );
    consultar("/academic/vigente", setHorarios);
    // Bedelía no consulta los eventos: no tiene permiso y el inicio no se los muestra.
    if (esAdmin) consultar("/events/admin", setEventos);
    return () => {
      activo = false;
    };
  }, [esAdmin]);

  const { eventosVisibles, horariosPublicados, actividad } = datosDelInicio({ esAdmin, eventos, horarios });

  return (
    <div className="admin activa">
      <AdminLateral />
      <main className="contenido-admin">
        <div className="barra-admin">
          <span className="usuario">
            <span className="avatar">{usuario.iniciales}</span>
            {usuario.nombre}
          </span>
        </div>
        <div className="cab-admin">
          <div>
            <h1 id="saludo-admin">Hola, {usuario.saludo}</h1>
            <p>¿Qué querés actualizar hoy?</p>
          </div>
        </div>
        <div className="atajos">
          {esAdmin && (
            <Link className="atajo at-1" to="/admin-evento-nuevo">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <div>
                <strong>Cargar un evento</strong>
                <br />
                <span>Fotos, fecha y descripción</span>
              </div>
            </Link>
          )}
          <Link className="atajo at-2" to="/admin-academica">
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
            <div>
              <strong>Gestionar horarios</strong>
              <br />
              <span>Cargar, modificar y publicar horarios académicos</span>
            </div>
          </Link>
          {esAdmin && (
            <Link className="atajo at-3" to="/admin-eventos">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              <div>
                <strong>Eventos e Instagram</strong>
                <br />
                <span>Editar, ocultar y sincronizar con Instagram</span>
              </div>
            </Link>
          )}
        </div>
        <div className="resumen">
          {esAdmin && (
            <Link className="dato" to="/admin-eventos">
              <span>Eventos visibles</span>
              <strong className={typeof eventosVisibles === "number" ? undefined : "dato-texto"}>{eventosVisibles}</strong>
            </Link>
          )}
          <Link className="dato" to="/admin-academica">
            <span>Horarios publicados</span>
            {horariosPublicados.map((texto) => (
              <strong key={texto} className="dato-texto">
                {texto}
              </strong>
            ))}
          </Link>
        </div>
        <div className="caja">
          <h2>Actividad reciente</h2>
          {actividad.estado === "cargando" && <p>Cargando…</p>}
          {actividad.estado === "error" && <p>No se pudo cargar la actividad reciente.</p>}
          {actividad.estado === "vacia" && <p>Todavía no hay actividad registrada.</p>}
          {actividad.estado === "lista" && (
            <ul className="actividad">
              {actividad.items.map((item) => (
                <li key={item.clave}>
                  <span>
                    {item.accion} <strong>{item.detalle}</strong>
                  </span>
                  <time dateTime={item.fechaIso}>{item.fecha}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
