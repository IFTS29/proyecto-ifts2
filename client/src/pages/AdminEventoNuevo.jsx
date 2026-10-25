import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IMGS } from "../imagenes";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";

const FOTOS_PREDETERMINADAS = [
  { id: "1", url: IMGS.PLATO, nombre: "Plato gastronómico" },
  { id: "2", url: IMGS.VERDURAS, nombre: "Taller de vegetales" },
  { id: "3", url: IMGS.MORRON, nombre: "Práctica de cocina" },
  { id: "4", url: IMGS.ESTUDIO, nombre: "Laboratorio sensorial" },
];

export default function AdminEventoNuevo() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [titulo, setTitulo] = useState("Jornada de Gastronomía 2026");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [videoUrl, setVideoUrl] = useState("");
  const [descripcion, setDescripcion] = useState(
    "Jornada abierta con elaboraciones de los estudiantes de los tres años.",
  );
  const [visible, setVisible] = useState(true);
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState([
    IMGS.PLATO,
    IMGS.VERDURAS,
    IMGS.MORRON,
    IMGS.ESTUDIO,
  ]);
  const [fotoRutaManual, setFotoRutaManual] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeOk, setMensajeOk] = useState("");

  const toggleFoto = (url) => {
    setFotosSeleccionadas((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url],
    );
  };

  const agregarRutaLocal = (e) => {
    e.preventDefault();
    const ruta = fotoRutaManual.trim();
    if (!ruta) return;
    if (!fotosSeleccionadas.includes(ruta)) {
      setFotosSeleccionadas((prev) => [...prev, ruta]);
    }
    setFotoRutaManual("");
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setMensajeOk("");

    if (!titulo.trim()) {
      setError("Por favor completá el título del evento.");
      return;
    }
    if (!descripcion.trim()) {
      setError("Por favor completá la descripción del evento.");
      return;
    }

    setEnviando(true);
    try {
      const fotosParaGuardar =
        fotosSeleccionadas.length > 0
          ? fotosSeleccionadas
          : ["/media/instagram/placeholder.svg"];

      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fechaEvento: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
        videoUrl: videoUrl.trim() || null,
        fotoPrincipal: fotosParaGuardar[0],
        medios: fotosParaGuardar.map((url, idx) => ({
          id: String(idx + 1),
          tipo: "IMAGE",
          url,
        })),
        cantidadMedios: fotosParaGuardar.length,
        estado: visible ? "visible" : "oculto",
        origen: "manual",
      };

      await api("/events", {
        metodo: "POST",
        cuerpo: payload,
      });

      setMensajeOk("¡Evento publicado exitosamente!");
      setTimeout(() => {
        navigate("/admin-eventos");
      }, 1200);
    } catch (err) {
      setError(err.message || "No se pudo guardar el evento.");
    } finally {
      setEnviando(false);
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
            <h1>Cargar un evento</h1>
            <p>Completá los datos del evento para publicarlo en la galería institucional.</p>
          </div>
        </div>
        <form className="form-admin" onSubmit={enviar} noValidate>
          <div className="caja">
            <div className="campo">
              <label htmlFor="e-tit">Título del evento</label>
              <input
                id="e-tit"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Jornada de Gastronomía 2026"
                required
              />
            </div>
            <div className="fila">
              <div className="campo">
                <label htmlFor="e-fecha">Fecha</label>
                <input
                  id="e-fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="campo">
                <label htmlFor="e-video">Video (opcional)</label>
                <input
                  id="e-video"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Enlace al video en Instagram"
                />
                <span className="ayuda">Pegá el enlace a la publicación o reel de Instagram.</span>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="e-desc">Descripción</label>
              <textarea
                id="e-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="campo">
              <span style={{ fontWeight: "700" }}>Galería de fotos (rutas locales y predeterminadas)</span>
              <p style={{ color: "var(--suave)", fontSize: "0.875rem", margin: "0.25rem 0 0.75rem" }}>
                Hacé clic en las fotos predeterminadas para incluirlas o excluirlas, o agregá una ruta local simulada (ej. <code>/media/eventos/foto1.jpg</code>).
              </p>
              <div className="previas" style={{ marginBottom: "1rem" }}>
                {FOTOS_PREDETERMINADAS.map((foto) => {
                  const activa = fotosSeleccionadas.includes(foto.url);
                  return (
                    <button
                      key={foto.id}
                      type="button"
                      onClick={() => toggleFoto(foto.url)}
                      title={`${activa ? "Quitar" : "Agregar"} ${foto.nombre}`}
                      style={{
                        padding: 0,
                        border: activa ? "2px solid var(--verde)" : "2px dashed var(--borde)",
                        opacity: activa ? 1 : 0.45,
                        borderRadius: "4px",
                        cursor: "pointer",
                        background: "none",
                        lineHeight: 0,
                      }}
                    >
                      <img src={foto.url} alt={foto.nombre} />
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Simular otra ruta: /media/eventos/mi-foto.jpg"
                  value={fotoRutaManual}
                  onChange={(e) => setFotoRutaManual(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="boton boton-linea boton-chico"
                  onClick={agregarRutaLocal}
                >
                  Agregar ruta
                </button>
              </div>
              <span className="ayuda" style={{ marginTop: "0.5rem", display: "block" }}>
                Fotos seleccionadas para este evento: {fotosSeleccionadas.length}
              </span>
            </div>
          </div>
          <div className="caja">
            <h2>Publicación</h2>
            <label className="interruptor">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
              />{" "}
              Visible en el sitio
            </label>
            <p style={{ color: "var(--suave)", fontSize: "0.9375rem", margin: "0.875rem 0 1.25rem" }}>
              Al terminar el año pasa automáticamente a "Años anteriores".
            </p>

            {error && (
              <p className="aviso visible error" role="alert" style={{ marginBottom: "1rem" }}>
                {error}
              </p>
            )}

            {mensajeOk && (
              <p className="aviso visible" role="status" style={{ marginBottom: "1rem" }}>
                {mensajeOk}
              </p>
            )}

            <button
              className="boton boton-verde"
              type="submit"
              disabled={enviando}
              style={{ width: "100%" }}
            >
              {enviando ? "Guardando evento..." : "Publicar evento"}
            </button>
            <Link
              className="boton boton-linea"
              to="/admin-eventos"
              style={{ width: "100%", marginTop: "0.75rem" }}
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
