import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { ADMIN, BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";

test("login correcto devuelve token y usuario, sin el hash", async () => {
  const { app } = await appDePrueba();
  const res = await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: ADMIN.password });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.usuario.rol, "admin");
  assert.equal(res.body.usuario.passwordHash, undefined);
});

test("el correo no distingue mayúsculas", async () => {
  const { app } = await appDePrueba();
  const res = await request(app).post("/api/auth/login").send({ mail: "MATIAS@IFTS2.EDU.AR", password: ADMIN.password });
  assert.equal(res.status, 200);
});

test("contraseña incorrecta devuelve 401 y cuenta los intentos", async () => {
  const { app } = await appDePrueba();
  const res = await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: "mala" });
  assert.equal(res.status, 401);
  assert.match(res.body.error, /quedan 4 intentos/);
});

test("un correo que no existe da el mismo mensaje que una contraseña mala", async () => {
  const { app } = await appDePrueba();
  const res = await request(app).post("/api/auth/login").send({ mail: "nadie@ifts2.edu.ar", password: "Clave1234" });
  assert.equal(res.status, 401);
  assert.match(res.body.error, /Usuario o contraseña incorrectos/);
});

test("al quinto intento fallido bloquea, incluso con la contraseña correcta", async () => {
  const { app } = await appDePrueba();
  for (let i = 0; i < 4; i++) await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: "mala" });
  const quinto = await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: "mala" });
  assert.equal(quinto.status, 429);
  const correcta = await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: ADMIN.password });
  assert.equal(correcta.status, 429);
  assert.match(correcta.body.error, /15 minutos/);
});

test("el bloqueo no se saltea cambiando la IP declarada ni las mayúsculas del correo", async () => {
  const { app } = await appDePrueba();
  for (let i = 0; i < 5; i++) await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: "mala" });
  const res = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", "9.9.9.9")
    .send({ mail: ADMIN.mail.toUpperCase(), password: ADMIN.password });
  assert.equal(res.status, 429);
});

test("el bloqueo termina cuando pasa la ventana de tiempo", async () => {
  // En la prueba la ventana es de 300 ms; en producción son 15 minutos.
  const { app } = await appDePrueba({ bloqueoMs: 300 });
  for (let i = 0; i < 5; i++) await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: "mala" });
  const bloqueado = await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: ADMIN.password });
  assert.equal(bloqueado.status, 429);
  await new Promise((r) => setTimeout(r, 400));
  const res = await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: ADMIN.password });
  assert.equal(res.status, 200);
});

test("el bloqueo de una cuenta no afecta a las demás", async () => {
  const { app } = await appDePrueba();
  for (let i = 0; i < 5; i++) await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: "mala" });
  const res = await request(app).post("/api/auth/login").send({ mail: BEDELIA.mail, password: BEDELIA.password });
  assert.equal(res.status, 200);
});

test("un login correcto borra los fallos anteriores", async () => {
  const { app } = await appDePrueba();
  for (let i = 0; i < 4; i++) await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: "mala" });
  const ok = await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: ADMIN.password });
  assert.equal(ok.status, 200);
  const otraVez = await request(app).post("/api/auth/login").send({ mail: ADMIN.mail, password: "mala" });
  assert.equal(otraVez.status, 401);
  assert.match(otraVez.body.error, /quedan 4 intentos/);
});

test("GET /api/auth/yo sin token devuelve 401", async () => {
  const { app } = await appDePrueba();
  assert.equal((await request(app).get("/api/auth/yo")).status, 401);
});

test("GET /api/auth/yo con token devuelve el usuario", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, BEDELIA);
  const res = await request(app).get("/api/auth/yo").set("Authorization", `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.usuario.rol, "bedelia");
});

test("un token alterado se rechaza", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, ADMIN);
  const res = await request(app).get("/api/auth/yo").set("Authorization", `Bearer ${token}x`);
  assert.equal(res.status, 401);
});
