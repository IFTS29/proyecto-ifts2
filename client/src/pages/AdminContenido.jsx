import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";
import FormPerfil from "../components/FormPerfil.jsx";
import FormPersonas from "../components/FormPersonas.jsx";
import FormContacto from "../components/FormContacto.jsx";
import FormIngreso from "../components/FormIngreso.jsx";
import FormPreguntasIngreso from "../components/FormPreguntasIngreso.jsx";
import { useAvisoSinGuardar } from "../avisoSinGuardar.js";
import { SECCIONES_CONTENIDO } from "../seccionesContenido.js";
import { almacenContenido, guardarSeccion, textoActualizado, useContenidoInstitucional } from "../contenido.js";

const FORMULARIOS = {
  perfil: FormPerfil,
  personas: FormPersonas,
  contacto: FormContacto,
  ingreso: FormIngreso,
  ingresoPreguntas: FormPreguntasIngreso,
};

export default function AdminContenido() {
  const { usuario } = useAuth();
  const { estado, contenido } = useContenidoInstitucional();
  // La sección se elige en el submenú del menú lateral y viaja en la dirección (?seccion=...).
  const [params] = useSearchParams();
  const activa = params.get("seccion");
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

  // Al pasar a otra sección empieza sin avisos. El aviso de cambios sin guardar ya lo pidió el menú lateral.
  useEffect(() => {
    setSucio(false);
    setAviso("");
  }, [activa]);

  const guardar = async (datos) => {
    setAviso("");
    await guardarSeccion(activa, datos);
    setAviso("Los cambios se guardaron y ya se ven en el sitio.");
  };

  const seccion = SECCIONES_CONTENIDO.find((s) => s.clave === activa);
  const Formulario = seccion && FORMULARIOS[seccion.clave];
  const datos = seccion && contenido?.[activa];

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
            <p>Perfil del egresado, autoridades y tutoría, datos de contacto, convocatoria de ingreso y preguntas frecuentes.</p>
            <p>Al guardar, los cambios se publican enseguida en el sitio.</p>
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
            {seccion ? (
              <section className="caja panel-cont" aria-labelledby="titulo-seccion">
                <h2 id="titulo-seccion">{seccion.titulo}</h2>
                <p className="actualizado">{textoActualizado(datos)}</p>
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
            ) : (
              <section className="caja panel-cont vacio-seccion">
                <p>Las secciones se editan desde el menú de la izquierda, debajo de «Contenido institucional».</p>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
