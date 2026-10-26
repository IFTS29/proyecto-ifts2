import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { ADMIN, appDePrueba, tokenDe } from "./ayuda.js";
import { crearRepoEventosMemoria } from "../src/repos/eventos.memoria.js";
import { Evento } from "../src/models/Evento.js";

// Edición de las fotos de un evento ya cargado (PUT /api/events/:id con "fotos").

const con = (req, token) => req.set("Authorization", `Bearer ${token}`);

// PNG de 1 x 1 píxel: alcanza para probar la subida sin archivos reales.
const FOTO_NUEVA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const NUBE = "https://res.cloudinary.com/prueba/image/upload/";
const foto = (n) => ({ tipo: "IMAGE", url: `${NUBE}ifts2/eventos/foto-${n}.jpg`, publicId: `ifts2/eventos/foto-${n}` });
const VIDEO = { tipo: "VIDEO", url: `${NUBE.replace("image", "video")}ifts2/eventos/video-1.mp4` };

const TEXTOS = { titulo: "Muestra de panadería", descripcion: "Trabajos de segundo año." };

const evento = (fotos, extra = {}) => ({
  ...TEXTOS,
  origen: "manual",
  fechaEvento: "2026-10-05T18:00:00.000Z",
  fotoPrincipal: fotos[0]?.url || "/media/instagram/placeholder.svg",
  medios: fotos,
  tipoMedio: fotos.length > 1 ? "CAROUSEL_ALBUM" : "IMAGE",
  estado: "visible",
  ...extra,
});

// Reemplaza a Cloudinary: registra lo que se sube y lo que se borra. "fallaSubida" hace fallar todas las subidas.
function fotosDePrueba({ fallaSubida = false } = {}) {
  const subidas = [];
  const borradas = [];
  return {
    subidas,
    borradas,
    async subir(dataUrl, { nombre }) {
      if (fallaSubida) throw new Error("Cloudinary no responde");
      const publicId = `ifts2/eventos/${nombre}`;
      subidas.push(publicId);
      return { url: `${NUBE}${publicId}`, publicId };
    },
    async borrar(publicId) {
      borradas.push(publicId);
    },
  };
}

async function preparar(datos, { fotosEventos = fotosDePrueba(), eventos = crearRepoEventosMemoria() } = {}) {
  const creado = await eventos.crear(datos);
  const { app } = await appDePrueba({ eventos, fotosEventos });
  const token = await tokenDe(app, ADMIN);
  const editar = (cuerpo) => con(request(app).put(`/api/events/${creado.id}`).send({ ...TEXTOS, ...cuerpo }), token);
  return { app, token, eventos, fotos: fotosEventos, id: creado.id, editar };
}

// ----- Quitar, agregar y elegir portada -----

test("quitar la portada: la siguiente foto pasa a ser la portada y la quitada queda registrada", async () => {
  const { eventos, fotos, id, editar } = await preparar(evento([foto(1), foto(2), foto(3)]));

  const res = await editar({ fotos: [foto(2).url, foto(3).url] });

  assert.equal(res.status, 200);
  const guardado = await eventos.buscarPorId(id);
  assert.deepEqual(guardado.medios.map((m) => m.url), [foto(2).url, foto(3).url]);
  assert.equal(guardado.fotoPrincipal, foto(2).url);
  assert.equal(guardado.cantidadMedios, 2);
  assert.equal(guardado.mediosQuitados.length, 1);
  assert.equal(guardado.mediosQuitados[0].url, foto(1).url);
  assert.equal(guardado.mediosQuitados[0].publicId, foto(1).publicId);
  assert.equal(guardado.mediosQuitados[0].propia, true);
  assert.equal(fotos.borradas.length, 0, "las fotos quitadas no se borran de Cloudinary");
});

test("agregar fotos: se suben solo las nuevas y van al final", async () => {
  const { eventos, fotos, id, editar } = await preparar(evento([foto(1)]));

  const res = await editar({ fotos: [foto(1).url, FOTO_NUEVA] });

  assert.equal(res.status, 200);
  assert.equal(fotos.subidas.length, 1);
  const guardado = await eventos.buscarPorId(id);
  assert.equal(guardado.medios.length, 2);
  assert.equal(guardado.medios[0].url, foto(1).url);
  assert.ok(guardado.medios[1].url.startsWith(NUBE));
  assert.equal(guardado.medios[1].publicId, fotos.subidas[0]);
  assert.equal(guardado.tipoMedio, "CAROUSEL_ALBUM");
  assert.ok(!JSON.stringify(guardado).includes("data:image"), "no queda ninguna foto en base64");
});

test("usar otra foto como portada: pasa al primer lugar", async () => {
  const { eventos, id, editar } = await preparar(evento([foto(1), foto(2)]));

  await editar({ fotos: [foto(2).url, foto(1).url] });

  const guardado = await eventos.buscarPorId(id);
  assert.equal(guardado.fotoPrincipal, foto(2).url);
  assert.deepEqual(guardado.medios.map((m) => m.url), [foto(2).url, foto(1).url]);
  assert.equal(guardado.mediosQuitados.length, 0);
});

test("una foto conservada mantiene su publicId del evento guardado", async () => {
  const { eventos, id, editar } = await preparar(evento([foto(1), foto(2)]));

  await editar({ fotos: [foto(2).url] });

  const guardado = await eventos.buscarPorId(id);
  assert.equal(guardado.medios[0].publicId, foto(2).publicId);
});

test("quitar todas las fotos: el evento queda con la imagen de reemplazo", async () => {
  const { eventos, id, editar } = await preparar(evento([foto(1), foto(2)]));

  const res = await editar({ fotos: [] });

  assert.equal(res.status, 200);
  const guardado = await eventos.buscarPorId(id);
  assert.deepEqual(guardado.medios, []);
  assert.equal(guardado.fotoPrincipal, "/media/instagram/placeholder.svg");
  assert.equal(guardado.tipoMedio, "IMAGE");
  assert.equal(guardado.mediosQuitados.length, 2);
});

test("sin la lista de fotos, la edición no toca las fotos", async () => {
  const { eventos, id, editar } = await preparar(evento([foto(1), foto(2)]));

  await editar({ titulo: "Muestra de panadería artesanal" });

  const guardado = await eventos.buscarPorId(id);
  assert.deepEqual(guardado.medios.map((m) => m.url), [foto(1).url, foto(2).url]);
  assert.equal(guardado.fotoPrincipal, foto(1).url);
  assert.deepEqual(guardado.mediosQuitados, []);
});

// ----- Validaciones -----

test("rechaza una foto que no es del evento", async () => {
  const { eventos, fotos, id, editar } = await preparar(evento([foto(1)]));

  const res = await editar({ fotos: [foto(1).url, "https://otro-sitio.com/foto.jpg", FOTO_NUEVA] });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /no pertenece a este evento/);
  assert.equal(fotos.subidas.length, 0, "no se sube nada si la lista es inválida");
  assert.deepEqual((await eventos.buscarPorId(id)).medios, [foto(1)]);
});

test("rechaza una lista de fotos que no es una lista de enlaces", async () => {
  const { editar } = await preparar(evento([foto(1)]));
  assert.equal((await editar({ fotos: "foto-1.jpg" })).status, 400);
  assert.equal((await editar({ fotos: [{ url: foto(1).url }] })).status, 400);
});

test("rechaza más de 20 fotos al editar y al cargar un evento", async () => {
  const veinte = Array.from({ length: 20 }, (_, i) => foto(i + 1));
  const { app, token, fotos, editar } = await preparar(evento(veinte));

  const editado = await editar({ fotos: [...veinte.map((f) => f.url), FOTO_NUEVA] });
  assert.equal(editado.status, 400);
  assert.match(editado.body.error, /hasta 20 fotos/);
  assert.equal(fotos.subidas.length, 0);

  const alta = await con(
    request(app)
      .post("/api/events")
      .send({ ...evento([...veinte, foto(21)]), fotoPrincipal: undefined }),
    token,
  );
  assert.equal(alta.status, 400);
  assert.match(alta.body.error, /hasta 20 fotos/);
});

test("una foto repetida en la lista se guarda una sola vez", async () => {
  const { eventos, id, editar } = await preparar(evento([foto(1), foto(2)]));

  await editar({ fotos: [foto(1).url, foto(1).url, foto(2).url] });

  assert.equal((await eventos.buscarPorId(id)).medios.length, 2);
});

// ----- Errores al subir o al guardar -----

test("si falla la subida, el evento no cambia", async () => {
  const { eventos, id, editar } = await preparar(evento([foto(1)]), {
    fotosEventos: fotosDePrueba({ fallaSubida: true }),
  });

  const res = await editar({ titulo: "Otro título", fotos: [FOTO_NUEVA] });

  assert.ok(res.status >= 400);
  const guardado = await eventos.buscarPorId(id);
  assert.equal(guardado.titulo, TEXTOS.titulo);
  assert.deepEqual(guardado.medios, [foto(1)]);
});

test("si falla el guardado, se borran solo las fotos nuevas", async () => {
  const repo = crearRepoEventosMemoria();
  const eventos = {
    ...repo,
    actualizar: async () => {
      throw new Error("MongoDB no responde");
    },
  };
  const { fotos, id, editar } = await preparar(evento([foto(1)]), { eventos });

  const res = await editar({ fotos: [foto(1).url, FOTO_NUEVA] });

  assert.equal(res.status, 500);
  assert.equal(fotos.subidas.length, 1);
  assert.deepEqual(fotos.borradas, fotos.subidas, "se borra la foto nueva");
  assert.ok(!fotos.borradas.includes(foto(1).publicId), "la foto anterior no se toca");
  assert.deepEqual((await repo.buscarPorId(id)).medios, [foto(1)]);
});

test("sin almacenamiento de fotos, agregar una foto responde 503 y no cambia nada", async () => {
  const { eventos, id, editar } = await preparar(evento([foto(1)]), { fotosEventos: null });

  const res = await editar({ fotos: [foto(1).url, FOTO_NUEVA] });

  assert.equal(res.status, 503);
  assert.deepEqual((await eventos.buscarPorId(id)).medios, [foto(1)]);
});

// ----- Fotos quitadas -----

test("una foto quitada no se registra dos veces", async () => {
  // Caso de una recuperación futura: la foto volvió a la galería pero sigue anotada como quitada.
  const anotada = { url: foto(1).url, publicId: foto(1).publicId, propia: true, fechaQuitada: new Date() };
  const { eventos, id, editar } = await preparar(evento([foto(1), foto(2)], { mediosQuitados: [anotada] }));

  await editar({ fotos: [foto(2).url] });

  const guardado = await eventos.buscarPorId(id);
  assert.equal(guardado.mediosQuitados.length, 1);
});

test("una foto de Instagram quitada queda marcada como no propia", async () => {
  const deInstagram = { tipo: "IMAGE", url: "https://res.cloudinary.com/prueba/image/upload/ifts29/events/ig_1.jpg" };
  const { eventos, id, editar } = await preparar(evento([deInstagram, foto(1)], { origen: "instagram" }));

  await editar({ fotos: [foto(1).url] });

  const guardado = await eventos.buscarPorId(id);
  assert.equal(guardado.mediosQuitados[0].propia, false);
  assert.equal(guardado.editadoPorAdmin, true);
});

// ----- Videos -----

test("al editar las fotos, el video del evento se conserva", async () => {
  const { eventos, id, editar } = await preparar(evento([foto(1), foto(2), VIDEO], { tipoMedio: "CAROUSEL_ALBUM" }));

  await editar({ fotos: [foto(2).url] });

  const guardado = await eventos.buscarPorId(id);
  assert.deepEqual(guardado.medios.map((m) => m.url), [foto(2).url, VIDEO.url]);
  assert.equal(guardado.fotoPrincipal, foto(2).url);
  assert.equal(guardado.tipoMedio, "CAROUSEL_ALBUM");
});

test("un video de Instagram guardado sin 'tipo' no se trata como foto", async () => {
  const videoInstagram = { mediaType: "VIDEO", url: "/media/instagram/123_2_456.mp4" };
  const { eventos, id, editar } = await preparar(evento([foto(1), videoInstagram], { tipoMedio: "CAROUSEL_ALBUM" }));

  assert.equal((await editar({ fotos: [foto(1).url, videoInstagram.url] })).status, 400);

  await editar({ fotos: [] });
  const guardado = await eventos.buscarPorId(id);
  assert.deepEqual(guardado.medios, [videoInstagram]);
});

test("un evento de video sigue siendo de video y conserva su portada", async () => {
  const portadaDelVideo = "https://res.cloudinary.com/prueba/image/upload/ifts29/events/video_thumb.jpg";
  const { eventos, id, editar } = await preparar(
    evento([VIDEO], { tipoMedio: "VIDEO", fotoPrincipal: portadaDelVideo, videoThumbnail: portadaDelVideo }),
  );

  await editar({ fotos: [FOTO_NUEVA] });

  const guardado = await eventos.buscarPorId(id);
  assert.equal(guardado.tipoMedio, "VIDEO");
  assert.equal(guardado.fotoPrincipal, portadaDelVideo);
  assert.equal(guardado.medios.length, 2);
  assert.equal(guardado.medios[1].url, VIDEO.url);
});

// ----- Sitio público -----

test("el sitio público no recibe las fotos quitadas", async () => {
  const { app, id, editar } = await preparar(evento([foto(1), foto(2)]));
  await editar({ fotos: [foto(2).url] });

  const detalle = await request(app).get(`/api/events/${id}`);
  const lista = await request(app).get("/api/events");

  assert.equal(detalle.status, 200);
  assert.equal(detalle.body.evento.mediosQuitados, undefined);
  assert.equal(lista.body.eventos[0].mediosQuitados, undefined);
  assert.ok(!JSON.stringify(lista.body).includes(foto(1).url));
});

test("un carrusel al que se le quitan todas las fotos y le queda un video pasa a ser de video", async () => {
  const video = { ...VIDEO, thumbnailUrl: `${NUBE}ifts2/eventos/video-1-miniatura.jpg` };
  const { eventos, id, editar } = await preparar(evento([foto(1), foto(2), video], { tipoMedio: "CAROUSEL_ALBUM" }));

  await editar({ fotos: [] });

  const guardado = await eventos.buscarPorId(id);
  assert.deepEqual(guardado.medios.map((m) => m.url), [video.url]);
  assert.equal(guardado.tipoMedio, "VIDEO");
  assert.equal(guardado.fotoPrincipal, video.thumbnailUrl);
});

// ----- Datos como los devuelve MongoDB -----

test("un video de un carrusel de Instagram, tal como queda en MongoDB, no se trata como foto", async () => {
  // La sincronización guarda "mediaType"; el esquema lo descarta y el medio queda con tipo "IMAGE".
  const deMongo = new Evento({
    origen: "instagram",
    titulo: TEXTOS.titulo,
    descripcion: TEXTOS.descripcion,
    tipoMedio: "CAROUSEL_ALBUM",
    fotoPrincipal: "/media/instagram/123_1_a.jpg",
    medios: [
      { id: "a", mediaType: "IMAGE", url: "/media/instagram/123_1_a.jpg", thumbnailUrl: "/media/instagram/123_1_a.jpg" },
      { id: "b", mediaType: "VIDEO", url: "/media/instagram/123_2_b.mp4", thumbnailUrl: "/media/instagram/123_2_b_thumb.jpg" },
      { id: "c", mediaType: "VIDEO", url: "https://res.cloudinary.com/prueba/video/upload/v1/ifts29/events/c", thumbnailUrl: `${NUBE}ifts29/events/c_thumb.jpg` },
    ],
  }).toObject();
  assert.equal(deMongo.medios[1].mediaType, undefined, "MongoDB descarta mediaType");
  assert.equal(deMongo.medios[1].tipo, "IMAGE");

  const { _id, ...datos } = deMongo;
  const { eventos, id, editar } = await preparar(datos);

  for (const video of deMongo.medios.slice(1)) {
    assert.equal((await editar({ fotos: [deMongo.medios[0].url, video.url] })).status, 400);
  }
  await editar({ fotos: [] });
  const guardado = await eventos.buscarPorId(id);
  assert.deepEqual(
    guardado.medios.map((m) => m.id),
    ["b", "c"],
    "los dos videos se conservan",
  );
});

// ----- Portada que no está en la lista de medios -----

test("evento de Instagram de una sola foto: la foto está solo como portada y no se pierde al agregar otra", async () => {
  const portada = `${NUBE}ifts29/events/987.jpg`;
  const { eventos, fotos, id, editar } = await preparar(
    evento([], { origen: "instagram", fotoPrincipal: portada, medios: [] }),
  );

  await editar({ fotos: [portada, FOTO_NUEVA] });

  const guardado = await eventos.buscarPorId(id);
  assert.equal(fotos.subidas.length, 1);
  assert.deepEqual(guardado.medios.map((m) => m.url), [portada, `${NUBE}${fotos.subidas[0]}`]);
  assert.equal(guardado.fotoPrincipal, portada);
  assert.deepEqual(guardado.mediosQuitados, []);
});

test("si se quita la foto que estaba solo como portada, queda registrada como quitada", async () => {
  const portada = `${NUBE}ifts29/events/987.jpg`;
  const { eventos, fotos, id, editar } = await preparar(evento([], { fotoPrincipal: portada, medios: [] }));

  await editar({ fotos: [FOTO_NUEVA] });

  const guardado = await eventos.buscarPorId(id);
  assert.equal(guardado.fotoPrincipal, `${NUBE}${fotos.subidas[0]}`);
  assert.deepEqual(guardado.mediosQuitados.map((m) => m.url), [portada]);
});

test("la imagen de un video no se toma como una foto suelta", async () => {
  const miniatura = `${NUBE}ifts29/events/video_thumb.jpg`;
  const { editar } = await preparar(
    evento([{ ...VIDEO, thumbnailUrl: miniatura }], { tipoMedio: "CAROUSEL_ALBUM", fotoPrincipal: miniatura }),
  );

  assert.equal((await editar({ fotos: [miniatura] })).status, 400);
});

test("una foto vieja en base64 se conserva tal cual y, si se quita, no se copia al registro", async () => {
  const vieja = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const { eventos, fotos, id, editar } = await preparar(evento([{ tipo: "IMAGE", url: vieja }, foto(1)]));

  await editar({ fotos: [foto(1).url, vieja] });
  assert.equal(fotos.subidas.length, 0, "la foto vieja no se vuelve a subir");
  assert.equal((await eventos.buscarPorId(id)).medios[1].url, vieja);

  await editar({ fotos: [foto(1).url] });
  assert.deepEqual((await eventos.buscarPorId(id)).mediosQuitados, []);
});

test("una foto propia con una miniatura distinta sigue siendo una foto", async () => {
  // Por ejemplo, cuando se usen miniaturas de Cloudinary (#63): la regla de la miniatura es solo para Instagram.
  const conMiniatura = { ...foto(2), thumbnailUrl: `${NUBE}c_fill,w_400/ifts2/eventos/foto-2.jpg` };
  const { eventos, id, editar } = await preparar(evento([foto(1), conMiniatura]));

  const res = await editar({ fotos: [conMiniatura.url] });

  assert.equal(res.status, 200, "se puede elegir como foto");
  const guardado = await eventos.buscarPorId(id);
  assert.deepEqual(guardado.medios.map((m) => m.url), [conMiniatura.url]);
  assert.equal(guardado.tipoMedio, "IMAGE");
  assert.equal(guardado.fotoPrincipal, conMiniatura.url);
});
