import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
// Sincronización con Instagram sin credenciales configuradas (#63).
import { credencialesDeInstagram, sincronizarInstagram } from "../src/services/instagram/index.js";
import { crearRutasInstagram } from "../src/routes/instagram.js";
import { puedeSincronizar } from "../../client/src/eventos.js";

const COMPLETAS = { instagramToken: "token-de-prueba", instagramAccountId: "123" };

// Feed guardado simulado: anota qué se le pidió. Tiene una publicación de eventos para comprobar que,
// sin credenciales, no se usa para crear eventos.
function feedDePrueba(estadoGuardado = null) {
  const llamadas = [];
  return {
    llamadas,
    async loadFeed() {
      llamadas.push("loadFeed");
      return [{ id: "99", caption: "Evento viejo #eventosIFTS2", categories: ["eventos"] }];
    },
    async saveFeed() {
      llamadas.push("saveFeed");
    },
    async loadSyncStatus() {
      return estadoGuardado;
    },
    async saveSyncStatus() {
      llamadas.push("saveSyncStatus");
    },
  };
}

function appCon(config, repoFeed) {
  const app = express();
  app.use("/api/instagram", crearRutasInstagram({ config, repoFeed, eventos: null }));
  return app;
}

test("credencialesDeInstagram: hacen falta el token y el id de la cuenta", () => {
  assert.equal(credencialesDeInstagram({}).configuradas, false);
  assert.equal(credencialesDeInstagram({ instagramAccountId: "123" }).configuradas, false);
  assert.equal(credencialesDeInstagram({ instagramToken: "token-de-prueba" }).configuradas, false);
  assert.equal(
    credencialesDeInstagram({ instagramToken: "tu_token_de_larga_duracion_aqui", instagramAccountId: "123" }).configuradas,
    false,
  );
  assert.deepEqual(credencialesDeInstagram(COMPLETAS), { token: "token-de-prueba", accountId: "123", configuradas: true });
});

test("sin credenciales no se consulta Instagram, no se crean eventos y no se cambia el estado guardado", async () => {
  const repoFeed = feedDePrueba();
  const creados = [];
  const eventos = {
    buscarPorInstagramId: async () => null,
    crear: async (datos) => creados.push(datos),
  };
  let consultas = 0;
  const fetchFn = async () => {
    consultas++;
    throw new Error("no debería consultarse");
  };

  for (const config of [{}, { instagramAccountId: "123" }, { instagramToken: "token-de-prueba" }]) {
    const resultado = await sincronizarInstagram({ config, repoFeed, eventos, fetchFn });
    assert.equal(resultado.success, false);
    assert.equal(resultado.sinCredenciales, true);
    assert.equal(resultado.error, "No hay una conexión configurada con Instagram.");
  }
  assert.equal(consultas, 0);
  assert.equal(creados.length, 0);
  assert.deepEqual(repoFeed.llamadas, []);
});

test("POST /sync sin credenciales responde 503 con el motivo", async () => {
  const res = await request(appCon({}, feedDePrueba())).post("/api/instagram/sync");
  assert.equal(res.status, 503);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error, "No hay una conexión configurada con Instagram.");
});

test("GET /status sin credenciales: sin conexión aunque haya una sincronización correcta guardada", async () => {
  const guardado = { conectado: true, cuenta: "@ifts2", estado: "activo", ultimaSincronizacion: "2026-10-30T20:00:00Z" };
  const res = await request(appCon({}, feedDePrueba(guardado))).get("/api/instagram/status");
  assert.equal(res.status, 200);
  assert.equal(res.body.configurado, false);
  assert.equal(res.body.conectado, false);
  assert.equal(res.body.estado, "sin_conexion");
  // La fecha guardada no se borra.
  assert.equal(res.body.ultimaSincronizacion, "2026-10-30T20:00:00Z");
});

test("GET /status con credenciales: igual que antes, con configurado", async () => {
  const guardado = { conectado: true, cuenta: "@ifts2", estado: "activo", ultimaSincronizacion: "2026-10-30T20:00:00Z" };
  const conGuardado = await request(appCon(COMPLETAS, feedDePrueba(guardado))).get("/api/instagram/status");
  assert.equal(conGuardado.body.configurado, true);
  assert.equal(conGuardado.body.conectado, true);
  assert.equal(conGuardado.body.estado, "activo");
  assert.equal(conGuardado.body.cuenta, "@ifts2");

  const error = { conectado: false, estado: "error", error: "Token vencido", ultimaSincronizacion: "2026-10-29T20:00:00Z" };
  const conError = await request(appCon(COMPLETAS, feedDePrueba(error))).get("/api/instagram/status");
  assert.equal(conError.body.configurado, true);
  assert.equal(conError.body.estado, "error");
  assert.equal(conError.body.ultimaSincronizacion, "2026-10-29T20:00:00Z");

  const nunca = await request(appCon(COMPLETAS, feedDePrueba(null))).get("/api/instagram/status");
  assert.equal(nunca.body.conectado, true);
  assert.equal(nunca.body.ultimaSincronizacion, null);
});

test("GET /status descarta la fecha que guardaba la versión anterior al sincronizar sin credenciales", async () => {
  const anterior = { conectado: false, estado: "sin_sincronizar", ultimaSincronizacion: "2026-10-30T23:59:00Z" };
  const res = await request(appCon(COMPLETAS, feedDePrueba(anterior))).get("/api/instagram/status");
  assert.equal(res.body.configurado, true);
  assert.equal(res.body.conectado, true);
  assert.equal(res.body.estado, "activo");
  assert.equal(res.body.ultimaSincronizacion, null);
});

test("puedeSincronizar: solo con credenciales confirmadas y sin una sincronización en curso", () => {
  assert.equal(puedeSincronizar({ configurado: null }), false); // todavía se está consultando el estado
  assert.equal(puedeSincronizar({}), false); // la consulta del estado falló
  assert.equal(puedeSincronizar({ configurado: false }), false);
  assert.equal(puedeSincronizar({ configurado: true, conectado: true }), true);
  assert.equal(puedeSincronizar({ configurado: true, conectado: false, estado: "error" }), true); // reintentar
  assert.equal(puedeSincronizar({ configurado: true }, true), false); // sincronizando
});
