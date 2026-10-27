import { useEffect, useId, useRef } from "react";

// Ventana modal con el elemento <dialog> del navegador. Ya trae el foco atrapado adentro,
// el cierre con Escape y el fondo oscurecido, sin sumar librerías.
// El contenido se arma solo mientras está abierta, así cada vez empieza limpio.
// Escape y la X avisan con alCerrar; quien la usa decide si se cierra (por ejemplo, si hay cambios sin guardar).
// Con "bloqueado" (mientras se guarda) no se puede cerrar. "chica" es para las confirmaciones.
export default function Modal({ abierto, titulo, alCerrar, ancha = false, chica = false, bloqueado = false, children }) {
  const ref = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className={"modal" + (ancha ? " modal-ancha" : "") + (chica ? " modal-chica" : "")}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault();
        if (!bloqueado) alCerrar();
      }}
    >
      <div className="modal-cabecera">
        <h2 id={idTitulo}>{titulo}</h2>
        <button className="modal-cerrar" type="button" aria-label="Cerrar" disabled={bloqueado} onClick={alCerrar}>
          ×
        </button>
      </div>
      {abierto && children}
    </dialog>
  );
}