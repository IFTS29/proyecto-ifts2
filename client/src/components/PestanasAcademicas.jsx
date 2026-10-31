import { Link, useLocation } from "react-router-dom";

const SECCIONES = [
  { ruta: "/admin-academica", texto: "Horarios de cursada" },
  { ruta: "/admin-mesas", texto: "Mesas de examen" },
];

// Pestañas de Información académica. Cada una es una pantalla del panel con su propia dirección.
export default function PestanasAcademicas() {
  const { pathname } = useLocation();
  return (
    <nav className="pestanas" aria-label="Información académica">
      {SECCIONES.map((s) => (
        <Link key={s.ruta} to={s.ruta} aria-current={pathname === s.ruta ? "page" : undefined}>
          {s.texto}
        </Link>
      ))}
    </nav>
  );
}
