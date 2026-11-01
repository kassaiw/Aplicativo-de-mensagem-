'use strict';
/*
 * =================================================================
 *  CONSTRUIR PERSONAGEM — a tela (parte do navegador)
 * =================================================================
 *  Fases: lobby → montagem (girar e colocar) → batalha → loja → ... → fim
 *  A roleta é só animação: quem decide o personagem é o servidor.
 *  Os números de um personagem só aparecem DEPOIS que você coloca ele
 *  num atributo: a graça é pensar "ele é forte? é rápido?".
 * =================================================================
 */
const construir = {
  ultimoGiro: null, // pra saber quando um giro novo chegou e animar
  animandoAte: 0,
  intervalo: null,
  ultimoTurno: {}, // batalha -> último turno animado
};

const corRaridade = (j, id) => j.raridades.find((r) => r.id === id)?.cor || '#9aa0aa';
const nomeRaridade = (j, id) => j.raridades.find((r) => r.id === id)?.nome || id;
const jogadorDe = (j, cid) => j.jogadores.find((x) => x.cid === cid);

function seloRaridade(j, id) {
  const s = el('span', 'selo-raridade r-' + id, nomeRaridade(j, id));
  s.style.setProperty('--cor', corRaridade(j, id));
  return s;
}

// ---------- roleta (só animação) ----------
function animarRoleta() {
  clearInterval(construir.intervalo);
  const lista = jogos.listas.construir || [];
  construir.intervalo = setInterval(() => {
    if (Date.now() >= construir.animandoAte) {
      clearInterval(construir.intervalo);
      if (estado.visao === 'jogos') renderizarJogos();
      return;
    }
    const img = document.getElementById('fotoRoleta');
    if (img && lista.length) {
      const p = lista[Math.floor(Math.random() * lista.length)];
      img.src = p.img;
      img.closest('.giro')?.style.setProperty('--cor', corRaridade(jogos.estado, p.r));
    }
  }, 80);
}

function verificarGiro(j) {
  const giro = j.eu?.giro ?? 0;
  if (construir.ultimoGiro === null || j.fase === 'lobby') {
    construir.ultimoGiro = giro;
    return;
  }
  if (giro > construir.ultimoGiro) {
    construir.ultimoGiro = giro;
    construir.animandoAte = Date.now() + 1100;
    animarRoleta();
  }
}
const girando = () => Date.now() < construir.animandoAte;

// O personagem que saiu no giro: foto grande, nome e raridade (sem números!)
function cartaGiro(j, p) {
  const caixa = el('div', 'giro');
  if (girando()) {
    const img = document.createElement('img');
    img.id = 'fotoRoleta';
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.src = (jogos.listas.construir || [])[0]?.img || '';
    caixa.classList.add('girando');
    caixa.append(img, el('strong', 'nome-giro', '🎲 Girando…'));
    return caixa;
  }
  if (!p) {
    caixa.classList.add('vazio');
    caixa.append(el('div', 'interrogacao', '?'), el('strong', 'nome-giro', 'Gire pra tirar um personagem'));
    return caixa;
  }
  caixa.classList.add('saiu', 'r-' + p.raridade);
  caixa.style.setProperty('--cor', corRaridade(j, p.raridade));
  caixa.append(imagem(p.imagem, 'foto-giro'), seloRaridade(j, p.raridade), el('strong', 'nome-giro', p.nome), el('small', null, p.anime || ''));
  return caixa;
}

// Os 5 atributos do boneco, em cartas lado a lado
function cartasDoBoneco(j, x, opcoes = {}) {
  const linha = el('div', 'slots-construir');
  for (const a of j.atributos) {
    const s = x.slots[a.id];
    const carta = el('div', 'slot');
    const cab = el('div', 'cab-slot');
    cab.append(el('span', null, a.emoji), el('span', 'nome-slot', a.nome));
    carta.append(cab);
    if (s) {
      const p = s.personagem;
      carta.classList.add('cheio');
      carta.style.setProperty('--cor', corRaridade(j, p.raridade));
      carta.append(imagem(p.imagem, 'foto-slot'), el('span', 'quem-slot', p.nome), el('span', 'valor-slot', String(s.efetivo)));
      if (opcoes.loja) {
        const acoes = el('div', 'acoes-slot');
        const treinar = botao(`🏋️ +${j.treino} · ${j.precos.treinar}🪙`, 'secundario', () => acaoJogo({ acao: 'treinar', atributo: a.id }));
        treinar.disabled = j.eu.moedas < j.precos.treinar;
        treinar.title = 'Treinar: aumenta esse atributo';
        const trocar = botao(`🎲 Trocar · ${j.precos.regirar}🪙`, 'secundario', () => acaoJogo({ acao: 'regirarSlot', atributo: a.id }));
        trocar.disabled = j.eu.moedas < j.precos.regirar;
        trocar.title = 'Girar um personagem novo pra esse atributo';
        acoes.append(treinar, trocar);
        carta.append(acoes);
      }
    } else {
      carta.append(el('div', 'vazio-slot', a.emoji));
      if (opcoes.pendente && !girando()) {
        carta.classList.add('pode');
        carta.append(el('span', 'quem-slot', 'Colocar aqui'));
        carta.onclick = () => acaoJogo({ acao: 'colocar', atributo: a.id });
      } else carta.append(el('span', 'quem-slot vazio', 'vazio'));
    }
    linha.append(carta);
  }
  return linha;
}

function galera(j) {
  const lista = el('div', 'galera-construir');
  for (const x of j.jogadores) {
    if (x.cid === minhaCid()) continue;
    const cheias = Object.values(x.slots).filter(Boolean).length;
    const item = el('div', 'item-galera' + (x.pronto ? ' pronto' : ''));
    const texto = j.fase === 'montagem' ? `${cheias}/5` : j.fase === 'loja' ? (x.pronto ? '✔ pronto' : 'na loja') : `${x.vitorias} vitória${x.vitorias === 1 ? '' : 's'}`;
    item.append(criarAvatar(x.nome, x.cor, x.avatar), el('strong', null, x.nome), el('small', null, texto));
    lista.append(item);
  }
  return lista;
}

function topoConstruir(j, titulo, extra) {
  const topo = el('div', 'topo-construir');
  topo.append(el('h3', null, titulo));
  if (extra) topo.append(el('span', 'extra-topo', extra));
  if (j.prazo) topo.append(relogioPrazo(j.prazo));
  return topo;
}

// ---------- montagem ----------
function montagemConstruir(corpo, j) {
  const eu = jogadorDe(j, minhaCid());
  if (!eu) {
    corpo.append(topoConstruir(j, '🎲 A galera está montando os bonecos'), galera(j));
    return;
  }
  const cheias = Object.values(eu.slots).filter(Boolean).length;
  corpo.append(topoConstruir(j, '🎲 Monte seu personagem', `${cheias} de 5`));
  const pendente = j.eu.pendente;
  corpo.append(cartasDoBoneco(j, eu, { pendente }));

  const area = el('div', 'area-giro');
  area.append(cartaGiro(j, pendente));
  const lado = el('div', 'lado-giro');
  if (cheias === 5) {
    lado.append(el('p', 'pronto-construir', '✔ Boneco pronto! Esperando a galera…'));
  } else if (!pendente) {
    lado.append(el('p', 'dica', 'Gire e veja quem sai.'), botao('🎲 Girar', 'primario grande', () => acaoJogo({ acao: 'girar' })));
  } else if (!girando()) {
    lado.append(el('p', 'explica-giro', 'Em qual atributo ele fica? Clique numa carta vazia lá em cima.'), el('p', 'dica', 'Pense: ele é forte? É rápido? É esperto? Os números só aparecem depois.'));
    if (j.eu.regiros > 0) lado.append(botao(`🔄 Não quero esse (${j.eu.regiros})`, 'secundario', () => acaoJogo({ acao: 'regirar' })));
  }
  area.append(lado);
  corpo.append(area);
  const outros = galera(j);
  if (outros.children.length) corpo.append(el('h4', 'subtitulo', 'A galera'), outros);
}

// ---------- batalha ----------
function lutador(j, b, cid, lado) {
  const x = jogadorDe(j, cid);
  const c = el('div', 'lutador ' + lado);
  c.dataset.cid = cid;
  const rosto = x.rosto && x.slots[x.rosto]?.personagem;
  if (rosto) {
    const img = imagem(rosto.imagem, 'rosto-luta');
    img.style.borderColor = corRaridade(j, rosto.raridade);
    c.append(img);
  }
  const nome = el('strong', 'nome-lutador', x.nome);
  nome.style.color = x.cor;
  c.append(nome, el('small', null, `Nível ${x.nivel}`));
  const vida = el('div', 'barra-rpg b-vida');
  const cheio = el('div', 'cheio');
  cheio.style.width = (b.hp[cid] / b.hpMax[cid]) * 100 + '%';
  vida.append(cheio, el('span', null, `${b.hp[cid]}/${b.hpMax[cid]}`));
  const energia = el('div', 'energia-luta');
  for (let i = 0; i < 3; i++) energia.append(el('span', i < b.energia[cid] ? 'cheia' : '', '⚡'));
  energia.title = 'Energia (o Especial gasta 2)';
  c.append(vida, energia);
  if (b.vencedor === cid) c.append(el('strong', 'venceu', '🏆 VENCEU'));
  else if (!b.vencedor && b.escolheu[cid] && lado === 'rival') c.append(el('small', 'escolheu', '✔ já escolheu'));
  return c;
}

function animarTurno(b) {
  const u = b.ultimo;
  if (!u) return;
  if (construir.ultimoTurno[b.id] === undefined) {
    construir.ultimoTurno[b.id] = u.turno;
    return;
  }
  if (construir.ultimoTurno[b.id] === u.turno) return;
  construir.ultimoTurno[b.id] = u.turno;
  requestAnimationFrame(() => {
    for (const ev of u.eventos) {
      const carta = document.querySelector(`#areaJogos .lutador[data-cid="${CSS.escape(ev.alvo)}"]`);
      document.querySelector(`#areaJogos .lutador[data-cid="${CSS.escape(ev.quem)}"]`)?.classList.add('ataca');
      if (!carta) continue;
      if (ev.esquivou) numeroFlutuante(carta, 'DESVIOU', 'errou');
      else {
        carta.classList.add('apanhou');
        numeroFlutuante(carta, `-${ev.dano}${ev.critico ? '!' : ''}`, 'dano' + (ev.critico ? ' critico' : ''));
      }
    }
  });
}

const GOLPES = [
  ['ataque', '⚔️', 'Ataque', 'Bate com a Força'],
  ['defesa', '🛡️', 'Defesa', 'Segura o Ataque'],
  ['especial', '🌀', 'Especial', 'Fura a Defesa · 2 ⚡'],
];

function batalhaConstruir(corpo, j) {
  corpo.append(topoConstruir(j, `⚔️ Luta ${j.rodada} de ${j.totalRodadas}`));
  const minha = j.batalhas.find((b) => b.a === minhaCid() || b.b === minhaCid());
  if (j.folga === minhaCid()) corpo.append(el('p', 'faixa-jogo', '😴 Você ficou de folga nessa rodada e ganhou moedas.'));
  if (minha) {
    const rival = minha.a === minhaCid() ? minha.b : minha.a;
    const arena = el('div', 'arena-construir');
    arena.append(lutador(j, minha, minhaCid(), 'eu'), el('div', 'versus', 'VS'), lutador(j, minha, rival, 'rival'));
    corpo.append(arena);
    animarTurno(minha);
    if (!minha.vencedor) {
      const escolha = minha.minhaEscolha;
      const cab = el('div', 'cab-golpes');
      cab.append(el('strong', null, escolha ? '⏳ Esperando o rival…' : `Turno ${minha.turno}: escolha seu golpe`), relogioPrazo(minha.prazo));
      corpo.append(cab);
      const acoes = el('div', 'golpes-construir');
      for (const [id, icone, nome, dica] of GOLPES) {
        const b = el('button', 'golpe' + (escolha === id ? ' escolhido' : ''));
        b.type = 'button';
        b.disabled = !!escolha || (id === 'especial' && minha.energia[minhaCid()] < 2);
        b.append(el('span', 'icone-golpe', icone), el('strong', null, nome), el('small', null, dica));
        b.onclick = () => acaoJogo({ acao: 'golpe', golpe: id });
        acoes.append(b);
      }
      corpo.append(acoes);
    } else {
      const ganhei = minha.vencedor === minhaCid();
      corpo.append(el('p', 'faixa-jogo ' + (ganhei ? 'vitoria' : 'derrota'), ganhei ? '🏆 Você venceu! Esperando as outras lutas…' : '💀 Perdeu essa. Na loja dá pra melhorar o boneco!'));
    }
    const ultimo = minha.log[minha.log.length - 1];
    if (ultimo) corpo.append(el('p', 'ultimo-lance', ultimo));
  }
  const outras = j.batalhas.filter((b) => b !== minha);
  if (outras.length) {
    corpo.append(el('h4', 'subtitulo', minha ? 'Outras lutas' : 'Lutas rolando'));
    const lista = el('div', 'outras-lutas');
    for (const b of outras) {
      const linha = el('div', 'linha-luta');
      for (const cid of [b.a, b.b]) {
        const x = jogadorDe(j, cid);
        linha.append(el('span', null, `${b.vencedor === cid ? '🏆 ' : ''}${x.nome} · ${b.hp[cid]}/${b.hpMax[cid]}`));
      }
      lista.append(linha);
    }
    corpo.append(lista);
  }
}

// ---------- loja ----------
function lojaConstruir(corpo, j) {
  const eu = jogadorDe(j, minhaCid());
  if (!eu) {
    corpo.append(topoConstruir(j, '🛒 A galera está na loja'), galera(j));
    return;
  }
  corpo.append(topoConstruir(j, '🛒 Loja', `🪙 ${j.eu.moedas} moedas`));
  if (j.eu.oferta || girando()) {
    const o = j.eu.oferta;
    const at = o && j.atributos.find((a) => a.id === o.atributo);
    const area = el('div', 'area-giro');
    area.append(cartaGiro(j, girando() ? null : o?.personagem));
    if (o && !girando()) {
      const lado = el('div', 'lado-giro');
      const atual = eu.slots[o.atributo];
      lado.append(el('p', 'explica-giro', `${at.emoji} ${at.nome}: trocar ${atual.personagem.nome} (${atual.efetivo}) por esse?`), el('p', 'dica', 'O número dele só aparece se você trocar.'));
      const b = el('div', 'botoes-decisao');
      b.append(botao('✔ Trocar', 'primario grande', () => acaoJogo({ acao: 'decidir', trocar: true })), botao('✘ Manter', 'secundario grande', () => acaoJogo({ acao: 'decidir', trocar: false })));
      lado.append(b);
      area.append(lado);
    }
    corpo.append(area);
    return;
  }
  corpo.append(cartasDoBoneco(j, eu, { loja: true }));
  const fim = el('div', 'botoes-centro');
  fim.append(eu.pronto ? el('p', 'pronto-construir', '✔ Pronto! Esperando a galera…') : botao('Pronto pra próxima luta', 'primario grande', () => acaoJogo({ acao: 'pronto' })));
  corpo.append(fim);
  const outros = galera(j);
  if (outros.children.length) corpo.append(el('h4', 'subtitulo', 'A galera'), outros);
}

// ---------- fim ----------
function fimConstruir(corpo, j) {
  const fim = el('div', 'fim-quiz');
  fim.append(el('h3', null, '🏆 Fim das lutas!'));
  const podio = el('div', 'podio-quiz');
  j.classificacao.forEach((x, i) => {
    const p = el('div', 'lugar' + (i === 0 ? ' primeiro' : ''));
    p.append(el('span', 'medalha', ['🥇', '🥈', '🥉'][i] || `${i + 1}º`), criarAvatar(x.nome, x.cor, x.avatar), el('strong', null, x.nome), el('small', null, `${x.vitorias} vitórias · nível ${x.nivel}`));
    podio.append(p);
  });
  fim.append(podio);
  for (const x of j.jogadores) {
    const bloco = el('div', 'boneco-fim');
    const nome = el('strong', null, `${x.nome} · poder ${x.poder}`);
    nome.style.color = x.cor;
    bloco.append(nome, cartasDoBoneco(j, x));
    fim.append(bloco);
  }
  if (j.dentro) fim.append(botao('Jogar de novo', 'primario grande', () => acaoJogo({ acao: 'denovo' })));
  corpo.append(fim);
}

function desenharConstruir(corpo, j) {
  carregarLista('construir');
  verificarGiro(j);
  if (j.fase === 'lobby') {
    const raridades = el('div', 'raridades-lobby');
    for (const r of j.raridades) {
      const s = seloRaridade(j, r.id);
      s.textContent = `${r.nome} ${r.chance}%`;
      raridades.append(s);
    }
    telaLobby(
      corpo,
      j,
      'Gire personagens de anime e coloque cada um num atributo do seu boneco: 💪 Força, ⚡ Velocidade, 🛡️ Resistência, 🧠 Inteligência, 🎯 Habilidade. Depois tem luta 1 contra 1. Quem vence ganha moedas e sobe de nível. Precisa de 2 pessoas ou mais.',
      raridades
    );
    return;
  }
  const tela = el('div', 'construir');
  const telas = { montagem: montagemConstruir, batalha: batalhaConstruir, loja: lojaConstruir, fim: fimConstruir };
  telas[j.fase]?.(tela, j);
  corpo.append(tela);
}
