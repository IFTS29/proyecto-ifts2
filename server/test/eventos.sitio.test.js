import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  IMAGEN_DE_REEMPLAZO,
  datosDeTarjeta,
  direccionDeInstagram,
  enlaceDeInstagram,
  esDeInstagram,
  eventosPorAnio,
  galeriaDeEvento,
  hashtagsDeEvento,
  medioPrincipal,
  recortar,
} from "../../client/src/eventos.js";

// Galería pública de eventos (Inicio, Eventos y detalle): tarjetas, fotos, videos, Instagram y años.

const leer = (ruta) => readFileSync(new URL(`../../client/src/${ruta}`, import.meta.url), "utf8");
const NUBE = "https://res.cloudinary.com/prueba";
const POST = "https://www.instagram.com/p/DPq1abc_2/";
const foto = (n) => ({ tipo: "IMAGE", url: `${NUBE}/image/upload/ifts2/eventos/foto-${n}.jpg` });

// Tal como quedan en la base los distintos tipos de eventos.
const SIN_FOTOS = {
  origen: "manual",
  titulo: "Charla de bienvenida",
  fotoPrincipal: IMAGEN_DE_REEMPLAZO,
  medios: [{ tipo: "IMAGE", url: IMAGEN_DE_REEMPLAZO }],
  cantidadMedios: 1,
};
const CON_FOTOS = {
  origen: "manual",
  titulo: "Muestra de panadería",
  fotoPrincipal: foto(1).url,
  medios: [foto(1), foto(2), foto(3)],
};
// Alta manual con el enlace de una publicación: el servidor trajo la foto (aunque sea de cdninstagram.com).
const FOTO_TRAIDA = "https://scontent-eze1-1.cdninstagram.com/v/t51.2885-15/foto.jpg?stp=dst-jpg";
const CON_ENLACE_Y_FOTO = {
  origen: "manual",
  titulo: "Feria de emprendedores",
  videoUrl: `${POST}?igsh=abc`,
  fotoPrincipal: FOTO_TRAIDA,
  medios: [{ tipo: "IMAGE", url: FOTO_TRAIDA }],
};
// Alta manual con el enlace, pero Instagram no dejó traer la foto (un reel, por ejemplo).
const SOLO_ENLACE = {
  origen: "manual",
  titulo: "Reel de la jornada",
  videoUrl: "https://www.instagram.com/reel/DPq9xyz/",
  fotoPrincipal: IMAGEN_DE_REEMPLAZO,
  medios: [{ tipo: "VIDEO", url: "https://www.instagram.com/reel/DPq9xyz/" }],
};
// Video sincronizado: el archivo está fuera de la galería y la portada es la miniatura del video.
const VIDEO_SINCRONIZADO = {
  origen: "instagram",
  titulo: "Clase abierta",
  tipoMedio: "VIDEO",
  permalink: "https://www.instagram.com/reel/DPv1/",
  videoUrl: `${NUBE}/video/upload/ifts2/instagram/clase.mp4`,
  videoThumbnail: `${NUBE}/image/upload/ifts2/instagram/clase_thumb.jpg`,
  fotoPrincipal: `${NUBE}/image/upload/ifts2/instagram/clase_thumb.jpg`,
  medios: [],
};
// Carrusel sincronizado con dos fotos y un video guardado sin "tipo" (regla de la miniatura).
const CARRUSEL_MIXTO = {
  origen: "instagram",
  titulo: "Jornada de cocina",
  tipoMedio: "CAROUSEL_ALBUM",
  permalink: POST,
  videoUrl: POST,
  fotoPrincipal: foto(1).url,
  medios: [
    foto(1),
    { url: `${NUBE}/video/upload/ifts2/instagram/video.mp4`, thumbnailUrl: `${NUBE}/image/upload/miniatura.jpg` },
    foto(2),
  ],
  captionOriginal: "Jornada de cocina #eventosIFTS2 #gastronomia #eventosIFTS2",
};

test("direcciones de Instagram: acepta publicaciones, reels y videos; rechaza todo lo demás", () => {
  assert.equal(direccionDeInstagram("https://www.instagram.com/p/DPq1abc_2/?igsh=abc"), POST);
  assert.equal(direccionDeInstagram("https://instagram.com/reel/DPq9xyz"), "https://www.instagram.com/reel/DPq9xyz/");
  assert.equal(direccionDeInstagram("https://www.instagram.com/tv/AbC/"), "https://www.instagram.com/tv/AbC/");
  assert.equal(direccionDeInstagram("https://www.instagram.com/ifts_2_ok/p/DPq1abc_2/"), POST);
  for (const malo of [
    "javascript:alert(1)//https://www.instagram.com/p/x/",
    "http://www.instagram.com/p/DPq1abc_2/",
    "https://otro.sitio/instagram.com/p/DPq1abc_2/",
    "https://www.instagram.com.otro.sitio/p/DPq1abc_2/",
    "https://www.instagram.com/ifts_2_ok/",
    "instagram.com/p/DPq1abc_2/",
    "texto suelto",
    "",
    null,
  ]) {
    assert.equal(direccionDeInstagram(malo), null, String(malo));
  }
});

test("eventos de Instagram: sincronizados o cargados con el enlace; los cargados con fotos no", () => {
  assert.equal(esDeInstagram(VIDEO_SINCRONIZADO), true);
  assert.equal(esDeInstagram({ origen: "instagram", permalink: null }), true, "sincronizado aunque falte el enlace");
  assert.equal(esDeInstagram(CON_ENLACE_Y_FOTO), true);
  assert.equal(esDeInstagram(SOLO_ENLACE), true);
  assert.equal(esDeInstagram(CON_FOTOS), false);
  assert.equal(esDeInstagram({ ...SIN_FOTOS, videoUrl: "javascript:alert(1)" }), false);
  assert.equal(enlaceDeInstagram({ ...SIN_FOTOS, videoUrl: "javascript:alert(1)" }), null);
  assert.equal(enlaceDeInstagram(CON_ENLACE_Y_FOTO), POST, "sin los parámetros de seguimiento");
});

test("tarjeta sin fotos: sin etiqueta, «Ver evento» e imagen de reemplazo (nunca «1 foto»)", () => {
  const tarjeta = datosDeTarjeta(SIN_FOTOS);
  assert.equal(tarjeta.etiqueta, null);
  assert.equal(tarjeta.accion, "Ver evento");
  assert.equal(tarjeta.imagen, IMAGEN_DE_REEMPLAZO);
});

test("tarjeta con fotos: la cantidad real y «Ver fotos»", () => {
  const tarjeta = datosDeTarjeta(CON_FOTOS);
  assert.equal(tarjeta.etiqueta, "3 fotos");
  assert.equal(tarjeta.accion, "Ver fotos");
  assert.equal(tarjeta.imagen, foto(1).url);
});

test("la foto traída de Instagram es una foto: se muestra, se cuenta y se amplía (no se incrusta la publicación)", () => {
  const tarjeta = datosDeTarjeta(CON_ENLACE_Y_FOTO);
  assert.equal(tarjeta.imagen, FOTO_TRAIDA);
  assert.equal(tarjeta.etiqueta, "1 foto");
  assert.deepEqual(medioPrincipal(CON_ENLACE_Y_FOTO), { tipo: "foto", indice: 0 });
});

test("video: la miniatura no se cuenta como foto ni se ofrece para ampliar", () => {
  const tarjeta = datosDeTarjeta(VIDEO_SINCRONIZADO);
  assert.equal(tarjeta.etiqueta, "Video");
  assert.equal(tarjeta.accion, "Ver video");
  assert.equal(tarjeta.imagen, VIDEO_SINCRONIZADO.videoThumbnail);
  const galeria = galeriaDeEvento(VIDEO_SINCRONIZADO);
  assert.deepEqual(galeria.map((item) => item.tipo), ["video"]);
  assert.equal(galeria[0].miniatura, VIDEO_SINCRONIZADO.videoThumbnail);
  assert.deepEqual(medioPrincipal(VIDEO_SINCRONIZADO), { tipo: "video", indice: 0 });
});

test("carrusel con fotos y un video: etiqueta real, orden de Instagram y empieza por una foto", () => {
  assert.equal(datosDeTarjeta(CARRUSEL_MIXTO).etiqueta, "2 fotos y 1 video");
  assert.deepEqual(galeriaDeEvento(CARRUSEL_MIXTO).map((item) => item.tipo), ["foto", "video", "foto"]);
  // Si el carrusel empieza con el video, el detalle abre en la primera foto.
  const empiezaConVideo = { ...CARRUSEL_MIXTO, fotoPrincipal: foto(2).url, medios: [CARRUSEL_MIXTO.medios[1], foto(2)] };
  assert.deepEqual(medioPrincipal(empiezaConVideo), {
    tipo: "foto",
    indice: 1,
  });
});

test("solo el enlace de Instagram: «Publicación de Instagram» y la publicación incrustada", () => {
  const tarjeta = datosDeTarjeta(SOLO_ENLACE);
  assert.equal(tarjeta.etiqueta, "Publicación de Instagram");
  assert.equal(tarjeta.accion, "Ver evento");
  assert.deepEqual(galeriaDeEvento(SOLO_ENLACE), [], "el enlace no es un video propio");
  assert.deepEqual(medioPrincipal(SOLO_ENLACE), { tipo: "instagram", url: "https://www.instagram.com/reel/DPq9xyz/" });
  assert.deepEqual(medioPrincipal(SIN_FOTOS), { tipo: "reemplazo" });
});

test("un enlace que no es un archivo de video no se reproduce como video", () => {
  const malo = { ...SIN_FOTOS, videoUrl: "javascript:alert(1)", medios: [{ tipo: "VIDEO", url: "javascript:alert(1)" }] };
  assert.deepEqual(galeriaDeEvento(malo), []);
  assert.deepEqual(medioPrincipal(malo), { tipo: "reemplazo" });
  const pagina = { ...SIN_FOTOS, medios: [{ tipo: "VIDEO", url: "https://www.youtube.com/watch?v=abc" }] };
  assert.deepEqual(galeriaDeEvento(pagina), []);
});

test("eventos por año, en hora de Argentina, del más reciente al más antiguo; sin fecha al final", () => {
  const eventos = [
    { id: "a", fechaEvento: "2025-05-10T15:00:00.000Z" },
    { id: "b", fechaEvento: "2026-10-05T15:00:00.000Z" },
    { id: "c", fechaEvento: "2026-01-01T02:00:00.000Z" }, // 31/12/2025 a las 23 h en Argentina
    { id: "d" },
    { id: "e", fechaEvento: "fecha rota" },
    { id: "f", fechaEvento: "2026-03-01T15:00:00.000Z" },
  ];
  const grupos = eventosPorAnio(eventos);
  assert.deepEqual(
    grupos.map((g) => [g.titulo, g.eventos.map((e) => e.id)]),
    [
      ["2026", ["b", "f"]],
      ["2025", ["c", "a"]],
      ["Sin fecha", ["d", "e"]],
    ],
  );
  assert.equal(grupos.flatMap((g) => g.eventos).length, eventos.length, "no se pierde ningún evento");
  assert.ok(grupos.every((g) => !g.titulo.includes("NaN")));
  assert.deepEqual(eventosPorAnio([]), []);
});

test("hashtags: solo los que tiene la publicación, sin repetir y sin inventar", () => {
  assert.deepEqual(hashtagsDeEvento(CARRUSEL_MIXTO), ["#eventosIFTS2", "#gastronomia"]);
  assert.deepEqual(hashtagsDeEvento(VIDEO_SINCRONIZADO), []);
  assert.deepEqual(hashtagsDeEvento(CON_FOTOS), []);
});

test("resúmenes largos se cortan en una palabra completa, con «…»", () => {
  const corto = recortar("Muestra de fin de año de los estudiantes de segundo año, con panes y facturas de elaboración propia.", 40);
  assert.ok(corto.endsWith("…") && corto.length <= 41, corto);
  assert.equal(recortar("Texto corto"), "Texto corto");
});

test("sin contenido escrito a mano: ni años fijos, ni eventos inventados, ni «1 foto», ni hashtags ni emojis", () => {
  const eventos = leer("pages/Eventos.jsx");
  for (const texto of ["Eventos 2026", "Años anteriores", "Noche de los Museos", "Mateada Patria", "Explorá"]) {
    assert.ok(!eventos.includes(texto), texto);
  }
  const archivos = ["pages/Eventos.jsx", "pages/Evento.jsx", "pages/Inicio.jsx", "components/TarjetaEvento.jsx"];
  for (const ruta of archivos) {
    const codigo = leer(ruta);
    assert.doesNotMatch(codigo, /cantidadMedios \|\| 1/, ruta);
    assert.doesNotMatch(codigo, /#eventosIFTS2/, ruta);
    assert.doesNotMatch(codigo, /\p{Extended_Pictographic}/u, ruta);
    assert.doesNotMatch(codigo, /style=\{\{(?! "--foto")/, `${ruta}: estilos en styles.css`);
  }
});

test("el detalle siempre consulta al servidor y el enlace a Instagram se anuncia y abre en otra pestaña", () => {
  const detalle = leer("pages/Evento.jsx");
  assert.doesNotMatch(detalle, /location\.state|useLocation/, "no usa datos viejos de la navegación");
  assert.doesNotMatch(leer("components/TarjetaEvento.jsx"), /state=/);
  assert.match(detalle, /href=\{enlace\} target="_blank" rel="noopener noreferrer"/);
  assert.match(detalle, /\(se abre en otra pestaña\)/);
  assert.match(detalle, /Contenido de Instagram: al tocar la publicación se puede abrir Instagram\./);
});

test("el banner del detalle usa siempre la imagen institucional, nunca una foto del evento", () => {
  const detalle = leer("pages/Evento.jsx");
  const banners = detalle.match(/"--foto": `url\(\$\{[^}]+\}\)`/g) || [];
  assert.ok(banners.length >= 1);
  assert.ok(banners.every((b) => b.includes("IMGS.B_EVENTOS")), banners.join(" / "));
});
