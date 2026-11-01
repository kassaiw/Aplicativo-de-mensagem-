'use strict';
/*
 * ADIVINHE O JOGO (coop) — estilo Gamedle, com os jogos mais jogados da Steam.
 * Aparece uma imagem do jogo bem pixelada; a cada chute errado ela fica mais
 * nítida e aparece mais uma tag. A tabela mostra o que bate com o jogo secreto.
 */
const { sortear } = require('./util');
const { criarAdivinhacao, numero, conjunto } = require('./adivinhar');

const MAX_CHUTES = 10;
const PIXELS = [44, 30, 20, 13, 9, 6, 4, 3, 2, 1]; // tamanho dos "quadradões" a cada chute

function algumIgual(a, b) {
  const s = new Set(b);
  return a.some((x) => s.has(x));
}

function comparar(c, a) {
  return {
    ano: { v: c.ano || '?', ...numero(c.ano, a.ano, 2) },
    generos: conjunto(c.generos, a.generos),
    desenvolvedora: { v: c.desenvolvedoras[0] || '?', r: algumIgual(c.desenvolvedoras, a.desenvolvedoras) ? 'certo' : 'errado' },
    publicadora: { v: c.publicadoras[0] || '?', r: algumIgual(c.publicadoras, a.publicadoras) ? 'certo' : 'errado' },
    modos: conjunto(c.modos, a.modos),
    preco: { v: c.gratis ? 'Grátis' : 'Pago', r: c.gratis === a.gratis ? 'certo' : 'errado' },
    nota: { v: c.nota || '?', ...numero(c.nota, a.nota, 5) },
  };
}

const resumo = (j) => ({ id: j.id, titulo: j.nome, sub: '', img: j.capa });

module.exports = {
  titulo: 'Adivinhe o Jogo',

  async criar({ steam }) {
    const { jogos } = await steam.garantir();
    let tela = '';
    return criarAdivinhacao({
      itens: jogos,
      maximo: MAX_CHUTES,
      sortear: () => {
        const alvo = sortear(jogos);
        tela = sortear(alvo.telas.slice(0, 5)); // uma imagem do jogo (sem o logo)
        return alvo;
      },
      comparar,
      resumo,
      dicas: (alvo, n, acabou) => [
        { id: 'tela', rotulo: '🖼️ Imagem do jogo', tipo: 'pixel', valor: tela, pixel: acabou ? 1 : PIXELS[Math.min(n, PIXELS.length - 1)] },
        { id: 'tags', rotulo: '🏷️ Tags da Steam', tipo: 'chips', valor: acabou ? alvo.tags : alvo.tags.slice(0, 2 + n), faltam: 0 },
      ],
    });
  },

  async listaParaBusca({ steam }) {
    const { jogos } = await steam.garantir();
    return jogos.map((j) => ({ id: j.id, t: j.nome, img: j.capa }));
  },
};
