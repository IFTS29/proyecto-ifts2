import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { ADMIN, appDePrueba, tokenDe } from "./ayuda.js";
import { crearRepoEventosMemoria } from "../src/repos/eventos.memoria.js";
import { leerConfig } from "../src/config.js";
import { crearServicioFotos, nombreDeFoto } from "../src/services/media/fotosEventos.js";

const con = (req, token) => req.set("Authorization", `Bearer ${token}`);

// PNG de 1 x 1 píxel: alcanza para probar la subida sin archivos reales.
const FOTO_1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const FOTO_2 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U";

const eventoCon = (fotos) => ({
  titulo: "Muestra de panadería",
  descripcion: "Presentación de los trabajos de segundo año.",
  fechaEvento: "2026-11-05T18:00:00.000Z",
  fotoPrincipal: fotos[0],
  medios: fotos.map((url, i) => ({ id: String(i + 1), tipo: "IMAGE", url })),
});

// Reemplaza a Cloudinary en las pruebas: registra lo que se sube y lo que se borra.
// "fallaSubidaN" hace fallar esa subida (1, 2, …); "fallaBorrado" hace fallar todos los borrados.
function fotosDePrueba({ fallaSubidaN, fallaBorrado = false } = {}) {
  const subidas = [];
  const borradas = [];
  let intentos = 0;
  return {
    subidas,
    borradas,
    async subir(dataUrl, { nombre }) {
      intentos += 1;
      if (intentos === fallaSubidaN) throw new Error("Cloudinary no responde");
      const publicId = `ifts2/eventos/${nombre}`;
      subidas.push(publicId);
      return { url: `https://res.cloudinary.com/prueba/image/upload/${publicId}`, publicId };
    },
    async borrar(publicId) {
      if (fallaBorrado) throw new Error("Cloudinary no responde");
      borradas.push(publicId);
    },
  };
}

async function preparar(opciones = {}) {
  const eventos = opciones.eventos ?? crearRepoEventosMemoria();
  const fotosEventos = "fotosEventos" in opciones ? opciones.fotosEventos : fotosDePrueba();
  const { app } = await appDePrueba({ eventos, fotosEventos });
  const token = await tokenDe(app, ADMIN);
  return { app, token, eventos, fotos: fotosEventos };
}

test("alta con dos fotos nuevas: se suben y el evento guarda solo los enlaces", async () => {
  const { app, token, eventos, fotos } = await preparar();

  const res = await con(request(app).post("/api/events").send(eventoCon([FOTO_1, FOTO_2])), token);

  assert.equal(res.status, 201);
  assert.equal(fotos.subidas.length, 2);
  const [guardado] = await eventos.listar();
  assert.equal(guardado.medios.length, 2);
  assert.ok(guardado.medios.every((m) => m.url.startsWith("https://res.cloudinary.com/")));
  assert.deepEqual(
    guardado.medios.map((m) => m.publicId),
    fotos.subidas,
  );
  assert.equal(guardado.fotoPrincipal, guardado.medios[0].url);
  assert.ok(!JSON.stringify(guardado).includes("data:image"), "no queda ninguna foto en base64");
});

test("si falla la subida de la segunda foto: 502, no se guarda el evento y se borra la primera", async () => {
  const { app, token, eventos, fotos } = await preparar({ fotosEventos: fotosDePrueba({ fallaSubidaN: 2 }) });

  const res = await con(request(app).post("/api/events").send(eventoCon([FOTO_1, FOTO_2])), token);

  assert.equal(res.status, 502);
  assert.match(res.body.error, /foto 2/);
  assert.equal((await eventos.listar()).length, 0);
  assert.deepEqual(fotos.borradas, fotos.subidas);
});

test("si falla el guardado del evento, se borran las fotos que ya se habían subido", async (t) => {
  t.mock.method(console, "error", () => {});
  const repo = crearRepoEventosMemoria();
  const eventos = {
    ...repo,
    async crear() {
      throw new Error("MongoDB no responde");
    },
  };
  const { app, token, fotos } = await preparar({ eventos });

  const res = await con(request(app).post("/api/events").send(eventoCon([FOTO_1, FOTO_2])), token);

  assert.equal(res.status, 500);
  assert.match(res.body.error, /No se pudo guardar el evento/);
  assert.equal(fotos.subidas.length, 2);
  assert.deepEqual(fotos.borradas, fotos.subidas);
});

test("si falla el guardado, se borran solo las fotos nuevas, nunca los enlaces que ya existían", async (t) => {
  t.mock.method(console, "error", () => {});
  const repo = crearRepoEventosMemoria();
  const eventos = {
    ...repo,
    async crear() {
      throw new Error("MongoDB no responde");
    },
  };
  const { app, token, fotos } = await preparar({ eventos });
  const existente = "https://res.cloudinary.com/prueba/image/upload/ifts2/instagram/123.jpg";

  const res = await con(request(app).post("/api/events").send(eventoCon([existente, FOTO_1])), token);

  assert.equal(res.status, 500);
  assert.equal(fotos.subidas.length, 1);
  assert.deepEqual(fotos.borradas, fotos.subidas);
  assert.ok(!fotos.borradas.some((id) => existente.includes(id)));
});

test("un error inesperado después de subir las fotos también las borra", async (t) => {
  t.mock.method(console, "error", () => {});
  const fotos = fotosDePrueba();
  const subirOriginal = fotos.subir;
  // Simula un problema después de la subida: Cloudinary devuelve un enlace que no es texto.
  fotos.subir = async (...args) => ({ ...(await subirOriginal(...args)), url: 12345 });
  const { app, token, eventos } = await preparar({ fotosEventos: fotos });

  const res = await con(request(app).post("/api/events").send(eventoCon([FOTO_1])), token);

  assert.equal(res.status, 500);
  assert.equal((await eventos.listar()).length, 0);
  assert.deepEqual(fotos.borradas, fotos.subidas);
});

test("si tampoco se puede borrar, se registra y se responde el error original", async (t) => {
  const errores = t.mock.method(console, "error", () => {});
  const { app, token, eventos } = await preparar({
    fotosEventos: fotosDePrueba({ fallaSubidaN: 2, fallaBorrado: true }),
  });

  const res = await con(request(app).post("/api/events").send(eventoCon([FOTO_1, FOTO_2])), token);

  assert.equal(res.status, 502);
  assert.match(res.body.error, /foto 2/);
  assert.equal((await eventos.listar()).length, 0);
  assert.ok(errores.mock.calls.some((c) => /No se pudo borrar la foto/.test(c.arguments[0])));
});

test("una foto con formato no permitido o vacía responde 400 y no sube nada", async () => {
  const { app, token, eventos, fotos } = await preparar();

  const html = "data:text/html;base64,PHNjcmlwdD48L3NjcmlwdD4=";
  const noPermitida = await con(request(app).post("/api/events").send(eventoCon([FOTO_1, html])), token);
  assert.equal(noPermitida.status, 400);
  assert.match(noPermitida.body.error, /foto 2 no es una imagen/);

  const vacia = await con(request(app).post("/api/events").send(eventoCon(["data:image/png;base64,"])), token);
  assert.equal(vacia.status, 400);

  assert.equal(fotos.subidas.length, 0);
  assert.equal((await eventos.listar()).length, 0);
});

test("una foto demasiado pesada responde 400 antes de subir nada", async () => {
  const { app, token, fotos } = await preparar();
  const pesada = `data:image/jpeg;base64,${Buffer.alloc(4 * 1024 * 1024 + 1).toString("base64")}`;

  const res = await con(request(app).post("/api/events").send(eventoCon([pesada])), token);

  assert.equal(res.status, 400);
  assert.match(res.body.error, /pesa demasiado/);
  assert.equal(fotos.subidas.length, 0);
});

test("los enlaces que ya existen se guardan tal cual, sin subir nada", async () => {
  const { app, token, eventos, fotos } = await preparar();
  const enlaces = ["https://res.cloudinary.com/prueba/image/upload/ifts2/instagram/123.jpg", "/media/eventos/feria.jpg"];

  const res = await con(request(app).post("/api/events").send(eventoCon(enlaces)), token);

  assert.equal(res.status, 201);
  assert.equal(fotos.subidas.length, 0);
  const [guardado] = await eventos.listar();
  assert.deepEqual(
    guardado.medios.map((m) => m.url),
    enlaces,
  );
});

test("un enlace que no es http(s) ni una ruta del sitio responde 400", async () => {
  const { app, token, eventos } = await preparar();

  const res = await con(request(app).post("/api/events").send(eventoCon(["javascript:alert(1)"])), token);

  assert.equal(res.status, 400);
  assert.match(res.body.error, /enlace que no es válido/);
  assert.equal((await eventos.listar()).length, 0);
});

test("sin lugar para guardar fotos, igual se crean eventos sin fotos nuevas", async () => {
  const { app, token, eventos } = await preparar({ fotosEventos: null });

  const conEnlace = await con(
    request(app).post("/api/events").send(eventoCon(["https://res.cloudinary.com/prueba/image/upload/x.jpg"])),
    token,
  );
  assert.equal(conEnlace.status, 201);

  const { fotoPrincipal, medios, ...soloTexto } = eventoCon([FOTO_1]);
  assert.ok(fotoPrincipal && medios);
  const sinFotos = await con(request(app).post("/api/events").send(soloTexto), token);
  assert.equal(sinFotos.status, 201);

  assert.equal((await eventos.listar()).length, 2);
});

test("sin lugar para guardar fotos (null): 503 y no se crea el evento", async () => {
  const { app, token, eventos } = await preparar({ fotosEventos: null });

  const res = await con(request(app).post("/api/events").send(eventoCon([FOTO_1])), token);

  assert.equal(res.status, 503);
  assert.equal((await eventos.listar()).length, 0);
});

test("dónde se guardan las fotos: nunca en el disco en producción ni en Vercel", () => {
  const cloudinary = { CLOUDINARY_CLOUD_NAME: "c", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s" };
  assert.ok(crearServicioFotos(leerConfig(cloudinary)), "con Cloudinary configurado");
  assert.ok(crearServicioFotos(leerConfig({})), "en desarrollo local, sin Cloudinary, usa el disco");
  assert.equal(crearServicioFotos(leerConfig({ NODE_ENV: "production" })), null);
  assert.equal(crearServicioFotos(leerConfig({ VERCEL_ENV: "preview" })), null);
  assert.equal(crearServicioFotos(leerConfig({ VERCEL_URL: "proyecto-ifts2-abc.vercel.app" })), null);
});

test("nombre de cada foto: fecha, título simplificado, letras al azar y número", () => {
  const nombre = nombreDeFoto("Jornada de Cocina: ¡Año 2026!", 3, new Date("2026-11-05T12:00:00Z"));
  assert.match(nombre, /^20261105-jornada-de-cocina-ano-2026-[0-9a-f]{6}-3$/);
  assert.notEqual(nombreDeFoto("Igual", 1), nombreDeFoto("Igual", 1));
});

test("sin portada indicada, la portada es la primera foto ya subida", async () => {
  const { app, token, eventos } = await preparar();
  const { fotoPrincipal, ...sinPortada } = eventoCon([FOTO_1, FOTO_2]);

  const res = await con(request(app).post("/api/events").send(sinPortada), token);

  assert.equal(res.status, 201);
  assert.ok(fotoPrincipal, "el evento de base sí tenía portada");
  const [guardado] = await eventos.listar();
  assert.equal(guardado.fotoPrincipal, guardado.medios[0].url);
});
