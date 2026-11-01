'use strict';
/*
 * DRAFT DE ANIME — monte o time mais forte.
 * São 6 rodadas. Em cada rodada cada jogador recebe um personagem aleatório
 * e escolhe a posição dele (Capitão, Vice, Tanque...). Cada posição valoriza
 * status diferentes, então pense onde ele rende mais! Não dá pra trocar depois.
 * Cada um pode "pular" 2 personagens por partida.
 *
 * No final:
 *  - até 2 jogadores: ganha quem tem o time com mais PODER (soma dos pontos)
 *  - 3 ou mais: votação do melhor time (empate = ganha quem tem mais poder)
 */
const { embaralhar, jogador, erro, OK } = require('./util');
const { pegarPersonagens, resultado, precisaVotacao, visaoDoTime } = require('./times');
const { TODAS_POSICOES, STATUS, POSICOES } = require('./status');

const PULOS = 2;

module.exports = {
  titulo: 'Draft de Anime',

  async criar({ opcoes, anilist, criador, estaOnline }) {
    const fonte = await pegarPersonagens(opcoes, anilist);
    const posicoes = TODAS_POSICOES;
    const jogadores = new Map();
    let monte = [];
    let e = { fase: 'lobby', rodada: 0, resultado: null };

    function entrar(u) {
      if (!jogadores.has(u.cid)) {
        jogadores.set(u.cid, { ...jogador(u), time: Array(posicoes.length).fill(null), rolagem: null, pulos: PULOS, voto: null });
      }
    }
    entrar(criador);

    const tirarDoMonte = () => monte.pop() || null;
    const lista = () => [...jogadores.values()];

    function darPersonagens() {
      for (const j of jogadores.values()) j.rolagem = tirarDoMonte();
    }

    // Quem saiu do servidor no meio: o personagem dele vai pra primeira vaga livre
    function colocarAutomatico(j) {
      if (!j.rolagem) return;
      const vaga = j.time.indexOf(null);
      if (vaga >= 0) j.time[vaga] = j.rolagem;
      j.rolagem = null;
    }

    function finalizar() {
      if (precisaVotacao(lista())) {
        e.fase = 'votacao';
      } else {
        e.resultado = resultado(lista(), posicoes, false);
        e.fase = 'fim';
      }
    }

    function verificarRodada() {
      if (e.fase === 'draft') {
        for (const j of jogadores.values()) if (!estaOnline(j.cid)) colocarAutomatico(j);
        if (lista().some((j) => j.rolagem)) return;
        if (e.rodada >= posicoes.length) return finalizar();
        e.rodada++;
        darPersonagens();
      }
      if (e.fase === 'votacao') {
        const votantes = lista().filter((j) => estaOnline(j.cid));
        if (votantes.every((j) => j.voto)) {
          e.resultado = resultado(lista(), posicoes, true);
          e.fase = 'fim';
        }
      }
    }

    return {
      visao(u) {
        const eu = jogadores.get(u.cid);
        const fim = e.fase === 'fim';
        return {
          fase: e.fase,
          fonte: fonte.titulo,
          posicoes,
          pesos: POSICOES,
          statusInfo: STATUS,
          rodada: e.rodada,
          votacao: precisaVotacao(lista()),
          jogadores: lista().map((j) => ({
            cid: j.cid,
            nome: j.nome,
            cor: j.cor,
            avatar: j.avatar,
            ...visaoDoTime(j, posicoes),
            escolhendo: !!j.rolagem,
            votou: !!j.voto,
            votos: fim && e.resultado?.porVoto ? e.resultado.votos[j.cid] || 0 : null,
            venceu: fim ? !!e.resultado?.vencedores.includes(j.cid) : false,
          })),
          eu: eu ? { rolagem: eu.rolagem, pulos: eu.pulos, voto: eu.voto } : null,
        };
      },

      acao(u, d) {
        const eu = jogadores.get(u.cid);
        switch (d.acao) {
          case 'entrar':
            if (e.fase !== 'lobby') return erro('A partida já começou. Espere a próxima!');
            entrar(u);
            return OK;
          case 'sair':
            if (e.fase !== 'lobby') return erro('Não dá pra sair no meio.');
            jogadores.delete(u.cid);
            return OK;
          case 'comecar': {
            if (e.fase !== 'lobby') return erro('A partida já começou.');
            if (!jogadores.size) return erro('Ninguém entrou.');
            const precisa = jogadores.size * (posicoes.length + PULOS);
            if (fonte.lista.length < precisa) {
              return erro(`Esse anime só tem ${fonte.lista.length} personagens; dá pra no máximo ${Math.floor(fonte.lista.length / (posicoes.length + PULOS))} jogadores.`);
            }
            monte = embaralhar(fonte.lista);
            for (const j of jogadores.values()) {
              j.time = Array(posicoes.length).fill(null);
              j.pulos = PULOS;
              j.voto = null;
            }
            e = { fase: 'draft', rodada: 1, resultado: null };
            darPersonagens();
            return OK;
          }
          case 'escolher': {
            if (e.fase !== 'draft' || !eu?.rolagem) return erro('Agora não é hora de escolher.');
            const p = Number(d.posicao);
            if (!(p >= 0 && p < posicoes.length) || eu.time[p]) return erro('Essa posição já está ocupada.');
            eu.time[p] = eu.rolagem;
            eu.rolagem = null;
            verificarRodada();
            return OK;
          }
          case 'pular': {
            if (e.fase !== 'draft' || !eu?.rolagem) return erro('Agora não dá pra pular.');
            if (eu.pulos <= 0) return erro('Você já usou todos os pulos.');
            const novo = tirarDoMonte();
            if (!novo) return erro('Acabaram os personagens!');
            eu.rolagem = novo;
            eu.pulos--;
            return OK;
          }
          case 'votar': {
            if (e.fase !== 'votacao' || !eu) return erro('Agora não é hora de votar.');
            if (d.cid === u.cid) return erro('Não vale votar em você mesmo 😅');
            if (!jogadores.has(d.cid)) return erro('Jogador inválido.');
            eu.voto = d.cid;
            verificarRodada();
            return OK;
          }
          case 'lobby':
            e = { fase: 'lobby', rodada: 0, resultado: null };
            for (const j of jogadores.values()) {
              j.rolagem = null;
              j.voto = null;
            }
            return OK;
          default:
            return erro('Ação desconhecida.');
        }
      },

      saiu() {
        verificarRodada();
      },
    };
  },
};
