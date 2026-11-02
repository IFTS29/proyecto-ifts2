import { useCallback, useEffect, useRef, useState } from "react";

// Lista de filas plegables del panel (etapas de Ingreso, preguntas frecuentes): se agregan, se quitan, se
// ordenan con las flechas y se pliegan o despliegan. Cada fila lleva una clave propia para que React no mezcle
// los campos al moverlas. "prefijo" arma el id del primer campo, para llevar el foco a la fila nueva.
export function useFilas(iniciales, prefijo) {
  const proxima = useRef(0);
  const conClave = (fila) => ({ ...fila, clave: proxima.current++ });
  const [filas, setFilas] = useState(() => iniciales.map(conClave));
  const [abiertas, setAbiertas] = useState(() => new Set());
  const [enfocar, setEnfocar] = useState(null);
  useEffect(() => {
    if (enfocar !== null) document.getElementById(`${prefijo}-${enfocar}`)?.focus();
  }, [enfocar, prefijo]);

  // Estables entre renderizados: el formulario usa "abrir" en un efecto (desplegar la fila con error).
  const abrir = useCallback((clave) => setAbiertas((antes) => new Set(antes).add(clave)), []);
  const alternar = useCallback(
    (clave) =>
      setAbiertas((antes) => {
        const nuevas = new Set(antes);
        if (!nuevas.delete(clave)) nuevas.add(clave);
        return nuevas;
      }),
    [],
  );

  return {
    filas,
    valores: filas.map(({ clave, ...fila }) => fila),
    cambiar: (i, campo) => (e) => setFilas(filas.map((f, j) => (j === i ? { ...f, [campo]: e.target.value } : f))),
    quitar: (i) => setFilas(filas.filter((_, j) => j !== i)),
    mover: (i, paso) => {
      const nuevas = [...filas];
      [nuevas[i], nuevas[i + paso]] = [nuevas[i + paso], nuevas[i]];
      setFilas(nuevas);
    },
    // Reemplaza los valores conservando las claves y lo que estaba desplegado (por ejemplo, al vaciar fechas).
    reemplazar: (valores) => setFilas(filas.map((f, i) => ({ ...valores[i], clave: f.clave }))),
    agregar: (vacia) => {
      const nueva = conClave(vacia);
      setFilas([...filas, nueva]);
      abrir(nueva.clave);
      setEnfocar(nueva.clave);
    },
    estaAbierta: (clave) => abiertas.has(clave),
    abrir,
    alternar,
  };
}

// El servidor descarta las filas vacías y numera las demás («Etapa 2: …»). Devuelve la clave de la fila a la
// que se refiere el error, contando solo las filas con algo escrito, o null si el error no es de una fila.
export function filaDelError(error, etiqueta, filas, campos) {
  const numero = String(error || "").match(new RegExp(`^${etiqueta} (\\d+): `))?.[1];
  if (!numero) return null;
  const cargadas = filas.filter((f) => campos.some((c) => String(f[c] ?? "").trim()));
  return cargadas[Number(numero) - 1]?.clave ?? null;
}
