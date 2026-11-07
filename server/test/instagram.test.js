import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  parseCaption,
  formatMonthYear,
  getPostCategories,
  classifyPosts,
  deduplicateFeed,
  crearRepoFeedInstagram,
  sincronizarInstagram,
} from "../src/services/instagram/index.js";
import { crearApp } from "../src/app.js";
import { appDePrueba, tokenDe, ADMIN, BEDELIA } from "./ayuda.js";

// CP-IG-01: Publicación estándar con imagen (IMAGE)
test("CP-IG-01: parseCaption separa título y cuerpo limpio, clasifica en eventos y formatea fecha", () => {
  const rawCaption =
    "Jornada Gastronómica 2026\n\nEstudiantes de segundo año presentaron sus elaboraciones culinarias.\n\n#eventosIFTS2 #gastronomia";
  const parsed = parseCaption(rawCaption);

  assert.equal(parsed.title, "Jornada Gastronómica 2026");
  assert.match(parsed.summary, /Estudiantes de segundo año/);
  assert.ok(parsed.hashtags.includes("#eventosIFTS2"));
  assert.ok(!parsed.cleanCaption.includes("#eventosIFTS2"));

  const categories = classifyPosts(rawCaption);
  assert.deepEqual(categories, ["eventos"]);

  const fecha = formatMonthYear("2026-05-25T14:30:00Z");
  assert.match(fecha, /Mayo 2026/i);
});

// CP-IG-02: Publicación sin texto (caption: null o "")
test("CP-IG-02: Publicación sin texto asigna título institucional por defecto sin lanzar excepción", () => {
  const parsedNull = parseCaption(null);
  assert.equal(parsedNull.title, "Publicación Institucional");
  assert.equal(parsedNull.summary, "");
  assert.deepEqual(parsedNull.bodyParagraphs, []);

  const parsedEmpty = parseCaption("");
  assert.equal(parsedEmpty.title, "Publicación Institucional");

  const categories = getPostCategories(null);
  assert.deepEqual(categories, []);

  const fechaInvalida = formatMonthYear(null);
  assert.equal(fechaInvalida, "Reciente");
});

// CP-IG-03: Publicación con solo hashtags
test("CP-IG-03: Publicación con solo hashtags clasifica en eventos y asigna título por defecto", () => {
  const caption = "#eventosIFTS2";
  const parsed = parseCaption(caption);

  assert.equal(parsed.title, "Publicación Institucional");
  assert.equal(parsed.summary, "");

  const categories = classifyPosts(caption);
  assert.deepEqual(categories, ["eventos"]);
});

// CP-IG-04: Texto extremo sin saltos de línea (>2000 caracteres)
test("CP-IG-04: Texto extremo sin saltos de línea (>2.000 caracteres) se procesa sin bloqueo y trunca summary", () => {
  const textoLargo = "A".repeat(2500) + " #eventosIFTS2";
  const parsed = parseCaption(textoLargo);

  assert.ok(parsed.summary.length <= 115);
  assert.ok(parsed.summary.endsWith("..."));
  // El título se acorta (hasta 100 caracteres, con «…») y la descripción conserva el texto completo.
  assert.equal(parsed.title.length, 100);
  assert.ok(parsed.title.endsWith("…"));
  assert.deepEqual(parsed.bodyParagraphs, ["A".repeat(2500)]);
  assert.ok(parsed.hashtags.includes("#eventosIFTS2"));
});

// CP-IG-05: Álbum (CAROUSEL_ALBUM) con múltiples fotos
test("CP-IG-05: Álbum (CAROUSEL_ALBUM) preserva la colección de medios (children)", async () => {
  const fakeChildren = [
    { id: "c1", media_type: "IMAGE", media_url: "http://example.com/1.jpg" },
    { id: "c2", media_type: "IMAGE", media_url: "http://example.com/2.jpg" },
    { id: "c3", media_type: "IMAGE", media_url: "http://example.com/3.jpg" },
    { id: "c4", media_type: "IMAGE", media_url: "http://example.com/4.jpg" },
  ];

  const fakeMetaPost = {
    id: "album_123",
    caption: "Muestra Anual #eventosIFTS2",
    media_type: "CAROUSEL_ALBUM",
    permalink: "https://instagram.com/p/album123",
    timestamp: "2026-10-20T10:00:00Z",
    children: { data: fakeChildren },
  };

  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({ data: [fakeMetaPost] }),
  });

  const mediaGuardados = [];
  const fakeMediaService = {
    guardarMedioDeInstagram: async (url, { nombre }) => {
      mediaGuardados.push({ url, nombre });
      return { url: `/media/instagram/${nombre}.jpg`, publicId: nombre };
    },
  };

  let feedGuardado = [];
  const fakeRepo = {
    loadDeletedPostIds: async () => [],
    loadFeed: async () => [],
    saveFeed: async (posts) => {
      feedGuardado = posts;
    },
  };

  const resultado = await sincronizarInstagram({
    config: { instagramToken: "valid_token", instagramAccountId: "12345" },
    repoFeed: fakeRepo,
    mediaService: fakeMediaService,
    fetchFn: fakeFetch,
  });

  assert.equal(resultado.success, true);
  assert.equal(feedGuardado.length, 1);
  assert.equal(feedGuardado[0].mediaType, "CAROUSEL_ALBUM");
  assert.equal(feedGuardado[0].mediaCount, 4);
  assert.equal(feedGuardado[0].mediaItems.length, 4);
});

// CP-IG-06: Álbum o archivo con elemento no encontrado devuelve fallback SVG
test("CP-IG-06: Ruta /media/instagram devuelve placeholder SVG si el archivo no existe", async () => {
  const app = crearApp();
  const res = await request(app).get("/media/instagram/archivo-inexistente.jpg");

  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /image\/svg\+xml/);
  const contenido = res.text || res.body?.toString() || "";
  assert.match(contenido, /<svg/);
});

// CP-IG-07: Video (VIDEO) sin miniatura asigna placeholder / póster de respaldo
test("CP-IG-07: Video sin miniatura asigna placeholder de respaldo", async () => {
  const fakeVideoPost = {
    id: "vid_999",
    caption: "Práctica de cocina en video #eventosIFTS2",
    media_type: "VIDEO",
    media_url: "http://example.com/video.mp4",
    thumbnail_url: null, // Sin miniatura de Meta
    permalink: "https://instagram.com/p/vid999",
    timestamp: "2026-10-21T10:00:00Z",
  };

  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({ data: [fakeVideoPost] }),
  });

  let guardado = null;
  const fakeRepo = {
    loadDeletedPostIds: async () => [],
    loadFeed: async () => [],
    saveFeed: async (posts) => {
      guardado = posts[0];
    },
  };

  const fakeMediaService = {
    guardarMedioDeInstagram: async (url, { nombre }) => ({ url: `/media/instagram/${nombre}.mp4`, publicId: nombre }),
  };

  await sincronizarInstagram({
    config: { instagramToken: "valid_token", instagramAccountId: "12345" },
    repoFeed: fakeRepo,
    mediaService: fakeMediaService,
    fetchFn: fakeFetch,
  });

  assert.ok(guardado);
  assert.equal(guardado.mediaType, "VIDEO");
  assert.equal(guardado.localThumbnail, "/media/instagram/placeholder.svg");
});

// CP-IG-08: Sincronización de publicación repetida deduplica por id y permalink
test("CP-IG-08: deduplicateFeed no duplica publicaciones con mismo id o permalink", () => {
  const postsConDuplicados = [
    { id: "p1", permalink: "https://instagram.com/p/1", caption: "Post 1" },
    { id: "p2", permalink: "https://instagram.com/p/2", caption: "Post 2" },
    { id: "p1", permalink: "https://instagram.com/p/1-rep", caption: "Post 1 repetido" },
    { id: "p3", permalink: "https://instagram.com/p/2", caption: "Post con permalink repetido" },
  ];

  const limpio = deduplicateFeed(postsConDuplicados);
  assert.equal(limpio.length, 2);
  assert.equal(limpio[0].id, "p1");
  assert.equal(limpio[1].id, "p2");
});

// CP-IG-09: Sincronización omite publicaciones registradas en la lista de exclusión (descartadas)
test("CP-IG-09: Sincronización omite publicaciones descartadas", async () => {
  const postsMeta = [
    { id: "descartado_1", caption: "Evento viejo #eventosIFTS2", media_url: "http://example.com/1.jpg" },
    { id: "activo_2", caption: "Evento nuevo #eventosIFTS2", media_url: "http://example.com/2.jpg" },
  ];

  let postsFinales = [];
  const fakeRepo = {
    loadDeletedPostIds: async () => ["descartado_1"],
    loadFeed: async () => [],
    saveFeed: async (posts) => {
      postsFinales = posts;
    },
  };

  await sincronizarInstagram({
    config: { instagramToken: "token", instagramAccountId: "acc1" },
    repoFeed: fakeRepo,
    mediaService: { guardarMedioDeInstagram: async () => ({ url: "/media/instagram/test.jpg", publicId: "test" }) },
    fetchFn: async () => ({ ok: true, json: async () => ({ data: postsMeta }) }),
  });

  assert.equal(postsFinales.length, 1);
  assert.equal(postsFinales[0].id, "activo_2");
});

// CP-IG-10: Respuesta de Meta con error (400, 401, 429) no tira el servidor y preserva feed existente
test("CP-IG-10: Error devuelto por Meta Graph API responde controlado y preserva el feed local", async () => {
  const feedExistente = [
    { id: "existente_1", caption: "Evento existente #eventosIFTS2" },
  ];

  const fakeFetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      error: { message: "Session has expired or token is invalid.", code: 190 },
    }),
  });

  const fakeRepo = {
    loadFeed: async () => feedExistente,
    loadDeletedPostIds: async () => [],
    saveFeed: async () => {},
  };

  const resultado = await sincronizarInstagram({
    config: { instagramToken: "token_vencido", instagramAccountId: "acc1" },
    repoFeed: fakeRepo,
    fetchFn: fakeFetch,
  });

  assert.equal(resultado.success, false);
  assert.match(resultado.error, /expired|invalid/i);
  assert.deepEqual(resultado.posts, feedExistente);
});

// Endpoint GET /api/instagram/feed
test("GET /api/instagram/feed devuelve publicaciones activas enriquecidas y filtra por ?category", async () => {
  const repoFeed = crearRepoFeedInstagram();
  const app = crearApp({ repoFeedInstagram: repoFeed });

  const resTodos = await request(app).get("/api/instagram/feed");
  assert.equal(resTodos.status, 200);
  assert.ok(Array.isArray(resTodos.body));

  const resEventos = await request(app).get("/api/instagram/feed?category=eventos");
  assert.equal(resEventos.status, 200);
  assert.ok(Array.isArray(resEventos.body));
  if (resEventos.body.length > 0) {
    for (const post of resEventos.body) {
      assert.ok(post.categories.includes("eventos"));
    }
  }
});

// Ciberseguridad: POST /api/instagram/sync requiere JWT válido y rol admin
test("Ciberseguridad: POST /api/instagram/sync exige sesión y rol admin (401 / 403 / pasa al admin)", async () => {
  const { app } = await appDePrueba();

  // 1. Sin sesión -> 401
  const resSinAuth = await request(app).post("/api/instagram/sync");
  assert.equal(resSinAuth.status, 401);
  assert.match(resSinAuth.body.error, /iniciar sesión/i);

  // 2. Con rol bedelia -> 403
  const tokenBedelia = await tokenDe(app, BEDELIA);
  const resBedelia = await request(app)
    .post("/api/instagram/sync")
    .set("Authorization", `Bearer ${tokenBedelia}`);
  assert.equal(resBedelia.status, 403);
  assert.match(resBedelia.body.error, /permiso/i);

  // 3. Con rol admin -> pasa la autorización. Esta app de prueba no tiene credenciales de Instagram,
  // así que la sincronización responde 503 sin consultar Instagram.
  const tokenAdmin = await tokenDe(app, ADMIN);
  const resAdmin = await request(app)
    .post("/api/instagram/sync")
    .set("Authorization", `Bearer ${tokenAdmin}`);
  assert.equal(resAdmin.status, 503);
  assert.equal(resAdmin.body.success, false);
});

// ----- Título y descripción de las publicaciones sincronizadas (CP-IG-13 a CP-IG-19) -----

// Todas las palabras del texto, sin hashtags: sirve para comprobar que la descripción no perdió nada.
const palabras = (texto) => texto.replace(/#[\p{L}\p{N}_]+/gu, "").match(/[\p{L}\p{N}]+/gu) || [];

test("CP-IG-13: Separa el título y la descripción cuando están en renglones consecutivos", () => {
  const parsed = parseCaption(
    "Jornada de cocina saludable\nParticiparon estudiantes de segundo año.\nTambién asistieron docentes y familiares. #eventosIFTS2",
  );

  assert.equal(parsed.title, "Jornada de cocina saludable");
  // Los saltos de línea de la descripción se conservan: el sitio muestra cada renglón como un párrafo.
  assert.deepEqual(parsed.bodyParagraphs, [
    "Participaron estudiantes de segundo año.\nTambién asistieron docentes y familiares.",
  ]);
});

test("CP-IG-14: Sin título ni puntuación, acorta el título y conserva el texto completo en la descripción", () => {
  const texto =
    "Hoy los alumnos de primer año prepararon panes de masa madre en el taller con la profesora Gómez y quedaron riquísimos";
  const parsed = parseCaption(`${texto} #eventosIFTS2`);

  assert.equal(parsed.title, "Hoy los alumnos de primer año prepararon panes de masa madre en el taller con la profesora Gómez y…");
  assert.ok(parsed.title.length <= 100);
  assert.deepEqual(parsed.bodyParagraphs, [texto]);
});

test("CP-IG-15: Toma la primera oración como título, sin el punto final ni cortar en una abreviatura", () => {
  const muestra = parseCaption("Muestra de fin de año. Los alumnos de segundo año presentaron sus platos ante el jurado.");
  assert.equal(muestra.title, "Muestra de fin de año");
  assert.deepEqual(muestra.bodyParagraphs, ["Los alumnos de segundo año presentaron sus platos ante el jurado."]);

  const inscripciones = parseCaption("¡Inscripciones abiertas para 2027! 🎓 Tecnicatura Superior en Emprendimientos Gastronómicos.");
  assert.equal(inscripciones.title, "¡Inscripciones abiertas para 2027!");
  assert.deepEqual(inscripciones.bodyParagraphs, ["Tecnicatura Superior en Emprendimientos Gastronómicos."]);

  const clase = parseCaption("Clase abierta con la Lic. Gómez. Fue una jornada muy linda.");
  assert.equal(clase.title, "Clase abierta con la Lic. Gómez");

  // Un punto seguido de minúscula sí termina la oración; los puntos suspensivos seguidos de minúscula, no.
  const clase2 = parseCaption("Clase de cocina. vení a aprender más con tus amigos este jueves en el instituto.");
  assert.equal(clase2.title, "Clase de cocina");
  assert.deepEqual(clase2.bodyParagraphs, ["vení a aprender más con tus amigos este jueves en el instituto."]);

  const verano = parseCaption("Llegó el verano... y la feria vuelve al patio");
  assert.equal(verano.title, "Llegó el verano... y la feria vuelve al patio");
  assert.equal(parseCaption("Llegó el verano… y la feria vuelve al patio").title, "Llegó el verano… y la feria vuelve al patio");
});

test("CP-IG-16: Reconoce los renglones vacíos con caracteres invisibles, separadores o solo emojis", () => {
  const conInvisible = parseCaption("Feria de emprendedores\n\u2800\nEste sábado de 10 a 14 en el patio. #eventosIFTS2");
  assert.equal(conInvisible.title, "Feria de emprendedores");
  assert.deepEqual(conInvisible.bodyParagraphs, ["Este sábado de 10 a 14 en el patio."]);

  const conSeparadores = parseCaption("🎉🎉\nFeria de fin de año\n.\n.\nVení con tu fami\u200Blia.");
  assert.equal(conSeparadores.title, "Feria de fin de año");
  assert.deepEqual(conSeparadores.bodyParagraphs, ["Vení con tu familia."]);
});

test("CP-IG-17: Con un primer renglón muy largo, acorta el título y la descripción conserva todos los renglones", () => {
  const texto =
    "Con mucha alegría queremos contarles que este jueves los alumnos de primer año realizaron su primera práctica en la cocina del instituto\nGracias a todos los que participaron.";
  const parsed = parseCaption(`${texto} #eventosIFTS2`);

  assert.ok(parsed.title.length <= 100);
  assert.ok(parsed.title.endsWith("…"));
  assert.deepEqual(parsed.bodyParagraphs, [texto]);
  assert.deepEqual(palabras(parsed.bodyParagraphs.join(" ")), palabras(texto));

  // Si el corte cae en un emoji, no lo parte por la mitad.
  const conEmoji = parseCaption(`${"x".repeat(98)}🍽️`).title;
  assert.ok(conEmoji.length <= 100);
  assert.equal(conEmoji, `${"x".repeat(98)}…`);
  assert.doesNotMatch(conEmoji, /[\uD800-\uDFFF]/, "no queda medio emoji");
});

test("CP-IG-18: Quita del título el punto, los dos puntos y el emoji finales, y conserva «!», «?» y «...»", () => {
  assert.equal(parseCaption("Jornada gastronómica:\nCocinamos con productos de estación.").title, "Jornada gastronómica");
  assert.equal(parseCaption("Feria de emprendedores 🍞\nEste sábado de 10 a 14.").title, "Feria de emprendedores");
  assert.equal(parseCaption("¡Gran feria de emprendedores!\nEste sábado.").title, "¡Gran feria de emprendedores!");
  assert.equal(parseCaption("¿Querés conocer la carrera? Vení el sábado.").title, "¿Querés conocer la carrera?");
  assert.equal(parseCaption("Se viene algo nuevo...\nPronto más novedades.").title, "Se viene algo nuevo...");
});

test("CP-IG-19: Los hashtags no quedan en el título ni en la descripción, y no dejan espacios dobles", () => {
  const parsed = parseCaption("Feria #eventosIFTS2 de panes artesanales\n\nVení a probar. #gastronomia #ifts2");

  assert.equal(parsed.title, "Feria de panes artesanales");
  assert.deepEqual(parsed.bodyParagraphs, ["Vení a probar."]);
  assert.deepEqual(parsed.hashtags, ["#eventosIFTS2", "#gastronomia", "#ifts2"]);
});
