import { useEffect, useState } from "react";

// Lo que comparten los formularios del contenido institucional: avisar si hay cambios sin guardar,
// avisar si se está guardando y mostrar el error que devuelve el servidor.
// El formulario se vuelve a armar después de guardar (AdminContenido le cambia la "key"), así que lo
// guardado pasa a ser el nuevo punto de partida.
// "validar" (opcional) revisa algo que el servidor no puede saber, como un desplegable elegido a medias:
// devuelve el mensaje de error o "".
export function useFormularioDeContenido({ datos, inicial, alGuardar, alCambiarSucio, alCambiarOcupado, validar }) {
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const sucio = JSON.stringify(datos) !== JSON.stringify(inicial);
  useEffect(() => {
    alCambiarSucio(sucio);
  }, [sucio, alCambiarSucio]);
  useEffect(() => {
    alCambiarOcupado(guardando);
    return () => alCambiarOcupado(false);
  }, [guardando, alCambiarOcupado]);

  const guardar = async (e) => {
    e.preventDefault();
    const problema = validar?.() ?? "";
    setError(problema);
    if (problema) return;
    setGuardando(true);
    try {
      await alGuardar(datos);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return { error, guardando, guardar };
}
