import { Link } from "react-router-dom";
import { IMGS } from "../imagenes";
import { ENLACES, EXTERNO } from "../enlaces.js";

export default function Footer() {
  return (
    <footer className="pie" id="pie">
      <div className="contenedor">
        <div>
          <div className="logo-pie">
            <img src={IMGS.LOGO} alt="" />
            <strong>IFTS N.° 2</strong>
          </div>
          <p>
            Instituto de Formación Técnica Superior N.° 2, D.E. 20.
            <br />
            Ministerio de Educación, Gobierno de la Ciudad de Buenos Aires.
          </p>
        </div>
        <div>
          <h3>El instituto</h3>
          <ul>
            <li>
              <Link to="/carrera">La carrera</Link>
            </li>
            <li>
              <Link to="/carrera#plan-estudios">Plan de estudios</Link>
            </li>
            <li>
              <Link to="/ingreso">Ingreso</Link>
            </li>
            <li>
              <Link to="/carrera">Autoridades y tutoría</Link>
            </li>
            <li>
              <Link to="/eventos">Eventos</Link>
            </li>
            <li>
              <Link to="/contacto">Contacto</Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>Plataformas</h3>
          <ul>
            <li>
              <a href={ENLACES.siuAlumnos} {...EXTERNO}>
                SIU Guaraní
                <span className="solo-lectores"> (se abre en otra pestaña)</span>
              </a>
            </li>
            <li>
              <a href={ENLACES.aulasVirtuales} {...EXTERNO}>
                Aulas virtuales
                <span className="solo-lectores"> (se abre en otra pestaña)</span>
              </a>
            </li>
            <li>
              <a href={ENLACES.miArgentina} {...EXTERNO}>
                Mi Argentina
                <span className="solo-lectores"> (se abre en otra pestaña)</span>
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3>Redes</h3>
          <ul>
            <li>
              <a href={ENLACES.instagram} {...EXTERNO}>
                Instagram
                <span className="solo-lectores"> (se abre en otra pestaña)</span>
              </a>
            </li>
            <li>
              <a href={ENLACES.facebook} {...EXTERNO}>
                Facebook
                <span className="solo-lectores"> (se abre en otra pestaña)</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="pie-final">
        <div className="contenedor">
          <p style={{ color: "#e4f1e9" }}>Cañada de Gómez 3850, Villa Lugano, CABA</p>
          <Link to="/login">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Acceso institucional
          </Link>
        </div>
      </div>
    </footer>
  );
}
