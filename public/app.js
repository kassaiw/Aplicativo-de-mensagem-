'use strict';
/*
 * =================================================================
 *  RESENHA — o app que roda no navegador
 * =================================================================
 *  Mapa do arquivo (procure pelos números):
 *    1. Ícones e utilidades
 *    2. Estado (tudo que o app "lembra")
 *    3. Conexão com o servidor (WebSocket)
 *    4. Entrar no servidor
 *    5. Chat de texto
 *    6. Listas (sala de voz, membros, painel)
 *    7. Chamada: microfone, câmera e tela
 *    8. Chamada: conexões WebRTC (PC a PC)
 *    9. Palco: os quadradinhos de vídeo
 *   10. Configurações e convite
 *   11. Botões, atalhos e início
 * =================================================================
 */

// =================================================================
// 1. ÍCONES E UTILIDADES
// =================================================================
const ICONES = {
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"/>',
  'mic-off': '<path d="M9 9V5a3 3 0 0 1 5.6-1.5M15 9.3V11a3 3 0 0 1-4.6 2.5M5 10v1a7 7 0 0 0 11.5 5.4M19 10v1c0 .9-.2 1.8-.5 2.6M12 18v4M8 22h8M3 3l18 18"/>',
  fone: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
  'fone-off': '<path d="M3 18v-6a9 9 0 0 1 14.6-7M21 12v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3zM3 3l18 18"/>',
  cam: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3.5v11L16 14"/>',
  'cam-off': '<path d="M10.7 6H14a2 2 0 0 1 2 2v3.3l1 1 5-3.8v11M16 16v.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h1M2 2l20 20"/>',
  tela: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M12 13V7M9 10l3-3 3 3"/>',
  'tela-parar': '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M9.5 7.5l5 5M14.5 7.5l-5 5"/>',
  desligar: '<path class="cheio" d="M12 8.5c-2.7 0-5.3.6-7.6 1.8C3.5 10.8 3 11.8 3 12.8v1.9c0 .9.8 1.6 1.7 1.5l3.1-.5c.7-.1 1.2-.7 1.2-1.5v-2c1.9-.6 4.1-.6 6 0v2c0 .8.5 1.4 1.2 1.5l3.1.5c.9.1 1.7-.6 1.7-1.5v-1.9c0-1-.5-2-1.4-2.5-2.3-1.2-4.9-1.8-7.6-1.8z"/>',
  telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  config: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  hashtag: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  estrela: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.7 7.1L3 21l1.9-6A8 8 0 1 1 21 12z"/>',
  pessoas: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3"/>',
  convidar: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M22 11h-6"/>',
  mais: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  enviar: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  'tela-cheia': '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/>',
  tv: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="m17 2-5 5-5-5"/>',
  lixo: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  controle: '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6l-.6 5.9A3 3 0 0 0 5 17.7c1 0 2-.5 2.6-1.4L9 14h6l1.4 2.3c.6.9 1.6 1.4 2.6 1.4a3 3 0 0 0 2.9-3.2l-.6-5.9A4 4 0 0 0 17.3 5z"/>',
};

function icone(nome) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
}
function trocarIcone(botao, nome) {
  const velho = botao.querySelector('svg');
  if (velho) velho.outerHTML = icone(nome);
  else botao.insertAdjacentHTML('afterbegin', icone(nome));
}

const $ = (seletor) => document.querySelector(seletor);
function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto != null) e.textContent = texto;
  return e;
}
function inicial(nome) {
  return Array.from(String(nome || '?').trim())[0] || '?';
}
// Desenha o avatar: a foto (se tiver) ou a primeira letra do nome
function pintarAvatar(caixa, pessoa) {
  caixa.style.setProperty('--cor', pessoa.cor);
  const foto = pessoa.avatar || '';
  const letra = inicial(pessoa.nome);
  if (caixa.dataset.foto === foto && caixa.dataset.letra === letra) return;
  caixa.dataset.foto = foto;
  caixa.dataset.letra = letra;
  caixa.replaceChildren();
  if (foto) {
    const img = document.createElement('img');
    img.src = foto;
    img.alt = '';
    img.draggable = false;
    img.onerror = () => {
      img.remove();
      caixa.textContent = letra;
    };
    caixa.append(img);
  } else {
    caixa.textContent = letra;
  }
}
function criarAvatar(nome, cor, avatar) {
  const a = el('div', 'avatar');
  a.title = nome;
  pintarAvatar(a, { nome, cor, avatar });
  return a;
}
function listarNomes(nomes) {
  if (nomes.length <= 1) return nomes.join('');
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
}

function toast(texto, erro) {
  const t = el('div', 'toast' + (erro ? ' erro' : ''), texto);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), erro ? 6500 : 3500);
}

// Guarda coisas no navegador (nome, preferências...)
const guardar = {
  ler(chave, padrao) {
    try {
      const v = localStorage.getItem('resenha:' + chave);
      return v ? JSON.parse(v) : padrao;
    } catch {
      return padrao;
    }
  },
  salvar(chave, valor) {
    try {
      localStorage.setItem('resenha:' + chave, JSON.stringify(valor));
    } catch {
      /* navegador sem espaço ou em modo privado */
    }
  },
  apagar(chave) {
    try {
      localStorage.removeItem('resenha:' + chave);
    } catch {
      /* tanto faz */
    }
  },
};

// Sonzinhos feitos na hora (sem arquivos de áudio)
let ctxSom = null;
function som(tipo) {
  const notas = { entrar: [520, 780], sair: [700, 460], msg: [880, 1175], mutar: [430], desmutar: [640] }[tipo];
  if (!notas) return;
  try {
    ctxSom ||= new AudioContext();
    if (ctxSom.state === 'suspended') ctxSom.resume();
    let t = ctxSom.currentTime + 0.01;
    for (const freq of notas) {
      const osc = ctxSom.createOscillator();
      const vol = ctxSom.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(tipo === 'msg' ? 0.06 : 0.12, t + 0.015);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(vol).connect(ctxSom.destination);
      osc.start(t);
      osc.stop(t + 0.18);
      t += 0.1;
    }
  } catch {
    /* sem som, sem problema */
  }
}

// =================================================================
// 2. ESTADO
// =================================================================
const CORES = ['#e5533c', '#d9861c', '#2fa96b', '#1f9aa8', '#3d74e0', '#7a5ae0', '#c94a92', '#647084'];

// Cada conexão de chamada tem 4 "canos" fixos, sempre nesta ordem:
const SLOTS = ['mic', 'cam', 'tela', 'telaAudio'];
const TIPO_DO_SLOT = { mic: 'audio', cam: 'video', tela: 'video', telaAudio: 'audio' };

const QUALIDADES = {
  '720p30': { largura: 1280, altura: 720, fps: 30, bitrate: 2_500_000 },
  '1080p30': { largura: 1920, altura: 1080, fps: 30, bitrate: 4_500_000 },
  '1080p60': { largura: 1920, altura: 1080, fps: 60, bitrate: 7_000_000 },
};

const PREFS_PADRAO = {
  micId: '',
  camId: '',
  saidaId: '',
  reducaoRuido: true,
  qualidade: '1080p30',
  otimizar: 'movimento',
  volumes: {},
};
const prefs = { ...PREFS_PADRAO, ...guardar.ler('prefs', {}) };
function salvarPrefs() {
  guardar.salvar('prefs', prefs);
}

const estado = {
  mensagens: [], // mensagens do chat que estão na tela
  anexoSpoiler: false, // a imagem anexada vai como spoiler?
  perfilAberto: null, // id de quem está com o cartão de perfil aberto
  config: null, // vem do servidor: nome, se tem senha, servidores STUN/TURN
  login: null, // { nome, cor, senha } usado pra entrar (e reentrar se cair)
  eu: null, // meu usuário { id, nome, cor }
  token: '', // senha secreta pra mandar imagens
  nomeServidor: 'Resenha',
  convite: '',
  usuarios: new Map(), // id -> usuário online
  falando: new Set(), // ids de quem está falando agora
  digitando: new Map(), // id -> { nome, timer }
  visao: 'texto', // 'texto' ou 'voz'
  chatAberto: window.innerWidth > 1000, // chat do lado da chamada
  naVoz: false,
  entrandoNaVoz: false,
  voltarPraVoz: false,
  mic: true, // microfone ligado? (false = mutado)
  surdo: false, // áudio dos outros desligado?
  cam: false,
  tela: false,
  abrindoCam: false,
  foco: null, // qual vídeo está em destaque
  naoLidas: 0,
  anexo: null, // imagem esperando pra ser enviada
  anexoUrl: '',
  ultimaMsg: null,
  grudado: true, // o chat está rolado até o fim?
  nivelMic: 0,
};

// Minhas mídias (o que EU estou mandando)
const midia = { micTrack: null, camTrack: null, telaVideo: null, telaAudio: null, telaStream: null };

// Uma conexão WebRTC pra cada pessoa na sala: id -> par
const pares = new Map();

function meuUsuario() {
  return estado.eu ? estado.usuarios.get(estado.eu.id) : null;
}
function nomeDe(id) {
  return estado.usuarios.get(id)?.nome || 'alguém';
}
function usuariosOrdenados() {
  return [...estado.usuarios.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
function pessoasNaVoz() {
  return usuariosOrdenados().filter((u) => u.naVoz);
}

// =================================================================
// 3. CONEXÃO COM O SERVIDOR (WebSocket)
// =================================================================
// Mensagens são objetos { t: tipo, d: dados }. Se mandar com "r" (número),
// o servidor responde com { t: 'resp', r, d } — é o "pedir()".
const rede = {
  ws: null,
  ouvintes: {},
  pendentes: new Map(),
  proximoId: 1,
  tentativas: 0,
  querConectado: false,

  conectar() {
    this.querConectado = true;
    if (this.ws) return;
    const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.tentativas = 0;
      this.avisar('conectado');
    };
    ws.onmessage = (ev) => {
      let m;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.t === 'resp') {
        const responder = this.pendentes.get(m.r);
        this.pendentes.delete(m.r);
        if (responder) responder(m.d || {});
      } else {
        this.avisar(m.t, m.d);
      }
    };
    ws.onclose = () => {
      this.ws = null;
      for (const responder of this.pendentes.values()) responder({ ok: false, rede: true, erro: 'Sem conexão.' });
      this.pendentes.clear();
      this.avisar('desconectado', { vaiTentar: this.querConectado });
      if (this.querConectado) {
        const espera = Math.min(8000, 500 * 2 ** this.tentativas++);
        setTimeout(() => this.conectar(), espera);
      }
    };
  },

  desconectar() {
    this.querConectado = false;
    if (this.ws) this.ws.close();
  },

  enviar(tipo, dados) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: tipo, d: dados }));
  },

  pedir(tipo, dados) {
    return new Promise((resolver) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolver({ ok: false, rede: true, erro: 'Sem conexão com o servidor.' });
        return;
      }
      const r = this.proximoId++;
      this.pendentes.set(r, resolver);
      this.ws.send(JSON.stringify({ t: tipo, d: dados, r }));
    });
  },

  on(tipo, funcao) {
    (this.ouvintes[tipo] ||= []).push(funcao);
  },

  avisar(tipo, dados) {
    for (const funcao of this.ouvintes[tipo] || []) {
      try {
        funcao(dados);
      } catch (e) {
        console.error('[' + tipo + ']', e);
      }
    }
  },
};

// =================================================================
// 4. ENTRAR NO SERVIDOR
// =================================================================
let corEntrada = CORES[Math.floor(Math.random() * CORES.length)];

function montarCores(caixa, selecionada, aoEscolher) {
  caixa.replaceChildren();
  for (const cor of CORES) {
    const b = el('button', 'cor');
    b.type = 'button';
    b.style.setProperty('--cor', cor);
    b.setAttribute('aria-label', 'Cor ' + cor);
    b.setAttribute('aria-pressed', String(cor === selecionada));
    b.onclick = () => {
      caixa.querySelectorAll('.cor').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      aoEscolher(cor);
    };
    caixa.append(b);
  }
}

function aplicarNomeServidor() {
  const nome = estado.nomeServidor;
  document.title = (estado.naoLidas ? `(${estado.naoLidas}) ` : '') + nome;
  $('#nomeServidor').textContent = nome;
  $('#tituloEntrada').textContent = nome;
  $('#logoEntrada').textContent = inicial(nome);
}

function mostrarEntrada(erro) {
  $('#app').hidden = true;
  $('#telaEntrada').hidden = false;
  const salvo = guardar.ler('login', null);
  if (salvo) {
    if (!$('#campoNome').value) $('#campoNome').value = salvo.nome || '';
    if (salvo.cor) corEntrada = salvo.cor;
    if (salvo.senha && !$('#campoSenha').value) $('#campoSenha').value = salvo.senha;
  }
  montarCores($('#coresEntrada'), corEntrada, (c) => (corEntrada = c));
  $('#rotuloSenha').hidden = !estado.config.temSenha;
  $('#erroEntrada').textContent = erro || '';
  $('#btnEntrar').disabled = false;
  $('#btnEntrar').textContent = 'Entrar';
  setTimeout(() => (erro && estado.config.temSenha ? $('#campoSenha') : $('#campoNome')).focus(), 50);
}

$('#formEntrada').addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = $('#campoNome').value.trim();
  if (!nome) return;
  const salvo = guardar.ler('login', {}) || {};
  estado.login = {
    nome,
    cor: corEntrada,
    senha: $('#campoSenha').value,
    avatar: salvo.avatar || '',
    status: salvo.status || '',
    bio: salvo.bio || '',
  };
  $('#btnEntrar').disabled = true;
  $('#btnEntrar').textContent = 'Entrando…';
  $('#erroEntrada').textContent = '';
  if (rede.ws && rede.ws.readyState === WebSocket.OPEN) fazerLogin();
  else rede.conectar();
});

function idDoNavegador() {
  let cid = guardar.ler('cid', '');
  if (!/^[a-z0-9]{16,40}$/.test(cid)) {
    cid = Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => (b % 36).toString(36)).join('');
    guardar.salvar('cid', cid);
  }
  return cid;
}

async function fazerLogin() {
  if (!estado.login) return;
  const r = await rede.pedir('entrar', { ...estado.login, cid: idDoNavegador(), chaveAdmin: guardar.ler('chaveAdmin', '') });
  if (r.rede) return; // a conexão caiu no meio; vai tentar de novo sozinho
  if (!r.ok) {
    rede.desconectar();
    estado.eu = null;
    mostrarEntrada(r.erro || 'Não consegui entrar.');
    if (r.banido) $('#btnEntrar').disabled = true;
    return;
  }
  guardar.salvar('login', estado.login);
  estado.eu = r.eu;
  estado.cid = r.cid; // identidade usada nos jogos
  estado.token = r.token;
  estado.nomeServidor = r.nome || estado.nomeServidor;
  estado.convite = r.convite || '';
  estado.usuarios = new Map(r.usuarios.map((u) => [u.id, u]));
  estado.falando.clear();
  $('#telaEntrada').hidden = true;
  $('#app').hidden = false;
  $('#avisoConexao').hidden = true;
  aplicarNomeServidor();
  carregarHistorico(r.mensagens || []);
  if (typeof jogosAoEntrar === 'function') jogosAoEntrar(r.jogo);
  if (typeof cinemaAoEntrar === 'function') cinemaAoEntrar(r.cinema);
  aplicarVisao();
  if (estado.voltarPraVoz) {
    estado.voltarPraVoz = false;
    entrarNaVoz();
  }
}

rede.on('conectado', fazerLogin);

rede.on('desconectado', ({ vaiTentar }) => {
  if (!vaiTentar) return;
  if (!estado.eu) {
    $('#erroEntrada').textContent = 'Não consegui falar com o servidor. Tentando de novo…';
    return;
  }
  if (estado.naVoz) {
    estado.voltarPraVoz = true;
    sairDaVoz(true);
  }
  $('#avisoConexao').hidden = false;
});

// Eventos que o servidor manda
rede.on('usuario:novo', (u) => {
  estado.usuarios.set(u.id, u);
  renderizarTudo();
});

rede.on('usuario:atualizou', (u) => {
  const antes = estado.usuarios.get(u.id);
  if (estado.eu && u.id === estado.eu.id) {
    // O servidor confirmou meu perfil; o estado da chamada eu controlo daqui.
    const perfil = { nome: u.nome, cor: u.cor, avatar: u.avatar, status: u.status, bio: u.bio, admin: u.admin, silenciadoAte: u.silenciadoAte, mutadoAdmin: u.mutadoAdmin };
    estado.eu = { ...estado.eu, ...perfil };
    const eu = meuUsuario();
    if (eu) Object.assign(eu, perfil);
    renderizarTudo();
    return;
  }
  estado.usuarios.set(u.id, u);
  if (estado.naVoz) {
    if (u.naVoz && !antes?.naVoz) som('entrar');
    if (!u.naVoz && antes?.naVoz) {
      fecharPar(u.id);
      som('sair');
    }
    // Alguém começou a compartilhar a tela: coloca em destaque
    if (u.tela && !antes?.tela && !estado.foco) {
      estado.foco = 't:' + u.id;
      toast(`${u.nome} começou a compartilhar a tela`);
    }
  }
  if (!u.naVoz) estado.falando.delete(u.id);
  renderizarTudo();
});

rede.on('usuario:saiu', (id) => {
  fecharPar(id);
  estado.usuarios.delete(id);
  estado.falando.delete(id);
  renderizarTudo();
});

rede.on('msg', (m) => {
  estado.mensagens.push(m);
  adicionarMensagem(m);
  if (estado.digitando.has(m.autor)) {
    clearTimeout(estado.digitando.get(m.autor).timer);
    estado.digitando.delete(m.autor);
    renderizarDigitando();
  }
  if (m.autor !== estado.eu?.id && !chatVisivel()) {
    estado.naoLidas++;
    atualizarNaoLidas();
    som('msg');
  }
});

rede.on('msg:apagada', (id) => {
  estado.mensagens = estado.mensagens.filter((m) => m.id !== id);
  const grudado = estado.grudado;
  const rolagem = $('#mensagens').scrollTop;
  carregarHistorico(estado.mensagens);
  if (!grudado) $('#mensagens').scrollTop = rolagem;
});

rede.on('chat:limpo', ({ por }) => {
  carregarHistorico([]);
  toast(`${por} limpou o chat.`);
});

rede.on('aviso', (texto) => toast(texto, true));

rede.on('expulso', ({ banido, motivo, por }) => {
  sairDaVoz(true);
  rede.desconectar();
  estado.eu = null;
  if (banido) guardar.apagar('login');
  mostrarEntrada(`${por} ${banido ? 'te baniu do servidor' : 'te expulsou do servidor'}${motivo ? ': ' + motivo : '.'}`);
  if (banido) $('#btnEntrar').disabled = true;
});

// Um admin te mutou (ou desmutou) na chamada
rede.on('forcar:mute', ({ mutar, por }) => {
  const eu = meuUsuario();
  if (eu) eu.mutadoAdmin = mutar;
  if (mutar) {
    estado.mic = false;
    aplicarMicESom();
    som('mutar');
  }
  toast(mutar ? `${por} te mutou na chamada.` : `${por} te desmutou. Pode ligar o microfone.`, mutar);
  atualizarMeuEstado();
});

rede.on('forcar:sairVoz', ({ por }) => {
  sairDaVoz(true);
  toast(`${por} te tirou da chamada.`, true);
});

rede.on('digitando', mostrarDigitando);
rede.on('falando', ({ id, falando }) => marcarFalando(id, falando));
rede.on('sinal', receberSinal);
rede.on('convite', (link) => (estado.convite = link || ''));

// =================================================================
// 5. CHAT DE TEXTO
// =================================================================
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtData = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function mesmoDia(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function rotuloDoDia(ts) {
  if (mesmoDia(ts, Date.now())) return 'Hoje';
  if (mesmoDia(ts, Date.now() - 86_400_000)) return 'Ontem';
  return fmtData.format(ts);
}
function quando(ts) {
  const dia = rotuloDoDia(ts);
  const prefixo = dia === 'Hoje' ? 'hoje' : dia === 'Ontem' ? 'ontem' : fmtDataCurta.format(ts);
  return `${prefixo} às ${fmtHora.format(ts)}`;
}

// Transforma links em clicáveis SEM usar innerHTML (pra ninguém injetar código)
// e ||texto entre barras|| vira spoiler (escondido até clicar), igual no Discord
const REGEX_LINK = /\bhttps?:\/\/[^\s<>"']+/gi;
const REGEX_SPOILER = /\|\|([\s\S]+?)\|\|/g;
function textoComLinks(texto) {
  const div = el('div', 'texto');
  let ultimo = 0;
  for (const achado of texto.matchAll(REGEX_SPOILER)) {
    div.append(...linkificar(texto.slice(ultimo, achado.index)).childNodes);
    const sp = el('span', 'spoiler-texto');
    sp.title = 'Spoiler: clique pra ver';
    sp.append(...linkificar(achado[1]).childNodes);
    sp.onclick = (e) => {
      if (!sp.classList.contains('revelado')) {
        e.preventDefault();
        sp.classList.add('revelado');
      }
    };
    div.append(sp);
    ultimo = achado.index + achado[0].length;
  }
  div.append(...linkificar(texto.slice(ultimo)).childNodes);
  return div;
}

function linkificar(texto) {
  const div = document.createElement('span');
  let ultimo = 0;
  for (const achado of texto.matchAll(REGEX_LINK)) {
    const url = achado[0].replace(/[.,!?;:)\]}]+$/, '');
    div.append(texto.slice(ultimo, achado.index));
    const a = el('a', null, url);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    div.append(a);
    ultimo = achado.index + url.length;
  }
  div.append(texto.slice(ultimo));
  return div;
}

// Está dentro de um ||spoiler||?
function dentroDeSpoiler(texto, posicao) {
  for (const achado of texto.matchAll(REGEX_SPOILER)) {
    if (posicao >= achado.index && posicao < achado.index + achado[0].length) return true;
  }
  return false;
}

// Coloca a imagem/GIF dentro de uma caixa borrada que só mostra ao clicar
function comSpoiler(elemento) {
  const caixa = el('div', 'spoiler-midia');
  const aviso = el('span', 'aviso-spoiler', 'SPOILER');
  caixa.append(elemento, aviso);
  caixa.addEventListener(
    'click',
    (e) => {
      if (caixa.classList.contains('revelado')) return;
      e.stopPropagation();
      e.preventDefault();
      caixa.classList.add('revelado');
    },
    true
  );
  return caixa;
}

const REGEX_IMAGEM = /\.(gif|png|jpe?g|webp)(\?[^\s]*)?$/i;
function acharLinkDeImagem(texto) {
  const links = [...texto.matchAll(REGEX_LINK)];
  if (links.length > 3) return null;
  for (const achado of links) {
    const url = achado[0].replace(/[.,!?;:)\]}]+$/, '');
    try {
      const u = new URL(url);
      if (REGEX_IMAGEM.test(u.pathname) || (/(^|\.)giphy\.com$/.test(u.hostname) && /^\/media\//.test(u.pathname))) {
        return { url, spoiler: dentroDeSpoiler(texto, achado.index) };
      }
    } catch {
      /* link quebrado */
    }
  }
  return null;
}

function criarImagemDeLink(url) {
  const img = el('img', 'img-msg');
  img.src = url;
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.onclick = () => verImagem(url);
  img.onerror = () => img.remove();
  img.onload = () => {
    if (estado.grudado) rolarProFim();
  };
  return img;
}

// Calcula um tamanho que caiba no chat mantendo o formato do GIF
function tamanhoDoGif(w, h, maxW, maxH) {
  if (!w || !h) return { w: maxW, h: Math.round(maxW * 0.6) };
  const escala = Math.min(1, maxW / w, maxH / h);
  return { w: Math.round(w * escala), h: Math.round(h * escala) };
}

function criarGifNaMensagem(gif) {
  const caixa = el('div', 'gif-msg');
  const img = el('img', 'img-msg gif');
  const t = tamanhoDoGif(gif.w, gif.h, 400, 300);
  img.width = t.w;
  img.height = t.h;
  img.src = gif.url;
  img.alt = 'GIF';
  img.referrerPolicy = 'no-referrer';
  img.onclick = () => verImagem(gif.url);
  const estrela = el('button', 'estrela-gif', '★');
  estrela.type = 'button';
  const pintar = () => {
    const fav = ehFavorito(gif.url);
    estrela.classList.toggle('ativa', fav);
    estrela.title = fav ? 'Tirar dos favoritos' : 'Favoritar GIF';
  };
  pintar();
  estrela.onclick = (e) => {
    e.stopPropagation();
    alternarFavorito({ id: gif.url, url: gif.url, w: gif.w, h: gif.h, previa: gif.url, pw: gif.w, ph: gif.h });
    pintar();
  };
  caixa.append(img, estrela);
  return caixa;
}

function rolarProFim() {
  const caixa = $('#mensagens');
  caixa.scrollTop = caixa.scrollHeight;
  estado.grudado = true;
}

function carregarHistorico(lista) {
  const caixa = $('#mensagens');
  caixa.querySelectorAll('.msg, .divisor-data').forEach((e) => e.remove());
  estado.ultimaMsg = null;
  estado.mensagens = [...lista];
  for (const m of lista) adicionarMensagem(m);
  rolarProFim();
}

function adicionarMensagem(m) {
  const caixa = $('#mensagens');
  const anterior = estado.ultimaMsg;
  if (!anterior || !mesmoDia(anterior.ts, m.ts)) caixa.append(el('div', 'divisor-data', rotuloDoDia(m.ts)));

  // Mensagens seguidas da mesma pessoa ficam "grudadas" (sem repetir nome)
  const continua =
    anterior && anterior.autor === m.autor && anterior.nome === m.nome && m.ts - anterior.ts < 5 * 60_000 && mesmoDia(anterior.ts, m.ts);

  const linha = el('div', 'msg' + (continua ? '' : ' inicio'));
  linha.dataset.id = m.id;
  const minha = (m.cid && m.cid === estado.cid) || m.autor === estado.eu?.id;
  if (minha || meuUsuario()?.admin) {
    const acoes = el('div', 'acoes-msg');
    const apagar = el('button', 'btn-icone');
    apagar.type = 'button';
    apagar.title = minha ? 'Apagar mensagem' : 'Apagar mensagem (admin)';
    apagar.innerHTML = icone('lixo');
    apagar.onclick = async () => {
      if (!confirm('Apagar essa mensagem pra todo mundo?')) return;
      const r = await rede.pedir('msg:apagar', { id: m.id });
      if (!r.ok) toast(r.erro || 'Não consegui apagar.', true);
    };
    acoes.append(apagar);
    linha.append(acoes);
  }
  const lado = el('div', 'lado');
  if (continua) {
    lado.append(el('span', 'hora-mini', fmtHora.format(m.ts)));
  } else {
    const avatar = criarAvatar(m.nome, m.cor, m.avatar);
    avatar.classList.add('clicavel');
    avatar.onclick = (e) => {
      e.stopPropagation();
      abrirPerfilDaMensagem(m, avatar);
    };
    lado.append(avatar);
  }
  const corpo = el('div', 'corpo');
  if (!continua) {
    const cabeca = el('div', 'cabeca');
    const nome = el('strong', 'clicavel', m.nome);
    nome.style.setProperty('--cor', m.cor);
    nome.onclick = (e) => {
      e.stopPropagation();
      abrirPerfilDaMensagem(m, nome);
    };
    const hora = el('time', null, quando(m.ts));
    hora.dateTime = new Date(m.ts).toISOString();
    cabeca.append(nome, hora);
    corpo.append(cabeca);
  }
  if (m.texto) corpo.append(textoComLinks(m.texto));
  // Link direto de imagem/GIF vira imagem no chat (igual o Discord)
  const linkDeImagem = m.texto && acharLinkDeImagem(m.texto);
  if (linkDeImagem) {
    const img = criarImagemDeLink(linkDeImagem.url);
    corpo.append(linkDeImagem.spoiler ? comSpoiler(img) : img);
  }
  if (m.gif) {
    const gif = criarGifNaMensagem(m.gif);
    corpo.append(m.spoiler ? comSpoiler(gif) : gif);
  }
  if (m.imagem) {
    const img = el('img', 'img-msg');
    img.src = m.imagem;
    img.alt = 'Imagem enviada por ' + m.nome;
    img.onclick = () => verImagem(m.imagem);
    img.onload = () => {
      if (estado.grudado) rolarProFim();
    };
    corpo.append(m.spoiler ? comSpoiler(img) : img);
  }
  linha.append(lado, corpo);
  caixa.append(linha);
  estado.ultimaMsg = m;
  if (estado.grudado || m.autor === estado.eu?.id) rolarProFim();
}

function chatVisivel() {
  return !document.hidden && (estado.visao === 'texto' || estado.chatAberto);
}

function atualizarNaoLidas() {
  if (chatVisivel()) estado.naoLidas = 0;
  const n = estado.naoLidas;
  document.title = (n ? `(${n}) ` : '') + estado.nomeServidor;
  const contador = $('#contadorTexto');
  contador.hidden = !n || estado.visao === 'texto';
  contador.textContent = n > 99 ? '99+' : String(n);
  $('#bolinhaChat').hidden = !n;
}

// "Fulano está digitando…"
let ultimoAvisoDigitando = 0;
function mostrarDigitando({ id, nome }) {
  const antes = estado.digitando.get(id);
  if (antes) clearTimeout(antes.timer);
  const timer = setTimeout(() => {
    estado.digitando.delete(id);
    renderizarDigitando();
  }, 3500);
  estado.digitando.set(id, { nome, timer });
  renderizarDigitando();
}
function renderizarDigitando() {
  const caixa = $('#digitando');
  caixa.replaceChildren();
  const nomes = [...estado.digitando.values()].map((d) => d.nome);
  if (!nomes.length) return;
  if (nomes.length > 3) {
    caixa.textContent = 'Várias pessoas estão digitando…';
    return;
  }
  nomes.forEach((n, i) => {
    if (i) caixa.append(i === nomes.length - 1 ? ' e ' : ', ');
    caixa.append(el('b', null, n));
  });
  caixa.append(nomes.length === 1 ? ' está digitando…' : ' estão digitando…');
}

// Imagens: escolher, colar (Ctrl+V) ou arrastar
function escolherAnexo(arquivo) {
  if (!arquivo || !arquivo.type.startsWith('image/')) return toast('Só dá pra mandar imagens.', true);
  if (arquivo.size > 8 * 1024 * 1024) return toast('Imagem muito grande (máximo 8 MB).', true);
  estado.anexo = arquivo;
  if (estado.anexoUrl) URL.revokeObjectURL(estado.anexoUrl);
  estado.anexoUrl = URL.createObjectURL(arquivo);
  $('#anexoPreview').src = estado.anexoUrl;
  $('#anexoNome').textContent = arquivo.name || 'imagem colada';
  $('#anexo').hidden = false;
  estado.anexoSpoiler = false;
  $('#btnSpoilerAnexo').classList.remove('ligado');
  $('#campoMsg').focus();
}
function tirarAnexo() {
  estado.anexo = null;
  if (estado.anexoUrl) URL.revokeObjectURL(estado.anexoUrl);
  estado.anexoUrl = '';
  $('#anexo').hidden = true;
  $('#arquivoImagem').value = '';
}

let enviando = false;
async function enviarMensagem() {
  const campo = $('#campoMsg');
  const texto = campo.value.trim();
  if ((!texto && !estado.anexo) || enviando) return;
  enviando = true;
  try {
    let imagem = null;
    if (estado.anexo) {
      $('#anexoNome').textContent = 'Enviando imagem…';
      let resposta = null;
      try {
        const r = await fetch('/api/imagem', { method: 'POST', headers: { 'X-Token': estado.token }, body: estado.anexo });
        resposta = await r.json();
      } catch {
        resposta = { ok: false, erro: 'Não consegui enviar a imagem.' };
      }
      if (!resposta.ok) {
        toast(resposta.erro || 'Não consegui enviar a imagem.', true);
        $('#anexoNome').textContent = estado.anexo.name || 'imagem colada';
        return;
      }
      imagem = resposta.url;
      const spoiler = estado.anexoSpoiler;
      tirarAnexo();
      estado.anexoSpoiler = spoiler;
    }
    campo.value = '';
    ajustarAlturaDoCampo();
    const r = await rede.pedir('msg', { texto, imagem, spoiler: !!imagem && estado.anexoSpoiler });
    if (!r.ok) {
      toast(r.erro || 'Mensagem não enviada.', true);
      if (texto && !campo.value) campo.value = texto;
    }
  } finally {
    enviando = false;
    estado.anexoSpoiler = false;
  }
}

function ajustarAlturaDoCampo() {
  const campo = $('#campoMsg');
  campo.style.height = 'auto';
  campo.style.height = Math.min(campo.scrollHeight, 180) + 'px';
}

function verImagem(url) {
  $('#imagemGrande').src = url;
  $('#visualizador').hidden = false;
}

// =================================================================
// 6. LISTAS (sala de voz, membros, painel do usuário)
// =================================================================
function renderizarTudo() {
  if (!estado.eu) return;
  renderizarListaVoz();
  renderizarMembros();
  renderizarPainelUsuario();
  renderizarPalco();
  atualizarNaoLidas();
}

function renderizarListaVoz() {
  const ul = $('#listaVoz');
  ul.replaceChildren();
  for (const u of pessoasNaVoz()) {
    const li = el('li');
    li.dataset.fala = u.id;
    li.classList.toggle('falando', estado.falando.has(u.id));
    li.append(criarAvatar(u.nome, u.cor, u.avatar), el('span', 'nome-voz', u.nome));
    const icones = el('span', 'icones-voz');
    if (u.tela) icones.append(el('span', 'ao-vivo', 'AO VIVO'));
    if (u.cam) icones.insertAdjacentHTML('beforeend', icone('cam'));
    if (u.surdo) icones.insertAdjacentHTML('beforeend', `<span class="vermelho">${icone('fone-off')}</span>`);
    else if (!u.mic) icones.insertAdjacentHTML('beforeend', `<span class="vermelho">${icone('mic-off')}</span>`);
    li.append(icones);
    li.title = u.tela ? `Ver a tela de ${u.nome}` : u.nome;
    li.onclick = () => {
      abrirVisao('voz');
      if (u.tela && estado.naVoz) {
        estado.foco = 't:' + u.id;
        renderizarPalco();
      }
    };
    ul.append(li);
  }
}

function renderizarMembros() {
  const lista = usuariosOrdenados();
  $('#tituloMembros').textContent = lista.length === 1 ? '1 pessoa online' : `${lista.length} pessoas online`;
  // lá em cima: as carinhas de quem está online (clicando abre a lista)
  $('#contagemOnline').textContent = `${lista.length} online`;
  $('#rostosTopo').replaceChildren(...lista.slice(0, 3).map((u) => criarAvatar(u.nome, u.cor, u.avatar)));
  const ul = $('#listaMembros');
  ul.replaceChildren();
  for (const u of lista) {
    const li = el('li', 'membro' + (u.id === estado.eu.id ? ' eu' : ''));
    const quem = el('div', 'quem');
    const nome = el('strong', null, u.nome);
    if (u.admin) nome.append(el('span', 'coroa', ' 👑'));
    quem.append(nome);
    const sub = el('small');
    if (u.naVoz) sub.innerHTML = icone('volume');
    sub.append(u.status || (u.naVoz ? (u.tela ? 'Transmitindo a tela' : 'Na sala de voz') : 'Online'));
    quem.append(sub);
    li.append(criarAvatar(u.nome, u.cor, u.avatar), quem);
    li.tabIndex = 0;
    li.onclick = (e) => {
      e.stopPropagation();
      abrirPerfil(u.id, li);
    };
    ul.append(li);
  }
}

function micDesligado() {
  return !estado.mic || estado.surdo || (estado.naVoz && !midia.micTrack);
}

function podeCompartilharTela() {
  return !!navigator.mediaDevices?.getDisplayMedia && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function renderizarPainelUsuario() {
  const eu = meuUsuario() || estado.eu;
  pintarAvatar($('#meuAvatar'), eu);
  $('#meuNome').textContent = eu.nome;
  $('#meuStatus').textContent = estado.naVoz
    ? estado.tela
      ? 'Transmitindo a tela'
      : 'Na sala de voz'
    : eu.status || 'Online';

  const semMic = estado.naVoz && !midia.micTrack;
  for (const b of [$('#btnMic'), $('#btnMic2')]) {
    trocarIcone(b, micDesligado() ? 'mic-off' : 'mic');
    b.classList.toggle('desligado', micDesligado());
    b.title = semMic ? 'Sem microfone — clique pra tentar de novo' : micDesligado() ? 'Ligar microfone' : 'Mutar microfone (Ctrl+Shift+M)';
  }
  for (const b of [$('#btnSurdo'), $('#btnSurdo2')]) {
    trocarIcone(b, estado.surdo ? 'fone-off' : 'fone');
    b.classList.toggle('desligado', estado.surdo);
    b.title = estado.surdo ? 'Ligar áudio' : 'Desligar áudio (Ctrl+Shift+D)';
  }
  const btnCam = $('#btnCam');
  trocarIcone(btnCam, estado.cam ? 'cam' : 'cam-off');
  btnCam.classList.toggle('ligado', estado.cam);
  btnCam.title = estado.cam ? 'Desligar câmera' : 'Ligar câmera';
  for (const b of [$('#btnTela'), $('#btnTelaMini')]) {
    trocarIcone(b, estado.tela ? 'tela-parar' : 'tela');
    b.classList.toggle('ligado', estado.tela);
    b.title = estado.tela ? 'Parar de compartilhar' : 'Compartilhar tela';
    b.hidden = !podeCompartilharTela();
  }

  $('#painelConectado').hidden = !estado.naVoz;
  const conectando = [...pares.values()].some((p) => p.pc.connectionState !== 'connected');
  const status = $('#textoStatusVoz');
  status.textContent = conectando ? 'Conectando…' : 'Voz conectada';
  status.classList.toggle('conectando', conectando);
}

function abrirVisao(qual) {
  estado.visao = qual;
  aplicarVisao();
}

function aplicarVisao() {
  const visao = estado.visao; // 'texto', 'voz' ou 'jogos'
  const principal = $('#principal');
  principal.classList.toggle('modo-texto', visao === 'texto');
  principal.classList.toggle('modo-voz', visao === 'voz');
  principal.classList.toggle('modo-jogos', visao === 'jogos');
  principal.classList.toggle('modo-cinema', visao === 'cinema');
  principal.classList.toggle('chat-fechado', !estado.chatAberto);
  $('#canalTexto').classList.toggle('ativo', visao === 'texto');
  $('#canalVoz').classList.toggle('ativo', visao === 'voz');
  $('#canalJogos').classList.toggle('ativo', visao === 'jogos');
  $('#canalCinema').classList.toggle('ativo', visao === 'cinema');
  $('#canalAnimes').classList.toggle('ativo', visao === 'jogos' && typeof jogos !== 'undefined' && jogos.secao === 'animes');
  const titulo = $('#tituloTopo');
  const { icn, nome } = {
    texto: { icn: 'chat', nome: 'Chat' },
    voz: { icn: 'volume', nome: 'Call' },
    jogos: { icn: 'controle', nome: 'Jogos' },
    cinema: { icn: 'tv', nome: 'Cinema' },
  }[visao];
  titulo.innerHTML = icone(icn);
  titulo.append(nome);
  if (visao === 'jogos' && typeof renderizarJogos === 'function') renderizarJogos();
  if (typeof cinemaMudouVisao === 'function') cinemaMudouVisao(visao === 'cinema');
  $('#app').classList.remove('menu-aberto', 'mostrar-membros');
  renderizarTudo();
  if (estado.grudado) requestAnimationFrame(rolarProFim);
}

// =================================================================
// 7. CHAMADA: MICROFONE, CÂMERA E TELA
// =================================================================
function motivoDoErro(e) {
  switch (e?.name) {
    case 'NotAllowedError':
      return 'acesso bloqueado. Clique no cadeado ao lado do endereço do site e permita.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'nenhum dispositivo encontrado.';
    case 'NotReadableError':
      return 'outro programa está usando. Feche ele e tente de novo.';
    default:
      return 'não consegui abrir (' + (e?.message || e) + ').';
  }
}

function pararTrack(track) {
  if (track) {
    track.onended = null;
    track.stop();
  }
}

async function abrirMicrofone() {
  pararTrack(midia.micTrack);
  midia.micTrack = null;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: prefs.micId ? { ideal: prefs.micId } : undefined,
        echoCancellation: prefs.reducaoRuido,
        noiseSuppression: prefs.reducaoRuido,
        autoGainControl: true,
      },
    });
    midia.micTrack = stream.getAudioTracks()[0];
    midia.micTrack.contentHint = 'speech';
    midia.micTrack.enabled = estado.mic && !estado.surdo;
    midia.micTrack.onended = () => {
      toast('O microfone foi desconectado.', true);
      midia.micTrack = null;
      trocarTrackEmTodos('mic');
      atualizarMeuEstado();
    };
    return true;
  } catch (e) {
    toast('Microfone: ' + motivoDoErro(e), true);
    return false;
  }
}

// Detecta quando EU estou falando (pra acender a bolinha verde)
let detector = null;
function iniciarDetectorDeFala() {
  pararDetector();
  if (!midia.micTrack) return;
  try {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const fonte = ctx.createMediaStreamSource(new MediaStream([midia.micTrack]));
    const analisador = ctx.createAnalyser();
    analisador.fftSize = 512;
    fonte.connect(analisador);
    const amostras = new Float32Array(analisador.fftSize);
    let falando = false;
    let ultimoSom = 0;
    const timer = setInterval(() => {
      analisador.getFloatTimeDomainData(amostras);
      let soma = 0;
      for (const v of amostras) soma += v * v;
      const nivel = Math.sqrt(soma / amostras.length);
      const ativo = estado.mic && !estado.surdo;
      estado.nivelMic = ativo ? nivel : 0;
      const agora = performance.now();
      if (ativo && nivel > 0.018) ultimoSom = agora;
      const agoraFalando = agora - ultimoSom < 350;
      if (agoraFalando !== falando) {
        falando = agoraFalando;
        rede.enviar('falando', falando);
        marcarFalando(estado.eu.id, falando);
      }
    }, 70);
    detector = { ctx, timer, falando: () => falando };
  } catch (e) {
    console.warn('[detector]', e);
  }
}
function pararDetector() {
  if (!detector) return;
  clearInterval(detector.timer);
  detector.ctx.close().catch(() => {});
  if (detector.falando()) {
    rede.enviar('falando', false);
    marcarFalando(estado.eu?.id, false);
  }
  detector = null;
  estado.nivelMic = 0;
}

function marcarFalando(id, falando) {
  if (!id) return;
  if (falando) estado.falando.add(id);
  else estado.falando.delete(id);
  document.querySelectorAll(`[data-fala="${CSS.escape(id)}"]`).forEach((e) => e.classList.toggle('falando', falando));
}

function estadoDeVoz() {
  return { mic: estado.mic && !estado.surdo && !!midia.micTrack, cam: estado.cam, tela: estado.tela, surdo: estado.surdo };
}

// Atualiza meu estado na tela e avisa o servidor
function atualizarMeuEstado() {
  const eu = meuUsuario();
  if (eu) Object.assign(eu, estadoDeVoz(), { naVoz: estado.naVoz });
  if (estado.naVoz) rede.enviar('voz:estado', estadoDeVoz());
  renderizarTudo();
}

async function entrarNaVoz() {
  if (estado.naVoz || estado.entrandoNaVoz || !estado.eu) return;
  abrirVisao('voz');
  if (!window.isSecureContext || !window.RTCPeerConnection) {
    toast('A chamada só funciona pelo localhost ou pelo link https dos amigos.', true);
    return;
  }
  estado.entrandoNaVoz = true;
  renderizarPalco();
  await Promise.all([abrirMicrofone(), buscarServidoresIce()]);
  const r = await rede.pedir('voz:entrar', estadoDeVoz());
  estado.entrandoNaVoz = false;
  if (!r.ok) {
    pararTrack(midia.micTrack);
    midia.micTrack = null;
    if (!r.rede) toast(r.erro || 'Não consegui entrar na chamada.', true);
    renderizarTudo();
    return;
  }
  estado.naVoz = true;
  estado.cam = false;
  estado.tela = false;
  const eu = meuUsuario();
  if (eu) Object.assign(eu, estadoDeVoz(), { naVoz: true });
  iniciarDetectorDeFala();
  // Eu acabei de chegar: eu é que "ligo" pra cada um que já estava na sala
  for (const id of r.pares) criarPar(id, true);
  som('entrar');
  renderizarTudo();
}

function sairDaVoz(porQuedaDeConexao) {
  if (!estado.naVoz) return;
  for (const id of [...pares.keys()]) fecharPar(id);
  pararDetector();
  pararTrack(midia.micTrack);
  pararTrack(midia.camTrack);
  if (midia.telaStream) midia.telaStream.getTracks().forEach(pararTrack);
  midia.micTrack = midia.camTrack = midia.telaVideo = midia.telaAudio = midia.telaStream = null;
  estado.naVoz = false;
  estado.cam = false;
  estado.tela = false;
  estado.foco = null;
  estado.falando.clear();
  const eu = meuUsuario();
  if (eu) Object.assign(eu, { naVoz: false, cam: false, tela: false });
  if (!porQuedaDeConexao) {
    rede.enviar('voz:sair');
    som('sair');
  }
  renderizarTudo();
}

function aplicarMicESom() {
  if (midia.micTrack) midia.micTrack.enabled = estado.mic && !estado.surdo;
  for (const par of pares.values()) {
    par.audioMic.muted = estado.surdo;
    par.audioTela.muted = estado.surdo;
  }
}

async function alternarMic() {
  if (meuUsuario()?.mutadoAdmin && (!estado.mic || estado.surdo)) {
    toast('Um admin te mutou na chamada. Espere ele te desmutar.', true);
    return;
  }
  if (estado.surdo) {
    estado.surdo = false;
    estado.mic = true;
  } else {
    estado.mic = !estado.mic;
  }
  // Se entrou sem microfone, tenta abrir de novo agora
  if (estado.naVoz && estado.mic && !midia.micTrack && (await abrirMicrofone())) {
    trocarTrackEmTodos('mic');
    iniciarDetectorDeFala();
  }
  aplicarMicESom();
  som(estado.mic ? 'desmutar' : 'mutar');
  atualizarMeuEstado();
}

function alternarSurdo() {
  estado.surdo = !estado.surdo;
  aplicarMicESom();
  som(estado.surdo ? 'mutar' : 'desmutar');
  atualizarMeuEstado();
}

async function alternarCam() {
  if (!estado.naVoz) return;
  if (estado.cam) return desligarCam();
  if (estado.abrindoCam) return;
  estado.abrindoCam = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: prefs.camId ? { ideal: prefs.camId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
      },
    });
    if (!estado.naVoz) {
      stream.getTracks().forEach(pararTrack);
      return;
    }
    midia.camTrack = stream.getVideoTracks()[0];
    midia.camTrack.contentHint = 'motion';
    midia.camTrack.onended = desligarCam;
    estado.cam = true;
    trocarTrackEmTodos('cam');
    atualizarMeuEstado();
  } catch (e) {
    toast('Câmera: ' + motivoDoErro(e), true);
  } finally {
    estado.abrindoCam = false;
  }
}

function desligarCam() {
  pararTrack(midia.camTrack);
  midia.camTrack = null;
  estado.cam = false;
  trocarTrackEmTodos('cam');
  atualizarMeuEstado();
}

async function alternarTela() {
  if (!estado.naVoz) return;
  if (estado.tela) return pararTela();
  if (!podeCompartilharTela()) {
    toast('Seu navegador não compartilha tela (no celular não dá). Use Chrome ou Edge no PC.', true);
    return;
  }
  const q = QUALIDADES[prefs.qualidade] || QUALIDADES['1080p30'];
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: q.largura },
        height: { ideal: q.altura },
        frameRate: { ideal: q.fps, max: q.fps },
        cursor: 'always', // mostra a setinha do mouse na transmissão
      },
      // Som da aba/tela sem "tratamento de voz" (senão a música fica horrível)
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      systemAudio: 'include', // permite som do PC inteiro no Windows
      selfBrowserSurface: 'exclude', // não mostra a própria aba do Resenha na lista
      surfaceSwitching: 'include', // botão "compartilhar esta aba" pra trocar de aba
    });
  } catch (e) {
    if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') toast('Tela: ' + motivoDoErro(e), true);
    return;
  }
  if (!estado.naVoz) {
    stream.getTracks().forEach(pararTrack);
    return;
  }
  midia.telaStream = stream;
  midia.telaVideo = stream.getVideoTracks()[0];
  midia.telaAudio = stream.getAudioTracks()[0] || null;
  midia.telaVideo.contentHint = prefs.otimizar === 'nitidez' ? 'detail' : 'motion';
  // Quando clica em "Parar de compartilhar" na barrinha do navegador
  midia.telaVideo.onended = pararTela;
  estado.tela = true;
  trocarTrackEmTodos('tela');
  trocarTrackEmTodos('telaAudio');
  atualizarMeuEstado();
  if (!midia.telaAudio) toast('Dica: pra transmitir o SOM, compartilhe uma aba e marque "Compartilhar áudio da guia".');

  // Compartilhou a tela inteira ou uma janela? Avisa (uma vez só) sobre jogos em tela cheia
  const superficie = midia.telaVideo.getSettings?.().displaySurface;
  if ((superficie === 'monitor' || superficie === 'window') && !prefs.viuDicaJogo) {
    prefs.viuDicaJogo = true;
    salvarPrefs();
    setTimeout(
      () =>
        toast(
          'Vai jogar? Deixe o jogo em "janela sem bordas" (ou janela maximizada). Em tela cheia normal a transmissão congela.',
          true
        ),
      1200
    );
  }
}

function pararTela() {
  if (midia.telaStream) midia.telaStream.getTracks().forEach(pararTrack);
  midia.telaStream = midia.telaVideo = midia.telaAudio = null;
  estado.tela = false;
  if (estado.foco === 't:' + estado.eu.id) estado.foco = null;
  trocarTrackEmTodos('tela');
  trocarTrackEmTodos('telaAudio');
  atualizarMeuEstado();
}

// Muda o microfone (quando troca nas configurações)
async function trocarMicrofone() {
  if (!estado.naVoz) return;
  await abrirMicrofone();
  trocarTrackEmTodos('mic');
  iniciarDetectorDeFala();
  atualizarMeuEstado();
}

// =================================================================
// 8. CHAMADA: CONEXÕES WEBRTC (PC A PC)
// =================================================================
// Como funciona, resumido:
//  - Quem entra na sala cria uma conexão (RTCPeerConnection) com cada um
//    que já estava lá, e manda uma "oferta" (descrição do que vai enviar).
//  - O outro responde com uma "resposta". Os dois trocam "candidatos"
//    (possíveis caminhos de rede). Tudo isso passa pelo servidor (sinal).
//  - Achado um caminho, áudio e vídeo vão DIRETO de um PC pro outro.
//  - Cada conexão tem 4 canos fixos (SLOTS). Ligar câmera ou tela só troca
//    o que passa no cano (replaceTrack), sem renegociar nada.

function trackDoSlot(slot) {
  return { mic: midia.micTrack, cam: midia.camTrack, tela: midia.telaVideo, telaAudio: midia.telaAudio }[slot] || null;
}

function enviarSinal(para, dados) {
  rede.enviar('sinal', { para, dados });
}

// Melhora o som: pede áudio estéreo e com mais qualidade (bom pra filme e música)
function melhorarAudio(sdp) {
  const tipos = new Set([...sdp.matchAll(/a=rtpmap:(\d+) opus\/48000\/2/gi)].map((m) => m[1]));
  for (const pt of tipos) {
    sdp = sdp.replace(new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`, 'g'), (linha, params) =>
      /stereo=/.test(params) ? linha : `a=fmtp:${pt} ${params};stereo=1;sprop-stereo=1;maxaveragebitrate=128000`
    );
  }
  return sdp;
}

function volumeSalvo(nome, tipo) {
  const v = prefs.volumes[tipo + ':' + nome];
  return typeof v === 'number' ? v : 1;
}

function criarAudio() {
  const a = document.createElement('audio');
  a.autoplay = true;
  $('#audios').append(a);
  return a;
}

function aplicarSaida(audio) {
  if (typeof audio.setSinkId === 'function') audio.setSinkId(prefs.saidaId || '').catch(() => {});
}

let esperandoClique = false;
function tocarAudio(audio, track) {
  audio.srcObject = new MediaStream([track]);
  audio.muted = estado.surdo;
  aplicarSaida(audio);
  audio.play().catch(() => {
    // O navegador bloqueou o som até a pessoa clicar em algo
    if (esperandoClique) return;
    esperandoClique = true;
    toast('Clique em qualquer lugar da página pra liberar o som.');
    document.addEventListener(
      'pointerdown',
      () => {
        esperandoClique = false;
        document.querySelectorAll('#audios audio').forEach((a) => a.srcObject && a.play().catch(() => {}));
      },
      { once: true }
    );
  });
}

// Pega a lista de servidores STUN/TURN na hora de entrar na chamada
// (as senhas do TURN vencem, então sempre pede de novo)
async function buscarServidoresIce() {
  try {
    const r = await fetch('/api/ice', { headers: { 'X-Token': estado.token } });
    const j = await r.json();
    if (j.ok && Array.isArray(j.iceServers)) estado.iceServers = j.iceServers;
  } catch {
    /* usa a lista básica */
  }
}

// Desfaz a conexão com essa pessoa e liga de novo do zero
function reconectarPar(id) {
  if (!estado.naVoz) return;
  enviarSinal(id, { reiniciar: true });
  fecharPar(id);
  criarPar(id, true);
  renderizarPalco();
  renderizarPainelUsuario();
}

function criarPar(id, souEuQueLigo) {
  fecharPar(id);
  const pc = new RTCPeerConnection({ iceServers: estado.iceServers || estado.config.iceServers });
  const nome = nomeDe(id);
  const par = {
    id,
    pc,
    educado: estado.eu.id < id, // regra pra resolver quando os dois "ligam" ao mesmo tempo
    iniciador: souEuQueLigo,
    preparado: souEuQueLigo,
    fazendoOferta: false,
    ignorarOferta: false,
    fila: Promise.resolve(),
    remoto: {}, // o que chega do outro: { mic, cam, tela, telaAudio }
    audioMic: criarAudio(),
    audioTela: criarAudio(),
    avisouFalha: false,
  };
  par.audioMic.volume = volumeSalvo(nome, 'voz');
  par.audioTela.volume = volumeSalvo(nome, 'tela');
  pares.set(id, par);

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) enviarSinal(id, { candidato: candidate });
  };

  pc.onnegotiationneeded = async () => {
    try {
      par.fazendoOferta = true;
      const oferta = await pc.createOffer();
      if (pc.signalingState !== 'stable') return;
      oferta.sdp = melhorarAudio(oferta.sdp);
      await pc.setLocalDescription(oferta);
      enviarSinal(id, { descricao: pc.localDescription });
    } catch (e) {
      console.warn('[oferta]', e);
    } finally {
      par.fazendoOferta = false;
    }
  };

  pc.ontrack = (ev) => {
    const slot = SLOTS[pc.getTransceivers().indexOf(ev.transceiver)];
    if (!slot) return;
    par.remoto[slot] = ev.track;
    if (slot === 'mic') tocarAudio(par.audioMic, ev.track);
    if (slot === 'telaAudio') tocarAudio(par.audioTela, ev.track);
    renderizarPalco();
  };

  pc.onconnectionstatechange = () => {
    const s = pc.connectionState;
    if (s === 'connected') {
      par.avisouFalha = false;
      aplicarQualidade(par);
    }
    if (s === 'failed') {
      if (par.iniciador) pc.restartIce(); // tenta de novo
      if (!par.avisouFalha) {
        par.avisouFalha = true;
        toast(
          estado.config.temTurn
            ? `Não consegui conectar com ${nomeDe(id)}. Clique em "Tentar de novo" no quadradinho dele.`
            : `Não consegui conectar com ${nomeDe(id)}: a internet de alguém bloqueia a ligação direta. Quem roda o servidor precisa ligar a ponte TURN (LEIA-ME, uns 5 minutos).`,
          true
        );
      }
    }
    renderizarPalco();
    renderizarPainelUsuario();
  };

  if (souEuQueLigo) {
    for (const slot of SLOTS) {
      pc.addTransceiver(trackDoSlot(slot) || TIPO_DO_SLOT[slot], { direction: 'sendrecv' });
    }
  }
  return par;
}

// Quem recebe a ligação liga os 4 canos e coloca o que já estiver mandando
function prepararTransceivers(par) {
  if (par.preparado) return;
  par.preparado = true;
  par.pc.getTransceivers().forEach((t, i) => {
    const slot = SLOTS[i];
    if (!slot) return;
    t.direction = 'sendrecv';
    const track = trackDoSlot(slot);
    if (track) t.sender.replaceTrack(track).catch((e) => console.warn('[preparar]', e));
  });
}

function receberSinal({ de, dados }) {
  if (!estado.naVoz || !dados) return;
  if (dados.reiniciar) {
    // O outro lado vai religar do zero: joga fora a conexão antiga
    fecharPar(de);
    renderizarPalco();
    return;
  }
  let par = pares.get(de);
  if (!par) {
    if (dados.descricao?.type !== 'offer') return;
    par = criarPar(de, false);
  }
  // Uma fila por pessoa: processa um sinal de cada vez, na ordem certa
  par.fila = par.fila.then(() => tratarSinal(par, dados)).catch((e) => console.warn('[sinal]', e));
}

async function tratarSinal(par, { descricao, candidato }) {
  const pc = par.pc;
  if (pc.signalingState === 'closed') return;
  if (descricao) {
    const colisao = descricao.type === 'offer' && (par.fazendoOferta || pc.signalingState !== 'stable');
    par.ignorarOferta = !par.educado && colisao;
    if (par.ignorarOferta) return;
    await pc.setRemoteDescription(descricao);
    if (descricao.type === 'offer') {
      prepararTransceivers(par);
      const resposta = await pc.createAnswer();
      resposta.sdp = melhorarAudio(resposta.sdp);
      await pc.setLocalDescription(resposta);
      enviarSinal(par.id, { descricao: pc.localDescription });
    }
  } else if (candidato) {
    try {
      await pc.addIceCandidate(candidato);
    } catch (e) {
      if (!par.ignorarOferta) console.warn('[candidato]', e);
    }
  }
}

function trocarTrackEmTodos(slot) {
  const i = SLOTS.indexOf(slot);
  const track = trackDoSlot(slot);
  for (const par of pares.values()) {
    const t = par.pc.getTransceivers()[i];
    if (!t || !par.preparado) continue;
    t.sender
      .replaceTrack(track)
      .then(() => aplicarQualidade(par))
      .catch((e) => console.warn('[troca]', e));
  }
}

// Limita quanto de internet a câmera e a tela podem usar
async function ajustarEnvio(sender, valores) {
  if (!sender) return;
  try {
    const p = sender.getParameters();
    if (!p.encodings || !p.encodings.length) return;
    Object.assign(p.encodings[0], valores);
    await sender.setParameters(p);
  } catch (e) {
    console.warn('[qualidade]', e);
  }
}
function aplicarQualidade(par) {
  // Uma de cada vez (o navegador reclama se duas mudanças se atropelam)
  par.filaQualidade = (par.filaQualidade || Promise.resolve()).then(async () => {
    if (par.pc.connectionState === 'closed') return;
    const t = par.pc.getTransceivers();
    const q = QUALIDADES[prefs.qualidade] || QUALIDADES['1080p30'];
    await ajustarEnvio(t[1]?.sender, { maxBitrate: 900_000, maxFramerate: 30 });
    await ajustarEnvio(t[2]?.sender, { maxBitrate: q.bitrate, maxFramerate: q.fps });
    await ajustarEnvio(t[3]?.sender, { maxBitrate: 160_000 });
  });
  return par.filaQualidade;
}

function fecharPar(id) {
  const par = pares.get(id);
  if (!par) return;
  pares.delete(id);
  const pc = par.pc;
  pc.onnegotiationneeded = pc.onicecandidate = pc.ontrack = pc.onconnectionstatechange = null;
  try {
    pc.close();
  } catch {
    /* já estava fechada */
  }
  for (const a of [par.audioMic, par.audioTela]) {
    a.srcObject = null;
    a.remove();
  }
}

// =================================================================
// 9. PALCO: OS QUADRADINHOS DE VÍDEO
// =================================================================
const blocos = new Map(); // chave ('u:id' pessoa, 't:id' tela) -> elemento

function renderizarPalco() {
  if (!estado.eu) return;
  const dentro = estado.naVoz;
  $('#foraDaVoz').hidden = dentro;
  $('#grade').hidden = !dentro;
  $('#controles').hidden = !dentro;
  if (!dentro) {
    for (const b of blocos.values()) b.remove();
    blocos.clear();
    renderizarForaDaVoz();
    return;
  }

  const desejados = [];
  const pessoas = pessoasNaVoz();
  for (const u of pessoas) desejados.push({ chave: 'u:' + u.id, u, tipo: 'pessoa' });
  for (const u of pessoas) if (u.tela) desejados.push({ chave: 't:' + u.id, u, tipo: 'tela' });

  const chaves = new Set(desejados.map((d) => d.chave));
  for (const [chave, b] of blocos) {
    if (!chaves.has(chave)) {
      b.remove();
      blocos.delete(chave);
    }
  }
  if (estado.foco && !chaves.has(estado.foco)) estado.foco = null;

  const grade = $('#grade');
  desejados.forEach((d, i) => {
    let b = blocos.get(d.chave);
    if (!b) {
      b = criarBloco(d);
      blocos.set(d.chave, b);
      grade.append(b);
    }
    b.style.order = d.chave === estado.foco ? -1 : i;
    atualizarBloco(b, d);
  });
  organizarGrade();
}

function renderizarForaDaVoz() {
  const quem = pessoasNaVoz();
  $('#rostosNaSala').replaceChildren(...quem.slice(0, 6).map((u) => criarAvatar(u.nome, u.cor, u.avatar)));
  $('#textoForaDaVoz').textContent = quem.length
    ? `${listarNomes(quem.map((u) => u.nome))} ${quem.length === 1 ? 'está' : 'estão'} na sala.`
    : 'Ninguém na sala ainda. Entra aí que a galera aparece!';
  const btn = $('#btnEntrarVoz');
  btn.disabled = estado.entrandoNaVoz;
  btn.innerHTML = icone('telefone');
  btn.append(estado.entrandoNaVoz ? 'Entrando…' : 'Entrar na chamada');
  $('#avisoInseguro').hidden = window.isSecureContext;
}

// Escolhe quantas colunas/linhas deixam os vídeos maiores
function organizarGrade() {
  const grade = $('#grade');
  const n = blocos.size;
  const comFoco = !!estado.foco && n > 1;
  grade.classList.toggle('com-foco', comFoco);
  if (comFoco || !n) return;
  const largura = grade.clientWidth || 800;
  const altura = grade.clientHeight || 450;
  let melhor = { colunas: 1, linhas: n, area: 0 };
  for (let c = 1; c <= n; c++) {
    const l = Math.ceil(n / c);
    const w = Math.min(largura / c, ((altura / l) * 16) / 9);
    const area = (w * w * 9) / 16;
    if (area > melhor.area) melhor = { colunas: c, linhas: l, area };
  }
  grade.style.setProperty('--colunas', melhor.colunas);
  grade.style.setProperty('--linhas', melhor.linhas);
}
new ResizeObserver(organizarGrade).observe($('#grade'));

function telaCheia(bloco) {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else bloco.requestFullscreen?.().catch(() => {});
}

function alternarFoco(chave) {
  estado.foco = estado.foco === chave ? null : chave;
  renderizarPalco();
}

function criarBloco(d) {
  const b = el('div', 'bloco ' + d.tipo);
  b.dataset.chave = d.chave;
  b.tabIndex = 0;
  b._d = d;

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true; // o som vem pelos <audio> separados

  const rotulo = el('div', 'rotulo');
  rotulo.append(el('span', 'icones-rotulo'), el('span', 'nome'));
  const status = el('div', 'status-con', 'Conectando…');
  status.hidden = true;

  const acoes = el('div', 'acoes-bloco');
  if (d.u.id !== estado.eu.id) {
    const tipoVolume = d.tipo === 'tela' ? 'tela' : 'voz';
    const caixaVol = el('label', 'volume');
    caixaVol.title = d.tipo === 'tela' ? 'Volume da transmissão' : 'Volume da voz';
    caixaVol.innerHTML = icone('volume');
    const barra = document.createElement('input');
    barra.type = 'range';
    barra.min = '0';
    barra.max = '100';
    barra.value = String(Math.round(volumeSalvo(d.u.nome, tipoVolume) * 100));
    barra.oninput = () => {
      const v = Number(barra.value) / 100;
      const par = pares.get(b._d.u.id);
      if (par) (tipoVolume === 'tela' ? par.audioTela : par.audioMic).volume = v;
      prefs.volumes[tipoVolume + ':' + b._d.u.nome] = v;
      salvarPrefs();
    };
    caixaVol.append(barra);
    acoes.append(caixaVol);
  }
  const btnCheia = el('button', 'btn-icone');
  btnCheia.title = 'Tela cheia';
  btnCheia.innerHTML = icone('tela-cheia');
  btnCheia.onclick = (e) => {
    e.stopPropagation();
    telaCheia(b);
  };
  acoes.append(btnCheia);

  b.append(video, el('div', 'avatar'), rotulo, status, acoes);
  b.onclick = (e) => {
    if (!e.target.closest('.acoes-bloco')) alternarFoco(d.chave);
  };
  b.ondblclick = (e) => {
    if (!e.target.closest('.acoes-bloco')) telaCheia(b);
  };
  b.onkeydown = (e) => {
    if (e.key === 'Enter') alternarFoco(d.chave);
  };
  return b;
}

function atualizarBloco(b, d) {
  b._d = d;
  const u = d.u;
  const souEu = u.id === estado.eu.id;
  const par = pares.get(u.id);

  let track = null;
  if (d.tipo === 'pessoa') {
    if (u.cam) track = souEu ? midia.camTrack : par?.remoto.cam;
  } else {
    track = souEu ? midia.telaVideo : par?.remoto.tela;
  }
  track = track || null;
  const video = b.querySelector('video');
  if (track !== (b._track || null)) {
    b._track = track;
    video.srcObject = track ? new MediaStream([track]) : null;
    if (track) video.play().catch(() => {});
  }

  b.classList.toggle('com-video', !!track);
  b.classList.toggle('eu', souEu);
  b.classList.toggle('foco', d.chave === estado.foco);
  if (d.tipo === 'pessoa') {
    b.dataset.fala = u.id;
    b.classList.toggle('falando', estado.falando.has(u.id));
  }

  pintarAvatar(b.querySelector('.avatar'), u);

  const voce = souEu ? ' (você)' : '';
  b.querySelector('.nome').textContent = d.tipo === 'tela' ? `Tela de ${u.nome}${voce}` : u.nome + voce;
  const icones = b.querySelector('.icones-rotulo');
  icones.innerHTML = d.tipo === 'tela' ? '<span class="ao-vivo">AO VIVO</span>' : u.surdo ? icone('fone-off') : !u.mic ? icone('mic-off') : '';

  const conexao = souEu ? 'connected' : par?.pc.connectionState;
  const status = b.querySelector('.status-con');
  status.hidden = conexao === 'connected';
  const falhou = conexao === 'failed';
  if (status.dataset.falhou !== String(falhou)) {
    status.dataset.falhou = String(falhou);
    status.replaceChildren(falhou ? 'Sem conexão' : 'Conectando…');
    if (falhou) {
      const botao = el('button', 'tentar-de-novo', 'Tentar de novo');
      botao.onclick = (e) => {
        e.stopPropagation();
        reconectarPar(u.id);
      };
      status.append(botao);
    }
  }
}

// =================================================================
// 10. CONFIGURAÇÕES E CONVITE
// =================================================================
let corConfig = CORES[0];

function abrirModal(id) {
  $(id).hidden = false;
}
function fecharModais() {
  document.querySelectorAll('.modal').forEach((m) => (m.hidden = true));
}

let avatarPendente = ''; // foto escolhida, mas ainda não salva

function pintarPreviaAvatar() {
  pintarAvatar($('#cfgAvatar'), { nome: $('#cfgNome').value || '?', cor: corConfig, avatar: avatarPendente });
  $('#btnTirarFoto').hidden = !avatarPendente;
}

async function abrirConfig() {
  renderizarAdminConfig();
  const eu = meuUsuario() || estado.eu;
  $('#cfgNome').value = eu.nome;
  $('#cfgStatus').value = eu.status || '';
  $('#cfgBio').value = eu.bio || '';
  $('#contadorBio').textContent = `${$('#cfgBio').value.length}/190`;
  corConfig = eu.cor;
  avatarPendente = eu.avatar || '';
  montarCores($('#coresConfig'), corConfig, (c) => {
    corConfig = c;
    pintarPreviaAvatar();
  });
  pintarPreviaAvatar();
  $('#cfgRuido').checked = prefs.reducaoRuido;
  $('#cfgQualidade').value = prefs.qualidade;
  $('#cfgOtimizar').value = prefs.otimizar;
  abrirModal('#modalConfig');
  await preencherDispositivos();
  animarMedidor();
}

async function preencherDispositivos() {
  let lista = [];
  try {
    lista = await navigator.mediaDevices.enumerateDevices();
  } catch {
    /* navegador sem suporte */
  }
  preencherSelect($('#cfgMic'), lista.filter((d) => d.kind === 'audioinput'), prefs.micId, 'Microfone');
  preencherSelect($('#cfgCam'), lista.filter((d) => d.kind === 'videoinput'), prefs.camId, 'Câmera');
  const temSaida = 'setSinkId' in HTMLMediaElement.prototype;
  $('#campoSaida').hidden = !temSaida;
  if (temSaida) preencherSelect($('#cfgSaida'), lista.filter((d) => d.kind === 'audiooutput'), prefs.saidaId, 'Saída');
}

function preencherSelect(select, dispositivos, atual, rotulo) {
  select.replaceChildren();
  const padrao = el('option', null, 'Padrão do sistema');
  padrao.value = '';
  select.append(padrao);
  dispositivos
    .filter((d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
    .forEach((d, i) => {
      const op = el('option', null, d.label || `${rotulo} ${i + 1}`);
      op.value = d.deviceId;
      select.append(op);
    });
  select.value = [...select.options].some((o) => o.value === atual) ? atual : '';
}

function animarMedidor() {
  const barra = $('#barraNivel');
  const passo = () => {
    if ($('#modalConfig').hidden) return;
    barra.style.width = Math.min(100, estado.nivelMic * 500) + '%';
    requestAnimationFrame(passo);
  };
  passo();
  $('.medidor').title = estado.naVoz ? 'Fale algo pra testar o microfone' : 'Entre na chamada pra testar o microfone';
}

$('#cfgMic').onchange = () => {
  prefs.micId = $('#cfgMic').value;
  salvarPrefs();
  trocarMicrofone();
};
$('#cfgRuido').onchange = () => {
  prefs.reducaoRuido = $('#cfgRuido').checked;
  salvarPrefs();
  trocarMicrofone();
};
$('#cfgSaida').onchange = () => {
  prefs.saidaId = $('#cfgSaida').value;
  salvarPrefs();
  document.querySelectorAll('#audios audio').forEach(aplicarSaida);
};
$('#cfgCam').onchange = async () => {
  prefs.camId = $('#cfgCam').value;
  salvarPrefs();
  if (estado.cam) {
    desligarCam();
    await alternarCam();
  }
};
$('#cfgQualidade').onchange = $('#cfgOtimizar').onchange = () => {
  prefs.qualidade = $('#cfgQualidade').value;
  prefs.otimizar = $('#cfgOtimizar').value;
  salvarPrefs();
  if (midia.telaVideo) {
    const q = QUALIDADES[prefs.qualidade];
    midia.telaVideo.contentHint = prefs.otimizar === 'nitidez' ? 'detail' : 'motion';
    midia.telaVideo
      .applyConstraints({ width: { ideal: q.largura }, height: { ideal: q.altura }, frameRate: { ideal: q.fps, max: q.fps } })
      .catch(() => {});
    pares.forEach(aplicarQualidade);
  }
};

// Prepara a foto: GIF vai do jeito que está (pra continuar animado);
// as outras viram um quadrado de 256x256 recortado do meio (fica leve).
async function prepararFoto(arquivo) {
  if (!arquivo || !arquivo.type.startsWith('image/')) throw new Error('Escolha uma imagem.');
  if (arquivo.type === 'image/gif') {
    if (arquivo.size > 4 * 1024 * 1024) throw new Error('GIF muito grande (máximo 4 MB).');
    return arquivo;
  }
  const bitmap = await createImageBitmap(arquivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, 256, 256);
  if (bitmap.close) bitmap.close();
  const webp = await new Promise((ok) => canvas.toBlob(ok, 'image/webp', 0.9));
  return webp || new Promise((ok) => canvas.toBlob(ok, 'image/png'));
}

async function escolherFoto(arquivo) {
  const botao = $('#btnTrocarFoto');
  botao.disabled = true;
  botao.textContent = 'Enviando…';
  try {
    const dados = await prepararFoto(arquivo);
    const r = await fetch('/api/avatar', { method: 'POST', headers: { 'X-Token': estado.token }, body: dados });
    const j = await r.json();
    if (!j.ok) throw new Error(j.erro);
    avatarPendente = j.url;
    pintarPreviaAvatar();
    toast('Foto pronta! Clique em "Salvar perfil".');
  } catch (e) {
    toast(e.message || 'Não consegui usar essa foto.', true);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Trocar foto';
    $('#arquivoAvatar').value = '';
  }
}

$('#btnTrocarFoto').onclick = () => $('#arquivoAvatar').click();
$('#arquivoAvatar').onchange = () => escolherFoto($('#arquivoAvatar').files[0]);
$('#btnTirarFoto').onclick = () => {
  avatarPendente = '';
  pintarPreviaAvatar();
};
$('#cfgNome').oninput = pintarPreviaAvatar;
$('#cfgBio').oninput = () => ($('#contadorBio').textContent = `${$('#cfgBio').value.length}/190`);

$('#btnSalvarPerfil').onclick = async () => {
  const perfil = {
    nome: $('#cfgNome').value.trim(),
    cor: corConfig,
    avatar: avatarPendente,
    status: $('#cfgStatus').value.trim(),
    bio: $('#cfgBio').value.trim(),
  };
  if (!perfil.nome) return toast('Escolha um nome.', true);
  const r = await rede.pedir('perfil', perfil);
  if (!r.ok) return toast(r.erro || 'Não consegui salvar.', true);
  // Guarda no navegador pra mandar de novo quando voltar
  estado.login = { ...estado.login, ...perfil };
  guardar.salvar('login', estado.login);
  toast('Perfil salvo!');
};

// ---------------- Cartão de perfil (clicar em alguém) ----------------
function abrirPerfil(id, ancora, reserva) {
  const u = (id && estado.usuarios.get(id)) || reserva;
  if (!u) return;
  const online = !!(id && estado.usuarios.has(id));
  const cartao = $('#cartaoPerfil');
  cartao.style.setProperty('--cor', u.cor);
  pintarAvatar($('#perfilAvatar'), u);
  $('#perfilNome').textContent = u.nome;
  $('#perfilStatus').textContent = u.status || '';
  $('#perfilStatus').hidden = !u.status;
  const voz = $('#perfilVoz');
  voz.replaceChildren();
  if (online && u.naVoz) {
    voz.innerHTML = icone('volume');
    voz.append(u.tela ? 'Transmitindo a tela' : 'Na sala de voz');
  } else {
    voz.append(online ? 'Online' : 'Offline');
  }
  voz.classList.toggle('offline', !online);
  $('#perfilBio').textContent = u.bio || '';
  $('#perfilSobre').hidden = !u.bio;
  $('#btnEditarPerfil').hidden = !(online && u.id === estado.eu?.id);
  $('#perfilNome').append(u.admin ? el('span', 'coroa', ' 👑') : '');
  estado.perfilAberto = online ? u.id : null;
  const souAdmin = !!meuUsuario()?.admin;
  const podeAdmin = souAdmin && online && u.id !== estado.eu?.id && !u.admin;
  $('#acoesAdmin').hidden = !podeAdmin;
  if (podeAdmin) {
    const silenciado = u.silenciadoAte > Date.now();
    $('#adminSilenciar').textContent = silenciado ? 'Tirar silêncio' : 'Silenciar no chat';
    $('#adminMinutos').hidden = silenciado;
    $('#adminMutar').textContent = u.mutadoAdmin ? 'Desmutar na call' : 'Mutar na call';
    $('#adminTirarVoz').disabled = !u.naVoz;
  }
  cartao.hidden = false;

  // Coloca o cartão do lado de quem foi clicado, sem sair da tela
  const r = ancora.getBoundingClientRect();
  const larg = cartao.offsetWidth;
  const alt = cartao.offsetHeight;
  let x = r.right + 12;
  if (x + larg > window.innerWidth - 8) x = r.left - larg - 12;
  x = Math.max(8, Math.min(x, window.innerWidth - larg - 8));
  const y = Math.max(8, Math.min(r.top, window.innerHeight - alt - 8));
  cartao.style.left = x + 'px';
  cartao.style.top = y + 'px';
}

function abrirPerfilDaMensagem(m, ancora) {
  const vivo = estado.usuarios.get(m.autor) || [...estado.usuarios.values()].find((u) => u.nome === m.nome);
  if (vivo) abrirPerfil(vivo.id, ancora);
  else abrirPerfil(null, ancora, { id: m.autor, nome: m.nome, cor: m.cor, avatar: m.avatar });
}

$('#btnEditarPerfil').onclick = () => {
  $('#cartaoPerfil').hidden = true;
  abrirConfig();
};

// ---------------- Admin ----------------
async function acaoAdmin(dados, sucesso) {
  const r = await rede.pedir('admin:acao', dados);
  if (!r.ok) toast(r.erro || 'Não deu certo.', true);
  else if (sucesso) toast(sucesso);
  return r;
}

function alvoDoPerfil() {
  const u = estado.usuarios.get(estado.perfilAberto);
  if (!u) toast('Essa pessoa saiu.', true);
  return u;
}

$('#adminSilenciar').onclick = async () => {
  const u = alvoDoPerfil();
  if (!u) return;
  const silenciado = u.silenciadoAte > Date.now();
  const minutos = silenciado ? 0 : Number($('#adminMinutos').value);
  await acaoAdmin({ acao: 'silenciar', id: u.id, minutos }, silenciado ? `${u.nome} pode falar no chat de novo.` : `${u.nome} silenciado no chat.`);
  $('#cartaoPerfil').hidden = true;
};
$('#adminMutar').onclick = async () => {
  const u = alvoDoPerfil();
  if (!u) return;
  await acaoAdmin({ acao: 'mutar', id: u.id, mutar: !u.mutadoAdmin }, u.mutadoAdmin ? `${u.nome} desmutado.` : `${u.nome} mutado na chamada.`);
  $('#cartaoPerfil').hidden = true;
};
$('#adminTirarVoz').onclick = async () => {
  const u = alvoDoPerfil();
  if (!u) return;
  await acaoAdmin({ acao: 'tirarDaVoz', id: u.id }, `${u.nome} saiu da chamada.`);
  $('#cartaoPerfil').hidden = true;
};
for (const [botao, acao, texto] of [
  ['#adminExpulsar', 'expulsar', 'expulsar'],
  ['#adminBanir', 'banir', 'BANIR'],
]) {
  $(botao).onclick = async () => {
    const u = alvoDoPerfil();
    if (!u) return;
    const motivo = prompt(`Vai ${texto} ${u.nome}. Motivo (opcional):`, '');
    if (motivo === null) return;
    await acaoAdmin({ acao, id: u.id, motivo }, `${u.nome} ${acao === 'banir' ? 'foi banido' : 'foi expulso'}.`);
    $('#cartaoPerfil').hidden = true;
  };
}

function renderizarAdminConfig() {
  const souAdmin = !!meuUsuario()?.admin;
  $('#adminFora').hidden = souAdmin;
  $('#adminDentro').hidden = !souAdmin;
  if (!souAdmin) $('#listaBanidos').hidden = true;
}

$('#btnEntrarAdmin').onclick = async () => {
  const r = await rede.pedir('admin:entrar', { codigo: $('#cfgCodigoAdmin').value });
  if (!r.ok) return toast(r.erro || 'Não deu.', true);
  guardar.salvar('chaveAdmin', r.chave);
  $('#cfgCodigoAdmin').value = '';
  const eu = meuUsuario();
  if (eu) eu.admin = true;
  toast('Agora você é admin 👑');
  renderizarAdminConfig();
  carregarHistorico(estado.mensagens); // mostra o botão de apagar em todas
};
$('#btnSairAdmin').onclick = async () => {
  await rede.pedir('admin:sair', { chave: guardar.ler('chaveAdmin', '') });
  guardar.apagar('chaveAdmin');
  const eu = meuUsuario();
  if (eu) eu.admin = false;
  renderizarAdminConfig();
  carregarHistorico(estado.mensagens);
};
$('#btnLimparChat').onclick = () => {
  if (confirm('Apagar TODAS as mensagens e imagens do chat? Não dá pra desfazer.')) acaoAdmin({ acao: 'limparChat' });
};

function mostrarBanidos(lista) {
  const caixa = $('#listaBanidos');
  caixa.hidden = false;
  caixa.replaceChildren();
  if (!lista.length) caixa.append(el('p', 'dica', 'Ninguém banido.'));
  for (const b of lista) {
    const linha = el('div', 'linha-banido');
    const info = el('div');
    info.append(el('strong', null, b.nome), el('small', null, `por ${b.por} · ${quando(b.quando)}${b.motivo ? ' · ' + b.motivo : ''}`));
    const desbanir = el('button', 'btn secundario', 'Desbanir');
    desbanir.type = 'button';
    desbanir.onclick = async () => {
      const r = await acaoAdmin({ acao: 'desbanir', indice: b.indice }, `${b.nome} foi desbanido.`);
      if (r.ok) mostrarBanidos(r.banidos);
    };
    linha.append(info, desbanir);
    caixa.append(linha);
  }
}
$('#btnVerBanidos').onclick = async () => {
  const r = await acaoAdmin({ acao: 'banidos' });
  if (r.ok) mostrarBanidos(r.banidos);
};

// ---------------- GIFs ----------------
const gifs = { aba: 'alta', termo: '', proximo: 0, carregando: false, fim: false, pedido: 0, timer: null };

function favoritos() {
  if (!Array.isArray(prefs.gifsFavoritos)) prefs.gifsFavoritos = [];
  return prefs.gifsFavoritos;
}
function ehFavorito(url) {
  return favoritos().some((f) => f.url === url);
}
function alternarFavorito(g) {
  const lista = favoritos();
  const i = lista.findIndex((f) => f.url === g.url);
  if (i >= 0) {
    lista.splice(i, 1);
  } else {
    lista.unshift({ url: g.url, w: g.w, h: g.h, previa: g.previa, pw: g.pw, ph: g.ph });
    if (lista.length > 120) lista.length = 120;
  }
  salvarPrefs();
  if (!$('#painelGif').hidden && gifs.aba === 'favoritos' && !gifs.termo) mostrarFavoritos();
  return i < 0; // true = virou favorito
}

function avisoGif(texto) {
  const grade = $('#gradeGif');
  grade.replaceChildren(el('div', 'gif-aviso', texto));
  grade._qtd = 0;
}

function colocarGif(g) {
  // Duas colunas: cada GIF vai pra coluna mais baixa (fica bonito igual o Discord)
  const grade = $('#gradeGif');
  if (!grade.querySelector('.coluna-gif')) {
    grade.replaceChildren(el('div', 'coluna-gif'), el('div', 'coluna-gif'));
    grade._alturas = [0, 0];
    grade._qtd = 0;
  }
  const i = grade._alturas[0] <= grade._alturas[1] ? 0 : 1;
  grade.children[i].append(itemGif(g));
  grade._alturas[i] += g.ph / g.pw || 0.75;
  grade._qtd++;
}

function itemGif(g) {
  const botao = el('button', 'item-gif');
  botao.type = 'button';
  botao.title = g.titulo || 'Mandar GIF';
  const img = document.createElement('img');
  img.src = g.previa;
  img.width = g.pw;
  img.height = g.ph;
  img.loading = 'lazy';
  img.alt = g.titulo || 'GIF';
  img.referrerPolicy = 'no-referrer';
  const estrela = el('span', 'estrela-gif' + (ehFavorito(g.url) ? ' ativa' : ''), '★');
  estrela.title = 'Favoritar';
  estrela.onclick = (e) => {
    e.stopPropagation();
    estrela.classList.toggle('ativa', alternarFavorito(g));
  };
  botao.append(img, estrela);
  botao.onclick = () => enviarGif(g);
  return botao;
}

function mostrarFavoritos() {
  const lista = favoritos();
  if (!lista.length) return avisoGif('Nenhum favorito ainda. Clique na ★ de um GIF pra guardar ele aqui.');
  $('#gradeGif').replaceChildren();
  lista.forEach(colocarGif);
}

function mostrarSemChave() {
  const grade = $('#gradeGif');
  grade._qtd = 0;
  grade.innerHTML =
    '<div class="gif-aviso"><b>A busca de GIFs ainda não está ligada.</b><br>' +
    'Quem roda o servidor precisa colocar a chave grátis do GIPHY no <code>config.json</code> ' +
    '(passo a passo no LEIA-ME).<br><br>Enquanto isso: cole o link de um GIF no chat que ele aparece, ' +
    'e a aba ★ Favoritos funciona normal.</div>';
}

async function carregarGifs(recomecar) {
  const grade = $('#gradeGif');
  if (recomecar) {
    gifs.pedido++;
    gifs.proximo = 0;
    gifs.fim = false;
    gifs.carregando = false;
    grade.replaceChildren();
    grade._qtd = 0;
    grade.scrollTop = 0;
  }
  if (gifs.aba === 'favoritos' && !gifs.termo) return mostrarFavoritos();
  if (gifs.carregando || gifs.fim) return;
  gifs.carregando = true;
  const meuPedido = gifs.pedido;
  if (!grade._qtd) avisoGif('Carregando…');
  let r;
  try {
    const resp = await fetch(`/api/gifs?q=${encodeURIComponent(gifs.termo)}&offset=${gifs.proximo}`, {
      headers: { 'X-Token': estado.token },
    });
    r = await resp.json();
  } catch {
    r = { ok: false, erro: 'Sem conexão com o servidor.' };
  }
  if (meuPedido !== gifs.pedido) return; // resposta atrasada de uma busca antiga
  gifs.carregando = false;
  if (!r.ok) {
    gifs.fim = true;
    if (r.semChave) mostrarSemChave();
    else if (!grade._qtd) avisoGif(r.erro || 'Não consegui carregar os GIFs.');
    else toast(r.erro, true);
    return;
  }
  if (!grade._qtd) grade.replaceChildren();
  if (!r.gifs.length && !grade._qtd) {
    avisoGif(gifs.termo ? `Nada encontrado para "${gifs.termo}".` : 'Nenhum GIF por aqui.');
  }
  r.gifs.forEach(colocarGif);
  gifs.proximo = r.proximo;
  gifs.fim = r.fim;
}

function trocarAbaGif(aba) {
  gifs.aba = aba;
  document.querySelectorAll('.abas-gif button').forEach((b) => b.classList.toggle('ativo', b.dataset.aba === aba && !gifs.termo));
  carregarGifs(true);
}

function abrirPainelGif() {
  const painel = $('#painelGif');
  if (!painel.hidden) return fecharPainelGif();
  painel.hidden = false;
  $('#buscaGif').value = '';
  gifs.termo = '';
  trocarAbaGif(gifs.aba);
  setTimeout(() => $('#buscaGif').focus(), 0);
}
function fecharPainelGif() {
  $('#painelGif').hidden = true;
}

async function enviarGif(g) {
  fecharPainelGif();
  const spoiler = $('#btnSpoilerGif').classList.contains('ligado');
  $('#btnSpoilerGif').classList.remove('ligado');
  const r = await rede.pedir('msg', { texto: '', gif: { url: g.url, w: g.w, h: g.h }, spoiler });
  if (!r.ok) toast(r.erro || 'Não consegui mandar o GIF.', true);
  $('#campoMsg').focus();
}

$('#btnSpoilerGif').onclick = () => $('#btnSpoilerGif').classList.toggle('ligado');
$('#btnSpoilerAnexo').onclick = () => {
  estado.anexoSpoiler = !estado.anexoSpoiler;
  $('#btnSpoilerAnexo').classList.toggle('ligado', estado.anexoSpoiler);
};

$('#btnGif').onclick = (e) => {
  e.stopPropagation();
  abrirPainelGif();
};
$('#painelGif').addEventListener('click', (e) => e.stopPropagation());
document.querySelectorAll('.abas-gif button').forEach((b) => {
  b.onclick = () => {
    $('#buscaGif').value = '';
    gifs.termo = '';
    trocarAbaGif(b.dataset.aba);
  };
});
$('#buscaGif').addEventListener('input', () => {
  clearTimeout(gifs.timer);
  gifs.timer = setTimeout(() => {
    gifs.termo = $('#buscaGif').value.trim();
    trocarAbaGif(gifs.aba);
  }, 400);
});
$('#gradeGif').addEventListener('scroll', () => {
  const g = $('#gradeGif');
  if (g.scrollTop + g.clientHeight > g.scrollHeight - 400) carregarGifs(false);
});

// Clicar fora fecha o cartão de perfil e o painel de GIFs
document.addEventListener('click', (e) => {
  const cartao = $('#cartaoPerfil');
  if (!cartao.hidden && !cartao.contains(e.target)) cartao.hidden = true;
  if (!$('#painelGif').hidden) fecharPainelGif();
});

$('#btnSairServidor').onclick = () => {
  guardar.apagar('login');
  sairDaVoz();
  rede.desconectar();
  location.reload();
};

function linkDeConvite() {
  if (estado.convite) return estado.convite;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  return local ? '' : location.origin;
}

function abrirConvite() {
  const link = linkDeConvite();
  $('#conviteComLink').hidden = !link;
  $('#conviteSemLink').hidden = !!link;
  $('#campoConvite').value = link;
  $('#dicaSenhaConvite').hidden = !estado.config.temSenha;
  abrirModal('#modalConvite');
}

$('#btnCopiarConvite').onclick = async () => {
  const campo = $('#campoConvite');
  try {
    await navigator.clipboard.writeText(campo.value);
  } catch {
    campo.select();
    document.execCommand('copy');
  }
  toast('Link copiado! Agora é só mandar pra galera.');
};

// =================================================================
// 11. BOTÕES, ATALHOS E INÍCIO
// =================================================================
// Coloca os ícones em todo elemento com data-i="nome"
document.querySelectorAll('[data-i]').forEach((e) => e.insertAdjacentHTML('afterbegin', icone(e.dataset.i)));

$('#canalTexto').onclick = () => abrirVisao('texto');
$('#canalVoz').onclick = () => {
  abrirVisao('voz');
  if (!estado.naVoz) entrarNaVoz();
};
$('#btnEntrarVoz').onclick = entrarNaVoz;
$('#canalJogos').onclick = () => {
  if (typeof jogos !== 'undefined') jogos.secao = 'geral';
  abrirVisao('jogos');
};
$('#canalAnimes').onclick = () => {
  if (typeof jogos !== 'undefined') jogos.secao = 'animes';
  abrirVisao('jogos');
};
$('#canalCinema').onclick = () => abrirVisao('cinema');
$('#btnMic').onclick = $('#btnMic2').onclick = alternarMic;
$('#btnSurdo').onclick = $('#btnSurdo2').onclick = alternarSurdo;
$('#btnCam').onclick = alternarCam;
$('#btnTela').onclick = $('#btnTelaMini').onclick = alternarTela;
$('#btnSair').onclick = $('#btnSairMini').onclick = () => sairDaVoz();
$('#btnConfig').onclick = abrirConfig;
$('#btnConvidar').onclick = abrirConvite;

$('#btnChatLateral').onclick = () => {
  estado.chatAberto = !estado.chatAberto;
  aplicarVisao();
};
$('#btnMenu').onclick = () => $('#app').classList.toggle('menu-aberto');
$('#btnMembros').onclick = () => {
  const app = $('#app');
  if (window.matchMedia('(max-width: 1150px)').matches) app.classList.toggle('mostrar-membros');
  else app.classList.toggle('esconder-membros');
};
$('#veu').onclick = () => $('#app').classList.remove('menu-aberto', 'mostrar-membros');

// Fechar janelas: clicando fora, no X ou com Esc
document.querySelectorAll('.modal').forEach((m) => {
  m.addEventListener('click', (e) => {
    if (e.target === m || e.target.closest('[data-fechar]')) m.hidden = true;
  });
});
$('#visualizador').onclick = () => ($('#visualizador').hidden = true);

// Chat
const campoMsg = $('#campoMsg');
$('#formMsg').addEventListener('submit', (e) => {
  e.preventDefault();
  enviarMensagem();
});
campoMsg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    enviarMensagem();
  }
});
campoMsg.addEventListener('input', () => {
  ajustarAlturaDoCampo();
  if (campoMsg.value.trim() && Date.now() - ultimoAvisoDigitando > 2500) {
    ultimoAvisoDigitando = Date.now();
    rede.enviar('digitando');
  }
});
$('#mensagens').addEventListener('scroll', () => {
  const caixa = $('#mensagens');
  estado.grudado = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 150;
});
$('#btnAnexar').onclick = () => $('#arquivoImagem').click();
$('#arquivoImagem').onchange = () => escolherAnexo($('#arquivoImagem').files[0]);
$('#btnTirarAnexo').onclick = tirarAnexo;

document.addEventListener('paste', (e) => {
  if (!estado.eu || !$('#modalConfig').hidden) return;
  const imagem = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
  if (imagem) {
    e.preventDefault();
    escolherAnexo(imagem);
  }
});
$('#chat').addEventListener('dragover', (e) => e.preventDefault());
$('#chat').addEventListener('drop', (e) => {
  e.preventDefault();
  const imagem = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'));
  if (imagem) escolherAnexo(imagem);
});

document.addEventListener('visibilitychange', atualizarNaoLidas);

// Atalhos de teclado
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('#visualizador').hidden) $('#visualizador').hidden = true;
    else if (!$('#cartaoPerfil').hidden) $('#cartaoPerfil').hidden = true;
    else if (!$('#painelGif').hidden) fecharPainelGif();
    else if (document.querySelector('.modal:not([hidden])')) fecharModais();
    else if (estado.foco) alternarFoco(estado.foco);
    return;
  }
  if (!estado.eu || !e.ctrlKey || !e.shiftKey) return;
  const tecla = e.key.toLowerCase();
  if (tecla === 'm') {
    e.preventDefault();
    alternarMic();
  } else if (tecla === 'd') {
    e.preventDefault();
    alternarSurdo();
  }
});

async function iniciar() {
  try {
    estado.config = await (await fetch('/api/config')).json();
  } catch {
    document.body.innerHTML = '<p style="padding:24px">Não consegui falar com o servidor. Ele está ligado?</p>';
    return;
  }
  estado.nomeServidor = estado.config.nome || 'Resenha';
  aplicarNomeServidor();

  // Já entrou antes? Entra direto, igual o Discord.
  const salvo = guardar.ler('login', null);
  if (salvo?.nome && (!estado.config.temSenha || salvo.senha)) {
    estado.login = salvo;
    mostrarEntrada();
    $('#btnEntrar').disabled = true;
    $('#btnEntrar').textContent = 'Entrando…';
    rede.conectar();
  } else {
    mostrarEntrada();
  }
}

iniciar();
