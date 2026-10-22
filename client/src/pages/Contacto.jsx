import { useState } from "react";
import { Link } from "react-router-dom";
import { IMGS } from "../imagenes";
import { api } from "../api";

// Misma regla que el servidor (validarConsulta en server/src/services/contacto.js): números,
// espacios, guiones, paréntesis y un + inicial, con 6 a 15 dígitos. Se controla antes de enviar
// para no gastar un intento del límite; el servidor la vuelve a controlar.
function telefonoValido(telefono) {
  if (!telefono) return true;
  const digitos = telefono.replace(/\D/g, "").length;
  return /^\+?[\d\s()-]+$/.test(telefono) && digitos >= 6 && digitos <= 15;
}

// Formulario de contacto: envía la consulta a POST /api/contact, que la manda por correo.
// Las validaciones definitivas las hace el servidor. Antes de enviar, el navegador revisa los
// campos obligatorios, el formato del correo y el largo máximo; telefonoValido revisa el teléfono.
export default function Contacto() {
  const [enviando, setEnviando] = useState(false);
  // Resultado del último envío: { tipo: "exito" | "error", texto }.
  const [aviso, setAviso] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    // Los "name" de los campos son los que espera el servidor.
    const consulta = Object.fromEntries(new FormData(form));
    if (!telefonoValido(consulta.telefono.trim())) {
      setAviso({
        tipo: "error",
        texto: "El teléfono no tiene un formato válido. Podés dejarlo vacío.",
      });
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      await api("/contact", { metodo: "POST", cuerpo: consulta });
      form.reset();
      setAviso({
        tipo: "exito",
        texto: "Tu consulta fue enviada. Te vamos a responder al correo que ingresaste.",
      });
    } catch (err) {
      setAviso({ tipo: "error", texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pagina activa">
      <section className="banner velo-suave" style={{ "--foto": `url(${IMGS.B_CONTACTO})` }}>
        <div className="contenedor">
          <h1>Contacto</h1>
          <span className="raya" aria-hidden="true" />
          <p>Escribinos y te respondemos por correo.</p>
        </div>
      </section>
      <section className="seccion">
        <div className="contenedor dos">
          <form className="tarjeta-simple" onSubmit={enviar}>
            <div className="fila">
              <div className="campo">
                <label htmlFor="c-nombre">Nombre y apellido</label>
                <input
                  id="c-nombre"
                  name="nombre"
                  autoComplete="name"
                  placeholder="Ej.: Lucía Fernández"
                  required
                  maxLength={100}
                />
              </div>
              <div className="campo">
                <label htmlFor="c-mail">Correo electrónico</label>
                <input
                  id="c-mail"
                  name="mail"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@correo.com"
                  required
                  maxLength={150}
                />
              </div>
            </div>
            <div className="fila">
              <div className="campo">
                <label htmlFor="c-tel">Teléfono (opcional)</label>
                <input
                  id="c-tel"
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Ej.: 11 4567-8901"
                  maxLength={30}
                />
              </div>
              <div className="campo">
                <label htmlFor="c-motivo">Motivo de la consulta</label>
                {/* Los value son las claves que acepta el servidor (MOTIVOS en services/contacto.js). */}
                <select id="c-motivo" name="motivo" required defaultValue="">
                  <option value="">Elegí un motivo</option>
                  <option value="inscripcion">Inscripción a la carrera</option>
                  <option value="equivalencias">Equivalencias</option>
                  <option value="horarios">Horarios y mesas de examen</option>
                  <option value="tramites">Trámites y certificados</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="c-msj">Mensaje</label>
              <textarea
                id="c-msj"
                name="mensaje"
                placeholder="Escribí tu consulta"
                required
                maxLength={3000}
              />
            </div>
            {/* Honeypot: campo trampa para robots. Una persona no lo ve ni llega con el teclado. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-10000px",
                width: "1px",
                height: "1px",
                overflow: "hidden",
              }}
            >
              <label htmlFor="c-sitio">No completar</label>
              <input id="c-sitio" name="sitioWeb" tabIndex={-1} autoComplete="off" />
            </div>
            <button className="boton boton-naranja" type="submit" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar consulta"}
            </button>
            <p
              role="status"
              className={
                "aviso" + (aviso ? " visible" : "") + (aviso?.tipo === "error" ? " error" : "")
              }
            >
              {aviso?.texto}
            </p>
          </form>
          <div className="tarjeta-simple">
            <h3 style={{ marginBottom: "18px" }}>Dónde y cuándo</h3>
            <ul className="enlaces">
              <li>
                <Link to="/contacto">
                  <span>
                    <strong>Cañada de Gómez 3850</strong>
                    <span>Villa Lugano, Ciudad de Buenos Aires</span>
                  </span>
                  <span className="flecha">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/contacto">
                  <span>
                    <strong>Lunes a viernes, de 18 a 22 h</strong>
                    <span>Cursada presencial</span>
                  </span>
                  <span className="flecha">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/contacto">
                  <span>
                    <strong>Instagram</strong>
                    <span>@ifts_2_ok</span>
                  </span>
                  <span className="flecha">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                    </svg>
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
