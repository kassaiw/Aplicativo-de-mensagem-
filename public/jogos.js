'use strict';
/*
 * =================================================================
 *  RESENHA — os jogos (parte do navegador)
 * =================================================================
 *  O servidor manda o estado do jogo ("jogo:estado") e este arquivo
 *  desenha a tela. Quando alguém clica em algo, mandamos uma "ação"
 *  pro servidor, que decide se vale e avisa todo mundo.
 *
 *  Usa as funções do app.js: $, el, rede, estado, toast, criarAvatar...
 *
 *  Mapa:
 *    1. Estado e utilidades
 *    2. Tela de escolher jogo e telas de resultado
 *    3. Cinco Letras
 *    4. Jogos de adivinhar (Anime, Campeão, Jogo)
 *    5. Conexões
 *    6. Palavras Secretas
 *    7. Draft de Anime
 *    8. Leilão de Personagens
 *    9. Teclado e relógio
 * =================================================================
 */

// =================================================================
// 1. ESTADO E UTILIDADES
// =================================================================
const jogos = {
  estado: null, // o que o servidor mandou por último
  diferencaRelogio: 0, // pra o timer do leilão bater com o do servidor
  digitando: '', // letras que você está digitando no Cinco Letras
  listas: {}, // opções da busca de cada jogo de adivinhar
  carregandoLista: {},
  sugestaoAtiva: 0,
  imagens: {}, // imagens já carregadas (pra não piscar)
  conexoes: { selecao: new Set(), ordem: [] }, // o que VOCÊ selecionou no Conexões
  trocaDe: null, // no Leilão: posição que você clicou pra trocar
  secao: 'geral', // 'geral' (aba jogos) ou 'animes' (seção de animes)
};
const ehDeAnime = (tipo) => typeof TIPOS_ANIME !== 'undefined' && TIPOS_ANIME.has(tipo);

const CATALOGO = [
  {
    tipo: 'cinco-letras',
    emoji: '🔤',
    nome: 'Cinco Letras',
    descricao: 'Descubram juntos a palavra de 5 letras. Qualquer um pode chutar. Estilo Termo.',
    opcoes: [{ id: 'quantidade', rotulo: 'Modo', valores: [['1', '1 palavra (6 chances)'], ['2', '2 palavras (7 chances)'], ['4', '4 palavras (9 chances)']] }],
  },
  {
    tipo: 'conexoes',
    emoji: '🔗',
    nome: 'Conexões',
    descricao: '16 palavras escondem 4 grupos de 4. Achem os grupos juntos antes de errar 4 vezes. Estilo Conexo.',
    opcoes: [],
  },
  {
    tipo: 'adivinhe-anime',
    emoji: '🎴',
    nome: 'Adivinhe o Anime',
    descricao: 'Chutem animes e usem as pistas (ano, estúdio, gêneros...) pra achar o secreto. Estilo Anidle.',
    opcoes: [{ id: 'dificuldade', rotulo: 'Dificuldade', valores: [['facil', 'Fácil (top 100)'], ['medio', 'Médio (top 250)'], ['dificil', 'Difícil (top 500)']], padrao: 'medio' }],
  },
  {
    tipo: 'adivinhe-campeao',
    emoji: '⚔️',
    nome: 'Adivinhe o Campeão',
    descricao: 'Campeões do League of Legends: chutem e usem as pistas (posição, região, recurso, ano...). Estilo Loldle.',
    opcoes: [],
  },
  {
    tipo: 'adivinhe-jogo',
    emoji: '🕹️',
    nome: 'Adivinhe o Jogo',
    descricao: 'Uma imagem pixelada de um jogo da Steam fica mais nítida a cada chute, com tags e pistas. Estilo Gamedle.',
    opcoes: [],
  },
  {
    tipo: 'palavras-secretas',
    emoji: '🕵️',
    nome: 'Palavras Secretas',
    descricao: 'Dois times, dois mestres. O mestre dá uma palavra de dica e o time acha as cartas. Cuidado com o assassino! (4+ pessoas)',
    opcoes: [],
  },
  {
    tipo: 'draft',
    emoji: '🧩',
    nome: 'Draft de Anime',
    descricao: 'Tire personagens com status (força, velocidade...) e coloque cada um na posição onde rende mais. Ganha o time mais forte.',
    opcoes: [{ id: 'anime', rotulo: 'Personagens de', texto: 'Mais populares (ou digite um anime: Naruto, Bleach...)' }],
  },
  {
    tipo: 'leilao',
    emoji: '💰',
    nome: 'Leilão de Personagens',
    descricao: 'Comprem personagens com moedas. Cada um tem status e rende mais em certas posições. Ganha o time mais forte.',
    opcoes: [
      { id: 'anime', rotulo: 'Personagens de', texto: 'Mais populares (ou digite um anime)' },
      { id: 'moedas', rotulo: 'Moedas', valores: [['100', '100 moedas'], ['50', '50 moedas'], ['200', '200 moedas']] },
      { id: 'tamanho', rotulo: 'Tamanho do time', valores: [['5', '5 posições'], ['3', '3 posições'], ['4', '4 posições'], ['6', '6 posições']] },
    ],
  },
  {
    tipo: 'masmorra',
    emoji: '🏰',
    nome: 'Masmorra (RPG)',
    descricao: 'RPG de turno em grupo: cada um controla um herói numa cripta cheia de mortos-vivos. Linha do tempo, quebra de escudo, posições e estresse. (protótipo)',
    opcoes: [{ id: 'modo', rotulo: 'Modo', valores: [['normal', 'Normal (herói só desmaia)'], ['dificil', 'Difícil (morte permanente)']] }],
  },
];

function agoraServidor() {
  return Date.now() + jogos.diferencaRelogio;
}

function minhaCid() {
  return estado.cid || '';
}

async function acaoJogo(dados) {
  const r = await rede.pedir('jogo:acao', { jogo: jogos.estado?.id, ...dados });
  if (!r.ok) toast(r.erro || 'Não deu certo.', true);
  return r;
}

function botao(texto, classe, aoClicar) {
  const b = el('button', 'btn ' + (classe || 'secundario'), texto);
  b.type = 'button';
  b.onclick = aoClicar;
  return b;
}

function normalizarTexto(t) {
  return String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function imagem(url, classe) {
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  if (classe) img.className = classe;
  img.onerror = () => img.classList.add('sem-imagem');
  return img;
}

// Cartinha de personagem (foto + nome + anime)
function cartaPersonagem(p, classe) {
  const c = el('div', 'carta-perso ' + (classe || ''));
  if (!p) {
    c.classList.add('vazia');
    return c;
  }
  const img = imagem(p.imagem);
  img.alt = p.nome;
  img.onerror = () => img.remove();
  const info = el('div', 'info-perso');
  info.append(el('strong', null, p.nome));
  if (p.anime) info.append(el('span', null, p.anime));
  c.append(img, info);
  c.title = p.nome + (p.anime ? ` (${p.anime})` : '');
  return c;
}

// Barrinhas com os status de um personagem
function blocoStatus(p, info) {
  const caixa = el('div', 'status-perso');
  if (!p?.status) return caixa;
  for (const s of info) {
    const linha = el('div', 'linha-status' + (p.especial === s.id ? ' especial' : ''));
    const barra = el('div', 'barra-status');
    const cheio = el('div');
    cheio.style.width = p.status[s.id] + '%';
    barra.append(cheio);
    linha.append(el('span', 'nome-status', `${s.emoji} ${s.nome}`), barra, el('strong', null, String(p.status[s.id])));
    caixa.append(linha);
  }
  return caixa;
}

// Mesma conta do servidor: pontos do personagem numa posição
function pontosNaPosicao(p, posicao, pesos) {
  if (!p?.status) return 0;
  let total = 0;
  for (const [s, peso] of Object.entries(pesos[posicao] || {})) total += (p.status[s] || 0) * peso;
  return Math.round(total);
}

function pessoa(j, extra) {
  const linha = el('div', 'pessoa-jogo');
  linha.append(criarAvatar(j.nome, j.cor, j.avatar), el('span', null, j.nome));
  if (extra) linha.append(extra);
  return linha;
}

// Recebe o estado novo do servidor
function atualizarJogo(novo) {
  const anterior = jogos.estado;
  jogos.estado = novo || null;
  if (novo?.agora) jogos.diferencaRelogio = novo.agora - Date.now();
  if (novo?.id && anterior?.id !== novo.id) {
    jogos.digitando = '';
    jogos.conexoes = { selecao: new Set(), ordem: [] };
    jogos.trocaDe = null;
    if (estado.visao !== 'jogos' && novo.criador !== estado.eu?.nome) toast(`${novo.criador} começou ${novo.titulo}! Clique em "${ehDeAnime(novo.tipo) ? 'animes' : 'jogos'}" pra entrar.`);
  }
  renderizarCanalJogos();
  if (estado.visao === 'jogos') renderizarJogos();
}

function jogosAoEntrar(jogo) {
  atualizarJogo(jogo);
}
rede.on('jogo:estado', atualizarJogo);

function renderizarCanalJogos() {
  const j = jogos.estado;
  const rodando = !!(j && j.id);
  // o "AO VIVO" aparece na aba certa: jogos ou animes
  $('#badgeJogo').hidden = !rodando || ehDeAnime(j.tipo);
  $('#badgeAnimes').hidden = !rodando || !ehDeAnime(j.tipo);
  const info = $('#jogoAtual');
  info.hidden = !rodando;
  info.textContent = rodando ? `${j.titulo} · por ${j.criador}` : '';
}

// Desenha tudo de novo, mas mantendo o que você estava digitando
function renderizarJogos() {
  const area = $('#areaJogos');
  const ativo = document.activeElement;
  const lembrar = {
    focoId: ativo && area.contains(ativo) ? ativo.id : '',
    inicio: ativo?.selectionStart,
    fim: ativo?.selectionEnd,
    valores: Object.fromEntries([...area.querySelectorAll('[data-manter]')].map((c) => [c.id, c.value])),
    rolagem: area.querySelector('.corpo-jogo')?.scrollTop || 0,
  };

  area.replaceChildren();
  const j = jogos.estado;
  // qual aba está acesa na barra da esquerda (jogos ou animes)
  $('#canalJogos').classList.toggle('ativo', estado.visao === 'jogos' && jogos.secao !== 'animes');
  $('#canalAnimes').classList.toggle('ativo', estado.visao === 'jogos' && jogos.secao === 'animes');
  const titulo = $('#tituloTopo');
  if (estado.visao === 'jogos' && titulo) {
    titulo.innerHTML = icone(jogos.secao === 'animes' ? 'estrela' : 'controle');
    titulo.append(jogos.secao === 'animes' ? 'Animes' : 'Jogos');
  }
  if (!j?.tipo?.startsWith('quiz-') && typeof pararMidiasQuiz === 'function') pararMidiasQuiz();
  if (!j) area.append(jogos.secao === 'animes' ? telaAnimes() : telaEscolha());
  else if (j.preparando) area.append(telaPreparando(j));
  else {
    area.append(cabecalhoJogo(j));
    const corpo = el('div', 'corpo-jogo');
    const desenhar = {
      'cinco-letras': desenharCinco,
      'adivinhe-anime': desenharAdivinha,
      'adivinhe-campeao': desenharAdivinha,
      'adivinhe-jogo': desenharAdivinha,
      conexoes: desenharConexoes,
      'palavras-secretas': desenharSecretas,
      draft: desenharDraft,
      leilao: desenharLeilao,
      masmorra: desenharRpg,
      construir: desenharConstruir,
    }[j.tipo] || (j.tipo.startsWith('quiz-') ? desenharQuiz : null);
    if (desenhar) desenhar(corpo, j);
    area.append(corpo);
    corpo.scrollTop = lembrar.rolagem;
  }

  for (const [id, valor] of Object.entries(lembrar.valores)) {
    const campo = document.getElementById(id);
    if (campo && area.contains(campo)) campo.value = valor;
  }
  if (lembrar.focoId) {
    const campo = document.getElementById(lembrar.focoId);
    if (campo) {
      campo.focus();
      try {
        if (lembrar.inicio != null) campo.setSelectionRange(lembrar.inicio, lembrar.fim);
      } catch {
        /* nem todo campo aceita seleção */
      }
      if (campo.id === 'buscaItem') mostrarSugestoes();
    }
  }
  atualizarRelogioLeilao();
  ajustarCartas();
}

// Diminui a letra das palavras compridas até caberem na carta
function ajustarCartas() {
  for (const p of document.querySelectorAll('#areaJogos .palavra-carta')) {
    p.style.fontSize = '';
    let tamanho = parseFloat(getComputedStyle(p).fontSize);
    while (p.scrollWidth > p.clientWidth && tamanho > 8) {
      tamanho -= 1;
      p.style.fontSize = tamanho + 'px';
    }
  }
}
window.addEventListener('resize', ajustarCartas);

function cabecalhoJogo(j) {
  const topo = el('div', 'topo-jogo');
  const titulo = el('div', 'titulo-jogo');
  const info = CATALOGO.find((c) => c.tipo === j.tipo);
  titulo.append(el('span', 'emoji-jogo', info?.emoji || (ehDeAnime(j.tipo) ? '🎌' : '🎮')), el('strong', null, j.titulo), el('small', null, `começado por ${j.criador}`));
  topo.append(
    titulo,
    botao('Encerrar jogo', 'perigo-texto', async () => {
      if (!confirm(`Encerrar ${j.titulo} pra todo mundo?`)) return;
      const r = await rede.pedir('jogo:encerrar');
      if (!r.ok) toast(r.erro, true);
    })
  );
  return topo;
}

// =================================================================
// 2. TELA DE ESCOLHER JOGO E TELAS DE RESULTADO
// =================================================================
function telaEscolha() {
  const tela = el('div', 'escolha-jogos');
  const cab = el('div', 'cab-escolha');
  cab.append(el('h2', null, 'Jogos'), el('p', null, 'Escolha um jogo. Todo mundo no servidor vê e pode entrar. Dá pra jogar e ficar na chamada ao mesmo tempo!'));
  tela.append(cab);
  const atalho = el('button', 'atalho-animes');
  atalho.type = 'button';
  atalho.append(el('span', 'emoji-card', '🎌'), el('strong', null, 'Seção de Animes'), el('span', null, 'Quem é?, Pela abertura, Anidle, Construir Personagem, Draft e Leilão'), el('span', 'seta', '→'));
  atalho.onclick = () => {
    jogos.secao = 'animes';
    renderizarJogos();
  };
  tela.append(atalho);
  const grade = el('div', 'grade-jogos');
  for (const jogo of CATALOGO) {
    if (ehDeAnime(jogo.tipo)) continue;
    const card = el('div', 'card-jogo');
    card.append(el('div', 'emoji-card', jogo.emoji), el('h3', null, jogo.nome), el('p', null, jogo.descricao));
    const campos = {};
    for (const op of jogo.opcoes) {
      const rotulo = el('label', 'op-jogo');
      rotulo.append(el('span', null, op.rotulo));
      let campo;
      if (op.valores) {
        campo = document.createElement('select');
        for (const [valor, texto] of op.valores) {
          const o = el('option', null, texto);
          o.value = valor;
          campo.append(o);
        }
        if (op.padrao) campo.value = op.padrao;
      } else {
        campo = document.createElement('input');
        campo.placeholder = op.texto;
        campo.maxLength = 60;
      }
      campo.id = `op-${jogo.tipo}-${op.id}`;
      campo.dataset.manter = '1';
      campos[op.id] = campo;
      rotulo.append(campo);
      card.append(rotulo);
    }
    const comecar = botao('Começar', 'primario', async () => {
      const opcoes = Object.fromEntries(Object.entries(campos).map(([k, c]) => [k, c.value.trim()]));
      comecar.disabled = true;
      comecar.textContent = 'Preparando…';
      const r = await rede.pedir('jogo:criar', { tipo: jogo.tipo, opcoes });
      if (!r.ok) {
        toast(r.erro || 'Não consegui começar.', true);
        comecar.disabled = false;
        comecar.textContent = 'Começar';
      }
    });
    card.append(comecar);
    grade.append(card);
  }
  tela.append(
    grade,
    el('p', 'creditos-jogos', 'Dados: AniList (animes e personagens), Riot Data Dragon e Meraki Analytics (campeões do LoL), SteamSpy e Steam (jogos).')
  );
  return tela;
}

const BAIXANDO = {
  'adivinhe-anime': 'Baixando os dados do AniList. Na primeira vez demora uns 40 segundos; depois é na hora.',
  draft: 'Baixando os dados do AniList. Na primeira vez demora uns 40 segundos; depois é na hora.',
  leilao: 'Baixando os dados do AniList. Na primeira vez demora uns 40 segundos; depois é na hora.',
  'adivinhe-campeao': 'Baixando os campeões do LoL. Na primeira vez demora um pouco; depois é na hora.',
  'adivinhe-jogo': 'Pegando os jogos da Steam…',
  'quiz-abertura': 'Pegando as aberturas no AnimeThemes. Na primeira vez pode levar uns minutos; depois é na hora.',
  construir: 'Baixando os personagens do AniList. Na primeira vez demora uns 40 segundos; depois é na hora.',
};

function telaPreparando(j) {
  const tela = el('div', 'preparando');
  const nome = CATALOGO.find((c) => c.tipo === j.tipo)?.nome || (typeof SECAO_ANIMES !== 'undefined' && SECAO_ANIMES.flatMap((g) => g.jogos).find((c) => c.tipo === j.tipo)?.nome) || 'o jogo';
  tela.append(el('div', 'rodinha'), el('h3', null, `Preparando ${nome}…`));
  if (BAIXANDO[j.tipo]) tela.append(el('p', null, BAIXANDO[j.tipo]));
  return tela;
}

function telaLobby(corpo, j, textoRegras, extras) {
  const minha = minhaCid();
  const dentro = j.jogadores.some((x) => x.cid === minha);
  const lobby = el('div', 'lobby');
  lobby.append(el('h3', null, 'Esperando a galera entrar'));
  if (extras) lobby.append(extras);
  lobby.append(el('p', 'regras', textoRegras));
  const lista = el('div', 'lista-lobby');
  for (const x of j.jogadores) lista.append(pessoa(x));
  if (!j.jogadores.length) lista.append(el('p', 'dica', 'Ninguém entrou ainda.'));
  lobby.append(lista);
  const botoes = el('div', 'botoes-centro');
  if (dentro) {
    botoes.append(botao('Sair', 'secundario', () => acaoJogo({ acao: 'sair' })), botao('Começar!', 'primario', () => acaoJogo({ acao: 'comecar' })));
  } else {
    botoes.append(botao('Entrar no jogo', 'primario', () => acaoJogo({ acao: 'entrar' })));
  }
  lobby.append(botoes);
  corpo.append(lobby);
}

// Time com os pontos de cada posição (Draft e Leilão)
function timeComPontos(j, x, opcoes = {}) {
  const linha = el('div', 'time-draft');
  j.posicoes.forEach((posicao, i) => {
    const vaga = el('div', 'vaga');
    if (opcoes.clicavel) {
      vaga.classList.add('clicavel');
      if (jogos.trocaDe === i) vaga.classList.add('selecionada');
      vaga.onclick = () => opcoes.aoClicar(i);
    }
    const cab = el('div', 'cab-vaga');
    cab.append(el('span', 'nome-vaga', posicao));
    if (x.time[i]) cab.append(el('span', 'pts-vaga', `${x.pontos[i]}`));
    vaga.append(cab, cartaPersonagem(x.time[i], 'pequena'));
    linha.append(vaga);
  });
  return linha;
}

function selosPoder(x) {
  const caixa = el('span', 'selos-poder');
  caixa.append(el('span', 'poder', `⚡ ${x.poder} de poder`));
  if (x.sinergia) caixa.append(el('span', 'sinergia', `+${x.sinergia} sinergia`));
  return caixa;
}

// Votação (3+ pessoas) e resultado final
function telaResultado(corpo, j) {
  const minha = minhaCid();
  const fim = j.fase === 'fim';
  const porVoto = j.votacao;
  const aviso = el('div', 'faixa-jogo');
  if (fim) {
    aviso.classList.add('vitoria');
    const vencedores = j.jogadores.filter((x) => x.venceu);
    const nomes = listarNomes(vencedores.map((x) => x.nome));
    if (j.jogadores.length === 1) aviso.append(`🏁 Seu time fechou com ${j.jogadores[0].poder} de poder!`);
    else if (porVoto) aviso.append(`🏆 ${nomes} ${vencedores.length > 1 ? 'empataram' : 'ganhou'} na votação!`);
    else aviso.append(`🏆 ${nomes} ${vencedores.length > 1 ? 'empataram' : 'ganhou'} com ${vencedores[0]?.poder} de poder!`);
  } else {
    const faltam = j.jogadores.filter((x) => !x.votou).map((x) => x.nome);
    aviso.append(`🗳️ Votação: qual é o melhor time? (empate = ganha quem tem mais poder) ${faltam.length ? '· Falta votar: ' + listarNomes(faltam) : ''}`);
  }
  corpo.append(aviso);

  const ordem = [...j.jogadores];
  if (fim) ordem.sort((a, b) => (b.votos || 0) - (a.votos || 0) || b.poder - a.poder);
  const lista = el('div', 'times-lista');
  ordem.forEach((x, posicao) => {
    const bloco = el('div', 'time-bloco' + (x.venceu ? ' venceu' : '') + (j.eu?.voto === x.cid ? ' meu-voto' : ''));
    const cab = el('div', 'time-cab');
    const esquerda = el('div', 'cab-esquerda');
    if (fim) esquerda.append(el('span', 'colocacao', `${posicao + 1}º`));
    esquerda.append(pessoa(x, x.votou && !fim ? el('span', 'votou', '✓ votou') : null), selosPoder(x));
    cab.append(esquerda);
    if (fim && porVoto) cab.append(el('span', 'contagem-votos', `${x.votos} voto${x.votos === 1 ? '' : 's'}`));
    else if (!fim && j.eu && x.cid !== minha) {
      const meuVoto = j.eu.voto === x.cid;
      cab.append(botao(meuVoto ? 'Seu voto ✓' : 'Votar neste time', meuVoto ? 'primario' : 'secundario', () => acaoJogo({ acao: 'votar', cid: x.cid })));
    }
    bloco.append(cab, timeComPontos(j, x));
    lista.append(bloco);
  });
  corpo.append(lista);
  if (fim) {
    const fimBotoes = el('div', 'botoes-centro');
    fimBotoes.append(botao('Jogar de novo', 'primario', () => acaoJogo({ acao: 'lobby' })));
    corpo.append(fimBotoes);
  }
}

// Explica quanto cada status vale em cada posição
function tabelaPosicoes(j) {
  const det = el('details', 'tabela-posicoes');
  det.append(el('summary', null, 'Como cada posição pontua?'));
  const lista = el('div', 'lista-posicoes');
  for (const pos of j.posicoes) {
    const pesos = Object.entries(j.pesos[pos] || {}).sort((a, b) => b[1] - a[1]);
    const linha = el('div', 'linha-posicao');
    linha.append(el('strong', null, pos));
    const txt = pesos.map(([s, p]) => {
      const info = j.statusInfo.find((x) => x.id === s);
      return `${info?.emoji || ''} ${info?.nome || s} ${Math.round(p * 100)}%`;
    });
    linha.append(el('span', null, txt.join(' · ')));
    lista.append(linha);
  }
  det.append(lista, el('p', 'dica', 'Personagens do mesmo anime no time dão +5 de sinergia cada. Os status são gerados pelo jogo: quanto mais popular no AniList, mais forte.'));
  return det;
}

// =================================================================
// 3. CINCO LETRAS
// =================================================================
const TECLADO = ['QWERTYUIOP', 'ASDFGHJKL⌫', 'ZXCVBNM↵'];
const PESO = { errado: 1, lugar: 2, certo: 3 };

function desenharCinco(corpo, j) {
  const faixa = el('div', 'faixa-jogo');
  if (j.status === 'jogando') {
    faixa.append(`Chute ${Math.min(j.chutes.length + 1, j.chances)} de ${j.chances} · digite no teclado e aperte Enter. Qualquer um pode chutar!`);
  } else {
    faixa.classList.add(j.status === 'ganhou' ? 'vitoria' : 'derrota');
    faixa.append(
      j.status === 'ganhou'
        ? `🎉 Acertaram em ${j.chutes.length} chute${j.chutes.length > 1 ? 's' : ''}! `
        : `😢 Não foi dessa vez. ${j.quantidade > 1 ? 'Eram' : 'Era'}: ${j.respostas.join(', ')} `
    );
    const novo = document.createElement('select');
    novo.id = 'qtdCinco';
    for (const [v, t] of [['1', '1 palavra'], ['2', '2 palavras'], ['4', '4 palavras']]) {
      const o = el('option', null, t);
      o.value = v;
      novo.append(o);
    }
    novo.value = String(j.quantidade);
    faixa.append(novo, botao('Jogar de novo', 'primario', () => acaoJogo({ acao: 'nova', quantidade: novo.value })));
  }
  corpo.append(faixa);

  const area = el('div', 'tabuleiros t' + j.quantidade);
  // Coluna com quem chutou cada linha
  const quem = el('div', 'coluna-quem');
  for (let r = 0; r < j.chances; r++) {
    const c = el('div', 'quem-linha');
    const chute = j.chutes[r];
    if (chute) c.append(criarAvatar(chute.quem.nome, chute.quem.cor, chute.quem.avatar));
    quem.append(c);
  }
  area.append(quem);

  for (let b = 0; b < j.quantidade; b++) {
    const tab = el('div', 'tabuleiro' + (j.resolvidas[b] >= 0 ? ' resolvido' : ''));
    for (let r = 0; r < j.chances; r++) {
      const linha = el('div', 'linha-letras');
      const chute = j.chutes[r];
      const depoisDeResolver = j.resolvidas[b] >= 0 && r > j.resolvidas[b];
      const atual = r === j.chutes.length && j.status === 'jogando' && j.resolvidas[b] < 0;
      if (atual) linha.id = 'linhaAtual' + b;
      const letras = chute && !depoisDeResolver ? Array.from(chute.palavra) : atual ? Array.from(jogos.digitando) : [];
      for (let i = 0; i < 5; i++) {
        const casa = el('div', 'casa', letras[i] || '');
        if (chute && !depoisDeResolver && chute.avaliacao[b]) casa.classList.add(chute.avaliacao[b][i]);
        else if (chute && !depoisDeResolver) casa.classList.add('certo'); // linha que acertou esse tabuleiro
        else if (atual) casa.classList.add('atual', letras[i] ? 'cheia' : 'vazia');
        linha.append(casa);
      }
      tab.append(linha);
    }
    area.append(tab);
  }
  corpo.append(area);
  if (j.status === 'jogando') corpo.append(tecladoNaTela(j));
}

// Cor de cada tecla: melhor resultado daquela letra em cada tabuleiro
function estadoDasTeclas(j) {
  const mapa = {};
  j.chutes.forEach((chute) => {
    const letras = Array.from(normalizarTexto(chute.palavra).toUpperCase());
    for (let b = 0; b < j.quantidade; b++) {
      const av = chute.avaliacao[b];
      if (!av) continue;
      letras.forEach((letra, i) => {
        mapa[letra] ||= Array(j.quantidade).fill(null);
        if (!mapa[letra][b] || PESO[av[i]] > PESO[mapa[letra][b]]) mapa[letra][b] = av[i];
      });
    }
  });
  return mapa;
}

const CORES_TECLA = { certo: '#2fa96b', lugar: '#d9a21c', errado: '#2a2d35', null: '#4a4f5c' };

function tecladoNaTela(j) {
  const estados = estadoDasTeclas(j);
  const teclado = el('div', 'teclado');
  for (const fileira of TECLADO) {
    const linha = el('div', 'fileira');
    for (const tecla of fileira) {
      const t = el('button', 'tecla', tecla === '↵' ? 'ENTER' : tecla);
      t.type = 'button';
      if (tecla === '↵' || tecla === '⌫') t.classList.add('larga');
      const est = estados[tecla];
      if (est) {
        // vários tabuleiros: a tecla fica dividida em pedaços coloridos
        const n = est.length;
        const partes = est.map((s, i) => `${CORES_TECLA[s]} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`);
        t.style.background = `linear-gradient(90deg, ${partes.join(', ')})`;
        if (est.every((s) => s === 'errado')) t.classList.add('apagada');
      }
      t.onclick = () => teclaCinco(tecla === '↵' ? 'Enter' : tecla === '⌫' ? 'Backspace' : tecla);
      linha.append(t);
    }
    teclado.append(linha);
  }
  return teclado;
}

let enviandoChute = false;
async function teclaCinco(tecla) {
  const j = jogos.estado;
  if (!j || j.tipo !== 'cinco-letras' || j.status !== 'jogando') return;
  if (tecla === 'Backspace') jogos.digitando = jogos.digitando.slice(0, -1);
  else if (tecla === 'Enter') {
    if (jogos.digitando.length < 5) {
      tremerLinha();
      return toast('Faltam letras!', true);
    }
    if (enviandoChute) return;
    enviandoChute = true;
    const palavra = jogos.digitando;
    jogos.digitando = ''; // limpa já; se o servidor recusar, devolve as letras
    renderizarJogos();
    const r = await rede.pedir('jogo:acao', { jogo: j.id, acao: 'chutar', palavra });
    enviandoChute = false;
    if (!r.ok) {
      if (!jogos.digitando) jogos.digitando = palavra;
      renderizarJogos();
      tremerLinha();
      toast(r.erro || 'Não deu.', true);
      return;
    }
  } else if (/^[A-Z]$/.test(tecla) && jogos.digitando.length < 5) jogos.digitando += tecla;
  renderizarJogos();
}

function tremerLinha() {
  document.querySelectorAll('[id^="linhaAtual"]').forEach((l) => {
    l.classList.remove('tremer');
    void l.offsetWidth;
    l.classList.add('tremer');
  });
}

// =================================================================
// 4. JOGOS DE ADIVINHAR (Anime, Campeão, Jogo)
// =================================================================
// Os três usam a mesma tela; muda só quais colunas aparecem.
const ADIVINHAR = {
  'adivinhe-anime': {
    colunas: [['formato', 'Formato'], ['ano', 'Ano'], ['temporada', 'Temporada'], ['episodios', 'Episódios'], ['estudio', 'Estúdio'], ['fonte', 'Fonte'], ['generos', 'Gêneros'], ['nota', 'Nota']],
    busca: 'Digite o nome de um anime…',
    resposta: 'O anime era',
    imagem: 'poster',
  },
  'adivinhe-campeao': {
    colunas: [['posicoes', 'Posição'], ['classes', 'Classes'], ['recurso', 'Recurso'], ['alcance', 'Alcance'], ['regiao', 'Região'], ['ano', 'Lançamento'], ['dificuldade', 'Dificuldade']],
    busca: 'Digite o nome de um campeão…',
    resposta: 'O campeão era',
    imagem: 'quadrada',
  },
  'adivinhe-jogo': {
    colunas: [['ano', 'Ano'], ['generos', 'Gêneros'], ['desenvolvedora', 'Desenvolvedora'], ['publicadora', 'Publicadora'], ['modos', 'Modos'], ['preco', 'Preço'], ['nota', 'Metacritic']],
    busca: 'Digite o nome de um jogo…',
    resposta: 'O jogo era',
    imagem: 'larga',
  },
};

async function carregarLista(tipo) {
  if (jogos.listas[tipo] || jogos.carregandoLista[tipo]) return;
  jogos.carregandoLista[tipo] = true;
  try {
    const r = await (await fetch('/api/jogos/lista?tipo=' + encodeURIComponent(tipo), { headers: { 'X-Token': estado.token } })).json();
    if (r.ok) {
      jogos.listas[tipo] = r.lista.map((a) => ({ ...a, busca: normalizarTexto([a.t, a.sub, ...(a.s || [])].filter(Boolean).join(' | ')) }));
    } else toast(r.erro || 'Não consegui carregar a lista.', true);
  } catch {
    toast('Não consegui carregar a lista.', true);
  }
  jogos.carregandoLista[tipo] = false;
  const campo = document.getElementById('buscaItem');
  if (campo) {
    campo.placeholder = ADIVINHAR[tipo]?.busca || (typeof BUSCA_QUIZ !== 'undefined' && BUSCA_QUIZ[jogos.estado?.alvo]) || 'Digite…';
    if (document.activeElement === campo) mostrarSugestoes();
  }
}

function celula(valor) {
  const td = el('td', 'celula ' + (valor?.r || ''));
  if (valor?.lista) {
    const chips = el('div', 'chips');
    for (const g of valor.lista) chips.append(el('span', 'chip ' + (g.certo ? 'certo' : 'errado'), g.v));
    if (!valor.lista.length) chips.append('—');
    td.append(chips);
  } else {
    td.append(String(valor?.v ?? '?'));
    if (valor?.seta) td.append(el('span', 'seta', valor.seta === 'sobe' ? ' ↑' : ' ↓'));
  }
  return td;
}

// Imagem pixelada (fica mais nítida conforme o número de "pixel" diminui)
function imagemPixelada(url, pixel) {
  const canvas = document.createElement('canvas');
  canvas.className = 'imagem-pixel';
  canvas.width = 640;
  canvas.height = 360;
  const desenhar = (img) => {
    const ctx = canvas.getContext('2d');
    const proporcao = img.naturalHeight / img.naturalWidth || 9 / 16;
    canvas.height = Math.round(640 * proporcao);
    if (pixel <= 1) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return;
    }
    const w = Math.max(1, Math.round(canvas.width / pixel));
    const h = Math.max(1, Math.round(canvas.height / pixel));
    const pequeno = document.createElement('canvas');
    pequeno.width = w;
    pequeno.height = h;
    pequeno.getContext('2d').drawImage(img, 0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pequeno, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
  };
  let img = jogos.imagens[url];
  if (!img) {
    img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = url;
    jogos.imagens[url] = img;
  }
  if (img.complete && img.naturalWidth) desenhar(img);
  else img.addEventListener('load', () => desenhar(img), { once: true });
  return canvas;
}

function desenharDica(d) {
  const caixa = el('div', 'dica-anime' + (d.larga || d.tipo === 'pixel' ? ' larga' : ''));
  caixa.append(el('strong', null, d.rotulo));
  if (d.valor == null || (Array.isArray(d.valor) && !d.valor.length && d.faltam)) {
    caixa.append(el('span', 'trancada', `libera em ${d.faltam} chute${d.faltam === 1 ? '' : 's'}`));
    return caixa;
  }
  if (d.tipo === 'texto') caixa.append(el('span', 'texto-dica', d.valor));
  else if (d.tipo === 'chips') {
    const chips = el('div', 'chips');
    for (const t of d.valor) chips.append(el('span', 'chip neutro', t));
    if (!d.valor.length) chips.append('(sem tags)');
    caixa.append(chips);
  } else if (d.tipo === 'imagem') caixa.append(imagem(d.valor, 'imagem-dica' + (d.borrar ? ' borrada' : '') + (d.larga ? ' larga' : '')));
  else if (d.tipo === 'pixel') caixa.append(imagemPixelada(d.valor, d.pixel));
  return caixa;
}

function desenharAdivinha(corpo, j) {
  const cfg = ADIVINHAR[j.tipo];
  carregarLista(j.tipo);
  const faixa = el('div', 'faixa-jogo');
  if (j.status === 'jogando') {
    faixa.append(`Chute ${j.chutes.length + 1} de ${j.maximo} · verde = igual, amarelo = perto, ↑ = o secreto tem número MAIOR, ↓ = MENOR. `);
    faixa.append(botao('Desistir', 'perigo-texto', () => confirm('Desistir e ver a resposta?') && acaoJogo({ acao: 'desistir' })));
  } else {
    faixa.classList.add(j.status === 'ganhou' ? 'vitoria' : 'derrota');
    faixa.append(j.status === 'ganhou' ? `🎉 Acertaram em ${j.chutes.length} chute${j.chutes.length > 1 ? 's' : ''}!` : '😢 Não foi dessa vez.');
    faixa.append(botao('Jogar de novo', 'primario', () => acaoJogo({ acao: 'nova' })));
  }
  corpo.append(faixa);

  if (j.resposta) {
    const r = el('div', 'resposta-anime ' + cfg.imagem);
    const info = el('div');
    info.append(el('small', null, cfg.resposta), el('h3', null, j.resposta.titulo));
    if (j.resposta.sub) info.append(el('p', null, j.resposta.sub));
    r.append(imagem(j.resposta.img), info);
    corpo.append(r);
  }

  // Dicas (a imagem do Adivinhe o Jogo fica em cima, grandona)
  const dicas = el('div', 'dicas-anime');
  for (const d of j.dicas) dicas.append(desenharDica(d));
  corpo.append(dicas);

  if (j.status === 'jogando') {
    const busca = el('div', 'busca-anime');
    const campo = document.createElement('input');
    campo.id = 'buscaItem';
    campo.dataset.manter = '1';
    campo.placeholder = jogos.listas[j.tipo] ? cfg.busca : 'Carregando a lista…';
    campo.autocomplete = 'off';
    campo.oninput = () => {
      jogos.sugestaoAtiva = 0;
      mostrarSugestoes();
    };
    campo.onkeydown = teclasSugestoes;
    campo.onblur = () => setTimeout(() => $('#sugestoesItem')?.replaceChildren(), 150);
    const sugestoes = el('div', 'sugestoes ' + cfg.imagem);
    sugestoes.id = 'sugestoesItem';
    busca.append(campo, sugestoes);
    corpo.append(busca);
  }

  if (j.chutes.length) {
    const rolar = el('div', 'tabela-rolagem');
    const tabela = el('table', 'tabela-anime ' + cfg.imagem);
    const cab = el('tr');
    cab.append(el('th', null, ''));
    for (const [, nome] of cfg.colunas) cab.append(el('th', null, nome));
    tabela.append(cab);
    for (const c of j.chutes) {
      const tr = el('tr', c.item.id === j.resposta?.id ? 'acertou' : '');
      const tdNome = el('td', 'nome-anime');
      const texto = el('div');
      texto.append(el('strong', null, c.item.titulo), el('small', null, 'por ' + c.quem.nome));
      tdNome.append(imagem(c.item.img), texto);
      tr.append(tdNome);
      for (const [campo] of cfg.colunas) tr.append(celula(c.comparacao[campo]));
      tabela.append(tr);
    }
    rolar.append(tabela);
    corpo.append(rolar);
  }
}

function sugestoesAtuais() {
  const j = jogos.estado;
  const lista = j && jogos.listas[j.tipo];
  const termo = normalizarTexto($('#buscaItem')?.value).trim();
  if (!termo || !lista) return [];
  const chutados = new Set(j.chutes ? j.chutes.map((c) => String(c.item.id)) : (j.eu?.erros || []).map((e) => String(e.id)));
  const palavras = termo.split(/\s+/);
  const achados = lista.filter((a) => !chutados.has(String(a.id)) && palavras.every((p) => a.busca.includes(p)));
  // Quem começa com o que você digitou aparece primeiro
  achados.sort((a, b) => Number(!normalizarTexto(a.t).startsWith(termo)) - Number(!normalizarTexto(b.t).startsWith(termo)));
  return achados.slice(0, 8);
}

function mostrarSugestoes() {
  const caixa = $('#sugestoesItem');
  if (!caixa) return;
  caixa.replaceChildren();
  const lista = sugestoesAtuais();
  jogos.sugestaoAtiva = Math.min(jogos.sugestaoAtiva, Math.max(0, lista.length - 1));
  lista.forEach((a, i) => {
    const item = el('button', 'sugestao' + (i === jogos.sugestaoAtiva ? ' ativa' : ''));
    item.type = 'button';
    const texto = el('div');
    texto.append(el('strong', null, a.t));
    if (a.sub && a.sub !== a.t) texto.append(el('small', null, a.sub));
    if (a.img) item.append(imagem(a.img));
    item.append(texto);
    item.onmousedown = (e) => {
      e.preventDefault();
      chutar(a.id);
    };
    caixa.append(item);
  });
}

function teclasSugestoes(e) {
  const lista = sugestoesAtuais();
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    jogos.sugestaoAtiva = Math.min(jogos.sugestaoAtiva + 1, lista.length - 1);
    mostrarSugestoes();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    jogos.sugestaoAtiva = Math.max(jogos.sugestaoAtiva - 1, 0);
    mostrarSugestoes();
  } else if (e.key === 'Enter' && lista[jogos.sugestaoAtiva]) {
    e.preventDefault();
    chutar(lista[jogos.sugestaoAtiva].id);
  }
}

async function chutar(id) {
  const r = await acaoJogo({ acao: 'chutar', id });
  if (r.ok) {
    jogos.sugestaoAtiva = 0;
    const campo = $('#buscaItem');
    if (campo) {
      campo.value = '';
      campo.focus();
    }
    $('#sugestoesItem')?.replaceChildren();
  }
}

// =================================================================
// 5. CONEXÕES
// =================================================================
const CORES_NIVEL = { 1: 'amarelo', 2: 'verde', 3: 'azul', 4: 'roxo' };

function desenharConexoes(corpo, j) {
  const meu = jogos.conexoes;
  // Mantém sua seleção e a ordem das palavras entre uma atualização e outra
  const presentes = new Set(j.palavras);
  for (const p of [...meu.selecao]) if (!presentes.has(p)) meu.selecao.delete(p);
  meu.ordem = meu.ordem.filter((p) => presentes.has(p));
  for (const p of j.palavras) if (!meu.ordem.includes(p)) meu.ordem.push(p);

  const faixa = el('div', 'faixa-jogo');
  if (j.status === 'jogando') {
    const vidas = el('span', 'vidas');
    for (let i = 0; i < j.maxVidas; i++) vidas.append(el('span', 'vida' + (i < j.vidas ? '' : ' perdida'), '●'));
    faixa.append('Selecione 4 palavras que têm algo em comum e envie. Qualquer um pode enviar! Erros restantes: ', vidas);
  } else {
    faixa.classList.add(j.status === 'ganhou' ? 'vitoria' : 'derrota');
    faixa.append(j.status === 'ganhou' ? `🎉 Acharam os 4 grupos${j.vidas === j.maxVidas ? ' sem errar nenhuma vez' : ''}!` : '😢 Acabaram as vidas. Os grupos eram:');
    faixa.append(botao('Jogar de novo', 'primario', () => acaoJogo({ acao: 'nova' })));
  }
  corpo.append(faixa);

  const mesa = el('div', 'mesa-conexoes');
  for (const g of j.grupos) {
    const barra = el('div', 'grupo-conexoes ' + CORES_NIVEL[g.nivel] + (g.achado ? '' : ' revelado'));
    barra.append(el('strong', null, g.nome), el('span', null, g.palavras.join(', ')));
    mesa.append(barra);
  }
  const grade = el('div', 'grade-conexoes');
  for (const palavra of meu.ordem) {
    const t = el('button', 'tile-conexoes' + (meu.selecao.has(palavra) ? ' selecionado' : ''));
    t.type = 'button';
    t.append(el('span', 'palavra-carta', palavra));
    t.disabled = j.status !== 'jogando';
    t.onclick = () => {
      if (meu.selecao.has(palavra)) meu.selecao.delete(palavra);
      else if (meu.selecao.size < 4) meu.selecao.add(palavra);
      else return toast('Só dá pra escolher 4!', true);
      renderizarJogos();
    };
    grade.append(t);
  }
  mesa.append(grade);
  corpo.append(mesa);

  if (j.status === 'jogando') {
    const botoes = el('div', 'botoes-centro');
    botoes.append(
      botao('Embaralhar', 'secundario', () => {
        meu.ordem.sort(() => Math.random() - 0.5);
        renderizarJogos();
      }),
      botao('Limpar', 'secundario', () => {
        meu.selecao.clear();
        renderizarJogos();
      })
    );
    const enviar = botao(`Enviar (${meu.selecao.size}/4)`, 'primario', async () => {
      const palavras = [...meu.selecao];
      const r = await acaoJogo({ acao: 'enviar', palavras });
      if (r.ok) {
        meu.selecao.clear();
        renderizarJogos();
      }
    });
    enviar.disabled = meu.selecao.size !== 4;
    botoes.append(enviar);
    corpo.append(botoes);
  }

  if (j.tentativas.length) {
    const hist = el('div', 'historico-conexoes');
    hist.append(el('h4', null, 'Tentativas'));
    for (const t of j.tentativas) {
      const linha = el('div', 'linha-tentativa ' + t.resultado + (t.nivel ? ' ' + CORES_NIVEL[t.nivel] : ''));
      const resultado = { certo: '✓ acertou', quase: '⚠️ falta uma!', errado: '✗ errou' }[t.resultado];
      linha.append(pessoa(t.quem), el('span', 'palavras-tentativa', t.palavras.join(' · ')), el('strong', null, resultado));
      hist.append(linha);
    }
    corpo.append(hist);
  }
}

// =================================================================
// 6. PALAVRAS SECRETAS
// =================================================================
const NOME_TIME = { vermelho: 'Vermelho', azul: 'Azul' };

function desenharSecretas(corpo, j) {
  const eu = j.eu;
  if (j.fase === 'lobby') return lobbySecretas(corpo, j);

  // Placar e vez
  const placar = el('div', 'placar-secretas');
  const lado = (time) => {
    const b = el('div', 'lado-placar ' + time + (j.vez === time && j.fase === 'jogando' ? ' da-vez' : ''));
    b.append(el('strong', null, j.restantes[time]), el('span', null, `${NOME_TIME[time]} · faltam`));
    return b;
  };
  const meio = el('div', 'meio-placar');
  if (j.fase === 'fim') {
    meio.append(el('strong', 'vencedor ' + j.vencedor, `🏆 ${NOME_TIME[j.vencedor]} venceu!`), el('span', null, j.motivo));
  } else if (j.etapa === 'dica') {
    meio.append(el('span', null, `Vez do ${NOME_TIME[j.vez]}`), el('strong', null, 'O mestre está pensando na dica…'));
  } else {
    meio.append(el('span', null, `Dica do ${NOME_TIME[j.vez]}`));
    const dica = el('strong', 'dica-atual', `${j.dica.palavra} · ${j.dica.numero === 0 ? '∞' : j.dica.numero}`);
    meio.append(dica, el('span', null, j.chutesRestantes >= 99 ? 'chutes livres' : `${j.chutesRestantes} chute${j.chutesRestantes === 1 ? '' : 's'} restante${j.chutesRestantes === 1 ? '' : 's'}`));
  }
  placar.append(lado('vermelho'), meio, lado('azul'));
  corpo.append(placar);

  // O que EU posso fazer agora
  const acoes = el('div', 'acoes-secretas');
  const minhaVez = j.fase === 'jogando' && eu && eu.time === j.vez;
  if (!eu) {
    acoes.append('Você está assistindo. Entrar no time: ');
    acoes.append(botao('Vermelho', 'secundario', () => acaoJogo({ acao: 'time', time: 'vermelho' })));
    acoes.append(botao('Azul', 'secundario', () => acaoJogo({ acao: 'time', time: 'azul' })));
  } else if (j.fase === 'fim') {
    acoes.append(botao('Nova partida', 'primario', () => acaoJogo({ acao: 'lobby' })));
  } else if (minhaVez && eu.mestre && j.etapa === 'dica') {
    acoes.append(el('span', null, 'Você é o mestre! Dê uma dica: '));
    const palavra = document.createElement('input');
    palavra.id = 'dicaPalavra';
    palavra.dataset.manter = '1';
    palavra.placeholder = 'uma palavra';
    palavra.maxLength = 30;
    const numero = document.createElement('select');
    numero.id = 'dicaNumero';
    numero.dataset.manter = '1';
    for (let n = 1; n <= 9; n++) numero.append(Object.assign(el('option', null, String(n)), { value: String(n) }));
    numero.append(Object.assign(el('option', null, '∞ (0)'), { value: '0' }));
    const dar = botao('Dar dica', 'primario', async () => {
      const r = await acaoJogo({ acao: 'dica', palavra: palavra.value, numero: numero.value });
      if (r.ok) palavra.value = '';
    });
    palavra.onkeydown = (e) => e.key === 'Enter' && dar.click();
    acoes.append(palavra, numero, dar);
  } else if (minhaVez && !eu.mestre && j.etapa === 'chute') {
    acoes.append(el('span', null, 'Sua vez! Clique numa carta pra apontar e no ✔ pra revelar. '));
    acoes.append(botao('Passar a vez', 'secundario', () => acaoJogo({ acao: 'passar' })));
  } else {
    acoes.append(el('span', 'dica', eu.mestre ? `Você é o mestre do ${NOME_TIME[eu.time]}. Cores só você vê!` : `Você é agente do ${NOME_TIME[eu.time]}. Espere sua vez.`));
  }
  corpo.append(acoes);

  // Cartas
  const grade = el('div', 'grade-secretas');
  const podeAgir = minhaVez && !eu.mestre && j.etapa === 'chute';
  j.cartas.forEach((c, i) => {
    const carta = el('div', 'carta-secreta');
    if (c.cor) carta.classList.add('cor-' + c.cor);
    if (c.revelada) carta.classList.add('revelada');
    carta.append(el('span', 'palavra-carta', c.palavra));
    if (c.revelada && c.quem) carta.append(el('small', 'quem-revelou', c.quem));
    if (c.marcas.length) {
      const marcas = el('div', 'marcas');
      for (const m of c.marcas) marcas.append(criarAvatar(m.nome, m.cor, m.avatar));
      carta.append(marcas);
    }
    if (podeAgir && !c.revelada) {
      carta.classList.add('clicavel');
      carta.onclick = () => acaoJogo({ acao: 'marcar', indice: i });
      const revelar = el('button', 'revelar', '✔');
      revelar.title = 'Revelar esta carta';
      revelar.onclick = (e) => {
        e.stopPropagation();
        acaoJogo({ acao: 'revelar', indice: i });
      };
      carta.append(revelar);
    }
    grade.append(carta);
  });
  corpo.append(grade);

  // Times e histórico
  const rodape = el('div', 'rodape-secretas');
  for (const time of ['vermelho', 'azul']) {
    const t = el('div', 'time-secretas ' + time);
    t.append(el('h4', null, NOME_TIME[time]));
    for (const x of j.jogadores.filter((p) => p.time === time)) t.append(pessoa(x, x.mestre ? el('span', 'tag-mestre', 'mestre') : null));
    rodape.append(t);
  }
  const hist = el('div', 'historico-dicas');
  hist.append(el('h4', null, 'Dicas'));
  if (!j.historico.length) hist.append(el('p', 'dica', 'Nenhuma ainda.'));
  for (const h of j.historico) {
    const linha = el('div', 'linha-hist ' + h.time);
    linha.append(el('strong', null, `${h.palavra} · ${h.numero === 0 ? '∞' : h.numero}`), el('span', null, h.mestre));
    hist.append(linha);
  }
  rodape.append(hist);
  corpo.append(rodape);
}

function lobbySecretas(corpo, j) {
  const eu = j.eu;
  const lobby = el('div', 'lobby');
  lobby.append(el('h3', null, 'Montem os times'));
  lobby.append(
    el(
      'p',
      'regras',
      'Cada time precisa de 1 mestre e pelo menos 1 agente. O mestre vê a cor das cartas e dá UMA palavra de dica + um número. ' +
        'Os agentes revelam as cartas da sua cor. Ganha quem achar todas primeiro. Se revelar o assassino (preto), perde na hora!'
    )
  );
  const times = el('div', 'times-lobby');
  for (const time of ['vermelho', 'azul']) {
    const col = el('div', 'time-lobby ' + time);
    col.append(el('h4', null, NOME_TIME[time]));
    for (const x of j.jogadores.filter((p) => p.time === time)) col.append(pessoa(x, x.mestre ? el('span', 'tag-mestre', 'mestre') : null));
    if (eu?.time !== time) col.append(botao('Entrar neste time', 'secundario', () => acaoJogo({ acao: 'time', time })));
    else col.append(botao(eu.mestre ? 'Deixar de ser mestre' : 'Quero ser o mestre', eu.mestre ? 'secundario' : 'primario', () => acaoJogo({ acao: 'mestre' })));
    times.append(col);
  }
  lobby.append(times);
  const botoes = el('div', 'botoes-centro');
  botoes.append(botao('Começar partida', 'primario', () => acaoJogo({ acao: 'comecar' })));
  lobby.append(botoes);
  corpo.append(lobby);
}

// =================================================================
// 7. DRAFT DE ANIME
// =================================================================
function desenharDraft(corpo, j) {
  if (j.fase === 'lobby') {
    const extra = el('div');
    extra.append(el('p', 'fonte-jogo', `Personagens: ${j.fonte}`), tabelaPosicoes(j));
    return telaLobby(
      corpo,
      j,
      `São ${j.posicoes.length} rodadas. Em cada uma você tira um personagem com status e escolhe a posição dele. Cada posição valoriza status diferentes, então coloque cada um onde ele rende mais! Depois não dá pra trocar. Você pode pular 2 personagens. ` +
        'Com até 2 pessoas ganha o time com mais poder; com 3 ou mais tem votação.',
      extra
    );
  }
  if (j.fase === 'votacao' || j.fase === 'fim') return telaResultado(corpo, j);

  const faixa = el('div', 'faixa-jogo');
  const esperando = j.jogadores.filter((x) => x.escolhendo && x.cid !== minhaCid()).map((x) => x.nome);
  faixa.append(`Rodada ${j.rodada} de ${j.posicoes.length} · ${j.fonte}`);
  if (!j.eu?.rolagem && esperando.length) faixa.append(` · esperando ${listarNomes(esperando)}…`);
  corpo.append(faixa);

  const meu = j.jogadores.find((x) => x.cid === minhaCid());
  if (j.eu?.rolagem) {
    const p = j.eu.rolagem;
    const escolha = el('div', 'escolha-draft');
    escolha.append(cartaPersonagem(p, 'grande'));
    const lado = el('div', 'lado-escolha');
    lado.append(el('h3', null, 'Você tirou!'), blocoStatus(p, j.statusInfo), el('p', null, 'Em qual posição ele entra? (o número é quanto ele rende lá)'));
    const livres = j.posicoes.map((pos, i) => ({ pos, i, pts: pontosNaPosicao(p, pos, j.pesos) })).filter((v) => !meu?.time[v.i]);
    const melhor = Math.max(...livres.map((v) => v.pts));
    const botoes = el('div', 'botoes-posicao');
    for (const v of livres) {
      const b = botao(`${v.pts === melhor ? '⭐ ' : ''}${v.pos} · ${v.pts}`, v.pts === melhor ? 'primario' : 'secundario', () => acaoJogo({ acao: 'escolher', posicao: v.i }));
      botoes.append(b);
    }
    lado.append(botoes);
    const pular = botao(`Pular (${j.eu.pulos} restante${j.eu.pulos === 1 ? '' : 's'})`, 'secundario', () => acaoJogo({ acao: 'pular' }));
    pular.disabled = j.eu.pulos <= 0;
    lado.append(pular);
    escolha.append(lado);
    corpo.append(escolha);
  }
  corpo.append(tabelaPosicoes(j));

  const lista = el('div', 'times-lista');
  for (const x of j.jogadores) {
    const bloco = el('div', 'time-bloco');
    const cab = el('div', 'time-cab');
    const esquerda = el('div', 'cab-esquerda');
    esquerda.append(pessoa(x, x.escolhendo ? el('span', 'tirou', 'escolhendo…') : el('span', 'votou', '✓ pronto')), selosPoder(x));
    cab.append(esquerda);
    bloco.append(cab, timeComPontos(j, x));
    lista.append(bloco);
  }
  corpo.append(lista);
}

// =================================================================
// 8. LEILÃO DE PERSONAGENS
// =================================================================
function clicarVagaLeilao(i) {
  if (jogos.trocaDe == null) {
    jogos.trocaDe = i;
    renderizarJogos();
    return;
  }
  const de = jogos.trocaDe;
  jogos.trocaDe = null;
  if (de !== i) acaoJogo({ acao: 'trocar', de, para: i });
  renderizarJogos();
}

function desenharLeilao(corpo, j) {
  if (j.fase === 'lobby') {
    const extra = el('div');
    extra.append(el('p', 'fonte-jogo', `Personagens: ${j.fonte} · ${j.moedasIniciais} moedas · posições: ${j.posicoes.join(', ')}`), tabelaPosicoes(j));
    return telaLobby(
      corpo,
      j,
      'Os personagens aparecem um de cada vez com os status deles. Dê lances! Quando o tempo acabar, o maior lance leva, e o personagem entra na posição onde rende mais (você pode trocar depois). ' +
        'Guarde 1 moeda pra cada vaga que falta. Com até 2 pessoas ganha o time com mais poder; com 3 ou mais tem votação.',
      extra
    );
  }
  if (j.fase === 'votacao' || j.fase === 'fim') return telaResultado(corpo, j);

  const meu = j.jogadores.find((x) => x.cid === minhaCid());

  if (j.fase === 'organizar') {
    const faixa = el('div', 'faixa-jogo');
    const faltam = j.jogadores.filter((x) => !x.pronto).map((x) => x.nome);
    faixa.append('🧩 Acabou o leilão! Arrume seu time: clique em duas posições pra trocar. ');
    const tempo = el('strong', 'tempo-organizar');
    tempo.id = 'textoOrganizar';
    faixa.append(tempo);
    if (faltam.length) faixa.append(` · falta: ${listarNomes(faltam)}`);
    if (meu) faixa.append(botao(j.eu?.pronto ? 'Pronto ✓' : 'Estou pronto', j.eu?.pronto ? 'secundario' : 'primario', () => acaoJogo({ acao: 'pronto' })));
    corpo.append(faixa);
  } else if (j.lote) {
    const lote = j.lote;
    const p = lote.personagem;
    const palco = el('div', 'palco-leilao');
    palco.append(cartaPersonagem(p, 'grande'));
    const lado = el('div', 'lado-escolha');
    lado.append(el('small', 'numero-lote', `Personagem nº ${j.numero}`), blocoStatus(p, j.statusInfo));
    if (meu) {
      const livres = j.posicoes.map((pos, i) => ({ pos, pts: pontosNaPosicao(p, pos, j.pesos), livre: !meu.time[i] })).filter((v) => v.livre);
      if (livres.length) {
        const melhor = Math.max(...livres.map((v) => v.pts));
        const pra = el('div', 'pra-voce');
        pra.append(el('span', null, 'No seu time:'));
        for (const v of livres) pra.append(el('span', 'chip ' + (v.pts === melhor ? 'certo' : 'neutro'), `${v.pos} ${v.pts}`));
        lado.append(pra);
      }
    }
    const barra = el('div', 'barra-tempo');
    const enchimento = el('div');
    enchimento.id = 'barraLeilao';
    barra.append(enchimento);
    const textoTempo = el('div', 'tempo-texto', '');
    textoTempo.id = 'textoLeilao';
    lado.append(barra, textoTempo);
    const lanceAtual = el('div', 'lance-atual');
    if (lote.lance) {
      lanceAtual.append(el('strong', null, `${lote.lance.valor} 🪙`), el('span', null, lote.lance.cid === minhaCid() ? 'é seu!' : `de ${lote.lance.nome}`));
    } else lanceAtual.append(el('span', null, 'Ninguém deu lance ainda'));
    lado.append(lanceAtual);

    const eu = j.eu;
    if (!eu) lado.append(el('p', 'dica', 'Você está só assistindo.'));
    else if (eu.vagas <= 0) lado.append(el('p', 'dica', 'Seu time está completo! 😎'));
    else {
      lado.append(el('p', 'carteira', `Você tem ${eu.moedas} 🪙 · faltam ${eu.vagas} vaga${eu.vagas === 1 ? '' : 's'} · lance máximo ${eu.maximo}`));
      const minimo = (lote.lance?.valor || 0) + 1;
      const botoes = el('div', 'botoes-lance');
      const passei = lote.passaram.includes(minhaCid());
      const meuLance = lote.lance?.cid === minhaCid();
      for (const mais of [1, 5, 10]) {
        const valor = (lote.lance?.valor || 0) + mais;
        const b = botao(lote.lance ? `+${mais} (${valor})` : `${valor} 🪙`, 'primario', () => acaoJogo({ acao: 'lance', valor }));
        b.disabled = meuLance || valor > eu.maximo;
        botoes.append(b);
      }
      lado.append(botoes);
      const livre = el('div', 'lance-livre');
      const campo = document.createElement('input');
      campo.type = 'number';
      campo.id = 'valorLance';
      campo.dataset.manter = '1';
      campo.min = String(minimo);
      campo.max = String(eu.maximo);
      campo.placeholder = `${minimo} a ${eu.maximo}`;
      const dar = botao('Dar lance', 'primario', async () => {
        const r = await acaoJogo({ acao: 'lance', valor: campo.value });
        if (r.ok) campo.value = '';
      });
      campo.onkeydown = (e) => e.key === 'Enter' && dar.click();
      dar.disabled = meuLance;
      const passar = botao(passei ? 'Você passou' : 'Passar', 'secundario', () => acaoJogo({ acao: 'passar' }));
      passar.disabled = passei || meuLance;
      livre.append(campo, dar, passar);
      lado.append(livre);
    }
    palco.append(lado);
    corpo.append(palco);
  } else if (j.ultimo) {
    const palco = el('div', 'palco-leilao');
    palco.append(cartaPersonagem(j.ultimo.personagem, 'grande'));
    const lado = el('div', 'lado-escolha');
    lado.append(
      el('h3', null, j.ultimo.nome ? '🔨 Vendido!' : '🤷 Ninguém quis'),
      el('p', null, j.ultimo.nome ? `${j.ultimo.personagem.nome} foi pra ${j.ultimo.nome} por ${j.ultimo.valor} 🪙${j.ultimo.posicao ? ` (entrou como ${j.ultimo.posicao})` : ''}` : `${j.ultimo.personagem.nome} ficou sem dono.`),
      el('p', 'dica', 'Próximo personagem já já…')
    );
    palco.append(lado);
    corpo.append(palco);
  }

  corpo.append(tabelaPosicoes(j));

  const lista = el('div', 'times-lista');
  const ordem = meu ? [meu, ...j.jogadores.filter((x) => x !== meu)] : j.jogadores;
  for (const x of ordem) {
    const ehMeu = x === meu;
    const bloco = el('div', 'time-bloco' + (ehMeu ? ' meu-time' : ''));
    const cab = el('div', 'time-cab');
    const esquerda = el('div', 'cab-esquerda');
    esquerda.append(pessoa(x, el('span', 'moedas', `${x.moedas} 🪙`)), selosPoder(x));
    if (j.fase === 'organizar' && x.pronto) esquerda.append(el('span', 'votou', '✓ pronto'));
    cab.append(esquerda);
    if (ehMeu) cab.append(el('span', 'dica', jogos.trocaDe != null ? 'Agora clique na outra posição' : 'Clique em duas posições pra trocar'));
    bloco.append(cab, timeComPontos(j, x, ehMeu ? { clicavel: true, aoClicar: clicarVagaLeilao } : {}));
    lista.append(bloco);
  }
  corpo.append(lista);
}

// =================================================================
// 9. TECLADO E RELÓGIO
// =================================================================
// Teclado do Cinco Letras (só quando a tela de jogos está aberta e você não está digitando no chat)
document.addEventListener('keydown', (e) => {
  if (estado.visao !== 'jogos' || jogos.estado?.tipo !== 'cinco-letras' || jogos.estado.status !== 'jogando') return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const alvo = e.target;
  if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT')) return;
  if (document.querySelector('.modal:not([hidden])')) return;
  let tecla = e.key;
  if (tecla.length === 1) tecla = normalizarTexto(tecla).toUpperCase();
  if (tecla === 'Enter' || tecla === 'Backspace' || /^[A-Z]$/.test(tecla)) {
    e.preventDefault();
    teclaCinco(tecla);
  }
});

// Atualiza a barrinha de tempo do leilão várias vezes por segundo
function atualizarRelogioLeilao() {
  const organizar = document.getElementById('textoOrganizar');
  if (organizar && jogos.estado?.prazo) {
    const resta = Math.max(0, jogos.estado.prazo - agoraServidor());
    organizar.textContent = `${Math.ceil(resta / 1000)}s`;
  }
  const barra = document.getElementById('barraLeilao');
  const texto = document.getElementById('textoLeilao');
  const lote = jogos.estado?.lote;
  if (!barra || !lote) return;
  const resta = Math.max(0, lote.prazo - agoraServidor());
  barra.style.width = Math.min(100, (resta / 15000) * 100) + '%';
  barra.classList.toggle('acabando', resta < 4000);
  if (texto) texto.textContent = resta > 0 ? `${Math.ceil(resta / 1000)}s` : 'Fechando…';
}
setInterval(atualizarRelogioLeilao, 200);
