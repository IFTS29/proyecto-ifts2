import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { IMGS } from "../imagenes";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";

const PESTANAS = [
  { id: "todos", label: "Todos" },
  { id: "visible", label: "Visibles" },
  { id: "oculto", label: "Ocultos" },
  { id: "archivado", label: "Archivados" },
];

function formatearFecha(fechaIso) {
  if (!fechaIso) return "";
  try {
    const d = new Date(fechaIso);
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${meses[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

function formatearHoraSincronizacion(fechaIso) {
  if (!fechaIso) return "aún no se ha realizado";
  try {
    const d = new Date(fechaIso);
    if (isNaN(d.getTime())) return "aún no se ha realizado";
    const hoy = new Date();
    const esHoy = d.toDateString() === hoy.toDateString();
    const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    if (esHoy) {
      return `hoy a las ${hora}`;
    }
    const fecha = d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `el ${fecha} a las ${hora}`;
  } catch {
    return "aún no se ha realizado";
  }
}

// Cuenta solo las fotos reales: la imagen de reemplazo no es una foto del evento.
function textoCantidadFotos(ev) {
  const cantidad = (ev.medios || []).filter(
    (m) => m.tipo === "IMAGE" && m.url && !m.url.includes("placeholder"),
  ).length;
  if (cantidad === 0) return ev.videoUrl ? "Video" : "Sin fotos";
  return `${cantidad} ${cantidad === 1 ? "foto" : "fotos"}`;
}

function renderEtiquetaEstado(estado) {
  switch (estado) {
    case "visible":
      return <span className="etiqueta et-verde">Visible</span>;
    case "oculto":
      return <span className="etiqueta et-gris">Oculto</span>;
    case "archivado":
      return <span className="etiqueta et-gris">Archivado</span>;
    default:
      return <span className="etiqueta et-gris">{estado}</span>;
  }
}

export default function AdminEventos() {
  const { usuario } = useAuth();
  const location = useLocation();
  // Aviso que deja otra pantalla al volver (por ejemplo, "Se guardaron los cambios…").
  const [aviso, setAviso] = useState(location.state?.aviso || "");
  const [cambiandoId, setCambiandoId] = useState(null);

  const [pestanaActiva, setPestanaActiva] = useState("todos");
  const [eventos, setEventos] = useState([]);
  const [conteos, setConteos] = useState({
    todos: 0,
    visible: 0,
    oculto: 0,
    archivado: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSync, setMensajeSync] = useState("");
  const [syncStatus, setSyncStatus] = useState({
    conectado: false,
    cuenta: "",
    hashtag: "#eventosIFTS2",
    ultimaSincronizacion: null,
    estado: "sin_sincronizar",
  });

  const cargarStatus = useCallback(async () => {
    try {
      const data = await api("/instagram/status");
      if (data) {
        setSyncStatus(data);
      }
    } catch {
      // Usar estado local por defecto
    }
  }, []);

  const cargarEventos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const ruta =
        pestanaActiva === "todos"
          ? "/events/admin"
          : `/events/admin?estado=${pestanaActiva}`;
      const data = await api(ruta);
      setEventos(data.eventos || []);
      if (data.conteos) {
        setConteos(data.conteos);
      }
    } catch (err) {
      setError(err.message || "Error al cargar los eventos.");
    } finally {
      setCargando(false);
    }
  }, [pestanaActiva]);

  useEffect(() => {
    cargarEventos();
    cargarStatus();
  }, [cargarEventos, cargarStatus]);

  // Ocultar o volver a mostrar un evento en el sitio, con confirmación. No borra nada.
  const cambiarVisibilidad = async (ev) => {
    const ocultar = ev.estado === "visible";
    const pregunta = ocultar
      ? `¿Ocultar «${ev.titulo}»? Deja de verse en el sitio, pero no se borra. Lo podés volver a mostrar cuando quieras.`
      : `¿Mostrar «${ev.titulo}» en el sitio?`;
    if (!window.confirm(pregunta)) return;

    setCambiandoId(ev.id);
    setError("");
    try {
      await api(`/events/${ev.id}/estado`, { metodo: "PATCH", cuerpo: { estado: ocultar ? "oculto" : "visible" } });
      setAviso(ocultar ? `«${ev.titulo}» ya no se ve en el sitio.` : `«${ev.titulo}» se ve otra vez en el sitio.`);
      await cargarEventos();
    } catch (err) {
      setError(err.message);
    } finally {
      setCambiandoId(null);
    }
  };

  const sincronizar = async () => {
    setSincronizando(true);
    setMensajeSync("");
    try {
      const res = await api("/instagram/sync", { metodo: "POST" });
      const guardados = res.nuevos ?? 0;
      setMensajeSync(
        res.success
          ? guardados > 0
            ? `¡Sincronización completada! (${guardados} ${guardados === 1 ? "nuevo evento guardado" : "nuevos eventos guardados"} en la base de datos)`
            : `Sincronización completada: al día (sin nuevas publicaciones con #eventosIFTS2)`
          : `Resultado: ${res.mensaje || res.message || res.error || "Listo"}`
      );
      await Promise.all([cargarEventos(), cargarStatus()]);
    } catch (err) {
      setMensajeSync(`Error: ${err.message || "No se pudo sincronizar con Instagram."}`);
      await cargarStatus();
    } finally {
      setSincronizando(false);
      setTimeout(() => setMensajeSync(""), 7000);
    }
  };

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
            <h1>Eventos</h1>
            <p>Eventos cargados desde el panel y publicaciones recibidas desde Instagram.</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              className="boton boton-linea"
              onClick={sincronizar}
              disabled={sincronizando}
              style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              {sincronizando ? "Sincronizando..." : "Sincronizar Instagram"}
            </button>
            <Link className="boton boton-verde" to="/admin-evento-nuevo">
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
              Cargar evento
            </Link>
          </div>
        </div>
        {aviso && (
          <p className="aviso visible" role="status" style={{ marginTop: 0, marginBottom: "1rem" }}>
            {aviso}
          </p>
        )}
        {mensajeSync && (
          <div
            style={{
              padding: "0.875rem 1.25rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              background: mensajeSync.startsWith("Error") ? "#fef2f2" : "#f0fdf4",
              color: mensajeSync.startsWith("Error") ? "#b91c1c" : "#15803d",
              border: `1px solid ${mensajeSync.startsWith("Error") ? "#fecaca" : "#bbf7d0"}`,
              fontWeight: "600",
            }}
          >
            {mensajeSync}
          </div>
        )}
        <div
          className="caja"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.875rem", alignItems: "center" }}>
            <span className="icono ic-naranja">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
            </span>
            <div>
              <strong>
                {syncStatus.conectado
                  ? `Instagram conectado: ${syncStatus.cuenta || "Activo"}`
                  : "Instagram: Sin conectar"}
              </strong>
              <p style={{ color: "var(--suave)", fontSize: "0.9375rem" }}>
                Se incorporan las publicaciones con {syncStatus.hashtag || "#eventosIFTS2"}. Última sincronización:{" "}
                {formatearHoraSincronizacion(syncStatus.ultimaSincronizacion)}.
              </p>
            </div>
          </div>
          {syncStatus.estado === "error" ? (
            <span className="etiqueta et-roja">Error de conexión</span>
          ) : syncStatus.conectado ? (
            <span className="etiqueta et-verde">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Funcionando
            </span>
          ) : (
            <span className="etiqueta et-gris">Sin sincronizar</span>
          )}
        </div>
        <div className="pestanas">
          {PESTANAS.map((p) => {
            const cantidad = p.id === "todos" ? conteos.todos : conteos[p.id] || 0;
            const seleccionada = pestanaActiva === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-selected={seleccionada}
                onClick={() => setPestanaActiva(p.id)}
              >
                {p.label} ({cantidad})
              </button>
            );
          })}
        </div>
        <p className="ayuda-tabla solo-celular">Deslizá la tabla hacia los costados para ver las acciones →</p>
        <div className="tabla-caja">
          <table>
            <thead>
              <tr>
                <th>Foto</th>
                <th>Evento</th>
                <th>Origen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "var(--suave)" }}>
                    Cargando eventos...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "var(--rojo, #dc2626)" }}>
                    {error}
                  </td>
                </tr>
              ) : eventos.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "var(--suave)" }}>
                    No hay eventos en esta sección.
                  </td>
                </tr>
              ) : (
                eventos.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <img
                        className="miniatura"
                        src={ev.fotoPrincipal || IMGS.PLATO}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.src = IMGS.PLATO;
                        }}
                      />
                    </td>
                    <td>
                      <strong>{ev.titulo}</strong>
                      <br />
                      <span style={{ color: "var(--suave)", fontSize: "0.875rem" }}>
                        {formatearFecha(ev.fechaEvento)}, {textoCantidadFotos(ev)}
                      </span>
                    </td>
                    <td>
                      <span className={"etiqueta " + (ev.origen === "instagram" ? "et-naranja" : "et-gris")}>
                        {ev.origen === "instagram" ? "Instagram" : "Manual"}
                      </span>
                    </td>
                    <td>{renderEtiquetaEstado(ev.estado)}</td>
                    <td>
                      <div className="acciones-fila">
                        <Link
                          className="boton-icono"
                          to={`/admin-evento-editar?id=${ev.id}`}
                          aria-label={`Editar ${ev.titulo}`}
                          title="Editar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                          </svg>
                        </Link>
                        {ev.estado !== "archivado" && (
                          // Con texto y no solo el ojo: el botón dice qué hace, sin confundirse con el estado.
                          <button
                            className="boton-icono con-texto"
                            type="button"
                            aria-label={`${ev.estado === "visible" ? "Ocultar" : "Mostrar"} ${ev.titulo}`}
                            disabled={cambiandoId === ev.id}
                            onClick={() => cambiarVisibilidad(ev)}
                          >
                            {ev.estado === "visible" ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6 0 10 7 10 7a17.6 17.6 0 0 1-3.3 4.1M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                            <span aria-hidden="true">{ev.estado === "visible" ? "Ocultar" : "Mostrar"}</span>
                          </button>
                        )}
                        {ev.estado === "visible" && (
                          <a
                            className="boton-icono"
                            href={`/evento?id=${ev.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ver ${ev.titulo} en el sitio (se abre en otra pestaña)`}
                            title="Ver en el sitio"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
