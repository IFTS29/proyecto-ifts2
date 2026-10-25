import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { IMGS } from "../imagenes";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";

const PERIODOS = {
  "Por año": ["2025", "2026"],
  "Por cuatrimestre": ["1.° cuatrimestre 2026", "2.° cuatrimestre 2025", "1.° cuatrimestre 2025"],
  "Un evento": ["Noche de los Museos"],
};

const PESTANAS = [
  { id: "todos", label: "Todos" },
  { id: "para_revisar", label: "Para revisar" },
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

function renderEtiquetaEstado(estado) {
  switch (estado) {
    case "visible":
      return <span className="etiqueta et-verde">Visible</span>;
    case "para_revisar":
      return <span className="etiqueta et-naranja">Para revisar</span>;
    case "oculto":
      return <span className="etiqueta et-gris">Oculto</span>;
    case "archivado":
      return <span className="etiqueta et-gris">Archivado</span>;
    case "descartado":
      return <span className="etiqueta et-roja">Descartado</span>;
    default:
      return <span className="etiqueta et-gris">{estado}</span>;
  }
}

export default function AdminEventos() {
  const { esAdmin, usuario } = useAuth();

  const [alcance, setAlcance] = useState("Por año");
  const [periodo, setPeriodo] = useState(PERIODOS["Por año"][0]);
  const [msg, setMsg] = useState("");

  const [pestanaActiva, setPestanaActiva] = useState("todos");
  const [eventos, setEventos] = useState([]);
  const [conteos, setConteos] = useState({
    todos: 0,
    para_revisar: 0,
    visible: 0,
    oculto: 0,
    archivado: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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
  }, [cargarEventos]);

  const cambiarAlcance = (valor) => {
    setAlcance(valor);
    setPeriodo(PERIODOS[valor][0]);
  };

  const descargar = () =>
    setMsg("Se preparó la descarga: " + alcance.toLowerCase() + ", " + periodo + ".");

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
              <strong>Instagram conectado: @ifts_2_ok</strong>
              <p style={{ color: "var(--suave)", fontSize: "0.9375rem" }}>
                Se incorporan las publicaciones con #IFTSEventos. Revisión diaria; la última fue hoy
                a las 6:00.
              </p>
            </div>
          </div>
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
        </div>
        {esAdmin && (
          <div className="caja descarga-archivo">
            <div>
              <strong>Descargar lo archivado</strong>
              <p style={{ color: "var(--suave)", fontSize: "0.9375rem" }}>
                Guardá una copia de los eventos archivados en tu computadora para llevarla a un
                Drive o a un disco externo.
              </p>
            </div>
            <div className="descarga-controles">
              <label htmlFor="d-alcance" className="solo-lectores">
                Qué descargar
              </label>
              <select
                id="d-alcance"
                value={alcance}
                onChange={(e) => cambiarAlcance(e.target.value)}
              >
                <option>Por año</option>
                <option>Por cuatrimestre</option>
                <option>Un evento</option>
              </select>
              <select
                id="d-periodo"
                aria-label="Período"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
              >
                {PERIODOS[alcance].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <button
                className="boton boton-verde boton-chico"
                type="button"
                id="d-boton"
                onClick={descargar}
              >
                Descargar
              </button>
            </div>
            <p className={"aviso" + (msg ? " visible" : "")} id="ok-descarga" role="status">
              {msg}
            </p>
          </div>
        )}
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
                        {formatearFecha(ev.fechaEvento)}, {ev.cantidadMedios || (ev.medios && ev.medios.length) || 1} fotos
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
                        <Link className="boton boton-linea boton-chico" to="/admin-evento-nuevo">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M4 20h4L19 9l-4-4L4 16z" />
                          </svg>
                          Editar
                        </Link>
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
