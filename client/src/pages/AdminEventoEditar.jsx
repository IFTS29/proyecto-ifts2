import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";
import CamposEvento from "../components/CamposEvento.jsx";
import { useAvisoSinGuardar } from "../avisoSinGuardar.js";
import { datosBasicosParaEnviar, faltaUnDato, valoresDeEvento } from "../eventos.js";

const ESTADOS = {
  visible: { texto: "Visible en el sitio", clase: "et-verde" },
  oculto: { texto: "Oculto", clase: "et-gris" },
  archivado: { texto: "Archivado", clase: "et-gris" },
};

// Edición de un evento ya cargado (/admin-evento-editar?id=...). Por ahora se corrigen los textos y la fecha;
// las fotos se muestran pero todavía no se cambian desde acá. Mostrar u ocultar se hace desde la lista.
export default function AdminEventoEditar() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [parametros] = useSearchParams();
  const id = parametros.get("id");

  const [evento, setEvento] = useState(null);
  const [inicial, setInicial] = useState(null);
  const [valores, setValores] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api(`/events/admin/${id}`)
      .then(({ evento: guardado }) => {
        const deEvento = valoresDeEvento(guardado);
        setEvento(guardado);
        setInicial(deEvento);
        setValores(deEvento);
      })
      .catch((err) => setErrorCarga(err.message));
  }, [id]);

  const cambiarValor = (campo, valor) => setValores((prev) => ({ ...prev, [campo]: valor }));
  const sinGuardar = Boolean(valores) && JSON.stringify(valores) !== JSON.stringify(inicial);
  useAvisoSinGuardar(sinGuardar && !guardando);

  // Mientras se guarda no se puede salir con Cancelar (el aviso de cambios sin guardar lo da useAvisoSinGuardar).
  const cancelar = (e) => {
    if (guardando) e.preventDefault();
  };

  const guardar = async (e) => {
    e.preventDefault();
    const falta = faltaUnDato(valores);
    setError(falta);
    if (falta) return;
    setGuardando(true);
    try {
      await api(`/events/${id}`, { metodo: "PUT", cuerpo: datosBasicosParaEnviar(valores, inicial) });
      navigate("/admin-eventos", { state: { aviso: `Se guardaron los cambios de «${valores.titulo.trim()}».` } });
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  const fotos = (evento?.medios || []).filter((m) => m.tipo === "IMAGE" && m.url && !m.url.includes("placeholder"));
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
              {fotos.length > 0 && (
                <div className="campo">
                  <span style={{ fontWeight: "700" }}>Fotos ({fotos.length})</span>
                  <div className="previas enteras">
                    {fotos.map((foto, i) => (
                      <img key={foto.url} src={foto.url} alt={`Foto ${i + 1} del evento`} />
                    ))}
                  </div>
                  <span className="ayuda">Por ahora, las fotos de un evento ya cargado no se pueden cambiar.</span>
                </div>
              )}
            </div>
            <div className="caja">
              {error && (
                <p className="aviso visible error" role="alert" style={{ marginBottom: "1rem" }}>
                  {error}
                </p>
              )}
              <button className="boton boton-verde" type="submit" disabled={guardando} style={{ width: "100%" }}>
                {guardando ? "Guardando…" : "Guardar cambios"}
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
