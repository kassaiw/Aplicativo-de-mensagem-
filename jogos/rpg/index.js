'use strict';
/*
 * =================================================================
 *  MASMORRA — a EXPEDIÇÃO (o "jogo" que o gerente de jogos enxerga)
 * =================================================================
 *  Cuida do que fica em volta do combate:
 *    lobby → sala 1 → sala 2 → acampamento → sala 3 → chefe → fim
 *
 *  - Cada amigo escolhe uma classe e controla 1 herói.
 *  - O grupo escolhe se completa o time com BOTS (jogam sozinhos) ou se
 *    vai só com quem entrou. Com menos gente, os inimigos ficam mais fracos.
 *  - Inimigos jogam sozinhos, com uma pausa pra dar tempo de ver.
 *  - Cada vez tem um prazo; se ninguém decidir, o computador decide.
 * =================================================================
 */
const { jogador, erro, OK } = require('../util');
const { CLASSES, ORDEM_CLASSES, HABILIDADES, EFEITOS, ELEMENTOS, SALAS, ACAMPAMENTO, INIMIGOS } = require('./dados');
const { criarBatalha, criarInimigo } = require('./combate');

const RAPIDO = process.env.RESENHA_RPG_RAPIDO === '1'; // só pros testes automáticos
const ESPERA_INIMIGO = RAPIDO ? 15 : 1200; // pausa antes do inimigo agir (ms)
const ESPERA_SEM_DONO = RAPIDO ? 15 : 1200; // herói de quem saiu do servidor
const PRAZO_VEZ = 60 * 1000; // tempo pra escolher a ação
const PAUSA_FIM = RAPIDO ? 30 : 1800; // depois do último golpe, antes da tela de vitória
const PRAZO_ACAMPAMENTO = 90 * 1000;
const MAX_JOGADORES = 4;

// O que a tela precisa saber das regras (vai junto com o estado)
const DADOS = {
  classes: Object.fromEntries(
    ORDEM_CLASSES.map((id) => {
      const c = CLASSES[id];
      return [id, { nome: c.nome, descricao: c.descricao, posicao: c.posicao, vida: c.vida, atq: c.atq, mag: c.mag, def: c.def, vel: c.vel, habilidades: c.habilidades }];
    })
  ),
  ordemClasses: ORDEM_CLASSES,
  habilidades: Object.fromEntries(
    Object.entries(HABILIDADES).map(([id, h]) => [
      id,
      { nome: h.nome, icone: h.icone, descricao: h.descricao || '', elemento: h.elemento || null, de: h.de, em: h.em || null, alvo: h.alvo, peso: h.peso || 1 },
    ])
  ),
  efeitos: EFEITOS,
  elementos: ELEMENTOS,
  acampamento: ACAMPAMENTO,
  salas: SALAS.map((s) => ({ nome: s.nome, tipo: s.tipo })),
};

module.exports = {
  titulo: 'Masmorra',

  async criar({ opcoes, criador, estaOnline, mudou }) {
    const modo = opcoes.modo === 'dificil' ? 'dificil' : 'normal';
    const jogadores = new Map(); // cid -> { cid, nome, cor, avatar, classe }
    let fase = 'lobby'; // lobby | batalha | vitoriaSala | acampamento | fim
    let salaAtual = -1;
    let herois = [];
    let batalha = null;
    let ouro = 0;
    let final = null; // 'vitoria' | 'derrota'
    let escolhas = {}; // acampamento: heroiId -> escolha
    let afiados = {}; // heroiId -> multiplicador de dano na próxima sala
    let resumo = []; // frases pra mostrar entre as salas
    let timer = null;
    let prazo = 0;
    let bots = true; // completar as vagas vazias com bots?

    const lista = () => [...jogadores.values()];
    const classeLivre = () => ORDEM_CLASSES.find((c) => !lista().some((j) => j.classe === c));

    function entrar(u) {
      if (jogadores.has(u.cid)) return OK;
      if (jogadores.size >= MAX_JOGADORES) return erro('O grupo já está cheio (4 heróis).');
      jogadores.set(u.cid, { ...jogador(u), classe: classeLivre() });
      return OK;
    }
    entrar(criador);

    // ---------- montar o time ----------
    function criarHeroi(classe, dono) {
      const c = CLASSES[classe];
      return {
        id: 'h-' + classe,
        lado: 'heroi',
        classe,
        nome: dono ? dono.nome : c.nome,
        dono: dono ? dono.cid : null,
        cor: dono ? dono.cor : '#8b93a7',
        avatar: dono ? dono.avatar : '',
        vida: c.vida,
        vidaMax: c.vida,
        atq: c.atq,
        mag: c.mag,
        def: c.def,
        vel: c.vel,
        esq: c.esq,
        crit: c.crit,
        estresse: 0,
        mente: 'normal',
        condicao: 'ok',
        habilidades: [...c.habilidades],
        efeitos: [],
      };
    }

    // Grupo menor (sem bots): menos inimigos por sala, inimigos e chefe mais fracos,
    // heróis um pouco mais fortes e uma curinha depois de cada vitória.
    // Os números saíram de simulações com o computador jogando (veja docs/RPG.md).
    const AJUSTE = {
      1: { extra: 0, vida: 0.45, dano: 0.5, chefe: 0.5, heroiVida: 1.5, heroiDano: 1.3, cura: 0.6 },
      2: { extra: 1, vida: 0.55, dano: 0.6, chefe: 0.65, heroiVida: 1.25, heroiDano: 1.15, cura: 0.4 },
      3: { extra: 1, vida: 0.75, dano: 0.8, chefe: 0.8, heroiVida: 1.1, heroiDano: 1.05, cura: 0.25 },
      4: { extra: 1, vida: 1, dano: 1, chefe: 1, heroiVida: 1, heroiDano: 1, cura: 0 },
    };
    const ajuste = () => AJUSTE[herois.length] || AJUSTE[4];

    function montarTime() {
      const porClasse = new Map(lista().map((j) => [j.classe, j]));
      // sem bots: só as classes que alguém escolheu (na ordem das posições)
      herois = ORDEM_CLASSES.filter((c) => bots || porClasse.has(c)).map((c) => criarHeroi(c, porClasse.get(c)));
      const a = ajuste();
      for (const h of herois) {
        h.vida = h.vidaMax = Math.round(h.vidaMax * a.heroiVida);
        h.atq = Math.round(h.atq * a.heroiDano);
        h.mag = Math.round(h.mag * a.heroiDano);
      }
    }

    function inimigosDaSala(sala) {
      const maximo = herois.length + ajuste().extra;
      const lista = [...sala.inimigos];
      while (lista.length > maximo) {
        // tira o último que não for chefe
        const i = lista.map((t) => !!INIMIGOS[t].chefe).lastIndexOf(false);
        if (i < 0) break;
        lista.splice(i, 1);
      }
      return lista;
    }
    function ajustarInimigo(i) {
      const a = ajuste();
      i.vida = i.vidaMax = Math.max(1, Math.round(i.vidaMax * a.vida * (i.chefe ? a.chefe : 1)));
      i.atq = Math.round(i.atq * a.dano);
      i.mag = Math.round(i.mag * a.dano);
      return i;
    }

    // ---------- quem pode mandar no herói ----------
    function podeMandar(u, h) {
      if (!h || !jogadores.has(u.cid)) return false;
      if (h.dono === u.cid) return true;
      return !!h.dono && !estaOnline(h.dono); // o dono saiu: outro do grupo pode comandar (bot joga sozinho)
    }

    // ---------- salas ----------
    function entrarSala(avisos = []) {
      const sala = SALAS[salaAtual];
      if (sala.tipo === 'acampamento') {
        fase = 'acampamento';
        escolhas = {};
        agendarAcampamento();
        return;
      }
      const inimigos = inimigosDaSala(sala).map((tipo, i) => ajustarInimigo(criarInimigo(tipo, `i${salaAtual}-${i}`)));
      batalha = criarBatalha({ herois, inimigos, modo, bonusDano: afiados, titulo: sala.nome, avisos, maxInimigos: Math.min(4, Math.max(1, herois.length + ajuste().extra)), ajustar: ajustarInimigo });
      afiados = {};
      fase = 'batalha';
      agendar();
    }

    function fimDaBatalha() {
      const sala = SALAS[salaAtual];
      const venceu = batalha.resultado === 'vitoria';
      batalha.encerrar();
      resumo = [];
      if (venceu) {
        const cura = ajuste().cura;
        if (cura) {
          for (const h of herois) if (h.condicao !== 'morto') h.vida = Math.min(h.vidaMax, h.vida + Math.round(h.vidaMax * cura));
          resumo.push(`💚 Grupo pequeno: todo mundo recuperou ${Math.round(cura * 100)}% da vida.`);
        }
        ouro += sala.ouro;
        resumo.push(`Vocês venceram em ${sala.nome} e acharam ${sala.ouro} de ouro.`);
        const mortos = herois.filter((h) => h.condicao === 'morto');
        if (mortos.length) resumo.push(`Perdemos ${mortos.map((h) => h.nome).join(', ')} pra sempre. 🕯️`);
        fase = salaAtual === SALAS.length - 1 ? 'fim' : 'vitoriaSala';
        if (fase === 'fim') final = 'vitoria';
      } else {
        fase = 'fim';
        final = 'derrota';
      }
      batalha = null;
      mudou();
    }

    // Decide o que acontece agora: inimigo age sozinho, ou espera o jogador
    function agendar() {
      clearTimeout(timer);
      timer = null;
      prazo = 0;
      if (fase !== 'batalha' || !batalha) return;
      if (batalha.resultado) {
        timer = setTimeout(fimDaBatalha, PAUSA_FIM);
        return;
      }
      const v = batalha.vez;
      if (!v) return;
      const automatico = () => {
        if (!batalha || batalha.vez !== v) return;
        batalha.agirSozinho();
        mudou();
        agendar();
      };
      const alguemOnline = lista().some((j) => estaOnline(j.cid));
      if (!alguemOnline) return; // todo mundo saiu: o jogo espera
      // inimigos e bots jogam sozinhos, com uma pausa pra dar tempo de ver
      if (v.u.lado === 'inimigo' || !v.u.dono) {
        timer = setTimeout(automatico, ESPERA_INIMIGO);
        return;
      }
      if (v.u.dono && !estaOnline(v.u.dono)) {
        timer = setTimeout(automatico, ESPERA_SEM_DONO);
        return;
      }
      prazo = Date.now() + PRAZO_VEZ;
      timer = setTimeout(automatico, PRAZO_VEZ);
    }

    // ---------- acampamento ----------
    function precisaEscolherNoAcampamento(h) {
      return h.condicao !== 'morto' && h.dono && estaOnline(h.dono);
    }

    function agendarAcampamento() {
      clearTimeout(timer);
      prazo = Date.now() + PRAZO_ACAMPAMENTO;
      timer = setTimeout(() => {
        aplicarAcampamento();
        mudou();
      }, PRAZO_ACAMPAMENTO);
      verificarAcampamento();
    }

    function verificarAcampamento() {
      if (fase !== 'acampamento') return;
      if (herois.filter(precisaEscolherNoAcampamento).every((h) => escolhas[h.id])) aplicarAcampamento();
    }

    function aliviar(h, n) {
      h.estresse = Math.max(0, h.estresse - n);
      if (h.mente === 'abalado' && h.estresse < 40) h.mente = 'normal';
    }

    function aplicarAcampamento() {
      clearTimeout(timer);
      prazo = 0;
      resumo = [];
      const vivos = herois.filter((h) => h.condicao !== 'morto');
      for (const h of vivos) {
        const escolha = escolhas[h.id] || 'descansar';
        if (escolha === 'descansar') {
          const antes = h.vida;
          h.vida = Math.min(h.vidaMax, h.vida + Math.round(h.vidaMax * 0.4));
          resumo.push(`💤 ${h.nome} descansou (+${h.vida - antes} de vida).`);
        } else if (escolha === 'historias') {
          for (const outro of vivos) aliviar(outro, 20);
          resumo.push(`🔥 ${h.nome} contou histórias na fogueira (−20 de estresse pra todos).`);
        } else if (escolha === 'afiar') {
          afiados[h.id] = 1.15;
          resumo.push(`⚔️ ${h.nome} afiou as armas (+15% de dano na próxima sala).`);
        }
      }
      salaAtual++;
      entrarSala(resumo);
    }

    // ---------- o que cada pessoa vê ----------
    function verHeroi(h) {
      return {
        id: h.id,
        lado: 'heroi',
        classe: h.classe,
        nome: h.nome,
        dono: h.dono,
        ajudante: !h.dono,
        donoOnline: h.dono ? estaOnline(h.dono) : false,
        cor: h.cor,
        avatar: h.avatar,
        vida: h.vida,
        vidaMax: h.vidaMax,
        estresse: h.estresse,
        mente: h.mente,
        condicao: h.condicao,
        efeitos: (h.efeitos || []).map((e) => ({ tipo: e.tipo, turnos: e.turnos })),
        rank: batalha ? batalha.rank(h) : 0,
        habilidades: h.habilidades,
      };
    }

    function verInimigo(i) {
      return {
        id: i.id,
        lado: 'inimigo',
        tipo: i.tipo,
        nome: i.nome,
        chefe: i.chefe,
        vida: i.vida,
        vidaMax: i.vidaMax,
        quebra: i.quebra,
        quebraMax: i.quebraMax,
        quebrado: i.quebrado,
        condicao: i.condicao,
        efeitos: i.efeitos.map((e) => ({ tipo: e.tipo, turnos: e.turnos })),
        rank: batalha.rank(i),
        fraquezas: i.fraquezas.map((e) => (i.revelado.includes(e) ? e : null)),
        resiste: i.resiste.filter((e) => i.revelado.includes(e)),
      };
    }

    return {
      visao(u) {
        const base = {
          fase,
          modo,
          bots,
          ouro,
          salaAtual,
          final,
          resumo,
          prazo,
          dados: DADOS,
          jogadores: lista().map((j) => ({ ...j, online: estaOnline(j.cid) })),
          herois: herois.map(verHeroi),
        };
        if (fase === 'acampamento') base.escolhas = escolhas;
        if (!batalha) return base;
        const cena = batalha.cena;
        const v = batalha.vez;
        const manda = v && v.u.lado === 'heroi' && podeMandar(u, v.u);
        return {
          ...base,
          inimigos: batalha.times.inimigo
            .filter((i) => i.condicao !== 'morto' || cena?.alvos.some((a) => a.id === i.id))
            .map(verInimigo),
          linha: batalha.linhaDoTempo(10),
          vez: v ? { id: v.u.id, bonus: v.bonus, motivo: v.motivo || null, podeMandar: !!manda } : null,
          acoes: manda ? batalha.acoesDe(v.u) : null,
          cena,
          log: batalha.log.slice(-8),
          carga: batalha.carga,
          resultado: batalha.resultado,
        };
      },

      acao(u, d) {
        const eu = jogadores.get(u.cid);
        switch (d.acao) {
          case 'entrar':
            if (fase !== 'lobby') return erro('A expedição já começou. Espere a próxima!');
            return entrar(u);
          case 'sair':
            if (fase !== 'lobby') return erro('Não dá pra sair no meio da expedição.');
            jogadores.delete(u.cid);
            return OK;
          case 'bots':
            if (fase !== 'lobby') return erro('A expedição já começou.');
            if (!eu) return erro('Entre no grupo primeiro.');
            bots = !!d.ligado;
            return OK;
          case 'classe': {
            if (fase !== 'lobby') return erro('A expedição já começou.');
            if (!CLASSES[d.classe]) return erro('Classe desconhecida.');
            const dono = lista().find((j) => j.classe === d.classe);
            if (dono && dono.cid !== u.cid) return erro(`${dono.nome} já escolheu ${CLASSES[d.classe].nome}.`);
            if (!eu) {
              const r = entrar(u);
              if (!r.ok) return r;
            }
            jogadores.get(u.cid).classe = d.classe;
            return OK;
          }
          case 'comecar':
            if (fase !== 'lobby') return erro('Já começou.');
            if (!eu) return erro('Entre no grupo primeiro.');
            montarTime();
            salaAtual = 0;
            ouro = 0;
            final = null;
            resumo = [];
            entrarSala();
            return OK;
          case 'agir': {
            if (fase !== 'batalha' || !batalha) return erro('Não tem batalha agora.');
            const h = herois.find((x) => x.id === d.heroi);
            if (!podeMandar(u, h)) return erro('Esse herói não é seu.');
            const r = batalha.agir(d.heroi, String(d.hab || ''), d.alvo ? String(d.alvo) : undefined);
            if (r.ok) agendar();
            return r;
          }
          case 'auto': {
            if (fase !== 'batalha' || !batalha) return erro('Não tem batalha agora.');
            const v = batalha.vez;
            if (!v || v.u.id !== d.heroi || !podeMandar(u, v.u)) return erro('Não é a vez desse herói.');
            batalha.agirSozinho();
            agendar();
            return OK;
          }
          case 'seguir':
            if (fase !== 'vitoriaSala') return erro('Ainda não dá pra seguir.');
            if (!eu) return erro('Você não está no grupo.');
            salaAtual++;
            entrarSala();
            return OK;
          case 'acampar': {
            if (fase !== 'acampamento') return erro('Vocês não estão no acampamento.');
            if (!ACAMPAMENTO[d.escolha]) return erro('Escolha desconhecida.');
            const h = herois.find((x) => x.dono === u.cid);
            if (!h || h.condicao === 'morto') return erro('Você não tem herói pra descansar.');
            escolhas[h.id] = d.escolha;
            verificarAcampamento();
            return OK;
          }
          case 'denovo':
            if (fase !== 'fim') return erro('A expedição ainda não acabou.');
            clearTimeout(timer);
            fase = 'lobby';
            salaAtual = -1;
            herois = [];
            batalha = null;
            final = null;
            resumo = [];
            return OK;
          default:
            return erro('Ação desconhecida.');
        }
      },

      // Alguém saiu do servidor
      saiu() {
        if (fase === 'lobby') {
          for (const j of lista()) if (!estaOnline(j.cid)) jogadores.delete(j.cid);
        } else if (fase === 'batalha') {
          agendar();
        } else if (fase === 'acampamento') {
          verificarAcampamento();
        }
      },

      destruir() {
        clearTimeout(timer);
      },
    };
  },
};
