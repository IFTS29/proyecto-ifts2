import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { appDePrueba, tokenDe, ADMIN, BEDELIA } from "./ayuda.js";
import { crearRepoContenidoMemoria } from "../src/repos/contenido.memoria.js";
import { VALORES_INICIALES, validarSeccion } from "../src/services/contenido.js";

// Contenido institucional (#36): perfil del egresado, autoridades y tutoría, y datos de contacto.

const persona = (nombre, cargo, grupo, detalle = "") => ({ nombre, cargo, detalle, grupo });
const PERSONAS = {
  personas: [
    { nombre: "Ana Pérez", cargo: "Rectora", detalle: "", grupo: "autoridades" },
    { nombre: "Luis Gómez", cargo: "Secretario académico", detalle: "", grupo: "autoridades" },
    { nombre: "Julia Sboro", cargo: "Tutora institucional", detalle: "Acompaña a los estudiantes.", grupo: "tutoria" },
  ],
};

async function preparar() {
  const contenido = crearRepoContenidoMemoria();
  const { app } = await appDePrueba({ contenido });
  const admin = await tokenDe(app, ADMIN);
  const bedelia = await tokenDe(app, BEDELIA);
  const guardar = (clave, datos, token = admin) =>
    request(app).put(`/api/content/${clave}`).set("Authorization", `Bearer ${token}`).send({ datos });
  return { app, contenido, admin, bedelia, guardar };
}

test("sin nada guardado: el sitio recibe los valores iniciales, marcados como iniciales y sin fecha", async () => {
  const { app } = await preparar();
  const res = await request(app).get("/api/content");
  assert.equal(res.status, 200);
  assert.equal(res.headers["cache-control"], "no-store");
  for (const clave of ["perfil", "personas", "contacto"]) {
    assert.deepEqual(res.body[clave], { datos: VALORES_INICIALES[clave], actualizadoEn: null, inicial: true });
  }
  // Teléfono y correo no se publican hasta que el IFTS 2 los confirme.
  assert.equal(res.body.contacto.datos.telefono, "");
  assert.equal(res.body.contacto.datos.correo, "");
  assert.match(res.body.perfil.datos.parrafos[1], /desde 2007/);
});

test("los valores iniciales no se escriben en la base", async () => {
  const { app, contenido } = await preparar();
  await request(app).get("/api/content");
  assert.deepEqual(await contenido.listar(), []);
});

test("Administración guarda una sección y el sitio la ve enseguida, sin quién la guardó", async () => {
  const { app, guardar, contenido } = await preparar();
  const res = await guardar("personas", PERSONAS);
  assert.equal(res.status, 200);
  assert.equal(res.body.inicial, false);
  assert.ok(res.body.actualizadoEn);
  assert.equal(res.body.actualizadoPor, undefined);

  const publico = await request(app).get("/api/content");
  assert.deepEqual(publico.body.personas.datos, PERSONAS);
  assert.equal(publico.body.personas.actualizadoPor, undefined);
  // Quién guardó queda en la base, tomado de la sesión.
  const [registro] = await contenido.listar();
  assert.equal(registro.actualizadoPor, ADMIN.nombre);
});

test("guardar una sección no toca las otras", async () => {
  const { app, guardar } = await preparar();
  await guardar("perfil", { parrafos: ["Un solo párrafo."] });
  const res = await request(app).get("/api/content");
  assert.deepEqual(res.body.perfil.datos, { parrafos: ["Un solo párrafo."] });
  assert.equal(res.body.personas.inicial, true);
  assert.equal(res.body.contacto.inicial, true);
});

test("quién guardó sale de la sesión, no de lo que manda el navegador", async () => {
  const { app, contenido } = await preparar();
  const admin = await tokenDe(app, ADMIN);
  await request(app)
    .put("/api/content/perfil")
    .set("Authorization", `Bearer ${admin}`)
    .send({ datos: { parrafos: ["Texto."] }, actualizadoPor: "Otra persona" });
  const [registro] = await contenido.listar();
  assert.equal(registro.actualizadoPor, ADMIN.nombre);
});

test("permisos: sin sesión 401, Bedelía 403; leer es público", async () => {
  const { app, guardar, bedelia } = await preparar();
  const sinSesion = await request(app).put("/api/content/perfil").send({ datos: { parrafos: ["x"] } });
  assert.equal(sinSesion.status, 401);
  assert.equal((await guardar("perfil", { parrafos: ["x"] }, bedelia)).status, 403);
  assert.equal((await request(app).get("/api/content")).status, 200);
});

test("una sección que no existe da 404, también para quien no es administrador", async () => {
  const { guardar, bedelia } = await preparar();
  assert.equal((await guardar("plan", { parrafos: ["x"] })).status, 404);
  assert.equal((await guardar("plan", { parrafos: ["x"] }, bedelia)).status, 403);
});

test("datos inválidos: 400 con el mensaje y no se guarda nada", async () => {
  const { guardar, contenido } = await preparar();
  const casos = [
    ["perfil", { parrafos: [] }, /al menos un párrafo/],
    ["perfil", { parrafos: ["   "] }, /al menos un párrafo/],
    ["perfil", { parrafos: Array(7).fill("Texto.") }, /hasta 6 párrafos/],
    ["perfil", { parrafos: ["x".repeat(1001)] }, /El párrafo 1 admite hasta 1000/],
    ["perfil", "texto suelto", /no son válidos/],
    ["personas", { personas: [] }, /al menos una persona/],
    ["personas", { personas: Array(13).fill(PERSONAS.personas[0]) }, /hasta 12 personas/],
    ["personas", { personas: [persona("", "Rectora", "autoridades")] }, /^Persona 1: completar el nombre\.$/],
    ["personas", { personas: [PERSONAS.personas[0], persona("Ana", " ", "tutoria")] }, /^Persona 2: completar el cargo\.$/],
    ["personas", { personas: [persona("Ana", "Rectora", "otro")] }, /^Persona 1: el grupo tiene que ser/],
    ["personas", { personas: [persona("Ana", "Rectora", "tutoria", "x".repeat(161))] }, /la aclaración admite hasta 160/],
    ["contacto", { ...VALORES_INICIALES.contacto, direccion: "" }, /^Completar la dirección\.$/],
    ["contacto", { ...VALORES_INICIALES.contacto, correo: "bedelia@" }, /formato válido/],
    ["contacto", { ...VALORES_INICIALES.contacto, telefono: "llamar" }, /solo admite números/],
    ["contacto", { ...VALORES_INICIALES.contacto, horario: 18 }, /^El horario no tiene un valor válido\./],
  ];
  for (const [clave, datos, mensaje] of casos) {
    const res = await guardar(clave, datos);
    assert.equal(res.status, 400, `${clave}: ${JSON.stringify(datos).slice(0, 60)}`);
    assert.match(res.body.error, mensaje);
  }
  assert.deepEqual(await contenido.listar(), []);
});

test("los textos se guardan sin espacios de más; un párrafo vacío se descarta; el correo va en minúsculas", () => {
  const perfil = validarSeccion("perfil", { parrafos: ["  Uno. ", "", " Dos."] }).datos;
  assert.deepEqual(perfil, { parrafos: ["Uno.", "Dos."] });
  const contacto = validarSeccion("contacto", {
    ...VALORES_INICIALES.contacto,
    direccion: "  Cañada de Gómez 3850 ",
    telefono: " 4638-5656 ",
    correo: " DFTS_IFTS2_DE20@bue.edu.ar ",
  }).datos;
  assert.equal(contacto.direccion, "Cañada de Gómez 3850");
  assert.equal(contacto.telefono, "4638-5656");
  assert.equal(contacto.correo, "dfts_ifts2_de20@bue.edu.ar");
  // Campos de más no se guardan.
  const persona = validarSeccion("personas", { personas: [{ ...PERSONAS.personas[0], rol: "admin" }] }).datos;
  assert.deepEqual(Object.keys(persona.personas[0]), ["nombre", "cargo", "detalle", "grupo"]);
});

test("si falla la base, la lectura responde un error y no los valores iniciales", async () => {
  const caido = { listar: async () => Promise.reject(new Error("MongoDB no responde")), guardar: async () => null };
  const { app } = await appDePrueba({ contenido: caido });
  const res = await request(app).get("/api/content");
  assert.equal(res.status, 500);
  assert.equal(res.body.datos, undefined);
});
