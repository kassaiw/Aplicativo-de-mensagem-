'use strict';
/*
 * =================================================================
 *  RESENHA — a SEÇÃO DE ANIMES (parte do navegador)
 * =================================================================
 *  1. A página da seção (cartões dos jogos + ranking da galera)
 *  2. O quiz de anime (retrato e abertura)
 *
 *  Usa as funções do app.js, jogos.js e rpg.js: el, botao, acaoJogo,
 *  imagem, criarAvatar, telaLobby, atualizarPrazo, agoraServidor...
 * =================================================================
 */

// =================================================================
// 1. A PÁGINA DA SEÇÃO
// =================================================================
const SECAO_ANIMES = [
  {
    titulo: 'Adivinhe',
    jogos: [
      { tipo: 'quiz-personagem', emoji: '🖼️', nome: 'Quem é?', descricao: 'Aparece o retrato. Fala o nome do personagem.', dificuldade: true },
      { tipo: 'quiz-abertura', emoji: '🎵', nome: 'Pela abertura', descricao: 'Toca a música abafada. Cada erro deixa o som mais limpo.', dificuldade: true },
      { tipo: 'adivinhe-anime', emoji: '🎴', nome: 'Anidle', descricao: 'Chute animes e use as pistas pra achar o secreto.', dificuldade: true },
    ],
  },
  {
    titulo: 'Monte e lute',
    jogos: [
      { tipo: 'construir', emoji: '⚡', nome: 'Construir Personagem', descricao: 'Gire personagens, monte o seu boneco e lute 1 contra 1.' },
      { tipo: 'draft', emoji: '🧩', nome: 'Draft de Anime', descricao: 'Coloque cada personagem na posição certa.', anime: true },
      { tipo: 'leilao', emoji: '💰', nome: 'Leilão', descricao: 'Compre personagens com moedas e monte o time.', anime: true },
    ],
  },
];
const TIPOS_ANIME = new Set(SECAO_ANIMES.flatMap((g) => g.jogos.map((x) => x.tipo)));
const NIVEIS_DIFICULDADE = [
  ['facil', 'Fácil'],
  ['medio', 'Médio'],
  ['dificil', 'Difícil'],
];

const ABAS_RANKING = [
  ['pontos', 'Pontos'],
  ['sequencia', 'Sequência'],
  ['melhorSeq', 'Recorde'],
  ['partidas', 'Mais ativos'],
];
const secaoAnimes = { ranking: null, aba: 'pontos', buscouEm: 0, dificuldade: 'medio' };
try {
  secaoAnimes.dificuldade = localStorage.getItem('resenha:dificuldadeAnime') || 'medio';
} catch {
  /* sem armazenamento */
}

async function buscarRanking(forcar) {
  if (!forcar && Date.now() - secaoAnimes.buscouEm < 15000) return;
  secaoAnimes.buscouEm = Date.now();
  try {
    const r = await (await fetch('/api/animes/ranking', { headers: { 'X-Token': estado.token } })).json();
    if (r.ok) {
      secaoAnimes.ranking = r;
      const lista = document.querySelector('#areaJogos .lista-ranking');
      if (lista) lista.replaceWith(listaRanking());
    }
  } catch {
    /* tenta de novo depois */
  }
}

async function comecarJogoAnime(jogo, botaoJogar, campoAnime) {
  const opcoes = {};
  if (jogo.dificuldade) opcoes.dificuldade = secaoAnimes.dificuldade;
  if (campoAnime) opcoes.anime = campoAnime.value.trim();
  botaoJogar.disabled = true;
  botaoJogar.textContent = 'Preparando…';
  const r = await rede.pedir('jogo:criar', { tipo: jogo.tipo, opcoes });
  if (!r.ok) {
    toast(r.erro || 'Não consegui começar.', true);
    botaoJogar.disabled = false;
    botaoJogar.textContent = 'Jogar';
  }
}

function cartaoModo(jogo) {
  const card = el('div', 'modo-anime');
  card.append(el('div', 'icone-modo', jogo.emoji), el('h4', null, jogo.nome), el('p', null, jogo.descricao));
  let campo = null;
  if (jogo.anime) {
    campo = document.createElement('input');
    campo.id = `op-${jogo.tipo}-anime`;
    campo.dataset.manter = '1';
    campo.placeholder = 'De qual anime? (opcional)';
    campo.maxLength = 60;
    card.append(campo);
  }
  const jogar = botao('Jogar', 'primario', () => comecarJogoAnime(jogo, jogar, campo));
  card.append(jogar);
  return card;
}

function listaRanking() {
  const caixa = el('div', 'lista-ranking');
  const dados = secaoAnimes.ranking?.[secaoAnimes.aba] || [];
  if (!secaoAnimes.ranking) caixa.append(el('p', 'dica', 'Carregando…'));
  else if (!dados.length) caixa.append(el('p', 'dica', 'Ninguém pontuou ainda. Joga um quiz aí!'));
  const unidade = { pontos: 'pts', sequencia: 'seguidas', melhorSeq: 'seguidas', partidas: 'partidas' }[secaoAnimes.aba];
  dados.forEach((p, i) => {
    const linha = el('div', 'linha-ranking' + (i < 3 ? ' top' + (i + 1) : ''));
    linha.append(el('span', 'posicao', String(i + 1)), criarAvatar(p.nome, p.cor, p.avatar), el('strong', null, p.nome), el('span', 'valor', `${p.valor} ${unidade}`));
    caixa.append(linha);
  });
  return caixa;
}

function seletorDificuldade() {
  const caixa = el('div', 'seletor-dificuldade');
  caixa.append(el('span', null, 'Dificuldade dos quizzes:'));
  const grupo = el('div', 'grupo-botoes');
  for (const [id, nome] of NIVEIS_DIFICULDADE) {
    const b = el('button', id === secaoAnimes.dificuldade ? 'ativo' : '', nome);
    b.type = 'button';
    b.onclick = () => {
      secaoAnimes.dificuldade = id;
      try {
        localStorage.setItem('resenha:dificuldadeAnime', id);
      } catch {
        /* sem armazenamento */
      }
      renderizarJogos();
    };
    grupo.append(b);
  }
  caixa.append(grupo);
  return caixa;
}

function telaAnimes() {
  buscarRanking();
  const tela = el('div', 'secao-animes');
  const modos = el('div', 'coluna-modos');
  modos.append(seletorDificuldade());
  for (const grupo of SECAO_ANIMES) {
    modos.append(el('h2', 'titulo-secao', grupo.titulo));
    const grade = el('div', 'grade-modos');
    for (const jogo of grupo.jogos) grade.append(cartaoModo(jogo));
    modos.append(grade);
  }
  modos.append(el('p', 'creditos-jogos', 'Dados: AniList (animes e personagens) e AnimeThemes.moe (aberturas).'));

  const lado = el('div', 'coluna-ranking');
  lado.append(el('h2', 'titulo-secao', 'Ranking'));
  const abas = el('div', 'abas-ranking');
  for (const [id, nome] of ABAS_RANKING) {
    const b = el('button', 'aba' + (secaoAnimes.aba === id ? ' ativa' : ''), nome);
    b.type = 'button';
    b.onclick = () => {
      secaoAnimes.aba = id;
      renderizarJogos();
    };
    abas.append(b);
  }
  lado.append(abas, listaRanking());
  tela.append(modos, lado);
  // a "caixa de rolagem" do jogo: dá o espaço, a rolagem e o tamanho pra versão de celular
  const caixa = el('div', 'corpo-jogo');
  caixa.append(tela);
  return caixa;
}

// =================================================================
// 2. O QUIZ
// =================================================================
const quiz = { audio: null, url: '', contexto: null, filtro: null, rodadaVista: '' };
const BUSCA_QUIZ = { personagem: 'Digite o nome do personagem…', anime: 'Digite o nome do anime…' };
// Abertura: o som começa "abafado" (filtro que corta os agudos) e limpa a cada erro
const ABAFADO = [450, 1300, 4500];

// O áudio fica guardado entre um redesenho e outro, pra não recomeçar
function audioDaRodada(m, inicio) {
  if (quiz.url === m.url && quiz.audio) return quiz.audio;
  pararMidiasQuiz();
  const a = new Audio();
  a.preload = 'auto';
  a.src = m.url;
  a.volume = Number(localStorage.getItem('resenha:volumeQuiz') || 0.7);
  a.addEventListener('loadedmetadata', () => {
    // entra no mesmo ponto que todo mundo
    const segundos = (agoraServidor() - inicio) / 1000;
    if (segundos > 1 && segundos < a.duration - 1) a.currentTime = segundos;
  });
  // se o servidor não conseguiu baixar, toca direto do AnimeThemes (sem o efeito de abafar)
  a.addEventListener('error', () => {
    if (!m.original || quiz.audio !== a) return;
    const reserva = new Audio(m.original);
    reserva.volume = a.volume;
    quiz.audio = reserva;
    quiz.filtro = null;
    tocarMusicaQuiz();
  }, { once: true });
  // Web Audio: liga o áudio num filtro "passa-baixa" (corta o som agudo = abafado)
  try {
    quiz.contexto ||= new (window.AudioContext || window.webkitAudioContext)();
    const fonte = quiz.contexto.createMediaElementSource(a);
    quiz.filtro = quiz.contexto.createBiquadFilter();
    quiz.filtro.type = 'lowpass';
    fonte.connect(quiz.filtro).connect(quiz.contexto.destination);
  } catch {
    quiz.filtro = null;
  }
  quiz.audio = a;
  quiz.url = m.url;
  tocarMusicaQuiz();
  return a;
}

// O navegador só deixa tocar som depois que a pessoa clicou em algo na página
async function tocarMusicaQuiz() {
  const a = quiz.audio;
  if (!a) return;
  const estava = !!a.dataset.bloqueado;
  try {
    if (quiz.contexto?.state === 'suspended') await quiz.contexto.resume();
    await a.play();
    if (quiz.contexto && quiz.contexto.state !== 'running' && quiz.filtro) throw new Error('mudo');
    delete a.dataset.bloqueado;
    if (estava && estado.visao === 'jogos') renderizarJogos();
  } catch {
    if (!a.dataset.bloqueado) {
      a.dataset.bloqueado = '1';
      if (estado.visao === 'jogos') renderizarJogos();
    }
  }
}

function pararMidiasQuiz() {
  if (quiz.audio) {
    quiz.audio.pause();
    quiz.audio.removeAttribute('src');
  }
  quiz.audio = null;
  quiz.url = '';
}

function ajustarAbafado(j) {
  if (!quiz.filtro) return;
  const limpo = j.fase === 'resposta' || !j.eu || j.eu.acertou || j.eu.terminou;
  const erros = j.eu?.erros.length || 0;
  quiz.filtro.frequency.value = limpo ? 20000 : ABAFADO[Math.min(erros, ABAFADO.length - 1)];
}

function quadroQuiz(j) {
  const m = j.midia;
  const quadro = el('div', `quadro-quiz ${m.tipo} modo-${j.modo}`);
  if (m.tipo === 'audio') {
    const a = audioDaRodada(m, j.inicio);
    ajustarAbafado(j);
    const disco = el('div', 'disco' + (a.dataset.bloqueado ? '' : ' tocando'));
    disco.append(el('div', 'rotulo-disco', '🎵'));
    quadro.append(disco);
    if (j.fase === 'rodada') {
      const limpo = !j.eu || j.eu.acertou || j.eu.terminou;
      quadro.append(el('p', 'estado-som', limpo ? 'Som limpo' : ['Som bem abafado', 'Som meio abafado', 'Som quase limpo'][Math.min(j.eu.erros.length, 2)]));
    }
    if (a.dataset.bloqueado) quadro.append(botao('🔊 Clique pra ouvir', 'primario grande liberar-som', tocarMusicaQuiz));
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.min = 0;
    vol.max = 1;
    vol.step = 0.05;
    vol.value = a.volume;
    vol.className = 'volume-quiz';
    vol.title = 'Volume';
    vol.oninput = () => {
      a.volume = Number(vol.value);
      try {
        localStorage.setItem('resenha:volumeQuiz', vol.value);
      } catch {
        /* sem armazenamento */
      }
    };
    quadro.append(vol);
    return quadro;
  }
  const img = imagem(m.url, 'imagem-quiz');
  img.draggable = false;
  quadro.append(img);
  return quadro;
}

function coracoes(j) {
  const caixa = el('div', 'chances-quiz');
  const erros = j.eu?.erros.length || 0;
  for (let i = 0; i < j.chances; i++) caixa.append(el('span', i < j.chances - erros ? 'cheio' : 'vazio', i < j.chances - erros ? '❤️' : '🖤'));
  caixa.title = 'Suas chances nessa rodada';
  return caixa;
}

function relogioQuiz(fim) {
  const s = el('span', 'rpg-prazo relogio-quiz');
  s.dataset.prazo = fim;
  atualizarPrazo(s);
  return s;
}

function buscaQuiz(j) {
  const busca = el('div', 'busca-anime');
  const campo = document.createElement('input');
  campo.id = 'buscaItem';
  campo.dataset.manter = '1';
  campo.placeholder = jogos.listas[j.tipo] ? BUSCA_QUIZ[j.alvo] : 'Carregando a lista…';
  campo.autocomplete = 'off';
  campo.oninput = () => {
    jogos.sugestaoAtiva = 0;
    mostrarSugestoes();
  };
  campo.onkeydown = teclasSugestoes;
  campo.onblur = () => setTimeout(() => $('#sugestoesItem')?.replaceChildren(), 150);
  const sugestoes = el('div', 'sugestoes');
  sugestoes.id = 'sugestoesItem';
  busca.append(campo, sugestoes);
  return busca;
}

function placarQuiz(j) {
  const caixa = el('div', 'placar-quiz');
  for (const x of j.jogadores) {
    let status = '';
    if (x.agora?.acertou) status = `✔ +${x.agora.pontos}`;
    else if (x.agora?.terminou) status = '✘';
    else if (x.agora) status = '…';
    const linha = el('div', 'linha-placar' + (x.agora?.acertou ? ' acertou' : ''));
    linha.append(criarAvatar(x.nome, x.cor, x.avatar), el('strong', null, x.nome), el('span', 'status', status), el('span', 'total', `${x.total}`));
    caixa.append(linha);
  }
  return caixa;
}

function desenharQuiz(corpo, j) {
  carregarLista(j.tipo);
  const info = SECAO_ANIMES.flatMap((g) => g.jogos).find((x) => x.tipo === j.tipo);

  if (j.fase === 'lobby') {
    pararMidiasQuiz();
    const pontos = j.modo === 'abertura' ? 'Acertou de primeira: 100 pontos; na 2ª chance: 70; na 3ª: 40.' : 'Acertou: 100 pontos.';
    telaLobby(corpo, j, `${info?.descricao || ''} São ${j.totalRodadas} rodadas de ${j.tempo} segundos. Cada um tem ${j.chances} chances por rodada. ${pontos}`);
    return;
  }

  if (j.fase === 'fim') {
    pararMidiasQuiz();
    buscarRanking(true);
    const fim = el('div', 'fim-quiz');
    fim.append(el('h3', null, '🏁 Fim do quiz!'));
    const podio = el('div', 'podio-quiz');
    j.jogadores.forEach((x, i) => {
      const p = el('div', 'lugar' + (i === 0 ? ' primeiro' : ''));
      p.append(el('span', 'medalha', ['🥇', '🥈', '🥉'][i] || `${i + 1}º`), criarAvatar(x.nome, x.cor, x.avatar), el('strong', null, x.nome), el('small', null, `${x.total} pts · ${x.acertos} acertos`));
      podio.append(p);
    });
    fim.append(podio);
    const hist = el('div', 'historico-quiz');
    j.historico.forEach((h, i) => {
      const c = el('div', 'item-historico');
      c.append(imagem(h.img), el('strong', null, `${i + 1}. ${h.nome}`), el('small', null, h.acertaram.length ? '✔ ' + h.acertaram.join(', ') : 'ninguém acertou'));
      hist.append(c);
    });
    fim.append(hist);
    if (j.dentro) fim.append(botao('Jogar de novo', 'primario grande', () => acaoJogo({ acao: 'denovo' })));
    corpo.append(fim);
    return;
  }

  // rodada ou resposta
  const chave = `${j.id}:${j.rodada}`;
  if (quiz.rodadaVista !== chave) {
    quiz.rodadaVista = chave;
    const campo = document.getElementById('buscaItem');
    if (campo) campo.value = '';
  }
  const tela = el('div', 'quiz-anime');
  const topo = el('div', 'topo-quiz');
  topo.append(el('strong', null, `${j.rodada}/${j.totalRodadas}`));
  if (j.fase === 'rodada') topo.append(relogioQuiz(j.fim));
  else topo.append(el('span', 'dica', 'próxima já já…'));
  if (j.eu) topo.append(coracoes(j));
  tela.append(topo);

  const meio = el('div', 'meio-quiz');
  meio.append(quadroQuiz(j));

  const lado = el('div', 'lado-quiz');
  if (j.fase === 'resposta') {
    const r = el('div', 'resposta-quiz');
    r.append(imagem(j.resposta.img), el('small', null, 'Era'), el('h3', null, j.resposta.nome));
    if (j.resposta.sub) r.append(el('p', null, j.resposta.sub));
    if (j.eu) r.append(el('strong', j.eu.acertou ? 'certo' : 'errado', j.eu.acertou ? `✔ +${j.eu.pontos}` : '✘ Não foi dessa vez'));
    lado.append(r);
  } else if (!j.dentro) {
    lado.append(el('p', 'dica', 'Você está só olhando.'), botao('Entrar no quiz', 'primario', () => acaoJogo({ acao: 'entrar' })));
  } else if (j.eu?.acertou) {
    lado.append(el('div', 'acertou-quiz', `✔ Acertou! +${j.eu.pontos}`));
  } else if (j.eu?.terminou) {
    lado.append(el('div', 'pulou-quiz', 'Acabaram suas chances. Esperando a galera…'));
  } else {
    lado.append(buscaQuiz(j));
    if (j.eu?.erros.length) {
      const erros = el('div', 'erros-quiz');
      for (const e of j.eu.erros) erros.append(el('span', 'chip errado', '✘ ' + e.nome));
      lado.append(erros);
    }
    lado.append(botao('Pular', 'secundario', () => acaoJogo({ acao: 'pular' })));
  }
  lado.append(placarQuiz(j));
  meio.append(lado);
  tela.append(meio);
  corpo.append(tela);
}
