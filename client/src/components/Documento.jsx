import { useState } from "react";
import { compartirDocumento, datosDelArchivo, nombreDeDescarga } from "../documentos.js";

// Un documento para consultar: nombre, tipo y tamaño, y las acciones Ver, Descargar y Compartir.
// «Ver» abre el visor del navegador (en el celular, el del sistema), que ya trae zoom, búsqueda,
// impresión y descarga: no se programa un visor propio.
export default function Documento({ doc }) {
  const [aviso, setAviso] = useState("");
  const datos = datosDelArchivo(doc);

  const compartir = async () => {
    setAviso("");
    setAviso(await compartirDocumento(doc));
  };

  return (
    <div className="documento">
      <span className="icono-doc" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6M8 13h8M8 17h5" />
        </svg>
      </span>
      <div className="texto-doc">
        <strong>{doc.titulo}</strong>
        {doc.descripcion && <span>{doc.descripcion}</span>}
        <span className="datos-doc">{datos}</span>
      </div>
      <div className="acciones-doc">
        <a className="boton boton-linea boton-chico" href={doc.archivo} target="_blank" rel="noopener noreferrer">
          Ver
          <span className="solo-lectores">
            {" "}
            {doc.titulo} ({datos}), se abre en otra pestaña
          </span>
        </a>
        <a className="boton boton-linea boton-chico" href={doc.archivo} download={nombreDeDescarga(doc)}>
          Descargar
          <span className="solo-lectores">
            {" "}
            {doc.titulo} ({datos})
          </span>
        </a>
        <button className="boton boton-linea boton-chico" type="button" onClick={compartir}>
          Compartir
          <span className="solo-lectores"> {doc.titulo}</span>
        </button>
      </div>
      <p className="aviso-doc" role="status">
        {aviso}
      </p>
    </div>
  );
}
