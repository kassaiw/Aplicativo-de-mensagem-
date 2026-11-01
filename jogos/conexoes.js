'use strict';
/*
 * CONEXÕES (coop) — estilo Conexo.
 * São 16 palavras escondendo 4 grupos de 4. A galera seleciona 4 palavras
 * que acha que têm algo em comum e envia. Acertou: o grupo aparece colorido.
 * Errou: perde uma vida (são 4). Se 3 das 4 estiverem certas, avisa "falta uma!".
 * Qualquer um pode enviar; o tabuleiro é o mesmo pra todo mundo.
 */
const { normalizar, embaralhar, jogador, erro, OK } = require('./util');
const GRUPOS = require('./grupos-conexoes');

const VIDAS = 4;

function montarTabuleiro() {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const escolhidos = [];
    const usadas = new Set();
    let deuCerto = true;
    for (const nivel of [1, 2, 3, 4]) {
      const opcoes = embaralhar(GRUPOS.filter((g) => g.nivel === nivel));
      let achou = null;
      for (const g of opcoes) {
        const livres = g.palavras.filter((p) => !usadas.has(normalizar(p)));
        if (livres.length >= 4) {
          achou = { nivel, nome: g.nome, palavras: embaralhar(livres).slice(0, 4) };
          break;
        }
      }
      if (!achou) {
        deuCerto = false;
        break;
      }
      achou.palavras.forEach((p) => usadas.add(normalizar(p)));
      escolhidos.push(achou);
    }
    if (deuCerto) return escolhidos;
  }
  throw new Error('Não consegui montar o tabuleiro.');
}

module.exports = {
  titulo: 'Conexões',

  async criar() {
    const nova = () => {
      const grupos = montarTabuleiro();
      return {
        grupos,
        palavras: embaralhar(grupos.flatMap((g) => g.palavras)),
        resolvidos: [], // índices dos grupos já descobertos, na ordem
        vidas: VIDAS,
        tentativas: [],
        status: 'jogando',
      };
    };
    let e = nova();

    return {
      visao() {
        const acabou = e.status !== 'jogando';
        const mostrar = acabou ? [...e.resolvidos, ...[0, 1, 2, 3].filter((i) => !e.resolvidos.includes(i))] : e.resolvidos;
        const resolvidas = new Set(e.resolvidos.flatMap((i) => e.grupos[i].palavras));
        return {
          status: e.status,
          vidas: e.vidas,
          maxVidas: VIDAS,
          grupos: mostrar.map((i) => ({ ...e.grupos[i], achado: e.resolvidos.includes(i) })),
          palavras: e.palavras.filter((p) => !resolvidas.has(p)),
          tentativas: e.tentativas.slice(0, 12),
        };
      },

      acao(u, d) {
        if (d.acao === 'nova') {
          e = nova();
          return OK;
        }
        if (d.acao !== 'enviar') return erro('Ação desconhecida.');
        if (e.status !== 'jogando') return erro('Essa rodada já acabou.');
        const escolha = [...new Set(Array.isArray(d.palavras) ? d.palavras.map(String) : [])];
        if (escolha.length !== 4) return erro('Escolha exatamente 4 palavras.');
        const resolvidas = new Set(e.resolvidos.flatMap((i) => e.grupos[i].palavras));
        if (escolha.some((p) => !e.palavras.includes(p) || resolvidas.has(p))) return erro('Alguma palavra não está mais no tabuleiro.');
        const chave = [...escolha].sort().join('|');
        if (e.tentativas.some((t) => t.chave === chave)) return erro('Vocês já tentaram exatamente essas 4!');

        const acertos = e.grupos.map((g) => g.palavras.filter((p) => escolha.includes(p)).length);
        const certo = acertos.findIndex((n) => n === 4);
        let resultado;
        if (certo >= 0) {
          e.resolvidos.push(certo);
          resultado = 'certo';
        } else {
          e.vidas--;
          resultado = acertos.some((n, i) => n === 3 && !e.resolvidos.includes(i)) ? 'quase' : 'errado';
        }
        e.tentativas.unshift({ chave, palavras: escolha, quem: jogador(u), resultado, nivel: certo >= 0 ? e.grupos[certo].nivel : 0 });
        if (e.resolvidos.length === 4) e.status = 'ganhou';
        else if (e.vidas <= 0) e.status = 'perdeu';
        return OK;
      },
    };
  },
};
