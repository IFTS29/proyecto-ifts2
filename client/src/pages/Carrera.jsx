import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { IMGS } from "../imagenes";
import { irA } from "../utils";
import { SIN_DATOS, agruparPersonas, iniciales, useContenidoInstitucional } from "../contenido.js";
import {
  ALCANCES_DEL_TITULO,
  ANIOS,
  AREAS,
  CORRELATIVIDADES,
  FUENTE_ALCANCES,
  FUENTE_ANIOS,
  FUENTE_CORRELATIVIDADES,
  FUENTE_PLAN,
  AVISO_PROMOCIONABLES,
  nombreAnio,
  textoCantidad,
  totalCarrera,
} from "../planDeEstudios.js";
import { DOCUMENTOS } from "../documentos.js";
import Documento from "../components/Documento.jsx";
import TablaPlan from "../components/TablaPlan.jsx";

// Cómo se organiza el plan: por año (al entrar) o por área, cada uno con sus filtros.
const VISTAS = [
  { valor: "anio", nombre: "Por año" },
  { valor: "area", nombre: "Por área" },
];

export default function Carrera() {
  // Al entrar: el plan completo, por año.
  const [vista, setVista] = useState("anio");
  const [filtro, setFiltro] = useState("todos");
  const { hash } = useLocation();
  const { estado, contenido } = useContenidoInstitucional();

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  // Las tarjetas de áreas abren el plan por área, con esa área elegida.
  const abrirPlan = (e, clave) => {
    e.preventDefault();
    setVista("area");
    setFiltro(clave);
    irA("plan-estudios");
  };

  const cambiarVista = (valor) => {
    setVista(valor);
    setFiltro("todos");
  };

  const filtros =
    vista === "anio"
      ? [{ valor: "todos", nombre: "Todos" }, ...ANIOS.map((a) => ({ valor: a, nombre: nombreAnio(a) }))]
      : [{ valor: "todos", nombre: "Todas" }, ...AREAS.map((a) => ({ valor: a.clave, nombre: a.nombre }))];

  return (
    <div className="pagina activa">
      <section className="banner velo-medio" style={{ "--foto": `url(${IMGS.B_CARRERA})` }}>
        <div className="contenedor">
          <h1>La carrera</h1>
          <span className="raya" aria-hidden="true" />
          <p>
            Técnico/a Superior en Emprendimientos Gastronómicos. Tres años de formación en cocina,
            gestión y emprendimiento.
          </p>
        </div>
      </section>
      <nav className="subnav" aria-label="En esta página">
        <div className="contenedor">
          <button type="button" onClick={() => irA("perfil")}>
            Perfil del egresado
          </button>
          <button type="button" onClick={() => irA("aprender")}>
            ¿Qué vas a aprender?
          </button>
          <button type="button" onClick={() => irA("plan-estudios")}>
            Plan de estudios
          </button>
          <button type="button" onClick={() => irA("autoridades")}>
            Autoridades y tutoría
          </button>
        </div>
      </nav>
      <section className="seccion" id="perfil">
        <div className="contenedor dos">
          <div className="texto-largo">
            <h2>Perfil del egresado</h2>
            <span className="raya" aria-hidden="true" />
            {estado === "listo" ? (
              contenido.perfil.datos.parrafos.map((parrafo, i) => <p key={i}>{parrafo}</p>)
            ) : (
              <p>{estado === "error" ? SIN_DATOS : "Cargando…"}</p>
            )}
            <h3 className="titulo-alcances">Alcances del título</h3>
            <p>{ALCANCES_DEL_TITULO}</p>
            <p className="fuente">Fuente: {FUENTE_ALCANCES}.</p>
            <div className="acciones">
              <button className="boton boton-verde" type="button" onClick={() => irA("plan-estudios")}>
                Ver plan de estudios
              </button>
              <Link className="enlace" to="/contacto">
                Consultar por la inscripción
              </Link>
            </div>
          </div>
          <div className="tarjeta-simple">
            <h3 className="titulo-tarjeta">Datos de la carrera</h3>
            <dl className="datos-carrera">
              <div>
                <dt>Título</dt>
                <dd>Técnico/a Superior en Emprendimientos Gastronómicos</dd>
              </div>
              <div>
                <dt>Duración y carga horaria</dt>
                <dd>3 años, {totalCarrera()} horas cátedra</dd>
              </div>
              <div>
                <dt>Requisito</dt>
                <dd>Nivel secundario completo</dd>
              </div>
              <div>
                <dt>Cursada</dt>
                <dd>Presencial, de lunes a viernes de 18 a 22 h</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
      <section className="seccion seccion-alt" id="aprender">
        <div className="contenedor">
          <div className="cabecera">
            <h2>¿Qué vas a aprender?</h2>
            <span className="raya" aria-hidden="true" />
            <p>Cuatro áreas formativas que combinan cocina, gestión y práctica profesional.</p>
          </div>
          <ul className="areas">
            <li>
              <a
                className="area area-verde"
                href="#plan-estudios"
                onClick={(e) => abrirPlan(e, "produccion")}
              >
                <div className="area-cab">
                  <span className="icono ic-verde">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M17 3c-2 1.5-3 4-3 7h3v11" />
                    </svg>
                  </span>
                  <h3>Producción gastronómica</h3>
                </div>
                <p>
                  Talleres de carnes, vegetales, pizzas y pastas, panadería, pastelería, buffet,
                  catering y cocina nacional e internacional.
                </p>
                <span className="base-area">
                  <span className="cuenta">{textoCantidad("produccion")}</span>
                  <span className="ver-mat">Ver materias</span>
                </span>
              </a>
            </li>
            <li>
              <a
                className="area area-naranja"
                href="#plan-estudios"
                onClick={(e) => abrirPlan(e, "gestion")}
              >
                <div className="area-cab">
                  <span className="icono ic-naranja">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 21h18M6 17v-5M11 17V7M16 17v-8M20 6l-4 3-5-2-5 4" />
                    </svg>
                  </span>
                  <h3>Gestión y administración</h3>
                </div>
                <p>
                  Microempresa, contabilidad, comercialización, recursos humanos, compras y
                  organización de eventos gastronómicos.
                </p>
                <span className="base-area">
                  <span className="cuenta">{textoCantidad("gestion")}</span>
                  <span className="ver-mat">Ver materias</span>
                </span>
              </a>
            </li>
            <li>
              <a
                className="area area-verde"
                href="#plan-estudios"
                onClick={(e) => abrirPlan(e, "analisis")}
              >
                <div className="area-cab">
                  <span className="icono ic-verde">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="M20.5 20.5l-4.8-4.8" />
                    </svg>
                  </span>
                  <h3>Análisis del sector</h3>
                </div>
                <p>
                  Introducción a la gastronomía, industria de la hospitalidad, economía y
                  organización empresarial.
                </p>
                <span className="base-area">
                  <span className="cuenta">{textoCantidad("analisis")}</span>
                  <span className="ver-mat">Ver materias</span>
                </span>
              </a>
            </li>
            <li>
              <a
                className="area area-naranja"
                href="#plan-estudios"
                onClick={(e) => abrirPlan(e, "practicas")}
              >
                <div className="area-cab">
                  <span className="icono ic-naranja">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 9l1.6-5h14.8L21 9M4 9h16v11H4zM9.5 20v-5.5h5V20" />
                    </svg>
                  </span>
                  <h3>Prácticas profesionales</h3>
                </div>
                <p>
                  Tres prácticas: observación organizacional, organización de la producción y diseño
                  de emprendimientos gastronómicos.
                </p>
                <span className="base-area">
                  <span className="cuenta">{textoCantidad("practicas")}</span>
                  <span className="ver-mat">Ver materias</span>
                </span>
              </a>
            </li>
          </ul>
        </div>
      </section>
      <section className="seccion" id="plan-estudios">
        <div className="contenedor">
          <div className="cabecera">
            <h2>Plan de estudios</h2>
            <span className="raya" aria-hidden="true" />
            <p>Materias, talleres y prácticas de la tecnicatura, con su régimen y su carga horaria.</p>
          </div>
          <div className="pestanas vistas-plan" role="group" aria-label="Organizar el plan">
            {VISTAS.map((v) => (
              <button key={v.valor} type="button" aria-pressed={vista === v.valor} onClick={() => cambiarVista(v.valor)}>
                {v.nombre}
              </button>
            ))}
          </div>
          <div className="pestanas filtros-plan" role="group" aria-label={vista === "anio" ? "Año de la carrera" : "Área formativa"}>
            {filtros.map((f) => (
              <button key={f.valor} type="button" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>
                {f.nombre}
              </button>
            ))}
          </div>
          <p className="fuente aviso-promocionables">
            <span className="marca-promocionable">Promocionable</span> Materias promocionables: {AVISO_PROMOCIONABLES}
          </p>
          <TablaPlan vista={vista} filtro={filtro} />
          <p className="fuente">
            Fuente: {FUENTE_PLAN}
            {vista === "anio" && <>; año y cuatrimestre: {FUENTE_ANIOS}</>}. La carga horaria se expresa en horas
            cátedra.
          </p>

          <h3 className="titulo-plan" id="correlatividades">
            Correlatividades
          </h3>
          <p>Para cursar cada instancia hay que tener aprobadas, cursadas o en curso las que se indican.</p>
          <div className="tabla-caja tabla-correlatividades">
            <table>
              <thead>
                <tr>
                  <th scope="col">Para cursar</th>
                  <th scope="col">Requiere tener</th>
                </tr>
              </thead>
              <tbody>
                {CORRELATIVIDADES.map((c) => (
                  <tr key={c.paraCursar}>
                    <th scope="row">{c.paraCursar}</th>
                    <td>{c.requiere}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fuente">
            Transcripción del {FUENTE_CORRELATIVIDADES}. Algunos nombres difieren de los de la tabla del
            plan; ante cualquier duda, consultar en Bedelía.
          </p>

          <h3 className="titulo-plan">Documentos</h3>
          <div className="documentos">
            <Documento doc={DOCUMENTOS.resolucion} />
            <Documento doc={DOCUMENTOS.anexo} />
            <Documento doc={DOCUMENTOS.correlatividades} />
            <Documento doc={DOCUMENTOS.materiasPorAnio} />
          </div>
        </div>
      </section>
      <section
        className="seccion seccion-autoridades"
        id="autoridades"
        style={{ "--foto": `url(${IMGS.AUTORIDADES})` }}
      >
        <div className="contenedor">
          <div className="cabecera">
            <h2>Autoridades y tutoría</h2>
            <span className="raya" aria-hidden="true" />
            <p>Equipo de conducción del instituto y acompañamiento a los estudiantes.</p>
          </div>
          {estado === "listo" ? (
            agruparPersonas(contenido.personas.datos.personas).map((grupo) => (
              <div className="grupo-personas" key={grupo.grupo}>
                <h3>{grupo.titulo}</h3>
                <div className="personas">
                  {grupo.personas.map((persona, i) => (
                    <div className="tarjeta-simple persona" key={i}>
                      <span className="avatar" aria-hidden="true">
                        {iniciales(persona.nombre)}
                      </span>
                      <div>
                        <strong>{persona.nombre}</strong>
                        <span>{persona.cargo}</span>
                        {persona.detalle && <span className="detalle-persona">{persona.detalle}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="estado-contenido">{estado === "error" ? SIN_DATOS : "Cargando…"}</p>
          )}
        </div>
      </section>
    </div>
  );
}
