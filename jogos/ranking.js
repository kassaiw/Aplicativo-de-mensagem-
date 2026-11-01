'use strict';
/*
 * RANKING DA SEÇÃO DE ANIMES (fica salvo em dados/ranking-animes.json)
 *
 * Cada pessoa é guardada pelo "cid" (o código do navegador dela), com:
 *   pontos     → soma dos pontos de todas as partidas
 *   acertos    → quantas rodadas acertou
 *   sequencia  → quantas rodadas seguidas está acertando agora
 *   melhorSeq  → a maior sequência que já fez
 *   partidas   → quantas partidas jogou (pra aba "Mais ativos")
 */
const fs = require('fs');
const path = require('path');

function criarRanking(pastaDados) {
  const arquivo = path.join(pastaDados, 'ranking-animes.json');
  let pessoas = {};
  try {
    pessoas = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  } catch {
    /* ainda não tem ranking */
  }
  let timer = null;
  const salvar = () => {
    clearTimeout(timer);
    timer = setTimeout(() => fs.writeFile(arquivo, JSON.stringify(pessoas), () => {}), 1000);
  };

  function pessoa(u) {
    const p = (pessoas[u.cid] ||= { pontos: 0, acertos: 0, sequencia: 0, melhorSeq: 0, partidas: 0 });
    // nome, cor e foto mais recentes
    p.nome = u.nome;
    p.cor = u.cor;
    p.avatar = u.avatar || '';
    return p;
  }

  function rodada(u, acertou) {
    const p = pessoa(u);
    if (acertou) {
      p.acertos++;
      p.sequencia++;
      p.melhorSeq = Math.max(p.melhorSeq, p.sequencia);
    } else p.sequencia = 0;
    salvar();
  }

  function partida(u, pontos) {
    const p = pessoa(u);
    p.partidas++;
    p.pontos += pontos;
    salvar();
  }

  function tabela(campo, limite = 20) {
    return Object.values(pessoas)
      .filter((p) => p[campo] > 0)
      .sort((a, b) => b[campo] - a[campo])
      .slice(0, limite)
      .map((p) => ({ nome: p.nome, cor: p.cor, avatar: p.avatar, valor: p[campo] }));
  }

  function ver() {
    return { pontos: tabela('pontos'), sequencia: tabela('sequencia'), melhorSeq: tabela('melhorSeq'), partidas: tabela('partidas') };
  }

  return { rodada, partida, ver };
}

module.exports = { criarRanking };
