import { useCallback, useEffect, useRef, useState } from "react";
import { api, descargar } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirmar } from "../components/Confirmacion.jsx";
import { DESCARTAR_CAMBIOS } from "../confirmaciones.js";
import { useAvisoSinGuardar } from "../avisoSinGuardar.js";
import PestanasAcademicas from "../components/PestanasAcademicas.jsx";
import ResumenLlamado from "../components/ResumenLlamado.jsx";
import TablaMesas from "../components/TablaMesas.jsx";
import FormMesa from "../components/FormMesa.jsx";
import FormLlamado from "../components/FormLlamado.jsx";
import LlamadoPublico from "../components/LlamadoPublico.jsx";
import { paraArchivo, textoMesas } from "../mesas.js";

const NUEVO = "nuevo";

// Información académica → Mesas de examen, organizadas por llamado ("Febrero 2027").
// Se trabaja de a un llamado: Resumen (datos, estado y publicación) y Tabla (cargar y corregir mesas).
// Guardar cambia solo los datos de trabajo; los alumnos ven lo publicado hasta que se publique o actualice.
// Un llamado se puede publicar sin mesas, como anuncio.
export default function AdminMesas() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const [llamados, setLlamados] = useState(null);
  const [elegido, setElegido] = useState("");
  const [llamado, setLlamado] = useState(null);
  const [vista, setVista] = useState("resumen");
  const [modal, setModal] = useState(null); // { tipo: "llamado" | "mesa" | "cambios" | "vista", nuevo, mesa }
  const [aviso, setAviso] = useState({ texto: "", error: false });
  const [ocupado, setOcupado] = useState(false);
  const [modalOcupado, setModalOcupado] = useState(false); // mientras un formulario guarda, no se puede cerrar
  // Si el formulario abierto tiene cambios sin guardar: se pregunta antes de cerrarlo (ventana propia)
  // y antes de recargar o cerrar la pestaña (aviso del navegador, con useAvisoSinGuardar).
  const [formSucio, setFormSucio] = useState(false);
  useAvisoSinGuardar(formSucio && !modalOcupado);

  const avisar = (texto, error = false) => setAviso({ texto, error });

  const cargarLlamados = useCallback(async () => {
    const { llamados: lista } = await api("/academic/llamados");
    setLlamados(lista);
    return lista;
  }, []);

  // Si se cambia de llamado rápido, las respuestas pueden llegar en otro orden: solo se muestra la del último pedido.
  const ultimoPedido = useRef(0);
  const cargarLlamado = useCallback(async (id) => {
    const pedido = ++ultimoPedido.current;
    try {
      const datos = await api(`/academic/llamados/${id}`);
      if (pedido === ultimoPedido.current) setLlamado(datos.llamado);
    } catch (err) {
      if (pedido === ultimoPedido.current) throw err;
    }
  }, []);

  // Al entrar: el llamado más reciente. Si no hay ninguno, se ofrece crear el primero.
  useEffect(() => {
    cargarLlamados()
      .then((lista) => setElegido(lista[0]?.id ?? ""))
      .catch((err) => avisar(err.message, true));
  }, [cargarLlamados]);

  useEffect(() => {
    setLlamado(null);
    if (!elegido) return;
    cargarLlamado(elegido).catch((err) => avisar(err.message, true));
  }, [elegido, cargarLlamado]);

  const recargar = () => Promise.all([cargarLlamados(), cargarLlamado(elegido)]);

  // Corre una acción del panel: muestra el resultado o el error y vuelve a leer los datos.
  async function ejecutar(accion, mensajeExito) {
    setOcupado(true);
    avisar("");
    try {
      await accion();
      await recargar();
      avisar(mensajeExito);
    } catch (err) {
      avisar(err.message, true);
    } finally {
      setOcupado(false);
    }
  }

  const elegirLlamado = (valor) => {
    avisar("");
    if (valor === NUEVO) return setModal({ tipo: "llamado", nuevo: true });
    setVista("resumen");
    setElegido(valor);
  };

  const cerrarModal = () => {
    if (!modalOcupado) setModal(null);
  };

  // Cerrar un formulario: si hay cambios sin guardar, se pregunta antes (la confirmación se abre encima).
  const cerrarFormulario = async () => {
    if (modalOcupado) return;
    if (formSucio && !(await confirmar(DESCARTAR_CAMBIOS))) return;
    setFormSucio(false);
    setModal(null);
  };

  const marcarSucio = useCallback((sucio) => setFormSucio(sucio), []);

  const terminarFormulario = () => {
    setFormSucio(false);
    setModal(null);
  };

  const guardarLlamado = async (datos) => {
    if (modal.nuevo) {
      const { llamado: creado } = await api("/academic/llamados", { metodo: "POST", cuerpo: datos });
      await cargarLlamados();
      setVista("resumen");
      setElegido(creado.id);
      avisar(`Se creó el llamado «${creado.nombre}». Todavía no está publicado.`);
      return;
    }
    await api(`/academic/llamados/${llamado.id}`, { metodo: "PUT", cuerpo: datos });
    await recargar();
    const cuando = llamado.publicado ? " Los alumnos los verán cuando se actualice la publicación." : "";
    avisar(`Se guardaron los datos del llamado.${cuando}`);
  };

  const guardarMesa = async (datos) => {
    const editando = modal.mesa;
    const { mesa } = editando
      ? await api(`/academic/mesas/${editando.id}`, { metodo: "PUT", cuerpo: datos })
      : await api(`/academic/llamados/${llamado.id}/mesas`, { metodo: "POST", cuerpo: datos });
    await recargar();
    const cuando = llamado.publicado ? " Los alumnos la verán cuando se actualice la publicación." : "";
    avisar(`Se guardó la mesa de «${mesa.materia}».${cuando}`);
    return mesa;
  };

  const eliminarMesa = async (m) => {
    const sigueVisible = llamado.publicado
      ? " Las mesas publicadas no cambiarán hasta que se actualice la publicación."
      : "";
    const confirmado = await confirmar({
      titulo: "¿Eliminar esta mesa?",
      texto: `La mesa de «${m.materia}» se eliminará de los datos de trabajo de ${llamado.nombre}.${sigueVisible}`,
      accion: "Eliminar",
      peligro: true,
    });
    if (!confirmado) return;
    ejecutar(() => api(`/academic/mesas/${m.id}`, { metodo: "DELETE" }), `Se eliminó la mesa de «${m.materia}».`);
  };

  const publicar = async () => {
    const mesas = llamado.mesas.length;
    const contenido = mesas === 0 ? "como anuncio, sin mesas" : `con ${textoMesas(mesas)}`;
    const confirmado = await confirmar(
      llamado.publicado
        ? {
            titulo: "¿Actualizar el llamado publicado?",
            texto: `«${llamado.nombre}» se actualizará con los cambios guardados (${textoMesas(mesas)}).`,
            accion: "Actualizar",
          }
        : {
            titulo: "¿Publicar el llamado?",
            texto: `Se publicará «${llamado.nombre}» ${contenido}. Los alumnos lo verán en la página de Alumnos.`,
            accion: "Publicar",
          },
    );
    if (!confirmado) return;
    const mensaje = llamado.publicado ? "Se actualizó la publicación." : "Se publicó el llamado.";
    ejecutar(() => api(`/academic/llamados/${llamado.id}/publicar`, { metodo: "POST" }), mensaje);
  };

  const retirar = async () => {
    const confirmado = await confirmar({
      titulo: "¿Retirar la publicación?",
      texto: "Los alumnos dejarán de ver este llamado. Los datos se conservarán porque ya fue publicado.",
      accion: "Retirar",
    });
    if (!confirmado) return;
    ejecutar(() => api(`/academic/llamados/${llamado.id}/retirar`, { metodo: "POST" }), "Se retiró la publicación.");
  };

  const eliminarLlamado = async () => {
    const confirmado = await confirmar({
      titulo: "¿Eliminar el llamado?",
      texto: `Se eliminarán «${llamado.nombre}» y sus ${textoMesas(llamado.mesas.length)}. Esta acción no se puede deshacer.`,
      accion: "Eliminar",
      peligro: true,
    });
    if (!confirmado) return;
    const { nombre } = llamado;
    setOcupado(true);
    avisar("");
    try {
      await api(`/academic/llamados/${llamado.id}`, { metodo: "DELETE" });
      const lista = await cargarLlamados();
      setVista("resumen");
      setElegido(lista[0]?.id ?? "");
      avisar(`Se eliminó el llamado «${nombre}».`);
    } catch (err) {
      avisar(err.message, true);
    } finally {
      setOcupado(false);
    }
  };

  // El error de la descarga se muestra dentro de la vista previa, junto al botón.
  const [descarga, setDescarga] = useState({ enCurso: false, error: "" });
  const descargarVistaPrevia = async () => {
    setDescarga({ enCurso: true, error: "" });
    try {
      await descargar(
        `/academic/llamados/${llamado.id}/vista-previa.pdf`,
        `vista-previa-mesas-${paraArchivo(llamado.nombre)}.pdf`,
      );
      setDescarga({ enCurso: false, error: "" });
    } catch (err) {
      setDescarga({ enCurso: false, error: err.message });
    }
  };

  const aulas = [...new Set((llamado?.mesas ?? []).map((m) => m.aula).filter(Boolean))].sort();

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

        {llamados && llamados.length > 0 && (
          <div className="selector-periodo">
            <div className="campo">
              <label htmlFor="m-llamado">Llamado</label>
              <select
                id="m-llamado"
                value={elegido}
                disabled={ocupado}
                onChange={(e) => elegirLlamado(e.target.value)}
              >
                {llamados.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                    {l.publicado ? " · Publicado" : " · No publicado"}
                  </option>
                ))}
                <option value={NUEVO}>Nuevo llamado…</option>
              </select>
            </div>
          </div>
        )}

        <p className={"aviso" + (aviso.texto ? " visible" : "") + (aviso.error ? " error" : "")} role="status">
          {aviso.texto}
        </p>

        {!llamados && !aviso.error && <p>Cargando…</p>}

        {llamados && llamados.length === 0 && (
          <div className="caja estado-vacio">
            <p>
              <strong>Todavía no hay llamados de mesas de examen.</strong>
            </p>
            <p>Un llamado agrupa las mesas de un período de exámenes, por ejemplo Febrero 2027.</p>
            <button
              className="boton boton-verde"
              type="button"
              onClick={() => setModal({ tipo: "llamado", nuevo: true })}
            >
              + Nuevo llamado
            </button>
          </div>
        )}

        {llamado && vista === "resumen" && (
          <ResumenLlamado
            llamado={llamado}
            ocupado={ocupado}
            alEditarDatos={() => setModal({ tipo: "llamado", nuevo: false })}
            alAbrirTabla={() => setVista("tabla")}
            alVerCambios={() => setModal({ tipo: "cambios" })}
            alVistaPrevia={() => {
              setDescarga({ enCurso: false, error: "" });
              setModal({ tipo: "vista" });
            }}
            alPublicar={publicar}
            alRetirar={retirar}
            alEliminar={eliminarLlamado}
          />
        )}

        {llamado && vista === "tabla" && (
          <section className="caja seccion-horarios" aria-labelledby="titulo-mesas">
            <button className="boton-texto" type="button" onClick={() => setVista("resumen")}>
              ← Volver al resumen
            </button>
            <div className="cabecera-tabla">
              <h2 id="titulo-mesas">Mesas · {llamado.nombre}</h2>
              <div className="acciones">
                <button
                  className="boton boton-verde"
                  type="button"
                  disabled={ocupado}
                  onClick={() => setModal({ tipo: "mesa" })}
                >
                  + Agregar mesa
                </button>
              </div>
            </div>
            {llamado.mesas.length === 0 ? (
              <div className="estado-vacio">
                <p>
                  <strong>Todavía no hay mesas cargadas.</strong>
                </p>
                <p>Sin mesas, el llamado se puede publicar como anuncio.</p>
              </div>
            ) : (
              <TablaMesas
                mesas={llamado.mesas}
                ocupado={ocupado}
                alEditar={(m) => setModal({ tipo: "mesa", mesa: m })}
                alEliminar={eliminarMesa}
              />
            )}
          </section>
        )}

        <Modal
          abierto={modal?.tipo === "llamado"}
          titulo={modal?.nuevo ? "Nuevo llamado" : "Datos del llamado"}
          alCerrar={cerrarFormulario}
          bloqueado={modalOcupado}
        >
          <FormLlamado
            llamado={modal?.nuevo ? null : llamado}
            alGuardar={guardarLlamado}
            alTerminar={terminarFormulario}
            alCancelar={cerrarFormulario}
            alCambiarSucio={marcarSucio}
            alCambiarOcupado={setModalOcupado}
          />
        </Modal>

        <Modal
          abierto={modal?.tipo === "mesa"}
          titulo={modal?.mesa ? "Editar mesa" : `Agregar mesa · ${llamado?.nombre ?? ""}`}
          alCerrar={cerrarFormulario}
          bloqueado={modalOcupado}
        >
          <FormMesa
            mesa={modal?.mesa}
            aulas={aulas}
            alGuardar={guardarMesa}
            alTerminar={terminarFormulario}
            alCancelar={cerrarFormulario}
            alCambiarSucio={marcarSucio}
            alCambiarOcupado={setModalOcupado}
          />
        </Modal>

        <Modal abierto={modal?.tipo === "cambios"} titulo="Cambios sin publicar" alCerrar={cerrarModal} ancha>
          <p>Lo que verán los alumnos cuando se actualice la publicación.</p>
          <div className="tabla-caja">
            <table>
              <thead>
                <tr>
                  <th scope="col">Mesa o dato</th>
                  <th scope="col">Qué cambió</th>
                  <th scope="col">Publicado</th>
                  <th scope="col">Guardado</th>
                </tr>
              </thead>
              <tbody>
                {llamado?.cambios.map((c, i) => (
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
          titulo={`Vista previa · ${llamado?.nombre ?? ""}`}
          alCerrar={cerrarModal}
          ancha
        >
          <p className="aviso visible aviso-vista-previa">
            Vista previa — Versión de trabajo. Así se vería en la página de Alumnos con lo guardado. No es lo publicado.
          </p>
          {llamado && <LlamadoPublico llamado={llamado} />}
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
