'use strict';
/*
 * STATUS DOS PERSONAGENS (Draft e Leilão)
 *
 * O AniList não tem "força" nem "velocidade" dos personagens, então o jogo
 * GERA os status assim:
 *   - Quanto mais popular o personagem (mais favoritos no AniList), maior o nível base.
 *   - Cada status varia pra cima ou pra baixo de um jeito fixo pra cada personagem
 *     (calculado a partir do ID dele), então o mesmo personagem sempre tem os mesmos status.
 *
 * Cada posição do time valoriza status diferentes. Um personagem com muita
 * Resistência rende mais como Tanque, um com muito Carisma rende mais como Capitão...
 */
const crypto = require('crypto');

const STATUS = [
  { id: 'forca', nome: 'Força', emoji: '💪' },
  { id: 'velocidade', nome: 'Velocidade', emoji: '⚡' },
  { id: 'inteligencia', nome: 'Inteligência', emoji: '🧠' },
  { id: 'resistencia', nome: 'Resistência', emoji: '🛡️' },
  { id: 'tecnica', nome: 'Técnica', emoji: '🎯' },
  { id: 'carisma', nome: 'Carisma', emoji: '✨' },
];

// Quanto cada status vale em cada posição (cada linha soma 1)
const POSICOES = {
  'Capitão': { carisma: 0.35, inteligencia: 0.25, forca: 0.2, tecnica: 0.2 },
  'Vice-capitão': { tecnica: 0.3, inteligencia: 0.3, velocidade: 0.2, carisma: 0.2 },
  'Tanque': { resistencia: 0.5, forca: 0.35, velocidade: 0.15 },
  'Suporte': { inteligencia: 0.35, tecnica: 0.35, velocidade: 0.3 },
  'Curandeiro': { inteligencia: 0.4, resistencia: 0.3, tecnica: 0.3 },
  'Coringa': { forca: 1 / 6, velocidade: 1 / 6, inteligencia: 1 / 6, resistencia: 1 / 6, tecnica: 1 / 6, carisma: 1 / 6 },
};
const TODAS_POSICOES = Object.keys(POSICOES);
const BONUS_SINERGIA = 5; // por personagem extra do mesmo anime no time

// Número "aleatório" que é sempre o mesmo pro mesmo texto (0 a 1)
function sorteioFixo(texto) {
  return crypto.createHash('sha256').update(texto).digest().readUInt32BE(0) / 2 ** 32;
}

// Recebe a lista ordenada do mais popular pro menos e coloca os status em cada um
function comStatus(personagens) {
  const n = personagens.length;
  return personagens.map((p, i) => {
    const percentil = n > 1 ? i / (n - 1) : 0; // 0 = o mais popular
    const base = 82 - 40 * percentil;
    const especial = STATUS[Math.floor(sorteioFixo(p.id + ':especial') * STATUS.length)].id;
    const status = {};
    for (const s of STATUS) {
      let valor = base + (sorteioFixo(p.id + ':' + s.id) - 0.5) * 44;
      if (s.id === especial) valor += 10;
      status[s.id] = Math.max(8, Math.min(99, Math.round(valor)));
    }
    return { ...p, status, especial };
  });
}

// Pontos de um personagem numa posição (0 a 100)
function pontuar(personagem, posicao) {
  if (!personagem?.status) return 0;
  const pesos = POSICOES[posicao] || POSICOES.Coringa;
  let total = 0;
  for (const [status, peso] of Object.entries(pesos)) total += (personagem.status[status] || 0) * peso;
  return Math.round(total);
}

// Poder total do time: soma dos pontos de cada posição + sinergia
function avaliarTime(time, posicoes) {
  const vagas = posicoes.map((posicao, i) => ({ posicao, pontos: pontuar(time[i], posicao) }));
  const porAnime = {};
  for (const p of time) if (p?.anime) porAnime[p.anime] = (porAnime[p.anime] || 0) + 1;
  const sinergia = Object.values(porAnime).reduce((s, qtd) => s + (qtd > 1 ? (qtd - 1) * BONUS_SINERGIA : 0), 0);
  const total = vagas.reduce((s, v) => s + v.pontos, 0) + sinergia;
  return { total, vagas, sinergia };
}

// Escolhe a vaga livre onde o personagem rende mais
function melhorVaga(time, posicoes, personagem) {
  let melhor = -1;
  let maior = -1;
  posicoes.forEach((posicao, i) => {
    if (time[i]) return;
    const pts = pontuar(personagem, posicao);
    if (pts > maior) {
      maior = pts;
      melhor = i;
    }
  });
  return melhor;
}

module.exports = { STATUS, POSICOES, TODAS_POSICOES, comStatus, pontuar, avaliarTime, melhorVaga, BONUS_SINERGIA };
