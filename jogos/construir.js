'use strict';
/*
 * =================================================================
 *  CONSTRUIR UM PERSONAGEM DE ANIME ⚡
 * =================================================================
 *  1. MONTAGEM: seu boneco tem 5 atributos (Força, Velocidade,
 *     Resistência, Inteligência, Habilidade). Você GIRA e sai um
 *     personagem de anime com raridade. Você escolhe em qual atributo
 *     colocar ele, e o valor daquele atributo vira o dele.
 *     Ex.: Força do personagem A + Velocidade do personagem B...
 *  2. BATALHAS 1 contra 1 entre os amigos, por turno. Os dois escolhem
 *     ao mesmo tempo: ⚔️ Ataque, 🛡️ Defesa ou 🌀 Especial.
 *       Defesa segura o Ataque · Especial fura a Defesa ·
 *       Ataque de quem é mais rápido interrompe o Especial.
 *  3. Quem vence ganha moedas e sobe de NÍVEL (+5% em tudo por nível).
 *     Na LOJA dá pra treinar um atributo ou girar um de novo.
 *  Repete por 3 rodadas. No fim, ganha quem tiver mais vitórias.
 *  É tudo gerado na hora: nada fica salvo entre uma partida e outra.
 * =================================================================
 */
const crypto = require('crypto');
const { embaralhar, jogador, erro, OK } = require('./util');
const { comStatus } = require('./status');

const ATRIBUTOS = [
  { id: 'forca', nome: 'Força', emoji: '💪', de: 'forca' },
  { id: 'velocidade', nome: 'Velocidade', emoji: '⚡', de: 'velocidade' },
  { id: 'resistencia', nome: 'Resistência', emoji: '🛡️', de: 'resistencia' },
  { id: 'inteligencia', nome: 'Inteligência', emoji: '🧠', de: 'inteligencia' },
  { id: 'habilidade', nome: 'Habilidade', emoji: '🎯', de: 'tecnica' },
];
const IDS = ATRIBUTOS.map((a) => a.id);

// "ate" = até qual fatia dos mais populares (0.02 = os 2% mais famosos)
const RARIDADES = [
  { id: 'mitico', nome: 'Mítico', ate: 0.02, chance: 2, cor: '#ff4d6d' },
  { id: 'lendario', nome: 'Lendário', ate: 0.08, chance: 7, cor: '#ffb020' },
  { id: 'epico', nome: 'Épico', ate: 0.22, chance: 15, cor: '#b066ff' },
  { id: 'raro', nome: 'Raro', ate: 0.5, chance: 30, cor: '#4ea1ff' },
  { id: 'comum', nome: 'Comum', ate: 1, chance: 46, cor: '#9aa0aa' },
];

const PRECOS = { treinar: 60, regirar: 80 };
const TREINO = 6; // quanto o treino aumenta
const REGIROS_MONTAGEM = 2;
const MOEDAS = { vitoria: 100, derrota: 40, folga: 60 };
const MAX_TURNOS = 15;
const RAPIDO = process.env.RESENHA_RPG_RAPIDO === '1';
const PRAZO = {
  montagem: RAPIDO ? 4000 : 150_000,
  turno: RAPIDO ? 300 : 20_000,
  loja: RAPIDO ? 2000 : 45_000,
  entreLutas: RAPIDO ? 50 : 2500,
};

const sorte = () => crypto.randomInt(1_000_000) / 1_000_000;
const entre = (a, b) => a + sorte() * (b - a);
const limitar = (n, a, b) => Math.max(a, Math.min(b, n));

// Monta a lista de personagens com status e raridade (mais famoso = mais raro)
function montarPool(personagens) {
  const comS = comStatus(personagens);
  const n = comS.length;
  return comS.map((p, i) => {
    const raridade = RARIDADES.find((r) => i < Math.ceil(r.ate * n)) || RARIDADES[RARIDADES.length - 1];
    const status = Object.fromEntries(ATRIBUTOS.map((a) => [a.id, p.status[a.de]]));
    return { id: p.id, nome: p.nome, anime: p.anime, imagem: p.imagem, raridade: raridade.id, status };
  });
}

function sortearPersonagem(pool) {
  let r = sorte() * 100;
  let rar = RARIDADES[RARIDADES.length - 1];
  for (const x of RARIDADES) {
    r -= x.chance;
    if (r < 0) {
      rar = x;
      break;
    }
  }
  const daRaridade = pool.filter((p) => p.raridade === rar.id);
  const lista = daRaridade.length ? daRaridade : pool;
  return lista[crypto.randomInt(lista.length)];
}

// Valor de verdade de um atributo: o do personagem + treino, com o bônus de nível
function valorEfetivo(j, atributo) {
  const s = j.slots[atributo];
  if (!s) return 0;
  return Math.round((s.valor + s.bonus) * (1 + 0.05 * (j.nivel - 1)));
}
const atributosDe = (j) => Object.fromEntries(IDS.map((a) => [a, valorEfetivo(j, a)]));
const poderDe = (j) => IDS.reduce((t, a) => t + valorEfetivo(j, a), 0);
const vidaMaxima = (at) => Math.round(100 + at.resistencia * 1.5);

module.exports = {
  titulo: 'Construir Personagem',

  async listaParaBusca({ anilist }) {
    const dados = await anilist.garantir();
    return montarPool(dados.personagens).map((p) => ({ id: p.id, t: p.nome, img: p.imagem, r: p.raridade }));
  },

  async criar({ opcoes, anilist, criador, estaOnline, mudou }) {
    const dados = await anilist.garantir();
    const pool = montarPool(dados.personagens.filter((p) => p.imagem));
    if (pool.length < 30) throw new Error('Ainda não tenho personagens suficientes baixados do AniList.');
    const totalRodadas = Number(opcoes.rodadas) === 5 ? 5 : 3;

    const jogadores = new Map();
    let fase = 'lobby'; // lobby | montagem | batalha | loja | fim
    let rodada = 0;
    let prazo = 0;
    let timer = null;
    let batalhas = [];
    let folga = null; // cid de quem ficou sem par nessa rodada
    const timersBatalha = new Map();
    const jaLutaram = new Set(); // pares que já se enfrentaram
    let classificacao = null;

    const lista = () => [...jogadores.values()];
    function entrar(u) {
      if (jogadores.has(u.cid)) return OK;
      if (jogadores.size >= 8) return erro('Já tem 8 jogadores.');
      jogadores.set(u.cid, {
        ...jogador(u),
        slots: Object.fromEntries(IDS.map((a) => [a, null])),
        pendente: null,
        giro: 0, // aumenta a cada giro (a tela usa pra animar a roleta)
        regiros: REGIROS_MONTAGEM,
        moedas: 0,
        nivel: 1,
        vitorias: 0,
        derrotas: 0,
        pronto: false,
        rosto: null,
        oferta: null, // na loja: personagem novo esperando você decidir
      });
      return OK;
    }
    entrar(criador);

    const completo = (j) => IDS.every((a) => j.slots[a]);
    const livres = (j) => IDS.filter((a) => !j.slots[a]);

    function girar(j) {
      j.pendente = sortearPersonagem(pool);
      j.giro++;
    }

    function colocar(j, atributo, p) {
      j.slots[atributo] = { personagem: p, valor: p.status[atributo], bonus: j.slots[atributo]?.bonus || 0 };
      if (!j.rosto || !j.slots[j.rosto]) j.rosto = atributo;
    }

    // ---------- fases ----------
    function agendar(ms, fn) {
      clearTimeout(timer);
      prazo = Date.now() + ms;
      timer = setTimeout(() => {
        fn();
        mudou();
      }, ms);
    }

    function comecarMontagem() {
      fase = 'montagem';
      agendar(PRAZO.montagem, terminarMontagem);
    }

    // Acabou o tempo: quem não terminou ganha giros automáticos nas vagas livres
    function terminarMontagem() {
      for (const j of lista()) {
        while (!completo(j)) {
          if (!j.pendente) girar(j);
          // coloca onde o personagem é mais forte
          const melhor = livres(j).sort((a, b) => j.pendente.status[b] - j.pendente.status[a])[0];
          colocar(j, melhor, j.pendente);
          j.pendente = null;
        }
      }
      comecarRodada();
    }

    function verificarMontagem() {
      if (fase === 'montagem' && lista().every(completo)) terminarMontagem();
    }

    function comecarRodada() {
      rodada++;
      fase = 'batalha';
      clearTimeout(timer);
      prazo = 0;
      for (const j of lista()) j.pronto = false;
      // sorteia os pares, tentando não repetir quem já lutou
      let melhor = null;
      for (let t = 0; t < 30; t++) {
        const ordem = embaralhar(lista());
        const pares = [];
        for (let i = 0; i + 1 < ordem.length; i += 2) pares.push([ordem[i], ordem[i + 1]]);
        const repetidos = pares.filter(([a, b]) => jaLutaram.has([a.cid, b.cid].sort().join('|'))).length;
        if (!melhor || repetidos < melhor.repetidos) melhor = { pares, sobra: ordem.length % 2 ? ordem[ordem.length - 1] : null, repetidos };
        if (!repetidos) break;
      }
      folga = melhor.sobra?.cid || null;
      if (melhor.sobra) melhor.sobra.moedas += MOEDAS.folga;
      batalhas = melhor.pares.map(([a, b], i) => criarBatalha(`b${rodada}-${i}`, a, b));
      for (const b of batalhas) {
        jaLutaram.add([b.a, b.b].sort().join('|'));
        agendarTurno(b);
      }
    }

    function criarBatalha(id, ja, jb) {
      const at = { [ja.cid]: atributosDe(ja), [jb.cid]: atributosDe(jb) };
      const hpMax = { [ja.cid]: vidaMaxima(at[ja.cid]), [jb.cid]: vidaMaxima(at[jb.cid]) };
      return {
        id,
        a: ja.cid,
        b: jb.cid,
        at,
        hpMax,
        hp: { ...hpMax },
        energia: { [ja.cid]: 1, [jb.cid]: 1 },
        escolhas: {},
        turno: 1,
        prazo: 0,
        ultimo: null,
        log: [],
        vencedor: null,
      };
    }

    function agendarTurno(b) {
      clearTimeout(timersBatalha.get(b.id));
      if (b.vencedor) return;
      b.prazo = Date.now() + PRAZO.turno;
      timersBatalha.set(
        b.id,
        setTimeout(() => {
          // quem não escolheu, ataca
          for (const cid of [b.a, b.b]) if (!b.escolhas[cid]) b.escolhas[cid] = 'ataque';
          resolverTurno(b);
          mudou();
        }, PRAZO.turno)
      );
    }

    const nomeDe = (cid) => jogadores.get(cid)?.nome || '?';

    // ---------- o coração da luta ----------
    function resolverTurno(b) {
      clearTimeout(timersBatalha.get(b.id));
      const eventos = [];
      const acoes = { ...b.escolhas };
      for (const cid of [b.a, b.b]) {
        if (acoes[cid] === 'especial' && b.energia[cid] < 2) acoes[cid] = 'ataque';
        if (acoes[cid] === 'especial') b.energia[cid] -= 2;
      }
      // quem é mais rápido age primeiro (empate: sorte)
      const va = b.at[b.a].velocidade;
      const vb = b.at[b.b].velocidade;
      const ordem = va > vb || (va === vb && sorte() < 0.5) ? [b.a, b.b] : [b.b, b.a];
      const interrompido = {};
      for (const cid of ordem) {
        if (b.vencedor) break;
        const alvo = cid === b.a ? b.b : b.a;
        const meu = b.at[cid];
        const dele = b.at[alvo];
        const acao = acoes[cid];
        if (acao === 'defesa') continue;
        const ev = { quem: cid, alvo, acao };
        // esquiva (contra Especial é mais difícil desviar)
        let esquiva = limitar(5 + (dele.velocidade - meu.velocidade) * 0.4, 0, 35);
        if (acao === 'especial') esquiva /= 2;
        if (acoes[alvo] === 'defesa') esquiva = 0;
        if (sorte() * 100 < esquiva) {
          ev.esquivou = true;
          eventos.push(ev);
          b.log.push(`💨 ${nomeDe(alvo)} desviou do ${acao === 'especial' ? 'Especial' : 'Ataque'} de ${nomeDe(cid)}!`);
          continue;
        }
        let dano;
        if (acao === 'especial') {
          dano = meu.inteligencia * 0.95 * entre(0.85, 1.15) * (1 - (dele.resistencia / (dele.resistencia + 160)) * 0.5);
          if (interrompido[cid]) {
            dano *= 0.5;
            ev.interrompido = true;
          }
        } else {
          dano = meu.forca * 0.6 * entre(0.85, 1.15) * (1 - dele.resistencia / (dele.resistencia + 160));
          if (acoes[alvo] === 'defesa') {
            dano *= 0.4;
            ev.defendido = true;
          }
          // atacar primeiro atrapalha o Especial do outro
          if (acoes[alvo] === 'especial') interrompido[alvo] = true;
        }
        if (sorte() * 100 < Math.min(40, meu.habilidade * 0.3)) {
          dano *= 1.6;
          ev.critico = true;
        }
        dano = Math.max(1, Math.round(dano));
        ev.dano = dano;
        b.hp[alvo] = Math.max(0, b.hp[alvo] - dano);
        eventos.push(ev);
        const nomeAcao = acao === 'especial' ? '🌀 Especial' : '⚔️ Ataque';
        b.log.push(`${nomeAcao} de ${nomeDe(cid)}: ${dano} de dano${ev.critico ? ' (CRÍTICO!)' : ''}${ev.defendido ? ' (defendeu)' : ''}${ev.interrompido ? ' (interrompido)' : ''}.`);
        if (b.hp[alvo] === 0) b.vencedor = cid;
      }
      for (const cid of [b.a, b.b]) {
        if (acoes[cid] === 'defesa') {
          b.energia[cid] = Math.min(3, b.energia[cid] + 1);
          if (!eventos.some((e) => e.alvo === cid)) b.log.push(`🛡️ ${nomeDe(cid)} ficou na defesa.`);
        }
        b.energia[cid] = Math.min(3, b.energia[cid] + 1);
      }
      b.ultimo = { turno: b.turno, acoes, eventos };
      b.escolhas = {};
      b.turno++;
      if (!b.vencedor && b.turno > MAX_TURNOS) {
        // acabou o tempo da luta: ganha quem tem mais vida (em %)
        const pa = b.hp[b.a] / b.hpMax[b.a];
        const pb = b.hp[b.b] / b.hpMax[b.b];
        b.vencedor = pa === pb ? (va >= vb ? b.a : b.b) : pa > pb ? b.a : b.b;
        b.log.push(`⏱️ Acabaram os turnos! ${nomeDe(b.vencedor)} ganhou com mais vida.`);
      }
      if (b.vencedor) terminarBatalha(b);
      else agendarTurno(b);
    }

    function terminarBatalha(b) {
      clearTimeout(timersBatalha.get(b.id));
      const venceu = jogadores.get(b.vencedor);
      const perdeu = jogadores.get(b.vencedor === b.a ? b.b : b.a);
      venceu.vitorias++;
      venceu.nivel++;
      venceu.moedas += MOEDAS.vitoria;
      perdeu.derrotas++;
      perdeu.moedas += MOEDAS.derrota;
      b.log.push(`🏆 ${venceu.nome} venceu! +${MOEDAS.vitoria} moedas e subiu pro nível ${venceu.nivel}. ${perdeu.nome} ganhou +${MOEDAS.derrota} moedas.`);
      if (batalhas.every((x) => x.vencedor)) {
        // deixa ver o golpe final antes de ir pra loja
        agendar(PRAZO.entreLutas, () => (rodada >= totalRodadas ? terminar() : abrirLoja()));
      }
    }

    function abrirLoja() {
      fase = 'loja';
      for (const j of lista()) {
        j.pronto = false;
        j.oferta = null;
      }
      agendar(PRAZO.loja, comecarRodada);
    }

    function terminar() {
      fase = 'fim';
      clearTimeout(timer);
      prazo = 0;
      classificacao = lista()
        .map((j) => ({ cid: j.cid, nome: j.nome, cor: j.cor, avatar: j.avatar, vitorias: j.vitorias, derrotas: j.derrotas, nivel: j.nivel, poder: poderDe(j) }))
        .sort((a, b) => b.vitorias - a.vitorias || b.poder - a.poder);
    }

    // ---------- o que cada um vê ----------
    // O que a tela pode saber de um personagem: SEM os números (quem joga tem que pensar!)
    const semNumeros = (p) => p && { id: p.id, nome: p.nome, anime: p.anime, imagem: p.imagem, raridade: p.raridade };

    function verSlots(j) {
      return Object.fromEntries(
        IDS.map((a) => {
          const s = j.slots[a];
          return [a, s ? { personagem: semNumeros(s.personagem), valor: s.valor, bonus: s.bonus, efetivo: valorEfetivo(j, a) } : null];
        })
      );
    }

    function verBatalha(b, u) {
      const eu = u.cid === b.a || u.cid === b.b ? u.cid : null;
      return {
        id: b.id,
        a: b.a,
        b: b.b,
        hp: b.hp,
        hpMax: b.hpMax,
        energia: b.energia,
        turno: b.turno,
        maxTurnos: MAX_TURNOS,
        prazo: b.prazo,
        vencedor: b.vencedor,
        ultimo: b.ultimo,
        log: b.log.slice(-6),
        escolheu: { [b.a]: !!b.escolhas[b.a], [b.b]: !!b.escolhas[b.b] },
        minhaEscolha: eu ? b.escolhas[eu] || null : null,
        atributos: b.at,
      };
    }

    return {
      visao(u) {
        const eu = jogadores.get(u.cid);
        return {
          fase,
          rodada,
          totalRodadas,
          prazo,
          atributos: ATRIBUTOS,
          raridades: RARIDADES,
          precos: PRECOS,
          treino: TREINO,
          folga,
          dentro: !!eu,
          jogadores: lista().map((j) => ({
            cid: j.cid,
            nome: j.nome,
            cor: j.cor,
            avatar: j.avatar,
            nivel: j.nivel,
            moedas: j.moedas,
            vitorias: j.vitorias,
            derrotas: j.derrotas,
            pronto: j.pronto || (fase === 'montagem' && completo(j)),
            online: estaOnline(j.cid),
            slots: verSlots(j),
            rosto: j.rosto,
            poder: poderDe(j),
          })),
          eu: eu ? { pendente: semNumeros(eu.pendente), giro: eu.giro, regiros: eu.regiros, moedas: eu.moedas, oferta: eu.oferta && { atributo: eu.oferta.atributo, personagem: semNumeros(eu.oferta.personagem) } } : null,
          batalhas: batalhas.map((b) => verBatalha(b, u)),
          classificacao,
        };
      },

      acao(u, d) {
        const j = jogadores.get(u.cid);
        const atributo = IDS.includes(d.atributo) ? d.atributo : null;
        switch (d.acao) {
          case 'entrar':
            if (fase !== 'lobby') return erro('A partida já começou. Espere a próxima!');
            return entrar(u);
          case 'sair':
            if (fase !== 'lobby') return erro('Não dá pra sair no meio.');
            jogadores.delete(u.cid);
            return OK;
          case 'comecar':
            if (fase !== 'lobby') return erro('Já começou.');
            if (!j) return erro('Entre primeiro.');
            if (jogadores.size < 2) return erro('Precisa de pelo menos 2 pessoas pra lutar.');
            comecarMontagem();
            return OK;
          case 'girar':
            if (!j) return erro('Você não está na partida.');
            if (fase !== 'montagem') return erro('Agora não é hora de girar.');
            if (j.pendente) return erro('Coloque o personagem que saiu antes de girar de novo.');
            if (completo(j)) return erro('Seu boneco já está completo!');
            girar(j);
            return OK;
          case 'regirar':
            if (!j || fase !== 'montagem' || !j.pendente) return erro('Agora não dá.');
            if (j.regiros <= 0) return erro('Acabaram os giros extras.');
            j.regiros--;
            girar(j);
            return OK;
          case 'colocar':
            if (!j || fase !== 'montagem' || !j.pendente) return erro('Gire primeiro.');
            if (!atributo || j.slots[atributo]) return erro('Escolha um atributo vazio.');
            colocar(j, atributo, j.pendente);
            j.pendente = null;
            verificarMontagem();
            return OK;
          case 'rosto':
            if (!j || !atributo || !j.slots[atributo]) return erro('Escolha um personagem do seu boneco.');
            j.rosto = atributo;
            return OK;
          case 'golpe': {
            if (fase !== 'batalha' || !j) return erro('Não tem luta agora.');
            const b = batalhas.find((x) => (x.a === u.cid || x.b === u.cid) && !x.vencedor);
            if (!b) return erro('Sua luta já acabou.');
            if (!['ataque', 'defesa', 'especial'].includes(d.golpe)) return erro('Golpe desconhecido.');
            if (d.golpe === 'especial' && b.energia[u.cid] < 2) return erro('Precisa de 2 de energia pro Especial.');
            b.escolhas[u.cid] = d.golpe;
            if (b.escolhas[b.a] && b.escolhas[b.b]) resolverTurno(b);
            return OK;
          }
          case 'treinar':
            if (fase !== 'loja' || !j) return erro('A loja está fechada.');
            if (!atributo) return erro('Escolha um atributo.');
            if (j.moedas < PRECOS.treinar) return erro('Moedas insuficientes.');
            j.moedas -= PRECOS.treinar;
            j.slots[atributo].bonus += TREINO;
            return OK;
          case 'regirarSlot':
            if (fase !== 'loja' || !j) return erro('A loja está fechada.');
            if (!atributo) return erro('Escolha um atributo.');
            if (j.oferta) return erro('Decida primeiro se troca ou mantém o que saiu.');
            if (j.moedas < PRECOS.regirar) return erro('Moedas insuficientes.');
            j.moedas -= PRECOS.regirar;
            j.oferta = { atributo, personagem: sortearPersonagem(pool) };
            j.giro++;
            return OK;
          case 'decidir':
            if (fase !== 'loja' || !j?.oferta) return erro('Não tem nada pra decidir.');
            if (d.trocar) colocar(j, j.oferta.atributo, j.oferta.personagem);
            j.oferta = null;
            return OK;
          case 'pronto':
            if (fase !== 'loja' || !j) return erro('Agora não.');
            j.pronto = true;
            if (lista().every((x) => x.pronto || !estaOnline(x.cid))) {
              clearTimeout(timer);
              comecarRodada();
            }
            return OK;
          case 'denovo':
            if (fase !== 'fim') return erro('A partida não acabou.');
            for (const x of lista()) {
              Object.assign(x, { slots: Object.fromEntries(IDS.map((a) => [a, null])), pendente: null, regiros: REGIROS_MONTAGEM, moedas: 0, nivel: 1, vitorias: 0, derrotas: 0, pronto: false, rosto: null, oferta: null });
            }
            jaLutaram.clear();
            batalhas = [];
            rodada = 0;
            classificacao = null;
            fase = 'lobby';
            return OK;
          default:
            return erro('Ação desconhecida.');
        }
      },

      destruir() {
        clearTimeout(timer);
        for (const t of timersBatalha.values()) clearTimeout(t);
      },
    };
  },
};

module.exports.ATRIBUTOS = ATRIBUTOS;
module.exports.RARIDADES = RARIDADES;
module.exports.montarPool = montarPool;
