import test from "node:test";
import assert from "node:assert/strict";
// Visor de fotos del detalle de un evento (client/src/eventos.js): qué fotos muestra y cómo se recorre.
import { esVideo, fotosDeEvento, indiceVecino } from "../../client/src/eventos.js";

test("anterior y siguiente dan la vuelta: después de la última sigue la primera", () => {
  assert.equal(indiceVecino(0, 3, 1), 1);
  assert.equal(indiceVecino(2, 3, 1), 0);
  assert.equal(indiceVecino(0, 3, -1), 2);
  assert.equal(indiceVecino(0, 1, 1), 0);
  assert.equal(indiceVecino(0, 0, 1), 0);
});

test("el visor muestra solo las fotos de un carrusel mixto, sin los videos", () => {
  const nube = "https://res.cloudinary.com/prueba";
  const evento = {
    origen: "instagram",
    tipoMedio: "CAROUSEL_ALBUM",
    fotoPrincipal: `${nube}/image/upload/1.jpg`,
    medios: [
      { tipo: "IMAGE", url: `${nube}/image/upload/1.jpg`, thumbnailUrl: `${nube}/image/upload/1.jpg` },
      { tipo: "IMAGE", url: `${nube}/video/upload/2`, thumbnailUrl: `${nube}/image/upload/2_thumb.jpg` },
      { tipo: "IMAGE", url: `${nube}/image/upload/3.jpg`, thumbnailUrl: `${nube}/image/upload/3.jpg` },
      { tipo: "IMAGE", url: "/media/instagram/4.mp4", thumbnailUrl: "/media/instagram/4_thumb.jpg" },
      { tipo: "IMAGE", url: `${nube}/image/upload/5.jpg`, thumbnailUrl: `${nube}/image/upload/5.jpg` },
    ],
  };
  assert.deepEqual(
    fotosDeEvento(evento).map((f) => f.url),
    [`${nube}/image/upload/1.jpg`, `${nube}/image/upload/3.jpg`, `${nube}/image/upload/5.jpg`],
  );
});

test("la foto que está solo como portada se puede ampliar, sin repetirse; la imagen de reemplazo no", () => {
  const portada = "https://res.cloudinary.com/prueba/image/upload/987.jpg";
  assert.deepEqual(fotosDeEvento({ fotoPrincipal: portada, medios: [] }), [{ id: portada, url: portada }]);
  assert.equal(fotosDeEvento({ fotoPrincipal: portada, medios: [{ tipo: "IMAGE", url: portada }] }).length, 1);
  assert.deepEqual(fotosDeEvento({ fotoPrincipal: "/media/instagram/placeholder.svg", medios: [] }), []);
});

test("el detalle reproduce como video lo que el visor excluye", () => {
  // Video viejo de Instagram: MongoDB lo dejó con tipo IMAGE y un enlace sin extensión.
  const videoViejo = { tipo: "IMAGE", url: "https://scontent.cdninstagram.com/v/123", thumbnailUrl: "https://scontent.cdninstagram.com/t/123.jpg" };
  assert.equal(esVideo(videoViejo, { origen: "instagram" }), true);
  assert.equal(esVideo({ tipo: "IMAGE", url: "https://scontent.cdninstagram.com/v/123.mp4?x=1" }, {}), true);
  // En un evento propio, una miniatura distinta no lo convierte en video.
  assert.equal(esVideo(videoViejo, { origen: "panel" }), false);
});
