'use strict';
/*
 * =================================================================
 *  RESENHA — o cinema (parte do navegador)
 * =================================================================
 *  O servidor diz "está passando X, tocando, no segundo Y" e este
 *  arquivo faz o SEU player bater com isso. Quando você aperta play,
 *  pause ou pula no player, avisamos o servidor, que avisa todo mundo.
 *
 *  Truque pra não virar bagunça: quando NÓS mexemos no player por causa
 *  do servidor, anotamos o que fizemos ("nosso"). Quando o player avisar
 *  "deu play" ou "pulou", se foi a gente, não avisamos o servidor de
 *  volta (senão ficaria num loop). Se foi você clicando, avisamos.
 *
 *  Mapa:
 *    1. Estado e eventos do servidor
 *    2. Players (YouTube e vídeo comum)
 *    3. Sincronizar
 *    4. Tela (título, fila, botões)
 *    5. Botões e legenda
 * =================================================================
 */

// =================================================================
// 1. ESTADO E EVENTOS DO SERVIDOR
// =================================================================
const cine = {
  estado: null, // o que o servidor mandou por último
  diferenca: 0, // diferença entre o relógio do servidor e o seu
  assistindo: false, // você está no cinema?
  chave: '', // qual vídeo está carregado no seu player
  yt: null, // player do YouTube
  ytPronto: false,
  ytPromessa: null,
  // O que a gente mesmo mandou o player fazer (e até quando vale a anotação)
  nosso: { tocar: 0, pausar: 0, pular: null, pularAte: 0 },
  arquivo: null, // { chave, nome, url } do arquivo que você escolheu no PC
  legenda: '', // endereço da legenda carregada
};

const ESTADOS_YT = { FIM: 0, TOCANDO: 1, PAUSADO: 2, CARREGANDO: 3, PRONTO: 5 };

// Anota "fui eu que mandei" por 3 segundos
function anotar(tipo, tempo) {
  const ate = Date.now() + 3000;
  if (tipo === 'pular') {
    cine.nosso.pular = tempo;
    cine.nosso.pularAte = ate;
  } else cine.nosso[tipo] = ate;
}
// Foi a gente? (e já apaga a anotação)
function foiNosso(tipo, tempo) {
  const agora = Date.now();
  if (tipo === 'pular') {
    const sim = cine.nosso.pular != null && agora < cine.nosso.pularAte && Math.abs(tempo - cine.nosso.pular) < 1;
    if (sim) cine.nosso.pular = null;
    return sim;
  }
  const sim = agora < cine.nosso[tipo];
  if (sim) cine.nosso[tipo] = 0;
  return sim;
}
function esquecerAnotacoes() {
  cine.nosso = { tocar: 0, pausar: 0, pular: null, pularAte: 0 };
}

function agoraNoServidor() {
  return Date.now() + cine.diferenca;
}

function tempoEsperado(c = cine.estado) {
  if (!c) return 0;
  return c.tempo + (c.tocando ? (agoraNoServidor() - c.em) / 1000 : 0);
}

function podeControlarCinema() {
  const c = cine.estado;
  const eu = meuUsuario();
  return !c?.trava || eu?.admin || c.dono === estado.cid;
}

function cinemaAoEntrar(c) {
  atualizarCinema(c, true);
}
rede.on('cinema', (c) => atualizarCinema(c, false));

function atualizarCinema(c, primeiraVez) {
  if (!c) return;
  const antes = cine.estado;
  cine.diferenca = c.agora - Date.now();
  cine.estado = c;
  const chave = c.fonte?.chave || '';
  if (chave && chave !== antes?.fonte?.chave && !primeiraVez && !cine.assistindo && c.fonte.por !== estado.eu?.nome) {
    toast(`🍿 ${c.fonte.por} colocou "${c.fonte.titulo}" no cinema. Clique em "cinema" pra assistir junto!`);
  }
  renderizarCanalCinema();
  if (cine.assistindo && chave !== cine.chave) carregarFonte(c.fonte);
  renderizarCinema();
  sincronizar(true);
}

// Você abriu (ou saiu) da tela do cinema
function cinemaMudouVisao(visivel) {
  if (visivel && !cine.assistindo) entrarNoCinema();
  renderizarCinema();
}

function entrarNoCinema() {
  cine.assistindo = true;
  rede.enviar('cinema:assistindo', true);
  if (cine.estado?.fonte) carregarFonte(cine.estado.fonte);
  renderizarCinema();
}

function sairDoCinema() {
  cine.assistindo = false;
  rede.enviar('cinema:assistindo', false);
  pararPlayers();
  cine.chave = '';
  renderizarCinema();
  toast('Você saiu do cinema. Clique em "cinema" pra voltar.');
}

// =================================================================
// 2. PLAYERS (YouTube e vídeo comum)
// =================================================================
const video = $('#playerVideo');

function carregarApiYoutube() {
  if (cine.ytPromessa) return cine.ytPromessa;
  cine.ytPromessa = new Promise((pronto, falhou) => {
    if (window.YT?.Player) return pronto();
    window.onYouTubeIframeAPIReady = () => pronto();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => {
      cine.ytPromessa = null;
      falhou(new Error('Não consegui carregar o player do YouTube.'));
    };
    document.head.append(s);
  });
  return cine.ytPromessa;
}

function pararPlayers() {
  if (cine.yt && cine.ytPronto) {
    try {
      cine.yt.stopVideo();
    } catch {
      /* já parou */
    }
  }
  video.pause();
  video.removeAttribute('src');
  video.load();
}

function mostrarPlayer(qual) {
  const yt = document.getElementById('playerYoutube');
  if (yt) yt.hidden = qual !== 'youtube';
  video.hidden = qual !== 'video';
  $('#pedirArquivo').hidden = qual !== 'arquivo';
}

async function carregarFonte(fonte) {
  cine.chave = fonte?.chave || '';
  tirarLegenda();
  if (!fonte) {
    pararPlayers();
    mostrarPlayer(null);
    return;
  }
  const inicio = Math.max(0, tempoEsperado());
  if (fonte.tipo === 'youtube') {
    video.pause();
    video.removeAttribute('src');
    mostrarPlayer('youtube');
    try {
      await carregarApiYoutube();
    } catch (e) {
      toast(e.message, true);
      return;
    }
    if (cine.chave !== fonte.chave) return; // trocou de vídeo enquanto carregava
    if (!cine.yt) {
      cine.yt = new YT.Player('playerYoutube', {
        width: '100%',
        height: '100%',
        videoId: fonte.id,
        playerVars: { start: Math.floor(inicio), rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            cine.ytPronto = true;
            sincronizar(true);
          },
          onStateChange: eventoYoutube,
          onError: (e) => {
            const motivos = {
              2: 'link inválido',
              5: 'o navegador não conseguiu tocar',
              100: 'o vídeo foi removido ou é privado',
              101: 'o dono do vídeo não deixa ele tocar fora do YouTube',
              150: 'o dono do vídeo não deixa ele tocar fora do YouTube',
            };
            toast('YouTube: ' + (motivos[e.data] || 'erro ' + e.data), true);
          },
        },
      });
      mostrarPlayer('youtube');
    } else if (cine.ytPronto) {
      if (cine.estado?.tocando) {
        anotar('tocar');
        cine.yt.loadVideoById({ videoId: fonte.id, startSeconds: inicio });
      }
      else cine.yt.cueVideoById({ videoId: fonte.id, startSeconds: inicio });
    }
  } else if (fonte.tipo === 'link') {
    if (cine.ytPronto) cine.yt.stopVideo();
    mostrarPlayer('video');
    esquecerAnotacoes();
    video.src = fonte.url;
  } else if (fonte.tipo === 'arquivo') {
    if (cine.ytPronto) cine.yt.stopVideo();
    if (cine.arquivo?.chave === fonte.chave) {
      mostrarPlayer('video');
      esquecerAnotacoes();
      video.src = cine.arquivo.url;
    } else {
      video.pause();
      video.removeAttribute('src');
      mostrarPlayer('arquivo');
    }
  }
}

// Jeito único de mexer no player, seja YouTube ou vídeo comum
function playerAtual() {
  const f = cine.estado?.fonte;
  if (!f || !cine.assistindo || cine.chave !== f.chave) return null;
  if (f.tipo === 'youtube') {
    if (!cine.ytPronto) return null;
    const yt = cine.yt;
    return {
      tempo: () => yt.getCurrentTime() || 0,
      pular: (t) => yt.seekTo(t, true),
      pausado: () => ![ESTADOS_YT.TOCANDO, ESTADOS_YT.CARREGANDO].includes(yt.getPlayerState()),
      tocar: async () => yt.playVideo(),
      pausar: () => yt.pauseVideo(),
    };
  }
  if (!video.getAttribute('src') || video.readyState < 1) return null;
  return {
    tempo: () => video.currentTime,
    pular: (t) => (video.currentTime = t),
    pausado: () => video.paused,
    tocar: () => video.play(),
    pausar: () => video.pause(),
  };
}

function avisarServidor(acao, tempo) {
  rede.pedir('cinema:controle', { acao, tempo }).then((r) => {
    if (!r.ok) {
      toast(r.erro || 'Não deu.', true);
      sincronizar(true); // volta pro estado de todo mundo
    }
  });
}

function eventoYoutube(e) {
  const c = cine.estado;
  if (!c?.fonte || c.fonte.tipo !== 'youtube') return;
  if (e.data === ESTADOS_YT.FIM) return rede.pedir('cinema:fim', { chave: c.fonte.chave });
  const t = cine.yt.getCurrentTime();
  if (e.data === ESTADOS_YT.TOCANDO) {
    if (foiNosso('tocar')) return;
    // Tocando num tempo bem diferente do esperado = você pulou pra outro ponto
    if (!c.tocando || Math.abs(t - tempoEsperado()) > 2) avisarServidor('play', t);
  }
  if (e.data === ESTADOS_YT.PAUSADO) {
    if (foiNosso('pausar')) return;
    if (c.tocando) avisarServidor('pause', t);
  }
}

video.addEventListener('play', () => {
  if (foiNosso('tocar')) return;
  if (!cine.estado?.tocando) avisarServidor('play', video.currentTime);
});
video.addEventListener('pause', () => {
  if (foiNosso('pausar') || video.ended) return;
  if (cine.estado?.tocando) avisarServidor('pause', video.currentTime);
});
video.addEventListener('seeked', () => {
  if (foiNosso('pular', video.currentTime)) return;
  if (Math.abs(video.currentTime - tempoEsperado()) > 1.5) avisarServidor('pular', video.currentTime);
});
video.addEventListener('ended', () => {
  const f = cine.estado?.fonte;
  if (f) rede.pedir('cinema:fim', { chave: f.chave });
});
video.addEventListener('loadedmetadata', () => sincronizar(true));
video.addEventListener('error', () => {
  if (!video.getAttribute('src')) return;
  toast('Não consegui tocar esse vídeo. O formato pode não funcionar no navegador (MP4 e WEBM são os mais garantidos).', true);
});

// =================================================================
// 3. SINCRONIZAR
// =================================================================
function sincronizar(agora) {
  const c = cine.estado;
  const p = playerAtual();
  if (!c?.fonte || !p) return;
  const esperado = tempoEsperado(c);
  const limite = agora ? 1 : 2.5; // segundos de diferença aceitáveis
  if (Math.abs(p.tempo() - esperado) > limite) {
    anotar('pular', esperado);
    p.pular(esperado);
  }
  if (c.tocando && p.pausado()) {
    anotar('tocar');
    Promise.resolve(p.tocar()).catch(() => {
      // O navegador bloqueou tocar com som sem um clique
      cine.nosso.tocar = 0;
      $('#liberarSom').hidden = false;
    });
  } else if (!c.tocando && !p.pausado()) {
    anotar('pausar');
    p.pausar();
  }
}
setInterval(() => sincronizar(false), 1000);

$('#liberarSom button').onclick = () => {
  $('#liberarSom').hidden = true;
  esquecerAnotacoes();
  sincronizar(true);
};

// =================================================================
// 4. TELA (título, fila, botões)
// =================================================================
function renderizarCanalCinema() {
  const f = cine.estado?.fonte;
  $('#badgeCinema').hidden = !f;
  const linha = $('#cinemaAtual');
  linha.hidden = !f;
  linha.textContent = f ? `${cine.estado.tocando ? '▶' : '⏸'} ${f.titulo}` : '';
}

function formatarTempo(s) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${seg}` : `${m}:${seg}`;
}

function renderizarCinema() {
  const c = cine.estado;
  const f = c?.fonte;
  $('#vazioCinema').hidden = !!f && cine.assistindo;
  $('#infoCinema').hidden = !f;
  if (!f) {
    mostrarPlayer(null);
    $('#liberarSom').hidden = true;
  } else if (!cine.assistindo) {
    mostrarPlayer(null);
    $('#vazioCinema').hidden = false;
  }

  if (f) {
    $('#tituloCinema').textContent = f.titulo;
    const quem = c.assistindo.length ? ` · assistindo: ${listarNomes(c.assistindo)}` : '';
    $('#subCinema').textContent = `${{ youtube: 'YouTube', link: 'Link de vídeo', arquivo: 'Arquivo do PC' }[f.tipo]} · colocado por ${f.por}${quem}`;
    const souDono = c.dono === estado.cid || meuUsuario()?.admin;
    const trava = $('#btnTravaCinema');
    trava.hidden = !souDono;
    trava.textContent = c.trava ? '🔓 Liberar controle' : '🔒 Só eu controlo';
    trava.title = c.trava ? 'Deixar todo mundo dar play/pause' : 'Só você (ou um admin) dá play, pause e troca o vídeo';
    $('#btnProximoCinema').hidden = !c.fila.length;
    $('#btnFecharCinema').hidden = !podeControlarCinema();
    $('#rotuloLegenda').hidden = f.tipo === 'youtube';
    $('#btnSairCinema').hidden = !cine.assistindo;
  }

  // Pedir o arquivo do PC
  const pedir = $('#pedirArquivo');
  pedir.replaceChildren();
  if (f?.tipo === 'arquivo' && cine.arquivo?.chave !== f.chave) {
    pedir.append(
      el('div', 'emoji-cinema', '📁'),
      el('h3', null, `${f.por} vai passar um arquivo do PC`),
      el('p', null, `Escolha o mesmo arquivo no seu computador: "${f.nome}"${f.duracao ? ` (${formatarTempo(f.duracao)})` : ''}`),
      el('p', 'dica', 'Cada um precisa ter o arquivo. O vídeo não é enviado pela internet: só o play, o pause e o tempo são sincronizados.')
    );
    const escolher = botao('Escolher o arquivo', 'primario', () => $('#arquivoCinema').click());
    pedir.append(escolher);
  }

  // Fila
  const fila = $('#filaCinema');
  fila.hidden = !c?.fila?.length;
  fila.replaceChildren();
  if (c?.fila?.length) {
    fila.append(el('h4', null, `Fila (${c.fila.length})`));
    c.fila.forEach((item, i) => {
      const linha = el('div', 'item-fila');
      linha.append(el('span', 'num-fila', `${i + 1}.`), el('strong', null, item.titulo), el('small', null, `por ${item.por}`));
      if (podeControlarCinema()) {
        linha.append(
          botao('Tocar agora', 'secundario', () => pedirCinema('cinema:fila', { acao: 'tocar', indice: i })),
          botao('✕', 'perigo-texto', () => pedirCinema('cinema:fila', { acao: 'remover', indice: i }))
        );
      }
      fila.append(linha);
    });
  }
}

async function pedirCinema(tipo, dados) {
  const r = await rede.pedir(tipo, dados);
  if (!r.ok) toast(r.erro || 'Não deu.', true);
  return r;
}

// =================================================================
// 5. BOTÕES E LEGENDA
// =================================================================
async function abrirLink(fila) {
  const campo = $('#linkCinema');
  const url = campo.value.trim();
  if (!url) return toast('Cole um link primeiro.', true);
  if (!cine.assistindo) entrarNoCinema();
  const r = await pedirCinema('cinema:abrir', { url, fila });
  if (r.ok) {
    campo.value = '';
    if (fila) toast('Adicionado na fila!');
  }
}
$('#btnAssistirLink').onclick = () => abrirLink(false);
$('#btnFilaLink').onclick = () => abrirLink(true);
$('#linkCinema').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') abrirLink(false);
});

// Arquivo do PC: quem abre manda só o nome e a duração; cada um escolhe o seu
$('#btnArquivoCinema').onclick = () => {
  cine.escolhendoNovo = true;
  $('#arquivoCinema').click();
};
$('#arquivoCinema').addEventListener('change', async () => {
  const arquivo = $('#arquivoCinema').files[0];
  $('#arquivoCinema').value = '';
  if (!arquivo) return;
  const url = URL.createObjectURL(arquivo);
  const novo = cine.escolhendoNovo || cine.estado?.fonte?.tipo !== 'arquivo';
  cine.escolhendoNovo = false;
  if (novo) {
    // Descobre a duração antes de mandar
    const duracao = await new Promise((ok) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => ok(v.duration || 0);
      v.onerror = () => ok(0);
      v.src = url;
    });
    if (!cine.assistindo) entrarNoCinema();
    const r = await pedirCinema('cinema:abrir', { arquivo: { nome: arquivo.name, tamanho: arquivo.size, duracao } });
    if (!r.ok) return URL.revokeObjectURL(url);
    // a "chave" chega no próximo estado; guardamos o arquivo pra usar quando chegar
    cine.arquivoPendente = { nome: arquivo.name, url };
    return;
  }
  const f = cine.estado.fonte;
  if (arquivo.name !== f.nome && !confirm(`O nome é diferente ("${arquivo.name}" e "${f.nome}"). Usar esse mesmo assim?`)) {
    URL.revokeObjectURL(url);
    return;
  }
  usarArquivo(f, url);
});

function usarArquivo(f, url) {
  if (cine.arquivo?.url && cine.arquivo.url !== url) URL.revokeObjectURL(cine.arquivo.url);
  cine.arquivo = { chave: f.chave, nome: f.nome, url };
  cine.chave = '';
  carregarFonte(f);
  renderizarCinema();
}

// Quando chega o estado com o arquivo que VOCÊ abriu, já usa ele
rede.on('cinema', (c) => {
  const f = c?.fonte;
  if (f?.tipo === 'arquivo' && cine.arquivoPendente && cine.arquivoPendente.nome === f.nome && f.por === estado.eu?.nome) {
    const { url } = cine.arquivoPendente;
    cine.arquivoPendente = null;
    usarArquivo(f, url);
  }
});

$('#btnSincronizar').onclick = () => {
  esquecerAnotacoes();
  const p = playerAtual();
  if (p) {
    anotar('pular', tempoEsperado());
    p.pular(tempoEsperado());
  }
  sincronizar(true);
  toast('Sincronizado!');
};
$('#btnTravaCinema').onclick = () => pedirCinema('cinema:trava', { trava: !cine.estado?.trava });
$('#btnProximoCinema').onclick = () => pedirCinema('cinema:fila', { acao: 'proximo' });
$('#btnFecharCinema').onclick = () => {
  if (confirm('Fechar o vídeo pra todo mundo?')) pedirCinema('cinema:fechar');
};

// Botão "Sair (só eu)"
const btnSair = botao('Sair (só eu)', 'secundario', sairDoCinema);
btnSair.id = 'btnSairCinema';
btnSair.title = 'Para o vídeo só pra você';
$('.botoes-cinema').insertBefore(btnSair, $('#btnFecharCinema'));

// Legenda .srt/.vtt (só pra você, só em vídeo que não é do YouTube)
function tirarLegenda() {
  video.querySelectorAll('track').forEach((t) => t.remove());
  if (cine.legenda) URL.revokeObjectURL(cine.legenda);
  cine.legenda = '';
}

$('#arquivoLegenda').addEventListener('change', async () => {
  const arquivo = $('#arquivoLegenda').files[0];
  $('#arquivoLegenda').value = '';
  if (!arquivo) return;
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  let texto = new TextDecoder('utf-8').decode(bytes);
  // Muita legenda brasileira vem em "ANSI" (Windows-1252): se der caractere estranho, lê de novo
  if (texto.includes('\uFFFD')) texto = new TextDecoder('windows-1252').decode(bytes);
  texto = texto.replace(/^\uFEFF/, '').replace(/\r/g, '');
  if (!/^WEBVTT/.test(texto)) texto = 'WEBVTT\n\n' + texto.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
  tirarLegenda();
  cine.legenda = URL.createObjectURL(new Blob([texto], { type: 'text/vtt' }));
  const track = document.createElement('track');
  track.kind = 'subtitles';
  track.label = arquivo.name;
  track.srclang = 'pt';
  track.src = cine.legenda;
  track.default = true;
  video.append(track);
  track.track.mode = 'showing';
  toast('Legenda carregada!');
});
