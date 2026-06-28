const test = require("node:test");
const assert = require("node:assert/strict");
const identity = require("../src/services/productIdentity.service");

test("agrupa variações de cor do Attack Shark R1", () => {
  const preto = identity.createProductIdentity({
    title: "Mouse Gamer sem Fio Attack Shark R1 Ultraleve Preto"
  });

  const branco = identity.createProductIdentity({
    title: "Mouse Gamer sem Fio Attack Shark R1 Ultraleve Branco"
  });

  assert.equal(preto.productKey, branco.productKey);
  assert.equal(preto.productKey, "attack-shark-r1");
});

test("gera identidade para Ryzen 5 7600", () => {
  const result = identity.createProductIdentity({
    title: "Processador AMD Ryzen 5 7600, 5.1GHz Max Turbo, Cache 38MB, AM5"
  });

  assert.equal(result.productKey.includes("ryzen"), true);
  assert.equal(result.productKey.includes("7600"), true);
});