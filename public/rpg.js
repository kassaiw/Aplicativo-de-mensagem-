'use strict';
/*
 * =================================================================
 *  MASMORRA — a tela do RPG (parte do navegador)
 * =================================================================
 *  O servidor manda o estado (quem está na vez, vida de todo mundo,
 *  o que acabou de acontecer...) e aqui a gente só DESENHA.
 *  Quando você clica numa habilidade e num alvo, mandamos a ação
 *  pro servidor, que confere as regras e avisa todo mundo.
 *
 *  Usa as funções do app.js e do jogos.js: el, botao, acaoJogo,
 *  criarAvatar, toast, agoraServidor, renderizarJogos...
 *
 *  Mapa:
 *    1. Sprites (os desenhos)
 *    2. Peças da tela (unidade, barras, linha do tempo)
 *    3. Telas: lobby, batalha, entre salas, acampamento, fim
 *    4. Animações e relógio
 * =================================================================
 */
const rpg = {
  urls: {}, // sprite -> endereço da imagem
  personalizados: new Set(), // sprites que você desenhou (PNG em public/rpg/sprites)
  selecionada: null, // habilidade escolhida, esperando você clicar no alvo
  chaveVez: '', // pra saber quando a vez mudou
  ultimaCena: null, // última animação que já mostramos ("sala:número")
  vendo: null, // habilidade que você passou o mouse (mostra a descrição)
};

// =================================================================
// 1. SPRITES
// =================================================================
// Transforma as letrinhas do rpg-sprites.js numa imagem de verdade
function gerarSprite(id) {
  const linhas = RPG_SPRITES[id];
  if (!linhas) return '';
  const tela = document.createElement('canvas');
  tela.width = linhas[0].length;
  tela.height = linhas.length;
  const ctx = tela.getContext('2d');
  linhas.forEach((linha, y) => {
    [...linha].forEach((letra, x) => {
      const cor = RPG_PALETA[letra];
      if (!cor) return;
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return tela.toDataURL();
}

function urlSprite(id) {
  if (!rpg.urls[id]) rpg.urls[id] = rpg.personalizados.has(id) ? `/rpg/sprites/${id}.png` : gerarSprite(id);
  return rpg.urls[id];
}

function spriteRpg(id, classe) {
  const img = document.createElement('img');
  img.src = urlSprite(id);
  img.alt = '';
  img.draggable = false;
  img.className = 'sprite-rpg ' + (classe || '');
  return img;
}

// Pergunta pro servidor quais desenhos seus existem na pasta
fetch('/api/rpg/sprites')
  .then((r) => r.json())
  .then((d) => {
    for (const nome of d.sprites || []) rpg.personalizados.add(nome);
    rpg.urls = {};
    if (jogos.estado?.tipo === 'masmorra' && estado.visao === 'jogos') renderizarJogos();
  })
  .catch(() => {});

// =================================================================
// 2. PEÇAS DA TELA
// =================================================================
const spriteDe = (u) => (u.lado === 'heroi' ? u.classe : u.tipo);
const nomeClasse = (j, classe) => j.dados.classes[classe]?.nome || classe;

function todasUnidades(j) {
  return [...(j.herois || []), ...(j.inimigos || [])];
}

function unidadePorId(j, id) {
  return todasUnidades(j).find((u) => u.id === id);
}

function barra(valor, max, classe, texto) {
  const b = el('div', 'barra-rpg ' + classe);
  const cheio = el('div', 'cheio');
  cheio.style.width = Math.max(0, Math.min(100, (valor / max) * 100)) + '%';
  b.append(cheio, el('span', null, texto ?? `${valor}/${max}`));
  return b;
}

function trilhaDasSalas(j) {
  const trilha = el('div', 'trilha-rpg');
  j.dados.salas.forEach((s, i) => {
    const icone = s.tipo === 'acampamento' ? '🔥' : s.tipo === 'chefe' ? '👑' : '⚔️';
    const passo = el('div', 'passo-rpg' + (i < j.salaAtual ? ' feito' : i === j.salaAtual ? ' atual' : ''));
    passo.append(el('span', 'icone', i < j.salaAtual ? '✔' : icone), el('span', 'nome', s.nome));
    passo.title = s.nome;
    trilha.append(passo);
  });
  const info = el('div', 'info-trilha');
  const pessoas = Math.max(1, j.herois.filter((h) => !h.ajudante).length || j.jogadores.length);
  info.append(el('span', null, `💰 ${j.ouro}` + (pessoas > 1 ? ` (${Math.floor(j.ouro / pessoas)} pra cada)` : '')), el('span', 'modo-rpg ' + j.modo, j.modo === 'dificil' ? '☠️ Difícil' : '🙂 Normal'));
  trilha.append(info);
  return trilha;
}

function iconesEfeitos(j, u) {
  const linha = el('div', 'efeitos-rpg');
  for (const e of u.efeitos || []) {
    const info = j.dados.efeitos[e.tipo];
    if (!info) continue;
    const s = el('span', 'efeito', info.icone);
    s.title = `${info.nome} (${e.turnos} ${e.turnos === 1 ? 'turno' : 'turnos'}): ${info.descricao}`;
    linha.append(s);
  }
  if (u.mente === 'inspirado') linha.append(Object.assign(el('span', 'efeito mente-bom', '✨'), { title: 'Inspirado: +20% de dano e mais crítico.' }));
  if (u.mente === 'abalado') linha.append(Object.assign(el('span', 'efeito mente-ruim', '💢'), { title: 'Abalado: −20% de dano, mais lento e estressa os amigos. Baixe o estresse pra menos de 40 pra ele se acalmar.' }));
  return linha;
}

// Escudo + fraquezas que o time já descobriu
function infoInimigo(j, u) {
  const caixa = el('div', 'info-inimigo');
  const escudo = el('div', 'escudo-rpg' + (u.quebrado ? ' quebrado' : ''));
  escudo.textContent = u.quebrado ? '💥 QUEBRADO' : `🛡️ ${u.quebra}`;
  escudo.title = u.quebrado ? 'Quebrado: perde a próxima vez e leva +50% de dano.' : `Escudo: ${u.quebra} de ${u.quebraMax}. Zerou = quebra. Golpe na fraqueza tira o dobro.`;
  const fracas = el('div', 'fraquezas-rpg');
  for (const f of u.fraquezas) {
    const s = el('span', 'fraqueza' + (f ? '' : ' oculta'), f ? j.dados.elementos[f].icone : '?');
    s.title = f ? `Fraco contra ${j.dados.elementos[f].nome}` : 'Fraqueza escondida: descubra acertando ou com Analisar.';
    fracas.append(s);
  }
  for (const r of u.resiste) {
    const s = el('span', 'fraqueza resiste', j.dados.elementos[r].icone);
    s.title = `Resiste a ${j.dados.elementos[r].nome} (metade do dano, não tira escudo)`;
    fracas.append(s);
  }
  caixa.append(escudo, fracas);
  return caixa;
}

function cartaUnidade(j, u, alvos) {
  const carta = el('div', `unidade-rpg ${u.lado} ${u.condicao}`);
  carta.dataset.id = u.id;
  if (u.chefe) carta.classList.add('chefe');
  if (j.vez?.id === u.id) carta.classList.add('na-vez');
  if (u.dono && u.dono === minhaCid()) carta.classList.add('meu');
  if (u.quebrado) carta.classList.add('quebrado');

  if (alvos?.includes(u.id)) {
    carta.classList.add('alvo');
    carta.tabIndex = 0;
    carta.onclick = () => agirRpg(j, rpg.selecionada, u.id);
    carta.onkeydown = (e) => e.key === 'Enter' && carta.click();
  }

  if (u.rank > 0) {
    const pos = el('span', 'pos-rpg', String(u.rank));
    pos.title = `Posição ${u.rank}${u.rank === 1 ? ' (a da frente)' : ''}`;
    carta.append(pos);
  }
  carta.append(iconesEfeitos(j, u));
  if (u.lado === 'inimigo') carta.append(infoInimigo(j, u));
  const palco = el('div', 'palco-sprite');
  palco.append(spriteRpg(spriteDe(u), u.chefe ? 'grande' : ''));
  if (u.condicao === 'morto' && u.lado === 'heroi') palco.append(el('span', 'lapide', '🪦'));
  carta.append(palco);

  const nome = el('div', 'nome-rpg');
  const forte = el('strong', null, u.nome);
  if (u.lado === 'heroi' && !u.ajudante) forte.style.color = u.cor;
  nome.append(forte);
  if (u.lado === 'heroi') {
    const sub = u.ajudante ? '🤖 bot' : nomeClasse(j, u.classe) + (u.dono === minhaCid() ? ' · você' : '');
    nome.append(el('small', null, sub));
  }
  carta.append(nome);

  const textoVida = u.condicao === 'caido' ? 'CAÍDO' : u.condicao === 'porta' ? 'PORTA DA MORTE' : u.condicao === 'morto' ? 'MORTO' : null;
  carta.append(barra(u.vida, u.vidaMax, 'b-vida', textoVida || undefined));
  if (u.lado === 'heroi') carta.append(barra(u.estresse, 100, 'b-estresse', `estresse ${u.estresse}`));
  return carta;
}

function linhaDoTempo(j) {
  const caixa = el('div', 'linha-rpg');
  caixa.append(el('span', 'rotulo-linha', 'Próximos'));
  const lista = el('div', 'fichas');
  for (const p of j.linha || []) {
    const u = unidadePorId(j, p.id);
    if (!u) continue;
    const ficha = el('div', `ficha-rpg ${u.lado}` + (p.agora ? ' agora' : '') + (p.bonus ? ' bonus' : '') + (p.quebrado ? ' pula' : ''));
    ficha.append(spriteRpg(spriteDe(u), 'mini'));
    if (p.bonus) ficha.append(el('span', 'marca', '+'));
    if (p.quebrado) ficha.append(el('span', 'marca', '💫'));
    ficha.title = u.nome + (p.bonus ? ' (ação bônus)' : '') + (p.quebrado ? ' (quebrado: vai perder a vez)' : '');
    lista.append(ficha);
  }
  caixa.append(lista);
  return caixa;
}

function relogioPrazo(prazo) {
  const s = el('span', 'rpg-prazo');
  s.dataset.prazo = prazo || 0;
  atualizarPrazo(s);
  return s;
}

// =================================================================
// 3. TELAS
// =================================================================
function desenharRpg(corpo, j) {
  const tela = el('div', 'rpg');
  const telas = { lobby: lobbyRpg, batalha: batalhaRpg, vitoriaSala: entreSalasRpg, acampamento: acampamentoRpg, fim: fimRpg };
  telas[j.fase]?.(tela, j);
  corpo.append(tela);
  if (j.fase === 'batalha') requestAnimationFrame(() => animarCena(j));
  else rpg.selecionada = null;
}

// ---------- Lobby ----------
function lobbyRpg(tela, j) {
  const minha = minhaCid();
  const eu = j.jogadores.find((x) => x.cid === minha);
  const caixa = el('div', 'lobby-rpg');
  const cab = el('div', 'cab-lobby-rpg');
  cab.append(
    el('h3', null, '🏰 Expedição à Cripta Esquecida'),
    el('p', null, `${j.dados.salas.length} salas até o chefe, com um acampamento no meio. Cada um escolhe uma classe e controla 1 herói.`),
    el('p', 'modo-explica ' + j.modo, j.modo === 'dificil' ? '☠️ Modo difícil: herói com vida 0 vai pra PORTA DA MORTE. Mais um golpe pode matar pra sempre.' : '🙂 Modo normal: herói com vida 0 só desmaia e levanta depois.')
  );
  caixa.append(cab);

  const grade = el('div', 'classes-rpg');
  for (const id of j.dados.ordemClasses) {
    const c = j.dados.classes[id];
    const dono = j.jogadores.find((x) => x.classe === id);
    const card = el('div', 'classe-rpg' + (dono?.cid === minha ? ' minha' : '') + (dono && dono.cid !== minha ? ' ocupada' : ''));
    const topo = el('div', 'topo-classe');
    topo.append(spriteRpg(id, ''));
    const titulo = el('div');
    titulo.append(el('h4', null, c.nome), el('small', null, `começa na posição ${c.posicao}`));
    topo.append(titulo);
    card.append(topo, el('p', null, c.descricao));
    const status = el('div', 'status-classe');
    for (const [rotulo, valor] of [['❤️', c.vida], ['⚔️', c.atq], ['🔮', c.mag], ['🛡️', c.def], ['💨', c.vel]]) status.append(el('span', null, `${rotulo} ${valor}`));
    status.title = 'Vida, Ataque, Magia, Defesa, Velocidade';
    card.append(status);
    const habs = el('div', 'habs-classe');
    for (const h of c.habilidades) {
      const info = j.dados.habilidades[h];
      const s = el('span', null, `${info.icone} ${info.nome}`);
      s.title = info.descricao;
      habs.append(s);
    }
    card.append(habs);
    const rodape = el('div', 'rodape-classe');
    if (dono) {
      rodape.append(pessoa(dono));
    } else {
      rodape.append(el('span', 'dica', j.bots ? '🤖 bot' : 'vazia'));
      rodape.append(botao(eu ? 'Trocar pra essa' : 'Escolher', 'primario', () => acaoJogo({ acao: 'classe', classe: id })));
    }
    card.append(rodape);
    grade.append(card);
  }
  caixa.append(grade);

  // Completar o grupo com bots?
  const vazias = j.dados.ordemClasses.length - j.jogadores.length;
  if (vazias > 0) {
    const bots = el('div', 'escolha-bots');
    bots.append(el('strong', null, `Sobraram ${vazias} vaga${vazias > 1 ? 's' : ''}. Completar com bots?`));
    const opcoes = el('div', 'botoes-bots');
    const sim = botao('🤖 Sim, com bots', j.bots ? 'primario' : 'secundario', () => acaoJogo({ acao: 'bots', ligado: true }));
    const nao = botao(`🙋 Não, só ${j.jogadores.length === 1 ? 'eu' : 'a gente'}`, j.bots ? 'secundario' : 'primario', () => acaoJogo({ acao: 'bots', ligado: false }));
    sim.disabled = nao.disabled = !eu;
    opcoes.append(sim, nao);
    bots.append(opcoes, el('small', null, j.bots ? 'Os bots jogam sozinhos, ninguém precisa clicar por eles.' : 'Grupo menor: menos inimigos e mais fracos, e uma cura depois de cada vitória.'));
    caixa.append(bots);
  }

  const botoes = el('div', 'botoes-centro');
  if (eu) botoes.append(botao('Sair do grupo', 'secundario', () => acaoJogo({ acao: 'sair' })), botao('Começar a expedição!', 'primario', () => acaoJogo({ acao: 'comecar' })));
  else botoes.append(botao('Entrar no grupo', 'primario', () => acaoJogo({ acao: 'entrar' })));
  caixa.append(botoes);

  const regras = el('details', 'regras-rpg');
  regras.append(el('summary', null, 'Como funciona o combate?'));
  for (const t of [
    '⏳ Linha do tempo: a fila lá em cima mostra quem joga depois. Quem é rápido joga mais vezes, e ações "rápidas" te fazem voltar antes.',
    '🛡️ Escudo: todo inimigo tem um escudo. Acertar a fraqueza dele tira o dobro. Zerou = QUEBROU: ele perde a vez, leva +50% de dano e quem quebrou ganha uma ação bônus.',
    '🌟 Sintonia: quebrou TODOS os inimigos de uma vez? O time inteiro ganha ação bônus e libera o Ataque da Resenha.',
    '📍 Posição: cada habilidade só funciona de certas posições (1 = frente). Use Mover pra trocar de lugar.',
    '😰 Estresse: apanhar, ver amigo cair e ataques sombrios estressam. No 100, o herói pode ficar Inspirado (bom) ou Abalado (ruim). O Bardo e a fogueira acalmam.',
  ])
    regras.append(el('p', null, t));
  caixa.append(regras);
  tela.append(caixa);
}

// ---------- Batalha ----------
function batalhaRpg(tela, j) {
  // Se a vez mudou, esquece a habilidade que estava selecionada
  const chave = j.vez ? `${j.vez.id}:${j.cena?.seq || 0}` : '';
  if (chave !== rpg.chaveVez) {
    rpg.chaveVez = chave;
    rpg.selecionada = null;
    rpg.vendo = null;
  }
  const acaoSelecionada = rpg.selecionada && j.acoes?.find((a) => a.id === rpg.selecionada);
  const alvos = acaoSelecionada ? acaoSelecionada.alvos : null;

  tela.append(trilhaDasSalas(j), linhaDoTempo(j));

  const campo = el('div', 'campo-rpg' + (alvos ? ' escolhendo' : ''));
  const ladoHerois = el('div', 'lado-rpg herois');
  // posição 1 fica perto do meio: desenha do fundo (4) pra frente (1)
  const emPe = j.herois.filter((h) => h.rank > 0).sort((a, b) => b.rank - a.rank);
  const deitados = j.herois.filter((h) => h.rank === 0);
  for (const h of [...deitados, ...emPe]) ladoHerois.append(cartaUnidade(j, h, alvos));
  const ladoInimigos = el('div', 'lado-rpg inimigos');
  for (const i of [...j.inimigos].sort((a, b) => (a.rank || 9) - (b.rank || 9))) ladoInimigos.append(cartaUnidade(j, i, alvos));
  campo.append(ladoHerois, el('div', 'meio-rpg', 'VS'), ladoInimigos);
  tela.append(campo);

  const baixo = el('div', 'baixo-rpg');
  baixo.append(painelAcoes(j));
  const log = el('div', 'log-rpg');
  for (const l of j.log || []) log.append(el('p', l.tipo, l.texto));
  baixo.append(log);
  tela.append(baixo);
  requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));
}

function painelAcoes(j) {
  const painel = el('div', 'acoes-rpg');
  if (j.resultado) {
    painel.append(el('h4', 'resultado-rpg', j.resultado === 'vitoria' ? '🏆 Vitória!' : '💀 Derrota...'));
    return painel;
  }
  if (!j.vez) return painel;
  const ator = unidadePorId(j, j.vez.id);
  if (!ator) return painel;

  const titulo = el('div', 'titulo-acoes');
  const bonus = j.vez.bonus ? (j.vez.motivo === 'sintonia' ? ' 🌟 AÇÃO BÔNUS (Sintonia)' : ' ➕ AÇÃO BÔNUS') : '';

  if (ator.lado === 'inimigo') {
    titulo.append(el('strong', null, `👹 Vez de ${ator.nome}…`));
    painel.append(titulo);
    return painel;
  }
  if (ator.ajudante) {
    titulo.append(el('strong', null, `🤖 Vez do bot ${ator.nome}…${bonus}`));
    painel.append(titulo);
    return painel;
  }
  if (!j.vez.podeMandar) {
    titulo.append(el('strong', null, `⏳ Esperando ${ator.nome} escolher…${bonus}`), relogioPrazo(j.prazo));
    painel.append(titulo);
    return painel;
  }

  const quem = ator.dono === minhaCid() ? `Sua vez — ${nomeClasse(j, ator.classe)}` : `Vez de ${ator.nome} (o dono saiu, você comanda)`;
  titulo.append(el('strong', null, quem + bonus), relogioPrazo(j.prazo));
  painel.append(titulo);

  const grade = el('div', 'grade-habs');
  for (const op of j.acoes) {
    const info = j.dados.habilidades[op.id];
    const b = el('button', 'hab-rpg' + (op.id === rpg.selecionada ? ' selecionada' : '') + (op.id === 'resenha' ? ' especial' : ''));
    b.type = 'button';
    b.disabled = !op.usavel;
    const elemento = info.elemento ? j.dados.elementos[info.elemento].icone : '';
    const ritmo = info.peso < 1 ? 'rápida' : info.peso > 1 ? 'lenta' : '';
    b.append(el('span', 'icone', info.icone), el('span', 'nome', info.nome));
    const extra = el('span', 'extra', [elemento, ritmo].filter(Boolean).join(' · '));
    b.append(extra);
    b.title = (op.usavel ? '' : '🚫 ' + op.motivo + '\n') + info.descricao;
    b.onmouseenter = () => mostrarDescricao(painel, info, op);
    b.onfocus = () => mostrarDescricao(painel, info, op);
    b.onclick = () => escolherHabilidade(j, op);
    grade.append(b);
  }
  painel.append(grade);

  const desc = el('div', 'descricao-hab');
  const atual = j.acoes.find((a) => a.id === (rpg.selecionada || rpg.vendo));
  if (rpg.selecionada) {
    desc.append(el('strong', null, '👉 Agora clique no alvo destacado.'));
    desc.append(botao('Cancelar', 'secundario', () => {
      rpg.selecionada = null;
      renderizarJogos();
    }));
  } else if (atual) {
    preencherDescricao(desc, j.dados.habilidades[atual.id], atual);
  } else {
    desc.append(el('span', 'dica', 'Passe o mouse numa habilidade pra ver o que ela faz.'));
  }
  painel.append(desc);

  const rodape = el('div', 'rodape-acoes');
  rodape.append(botao('🤖 Deixar o computador decidir', 'secundario', () => acaoJogo({ acao: 'auto', heroi: ator.id })));
  painel.append(rodape);
  return painel;
}

function preencherDescricao(caixa, info, op) {
  caixa.replaceChildren();
  caixa.append(el('strong', null, `${info.icone} ${info.nome}`), el('span', null, info.descricao));
  const onde = [`usa da posição ${info.de.join(', ')}`];
  if (info.em) onde.push(`alcança ${info.em.join(', ')}`);
  caixa.append(el('small', null, onde.join(' · ')));
  if (!op.usavel) caixa.append(el('small', 'aviso', '🚫 ' + op.motivo));
}

function mostrarDescricao(painel, info, op) {
  if (rpg.selecionada) return;
  rpg.vendo = op.id;
  const caixa = painel.querySelector('.descricao-hab');
  if (caixa) preencherDescricao(caixa, info, op);
}

function escolherHabilidade(j, op) {
  if (!op.usavel) return toast(op.motivo, true);
  if (!op.precisaAlvo) return agirRpg(j, op.id);
  rpg.selecionada = rpg.selecionada === op.id ? null : op.id;
  renderizarJogos();
}

async function agirRpg(j, hab, alvo) {
  const heroi = j.vez?.id;
  rpg.selecionada = null;
  await acaoJogo({ acao: 'agir', heroi, hab, alvo });
}

// ---------- Entre uma sala e outra ----------
function cartaoStatus(j, h) {
  const c = el('div', 'status-heroi ' + h.condicao);
  c.append(spriteRpg(h.classe, ''));
  const info = el('div', 'info');
  const nome = el('strong', null, h.nome);
  if (!h.ajudante) nome.style.color = h.cor;
  info.append(nome, el('small', null, nomeClasse(j, h.classe) + (h.mente !== 'normal' ? (h.mente === 'inspirado' ? ' · ✨ inspirado' : ' · 💢 abalado') : '')));
  info.append(barra(h.vida, h.vidaMax, 'b-vida', h.condicao === 'morto' ? 'MORTO' : undefined), barra(h.estresse, 100, 'b-estresse', `estresse ${h.estresse}`));
  c.append(info);
  return c;
}

function grupoStatus(j) {
  const g = el('div', 'grupo-status');
  for (const h of j.herois) g.append(cartaoStatus(j, h));
  return g;
}

function entreSalasRpg(tela, j) {
  tela.append(trilhaDasSalas(j));
  const caixa = el('div', 'pausa-rpg');
  caixa.append(el('h3', null, '🏆 Sala vencida!'));
  for (const t of j.resumo) caixa.append(el('p', null, t));
  caixa.append(grupoStatus(j));
  const proxima = j.dados.salas[j.salaAtual + 1];
  if (proxima) {
    const estou = j.jogadores.some((x) => x.cid === minhaCid());
    if (estou) caixa.append(botao(`Seguir para: ${proxima.nome} ${proxima.tipo === 'acampamento' ? '🔥' : proxima.tipo === 'chefe' ? '👑' : '⚔️'}`, 'primario grande', () => acaoJogo({ acao: 'seguir' })));
    else caixa.append(el('p', 'dica', 'Esperando o grupo seguir…'));
  }
  tela.append(caixa);
}

// ---------- Acampamento ----------
function acampamentoRpg(tela, j) {
  tela.append(trilhaDasSalas(j));
  const sala = j.dados.salas[j.salaAtual];
  const caixa = el('div', 'pausa-rpg acampamento');
  const titulo = el('div', 'titulo-acoes');
  titulo.append(el('h3', null, `🔥 ${sala.nome} — acampamento`), relogioPrazo(j.prazo));
  caixa.append(titulo, el('p', null, 'Uma fogueira no meio da cripta. Cada herói escolhe UMA coisa pra fazer antes de seguir. Os bots descansam.'));
  const meu = j.herois.find((h) => h.dono === minhaCid() && h.condicao !== 'morto');
  const minhaEscolha = meu ? j.escolhas?.[meu.id] : null;
  const opcoes = el('div', 'opcoes-acampamento');
  for (const [id, op] of Object.entries(j.dados.acampamento)) {
    const b = el('button', 'opcao-acampamento' + (minhaEscolha === id ? ' escolhida' : ''));
    b.type = 'button';
    b.disabled = !meu;
    b.append(el('span', 'icone', op.icone), el('strong', null, op.nome), el('small', null, op.descricao));
    b.onclick = () => acaoJogo({ acao: 'acampar', escolha: id });
    opcoes.append(b);
  }
  caixa.append(opcoes);
  const quem = el('div', 'quem-escolheu');
  for (const h of j.herois.filter((x) => x.dono && x.condicao !== 'morto')) {
    const e = j.escolhas?.[h.id];
    quem.append(el('span', e ? 'pronto' : '', `${e ? '✔' : '…'} ${h.nome}${e ? ': ' + j.dados.acampamento[e].nome : ''}`));
  }
  caixa.append(quem, grupoStatus(j));
  tela.append(caixa);
}

// ---------- Fim ----------
function fimRpg(tela, j) {
  tela.append(trilhaDasSalas(j));
  const caixa = el('div', 'pausa-rpg fim ' + j.final);
  if (j.final === 'vitoria') {
    caixa.append(el('h3', null, '👑 O Abade caiu! Expedição completa!'), el('p', null, `Vocês saíram da cripta com 💰 ${j.ouro} de ouro.`));
  } else {
    const sala = j.dados.salas[j.salaAtual];
    caixa.append(el('h3', null, '💀 O grupo caiu...'), el('p', null, `A expedição terminou em ${sala?.nome || 'algum lugar escuro'}. Tentem de novo!`));
  }
  for (const t of j.resumo || []) caixa.append(el('p', null, t));
  caixa.append(grupoStatus(j));
  if (j.jogadores.some((x) => x.cid === minhaCid())) caixa.append(botao('Jogar de novo', 'primario grande', () => acaoJogo({ acao: 'denovo' })));
  tela.append(caixa);
}

// =================================================================
// 4. ANIMAÇÕES E RELÓGIO
// =================================================================
function numeroFlutuante(alvo, texto, classe) {
  const n = el('div', 'flutua ' + classe, texto);
  alvo.append(n);
  setTimeout(() => n.remove(), 1400);
}

function animarCena(j) {
  const c = j.cena;
  const chave = c ? `${j.salaAtual}:${c.seq}` : `${j.salaAtual}:0`;
  const primeira = rpg.ultimaCena === null;
  if (chave === rpg.ultimaCena) return;
  rpg.ultimaCena = chave;
  if (primeira || !c) return; // acabou de abrir a tela: não repete a última animação
  const area = document.querySelector('#areaJogos .campo-rpg');
  if (!area) return;
  const pegar = (id) => area.querySelector(`.unidade-rpg[data-id="${CSS.escape(id)}"]`);
  const ator = pegar(c.ator);
  if (ator && c.hab && c.hab !== 'defender') ator.classList.add('ataca');

  for (const a of c.alvos) {
    const carta = pegar(a.id);
    if (!carta) continue;
    if (a.errou) numeroFlutuante(carta, 'ERROU', 'errou');
    if (a.dano) {
      carta.classList.add('apanhou');
      numeroFlutuante(carta, `-${a.dano}${a.critico ? '!' : ''}`, 'dano' + (a.critico ? ' critico' : '') + (a.fraco ? ' fraco' : ''));
      if (a.fraco) numeroFlutuante(carta, 'FRACO!', 'tag-fraco');
      if (a.resistiu) numeroFlutuante(carta, 'RESISTIU', 'tag-resiste');
    }
    if (a.cura) {
      carta.classList.add('curou');
      numeroFlutuante(carta, `+${a.cura}`, 'cura');
    }
    if (a.aliviou) numeroFlutuante(carta, `-${a.aliviou} estresse`, 'cura pequeno');
    if (a.estresse) numeroFlutuante(carta, `+${a.estresse} estresse`, 'estresse');
    if (a.quebrou) numeroFlutuante(carta, 'QUEBROU!', 'quebrou');
    if (a.morreu) carta.classList.add('morrendo');
  }
  if (c.sintonia) {
    const faixa = el('div', 'faixa-sintonia', '🌟 SINTONIA! 🌟');
    area.append(faixa);
    setTimeout(() => faixa.remove(), 1800);
  }
  if (c.mente) {
    const carta = pegar(c.mente.id);
    if (carta) numeroFlutuante(carta, c.mente.mente === 'inspirado' ? '✨ INSPIRADO' : '💢 ABALADO', c.mente.mente === 'inspirado' ? 'quebrou' : 'estresse');
  }
}

function atualizarPrazo(s) {
  const prazo = Number(s.dataset.prazo);
  if (!prazo) {
    s.textContent = '';
    return;
  }
  const falta = Math.max(0, Math.ceil((prazo - agoraServidor()) / 1000));
  s.textContent = `⏱ ${falta}s`;
  s.classList.toggle('acabando', falta <= 10);
}
setInterval(() => document.querySelectorAll('.rpg-prazo').forEach(atualizarPrazo), 500);
