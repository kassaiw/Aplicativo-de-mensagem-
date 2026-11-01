'use strict';
/*
 * Motor dos jogos de "adivinhar com pistas" (estilo Anidle / Loldle / Gamedle).
 * O jogo sorteia um item secreto. A galera chuta itens da lista, e cada chute
 * mostra o que bate com o secreto (verde = igual, amarelo = perto, vermelho = diferente).
 *
 * Quem usa este motor só precisa dizer:
 *   itens      -> lista com { id, ... }
 *   sortear()  -> qual item vai ser o secreto
 *   comparar(chute, alvo) -> { coluna: { v, r, seta? } ou { lista: [...], r } }
 *   resumo(item) -> { id, titulo, sub, img } (o que aparece na tabela)
 *   dicas(alvo, quantosChutes, acabou) -> lista de dicas pra mostrar
 */
const { jogador, erro, OK } = require('./util');

function criarAdivinhacao({ itens, maximo, sortear, comparar, resumo, dicas, extra }) {
  const porId = new Map(itens.map((i) => [String(i.id), i]));
  const nova = () => ({ alvo: sortear(), chutes: [], status: 'jogando' });
  let e = nova();

  return {
    visao() {
      const acabou = e.status !== 'jogando';
      return {
        maximo,
        status: e.status,
        chutes: e.chutes.map((c) => ({ item: resumo(c.item), quem: c.quem, comparacao: c.comparacao })),
        dicas: dicas(e.alvo, e.chutes.length, acabou),
        resposta: acabou ? resumo(e.alvo) : null,
        ...(extra ? extra() : {}),
      };
    },

    acao(u, d) {
      if (d.acao === 'nova') {
        e = nova();
        return OK;
      }
      if (d.acao === 'desistir') {
        if (e.status === 'jogando') e.status = 'perdeu';
        return OK;
      }
      if (d.acao !== 'chutar') return erro('Ação desconhecida.');
      if (e.status !== 'jogando') return erro('Essa rodada já acabou.');
      const item = porId.get(String(d.id));
      if (!item) return erro('Esse não está na lista.');
      if (e.chutes.some((c) => c.item.id === item.id)) return erro('Esse já foi chutado.');
      e.chutes.unshift({ item, quem: jogador(u), comparacao: comparar(item, e.alvo) });
      if (item.id === e.alvo.id) e.status = 'ganhou';
      else if (e.chutes.length >= maximo) e.status = 'perdeu';
      return OK;
    },
  };
}

// Compara números: igual (verde), perto (amarelo) ou longe (vermelho), com setinha
function numero(chute, alvo, perto) {
  if (!chute || !alvo) return { r: chute === alvo ? 'certo' : 'errado' };
  if (chute === alvo) return { r: 'certo' };
  return { r: Math.abs(chute - alvo) <= perto ? 'perto' : 'errado', seta: alvo > chute ? 'sobe' : 'desce' };
}

// Compara listas (gêneros, posições...): todas iguais = verde, alguma igual = amarelo
function conjunto(chute, alvo, traduzir = (x) => x) {
  const a = new Set(alvo);
  const comuns = chute.filter((x) => a.has(x));
  const iguais = comuns.length === chute.length && comuns.length === alvo.length;
  return {
    lista: chute.map((x) => ({ v: traduzir(x), certo: a.has(x) })),
    r: iguais ? 'certo' : comuns.length ? 'perto' : 'errado',
  };
}

function igual(chute, alvo, texto) {
  return { v: texto ?? (chute || '?'), r: chute && chute === alvo ? 'certo' : 'errado' };
}

// Dica que só aparece depois de X chutes
function dicaTrancada(id, rotulo, tipo, valor, n, precisa, acabou, extra = {}) {
  const liberada = acabou || n >= precisa;
  return { id, rotulo, tipo, valor: liberada ? valor : null, faltam: Math.max(0, precisa - n), ...extra };
}

module.exports = { criarAdivinhacao, numero, conjunto, igual, dicaTrancada };
