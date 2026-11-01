'use strict';
/*
 * LEILÃO DE PERSONAGENS — compre o time mais forte!
 * Cada jogador começa com moedas e tem algumas POSIÇÕES pra preencher
 * (Capitão, Tanque...). Os personagens aparecem um de cada vez com os status
 * deles e a galera dá lances. Quem der o maior lance leva.
 *
 * O personagem comprado entra sozinho na posição onde ele rende mais, mas
 * você pode trocar as posições do seu time a qualquer momento.
 * Quando acaba, todo mundo tem um tempinho pra organizar o time.
 *
 * No final:
 *  - até 2 jogadores: ganha quem tem mais PODER (soma dos pontos)
 *  - 3 ou mais: votação (empate = ganha quem tem mais poder)
 *
 * Regra pra ninguém ficar sem time: você sempre precisa guardar pelo menos
 * 1 moeda pra cada vaga que ainda falta preencher.
 */
const { embaralhar, jogador, erro, OK } = require('./util');
const { pegarPersonagens, resultado, precisaVotacao, visaoDoTime } = require('./times');
const { STATUS, POSICOES, melhorVaga } = require('./status');

const TEMPO_INICIAL = 15_000; // tempo pra cada personagem
const TEMPO_APOS_LANCE = 8_000; // cada lance garante pelo menos isso
const PAUSA = 3_500; // mostra "vendido!" antes do próximo
const TEMPO_ORGANIZAR = 45_000; // tempo pra arrumar o time no final

// Quais posições o time tem, conforme o tamanho escolhido
const FORMACOES = {
  3: ['Capitão', 'Tanque', 'Coringa'],
  4: ['Capitão', 'Tanque', 'Suporte', 'Coringa'],
  5: ['Capitão', 'Vice-capitão', 'Tanque', 'Suporte', 'Curandeiro'],
  6: ['Capitão', 'Vice-capitão', 'Tanque', 'Suporte', 'Curandeiro', 'Coringa'],
};

module.exports = {
  titulo: 'Leilão de Personagens',

  async criar({ opcoes, anilist, criador, estaOnline, mudou }) {
    const fonte = await pegarPersonagens(opcoes, anilist);
    const moedasIniciais = Math.min(1000, Math.max(10, Math.round(Number(opcoes.moedas) || 100)));
    const posicoes = FORMACOES[Math.round(Number(opcoes.tamanho))] || FORMACOES[5];

    const jogadores = new Map();
    let monte = [];
    let timer = null;
    let e = { fase: 'lobby', lote: null, ultimo: null, resultado: null, numero: 0, prazo: 0 };

    function entrar(u) {
      if (!jogadores.has(u.cid)) {
        jogadores.set(u.cid, { ...jogador(u), moedas: moedasIniciais, time: Array(posicoes.length).fill(null), voto: null, pronto: false });
      }
    }
    entrar(criador);

    const lista = () => [...jogadores.values()];
    const vagas = (j) => j.time.filter((p) => !p).length;
    const lanceMaximo = (j) => j.moedas - (vagas(j) - 1);
    const podeDisputar = (j) => vagas(j) > 0 && estaOnline(j.cid);

    function agendar(ms, funcao) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        funcao();
        mudou();
      }, ms);
    }

    function proximoLote() {
      const personagem = monte.pop();
      if (!personagem || !lista().some(podeDisputar)) return irPraOrganizar();
      e.numero++;
      e.lote = { personagem, lance: null, prazo: Date.now() + TEMPO_INICIAL, passaram: [] };
      agendar(TEMPO_INICIAL, fecharLote);
    }

    function fecharLote() {
      const lote = e.lote;
      if (!lote) return;
      e.lote = null;
      if (lote.lance) {
        const vencedor = jogadores.get(lote.lance.cid);
        vencedor.moedas -= lote.lance.valor;
        const vaga = melhorVaga(vencedor.time, posicoes, lote.personagem);
        if (vaga >= 0) vencedor.time[vaga] = lote.personagem;
        e.ultimo = { personagem: lote.personagem, nome: vencedor.nome, valor: lote.lance.valor, posicao: posicoes[vaga] };
      } else {
        e.ultimo = { personagem: lote.personagem, nome: null, valor: 0 };
      }
      agendar(PAUSA, proximoLote);
    }

    function irPraOrganizar() {
      clearTimeout(timer);
      e.lote = null;
      e.fase = 'organizar';
      e.prazo = Date.now() + TEMPO_ORGANIZAR;
      for (const j of jogadores.values()) j.pronto = false;
      agendar(TEMPO_ORGANIZAR, finalizar);
    }

    function finalizar() {
      clearTimeout(timer);
      if (precisaVotacao(lista())) {
        e.fase = 'votacao';
      } else {
        e.resultado = resultado(lista(), posicoes, false);
        e.fase = 'fim';
      }
    }

    function verificarProntos() {
      if (e.fase !== 'organizar') return;
      if (lista().filter((j) => estaOnline(j.cid)).every((j) => j.pronto)) finalizar();
    }

    function verificarVotacao() {
      if (e.fase !== 'votacao') return;
      if (lista().filter((j) => estaOnline(j.cid)).every((j) => j.voto)) {
        e.resultado = resultado(lista(), posicoes, true);
        e.fase = 'fim';
      }
    }

    // Se todo mundo que pode disputar passou, encerra o lote na hora
    function verificarPassaram() {
      const lote = e.lote;
      if (!lote) return;
      const faltam = lista().filter((j) => podeDisputar(j) && j.cid !== lote.lance?.cid && !lote.passaram.includes(j.cid));
      if (!faltam.length) fecharLote();
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
          moedasIniciais,
          numero: e.numero,
          prazo: e.prazo,
          votacao: precisaVotacao(lista()),
          lote: e.lote
            ? {
                personagem: e.lote.personagem,
                lance: e.lote.lance ? { valor: e.lote.lance.valor, nome: jogadores.get(e.lote.lance.cid)?.nome, cid: e.lote.lance.cid } : null,
                prazo: e.lote.prazo,
                passaram: e.lote.passaram,
              }
            : null,
          ultimo: e.ultimo,
          jogadores: lista().map((j) => ({
            cid: j.cid,
            nome: j.nome,
            cor: j.cor,
            avatar: j.avatar,
            moedas: j.moedas,
            ...visaoDoTime(j, posicoes),
            pronto: j.pronto,
            votou: !!j.voto,
            votos: fim && e.resultado?.porVoto ? e.resultado.votos[j.cid] || 0 : null,
            venceu: fim ? !!e.resultado?.vencedores.includes(j.cid) : false,
          })),
          eu: eu ? { moedas: eu.moedas, vagas: vagas(eu), maximo: Math.max(0, lanceMaximo(eu)), voto: eu.voto, pronto: eu.pronto } : null,
        };
      },

      acao(u, d) {
        const eu = jogadores.get(u.cid);
        switch (d.acao) {
          case 'entrar':
            if (e.fase !== 'lobby') return erro('O leilão já começou. Espere o próximo!');
            entrar(u);
            return OK;
          case 'sair':
            if (e.fase !== 'lobby') return erro('Não dá pra sair no meio.');
            jogadores.delete(u.cid);
            return OK;
          case 'comecar':
            if (e.fase !== 'lobby') return erro('O leilão já começou.');
            if (!jogadores.size) return erro('Ninguém entrou.');
            if (fonte.lista.length < jogadores.size * posicoes.length) return erro('Personagens de menos pra tanta gente. Diminua o time ou troque o anime.');
            monte = embaralhar(fonte.lista);
            for (const j of jogadores.values()) {
              j.moedas = moedasIniciais;
              j.time = Array(posicoes.length).fill(null);
              j.voto = null;
              j.pronto = false;
            }
            e = { fase: 'leilao', lote: null, ultimo: null, resultado: null, numero: 0, prazo: 0 };
            proximoLote();
            return OK;
          case 'lance': {
            const lote = e.lote;
            if (e.fase !== 'leilao' || !lote) return erro('Espere o próximo personagem.');
            if (!eu) return erro('Você não está nesse leilão.');
            if (vagas(eu) <= 0) return erro('Seu time já está completo!');
            if (lote.lance?.cid === u.cid) return erro('O maior lance já é seu.');
            const valor = Math.round(Number(d.valor));
            const minimo = (lote.lance?.valor || 0) + 1;
            if (!(valor >= minimo)) return erro(`O lance mínimo agora é ${minimo}.`);
            if (valor > lanceMaximo(eu)) {
              return erro(`Você só pode dar até ${lanceMaximo(eu)} (precisa guardar 1 moeda por vaga que falta).`);
            }
            lote.lance = { valor, cid: u.cid };
            lote.passaram = lote.passaram.filter((c) => c !== u.cid);
            lote.prazo = Math.max(lote.prazo, Date.now() + TEMPO_APOS_LANCE);
            agendar(lote.prazo - Date.now(), fecharLote);
            verificarPassaram();
            return OK;
          }
          case 'passar': {
            const lote = e.lote;
            if (e.fase !== 'leilao' || !lote || !eu) return erro('Agora não dá.');
            if (!lote.passaram.includes(u.cid)) lote.passaram.push(u.cid);
            verificarPassaram();
            return OK;
          }
          case 'trocar': {
            // Troca duas posições do seu time (pode trocar com uma vaga vazia também)
            if (!eu || (e.fase !== 'leilao' && e.fase !== 'organizar')) return erro('Agora não dá pra mexer no time.');
            const a = Number(d.de);
            const b = Number(d.para);
            if (!(a >= 0 && a < posicoes.length && b >= 0 && b < posicoes.length) || a === b) return erro('Posição inválida.');
            [eu.time[a], eu.time[b]] = [eu.time[b], eu.time[a]];
            eu.pronto = false;
            return OK;
          }
          case 'pronto':
            if (e.fase !== 'organizar' || !eu) return erro('Agora não.');
            eu.pronto = true;
            verificarProntos();
            return OK;
          case 'votar': {
            if (e.fase !== 'votacao' || !eu) return erro('Agora não é hora de votar.');
            if (d.cid === u.cid) return erro('Não vale votar em você mesmo 😅');
            if (!jogadores.has(d.cid)) return erro('Jogador inválido.');
            eu.voto = d.cid;
            verificarVotacao();
            return OK;
          }
          case 'lobby':
            clearTimeout(timer);
            e = { fase: 'lobby', lote: null, ultimo: null, resultado: null, numero: 0, prazo: 0 };
            for (const j of jogadores.values()) {
              j.voto = null;
              j.pronto = false;
            }
            return OK;
          default:
            return erro('Ação desconhecida.');
        }
      },

      saiu() {
        verificarPassaram();
        verificarProntos();
        verificarVotacao();
      },

      destruir() {
        clearTimeout(timer);
      },
    };
  },
};
