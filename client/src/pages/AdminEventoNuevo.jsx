import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";

export default function AdminEventoNuevo() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [videoUrl, setVideoUrl] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [visible, setVisible] = useState(true);
  const [fotos, setFotos] = useState([]);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeOk, setMensajeOk] = useState("");

  const manejarArchivos = (e) => {
    const archivos = Array.from(e.target.files || []);
    if (!archivos.length) return;

    archivos.forEach((archivo) => {
      const reader = new FileReader();
      reader.onload = () => {
        setFotos((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            url: reader.result,
            nombre: archivo.name,
          },
        ]);
      };
      reader.readAsDataURL(archivo);
    });
    // Limpiar el input para permitir volver a elegir el mismo archivo si fue eliminado
    e.target.value = "";
  };

  const quitarFoto = (id) => {
    setFotos((prev) => prev.filter((f) => f.id !== id));
  };

  // Determinar tipo de medio según lo cargado
  const calcularTipoMedio = () => {
    if (videoUrl.trim()) return "VIDEO";
    if (fotos.length > 1) return "CAROUSEL_ALBUM";
    return "IMAGE";
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
    if (fotos.length === 0 && !videoUrl.trim()) {
      setError("Por favor seleccioná al menos una foto o ingresá un video.");
      return;
    }

    setEnviando(true);
    try {
      const tipoMedio = calcularTipoMedio();
      const fotosUrls = fotos.map((f) => f.url);
      const fotoPrincipal = fotosUrls[0] || "/media/instagram/placeholder.svg";

      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fechaEvento: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
        tipoMedio,
        videoUrl: videoUrl.trim() || null,
        fotoPrincipal,
        medios: fotosUrls.map((url, idx) => ({
          id: String(idx + 1),
          tipo: "IMAGE",
          url,
        })),
        cantidadMedios: fotosUrls.length || 1,
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

  const tipoMedioActual = calcularTipoMedio();

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
                  placeholder="Enlace al video o reel en Instagram"
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
                placeholder="Escribí una descripción detallada de la jornada o muestra..."
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="e-archivos" style={{ fontWeight: "700" }}>
                Galería de fotos
              </label>

              <input
                id="e-archivos"
                type="file"
                multiple
                accept="image/*"
                onChange={manejarArchivos}
                style={{ display: "none" }}
              />

              <label
                htmlFor="e-archivos"
                className="zona-fotos"
                style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}
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
                  <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                </svg>
                <strong>Hacé clic acá para examinar fotos en tu computadora</strong>
                <span>Podés seleccionar una o varias imágenes (JPG, PNG, WebP).</span>
              </label>

              {fotos.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.875rem", color: "var(--suave)", marginBottom: "0.5rem" }}>
                    Fotos seleccionadas ({fotos.length}): la primera será la portada.
                  </p>
                  <div className="previas">
                    {fotos.map((f, i) => (
                      <div
                        key={f.id}
                        style={{
                          position: "relative",
                          display: "inline-block",
                          border: i === 0 ? "2px solid var(--verde)" : "1px solid var(--borde)",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <img src={f.url} alt={f.nombre} style={{ display: "block" }} />
                        <button
                          type="button"
                          onClick={() => quitarFoto(f.id)}
                          title="Quitar foto"
                          style={{
                            position: "absolute",
                            top: "4px",
                            right: "4px",
                            background: "rgba(0, 0, 0, 0.65)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "22px",
                            height: "22px",
                            cursor: "pointer",
                            fontSize: "12px",
                            lineHeight: "22px",
                            padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "var(--suave)" }}>
                Tipo resultante:{" "}
                <strong style={{ color: "var(--texto)" }}>
                  {tipoMedioActual === "VIDEO"
                    ? "🎬 Video (VIDEO)"
                    : tipoMedioActual === "CAROUSEL_ALBUM"
                    ? `📸 Carrusel de fotos (CAROUSEL_ALBUM - ${fotos.length} fotos)`
                    : "🖼️ Foto única (IMAGE)"}
                </strong>
              </div>
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
