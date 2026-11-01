import { useState } from "react";
import { useFormularioDeContenido } from "./formularioContenido.js";

// Datos de contacto que se muestran en Contacto y en el pie. No cambia el formulario de consultas ni las
// casillas que reciben los correos (esas se configuran en el servidor).
export default function FormContacto({ seccion, alGuardar, alCambiarSucio, alCambiarOcupado }) {
  const [inicial] = useState(() => seccion.datos);
  const [form, setForm] = useState(inicial);
  const { error, guardando, guardar } = useFormularioDeContenido({
    datos: form,
    inicial,
    alGuardar,
    alCambiarSucio,
    alCambiarOcupado,
  });

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  return (
    <form noValidate onSubmit={guardar}>
      {/* Mientras se guarda no se puede editar: lo escrito se perdería al rearmar el formulario. */}
      <fieldset className="campos-formulario" disabled={guardando}>
        <div className="fila">
          <div className="campo">
            <label htmlFor="c-direccion">Dirección</label>
            <input id="c-direccion" maxLength={100} value={form.direccion} onChange={cambiar("direccion")} />
          </div>
          <div className="campo">
            <label htmlFor="c-localidad">Barrio y ciudad</label>
            <input id="c-localidad" maxLength={100} value={form.localidad} onChange={cambiar("localidad")} />
          </div>
        </div>
        <div className="fila">
          <div className="campo">
            <label htmlFor="c-horario">Horario</label>
            <input id="c-horario" maxLength={100} value={form.horario} onChange={cambiar("horario")} />
            <span className="ayuda">Por ejemplo: Lunes a viernes, de 18 a 22 h.</span>
          </div>
          <div className="campo">
            <label htmlFor="c-modalidad">Modalidad (opcional)</label>
            <input id="c-modalidad" maxLength={100} value={form.modalidad} onChange={cambiar("modalidad")} />
          </div>
        </div>
        <div className="fila">
          <div className="campo">
            <label htmlFor="c-telefono">Teléfono (opcional)</label>
            <input id="c-telefono" type="tel" maxLength={30} value={form.telefono} onChange={cambiar("telefono")} />
            <span className="ayuda">Si queda vacío, no se muestra en el sitio.</span>
          </div>
          <div className="campo">
            <label htmlFor="c-correo">Correo (opcional)</label>
            <input id="c-correo" type="email" maxLength={150} value={form.correo} onChange={cambiar("correo")} />
            <span className="ayuda">Si queda vacío, no se muestra en el sitio.</span>
          </div>
        </div>
      </fieldset>

      <p className={"aviso" + (error ? " visible error" : "")} role="alert">
        {error}
      </p>
      <div className="acciones">
        <button className="boton boton-verde" type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
