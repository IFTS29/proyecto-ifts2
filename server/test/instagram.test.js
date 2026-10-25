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
    "Jornada Gastronómica 2026\n\nEstudiantes de segundo año presentaron sus elaboraciones culinarias.\n\n#ifts2eventos #gastronomia";
  const parsed = parseCaption(rawCaption);

  assert.equal(parsed.title, "Jornada Gastronómica 2026");
  assert.match(parsed.summary, /Estudiantes de segundo año/);
  assert.ok(parsed.hashtags.includes("#ifts2eventos"));
  assert.ok(!parsed.cleanCaption.includes("#ifts2eventos"));

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
test("CP-IG-03: Publicación con solo hashtags clasifica en ambas categorías y asigna título por defecto", () => {
  const caption = "#ifts2novedades #ifts2eventos";
  const parsed = parseCaption(caption);

  assert.equal(parsed.title, "Publicación Institucional");
  assert.equal(parsed.summary, "");

  const categories = classifyPosts(caption);
  assert.ok(categories.includes("novedades"));
  assert.ok(categories.includes("eventos"));
});

// CP-IG-04: Texto extremo sin saltos de línea (>2000 caracteres)
test("CP-IG-04: Texto extremo sin saltos de línea (>2.000 caracteres) se procesa sin bloqueo y trunca summary", () => {
  const textoLargo = "A".repeat(2500) + " #ifts2eventos";
  const parsed = parseCaption(textoLargo);

  assert.ok(parsed.summary.length <= 115);
  assert.ok(parsed.summary.endsWith("..."));
  assert.equal(parsed.title.length > 100, true);
  assert.ok(parsed.hashtags.includes("#ifts2eventos"));
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
    caption: "Muestra Anual #ifts2eventos",
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
    guardarMedio: async (url, filename) => {
      mediaGuardados.push({ url, filename });
      return `/media/instagram/${filename}`;
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
    caption: "Práctica de cocina en video #ifts2eventos",
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
    guardarMedio: async (url, filename) => `/media/instagram/${filename}`,
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
    { id: "descartado_1", caption: "Evento viejo #ifts2eventos" },
    { id: "activo_2", caption: "Evento nuevo #ifts2eventos" },
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
    mediaService: { guardarMedio: async () => "/media/instagram/test.jpg" },
    fetchFn: async () => ({ ok: true, json: async () => ({ data: postsMeta }) }),
  });

  assert.equal(postsFinales.length, 1);
  assert.equal(postsFinales[0].id, "activo_2");
});

// CP-IG-10: Respuesta de Meta con error (400, 401, 429) no tira el servidor y preserva feed existente
test("CP-IG-10: Error devuelto por Meta Graph API responde controlado y preserva el feed local", async () => {
  const feedExistente = [
    { id: "existente_1", caption: "Evento existente #ifts2eventos" },
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
test("Ciberseguridad: POST /api/instagram/sync exige sesión y rol admin (401 / 403 / 200)", async () => {
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

  // 3. Con rol admin -> autorizado (200 o procesado)
  const tokenAdmin = await tokenDe(app, ADMIN);
  const resAdmin = await request(app)
    .post("/api/instagram/sync")
    .set("Authorization", `Bearer ${tokenAdmin}`);
  assert.equal(resAdmin.status, 200);
  assert.equal(resAdmin.body.success, true);
});
