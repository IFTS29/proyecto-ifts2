import { useCallback, useEffect, useRef, useState } from "react";
import { api, descargar } from "../api.js";
import { codigoPeriodo, leerPeriodo, periodoActual, textoMaterias, textoPeriodo } from "../academica.js";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirmar } from "../components/Confirmacion.jsx";
import { DESCARTAR_CAMBIOS } from "../confirmaciones.js";
import { useAvisoSinGuardar } from "../avisoSinGuardar.js";
import FormHorario from "../components/FormHorario.jsx";
import FormReutilizar from "../components/FormReutilizar.jsx";
import ResumenHorarios from "../components/ResumenHorarios.jsx";
import TablaHorarios from "../components/TablaHorarios.jsx";
import HorariosPublicos from "../components/HorariosPublicos.jsx";
import PestanasAcademicas from "../components/PestanasAcademicas.jsx";

const OTRO = "otro";

// Información académica → Horarios de cursada.
// Se trabaja de a un período: Resumen (estado y publicación) y Tabla (cargar y corregir materias).
// Guardar cambia solo los datos de trabajo; los alumnos ven lo publicado hasta que se publique o actualice.
export default function AdminAcademica() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const [periodos, setPeriodos] = useState([]);
  const [periodo, setPeriodo] = useState("");
  const [otro, setOtro] = useState(null); // { cicloLectivo, cuatrimestre } mientras se elige "Otro período…"
  const [estado, setEstado] = useState(null);
  const [vista, setVista] = useState("resumen");
  const [modal, setModal] = useState(null); // { tipo: "materia" | "reutilizar" | "cambios" | "vista", horario }
  const [aviso, setAviso] = useState({ texto: "", error: false });
  const [ocupado, setOcupado] = useState(false);
  const [modalOcupado, setModalOcupado] = useState(false); // mientras un formulario guarda, no se puede cerrar
  // Si el formulario de una materia tiene cambios sin guardar: se pregunta antes de cerrarlo (ventana propia)
  // y antes de recargar o cerrar la pestaña (aviso del navegador, con useAvisoSinGuardar).
  const [formSucio, setFormSucio] = useState(false);
  useAvisoSinGuardar(formSucio && !modalOcupado);

  const avisar = (texto, error = false) => setAviso({ texto, error });

  const cargarPeriodos = useCallback(async () => {
    const { periodos: lista } = await api("/academic/periodos");
    setPeriodos(lista);
    return lista;
  }, []);

  // Si se cambia de período rápido, las respuestas pueden llegar en otro orden.
  // Solo se muestra la del último pedido, para que la pantalla siempre corresponda al período elegido.
  const ultimoPedido = useRef(0);
  const cargarEstado = useCallback(async (codigo) => {
    const pedido = ++ultimoPedido.current;
    try {
      const datos = await api(`/academic/periodos/${codigo}`);
      if (pedido === ultimoPedido.current) setEstado(datos);
    } catch (err) {
      if (pedido === ultimoPedido.current) throw err;
    }
  }, []);

  // Al entrar: el período más reciente con datos; si no hay ninguno, el período en curso.
  useEffect(() => {
    cargarPeriodos()
      .then((lista) => setPeriodo(lista[0]?.periodo ?? codigoPeriodo(periodoActual())))
      .catch((err) => avisar(err.message, true));
  }, [cargarPeriodos]);

  useEffect(() => {
    if (!periodo) return;
    setEstado(null);
    cargarEstado(periodo).catch((err) => avisar(err.message, true));
  }, [periodo, cargarEstado]);

  const recargar = () => Promise.all([cargarPeriodos(), cargarEstado(periodo)]);

  // Corre una acción del panel: muestra el resultado o el error y vuelve a leer los datos.
  async function ejecutar(accion, mensajeExito) {
    setOcupado(true);
    avisar("");
    try {
      const resultado = await accion();
      await recargar();
      avisar(typeof mensajeExito === "function" ? mensajeExito(resultado) : mensajeExito);
    } catch (err) {
      avisar(err.message, true);
    } finally {
      setOcupado(false);
    }
  }

  const elegirPeriodo = (valor) => {
    avisar("");
    setVista("resumen");
    if (valor === OTRO) return setOtro(periodoActual());
    setOtro(null);
    setPeriodo(valor);
  };

  const abrirOtro = (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(String(otro.cicloLectivo))) return avisar("Escribí el ciclo lectivo, por ejemplo 2027.", true);
    setPeriodo(codigoPeriodo(otro));
    setOtro(null);
  };

  const cerrarModal = () => {
    if (!modalOcupado) setModal(null);
  };

  // Cerrar el formulario de una materia: si hay cambios sin guardar, se pregunta antes.
  // La confirmación se abre encima del formulario: si se cancela, el formulario sigue abierto con sus cambios.
  const cerrarFormulario = async () => {
    if (modalOcupado) return;
    if (formSucio && !(await confirmar(DESCARTAR_CAMBIOS))) return;
    setFormSucio(false);
    setModal(null);
  };

  const marcarSucio = useCallback((sucio) => setFormSucio(sucio), []);

  const guardarMateria = async (datos) => {
    const editando = modal.horario;
    const { horario } = editando
      ? await api(`/academic/horarios/${editando.id}`, { metodo: "PUT", cuerpo: datos })
      : await api("/academic/horarios", { metodo: "POST", cuerpo: datos });
    await recargar();
    const cuando = estado.publicado ? " Los alumnos lo van a ver cuando actualices la publicación." : "";
    avisar(`Se guardó «${horario.materia}».${cuando}`);
    return horario;
  };

  const eliminar = async (h) => {
    const sigueVisible = estado.publicado
      ? " Los horarios publicados no cambiarán hasta que se actualice la publicación."
      : "";
    const confirmado = await confirmar({
      titulo: "¿Eliminar esta materia?",
      texto: `«${h.materia}» se eliminará de los horarios de trabajo del ${textoPeriodo(estado)}.${sigueVisible}`,
      accion: "Eliminar",
      peligro: true,
    });
    if (!confirmado) return;
    ejecutar(() => api(`/academic/horarios/${h.id}`, { metodo: "DELETE" }), `Se eliminó «${h.materia}».`);
  };

  const publicar = async () => {
    const del = textoPeriodo(estado);
    const materias = textoMaterias(estado.horarios.length);
    const confirmado = await confirmar(
      estado.publicado
        ? {
            titulo: "¿Actualizar los horarios publicados?",
            texto: `Los horarios publicados del ${del} se actualizarán con los cambios guardados (${materias}).`,
            accion: "Actualizar",
          }
        : {
            titulo: "¿Publicar los horarios?",
            texto: `Se publicarán los horarios de ${materias} del ${del}.`,
            accion: "Publicar",
          },
    );
    if (!confirmado) return;
    const mensaje = estado.publicado ? "Se actualizó la publicación." : "Se publicaron los horarios.";
    ejecutar(() => api(`/academic/periodos/${periodo}/publicar`, { metodo: "POST" }), mensaje);
  };

  const retirar = async () => {
    const del = textoPeriodo(estado);
    const confirmado = await confirmar({
      titulo: "¿Retirar la publicación?",
      texto: `Los horarios del ${del} dejarán de estar disponibles para los alumnos. Los datos de trabajo se conservarán.`,
      accion: "Retirar",
    });
    if (!confirmado) return;
    ejecutar(() => api(`/academic/periodos/${periodo}/retirar`, { metodo: "POST" }), "Se retiró la publicación.");
  };

  const reutilizar = async (origen) => {
    const resultado = await api(`/academic/periodos/${periodo}/reutilizar`, { metodo: "POST", cuerpo: { origen } });
    await recargar(); // la ventana se cierra cuando la tabla ya muestra lo que se trajo
    setModal(null);
    setVista("tabla");
    const yaEstaban = resultado.yaEstaban ? ` (${resultado.yaEstaban} ya estaban cargadas)` : "";
    const agregadas = textoMaterias(resultado.agregadas);
    avisar(`Se agregaron ${agregadas} del ${textoPeriodo(leerPeriodo(origen))}${yaEstaban}. No se publicó nada.`);
  };

  // El error se muestra dentro de la vista previa, junto al botón: el aviso de la página queda detrás.
  const [descarga, setDescarga] = useState({ enCurso: false, error: "" });
  const descargarVistaPrevia = async () => {
    const { cicloLectivo, cuatrimestre } = leerPeriodo(periodo);
    setDescarga({ enCurso: true, error: "" });
    try {
      await descargar(
        `/academic/periodos/${periodo}/vista-previa.pdf`,
        `vista-previa-horarios-${cuatrimestre}-cuatrimestre-${cicloLectivo}.pdf`,
      );
      setDescarga({ enCurso: false, error: "" });
    } catch (err) {
      setDescarga({ enCurso: false, error: err.message });
    }
  };

  // El período abierto aparece en el selector aunque todavía no tenga datos.
  const opciones = periodos.some((p) => p.periodo === periodo)
    ? periodos
    : [...(periodo ? [{ periodo, ...leerPeriodo(periodo), nuevo: true }] : []), ...periodos];
  const aulas = [...new Set((estado?.horarios ?? []).map((h) => h.aula).filter(Boolean))].sort();

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
            <h1>Información académica</h1>
            <p>Horarios de cursada y mesas de examen. Guardar no cambia el sitio: los alumnos ven lo publicado.</p>
          </div>
        </div>
        <PestanasAcademicas />

        <div className="selector-periodo">
          <div className="campo">
            <label htmlFor="a-periodo">Período</label>
            <select
              id="a-periodo"
              value={otro ? OTRO : periodo}
              disabled={ocupado}
              onChange={(e) => elegirPeriodo(e.target.value)}
            >
              {opciones.map((p) => (
                <option key={p.periodo} value={p.periodo}>
                  {textoPeriodo(p)}
                  {p.nuevo ? " (sin datos)" : p.publicado ? " · Publicado" : " · No publicado"}
                </option>
              ))}
              <option value={OTRO}>Otro período…</option>
            </select>
          </div>
          {otro && (
            <form className="otro-periodo" onSubmit={abrirOtro}>
              <div className="campo">
                <label htmlFor="a-ciclo">Ciclo lectivo</label>
                <input
                  id="a-ciclo"
                  type="number"
                  min="2020"
                  max="2100"
                  value={otro.cicloLectivo}
                  onChange={(e) => setOtro({ ...otro, cicloLectivo: e.target.value })}
                />
              </div>
              <div className="campo">
                <label htmlFor="a-cuatrimestre">Cuatrimestre</label>
                <select
                  id="a-cuatrimestre"
                  value={otro.cuatrimestre}
                  onChange={(e) => setOtro({ ...otro, cuatrimestre: e.target.value })}
                >
                  <option value="1">1.° cuatrimestre</option>
                  <option value="2">2.° cuatrimestre</option>
                </select>
              </div>
              <button className="boton boton-verde boton-chico" type="submit" disabled={ocupado}>
                Abrir
              </button>
            </form>
          )}
        </div>

        <p className={"aviso" + (aviso.texto ? " visible" : "") + (aviso.error ? " error" : "")} role="status">
          {aviso.texto}
        </p>

        {!estado && !aviso.error && <p>Cargando…</p>}

        {estado && vista === "resumen" && (
          <ResumenHorarios
            estado={estado}
            ocupado={ocupado}
            alAbrirTabla={() => setVista("tabla")}
            alVerCambios={() => setModal({ tipo: "cambios" })}
            alVistaPrevia={() => {
              setDescarga({ enCurso: false, error: "" });
              setModal({ tipo: "vista" });
            }}
            alPublicar={publicar}
            alRetirar={retirar}
          />
        )}

        {estado && vista === "tabla" && (
          <section className="caja seccion-horarios" aria-labelledby="titulo-tabla">
            <button className="boton-texto" type="button" onClick={() => setVista("resumen")}>
              ← Volver al resumen
            </button>
            <div className="cabecera-tabla">
              <h2 id="titulo-tabla">Horarios · {textoPeriodo(estado)}</h2>
              <div className="acciones">
                <button className="boton boton-verde" type="button" onClick={() => setModal({ tipo: "materia" })}>
                  + Agregar materia
                </button>
                <button className="boton boton-linea" type="button" onClick={() => setModal({ tipo: "reutilizar" })}>
                  Reutilizar horarios
                </button>
              </div>
            </div>
            {estado.horarios.length === 0 ? (
              <div className="estado-vacio">
                <p>
                  <strong>Todavía no hay horarios cargados.</strong>
                </p>
                <p>Agregá las materias una por una o traelas de otro período con "Reutilizar horarios".</p>
              </div>
            ) : (
              <TablaHorarios
                horarios={estado.horarios}
                alEditar={(h) => setModal({ tipo: "materia", horario: h })}
                alEliminar={eliminar}
              />
            )}
          </section>
        )}

        <Modal
          abierto={modal?.tipo === "materia"}
          titulo={modal?.horario ? "Editar materia" : `Agregar materia · ${estado ? textoPeriodo(estado) : ""}`}
          alCerrar={cerrarFormulario}
          bloqueado={modalOcupado}
        >
          <FormHorario
            periodo={leerPeriodo(periodo)}
            horario={modal?.horario}
            aulas={aulas}
            alGuardar={guardarMateria}
            alTerminar={() => {
              setFormSucio(false);
              setModal(null);
            }}
            alCancelar={cerrarFormulario}
            alCambiarSucio={marcarSucio}
            alCambiarOcupado={setModalOcupado}
          />
        </Modal>

        <Modal
          abierto={modal?.tipo === "reutilizar"}
          titulo="Reutilizar horarios"
          alCerrar={cerrarModal}
          bloqueado={modalOcupado}
        >
          <FormReutilizar
            destino={leerPeriodo(periodo)}
            periodos={periodos}
            alConfirmar={reutilizar}
            alCancelar={cerrarModal}
            alCambiarOcupado={setModalOcupado}
          />
        </Modal>

        <Modal abierto={modal?.tipo === "cambios"} titulo="Cambios sin publicar" alCerrar={cerrarModal} ancha>
          <p>Lo que van a ver los alumnos cuando actualices la publicación.</p>
          <div className="tabla-caja">
            <table>
              <thead>
                <tr>
                  <th scope="col">Materia</th>
                  <th scope="col">Qué cambió</th>
                  <th scope="col">Publicado</th>
                  <th scope="col">Guardado</th>
                </tr>
              </thead>
              <tbody>
                {estado?.cambios.map((c, i) => (
                  <tr key={`${c.id}-${i}`}>
                    <td>{c.materia}</td>
                    <td>{c.cambio}</td>
                    <td>{c.publicado ?? "—"}</td>
                    <td>{c.guardado ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>

        <Modal
          abierto={modal?.tipo === "vista"}
          titulo={`Vista previa · ${estado ? textoPeriodo(estado) : ""}`}
          alCerrar={cerrarModal}
          ancha
        >
          <p className="aviso visible aviso-vista-previa">
            Vista previa — Versión de trabajo. Así se vería la página de Alumnos con lo guardado. No es lo publicado.
          </p>
          {estado && <HorariosPublicos horarios={estado.horarios} />}
          <div className="acciones">
            <button
              className="boton boton-linea"
              type="button"
              disabled={descarga.enCurso}
              onClick={descargarVistaPrevia}
            >
              {descarga.enCurso ? "Descargando…" : "Descargar PDF de vista previa"}
            </button>
          </div>
          <p className={"aviso" + (descarga.error ? " visible error" : "")} role="alert">
            {descarga.error}
          </p>
        </Modal>
      </main>
    </div>
  );
}
