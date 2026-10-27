import { createContext, useContext, useEffect, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { crearConfirmador } from "../confirmaciones.js";

const Contexto = createContext(null);

// Ventana de confirmación del panel, en lugar de la del navegador (window.confirm).
// Uso: const confirmar = useConfirmar();
//      if (!(await confirmar({ titulo, texto, accion, cancelar, peligro }))) return;
// "accion" es el texto del botón principal ("Ocultar", "Eliminar"…); con "peligro" va en rojo.
// El foco empieza en Cancelar, así un Enter sin querer no ejecuta la acción.
export function ConfirmacionProvider({ children }) {
  const [pedido, setPedido] = useState(null);
  const confirmador = useRef(null);
  if (!confirmador.current) confirmador.current = crearConfirmador(setPedido);
  const botonCancelar = useRef(null);

  useEffect(() => {
    if (pedido) botonCancelar.current?.focus();
  }, [pedido]);

  // Si la aplicación se desmonta con una pregunta abierta, la respuesta es "no".
  useEffect(() => () => confirmador.current.responder(false), []);

  const responder = (respuesta) => confirmador.current.responder(respuesta);

  return (
    <Contexto.Provider value={confirmador.current.pedir}>
      {children}
      <Modal abierto={pedido !== null} titulo={pedido?.titulo ?? ""} alCerrar={() => responder(false)} chica>
        {pedido && (
          <>
            {pedido.texto && <p className="confirmacion-texto">{pedido.texto}</p>}
            <div className="confirmacion-acciones">
              <button
                ref={botonCancelar}
                type="button"
                className="boton boton-linea boton-cancelar"
                onClick={() => responder(false)}
              >
                {pedido.cancelar || "Cancelar"}
              </button>
              <button
                type="button"
                className={"boton " + (pedido.peligro ? "boton-peligro" : "boton-verde")}
                onClick={() => responder(true)}
              >
                {pedido.accion}
              </button>
            </div>
          </>
        )}
      </Modal>
    </Contexto.Provider>
  );
}

export function useConfirmar() {
  const confirmar = useContext(Contexto);
  if (!confirmar) throw new Error("useConfirmar se usa dentro de ConfirmacionProvider (ver main.jsx).");
  return confirmar;
}
