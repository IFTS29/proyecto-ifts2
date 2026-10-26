import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";
import CamposEvento from "../components/CamposEvento.jsx";
import FotosEvento from "../components/FotosEvento.jsx";
import { useAvisoSinGuardar } from "../avisoSinGuardar.js";
import {
  cambiaronLasFotos,
  datosBasicosParaEnviar,
  faltaUnDato,
  fotosDeEvento,
  fotosQuitadas,
  usarComoPortada,
  valoresDeEvento,
  volverAPoner,
} from "../eventos.js";
import { LIMITE_DEL_PEDIDO, MAXIMO_DE_FOTOS, pesoDelPedido, prepararFotos } from "../fotos.js";

const ESTADOS = {
  visible: { texto: "Visible en el sitio", clase: "et-verde" },
  oculto: { texto: "Oculto", clase: "et-gris" },
  archivado: { texto: "Archivado", clase: "et-gris" },
};

// Edición de un evento ya cargado (/admin-evento-editar?id=...): textos, fecha y fotos.
// Mostrar u ocultar se hace desde la lista. Las fotos quitadas no se borran: el servidor las registra.
export default function AdminEventoEditar() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [parametros] = useSearchParams();
  const id = parametros.get("id");

  const [evento, setEvento] = useState(null);
  const [inicial, setInicial] = useState(null);
  const [valores, setValores] = useState(null);
  const [fotosIniciales, setFotosIniciales] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [preparando, setPreparando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api(`/events/admin/${id}`)
      .then(({ evento: guardado }) => {
        const deEvento = valoresDeEvento(guardado);
        const delEvento = fotosDeEvento(guardado);
        setEvento(guardado);
        setInicial(deEvento);
        setValores(deEvento);
        setFotosIniciales(delEvento);
        setFotos(delEvento);
      })
      .catch((err) => setErrorCarga(err.message));
  }, [id]);

  const cambiarValor = (campo, valor) => setValores((prev) => ({ ...prev, [campo]: valor }));
  const fotosCambiaron = cambiaronLasFotos(fotos, fotosIniciales);
  const sinGuardar = Boolean(valores) && (JSON.stringify(valores) !== JSON.stringify(inicial) || fotosCambiaron);
  useAvisoSinGuardar(sinGuardar && !guardando);

  const quitadas = fotosQuitadas(fotos, fotosIniciales);
  const esVideo = evento?.tipoMedio === "VIDEO";

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
  const quitarFoto = (fotoId) => setFotos((prev) => prev.filter((foto) => foto.id !== fotoId));
  const elegirPortada = (fotoId) => setFotos((prev) => usarComoPortada(prev, fotoId));
  const devolverQuitadas = () => setFotos((prev) => volverAPoner(prev, fotosIniciales));

  // Mientras se guarda no se puede salir con Cancelar (el aviso de cambios sin guardar lo da useAvisoSinGuardar).
  const cancelar = (e) => {
    if (guardando) e.preventDefault();
  };

  const guardar = async (e) => {
    e.preventDefault();
    const falta = faltaUnDato(valores) || (fotos.length > MAXIMO_DE_FOTOS ? `Un evento puede tener hasta ${MAXIMO_DE_FOTOS} fotos.` : "");
    setError(falta);
    if (falta) return;

    // Las fotos solo se mandan si cambiaron: las que ya estaban viajan como enlace y las nuevas, achicadas.
    const cuerpo = datosBasicosParaEnviar(valores, inicial);
    if (fotosCambiaron) cuerpo.fotos = fotos.map((foto) => foto.url);
    if (pesoDelPedido(cuerpo) > LIMITE_DEL_PEDIDO) {
      setError("Las fotos nuevas juntas pesan demasiado para enviarlas. Guardá con menos fotos y agregá las demás después.");
      return;
    }

    setGuardando(true);
    try {
      await api(`/events/${id}`, { metodo: "PUT", cuerpo });
      navigate("/admin-eventos", { state: { aviso: `Se guardaron los cambios de «${valores.titulo.trim()}».` } });
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  const estado = ESTADOS[evento?.estado] || { texto: evento?.estado, clase: "et-gris" };

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
            <h1>
              Editar evento{" "}
              {evento && <span className={`etiqueta ${estado.clase}`}>{estado.texto}</span>}
            </h1>
            <p>
              Corregí los datos del evento. Para mostrarlo u ocultarlo, usá el botón del ojo en la lista de eventos.
              {evento?.origen === "instagram" &&
                " Este evento vino de Instagram: su fecha es la de la publicación; si la actividad fue otro día, corregila. Lo que cambies acá no se pierde al volver a sincronizar."}
            </p>
          </div>
        </div>

        {errorCarga ? (
          <div className="caja">
            <p className="aviso visible error" role="alert">
              {errorCarga}
            </p>
            <Link className="boton boton-linea" to="/admin-eventos">
              Volver a la lista de eventos
            </Link>
          </div>
        ) : !valores ? (
          <p>Cargando el evento…</p>
        ) : (
          <form className="form-admin" onSubmit={guardar} noValidate>
            <div className="caja">
              <CamposEvento valores={valores} alCambiar={cambiarValor} deshabilitado={guardando} />
              <FotosEvento
                fotos={fotos}
                alAgregar={agregarFotos}
                alQuitar={quitarFoto}
                alElegirPortada={elegirPortada}
                conPortada={!esVideo}
                preparando={preparando}
                deshabilitado={guardando}
                nota={
                  <>
                    {esVideo && <p className="fotos-nota">La portada de este evento es la imagen del video.</p>}
                    {quitadas.length > 0 && (
                      <p className="fotos-nota" role="status">
                        {quitadas.length === 1 ? "Quitaste 1 foto." : `Quitaste ${quitadas.length} fotos.`}{" "}
                        <button type="button" className="boton-texto" onClick={devolverQuitadas} disabled={guardando || preparando}>
                          {quitadas.length === 1 ? "Volver a ponerla" : "Volver a ponerlas"}
                        </button>
                      </p>
                    )}
                    {!esVideo && fotos.length === 0 && fotosIniciales.length > 0 && (
                      <p className="fotos-nota">Sin fotos, el evento se va a mostrar con la imagen institucional.</p>
                    )}
                  </>
                }
              />
            </div>
            <div className="caja">
              {error && (
                <p className="aviso visible error" role="alert" style={{ marginBottom: "1rem" }}>
                  {error}
                </p>
              )}
              <button
                className="boton boton-verde"
                type="submit"
                disabled={guardando || preparando}
                style={{ width: "100%" }}
              >
                {guardando ? "Guardando…" : preparando ? "Preparando fotos…" : "Guardar cambios"}
              </button>
              <Link
                className="boton boton-linea boton-cancelar"
                to="/admin-eventos"
                onClick={cancelar}
                aria-disabled={guardando}
                style={{ width: "100%", marginTop: "0.75rem" }}
              >
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
