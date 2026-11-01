import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";
import FormPerfil from "../components/FormPerfil.jsx";
import FormPersonas from "../components/FormPersonas.jsx";
import FormContacto from "../components/FormContacto.jsx";
import { useConfirmar } from "../components/Confirmacion.jsx";
import { useAvisoSinGuardar } from "../avisoSinGuardar.js";
import { DESCARTAR_CAMBIOS } from "../confirmaciones.js";
import { almacenContenido, guardarSeccion, textoActualizado, useContenidoInstitucional } from "../contenido.js";

// Secciones que se editan desde el panel. Lo guardado se ve enseguida en el sitio.
const SECCIONES = [
  { clave: "perfil", titulo: "Perfil del egresado", Formulario: FormPerfil, enElSitio: "/carrera#perfil" },
  {
    clave: "personas",
    titulo: "Autoridades y tutoría",
    Formulario: FormPersonas,
    enElSitio: "/carrera#autoridades",
  },
  { clave: "contacto", titulo: "Datos de contacto", Formulario: FormContacto, enElSitio: "/contacto" },
];

export default function AdminContenido() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const { estado, contenido } = useContenidoInstitucional();
  const [activa, setActiva] = useState("personas");
  const [sucio, setSucio] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");

  useAvisoSinGuardar(sucio && !ocupado);
  // Al empezar a editar de nuevo, el aviso de "se guardaron" deja de corresponder.
  const marcarSucio = useCallback((valor) => {
    setSucio(valor);
    if (valor) setAviso("");
  }, []);
  const marcarOcupado = useCallback((valor) => setOcupado(valor), []);

  // Cambiar de sección con cambios sin guardar pide confirmación, como salir por un enlace.
  const elegir = async (clave) => {
    if (clave === activa || ocupado) return;
    if (sucio && !(await confirmar(DESCARTAR_CAMBIOS))) return;
    setSucio(false);
    setAviso("");
    setActiva(clave);
  };

  const guardar = async (datos) => {
    setAviso("");
    await guardarSeccion(activa, datos);
    setAviso("Los cambios se guardaron y ya se ven en el sitio.");
  };

  const seccion = SECCIONES.find((s) => s.clave === activa);
  const { Formulario } = seccion;
  const datos = contenido?.[activa];

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
            <h1>Contenido institucional</h1>
            <p>Perfil del egresado, autoridades y tutoría, y datos de contacto.</p>
          </div>
        </div>

        {estado === "cargando" && !contenido && <p>Cargando…</p>}
        {estado === "error" && (
          <div className="aviso visible error" role="alert">
            No se pudo cargar el contenido institucional.{" "}
            <button className="boton boton-linea boton-chico" type="button" onClick={() => almacenContenido.cargar()}>
              Reintentar
            </button>
          </div>
        )}

        {contenido && (
          <div className="form-admin form-contenido">
            <ul className="secciones-lista">
              {SECCIONES.map((s) => (
                <li key={s.clave}>
                  <button
                    type="button"
                    aria-pressed={s.clave === activa}
                    disabled={ocupado && s.clave !== activa}
                    onClick={() => elegir(s.clave)}
                  >
                    <span>
                      <strong>{s.titulo}</strong>
                      <small>{textoActualizado(contenido[s.clave])}</small>
                    </span>
                    <span className="flecha">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <section className="caja panel-cont" aria-labelledby="titulo-seccion">
              <h2 id="titulo-seccion">{seccion.titulo}</h2>
              <Formulario
                key={`${activa}-${datos.actualizadoEn ?? "inicial"}`}
                seccion={datos}
                alGuardar={guardar}
                alCambiarSucio={marcarSucio}
                alCambiarOcupado={marcarOcupado}
              />
              <p className={"aviso" + (aviso ? " visible" : "")} role="status">
                {aviso}
              </p>
              <p className="ver-en-sitio">
                <Link className="enlace" to={seccion.enElSitio}>
                  Ver cómo queda en el sitio
                </Link>
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
