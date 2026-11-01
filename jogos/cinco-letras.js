'use strict';
/*
 * CINCO LETRAS (coop) — estilo Termo/Wordle, mas todo mundo joga junto.
 * Qualquer um pode chutar; o tabuleiro é o mesmo pra todos.
 * Modos: 1 palavra (6 chances), 2 palavras (7) ou 4 palavras (9).
 */
const { normalizar, embaralhar, jogador, erro, OK } = require('./util');

const CHANCES = { 1: 6, 2: 7, 4: 9 };

// Compara o chute com a resposta, letra por letra:
// 'certo' = letra no lugar certo, 'lugar' = existe em outro lugar, 'errado' = não existe
function avaliar(chute, resposta) {
  const resultado = Array(5).fill('errado');
  const sobrando = {};
  for (let i = 0; i < 5; i++) {
    if (chute[i] === resposta[i]) resultado[i] = 'certo';
    else sobrando[resposta[i]] = (sobrando[resposta[i]] || 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (resultado[i] === 'certo') continue;
    if (sobrando[chute[i]] > 0) {
      resultado[i] = 'lugar';
      sobrando[chute[i]]--;
    }
  }
  return resultado;
}

module.exports = {
  titulo: 'Cinco Letras',

  async criar({ opcoes, palavras }) {
    // Tenta baixar o dicionário (no máximo 8 segundos de espera)
    await Promise.race([palavras.baixarDicionario(), new Promise((ok) => setTimeout(ok, 8000))]);

    function novaRodada(quantidade) {
      const qtd = [1, 2, 4].includes(Number(quantidade)) ? Number(quantidade) : 1;
      return {
        qtd,
        chances: CHANCES[qtd],
        respostas: embaralhar(palavras.respostas()).slice(0, qtd),
        chutes: [],
        resolvidas: Array(qtd).fill(-1), // em qual chute cada palavra foi acertada
        status: 'jogando',
      };
    }

    let e = novaRodada(opcoes.quantidade);

    return {
      visao() {
        return {
          quantidade: e.qtd,
          chances: e.chances,
          status: e.status,
          resolvidas: e.resolvidas,
          chutes: e.chutes.map((c) => ({ palavra: c.exibir, quem: c.quem, avaliacao: c.avaliacao })),
          respostas: e.status === 'jogando' ? null : e.respostas.map((r) => r.exibir),
        };
      },

      acao(u, d) {
        if (d.acao === 'nova') {
          e = novaRodada(d.quantidade || e.qtd);
          return OK;
        }
        if (d.acao !== 'chutar') return erro('Ação desconhecida.');
        if (e.status !== 'jogando') return erro('Essa rodada já acabou.');

        const norm = normalizar(d.palavra).replace(/[^A-Z]/g, '');
        if (norm.length !== 5) return erro('A palavra precisa ter 5 letras.');
        if (!palavras.valida(norm)) return erro('Essa palavra não está no dicionário.');
        if (e.chutes.some((c) => c.norm === norm)) return erro('Essa palavra já foi chutada.');

        const indice = e.chutes.length;
        const avaliacao = e.respostas.map((r, i) => (e.resolvidas[i] >= 0 ? null : avaliar(norm, r.norm)));
        let exibir = palavras.exibir(norm);
        e.respostas.forEach((r, i) => {
          if (e.resolvidas[i] < 0 && r.norm === norm) {
            e.resolvidas[i] = indice;
            exibir = r.exibir; // mostra com o acento da resposta
          }
        });
        e.chutes.push({ norm, exibir, quem: jogador(u), avaliacao });

        if (e.resolvidas.every((x) => x >= 0)) e.status = 'ganhou';
        else if (e.chutes.length >= e.chances) e.status = 'perdeu';
        return OK;
      },
    };
  },
};
