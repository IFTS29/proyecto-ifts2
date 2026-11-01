import { IMGS } from "../imagenes";
import HorariosDeCursada from "../components/HorariosDeCursada.jsx";
import MesasDeExamen from "../components/MesasDeExamen.jsx";
import { ENLACES, EXTERNO } from "../enlaces.js";

// Enlaces útiles, en este orden. El acceso de gestión académica va al final: es para docentes y Secretaría.
const PLATAFORMAS = [
  {
    titulo: "SIU Guaraní: alumnos",
    detalle: "Inscripción a materias y exámenes, historia académica",
    href: ENLACES.siuAlumnos,
  },
  { titulo: "Aulas virtuales", detalle: "Campus Moodle del instituto", href: ENLACES.aulasVirtuales },
  {
    titulo: "Mi Argentina",
    detalle: "Título digital emitido por la Ciudad (sistema SITED)",
    href: ENLACES.miArgentina,
  },
  {
    titulo: "Becas Progresar",
    detalle: "Programa de becas para estudiantes de nivel superior",
    href: ENLACES.progresar,
  },
  {
    titulo: "SIU Guaraní: gestión académica",
    detalle: "Acceso para docentes y Secretaría Académica",
    href: ENLACES.siuGestion,
  },
];

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
          <MesasDeExamen />
        </div>
      </section>
      <section className="seccion seccion-alt">
        <div className="contenedor">
          <div className="cabecera">
            <h2>Enlaces útiles</h2>
            <span className="raya" aria-hidden="true" />
            <p>Plataformas y servicios útiles, en un solo lugar.</p>
          </div>
          <ul className="enlaces dos-col">
            {PLATAFORMAS.map((p) => (
              <li key={p.titulo}>
                <a href={p.href} {...EXTERNO}>
                  <span>
                    <strong>{p.titulo}</strong>
                    <span>{p.detalle}</span>
                    <span className="externo">
                      Sitio externo<span className="solo-lectores">, se abre en otra pestaña</span>
                    </span>
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
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
