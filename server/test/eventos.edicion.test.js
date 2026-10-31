import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { ADMIN, BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";
import { crearRepoEventosMemoria } from "../src/repos/eventos.memoria.js";
import { sincronizarInstagram } from "../src/services/instagram/index.js";

const con = (req, token) => req.set("Authorization", `Bearer ${token}`);

const EVENTO = {
  origen: "manual",
  titulo: "Muestra de panadería",
  descripcion: "Trabajos de segundo año.",
  fechaEvento: "2026-10-05T18:00:00.000Z",
  fotoPrincipal: "https://res.cloudinary.com/prueba/image/upload/ifts2/eventos/foto-1.jpg",
  medios: [{ tipo: "IMAGE", url: "https://res.cloudinary.com/prueba/image/upload/ifts2/eventos/foto-1.jpg" }],
  estado: "visible",
};

async function preparar(datosIniciales = [EVENTO]) {
  const eventos = crearRepoEventosMemoria();
  const creados = [];
  for (const datos of datosIniciales) creados.push(await eventos.crear(datos));
  const { app } = await appDePrueba({ eventos });
  const token = await tokenDe(app, ADMIN);
  return { app, token, eventos, evento: creados[0] };
}

// ----- Edición -----

test("editar cambia título, resumen, descripción y fecha", async () => {
  const { app, token, eventos, evento } = await preparar();
  const cambios = {
    titulo: "Muestra de panadería artesanal",
    resumen: "Panes de masa madre",
    descripcion: "Trabajos de segundo año, turno noche.",
    fechaEvento: "2026-10-06T18:00:00.000Z",
  };

  const res = await con(request(app).put(`/api/events/${evento.id}`).send(cambios), token);

  assert.equal(res.status, 200);
  const guardado = await eventos.buscarPorId(evento.id);
  assert.equal(guardado.titulo, cambios.titulo);
  assert.equal(guardado.resumen, cambios.resumen);
  assert.equal(guardado.descripcion, cambios.descripcion);
  assert.equal(new Date(guardado.fechaEvento).toISOString(), cambios.fechaEvento);
});

test("editar no cambia fotos, origen, estado ni otros datos internos aunque se envíen", async () => {
  const { app, token, eventos, evento } = await preparar();

  const res = await con(
    request(app)
      .put(`/api/events/${evento.id}`)
      .send({
        titulo: "Nuevo título",
        descripcion: "Nueva descripción",
        origen: "instagram",
        instagramId: "999",
        estado: "oculto",
        fotoPrincipal: "https://otro-sitio.com/foto.jpg",
        medios: [],
        editadoPorAdmin: true,
      }),
    token,
  );

  assert.equal(res.status, 200);
  const guardado = await eventos.buscarPorId(evento.id);
  assert.equal(guardado.titulo, "Nuevo título");
  assert.equal(guardado.origen, "manual");
  assert.equal(guardado.instagramId, null);
  assert.equal(guardado.estado, "visible");
  assert.equal(guardado.fotoPrincipal, EVENTO.fotoPrincipal);
  assert.deepEqual(guardado.medios, EVENTO.medios);
  assert.equal(guardado.editadoPorAdmin, false);
});

test("si no se envían la fecha o el resumen al editar, se conservan los que tenía", async () => {
  const { app, token, eventos, evento } = await preparar([{ ...EVENTO, resumen: "Panes de masa madre" }]);

  await con(request(app).put(`/api/events/${evento.id}`).send({ titulo: "Otro", descripcion: "Otra" }), token);

  const guardado = await eventos.buscarPorId(evento.id);
  assert.equal(new Date(guardado.fechaEvento).toISOString(), EVENTO.fechaEvento);
  assert.equal(guardado.resumen, "Panes de masa madre");
});

test("el panel puede leer un evento oculto para editarlo; el sitio público no", async () => {
  const { app, token, evento } = await preparar([{ ...EVENTO, estado: "oculto" }]);

  const panel = await con(request(app).get(`/api/events/admin/${evento.id}`), token);
  assert.equal(panel.status, 200);
  assert.equal(panel.body.evento.titulo, EVENTO.titulo);

  assert.equal((await request(app).get(`/api/events/${evento.id}`)).status, 404);
  assert.equal((await request(app).get(`/api/events/admin/${evento.id}`)).status, 401);
  assert.equal((await con(request(app).get("/api/events/admin/no-existe"), token)).status, 404);
});

test("editar con datos inválidos responde 400 y no cambia nada", async () => {
  const { app, token, eventos, evento } = await preparar();

  const sinTitulo = await con(request(app).put(`/api/events/${evento.id}`).send({ titulo: " ", descripcion: "x" }), token);
  assert.equal(sinTitulo.status, 400);
  assert.match(sinTitulo.body.error, /título/);

  const fechaMala = await con(
    request(app).put(`/api/events/${evento.id}`).send({ titulo: "x", descripcion: "x", fechaEvento: "ayer" }),
    token,
  );
  assert.equal(fechaMala.status, 400);
  assert.match(fechaMala.body.error, /fecha/);

  assert.equal((await eventos.buscarPorId(evento.id)).titulo, EVENTO.titulo);
});

test("editar un evento que no existe responde 404", async () => {
  const { app, token } = await preparar();
  const res = await con(request(app).put("/api/events/no-existe").send({ titulo: "x", descripcion: "x" }), token);
  assert.equal(res.status, 404);
});

test("editar y ocultar exigen sesión de administrador (401 y 403)", async () => {
  const { app, evento } = await preparar();
  const datos = { titulo: "x", descripcion: "x" };

  assert.equal((await request(app).put(`/api/events/${evento.id}`).send(datos)).status, 401);
  assert.equal((await request(app).patch(`/api/events/${evento.id}/estado`).send({ estado: "oculto" })).status, 401);

  const tokenBedelia = await tokenDe(app, BEDELIA);
  assert.equal((await con(request(app).put(`/api/events/${evento.id}`).send(datos), tokenBedelia)).status, 403);
  assert.equal(
    (await con(request(app).patch(`/api/events/${evento.id}/estado`).send({ estado: "oculto" }), tokenBedelia)).status,
    403,
  );
});

// ----- Visibilidad -----

test("ocultar saca el evento del sitio y mostrar lo vuelve a poner, sin borrar nada", async () => {
  const { app, token, eventos, evento } = await preparar();

  const ocultar = await con(request(app).patch(`/api/events/${evento.id}/estado`).send({ estado: "oculto" }), token);
  assert.equal(ocultar.status, 200);
  assert.equal((await request(app).get("/api/events")).body.eventos.length, 0);
  assert.equal((await request(app).get(`/api/events/${evento.id}`)).status, 404);
  assert.ok(await eventos.buscarPorId(evento.id), "el evento sigue guardado");

  const mostrar = await con(request(app).patch(`/api/events/${evento.id}/estado`).send({ estado: "visible" }), token);
  assert.equal(mostrar.status, 200);
  assert.equal((await request(app).get("/api/events")).body.eventos.length, 1);
});

test("el estado solo puede ser visible u oculto; un evento archivado no se muestra desde acá", async () => {
  const { app, token, eventos, evento } = await preparar();
  const archivado = await eventos.crear({ ...EVENTO, titulo: "Evento de 2025", estado: "archivado" });

  const invalido = await con(request(app).patch(`/api/events/${evento.id}/estado`).send({ estado: "archivado" }), token);
  assert.equal(invalido.status, 400);

  const res = await con(request(app).patch(`/api/events/${archivado.id}/estado`).send({ estado: "visible" }), token);
  assert.equal(res.status, 409);
  assert.equal((await eventos.buscarPorId(archivado.id)).estado, "archivado");

  const noExiste = await con(request(app).patch("/api/events/no-existe/estado").send({ estado: "oculto" }), token);
  assert.equal(noExiste.status, 404);
});

// ----- Instagram -----

// Instagram falso: devuelve siempre la misma publicación con #eventosIFTS2.
const PUBLICACION = {
  id: "17890001",
  caption: "Muestra de panadería\nPanes de masa madre del segundo año. #eventosIFTS2",
  media_type: "IMAGE",
  media_url: "https://cdn.instagram.example/17890001.jpg",
  permalink: "https://www.instagram.com/p/abc123/",
  timestamp: "2026-10-20T12:00:00+0000",
};

function instagramDePrueba() {
  let feed = [];
  return {
    config: { instagramToken: "token-de-prueba", instagramAccountId: "123" },
    repoFeed: {
      loadFeed: async () => feed,
      saveFeed: async (posts) => {
        feed = posts;
        return posts;
      },
      loadDeletedPostIds: async () => [],
      loadSyncStatus: async () => null,
      saveSyncStatus: async (estado) => estado,
    },
    mediaService: {
      guardarMedioDeInstagram: async (url, { nombre }) => ({ url: `https://res.cloudinary.com/prueba/${nombre}`, publicId: nombre }),
    },
    fetchFn: async (url) => ({
      ok: true,
      json: async () => (url.includes("/media?") ? { data: [PUBLICACION] } : { username: "ifts2" }),
    }),
  };
}

test("la sincronización de Instagram no pisa un evento editado ni vuelve a mostrar uno oculto", async () => {
  const eventos = crearRepoEventosMemoria();
  const instagram = instagramDePrueba();
  await sincronizarInstagram({ ...instagram, eventos });
  const [importado] = await eventos.listar();
  assert.equal(importado.origen, "instagram");

  const { app } = await appDePrueba({ eventos });
  const token = await tokenDe(app, ADMIN);
  await con(
    request(app).put(`/api/events/${importado.id}`).send({ titulo: "Título corregido", descripcion: "Texto corregido" }),
    token,
  );
  await con(request(app).patch(`/api/events/${importado.id}/estado`).send({ estado: "oculto" }), token);

  await sincronizarInstagram({ ...instagram, eventos });

  const despues = await eventos.listar();
  assert.equal(despues.length, 1, "no se duplica");
  assert.equal(despues[0].titulo, "Título corregido");
  assert.equal(despues[0].editadoPorAdmin, true);
  assert.equal(despues[0].estado, "oculto");
});
