import test from "node:test";
import assert from "node:assert/strict";
// Ayudas del panel (client/src/eventos.js): no usan React, así que se prueban acá con el resto.
import {
  cambiaronLasFotos,
  datosBasicosParaEnviar,
  diaEnArgentina,
  faltaUnDato,
  fechaDelDia,
  fotosDeEvento,
  fotosQuitadas,
  usarComoPortada,
  valoresDeEvento,
  volverAPoner,
} from "../../client/src/eventos.js";

test("un día elegido se guarda a mediodía de Argentina y se sigue viendo como ese día", () => {
  assert.equal(fechaDelDia("2026-10-05"), "2026-10-05T15:00:00.000Z");
  assert.equal(diaEnArgentina(fechaDelDia("2026-10-05")), "2026-10-05");
});

test("el formulario muestra el día como se ve en Argentina", () => {
  assert.equal(valoresDeEvento({ fechaEvento: "2026-10-05T18:00:00.000Z" }).fecha, "2026-10-05");
  // Las 01:00 UTC del 5 son las 22:00 del 4 en Argentina.
  assert.equal(valoresDeEvento({ fechaEvento: "2026-10-05T01:00:00.000Z" }).fecha, "2026-10-04");
});

test("al editar, si no se cambió el día, no se manda la fecha y se conserva la original con su hora", () => {
  const inicial = valoresDeEvento({ titulo: "Muestra", descripcion: "x", fechaEvento: "2026-10-05T18:00:00.000Z" });

  const soloTitulo = datosBasicosParaEnviar({ ...inicial, titulo: "Muestra de panadería" }, inicial);
  assert.equal("fechaEvento" in soloTitulo, false);

  const otroDia = datosBasicosParaEnviar({ ...inicial, fecha: "2026-10-07" }, inicial);
  assert.equal(otroDia.fechaEvento, "2026-10-07T15:00:00.000Z");
});

test("en el alta siempre se manda la fecha elegida", () => {
  const valores = { titulo: " Muestra ", resumen: "", descripcion: " x ", fecha: "2026-10-05" };
  assert.deepEqual(datosBasicosParaEnviar(valores), {
    titulo: "Muestra",
    resumen: "",
    descripcion: "x",
    fechaEvento: "2026-10-05T15:00:00.000Z",
  });
});

test("título, fecha y descripción son obligatorios, también al editar", () => {
  const completo = { titulo: "Muestra", resumen: "", descripcion: "x", fecha: "2026-10-05" };
  assert.equal(faltaUnDato(completo), "");
  assert.match(faltaUnDato({ ...completo, titulo: "  " }), /título/);
  assert.match(faltaUnDato({ ...completo, fecha: "" }), /fecha/);
  assert.match(faltaUnDato({ ...completo, descripcion: "" }), /descripción/);
});

// ----- Fotos de la galería -----

const foto = (n) => ({ id: `f${n}`, url: `https://res.cloudinary.com/prueba/f${n}.jpg` });
const [F1, F2, F3] = [foto(1), foto(2), foto(3)];

test("fotos editables de un evento: sin videos ni la imagen de reemplazo", () => {
  const evento = {
    medios: [
      { tipo: "IMAGE", url: "https://res.cloudinary.com/prueba/f1.jpg" },
      { tipo: "VIDEO", url: "https://res.cloudinary.com/prueba/video/upload/v1.mp4" },
      { mediaType: "VIDEO", url: "/media/instagram/123.mp4" },
      { tipo: "IMAGE", url: "/media/instagram/placeholder.svg" },
    ],
  };
  assert.deepEqual(fotosDeEvento(evento), [
    { id: "https://res.cloudinary.com/prueba/f1.jpg", url: "https://res.cloudinary.com/prueba/f1.jpg" },
  ]);
  assert.deepEqual(fotosDeEvento({}), []);
});

test("fotos editables: la foto que está solo como portada aparece primero; la imagen de un video, no", () => {
  const portada = "https://res.cloudinary.com/prueba/987.jpg";
  assert.deepEqual(fotosDeEvento({ fotoPrincipal: portada, medios: [] }), [{ id: portada, url: portada }]);

  const miniatura = "https://res.cloudinary.com/prueba/video_thumb.jpg";
  const video = { url: "https://res.cloudinary.com/prueba/video/upload/v1", thumbnailUrl: miniatura };
  assert.deepEqual(fotosDeEvento({ fotoPrincipal: miniatura, medios: [video] }), []);
  assert.deepEqual(fotosDeEvento({ tipoMedio: "VIDEO", fotoPrincipal: portada, medios: [] }), []);
  assert.deepEqual(fotosDeEvento({ fotoPrincipal: "/media/instagram/placeholder.svg", medios: [] }), []);
});

test("fotos editables: la miniatura distinta indica un video solo en eventos de Instagram", () => {
  const medio = { url: "https://res.cloudinary.com/prueba/foto.jpg", thumbnailUrl: "https://res.cloudinary.com/prueba/foto-chica.jpg" };
  const comoFoto = [{ id: medio.url, url: medio.url }];
  assert.deepEqual(fotosDeEvento({ origen: "manual", fotoPrincipal: medio.url, medios: [medio] }), comoFoto);
  assert.deepEqual(fotosDeEvento({ origen: "instagram", fotoPrincipal: medio.url, medios: [medio] }), []);
});

test("cambios en las fotos: agregar, quitar y cambiar el orden cuentan como cambios", () => {
  assert.equal(cambiaronLasFotos([F1, F2], [F1, F2]), false);
  assert.equal(cambiaronLasFotos([F1], [F1, F2]), true);
  assert.equal(cambiaronLasFotos([F2, F1], [F1, F2]), true);
  assert.equal(cambiaronLasFotos([F1, F2, F3], [F1, F2]), true);
});

test("usar como portada pasa la foto al primer lugar", () => {
  assert.deepEqual(usarComoPortada([F1, F2, F3], "f3"), [F3, F1, F2]);
  assert.deepEqual(usarComoPortada([F1, F2], "no-existe"), [F1, F2]);
});

test("volver a poner las fotos quitadas, cada una en su lugar", () => {
  const iniciales = [F1, F2, F3];
  const nueva = { id: "nueva-1", url: "data:image/png;base64,AAA" };
  const actuales = [F2, nueva]; // se quitaron la 1 y la 3 y se agregó una nueva

  assert.deepEqual(fotosQuitadas(actuales, iniciales), [F1, F3]);
  assert.deepEqual(volverAPoner(actuales, iniciales), [F1, F2, F3, nueva]);
  assert.deepEqual(fotosQuitadas(volverAPoner(actuales, iniciales), iniciales), []);
});
