import { Link } from "react-router-dom";
import { IMGS } from "../imagenes";
import HorariosDeCursada from "../components/HorariosDeCursada.jsx";

export default function Alumnos() {
  return (
    <div className="pagina activa">
      <section className="banner velo-suave" style={{ "--foto": `url(${IMGS.B_ALUMNOS})` }}>
        <div className="contenedor">
          <h1>Alumnos</h1>
          <span className="raya" aria-hidden="true" />
          <p>Horarios de cursada, mesas de examen y plataformas del instituto.</p>
        </div>
      </section>
      <section className="seccion">
        <div className="contenedor">
          <HorariosDeCursada />
          <div className="caja proximamente">
            <h2>Mesas de examen</h2>
            <p>
              Las fechas de las mesas de examen se van a publicar en esta sección. Mientras tanto, consultalas en
              Bedelía desde <Link to="/contacto">Contacto</Link>.
            </p>
          </div>
        </div>
      </section>
      <section className="seccion seccion-alt">
        <div className="contenedor">
          <div className="cabecera">
            <h2>Enlaces útiles</h2>
            <span className="raya" aria-hidden="true" />
            <p>Las plataformas que usás durante la cursada, en un solo lugar.</p>
          </div>
          <ul className="enlaces dos-col">
            <li>
              <Link to="/alumnos">
                <span>
                  <strong>SIU Guaraní: alumnos</strong>
                  <span>Inscripción a materias y exámenes, historia académica</span>
                  <span className="externo">Sitio externo</span>
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
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </span>
              </Link>
            </li>
            <li>
              <Link to="/alumnos">
                <span>
                  <strong>SIU Guaraní: gestión académica</strong>
                  <span>Acceso para profesores y Secretaría Académica</span>
                  <span className="externo">Sitio externo</span>
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
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </span>
              </Link>
            </li>
            <li>
              <Link to="/alumnos">
                <span>
                  <strong>Aulas virtuales</strong>
                  <span>Campus Moodle del instituto</span>
                  <span className="externo">Sitio externo</span>
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
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </span>
              </Link>
            </li>
            <li>
              <Link to="/alumnos">
                <span>
                  <strong>Mi Argentina</strong>
                  <span>Título digital para egresados</span>
                  <span className="externo">Sitio externo</span>
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
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
