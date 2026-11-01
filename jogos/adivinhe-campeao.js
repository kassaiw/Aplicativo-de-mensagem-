'use strict';
/*
 * ADIVINHE O CAMPEÃO (coop) — estilo Loldle, com os campeões do League of Legends.
 * Chute campeões e veja o que bate com o secreto: posição, classes,
 * recurso, alcance, região, ano de lançamento e dificuldade.
 */
const { sortear } = require('./util');
const { criarAdivinhacao, numero, conjunto, igual, dicaTrancada } = require('./adivinhar');

const MAX_CHUTES = 20;

const POSICOES = { TOP: 'Topo', JUNGLE: 'Selva', MIDDLE: 'Meio', BOTTOM: 'Atirador', SUPPORT: 'Suporte' };
const CLASSES = {
  ARTILLERY: 'Artilharia',
  ASSASSIN: 'Assassino',
  BATTLEMAGE: 'Mago de batalha',
  BURST: 'Explosivo',
  CATCHER: 'Capturador',
  DIVER: 'Mergulhador',
  ENCHANTER: 'Encantador',
  FIGHTER: 'Lutador',
  JUGGERNAUT: 'Colosso',
  MAGE: 'Mago',
  MARKSMAN: 'Atirador',
  SKIRMISHER: 'Escaramuçador',
  SPECIALIST: 'Especialista',
  SUPPORT: 'Suporte',
  TANK: 'Tanque',
  VANGUARD: 'Vanguarda',
  WARDEN: 'Guardião',
};
const RECURSOS = {
  MANA: 'Mana',
  ENERGY: 'Energia',
  NONE: 'Nenhum',
  HEALTH: 'Vida',
  BLOOD_WELL: 'Poço de Sangue',
  RAGE: 'Fúria',
  FURY: 'Fúria',
  HEAT: 'Calor',
  FEROCITY: 'Ferocidade',
  COURAGE: 'Coragem',
  CRIMSON_RUSH: 'Ímpeto Carmesim',
  FLOW: 'Fluxo',
  FRENZY: 'Frenesi',
  GRIT: 'Garra',
  SHIELD: 'Escudo',
};
const ALCANCES = { MELEE: 'Corpo a corpo', RANGED: 'À distância' };
const REGIOES = {
  'bandle-city': 'Bandópolis',
  bilgewater: 'Águas de Sentina',
  demacia: 'Demacia',
  freljord: 'Freljord',
  ionia: 'Ionia',
  ixtal: 'Ixtal',
  'mount-targon': 'Targon',
  noxus: 'Noxus',
  piltover: 'Piltover',
  'shadow-isles': 'Ilhas das Sombras',
  shurima: 'Shurima',
  unaffiliated: 'Runeterra',
  void: 'Vazio',
  zaun: 'Zaun',
};
const DIFICULDADES = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };
const t = (mapa, v) => mapa[v] || (v ? String(v).replace(/_/g, ' ').toLowerCase() : '?');

function comparar(c, a) {
  const recursoIgual = t(RECURSOS, c.recurso) === t(RECURSOS, a.recurso);
  return {
    posicoes: conjunto(c.posicoes, a.posicoes, (x) => t(POSICOES, x)),
    classes: conjunto(c.classes, a.classes, (x) => t(CLASSES, x)),
    recurso: { v: t(RECURSOS, c.recurso), r: recursoIgual ? 'certo' : 'errado' },
    alcance: igual(c.alcance, a.alcance, t(ALCANCES, c.alcance)),
    regiao: igual(c.regiao, a.regiao, t(REGIOES, c.regiao)),
    ano: { v: c.ano || '?', ...numero(c.ano, a.ano, 1) },
    dificuldade: { v: t(DIFICULDADES, c.dificuldade), ...numero(c.dificuldade, a.dificuldade, 0) },
  };
}

const resumo = (c) => ({ id: c.id, titulo: c.nome, sub: '', img: c.icone });

module.exports = {
  titulo: 'Adivinhe o Campeão',

  async criar({ campeoes }) {
    const { campeoes: lista } = await campeoes.garantir();
    return criarAdivinhacao({
      itens: lista,
      maximo: MAX_CHUTES,
      sortear: () => sortear(lista),
      comparar,
      resumo,
      dicas: (alvo, n, acabou) => [
        dicaTrancada('titulo', '📜 Título', 'texto', alvo.titulo, n, 5, acabou),
        dicaTrancada('splash', '🖼️ Arte', 'imagem', alvo.splash, n, 9, acabou, { borrar: !acabou, larga: true }),
      ],
    });
  },

  async listaParaBusca({ campeoes }) {
    const { campeoes: lista } = await campeoes.garantir();
    return lista.map((c) => ({ id: c.id, t: c.nome, s: [c.id], img: c.icone }));
  },
};
