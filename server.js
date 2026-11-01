'use strict';
/*
 * ================================================================
 *  RESENHA — o servidor
 * ================================================================
 *  Este arquivo faz 4 coisas:
 *
 *   1) Entrega o site (os arquivos da pasta "public") pro navegador.
 *   2) Mantém uma conexão em tempo real (WebSocket) com cada pessoa,
 *      pra saber quem está online e repassar as mensagens do chat.
 *   3) "Apresenta" os navegadores uns aos outros pra chamada.
 *      Isso se chama SINALIZAÇÃO. O áudio, a câmera e a tela NÃO
 *      passam por aqui: vão direto de um computador pro outro
 *      (tecnologia WebRTC). O servidor só troca os "endereços".
 *   4) (Opcional) Abre um link público com o cloudflared, pra seus
 *      amigos entrarem de qualquer lugar.
 *
 *  Não usa nenhuma biblioteca externa: só o que já vem no Node.js.
 *  Pra rodar:  node server.js
 * ================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const { criarGerente } = require('./jogos');
const { criarAdmin, ipLocal } = require('./admin');
const { criarCinema } = require('./cinema');

// ----------------------------------------------------------------
// 1. CONFIGURAÇÃO (lida do arquivo config.json)
// ----------------------------------------------------------------
const PADRAO = {
  nomeDoServidor: 'Resenha',
  senha: '',
  porta: 3000,
  linkParaAmigos: true, // tenta abrir o link público com o cloudflared
  abrirNavegador: true, // abre o navegador sozinho quando liga
  senhaAdmin: '', // vazio = o servidor cria um código de admin sozinho (aparece na janela preta)
  giphyChave: '', // chave grátis do GIPHY pra busca de GIFs (veja o LEIA-ME)
  gifClassificacao: '', // vazio = sem filtro nenhum. Ou: "g", "pg", "pg-13", "r"
  turnCloudflare: { idDaChave: '', token: '' }, // ponte TURN grátis da Cloudflare (veja o LEIA-ME)
  turn: { url: '', usuario: '', senha: '' },
};

function lerConfig() {
  // Primeira vez: cria o config.json a partir do exemplo
  const arquivo = path.join(__dirname, 'config.json');
  const exemplo = path.join(__dirname, 'config.exemplo.json');
  if (!fs.existsSync(arquivo) && fs.existsSync(exemplo)) {
    try {
      fs.copyFileSync(exemplo, arquivo);
    } catch {
      /* sem permissão: usa o padrão */
    }
  }
  try {
    const texto = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
    const lido = JSON.parse(texto);
    return {
      ...PADRAO,
      ...lido,
      turn: { ...PADRAO.turn, ...(lido.turn || {}) },
      turnCloudflare: { ...PADRAO.turnCloudflare, ...(lido.turnCloudflare || {}) },
    };
  } catch (erro) {
    if (erro.code !== 'ENOENT') {
      console.log('[aviso] O config.json tem um erro e foi ignorado: ' + erro.message);
    }
    return PADRAO;
  }
}

const config = lerConfig();
if (process.env.GIPHY_CHAVE) config.giphyChave = process.env.GIPHY_CHAVE;
const PORTA = Number(process.env.PORT) || Number(config.porta) || 3000;
const SENHA = String(process.env.SENHA ?? config.senha ?? '');

// ----------------------------------------------------------------
// 2. HISTÓRICO DO CHAT (salvo na pasta "dados")
// ----------------------------------------------------------------
const PASTA_PUBLICA = path.join(__dirname, 'public');
const PASTA_DADOS = path.join(__dirname, 'dados');
const PASTA_IMAGENS = path.join(PASTA_DADOS, 'imagens');
const PASTA_AVATARES = path.join(PASTA_DADOS, 'avatares'); // fotos de perfil
const ARQUIVO_MENSAGENS = path.join(PASTA_DADOS, 'mensagens.json');
const MAX_HISTORICO = 300; // quantas mensagens ficam guardadas
const MAX_IMAGEM = 8 * 1024 * 1024; // 8 MB por imagem
const MAX_AVATAR = 4 * 1024 * 1024; // 4 MB por foto de perfil

fs.mkdirSync(PASTA_IMAGENS, { recursive: true });
fs.mkdirSync(PASTA_AVATARES, { recursive: true });

let mensagens = [];
try {
  const lidas = JSON.parse(fs.readFileSync(ARQUIVO_MENSAGENS, 'utf8'));
  if (Array.isArray(lidas)) mensagens = lidas.slice(-MAX_HISTORICO);
} catch {
  /* primeira vez: ainda não tem histórico */
}

// Apaga imagens que não aparecem em nenhuma mensagem (sobras antigas)
try {
  const usadas = new Set(mensagens.filter((m) => m.imagem).map((m) => path.basename(m.imagem)));
  for (const arquivo of fs.readdirSync(PASTA_IMAGENS)) {
    if (!usadas.has(arquivo)) fs.unlink(path.join(PASTA_IMAGENS, arquivo), () => {});
  }
} catch {
  /* sem problema */
}

let timerSalvar = null;
function salvarMensagens() {
  // Espera 1 segundo antes de salvar, pra não escrever no disco a cada mensagem
  clearTimeout(timerSalvar);
  timerSalvar = setTimeout(() => {
    fs.writeFile(ARQUIVO_MENSAGENS, JSON.stringify(mensagens), (erro) => {
      if (erro) console.log('[aviso] Não consegui salvar o histórico: ' + erro.message);
    });
  }, 1000);
}

function apagarMensagem(id) {
  const i = mensagens.findIndex((m) => m.id === id);
  if (i < 0) return null;
  const [m] = mensagens.splice(i, 1);
  if (m.imagem) fs.unlink(path.join(PASTA_IMAGENS, path.basename(m.imagem)), () => {});
  salvarMensagens();
  return m;
}

function limparChat() {
  for (const m of mensagens) if (m.imagem) fs.unlink(path.join(PASTA_IMAGENS, path.basename(m.imagem)), () => {});
  mensagens = [];
  salvarMensagens();
}

function guardarMensagem(msg) {
  mensagens.push(msg);
  while (mensagens.length > MAX_HISTORICO) {
    const velha = mensagens.shift();
    if (velha.imagem) fs.unlink(path.join(PASTA_IMAGENS, path.basename(velha.imagem)), () => {});
  }
  salvarMensagens();
}

// ----------------------------------------------------------------
// 3. SERVIDOR DE ARQUIVOS (HTTP)
// ----------------------------------------------------------------
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ogg': 'audio/ogg',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

let linkConvite = ''; // preenchido quando o cloudflared abre o link

function responderJson(res, status, dados) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corpo),
    'Cache-Control': 'no-store',
  });
  res.end(corpo);
}

function servirArquivo(req, res, pastaBase, caminho, cacheLongo) {
  let relativo;
  try {
    relativo = decodeURIComponent(caminho);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const alvo = path.normalize(path.join(pastaBase, relativo));
  // Segurança: não deixa ninguém pedir arquivos fora da pasta (ex.: /../server.js)
  if (!alvo.startsWith(pastaBase + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.stat(alvo, (erro, info) => {
    if (erro || !info.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
      return;
    }
    const cabecalhos = {
      'Content-Type': TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': cacheLongo ? 'public, max-age=604800, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
    };
    // "Range": o navegador pede só um pedaço (pra pular pro meio de uma música, por ex.)
    const pedaco = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (pedaco && info.size > 0) {
      let inicio = pedaco[1] === '' ? Math.max(0, info.size - Number(pedaco[2])) : Number(pedaco[1]);
      let fim = pedaco[1] !== '' && pedaco[2] !== '' ? Number(pedaco[2]) : info.size - 1;
      fim = Math.min(fim, info.size - 1);
      if (inicio > fim) {
        res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
        return;
      }
      res.writeHead(206, { ...cabecalhos, 'Content-Range': `bytes ${inicio}-${fim}/${info.size}`, 'Content-Length': fim - inicio + 1 });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(alvo, { start: inicio, end: fim }).pipe(res);
      return;
    }
    res.writeHead(200, { ...cabecalhos, 'Content-Length': info.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(alvo).pipe(res);
  });
}

// Descobre o tipo da imagem pelos primeiros bytes do arquivo
// (não confia no nome do arquivo, que qualquer um pode mudar)
function tipoDaImagem(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

// Recebe um arquivo de imagem enviado pelo navegador e salva na pasta certa.
// Serve tanto pras imagens do chat quanto pras fotos de perfil.
function receberImagem(req, res, destino) {
  const { pasta, limite, prefixo } = destino;
  const usuario = usuarioPorToken(req.headers['x-token']);
  if (!usuario) return responderJson(res, 401, { ok: false, erro: 'Entre no servidor primeiro.' });

  // Limite simples: no máximo 10 imagens por minuto por pessoa
  const agora = Date.now();
  usuario.uploads = (usuario.uploads || []).filter((t) => agora - t < 60_000);
  if (usuario.uploads.length >= 10) {
    return responderJson(res, 429, { ok: false, erro: 'Calma! Muitas imagens em pouco tempo.' });
  }

  const pedacos = [];
  let tamanho = 0;
  let cancelado = false;
  req.on('data', (pedaco) => {
    if (cancelado) return;
    tamanho += pedaco.length;
    if (tamanho > limite) {
      cancelado = true;
      responderJson(res, 413, { ok: false, erro: `Imagem muito grande (máximo ${limite / 1024 / 1024} MB).` });
      req.destroy();
      return;
    }
    pedacos.push(pedaco);
  });
  req.on('end', () => {
    if (cancelado) return;
    const dados = Buffer.concat(pedacos);
    const tipo = tipoDaImagem(dados);
    if (!tipo) return responderJson(res, 415, { ok: false, erro: 'Só dá pra mandar PNG, JPG, GIF ou WEBP.' });
    const nome = crypto.randomBytes(16).toString('hex') + '.' + tipo;
    fs.writeFile(path.join(pasta, nome), dados, (erro) => {
      if (erro) return responderJson(res, 500, { ok: false, erro: 'Não consegui salvar a imagem.' });
      usuario.uploads.push(agora);
      responderJson(res, 200, { ok: true, url: prefixo + nome });
    });
  });
}

// ----------------------------------------------------------------
// GIFs (GIPHY)
// ----------------------------------------------------------------
// O navegador pede /api/gifs?q=gato e o servidor pergunta pro GIPHY.
// Assim a chave fica guardada aqui e as buscas repetidas vêm do "cache"
// (memória), economizando o limite grátis do GIPHY.
const cacheGifs = new Map();
const TEMPO_CACHE_GIF = 10 * 60 * 1000; // 10 minutos

function normalizarGif(g) {
  const imagens = g.images || {};
  const escolher = (...nomes) => {
    for (const n of nomes) if (imagens[n] && (imagens[n].webp || imagens[n].url)) return imagens[n];
    return null;
  };
  const previa = escolher('fixed_width', 'fixed_width_downsampled', 'fixed_height', 'downsized', 'original');
  const grande = escolher('downsized_medium', 'downsized_large', 'original', 'fixed_height');
  if (!previa || !grande) return null;
  return {
    id: String(g.id || ''),
    titulo: String(g.title || ''),
    previa: previa.webp || previa.url,
    pw: Number(previa.width) || 200,
    ph: Number(previa.height) || 150,
    url: grande.webp || grande.url,
    w: Number(grande.width) || 0,
    h: Number(grande.height) || 0,
  };
}

async function buscarGifs(req, res, url) {
  const usuario = usuarioPorToken(req.headers['x-token']);
  if (!usuario) return responderJson(res, 401, { ok: false, erro: 'Entre no servidor primeiro.' });
  if (!config.giphyChave) return responderJson(res, 200, { ok: false, semChave: true });

  // No máximo 40 buscas por minuto por pessoa
  const agora = Date.now();
  usuario.buscasGif = (usuario.buscasGif || []).filter((t) => agora - t < 60_000);
  if (usuario.buscasGif.length >= 40) return responderJson(res, 200, { ok: false, erro: 'Calma! Muitas buscas seguidas.' });
  usuario.buscasGif.push(agora);

  const termo = (url.searchParams.get('q') || '').trim().slice(0, 50);
  const offset = Math.min(4900, Math.max(0, parseInt(url.searchParams.get('offset'), 10) || 0));
  const chaveCache = termo.toLowerCase() + '|' + offset;
  const guardado = cacheGifs.get(chaveCache);
  if (guardado && agora - guardado.quando < TEMPO_CACHE_GIF) return responderJson(res, 200, guardado.resposta);

  const parametros = new URLSearchParams({ api_key: config.giphyChave, limit: '24', offset: String(offset) });
  if (termo) {
    parametros.set('q', termo);
    parametros.set('lang', 'pt');
  }
  // Sem "rating" o GIPHY devolve todas as classificações (sem filtro)
  if (config.gifClassificacao) parametros.set('rating', config.gifClassificacao);
  const base = process.env.GIPHY_API || 'https://api.giphy.com';
  const endereco = `${base}/v1/gifs/${termo ? 'search' : 'trending'}?${parametros}`;

  try {
    const r = await fetch(endereco, { signal: AbortSignal.timeout(8000) });
    if (r.status === 401 || r.status === 403) {
      return responderJson(res, 200, { ok: false, erro: 'A chave do GIPHY no config.json não funcionou. Confira se copiou certinho.' });
    }
    if (r.status === 429) {
      return responderJson(res, 200, { ok: false, erro: 'O limite grátis do GIPHY acabou por agora. Tente daqui a pouco.' });
    }
    if (!r.ok) return responderJson(res, 200, { ok: false, erro: 'O GIPHY respondeu com erro ' + r.status + '.' });
    const json = await r.json();
    const lista = (json.data || []).map(normalizarGif).filter(Boolean);
    const total = json.pagination?.total_count;
    const proximo = offset + (json.pagination?.count ?? lista.length);
    const resposta = { ok: true, gifs: lista, proximo, fim: !lista.length || (total != null && proximo >= total) };
    cacheGifs.set(chaveCache, { quando: agora, resposta });
    while (cacheGifs.size > 300) cacheGifs.delete(cacheGifs.keys().next().value);
    responderJson(res, 200, resposta);
  } catch {
    responderJson(res, 200, { ok: false, erro: 'Não consegui falar com o GIPHY. A internet do servidor está ok?' });
  }
}

function validarGif(g) {
  if (!g || typeof g.url !== 'string' || g.url.length > 600) return null;
  let u;
  try {
    u = new URL(g.url);
  } catch {
    return null;
  }
  // Só aceita GIFs que vêm do próprio GIPHY
  if (u.protocol !== 'https:' || !(u.hostname === 'giphy.com' || u.hostname.endsWith('.giphy.com'))) return null;
  const medida = (v) => Math.min(4000, Math.max(0, Math.round(Number(v) || 0)));
  return { url: u.href, w: medida(g.w), h: medida(g.h) };
}

function servidoresIce() {
  // STUN: serviço gratuito do Google que ajuda os PCs a descobrirem o próprio endereço.
  const lista = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  // TURN (opcional): um "intermediário" pra quando a conexão direta não funciona.
  if (config.turn.url) {
    lista.push({
      urls: config.turn.url.split(',').map((s) => s.trim()).filter(Boolean),
      username: config.turn.usuario,
      credential: config.turn.senha,
    });
  }
  return lista;
}

// TURN da Cloudflare: o servidor pede credenciais que valem 24 horas
// e guarda por 12 horas, pra não pedir toda hora.
let cacheTurn = { quando: 0, lista: null, falhou: 0 };
function temTurn() {
  return !!(config.turn.url || (config.turnCloudflare.idDaChave && config.turnCloudflare.token));
}
async function servidoresIceCompletos() {
  const lista = servidoresIce();
  const cf = config.turnCloudflare;
  if (!cf.idDaChave || !cf.token) return lista;
  const agora = Date.now();
  const velho = !cacheTurn.lista || agora - cacheTurn.quando > 12 * 3600_000;
  if (velho && agora - cacheTurn.falhou > 60_000) {
    try {
      const endereco = `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(cf.idDaChave)}/credentials/generate-ice-servers`;
      const r = await fetch(process.env.TURN_API || endereco, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + cf.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 86400 }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error('a Cloudflare respondeu ' + r.status);
      const json = await r.json();
      const servidores = Array.isArray(json.iceServers) ? json.iceServers : json.iceServers ? [json.iceServers] : [];
      // Tira a porta 53: os navegadores costumam bloquear e ela só atrasa a conexão
      const limpos = servidores
        .map((sv) => ({ ...sv, urls: [].concat(sv.urls || []).filter((u) => !/:53(\?|$)/.test(u)) }))
        .filter((sv) => sv.urls.length);
      cacheTurn = { quando: agora, lista: limpos, falhou: 0 };
    } catch (erro) {
      cacheTurn.falhou = agora;
      console.log('[aviso] Não consegui pegar a ponte TURN da Cloudflare: ' + erro.message);
      console.log('        Confira o "idDaChave" e o "token" no config.json.');
    }
  }
  if (cacheTurn.lista) lista.push(...cacheTurn.lista);
  return lista;
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const caminho = url.pathname;

  if (caminho === '/api/config' && req.method === 'GET') {
    return responderJson(res, 200, {
      nome: config.nomeDoServidor,
      temSenha: SENHA !== '',
      temGifs: !!config.giphyChave,
      temTurn: temTurn(),
      iceServers: servidoresIce(),
    });
  }
  if (caminho === '/api/ice' && req.method === 'GET') {
    if (!usuarioPorToken(req.headers['x-token'])) return responderJson(res, 401, { ok: false });
    servidoresIceCompletos().then((iceServers) => responderJson(res, 200, { ok: true, iceServers }));
    return;
  }
  if (caminho === '/api/imagem' && req.method === 'POST') {
    return receberImagem(req, res, { pasta: PASTA_IMAGENS, limite: MAX_IMAGEM, prefixo: '/imagens/' });
  }
  if (caminho === '/api/avatar' && req.method === 'POST') {
    return receberImagem(req, res, { pasta: PASTA_AVATARES, limite: MAX_AVATAR, prefixo: '/avatares/' });
  }
  if (caminho === '/api/gifs' && req.method === 'GET') return buscarGifs(req, res, url);
  if (caminho === '/api/jogos/lista' && req.method === 'GET') {
    if (!usuarioPorToken(req.headers['x-token'])) return responderJson(res, 401, { ok: false });
    jogos
      .listaPara(url.searchParams.get('tipo'))
      .then((lista) => responderJson(res, 200, { ok: true, lista }))
      .catch((e) => responderJson(res, 200, { ok: false, erro: e.message }));
    return;
  }
  // Músicas do quiz de abertura (baixadas do AnimeThemes e guardadas em dados/musicas)
  if (caminho.startsWith('/musicas/') && (req.method === 'GET' || req.method === 'HEAD')) {
    const nome = caminho.slice('/musicas/'.length);
    jogos
      .musica(nome)
      .then((arquivo) => {
        if (!arquivo) return res.writeHead(404).end();
        servirArquivo(req, res, path.dirname(arquivo), path.basename(arquivo), true);
      })
      .catch(() => res.writeHead(502).end());
    return;
  }
  // Ranking da seção de Animes
  if (caminho === '/api/animes/ranking' && req.method === 'GET') {
    if (!usuarioPorToken(req.headers['x-token'])) return responderJson(res, 401, { ok: false });
    return responderJson(res, 200, { ok: true, ...jogos.ranking() });
  }
  // Desenhos do RPG que você colocou em public/rpg/sprites (substituem os provisórios)
  if (caminho === '/api/rpg/sprites' && req.method === 'GET') {
    fs.readdir(path.join(PASTA_PUBLICA, 'rpg', 'sprites'), (e, arquivos) => {
      const sprites = (arquivos || []).filter((a) => /^[a-z0-9-]+\.png$/i.test(a)).map((a) => a.slice(0, -4).toLowerCase());
      responderJson(res, 200, { sprites });
    });
    return;
  }
  if (caminho.startsWith('/imagens/')) {
    return servirArquivo(req, res, PASTA_IMAGENS, caminho.slice('/imagens/'.length), true);
  }
  if (caminho.startsWith('/avatares/')) {
    return servirArquivo(req, res, PASTA_AVATARES, caminho.slice('/avatares/'.length), true);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end();
  servirArquivo(req, res, PASTA_PUBLICA, caminho === '/' ? 'index.html' : caminho, false);
});

// ----------------------------------------------------------------
// 4. WEBSOCKET (conexão em tempo real) — feito na mão, sem biblioteca
// ----------------------------------------------------------------
// O navegador pede pra "trocar de protocolo" (upgrade). A gente responde
// com uma chave calculada, e a partir daí os dois trocam "quadros" (frames).
const GUID_WEBSOCKET = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const LIMITE_QUADRO = 256 * 1024; // mensagens de no máximo 256 KB

const conexoes = new Set();

class Conexao {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.fragmentos = [];
    this.aberta = true;
    this.viva = true; // respondeu ao último "ping"?
    this.usuario = null; // vira um objeto quando a pessoa entra
    this.tentativasSenha = 0;
    socket.setNoDelay(true);
    socket.on('data', (dados) => this.receber(dados));
    socket.on('close', () => this.encerrar());
    socket.on('error', () => this.encerrar());
  }

  // Junta os pedaços que chegam e separa em quadros completos
  receber(dados) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, dados]) : dados;
    while (this.aberta && this.buffer.length >= 2) {
      const b0 = this.buffer[0];
      const b1 = this.buffer[1];
      const fim = (b0 & 0x80) !== 0;
      const codigo = b0 & 0x0f;
      const mascarado = (b1 & 0x80) !== 0;
      let tamanho = b1 & 0x7f;
      let pos = 2;
      if (tamanho === 126) {
        if (this.buffer.length < 4) return;
        tamanho = this.buffer.readUInt16BE(2);
        pos = 4;
      } else if (tamanho === 127) {
        if (this.buffer.length < 10) return;
        const grande = this.buffer.readBigUInt64BE(2);
        if (grande > BigInt(LIMITE_QUADRO)) return this.fechar(1009);
        tamanho = Number(grande);
        pos = 10;
      }
      if (tamanho > LIMITE_QUADRO) return this.fechar(1009);
      if (!mascarado) return this.fechar(1002); // navegadores sempre mascaram
      if (this.buffer.length < pos + 4 + tamanho) return; // quadro ainda incompleto

      const mascara = this.buffer.subarray(pos, pos + 4);
      const carga = Buffer.from(this.buffer.subarray(pos + 4, pos + 4 + tamanho));
      for (let i = 0; i < carga.length; i++) carga[i] ^= mascara[i & 3];
      this.buffer = this.buffer.subarray(pos + 4 + tamanho);
      this.tratarQuadro(fim, codigo, carga);
    }
  }

  tratarQuadro(fim, codigo, carga) {
    if (codigo === 0x8) return this.fechar(1000); // pediu pra fechar
    if (codigo === 0x9) return this.enviarQuadro(0xa, carga); // ping → pong
    if (codigo === 0xa) {
      this.viva = true; // pong
      return;
    }
    if (codigo === 0x1 || codigo === 0x2) this.fragmentos = [carga];
    else if (codigo === 0x0) this.fragmentos.push(carga);
    else return this.fechar(1002);

    if (this.fragmentos.reduce((s, f) => s + f.length, 0) > LIMITE_QUADRO) return this.fechar(1009);
    if (fim) {
      const texto = Buffer.concat(this.fragmentos).toString('utf8');
      this.fragmentos = [];
      tratarMensagem(this, texto);
    }
  }

  enviarQuadro(codigo, carga) {
    if (!this.aberta || this.socket.destroyed) return;
    const n = carga.length;
    let cabecalho;
    if (n < 126) {
      cabecalho = Buffer.from([0x80 | codigo, n]);
    } else if (n < 65536) {
      cabecalho = Buffer.alloc(4);
      cabecalho[0] = 0x80 | codigo;
      cabecalho[1] = 126;
      cabecalho.writeUInt16BE(n, 2);
    } else {
      cabecalho = Buffer.alloc(10);
      cabecalho[0] = 0x80 | codigo;
      cabecalho[1] = 127;
      cabecalho.writeBigUInt64BE(BigInt(n), 2);
    }
    this.socket.write(Buffer.concat([cabecalho, carga]));
  }

  // Manda um evento pro navegador: { t: tipo, d: dados }
  mandar(tipo, dados) {
    this.enviarQuadro(0x1, Buffer.from(JSON.stringify({ t: tipo, d: dados })));
  }

  fechar(codigo) {
    if (!this.aberta) return;
    const c = Buffer.alloc(2);
    c.writeUInt16BE(codigo || 1000);
    this.enviarQuadro(0x8, c);
    this.socket.end();
    this.encerrar();
  }

  encerrar() {
    if (!this.aberta) return; // já foi encerrada antes
    this.aberta = false;
    conexoes.delete(this);
    this.socket.destroy();
    aoDesconectar(this);
  }
}

// IP de quem conectou. Pelo link dos amigos (cloudflared) o IP real vem no cabeçalho cf-connecting-ip.
function ipDoPedido(req) {
  const direto = req.socket.remoteAddress || '';
  if (ipLocal(direto)) return String(req.headers['cf-connecting-ip'] || '').trim() || direto;
  return direto;
}

servidor.on('upgrade', (req, socket) => {
  const pedeWebsocket = (req.headers.upgrade || '').toLowerCase() === 'websocket';
  const chave = req.headers['sec-websocket-key'];
  if (!req.url.startsWith('/ws') || !pedeWebsocket || !chave) {
    socket.destroy();
    return;
  }
  const aceite = crypto.createHash('sha1').update(chave + GUID_WEBSOCKET).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Accept: ' + aceite + '\r\n\r\n'
  );
  const con = new Conexao(socket);
  con.ip = ipDoPedido(req);
  conexoes.add(con);
});

// A cada 25 segundos manda um "ping". Quem não responder é desconectado.
// (Também evita que o link do cloudflared derrube a conexão por inatividade.)
setInterval(() => {
  for (const c of conexoes) {
    if (!c.viva) {
      c.encerrar();
      continue;
    }
    c.viva = false;
    c.enviarQuadro(0x9, Buffer.alloc(0));
  }
}, 25_000);

// ----------------------------------------------------------------
// 5. LÓGICA DO SERVIDOR: usuários, chat e chamada
// ----------------------------------------------------------------
const CORES_VALIDAS = /^#[0-9a-f]{6}$/i;

function publico(u) {
  // Só o que os outros podem ver (o token fica em segredo)
  return {
    id: u.id,
    nome: u.nome,
    cor: u.cor,
    avatar: u.avatar,
    status: u.status,
    bio: u.bio,
    naVoz: u.naVoz,
    mic: u.mic,
    cam: u.cam,
    tela: u.tela,
    surdo: u.surdo,
    admin: !!u.admin,
    silenciadoAte: u.silenciadoAte > Date.now() ? u.silenciadoAte : 0,
    mutadoAdmin: !!u.mutadoAdmin,
  };
}

// Confere e limpa os dados de perfil que o navegador mandou
function limparPerfil(d) {
  const perfil = {};
  if (typeof d?.avatar === 'string') {
    const valido = /^\/avatares\/[a-f0-9]{32}\.(png|jpg|gif|webp)$/.test(d.avatar);
    perfil.avatar = valido && fs.existsSync(path.join(PASTA_AVATARES, path.basename(d.avatar))) ? d.avatar : '';
  }
  if (typeof d?.status === 'string') perfil.status = d.status.replace(/\s+/g, ' ').trim().slice(0, 60);
  if (typeof d?.bio === 'string') perfil.bio = d.bio.replace(/\n{3,}/g, '\n\n').trim().slice(0, 190);
  return perfil;
}

function online() {
  return [...conexoes].filter((c) => c.usuario);
}

function paraTodos(tipo, dados, exceto) {
  for (const c of online()) if (c !== exceto) c.mandar(tipo, dados);
}

function paraVoz(tipo, dados, exceto) {
  for (const c of online()) if (c !== exceto && c.usuario.naVoz) c.mandar(tipo, dados);
}

function conexaoPorId(id) {
  return online().find((c) => c.usuario.id === id);
}

function usuarioPorToken(token) {
  if (typeof token !== 'string' || !token) return null;
  const c = online().find((x) => x.usuario.token === token);
  return c ? c.usuario : null;
}

function limparNome(nome) {
  return String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

function aplicarEstadoDeVoz(u, d) {
  if (!d || typeof d !== 'object') return;
  if ('mic' in d) u.mic = !!d.mic;
  if ('cam' in d) u.cam = !!d.cam;
  if ('tela' in d) u.tela = !!d.tela;
  if ('surdo' in d) u.surdo = !!d.surdo;
}

// Cada tipo de mensagem que o navegador pode mandar tem uma função aqui.
// "responder" devolve uma resposta pra quem perguntou.
const acoes = {
  entrar(con, d, responder) {
    if (con.usuario) return responder({ ok: true, ...fotoDoServidor(con) });
    const cidPedido = /^[a-z0-9]{16,40}$/.test(d?.cid) ? d.cid : '';
    if (admin.estaBanido(cidPedido, con.ip)) {
      setTimeout(() => con.fechar(4003), 200);
      return responder({ ok: false, banido: true, erro: 'Você foi banido deste servidor.' });
    }
    if (SENHA) {
      if (String(d?.senha ?? '') !== SENHA) {
        con.tentativasSenha++;
        if (con.tentativasSenha >= 5) setTimeout(() => con.fechar(1008), 100);
        return responder({ ok: false, erro: 'Senha errada.', campo: 'senha' });
      }
    }
    const nome = limparNome(d?.nome);
    if (!nome) return responder({ ok: false, erro: 'Escolha um nome.', campo: 'nome' });
    const cor = CORES_VALIDAS.test(d?.cor) ? d.cor : '#e5533c';

    con.usuario = {
      id: crypto.randomBytes(6).toString('hex'),
      // "cid" = identidade deste navegador (fica igual mesmo se a conexão cair)
      cid: /^[a-z0-9]{16,40}$/.test(d?.cid) ? d.cid : crypto.randomBytes(10).toString('hex'),
      token: crypto.randomBytes(18).toString('hex'),
      nome,
      cor,
      avatar: '',
      status: '',
      bio: '',
      ...limparPerfil(d),
      naVoz: false,
      mic: false,
      cam: false,
      tela: false,
      surdo: false,
      ultimasMsgs: [],
      admin: admin.chaveValida(d?.chaveAdmin),
      silenciadoAte: 0,
      mutadoAdmin: false,
    };
    // Castigos continuam valendo mesmo se a pessoa sair e voltar
    const castigo = castigos.get(con.usuario.cid);
    if (castigo) Object.assign(con.usuario, castigo);
    console.log(`[+] ${nome} entrou${con.usuario.admin ? ' (admin)' : ''} (${online().length} online)`);
    paraTodos('usuario:novo', publico(con.usuario), con);
    responder({ ok: true, ...fotoDoServidor(con) });
  },

  perfil(con, d, responder) {
    const nome = limparNome(d?.nome);
    if (!nome) return responder({ ok: false, erro: 'Escolha um nome.' });
    con.usuario.nome = nome;
    if (CORES_VALIDAS.test(d?.cor)) con.usuario.cor = d.cor;
    Object.assign(con.usuario, limparPerfil(d));
    paraTodos('usuario:atualizou', publico(con.usuario));
    responder({ ok: true });
  },

  msg(con, d, responder) {
    const u = con.usuario;
    const texto = typeof d?.texto === 'string' ? d.texto.trim().slice(0, 2000) : '';
    let imagem = null;
    if (typeof d?.imagem === 'string' && /^\/imagens\/[a-f0-9]{32}\.(png|jpg|gif|webp)$/.test(d.imagem)) {
      if (fs.existsSync(path.join(PASTA_IMAGENS, path.basename(d.imagem)))) imagem = d.imagem;
    }
    const gif = validarGif(d?.gif);
    if (!texto && !imagem && !gif) return responder({ ok: false, erro: 'Mensagem vazia.' });
    if (u.silenciadoAte > Date.now()) {
      const min = Math.ceil((u.silenciadoAte - Date.now()) / 60000);
      return responder({ ok: false, erro: `Um admin te silenciou no chat. Falta ${min} min.` });
    }

    // Anti-flood: no máximo 6 mensagens a cada 5 segundos
    const agora = Date.now();
    u.ultimasMsgs = u.ultimasMsgs.filter((t) => agora - t < 5000);
    if (u.ultimasMsgs.length >= 6) return responder({ ok: false, erro: 'Devagar! Muitas mensagens seguidas.' });
    u.ultimasMsgs.push(agora);

    const spoiler = !!d?.spoiler && !!(imagem || gif);
    const msg = { id: crypto.randomUUID(), autor: u.id, cid: u.cid, nome: u.nome, cor: u.cor, avatar: u.avatar, texto, imagem, gif, spoiler, ts: agora };
    guardarMensagem(msg);
    paraTodos('msg', msg);
    responder({ ok: true });
  },

  digitando(con) {
    paraTodos('digitando', { id: con.usuario.id, nome: con.usuario.nome }, con);
  },

  'voz:entrar'(con, d, responder) {
    const u = con.usuario;
    // Lista de quem JÁ estava na sala: o recém-chegado vai ligar pra cada um
    const pares = online()
      .filter((c) => c !== con && c.usuario.naVoz)
      .map((c) => c.usuario.id);
    u.naVoz = true;
    u.cam = false;
    u.tela = false;
    aplicarEstadoDeVoz(u, d);
    if (u.mutadoAdmin) u.mic = false;
    console.log(`[voz] ${u.nome} entrou na sala de voz (${pares.length + 1} na sala)`);
    paraTodos('usuario:atualizou', publico(u));
    responder({ ok: true, pares });
  },

  'voz:sair'(con, d, responder) {
    sairDaVoz(con.usuario);
    responder({ ok: true });
  },

  'voz:estado'(con, d) {
    if (!con.usuario.naVoz) return;
    aplicarEstadoDeVoz(con.usuario, d);
    if (con.usuario.mutadoAdmin) con.usuario.mic = false;
    paraTodos('usuario:atualizou', publico(con.usuario));
  },

  falando(con, d) {
    if (!con.usuario.naVoz) return;
    paraVoz('falando', { id: con.usuario.id, falando: !!d }, con);
  },

  async 'jogo:criar'(con, d, responder) {
    responder(await jogos.criar(con.usuario, d));
  },

  async 'jogo:acao'(con, d, responder) {
    responder(await jogos.acao(con.usuario, d));
  },

  'jogo:encerrar'(con, d, responder) {
    responder(jogos.encerrar(con.usuario));
  },

  // ---------- Apagar mensagem (a sua, ou qualquer uma se for admin) ----------
  'msg:apagar'(con, d, responder) {
    const u = con.usuario;
    const m = mensagens.find((x) => x.id === d?.id);
    if (!m) return responder({ ok: false, erro: 'Essa mensagem não existe mais.' });
    const minha = (m.cid && m.cid === u.cid) || (!m.cid && m.autor === u.id);
    if (!minha && !u.admin) return responder({ ok: false, erro: 'Você só pode apagar as suas mensagens.' });
    apagarMensagem(m.id);
    if (!minha) console.log(`[admin] ${u.nome} apagou uma mensagem de ${m.nome}`);
    paraTodos('msg:apagada', m.id);
    responder({ ok: true });
  },

  // ---------- Admin ----------
  'admin:entrar'(con, d, responder) {
    const u = con.usuario;
    con.tentativasAdmin = (con.tentativasAdmin || 0) + 1;
    if (con.tentativasAdmin > 5) return responder({ ok: false, erro: 'Tentativas demais. Recarregue a página e tente de novo.' });
    if (!admin.conferirCodigo(d?.codigo)) return responder({ ok: false, erro: 'Código errado.' });
    u.admin = true;
    console.log(`[admin] ${u.nome} agora é admin`);
    paraTodos('usuario:atualizou', publico(u));
    responder({ ok: true, chave: admin.novaChave() });
  },

  'admin:sair'(con, d, responder) {
    const u = con.usuario;
    if (typeof d?.chave === 'string') admin.esquecerChave(d.chave);
    u.admin = false;
    paraTodos('usuario:atualizou', publico(u));
    responder({ ok: true });
  },

  'admin:acao'(con, d, responder) {
    const u = con.usuario;
    if (!u.admin) return responder({ ok: false, erro: 'Só admin pode fazer isso.' });
    responder(acaoDeAdmin(u, d || {}));
  },

  // ---------- Cinema ----------
  async 'cinema:abrir'(con, d, responder) {
    responder(await cinema.abrir(con.usuario, d));
  },
  'cinema:controle'(con, d, responder) {
    responder(cinema.controle(con.usuario, d));
  },
  'cinema:fim'(con, d, responder) {
    responder(cinema.fim(con.usuario, d));
  },
  'cinema:fila'(con, d, responder) {
    responder(cinema.fila(con.usuario, d));
  },
  'cinema:fechar'(con, d, responder) {
    responder(cinema.fechar(con.usuario));
  },
  'cinema:trava'(con, d, responder) {
    responder(cinema.travar(con.usuario, d));
  },
  'cinema:assistindo'(con, d) {
    cinema.assistindo(con.usuario, !!d);
  },

  // Repassa a "papelada" do WebRTC de um navegador pro outro
  sinal(con, d) {
    if (!con.usuario.naVoz || !d || typeof d.para !== 'string') return;
    const alvo = conexaoPorId(d.para);
    if (!alvo || !alvo.usuario.naVoz) return;
    alvo.mandar('sinal', { de: con.usuario.id, dados: d.dados });
  },
};

// Os jogos (pasta "jogos"): Cinco Letras, Adivinhe o Anime, Palavras Secretas, Draft e Leilão
const jogos = criarGerente({ pastaDados: PASTA_DADOS, online, log: console.log });

// Admin (admin.js) e cinema (cinema.js)
const admin = criarAdmin({ pastaDados: PASTA_DADOS, senhaConfig: String(process.env.SENHA_ADMIN ?? config.senhaAdmin ?? '') });
const cinema = criarCinema({ transmitir: (tipo, dados) => paraTodos(tipo, dados) });
const castigos = new Map(); // cid -> { silenciadoAte, mutadoAdmin } (dura até o servidor desligar)

function guardarCastigo(u) {
  const c = { silenciadoAte: u.silenciadoAte > Date.now() ? u.silenciadoAte : 0, mutadoAdmin: !!u.mutadoAdmin };
  if (c.silenciadoAte || c.mutadoAdmin) castigos.set(u.cid, c);
  else castigos.delete(u.cid);
}

function acaoDeAdmin(u, d) {
  const erro = (texto) => ({ ok: false, erro: texto });
  switch (d.acao) {
    case 'limparChat':
      limparChat();
      console.log(`[admin] ${u.nome} limpou o chat`);
      paraTodos('chat:limpo', { por: u.nome });
      return { ok: true };
    case 'banidos':
      return { ok: true, banidos: admin.banidos() };
    case 'desbanir': {
      const b = admin.desbanir(Number(d.indice));
      if (!b) return erro('Não achei esse banimento.');
      console.log(`[admin] ${u.nome} desbaniu ${b.nome}`);
      return { ok: true, banidos: admin.banidos() };
    }
  }

  // As outras ações são sobre uma pessoa
  const alvoCon = conexaoPorId(d.id);
  const alvo = alvoCon?.usuario;
  if (!alvo) return erro('Essa pessoa não está mais online.');
  if (alvo.id === u.id) return erro('Não dá pra fazer isso com você mesmo 😅');
  if (alvo.admin) return erro('Não dá pra fazer isso com outro admin.');
  const motivo = String(d.motivo || '').trim().slice(0, 100);

  switch (d.acao) {
    case 'expulsar':
    case 'banir': {
      const banir = d.acao === 'banir';
      if (banir) admin.banir({ cid: alvo.cid, ip: alvoCon.ip, nome: alvo.nome, motivo, por: u.nome });
      console.log(`[admin] ${u.nome} ${banir ? 'baniu' : 'expulsou'} ${alvo.nome}${motivo ? ' (' + motivo + ')' : ''}`);
      alvoCon.mandar('expulso', { banido: banir, motivo, por: u.nome });
      setTimeout(() => alvoCon.fechar(4000), 300);
      return { ok: true };
    }
    case 'silenciar': {
      const minutos = Math.max(0, Math.min(24 * 60, Number(d.minutos) || 0));
      alvo.silenciadoAte = minutos ? Date.now() + minutos * 60000 : 0;
      guardarCastigo(alvo);
      console.log(`[admin] ${u.nome} ${minutos ? `silenciou ${alvo.nome} por ${minutos} min` : `tirou o silêncio de ${alvo.nome}`}`);
      alvoCon.mandar('aviso', minutos ? `${u.nome} te silenciou no chat por ${minutos} min.` : `${u.nome} tirou seu silêncio no chat.`);
      paraTodos('usuario:atualizou', publico(alvo));
      return { ok: true };
    }
    case 'mutar': {
      alvo.mutadoAdmin = !!d.mutar;
      if (alvo.mutadoAdmin) alvo.mic = false;
      guardarCastigo(alvo);
      console.log(`[admin] ${u.nome} ${alvo.mutadoAdmin ? 'mutou' : 'desmutou'} ${alvo.nome} na chamada`);
      alvoCon.mandar('forcar:mute', { mutar: alvo.mutadoAdmin, por: u.nome });
      paraTodos('usuario:atualizou', publico(alvo));
      return { ok: true };
    }
    case 'tirarDaVoz':
      if (!alvo.naVoz) return erro('Essa pessoa não está na chamada.');
      console.log(`[admin] ${u.nome} tirou ${alvo.nome} da chamada`);
      alvoCon.mandar('forcar:sairVoz', { por: u.nome });
      sairDaVoz(alvo);
      return { ok: true };
    default:
      return erro('Ação desconhecida.');
  }
}

function fotoDoServidor(con) {
  return {
    eu: publico(con.usuario),
    cid: con.usuario.cid,
    token: con.usuario.token,
    nome: config.nomeDoServidor,
    usuarios: online().map((c) => publico(c.usuario)),
    mensagens,
    convite: linkConvite,
    jogo: jogos.visaoPara(con.usuario),
    cinema: cinema.visao(),
  };
}

function sairDaVoz(u) {
  if (!u.naVoz) return;
  u.naVoz = false;
  u.cam = false;
  u.tela = false;
  console.log(`[voz] ${u.nome} saiu da sala de voz`);
  paraTodos('usuario:atualizou', publico(u));
}

function tratarMensagem(con, texto) {
  let m;
  try {
    m = JSON.parse(texto);
  } catch {
    return;
  }
  if (!m || typeof m.t !== 'string' || !Object.hasOwn(acoes, m.t)) return;
  const responder = (dados) => {
    if (m.r != null) con.enviarQuadro(0x1, Buffer.from(JSON.stringify({ t: 'resp', r: m.r, d: dados })));
  };
  // Antes de "entrar", a única coisa permitida é... entrar.
  if (m.t !== 'entrar' && !con.usuario) return responder({ ok: false, erro: 'Entre primeiro.' });
  const falhou = (erro) => {
    console.log('[erro] ' + m.t + ': ' + (erro?.stack || erro));
    responder({ ok: false, erro: 'Erro no servidor.' });
  };
  try {
    const resultado = acoes[m.t](con, m.d, responder);
    if (resultado && typeof resultado.catch === 'function') resultado.catch(falhou);
  } catch (erro) {
    falhou(erro);
  }
}

function aoDesconectar(con) {
  if (!con.usuario) return;
  const u = con.usuario;
  con.usuario = null;
  console.log(`[-] ${u.nome} saiu (${online().length} online)`);
  paraTodos('usuario:saiu', u.id);
  jogos.saiu();
  cinema.assistindo(u, false);
}

// ----------------------------------------------------------------
// 6. LINK PÚBLICO COM CLOUDFLARED (opcional)
// ----------------------------------------------------------------
function acharCloudflared() {
  const candidatos = ['cloudflared', path.join(__dirname, 'cloudflared.exe'), path.join(__dirname, 'cloudflared')];
  if (process.platform === 'win32') {
    candidatos.push(
      'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
      'C:\\Program Files\\cloudflared\\cloudflared.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe')
    );
  }
  for (const c of candidatos) {
    try {
      execFileSync(c, ['--version'], { stdio: 'ignore', timeout: 8000 });
      return c;
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

function abrirLinkPublico() {
  const exe = acharCloudflared();
  if (!exe) {
    console.log('');
    console.log('  [link pros amigos] O cloudflared não está instalado, então por enquanto');
    console.log('  só funciona neste PC. Pra gerar o link dos amigos, rode o arquivo');
    console.log('  "instalar-cloudflared.bat" uma vez e depois abra o Resenha de novo.');
    console.log('');
    return;
  }
  console.log('  Gerando o link pros seus amigos (leva uns segundos)...');
  const tunel = spawn(exe, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORTA}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let saida = ''; // guarda o finalzinho do texto, caso o link chegue "quebrado" em dois pedaços
  const ler = (pedaco) => {
    saida = (saida + pedaco.toString()).slice(-2000);
    const achados = saida.match(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com/g);
    const link = achados ? achados[achados.length - 1] : '';
    if (link && link !== linkConvite) {
      linkConvite = link;
      console.log('');
      console.log('  ==============================================================');
      console.log('   LINK PROS SEUS AMIGOS (mande no WhatsApp):');
      console.log('   ' + linkConvite);
      console.log('  ==============================================================');
      console.log('   Esse link muda toda vez que você abre o Resenha de novo.');
      console.log('');
      paraTodos('convite', linkConvite);
    }
  };
  tunel.stdout.on('data', ler);
  tunel.stderr.on('data', ler);
  tunel.on('exit', () => {
    if (linkConvite) console.log('  [aviso] O link pros amigos caiu. Feche e abra o Resenha de novo.');
    linkConvite = '';
    paraTodos('convite', '');
  });
  const matar = () => {
    try {
      tunel.kill();
    } catch {
      /* já fechou */
    }
  };
  process.on('exit', matar);
  process.on('SIGINT', () => {
    matar();
    process.exit(0);
  });
}

function abrirNoNavegador(url) {
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
    else if (process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore', detached: true });
  } catch {
    /* não faz mal */
  }
}

// ----------------------------------------------------------------
// 7. LIGA TUDO
// ----------------------------------------------------------------
servidor.on('error', (erro) => {
  if (erro.code === 'EADDRINUSE') {
    console.log(`\n[erro] A porta ${PORTA} já está em uso. O Resenha já está aberto em outra janela?`);
    console.log('       Feche a outra janela ou troque a "porta" no config.json.\n');
  } else {
    console.log('[erro] ' + erro.message);
  }
  process.exit(1);
});

servidor.listen(PORTA, () => {
  const local = `http://localhost:${PORTA}`;
  console.log('');
  console.log('  ==============================================================');
  console.log(`   ${config.nomeDoServidor} está no ar!`);
  console.log(`   Abra no seu navegador:  ${local}`);
  console.log(SENHA ? '   Senha do servidor: ligada' : '   Senha do servidor: desligada (qualquer um com o link entra)');
  console.log(`   Código de admin: ${admin.codigo()}  (digite em Configurações → Admin, não passe pra ninguém)`);
  console.log(config.giphyChave ? '   GIFs: ligados' : '   GIFs: sem chave do GIPHY (veja o LEIA-ME pra ligar)');
  console.log(
    temTurn()
      ? '   Ponte TURN: ligada (amigos com internet difícil conseguem entrar na chamada)'
      : '   Ponte TURN: desligada (se alguém ficar em "Sem conexão", veja o LEIA-ME)'
  );
  console.log('   Pra desligar, feche esta janela (ou aperte Ctrl+C).');
  console.log('  ==============================================================');
  console.log('');
  if (!process.env.SEM_ANILIST) jogos.preaquecer();
  if (config.linkParaAmigos && !process.env.SEM_LINK) abrirLinkPublico();
  if (config.abrirNavegador && !process.env.SEM_NAVEGADOR) abrirNoNavegador(local);
});
