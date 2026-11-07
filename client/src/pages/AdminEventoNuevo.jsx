import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";
import CamposEvento from "../components/CamposEvento.jsx";
import FotosEvento from "../components/FotosEvento.jsx";
import { useAvisoSinGuardar } from "../avisoSinGuardar.js";
import {
  MENSAJE_ENLACE_INVALIDO,
  datosBasicosParaEnviar,
  direccionDeInstagram,
  faltaUnDato,
  usarComoPortada,
  valoresDeEvento,
} from "../eventos.js";
import { LIMITE_DEL_PEDIDO, MAXIMO_DE_FOTOS, pesoDelPedido, prepararFotos } from "../fotos.js";

export default function AdminEventoNuevo() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [inicial] = useState(() => valoresDeEvento()); // formulario vacío, con la fecha de hoy
  const [valores, setValores] = useState(inicial);
  const [videoUrl, setVideoUrl] = useState("");
  const [visible, setVisible] = useState(true);
  const [fotos, setFotos] = useState([]);

  const [enviando, setEnviando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState("");

  // Achica cada foto antes de agregarla (ver fotos.js). Si alguna no se puede usar, se avisa y se siguen las demás.
  const agregarFotos = async (archivos) => {
    setError("");
    setPreparando(true);
    try {
      const { listas, problemas } = await prepararFotos(archivos, MAXIMO_DE_FOTOS - fotos.length);
      setFotos((prev) => [...prev, ...listas]);
      if (problemas.length) setError(problemas.join(" "));
    } catch {
      setError("No se pudieron preparar las fotos. Probá de nuevo.");
    } finally {
      setPreparando(false);
    }
  };

  const cambiarValor = (campo, valor) => setValores((prev) => ({ ...prev, [campo]: valor }));

  // Hay algo cargado que se perdería al salir.
  const sinGuardar =
    JSON.stringify(valores) !== JSON.stringify(inicial) ||
    fotos.length > 0 ||
    videoUrl.trim() !== "" ||
    !visible;
  useAvisoSinGuardar(sinGuardar && !enviando);

  // Mientras se guarda no se puede salir con Cancelar (el aviso de cambios sin guardar lo da useAvisoSinGuardar).
  const cancelar = (e) => {
    if (enviando) e.preventDefault();
  };

  const quitarFoto = (id) => setFotos((prev) => prev.filter((f) => f.id !== id));
  const elegirPortada = (id) => setFotos((prev) => usarComoPortada(prev, id));

  const enviar = async (e) => {
    e.preventDefault();
    setError("");

    const falta = faltaUnDato(valores);
    if (falta) {
      setError(falta);
      return;
    }
    if (fotos.length === 0 && !videoUrl.trim()) {
      setError("Por favor seleccioná al menos una foto o ingresá un enlace a una publicación de Instagram / video.");
      return;
    }
    if (videoUrl.trim() && !direccionDeInstagram(videoUrl)) {
      setError(MENSAJE_ENLACE_INVALIDO);
      return;
    }

    setEnviando(true);
    try {
      const fotosUrls = fotos.map((f) => f.url);
      // La portada es la primera foto: el servidor la toma de "medios", así no se manda dos veces.
      const fotoPrincipal = fotosUrls.length > 0 ? undefined : "/media/instagram/placeholder.svg";

      const payload = {
        ...datosBasicosParaEnviar(valores),
        videoUrl: videoUrl.trim() || null,
        fotoPrincipal,
        medios: fotosUrls.length > 0
          ? fotosUrls.map((url, idx) => ({
              id: String(idx + 1),
              tipo: "IMAGE",
              url,
            }))
          : videoUrl.trim()
          ? [
              {
                id: "1",
                tipo: "VIDEO",
                url: videoUrl.trim(),
              },
            ]
          : [],
        estado: visible ? "visible" : "oculto",
        origen: "manual",
      };

      // En el sitio publicado un pedido no puede pasar de 4,5 MB: se controla antes de enviar.
      if (pesoDelPedido(payload) > LIMITE_DEL_PEDIDO) {
        throw new Error("Las fotos juntas pesan demasiado para enviarlas. Quitá alguna o cargalas en otro evento.");
      }

      const respuesta = await api("/events", {
        metodo: "POST",
        cuerpo: payload,
      });

      // El aviso queda en la lista de eventos hasta la próxima acción, como al guardar una edición.
      // Si no se pudo obtener la foto de Instagram, el aviso lo explica.
      navigate("/admin-eventos", { state: { aviso: respuesta?.aviso || "El evento se guardó correctamente." } });
    } catch (err) {
      setError(err.message || "No se pudo guardar el evento.");
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
            <p>Completá los datos del evento.</p>
          </div>
        </div>
        <form className="form-admin" onSubmit={enviar} noValidate>
          <div className="caja">
            <CamposEvento valores={valores} alCambiar={cambiarValor} deshabilitado={enviando} />
            <div className="campo">
              <label htmlFor="e-video">Publicación o video de Instagram (opcional)</label>
              <input
                id="e-video"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/... o reel"
              />
              <span className="ayuda">
                Si no se cargan fotos, el sistema intenta obtener la imagen de la publicación. Si no puede, intenta
                mostrar la publicación de Instagram.
              </span>
            </div>

            <FotosEvento
              fotos={fotos}
              alAgregar={agregarFotos}
              alQuitar={quitarFoto}
              alElegirPortada={elegirPortada}
              preparando={preparando}
              deshabilitado={enviando}
            />
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
              Después se puede ocultar o volver a mostrar desde la lista de eventos.
            </p>

            {error && (
              <p className="aviso visible error" role="alert" style={{ marginBottom: "1rem" }}>
                {error}
              </p>
            )}

            <button
              className="boton boton-verde"
              type="submit"
              disabled={enviando || preparando}
              style={{ width: "100%" }}
            >
              {enviando ? "Guardando evento..." : preparando ? "Preparando fotos…" : "Guardar evento"}
            </button>
            <Link
              className="boton boton-linea boton-cancelar"
              to="/admin-eventos"
              onClick={cancelar}
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
