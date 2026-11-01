'use strict';
/*
 * PALAVRAS SECRETAS — jogo de espiões em dois times (Vermelho x Azul).
 *
 * Tem 25 cartas com palavras. Cada time tem um MESTRE, que é o único que
 * sabe a cor de cada carta. Na vez do time, o mestre dá UMA palavra de dica
 * e um número (quantas cartas têm a ver com a dica). Os agentes do time
 * clicam nas cartas que acham que são da cor deles.
 *  - Carta do seu time: continua chutando (até número + 1 vezes)
 *  - Carta neutra ou do outro time: a vez passa
 *  - Assassino: seu time perde na hora!
 * Ganha quem revelar todas as cartas da sua cor primeiro.
 */
const { normalizar, embaralhar, sortear, jogador, erro, OK } = require('./util');

const TIMES = ['vermelho', 'azul'];
const NOME_TIME = { vermelho: 'Vermelho', azul: 'Azul' };
const outro = (time) => (time === 'vermelho' ? 'azul' : 'vermelho');

module.exports = {
  titulo: 'Palavras Secretas',

  async criar({ palavras, criador }) {
    const jogadores = new Map(); // cid -> { cid, nome, cor, avatar, time, mestre }
    let e = { fase: 'lobby' };

    function entrar(u, time) {
      const atual = jogadores.get(u.cid);
      if (!time) {
        if (atual) return;
        const contar = (t) => [...jogadores.values()].filter((j) => j.time === t).length;
        time = contar('vermelho') <= contar('azul') ? 'vermelho' : 'azul';
      }
      jogadores.set(u.cid, { ...jogador(u), time, mestre: atual && atual.time === time ? atual.mestre : false });
    }
    entrar(criador);

    function novaPartida() {
      const comeca = sortear(TIMES);
      const cores = embaralhar([
        ...Array(9).fill(comeca),
        ...Array(8).fill(outro(comeca)),
        ...Array(7).fill('neutra'),
        'assassino',
      ]);
      const sorteadas = embaralhar(palavras.secretas()).slice(0, 25);
      e = {
        fase: 'jogando',
        cartas: sorteadas.map((palavra, i) => ({ palavra, cor: cores[i], revelada: false, quem: '' })),
        vez: comeca,
        etapa: 'dica', // 'dica' (mestre pensando) ou 'chute' (agentes clicando)
        dica: null,
        chutesRestantes: 0,
        historico: [],
        marcas: {}, // indice da carta -> [cid, ...] (quem está "apontando" pra ela)
        vencedor: null,
        motivo: '',
      };
    }

    function restantes(time) {
      return e.cartas.filter((c) => c.cor === time && !c.revelada).length;
    }

    function passarVez() {
      e.vez = outro(e.vez);
      e.etapa = 'dica';
      e.dica = null;
      e.chutesRestantes = 0;
      e.marcas = {};
    }

    function terminar(vencedor, motivo) {
      e.fase = 'fim';
      e.vencedor = vencedor;
      e.motivo = motivo;
    }

    return {
      visao(u) {
        const eu = jogadores.get(u.cid) || null;
        const veTudo = e.fase === 'fim' || (eu?.mestre && e.fase === 'jogando');
        return {
          fase: e.fase,
          jogadores: [...jogadores.values()],
          eu: eu ? { time: eu.time, mestre: eu.mestre } : null,
          cartas: e.cartas
            ? e.cartas.map((c, i) => ({
                palavra: c.palavra,
                revelada: c.revelada,
                quem: c.quem,
                cor: c.revelada || veTudo ? c.cor : null,
                marcas: (e.marcas[i] || []).map((cid) => jogadores.get(cid)).filter(Boolean),
              }))
            : null,
          vez: e.vez,
          etapa: e.etapa,
          dica: e.dica,
          chutesRestantes: e.chutesRestantes,
          historico: e.historico,
          vencedor: e.vencedor,
          motivo: e.motivo,
          restantes: e.cartas ? { vermelho: restantes('vermelho'), azul: restantes('azul') } : null,
        };
      },

      acao(u, d) {
        const eu = jogadores.get(u.cid);
        switch (d.acao) {
          case 'time': {
            if (!TIMES.includes(d.time)) return erro('Time inválido.');
            if (e.fase === 'jogando' && eu?.mestre) return erro('O mestre não pode trocar de time no meio da partida.');
            entrar(u, d.time);
            return OK;
          }
          case 'mestre': {
            if (e.fase !== 'lobby') return erro('Só dá pra escolher o mestre antes de começar.');
            if (!eu) return erro('Entre num time primeiro.');
            if (eu.mestre) {
              eu.mestre = false;
              return OK;
            }
            const outroMestre = [...jogadores.values()].find((j) => j.time === eu.time && j.mestre);
            if (outroMestre) return erro(`${outroMestre.nome} já é o mestre do ${NOME_TIME[eu.time]}.`);
            eu.mestre = true;
            return OK;
          }
          case 'comecar': {
            if (e.fase === 'jogando') return erro('A partida já começou.');
            for (const time of TIMES) {
              const doTime = [...jogadores.values()].filter((j) => j.time === time);
              if (!doTime.some((j) => j.mestre)) return erro(`O time ${NOME_TIME[time]} precisa de um mestre.`);
              if (!doTime.some((j) => !j.mestre)) return erro(`O time ${NOME_TIME[time]} precisa de pelo menos um agente.`);
            }
            novaPartida();
            return OK;
          }
          case 'lobby': {
            e = { fase: 'lobby' };
            return OK;
          }
          case 'dica': {
            if (e.fase !== 'jogando') return erro('A partida não está rolando.');
            if (!eu?.mestre || eu.time !== e.vez) return erro('Só o mestre do time da vez dá a dica.');
            if (e.etapa !== 'dica') return erro('A dica já foi dada.');
            const palavra = String(d.palavra || '').trim().toUpperCase().slice(0, 30);
            if (!palavra || /\s/.test(palavra)) return erro('A dica tem que ser UMA palavra.');
            const norm = normalizar(palavra);
            if (e.cartas.some((c) => !c.revelada && normalizar(c.palavra) === norm)) {
              return erro('Não vale usar uma palavra que está na mesa!');
            }
            const numero = Math.round(Number(d.numero));
            if (!(numero >= 0 && numero <= 9)) return erro('O número vai de 0 a 9.');
            e.dica = { palavra, numero, time: e.vez };
            e.historico.unshift({ ...e.dica, mestre: u.nome });
            e.etapa = 'chute';
            e.chutesRestantes = numero === 0 ? 99 : numero + 1; // 0 = sem limite
            return OK;
          }
          case 'marcar': {
            if (e.fase !== 'jogando' || e.etapa !== 'chute') return erro('Espere a dica do mestre.');
            if (!eu || eu.mestre || eu.time !== e.vez) return erro('Não é a vez do seu time.');
            const i = Number(d.indice);
            if (!e.cartas[i] || e.cartas[i].revelada) return erro('Carta inválida.');
            const lista = e.marcas[i] || [];
            e.marcas[i] = lista.includes(u.cid) ? lista.filter((c) => c !== u.cid) : [...lista, u.cid];
            return OK;
          }
          case 'revelar': {
            if (e.fase !== 'jogando' || e.etapa !== 'chute') return erro('Espere a dica do mestre.');
            if (!eu || eu.mestre || eu.time !== e.vez) return erro('Só os agentes do time da vez revelam cartas.');
            const i = Number(d.indice);
            const carta = e.cartas[i];
            if (!carta || carta.revelada) return erro('Essa carta já foi revelada.');
            carta.revelada = true;
            carta.quem = u.nome;
            delete e.marcas[i];
            const time = e.vez;
            if (carta.cor === 'assassino') {
              terminar(outro(time), `${NOME_TIME[time]} revelou o assassino!`);
            } else if (restantes('vermelho') === 0) {
              terminar('vermelho', 'Vermelho achou todas as suas palavras!');
            } else if (restantes('azul') === 0) {
              terminar('azul', 'Azul achou todas as suas palavras!');
            } else if (carta.cor === time) {
              e.chutesRestantes--;
              if (e.chutesRestantes <= 0) passarVez();
            } else {
              passarVez();
            }
            return OK;
          }
          case 'passar': {
            if (e.fase !== 'jogando' || e.etapa !== 'chute') return erro('Agora não dá pra passar.');
            if (!eu || eu.mestre || eu.time !== e.vez) return erro('Não é a vez do seu time.');
            passarVez();
            return OK;
          }
          default:
            return erro('Ação desconhecida.');
        }
      },
    };
  },
};
