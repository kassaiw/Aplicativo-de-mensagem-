'use strict';
/*
 * =================================================================
 *  MASMORRA — o MOTOR DE COMBATE
 * =================================================================
 *  Só regras, sem tela e sem rede. Por isso dá pra testar sozinho.
 *
 *  As ideias, e de onde cada uma veio:
 *
 *  1. LINHA DO TEMPO (estilo Final Fantasy)
 *     Cada unidade tem um "prox" = o momento da próxima vez dela.
 *     Quem tem o menor "prox" joga. Depois de agir, o prox anda pra
 *     frente:  prox = agora + 100 × peso ÷ velocidade
 *     Ou seja: quem é rápido joga mais vezes, e ação "leve" (peso 0.5)
 *     faz você jogar de novo mais cedo.
 *
 *  2. QUEBRA (estilo FF Resonance)
 *     Inimigo tem um ESCUDO. Todo golpe tira 1 (ou o "quebra" da
 *     habilidade); golpe na FRAQUEZA tira o dobro. Escudo zerou:
 *       - o inimigo fica QUEBRADO: perde a próxima vez e leva +50% de dano
 *       - quem quebrou ganha uma AÇÃO BÔNUS na hora
 *     Quebrou TODOS os inimigos de uma vez = SINTONIA: o time inteiro
 *     ganha ação bônus e libera o "Ataque da Resenha".
 *
 *  3. POSIÇÕES (estilo Darkest Dungeon)
 *     Cada lado tem uma fila: posição 1 é a da frente. Cada habilidade
 *     só pode ser usada de certas posições e só alcança certas posições.
 *
 *  4. ESTRESSE (estilo Darkest Dungeon)
 *     Vai de 0 a 100. Chegou em 100: teste de coragem.
 *       25%: INSPIRADO (mais dano e crítico, estresse cai pra 40)
 *       75%: ABALADO (menos dano, mais lento, às vezes estressa os amigos)
 *
 *  5. CAIR / MORRER
 *     Modo normal: vida 0 = CAÍDO (não joga até alguém curar; levanta
 *     no fim da batalha). Modo difícil: vida 0 = PORTA DA MORTE (ainda
 *     joga, mas o próximo golpe pode matar de vez).
 * =================================================================
 */
const { HABILIDADES, INIMIGOS } = require('./dados');

const ESTRESSE_MAX = 100;
const CHANCE_RESISTIR_MORTE = 60; // na porta da morte, chance de aguentar mais um golpe

function criarInimigo(tipo, id) {
  const base = INIMIGOS[tipo];
  return {
    id,
    lado: 'inimigo',
    tipo,
    nome: base.nome,
    chefe: !!base.chefe,
    vida: base.vida,
    vidaMax: base.vida,
    atq: base.atq,
    mag: base.mag,
    def: base.def,
    vel: base.vel,
    esq: base.esq,
    crit: base.crit,
    quebraMax: base.quebra,
    quebra: base.quebra,
    quebrado: false,
    fraquezas: [...base.fraquezas],
    resiste: [...base.resiste],
    revelado: [], // elementos que o time já descobriu
    habilidades: [...base.habilidades],
    condicao: 'ok',
  };
}

/*
 * herois: objetos que vêm da expedição (a vida e o estresse continuam
 *         de uma sala pra outra, então o motor mexe neles direto)
 * rng:    função que dá um número de 0 a 1 (nos testes a gente troca
 *         por uma "sorte de mentira" pra dar sempre o mesmo resultado)
 */
function criarBatalha({ herois, inimigos, modo = 'normal', rng = Math.random, bonusDano = {}, titulo = '', avisos = [], maxInimigos = 4, ajustar = (i) => i }) {
  const dificil = modo === 'dificil';
  const times = { heroi: herois, inimigo: inimigos };
  const fila = []; // ações bônus esperando: { id, motivo }
  const log = [];
  let tempo = 0;
  let vez = null; // { u, bonus, motivo }
  let seq = 0;
  let cena = null; // o que acabou de acontecer (a tela usa pra animar)
  let carga = 0; // cargas do Ataque da Resenha
  let resultado = null; // 'vitoria' | 'derrota'
  let contadorInvocados = 0;

  // ---------- utilidades ----------
  const chance = (pct) => rng() * 100 < pct;
  const entre = (a, b) => a + rng() * (b - a);
  const sortear = (lista) => lista[Math.floor(rng() * lista.length)];
  const todas = () => [...times.heroi, ...times.inimigo];
  const porId = (id) => todas().find((u) => u.id === id);
  const dePe = (u) => u.condicao === 'ok' || u.condicao === 'porta';
  const formacao = (lado) => times[lado].filter(dePe);
  const rank = (u) => formacao(u.lado).indexOf(u) + 1; // 0 = fora da fila
  const outroLado = (lado) => (lado === 'heroi' ? 'inimigo' : 'heroi');
  const efeito = (u, tipo) => u.efeitos.find((e) => e.tipo === tipo);
  const limitar = (n, min, max) => Math.max(min, Math.min(max, n));

  function escrever(texto, tipo = '') {
    log.push({ texto, tipo });
    if (log.length > 40) log.shift();
  }

  function vel(u) {
    let v = u.vel + (efeito(u, 'rapido')?.valor || 0) - (efeito(u, 'lento')?.valor || 0);
    if (u.mente === 'abalado') v -= 1;
    return Math.max(1, v);
  }
  const def = (u) => u.def + (efeito(u, 'defesa')?.valor || 0);
  const custo = (u, peso = 1) => (100 * peso) / vel(u);

  // ---------- começo da batalha ----------
  for (const t of avisos) escrever(t);
  escrever(`⚔️ ${titulo ? titulo + ': ' : ''}a batalha começou!`);
  for (const u of todas()) {
    u.efeitos = [];
    // quem é rápido tende a começar antes, mas com um pouco de sorte
    u.prox = custo(u) * entre(0.25, 1);
  }

  // ---------- estresse ----------
  function estressar(h, n) {
    if (h.lado !== 'heroi' || h.condicao === 'morto' || n <= 0) return 0;
    const antes = h.estresse;
    h.estresse = limitar(Math.round(h.estresse + n * (dificil ? 1.2 : 1)), 0, ESTRESSE_MAX);
    if (h.estresse >= ESTRESSE_MAX && h.mente !== 'abalado') testeDeCoragem(h);
    return h.estresse - antes;
  }

  function aliviar(h, n) {
    if (h.lado !== 'heroi' || h.condicao === 'morto') return;
    h.estresse = Math.max(0, h.estresse - n);
    if (h.mente === 'abalado' && h.estresse < 40) {
      h.mente = 'normal';
      escrever(`😌 ${h.nome} se acalmou.`);
    }
  }

  function testeDeCoragem(h) {
    if (chance(25)) {
      h.mente = 'inspirado';
      h.estresse = 40;
      escrever(`✨ ${h.nome} encarou o medo e ficou INSPIRADO!`, 'bom');
      if (cena) cena.mente = { id: h.id, mente: 'inspirado' };
    } else {
      h.mente = 'abalado';
      escrever(`💢 ${h.nome} não aguentou e ficou ABALADO!`, 'ruim');
      if (cena) cena.mente = { id: h.id, mente: 'abalado' };
      for (const outro of formacao('heroi')) if (outro !== h) estressar(outro, 5);
    }
  }

  // ---------- dano, cura, morte ----------
  function aliadoCaiu(h, morreu) {
    for (const outro of formacao('heroi')) if (outro !== h) estressar(outro, morreu ? 25 : 12);
  }

  function aplicarDano(alvo, dano, r) {
    if (alvo.lado === 'inimigo') {
      alvo.vida = Math.max(0, alvo.vida - dano);
      if (alvo.vida === 0) {
        alvo.condicao = 'morto';
        alvo.quebrado = false;
        if (r) r.morreu = true;
        escrever(`☠️ ${alvo.nome} foi derrotado.`, 'bom');
      }
      return;
    }
    if (alvo.condicao === 'porta') {
      if (chance(CHANCE_RESISTIR_MORTE)) {
        if (r) r.resistiuMorte = true;
        escrever(`😰 ${alvo.nome} aguentou na porta da morte!`);
      } else {
        alvo.condicao = 'morto';
        alvo.efeitos = [];
        if (r) r.morreu = true;
        escrever(`⚰️ ${alvo.nome} MORREU.`, 'ruim');
        aliadoCaiu(alvo, true);
      }
      return;
    }
    alvo.vida = Math.max(0, alvo.vida - dano);
    if (alvo.vida > 0) return;
    alvo.efeitos = [];
    if (dificil) {
      alvo.condicao = 'porta';
      if (r) r.porta = true;
      escrever(`💀 ${alvo.nome} está na PORTA DA MORTE!`, 'ruim');
    } else {
      alvo.condicao = 'caido';
      if (r) r.caiu = true;
      escrever(`😵 ${alvo.nome} caiu!`, 'ruim');
    }
    aliadoCaiu(alvo, false);
  }

  function revelar(alvo, elemento) {
    if (alvo.lado === 'inimigo' && !alvo.revelado.includes(elemento)) alvo.revelado.push(elemento);
  }

  function quebrar(alvo, ator, r) {
    alvo.quebrado = true;
    alvo.quebra = 0;
    r.quebrou = true;
    escrever(`💥 ${alvo.nome} QUEBROU! Perde a próxima vez e leva mais dano.`, 'bom');
    if (ator.lado !== 'heroi') return;
    aliviar(ator, 5);
    if (!vez.bonus && !fila.some((f) => f.id === ator.id)) {
      fila.push({ id: ator.id, motivo: 'quebra' });
      escrever(`➕ ${ator.nome} ganhou uma ação bônus!`, 'bom');
    }
    const vivos = formacao('inimigo');
    if (vivos.length && vivos.every((i) => i.quebrado)) {
      carga = 1;
      cena.sintonia = true;
      escrever('🌟 SINTONIA! Todos os inimigos quebrados: o time inteiro ganha ação bônus e o Ataque da Resenha!', 'sintonia');
      for (const h of formacao('heroi')) {
        if (!fila.some((f) => f.id === h.id)) fila.push({ id: h.id, motivo: 'sintonia' });
      }
    }
  }

  function golpear(ator, hab, alvoOriginal, r) {
    // Muralha: alguém está protegendo esse alvo?
    let alvo = alvoOriginal;
    const prot = efeito(alvoOriginal, 'protegido');
    if (prot && hab.alvo === 'inimigo') {
      const guarda = porId(prot.de);
      if (guarda && dePe(guarda) && guarda !== ator) {
        alvo = guarda;
        r.id = guarda.id;
        r.protegeu = alvoOriginal.id;
      }
    }

    // Acertou? (quebrado não desvia)
    const acerto = alvo.quebrado ? 100 : limitar(95 + (hab.precisao || 0) - alvo.esq - (ator.mente === 'abalado' ? 10 : 0), 30, 100);
    if (!chance(acerto)) {
      r.errou = true;
      return;
    }

    // Quanto de dano
    let soma;
    if (hab.especial) {
      // Ataque da Resenha: soma a força de todo o time em pé
      soma = formacao('heroi').reduce((t, h) => t + Math.max(h.atq, h.mag), 0);
    } else {
      soma = ator[hab.stat || 'atq'];
    }
    const poder = hab.especial ? 0.6 : hab.poder;
    const defesa = hab.stat === 'mag' ? def(alvo) / 2 : def(alvo);
    let dano = poder * soma * 1.2 * (1 - defesa / (defesa + 20)) * entre(0.9, 1.1);

    const el = hab.elemento;
    if (alvo.lado === 'inimigo' && el) {
      if (alvo.fraquezas.includes(el)) {
        r.fraco = true;
        dano *= 1.5;
        revelar(alvo, el);
      } else if (alvo.resiste.includes(el)) {
        r.resistiu = true;
        dano *= 0.5;
        revelar(alvo, el);
      }
    }
    const chanceCrit = ator.crit + (hab.crit || 0) + (ator.mente === 'inspirado' ? 10 : 0);
    if (chance(chanceCrit)) {
      r.critico = true;
      dano *= 1.5;
    }
    if (alvo.quebrado) dano *= 1.5;
    if (efeito(alvo, 'marcado')) dano *= 1.3;
    if (efeito(alvo, 'defendendo')) dano *= 0.5;
    if (ator.mente === 'abalado') dano *= 0.8;
    if (ator.mente === 'inspirado') dano *= 1.2;
    if (ator.lado === 'heroi' && bonusDano[ator.id]) dano *= bonusDano[ator.id];
    if (ator.lado === 'inimigo' && dificil) dano *= 1.2;
    dano = Math.max(1, Math.round(dano));
    r.dano = dano;
    aplicarDano(alvo, dano, r);
    if (alvo.lado === 'heroi') estressar(alvo, 3); // apanhar também cansa a cabeça

    // Escudo do inimigo
    if (alvo.lado === 'inimigo' && alvo.condicao === 'ok' && !alvo.quebrado && !r.resistiu) {
      const tira = (hab.quebra || 1) * (r.fraco ? 2 : 1);
      alvo.quebra = Math.max(0, alvo.quebra - tira);
      r.escudo = tira;
      if (alvo.quebra === 0) quebrar(alvo, ator, r);
    }

    // Crítico mexe com a cabeça
    if (r.critico) {
      if (ator.lado === 'heroi') aliviar(ator, 5);
      else estressar(alvo, 10);
    }
  }

  function curar(ator, hab, alvo, r) {
    const quanto = Math.max(1, Math.round(hab.cura * ator[hab.stat || 'mag'] * 1.2 * entre(0.9, 1.1)));
    if (alvo.condicao === 'caido' || alvo.condicao === 'porta') {
      if (!hab.levanta && alvo.condicao === 'caido') return;
      alvo.condicao = 'ok';
      alvo.vida = Math.min(alvo.vidaMax, quanto);
      r.levantou = true;
      escrever(`🙌 ${alvo.nome} levantou!`, 'bom');
    } else {
      alvo.vida = Math.min(alvo.vidaMax, alvo.vida + quanto);
    }
    r.cura = quanto;
  }

  function colocarEfeito(alvo, ef, ator) {
    const atual = efeito(alvo, ef.tipo);
    const novo = { tipo: ef.tipo, turnos: ef.turnos, valor: ef.valor || 0, de: ator.id };
    if (atual) Object.assign(atual, novo);
    else alvo.efeitos.push(novo);
  }

  function invocar(ator, tipo, r) {
    if (times.inimigo.filter(dePe).length >= maxInimigos) {
      r.nada = true;
      escrever(`${ator.nome} chamou, mas não coube mais ninguém.`);
      return;
    }
    const novo = ajustar(criarInimigo(tipo, `inv${++contadorInvocados}`)); // invocado também fica mais fraco em grupo pequeno
    novo.efeitos = [];
    novo.prox = tempo + custo(novo);
    times.inimigo.push(novo);
    r.invocou = novo.id;
    escrever(`💀 ${ator.nome} chamou um ${novo.nome}!`, 'ruim');
  }

  // ---------- quais ações a unidade pode fazer agora ----------
  // Grupo pequeno: o último da fila conta como "lá atrás". Assim um Arcano
  // sozinho (posição 1 de 1) ainda usa as magias de quem fica atrás.
  function alcanca(lista, r, tamanho) {
    return lista.includes(r) || (r === tamanho && lista.some((x) => x > tamanho));
  }

  function alvosDe(u, hab) {
    const r = rank(u);
    switch (hab.alvo) {
      case 'inimigo': {
        const fila = formacao(outroLado(u.lado));
        return fila.filter((t) => alcanca(hab.em || [1, 2, 3, 4], rank(t), fila.length));
      }
      case 'aliado': {
        // quem pode levantar os caídos também enxerga eles
        let lista = times[u.lado].filter((t) => (hab.levanta ? t.condicao !== 'morto' : dePe(t)));
        if (hab.outro) lista = lista.filter((t) => t !== u);
        return lista;
      }
      case 'vizinho':
        return formacao(u.lado).filter((t) => Math.abs(rank(t) - r) === 1);
      default:
        return [];
    }
  }

  function precisaEscolherAlvo(hab) {
    return hab.alvo === 'inimigo' || hab.alvo === 'aliado' || hab.alvo === 'vizinho';
  }

  function acoesDe(u) {
    const ids = [...u.habilidades];
    if (u.lado === 'heroi') {
      ids.push('mover', 'defender');
      if (carga > 0 && vez?.u === u && vez.bonus) ids.unshift('resenha');
    }
    const r = rank(u);
    return ids.map((id) => {
      const hab = HABILIDADES[id];
      let usavel = alcanca(hab.de, r, formacao(u.lado).length);
      let motivo = usavel ? '' : `Só dá pra usar da posição ${hab.de.join(', ')} (você está na ${r}).`;
      const alvos = precisaEscolherAlvo(hab) ? alvosDe(u, hab) : [];
      if (usavel && precisaEscolherAlvo(hab) && !alvos.length) {
        usavel = false;
        motivo = 'Nenhum alvo ao alcance.';
      }
      return { id, usavel, motivo, alvos: alvos.map((t) => t.id), precisaAlvo: precisaEscolherAlvo(hab) };
    });
  }

  // ---------- turnos ----------
  function passarAVez(u, peso = 1) {
    u.prox = tempo + custo(u, peso);
  }

  // Coisas que acontecem no começo da vez. Devolve false se ela perdeu a vez.
  function comecoDaVez(u) {
    const atordoado = !!efeito(u, 'atordoado');
    for (const e of u.efeitos) {
      if ((e.tipo === 'veneno' || e.tipo === 'sangra') && dePe(u)) {
        escrever(`${e.tipo === 'veneno' ? '🟢' : '🩸'} ${u.nome} perdeu ${e.valor} de vida (${e.tipo === 'veneno' ? 'veneno' : 'sangramento'}).`);
        aplicarDano(u, e.valor, null);
      }
    }
    // os efeitos contam os turnos de quem está com eles
    for (const e of u.efeitos) e.turnos--;
    u.efeitos = u.efeitos.filter((e) => e.turnos > 0 && e.tipo !== 'atordoado');
    if (!dePe(u)) return false;

    if (u.quebrado) {
      u.quebrado = false;
      u.quebra = u.quebraMax;
      escrever(`🔄 ${u.nome} se recuperou da quebra (perdeu a vez).`);
      passarAVez(u);
      return false;
    }
    if (atordoado) {
      escrever(`💫 ${u.nome} está atordoado e perdeu a vez.`);
      passarAVez(u);
      return false;
    }
    if (u.mente === 'abalado' && chance(30)) {
      const outros = formacao('heroi').filter((h) => h !== u);
      if (outros.length) {
        const vitima = sortear(outros);
        escrever(`💬 ${u.nome} (abalado): "A gente não vai sair daqui vivo..." ${vitima.nome} ficou mais estressado.`, 'ruim');
        estressar(vitima, 7);
      }
    }
    return true;
  }

  function escolherProximo() {
    while (fila.length) {
      const b = fila.shift();
      const u = porId(b.id);
      if (u && dePe(u)) return { u, bonus: true, motivo: b.motivo };
    }
    const candidatos = todas().filter(dePe);
    if (!candidatos.length) return null;
    candidatos.sort((a, b) => a.prox - b.prox || (a.lado === 'heroi' ? -1 : 1) || vel(b) - vel(a));
    const u = candidatos[0];
    tempo = u.prox;
    return { u, bonus: false };
  }

  function verificarFim() {
    if (resultado) return;
    if (!formacao('inimigo').length) {
      resultado = 'vitoria';
      fila.length = 0;
      escrever('🏆 Vitória!', 'bom');
    } else if (!formacao('heroi').length) {
      resultado = 'derrota';
      fila.length = 0;
      escrever('💀 O grupo caiu...', 'ruim');
    }
  }

  // Anda até a próxima unidade que precisa decidir alguma coisa
  function avancar() {
    vez = null;
    for (let i = 0; i < 500 && !resultado; i++) {
      const prox = escolherProximo();
      if (!prox) break;
      // a carga do Ataque da Resenha só vale durante as ações bônus da Sintonia
      if (!prox.bonus) carga = 0;
      if (!prox.bonus && !comecoDaVez(prox.u)) {
        verificarFim();
        continue;
      }
      vez = prox;
      if (prox.bonus) escrever(`➕ Ação bônus de ${prox.u.nome}${prox.motivo === 'sintonia' ? ' (Sintonia)' : ''}.`);
      return vez;
    }
    verificarFim();
    return null;
  }

  function agir(atorId, habId, alvoId) {
    if (resultado) return { ok: false, erro: 'A batalha já acabou.' };
    if (!vez || vez.u.id !== atorId) return { ok: false, erro: 'Não é a vez dele.' };
    const u = vez.u;
    const op = acoesDe(u).find((o) => o.id === habId);
    if (!op) return { ok: false, erro: 'Ele não sabe essa habilidade.' };
    if (!op.usavel) return { ok: false, erro: op.motivo };
    const hab = HABILIDADES[habId];

    let alvos;
    if (op.precisaAlvo) {
      if (!op.alvos.includes(alvoId)) return { ok: false, erro: 'Esse alvo não está ao alcance.' };
      alvos = [porId(alvoId)];
    } else if (hab.alvo === 'eu') alvos = hab.invocar ? [] : [u];
    else if (hab.alvo === 'todosInimigos') alvos = formacao(outroLado(u.lado));
    else if (hab.alvo === 'todosAliados') alvos = formacao(u.lado);
    else alvos = [];

    seq++;
    const resultados = [];
    cena = { seq, ator: u.id, hab: habId, nome: hab.nome, bonus: vez.bonus, alvos: resultados };

    if (habId === 'mover') {
      const fila_ = times[u.lado];
      const a = fila_.indexOf(u);
      const b = fila_.indexOf(alvos[0]);
      [fila_[a], fila_[b]] = [fila_[b], fila_[a]];
      escrever(`↔️ ${u.nome} trocou de lugar com ${alvos[0].nome}.`);
      resultados.push({ id: alvos[0].id, moveu: true });
    } else {
      escrever(`${hab.icone || '•'} ${u.nome} usou ${hab.nome}.`);
      if (habId === 'resenha') carga = 0;
      for (const t of alvos) {
        if (!dePe(t) && !(hab.levanta && t.condicao === 'caido')) continue;
        const r = { id: t.id };
        if (hab.poder || hab.especial) golpear(u, hab, t, r);
        if (hab.cura) curar(u, hab, t, r);
        if (hab.aliviar) {
          aliviar(t, hab.aliviar);
          r.aliviou = hab.aliviar;
        }
        if (!r.errou) {
          if (hab.estresse) r.estresse = estressar(porId(r.id), hab.estresse);
          const lista = hab.efeitos || (hab.efeito ? [hab.efeito] : []);
          for (const ef of lista) {
            const alvoEf = porId(r.id);
            if (!dePe(alvoEf)) continue;
            if (ef.chance && !chance(ef.chance)) continue;
            colocarEfeito(alvoEf, ef, u);
            (r.efeitos ||= []).push(ef.tipo);
          }
          if (hab.revelar) {
            for (const el of [...t.fraquezas, ...t.resiste]) revelar(t, el);
            r.revelou = true;
            escrever(`🔍 Fraquezas de ${t.nome}: ${t.fraquezas.join(', ') || 'nenhuma'}.`);
          }
        }
        if (r.errou) escrever(`💨 ${u.nome} errou ${porId(r.id).nome}.`);
        resultados.push(r);
      }
      if (hab.invocar) {
        const r = { id: u.id };
        invocar(u, hab.invocar, r);
        resultados.push(r);
      }
    }

    if (!vez.bonus) passarAVez(u, hab.peso || 1);
    vez = null;
    verificarFim();
    if (!resultado) avancar();
    return { ok: true };
  }

  // ---------- "inteligência" de quem não tem jogador ----------
  function pontuarAlvo(hab, t) {
    let p = 1 + (1 - t.vida / t.vidaMax) * 2;
    if (t.lado === 'inimigo') {
      if (hab.elemento && t.revelado.includes(hab.elemento) && t.fraquezas.includes(hab.elemento)) p += 3;
      if (hab.elemento && t.revelado.includes(hab.elemento) && t.resiste.includes(hab.elemento)) p -= 2;
      if (t.quebrado) p += 1.5;
      if (t.chefe) p += 0.5;
    }
    return p;
  }

  function decidir(u) {
    const ops = acoesDe(u).filter((o) => o.usavel);
    const habDe = (o) => HABILIDADES[o.id];

    if (u.lado === 'inimigo') {
      const usaveis = ops.filter((o) => {
        const h = habDe(o);
        if (h.cura) return o.alvos.some((id) => porId(id).vida < porId(id).vidaMax * 0.6);
        if (h.invocar) return formacao('inimigo').length < maxInimigos;
        return true;
      });
      if (!usaveis.length) return null;
      // sorteia uma habilidade (algumas têm menos chance)
      const total = usaveis.reduce((t, o) => t + (habDe(o).chanceIA ?? 1), 0);
      let sorte = rng() * total;
      let escolhida = usaveis[usaveis.length - 1];
      for (const o of usaveis) {
        sorte -= habDe(o).chanceIA ?? 1;
        if (sorte <= 0) {
          escolhida = o;
          break;
        }
      }
      const h = habDe(escolhida);
      if (!escolhida.precisaAlvo) return { hab: escolhida.id };
      const alvos = escolhida.alvos.map(porId);
      if (h.cura) return { hab: escolhida.id, alvo: alvos.sort((a, b) => a.vida / a.vidaMax - b.vida / b.vidaMax)[0].id };
      const provocando = alvos.filter((t) => efeito(t, 'provocando'));
      if (provocando.length && chance(75)) return { hab: escolhida.id, alvo: provocando[0].id };
      const pesos = alvos.map((t) => pontuarAlvo(h, t));
      let s = rng() * pesos.reduce((a, b) => a + b, 0);
      for (let i = 0; i < alvos.length; i++) {
        s -= pesos[i];
        if (s <= 0) return { hab: escolhida.id, alvo: alvos[i].id };
      }
      return { hab: escolhida.id, alvo: alvos[0].id };
    }

    // Herói no automático: cura quem está mal, senão bate onde dói mais
    if (ops.some((o) => o.id === 'resenha')) return { hab: 'resenha' };
    const cura = ops.find((o) => habDe(o).cura);
    if (cura) {
      const mal = cura.alvos.map(porId).filter((t) => t.condicao !== 'ok' || t.vida < t.vidaMax * 0.45);
      if (mal.length) return { hab: cura.id, alvo: mal.sort((a, b) => a.vida - b.vida)[0].id };
    }
    const alivio = ops.find((o) => habDe(o).aliviar);
    if (alivio && formacao('heroi').some((h) => h.estresse >= 60)) return { hab: alivio.id };
    let melhor = null;
    for (const o of ops) {
      const h = habDe(o);
      if (!h.poder) continue;
      if (h.alvo === 'todosInimigos') {
        const p = formacao('inimigo').reduce((t, x) => t + pontuarAlvo(h, x), 0) * h.poder * 0.8;
        if (!melhor || p > melhor.p) melhor = { p, hab: o.id };
        continue;
      }
      for (const id of o.alvos) {
        const p = pontuarAlvo(h, porId(id)) * h.poder;
        if (!melhor || p > melhor.p) melhor = { p, hab: o.id, alvo: id };
      }
    }
    if (melhor) return { hab: melhor.hab, alvo: melhor.alvo };
    const mover = ops.find((o) => o.id === 'mover');
    if (mover) return { hab: 'mover', alvo: mover.alvos[0] };
    return { hab: 'defender' };
  }

  // Faz a vez de quem está jogando agora sozinho (inimigo, ou herói no automático)
  function agirSozinho() {
    if (!vez) return { ok: false, erro: 'Ninguém na vez.' };
    const u = vez.u;
    const d = decidir(u);
    if (d) {
      const r = agir(u.id, d.hab, d.alvo);
      if (r.ok) return r;
    }
    // não tinha nada pra fazer (fora de posição): avança uma casa ou passa
    seq++;
    cena = { seq, ator: u.id, hab: null, nome: 'Esperou', alvos: [] };
    const frente = formacao(u.lado)[rank(u) - 2];
    if (frente) {
      const f = times[u.lado];
      const a = f.indexOf(u);
      const b = f.indexOf(frente);
      [f[a], f[b]] = [f[b], f[a]];
      escrever(`↔️ ${u.nome} avançou.`);
    } else escrever(`${u.nome} esperou.`);
    passarAVez(u);
    vez = null;
    avancar();
    return { ok: true };
  }

  // Próximas vezes (pra desenhar a linha do tempo no topo da tela)
  function linhaDoTempo(n = 10) {
    const saida = [];
    if (vez) saida.push({ id: vez.u.id, bonus: vez.bonus, agora: true });
    for (const f of fila) if (saida.length < n) saida.push({ id: f.id, bonus: true });
    const sim = todas()
      .filter(dePe)
      .map((u) => ({ u, t: vez && !vez.bonus && vez.u === u ? tempo + custo(u) : u.prox, quebrado: u.quebrado }));
    while (saida.length < n && sim.length) {
      sim.sort((a, b) => a.t - b.t || (a.u.lado === 'heroi' ? -1 : 1));
      const s = sim[0];
      saida.push({ id: s.u.id, quebrado: s.quebrado });
      s.quebrado = false;
      s.t += custo(s.u);
    }
    return saida;
  }

  // Terminou a sala: limpa o que é só da batalha
  function encerrar() {
    for (const h of times.heroi) {
      h.efeitos = [];
      delete h.prox;
      if (h.condicao === 'caido') {
        h.condicao = 'ok';
        h.vida = Math.max(1, Math.round(h.vidaMax * 0.25));
      } else if (h.condicao === 'porta') {
        h.condicao = 'ok';
        h.vida = Math.max(1, Math.round(h.vidaMax * 0.1));
      }
    }
  }

  avancar();

  return {
    times,
    rank,
    acoesDe,
    agir,
    agirSozinho,
    decidir,
    linhaDoTempo,
    encerrar,
    get vez() {
      return vez;
    },
    get cena() {
      return cena;
    },
    get log() {
      return log;
    },
    get carga() {
      return carga;
    },
    get resultado() {
      return resultado;
    },
  };
}

module.exports = { criarBatalha, criarInimigo };
