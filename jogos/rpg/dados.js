'use strict';
/*
 * =================================================================
 *  MASMORRA — os DADOS do jogo (classes, habilidades, inimigos, salas)
 * =================================================================
 *  Aqui não tem lógica nenhuma, só tabelas. Quer deixar um herói mais
 *  forte, criar uma habilidade nova ou mudar a dungeon? É aqui.
 *
 *  Como ler uma HABILIDADE:
 *    nome, icone, descricao  → o que aparece na tela
 *    de: [1, 2]      → de quais POSIÇÕES você pode usar (1 = na frente)
 *    alvo:           → 'inimigo' | 'aliado' | 'eu' | 'vizinho'
 *                      | 'todosInimigos' | 'todosAliados'
 *    em: [1, 2, 3]   → em quais posições do inimigo ela alcança
 *    poder: 1.0      → força do golpe (multiplica o status)
 *    stat: 'atq'     → usa Ataque ('atq') ou Magia ('mag')
 *    elemento:       → corte, impacto, fogo, gelo, raio, luz, sombra
 *    quebra: 2       → quanto tira do ESCUDO do inimigo (padrão 1)
 *    peso: 1.5       → quanto tempo a ação "custa" na linha do tempo
 *                      (0.5 = rápida, você joga de novo logo; 1.5 = lenta)
 *    efeito / efeitos → { tipo, turnos, valor, chance } (veja EFEITOS)
 *    cura, aliviar, estresse, revelar, invocar → casos especiais
 * =================================================================
 */

const ELEMENTOS = {
  corte: { nome: 'Corte', icone: '🗡️' },
  impacto: { nome: 'Impacto', icone: '🔨' },
  fogo: { nome: 'Fogo', icone: '🔥' },
  gelo: { nome: 'Gelo', icone: '❄️' },
  raio: { nome: 'Raio', icone: '⚡' },
  luz: { nome: 'Luz', icone: '✨' },
  sombra: { nome: 'Sombra', icone: '🌑' },
};

// Efeitos que ficam na unidade por alguns turnos (contam os turnos DELA)
const EFEITOS = {
  veneno: { nome: 'Veneno', icone: '🟢', descricao: 'Perde vida no começo de cada turno.' },
  sangra: { nome: 'Sangrando', icone: '🩸', descricao: 'Perde vida no começo de cada turno.' },
  atordoado: { nome: 'Atordoado', icone: '💫', descricao: 'Perde a próxima vez.' },
  marcado: { nome: 'Marcado', icone: '🎯', descricao: 'Recebe 30% a mais de dano.' },
  provocando: { nome: 'Provocando', icone: '😤', descricao: 'Os inimigos preferem atacar ele.' },
  protegido: { nome: 'Protegido', icone: '🛡️', descricao: 'Um aliado recebe os golpes no lugar.' },
  defendendo: { nome: 'Defendendo', icone: '🧱', descricao: 'Recebe metade do dano até a próxima vez.' },
  defesa: { nome: 'Defesa+', icone: '⬆️', descricao: 'Defesa aumentada.' },
  rapido: { nome: 'Acelerado', icone: '💨', descricao: 'Velocidade aumentada (joga mais vezes).' },
  lento: { nome: 'Lento', icone: '🐌', descricao: 'Velocidade reduzida.' },
};

const QUALQUER = [1, 2, 3, 4];

const HABILIDADES = {
  // ---------- Todo herói tem ----------
  mover: { nome: 'Mover', icone: '↔️', descricao: 'Troca de lugar com o aliado do lado. Ação rápida.', de: QUALQUER, alvo: 'vizinho', peso: 0.5 },
  defender: { nome: 'Defender', icone: '🧱', descricao: 'Recebe metade do dano até a sua próxima vez. Ação rápida.', de: QUALQUER, alvo: 'eu', peso: 0.5, efeito: { tipo: 'defendendo', turnos: 1 } },
  resenha: {
    nome: 'Ataque da Resenha',
    icone: '🌟',
    descricao: 'Golpe em conjunto do time inteiro em TODOS os inimigos. Só aparece na Sintonia (quando todos os inimigos estão quebrados).',
    de: QUALQUER,
    alvo: 'todosInimigos',
    especial: true,
  },

  // ---------- Guardião ----------
  golpeEscudo: { nome: 'Golpe de Escudo', icone: '🔨', descricao: 'Pancada que quebra bem o escudo. Pode atordoar.', de: [1, 2], alvo: 'inimigo', em: [1, 2], poder: 1.0, stat: 'atq', elemento: 'impacto', quebra: 2, efeito: { tipo: 'atordoado', turnos: 1, chance: 20 } },
  martelada: { nome: 'Martelada', icone: '⚒️', descricao: 'Golpe pesado e lento no inimigo da frente.', de: [1], alvo: 'inimigo', em: [1], poder: 1.7, stat: 'atq', elemento: 'impacto', quebra: 3, peso: 1.5 },
  provocar: { nome: 'Provocar', icone: '😤', descricao: 'Chama a atenção dos inimigos e aumenta a própria defesa por 2 turnos.', de: [1, 2, 3], alvo: 'eu', peso: 0.7, efeitos: [{ tipo: 'provocando', turnos: 2 }, { tipo: 'defesa', turnos: 2, valor: 5 }] },
  muralha: { nome: 'Muralha', icone: '🛡️', descricao: 'Protege um aliado: os golpes nele vêm pra você por 2 turnos.', de: [1, 2], alvo: 'aliado', outro: true, efeito: { tipo: 'protegido', turnos: 2 } },

  // ---------- Lâmina ----------
  corteRapido: { nome: 'Corte Rápido', icone: '🗡️', descricao: 'Ataque veloz: você joga de novo mais cedo.', de: [1, 2, 3], alvo: 'inimigo', em: [1, 2, 3], poder: 0.9, stat: 'atq', elemento: 'corte', peso: 0.7 },
  laminaVenenosa: { nome: 'Lâmina Venenosa', icone: '🟢', descricao: 'Corte fraco que envenena por 3 turnos.', de: [1, 2, 3], alvo: 'inimigo', em: QUALQUER, poder: 0.5, stat: 'atq', elemento: 'corte', efeito: { tipo: 'veneno', turnos: 3, valor: 4 } },
  adaga: { nome: 'Adaga Arremessada', icone: '🔪', descricao: 'Acerta quem está lá atrás. Chance alta de crítico.', de: [2, 3, 4], alvo: 'inimigo', em: [2, 3, 4], poder: 1.0, stat: 'atq', elemento: 'corte', crit: 15 },
  marcar: { nome: 'Marcar Presa', icone: '🎯', descricao: 'Marca um inimigo: ele recebe 30% a mais de dano por 3 turnos. Ação rápida.', de: QUALQUER, alvo: 'inimigo', em: QUALQUER, peso: 0.6, efeito: { tipo: 'marcado', turnos: 3 } },

  // ---------- Arcano ----------
  bolaDeFogo: { nome: 'Bola de Fogo', icone: '🔥', descricao: 'Magia de fogo em qualquer inimigo.', de: [2, 3, 4], alvo: 'inimigo', em: QUALQUER, poder: 1.1, stat: 'mag', elemento: 'fogo' },
  estilhaco: { nome: 'Estilhaço de Gelo', icone: '❄️', descricao: 'Gelo que deixa o alvo lento por 2 turnos.', de: [2, 3, 4], alvo: 'inimigo', em: [1, 2, 3], poder: 0.9, stat: 'mag', elemento: 'gelo', efeito: { tipo: 'lento', turnos: 2, valor: 2 } },
  correnteRaios: { nome: 'Corrente de Raios', icone: '⚡', descricao: 'Raio que pula em TODOS os inimigos. Lenta.', de: [3, 4], alvo: 'todosInimigos', poder: 0.5, stat: 'mag', elemento: 'raio', peso: 1.3 },
  analisar: { nome: 'Analisar', icone: '🔍', descricao: 'Descobre todas as fraquezas e resistências do alvo. Ação rápida.', de: QUALQUER, alvo: 'inimigo', em: QUALQUER, peso: 0.5, revelar: true },

  // ---------- Bardo ----------
  cancaoCura: { nome: 'Canção de Cura', icone: '🎵', descricao: 'Cura um aliado. Levanta quem caiu.', de: QUALQUER, alvo: 'aliado', cura: 1.1, stat: 'mag', levanta: true },
  refrao: { nome: 'Refrão de Coragem', icone: '🎶', descricao: 'Tira 15 de estresse de todo o time.', de: QUALQUER, alvo: 'todosAliados', aliviar: 15 },
  notaLuz: { nome: 'Nota Luminosa', icone: '✨', descricao: 'Som de luz que fere os mortos-vivos.', de: [2, 3, 4], alvo: 'inimigo', em: QUALQUER, poder: 0.9, stat: 'mag', elemento: 'luz' },
  ritmo: { nome: 'Ritmo Acelerado', icone: '💨', descricao: 'Um aliado fica mais rápido por 3 turnos. Ação rápida.', de: QUALQUER, alvo: 'aliado', peso: 0.6, efeito: { tipo: 'rapido', turnos: 3, valor: 3 } },

  // ---------- Inimigos ----------
  espadaEnferrujada: { nome: 'Espada Enferrujada', icone: '🗡️', de: [1, 2], alvo: 'inimigo', em: [1, 2], poder: 1.0, stat: 'atq', elemento: 'corte' },
  escudoOsso: { nome: 'Escudo de Osso', icone: '⬆️', de: QUALQUER, alvo: 'eu', efeito: { tipo: 'defesa', turnos: 2, valor: 5 }, chanceIA: 0.4 },
  flecha: { nome: 'Flecha', icone: '🏹', de: [2, 3, 4], alvo: 'inimigo', em: [2, 3, 4], poder: 1.0, stat: 'atq', elemento: 'corte' },
  flechaSombria: { nome: 'Flecha Sombria', icone: '🌑', de: [3, 4], alvo: 'inimigo', em: QUALQUER, poder: 0.6, stat: 'atq', elemento: 'sombra', estresse: 12 },
  mordida: { nome: 'Mordida', icone: '🦇', de: QUALQUER, alvo: 'inimigo', em: QUALQUER, poder: 0.8, stat: 'atq', elemento: 'corte', efeito: { tipo: 'sangra', turnos: 2, valor: 3 } },
  guincho: { nome: 'Guincho', icone: '🔊', de: QUALQUER, alvo: 'todosInimigos', estresse: 8, chanceIA: 0.5 },
  sussurro: { nome: 'Sussurro Profano', icone: '👁️', de: [2, 3, 4], alvo: 'inimigo', em: QUALQUER, poder: 0.5, stat: 'mag', elemento: 'sombra', estresse: 16 },
  bencaoSombria: { nome: 'Bênção Sombria', icone: '🕯️', de: QUALQUER, alvo: 'aliado', cura: 0.6, stat: 'mag', chanceIA: 0.35 },
  pancadaPedra: { nome: 'Pancada de Pedra', icone: '🪨', de: [1, 2], alvo: 'inimigo', em: [1, 2], poder: 1.2, stat: 'atq', elemento: 'impacto', efeito: { tipo: 'atordoado', turnos: 1, chance: 25 } },
  badalada: { nome: 'Badalada', icone: '🔔', de: QUALQUER, alvo: 'todosInimigos', poder: 0.45, stat: 'mag', elemento: 'sombra', estresse: 12 },
  maoGelida: { nome: 'Mão Gélida', icone: '❄️', de: [1, 2, 3], alvo: 'inimigo', em: [1, 2], poder: 1.3, stat: 'mag', elemento: 'gelo', efeito: { tipo: 'lento', turnos: 2, valor: 2 } },
  chamarMortos: { nome: 'Chamar os Mortos', icone: '💀', de: QUALQUER, alvo: 'eu', invocar: 'esqueleto', chanceIA: 0.6 },
};

// Classes (provisórias). "posicao" = onde ela começa na fila (1 = frente).
// Os status: vida, atq (ataque), mag (magia), def (defesa), vel (velocidade),
// esq (esquiva, em %), crit (chance de crítico, em %)
const CLASSES = {
  guardiao: {
    nome: 'Guardião',
    descricao: 'Fica na frente e segura a pancada. Protege o time e quebra escudos.',
    posicao: 1,
    vida: 40, atq: 7, mag: 2, def: 8, vel: 4, esq: 5, crit: 4,
    habilidades: ['golpeEscudo', 'martelada', 'provocar', 'muralha'],
  },
  lamina: {
    nome: 'Lâmina',
    descricao: 'Rápida e certeira. Envenena, marca alvos e acerta quem está lá atrás.',
    posicao: 2,
    vida: 28, atq: 9, mag: 2, def: 3, vel: 8, esq: 15, crit: 12,
    habilidades: ['corteRapido', 'laminaVenenosa', 'adaga', 'marcar'],
  },
  arcano: {
    nome: 'Arcano',
    descricao: 'Magia de fogo, gelo e raio. Descobre as fraquezas dos inimigos.',
    posicao: 3,
    vida: 22, atq: 2, mag: 10, def: 2, vel: 5, esq: 5, crit: 6,
    habilidades: ['bolaDeFogo', 'estilhaco', 'correnteRaios', 'analisar'],
  },
  bardo: {
    nome: 'Bardo',
    descricao: 'Cura, acalma o time e deixa os aliados mais rápidos.',
    posicao: 4,
    vida: 26, atq: 4, mag: 7, def: 3, vel: 6, esq: 10, crit: 5,
    habilidades: ['cancaoCura', 'refrao', 'notaLuz', 'ritmo'],
  },
};
const ORDEM_CLASSES = ['guardiao', 'lamina', 'arcano', 'bardo'];

// Inimigos. "quebra" = tamanho do escudo; "fraquezas" e "resiste" = elementos.
const INIMIGOS = {
  esqueleto: {
    nome: 'Esqueleto Soldado', vida: 30, atq: 9, mag: 0, def: 5, vel: 4, esq: 5, crit: 5, quebra: 5,
    fraquezas: ['impacto', 'luz'], resiste: ['corte'], habilidades: ['espadaEnferrujada', 'escudoOsso'],
  },
  arqueiro: {
    nome: 'Esqueleto Arqueiro', vida: 22, atq: 8, mag: 0, def: 3, vel: 6, esq: 10, crit: 8, quebra: 4,
    fraquezas: ['fogo', 'impacto'], resiste: [], habilidades: ['flecha', 'flechaSombria'],
  },
  morcego: {
    nome: 'Morcego da Cripta', vida: 16, atq: 6, mag: 0, def: 2, vel: 10, esq: 25, crit: 8, quebra: 3,
    fraquezas: ['raio', 'gelo'], resiste: ['sombra'], habilidades: ['mordida', 'guincho'],
  },
  cultista: {
    nome: 'Cultista Oco', vida: 26, atq: 3, mag: 10, def: 3, vel: 5, esq: 8, crit: 5, quebra: 5,
    fraquezas: ['luz', 'corte'], resiste: ['sombra'], habilidades: ['sussurro', 'bencaoSombria'],
  },
  gargula: {
    nome: 'Gárgula', vida: 42, atq: 10, mag: 0, def: 9, vel: 3, esq: 0, crit: 5, quebra: 7,
    fraquezas: ['raio', 'impacto'], resiste: ['corte', 'gelo'], habilidades: ['pancadaPedra'],
  },
  abade: {
    nome: 'Abade do Sino Rachado', chefe: true, vida: 170, atq: 10, mag: 11, def: 5, vel: 7, esq: 5, crit: 5, quebra: 12,
    fraquezas: ['fogo', 'luz'], resiste: ['sombra', 'gelo'], habilidades: ['badalada', 'maoGelida', 'chamarMortos'],
  },
};

// A dungeon: uma sala depois da outra. "ouro" = recompensa ao vencer.
const SALAS = [
  { tipo: 'batalha', nome: 'Entrada da Cripta', inimigos: ['esqueleto', 'esqueleto', 'arqueiro'], ouro: 20 },
  { tipo: 'batalha', nome: 'Corredor dos Ossos', inimigos: ['gargula', 'morcego', 'cultista'], ouro: 30 },
  { tipo: 'acampamento', nome: 'Capela Abandonada' },
  { tipo: 'batalha', nome: 'Ossuário', inimigos: ['esqueleto', 'morcego', 'arqueiro', 'cultista'], ouro: 40 },
  { tipo: 'chefe', nome: 'Torre do Sino', inimigos: ['esqueleto', 'abade', 'cultista'], ouro: 100 },
];

// O que dá pra fazer no acampamento (cada herói escolhe uma)
const ACAMPAMENTO = {
  descansar: { nome: 'Descansar', icone: '💤', descricao: 'Recupera 40% da vida (e levanta quem caiu).' },
  historias: { nome: 'Contar histórias', icone: '🔥', descricao: 'Tira 20 de estresse do time INTEIRO.' },
  afiar: { nome: 'Afiar as armas', icone: '⚔️', descricao: 'Seu herói causa 15% a mais de dano na próxima sala.' },
};

module.exports = { ELEMENTOS, EFEITOS, HABILIDADES, CLASSES, ORDEM_CLASSES, INIMIGOS, SALAS, ACAMPAMENTO };
