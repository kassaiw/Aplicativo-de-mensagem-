'use strict';
// Funções pequenas usadas por vários jogos.
const crypto = require('crypto');

// "Coração" -> "CORACAO" (tira acento, deixa maiúsculo)
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

// Embaralha uma lista (algoritmo de Fisher-Yates)
function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function sortear(lista) {
  return lista[crypto.randomInt(lista.length)];
}

// Quem está jogando: guardamos só o que precisa aparecer na tela
function jogador(u) {
  return { cid: u.cid, nome: u.nome, cor: u.cor, avatar: u.avatar || '' };
}

// Erro "amigável" que vai aparecer pro jogador
function erro(texto) {
  return { ok: false, erro: texto };
}

const OK = { ok: true };

module.exports = { normalizar, embaralhar, sortear, jogador, erro, OK };
