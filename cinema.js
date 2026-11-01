'use strict';
/*
 * ================================================================
 *  CINEMA — assistir junto, sincronizado (estilo Rave / Teleparty)
 * ================================================================
 *  O vídeo NÃO passa pelo servidor nem pela chamada: cada pessoa toca
 *  o vídeo no próprio navegador. O servidor só guarda "o que está
 *  passando, se está tocando e em que segundo", e todo mundo se acerta
 *  por isso. Por isso não pesa na chamada nem na sua internet.
 *
 *  Dá pra assistir:
 *   - vídeo do YouTube (cola o link)
 *   - link direto de um arquivo de vídeo (.mp4, .webm...)
 *   - um arquivo que cada um já tem no PC (cada um escolhe o seu, e o
 *     servidor só sincroniza o tempo)
 * ================================================================
 */
const crypto = require('crypto');

const MAX_FILA = 30;
const OEMBED = process.env.YT_OEMBED || 'https://www.youtube.com/oembed';
const EXTENSOES = /\.(mp4|webm|ogv|ogg|mov|m4v|mkv)$/i;
// Sites que não dá pra tocar dentro do app (DRM / não deixam ser embutidos)
const BLOQUEADOS = /(^|\.)(crunchyroll|netflix|primevideo|amazon|disneyplus|hbomax|max|starplus|globoplay|paramountplus|funimation)\.com$/i;

function idDoYoutube(u) {
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1, 12);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else id = (u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/) || [])[2] || null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

// "1m30s", "90" ou "1:30" -> segundos
function segundos(t) {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = String(t).match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
}

async function tituloDoYoutube(id) {
  try {
    const url = `${OEMBED}?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return '';
    const j = await r.json();
    return String(j.title || '').slice(0, 150);
  } catch {
    return '';
  }
}

// Transforma o que a pessoa colou numa "fonte" de vídeo
async function interpretar(d) {
  if (d?.arquivo) {
    const nome = String(d.arquivo.nome || '').slice(0, 200);
    if (!nome) throw new Error('Arquivo sem nome.');
    return { tipo: 'arquivo', nome, titulo: nome, tamanho: Number(d.arquivo.tamanho) || 0, duracao: Number(d.arquivo.duracao) || 0, inicio: 0 };
  }
  const texto = String(d?.url || '').trim();
  let u;
  try {
    u = new URL(texto);
  } catch {
    throw new Error('Cole um link do YouTube ou um link direto de vídeo.');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('Link inválido.');
  const id = idDoYoutube(u);
  if (id) return { tipo: 'youtube', id, url: 'https://www.youtube.com/watch?v=' + id, titulo: (await tituloDoYoutube(id)) || 'Vídeo do YouTube', inicio: segundos(u.searchParams.get('t') || u.searchParams.get('start')) };
  if (BLOQUEADOS.test(u.hostname)) {
    throw new Error('Esse site não deixa tocar o vídeo dentro de outros apps (proteção DRM). Pra Crunchyroll, veja o LEIA-ME.');
  }
  if (!EXTENSOES.test(u.pathname)) throw new Error('Esse link não é de um arquivo de vídeo (.mp4, .webm...). Pra YouTube, cole o link do vídeo.');
  const nome = decodeURIComponent(u.pathname.split('/').pop() || 'vídeo');
  return { tipo: 'link', url: u.href, titulo: nome.slice(0, 150), inicio: 0 };
}

function criarCinema({ transmitir }) {
  let e = {
    fonte: null, // o que está passando
    tocando: false,
    tempo: 0, // em que segundo estava no momento "em"
    em: Date.now(),
    quem: '', // quem mexeu por último
    dono: '', // cid de quem abriu o vídeo
    trava: false, // true = só quem abriu (ou um admin) controla
    fila: [],
  };
  const assistindo = new Map(); // id do usuário -> nome

  const agoraNoVideo = () => e.tempo + (e.tocando ? (Date.now() - e.em) / 1000 : 0);

  function visao() {
    return {
      fonte: e.fonte,
      tocando: e.tocando,
      tempo: e.tempo,
      em: e.em,
      agora: Date.now(),
      quem: e.quem,
      dono: e.dono,
      trava: e.trava,
      fila: e.fila.map((f) => ({ titulo: f.titulo, tipo: f.tipo, por: f.por })),
      assistindo: [...assistindo.values()],
    };
  }

  function mudou() {
    transmitir('cinema', visao());
  }

  function tocar(fonte, u) {
    e.fonte = { ...fonte, chave: crypto.randomBytes(6).toString('hex'), por: u.nome };
    e.tempo = fonte.inicio || 0;
    e.em = Date.now();
    e.tocando = fonte.tipo !== 'arquivo'; // arquivo: espera a galera escolher o arquivo
    e.quem = u.nome;
    e.dono = u.cid;
  }

  function podeControlar(u) {
    return !e.trava || u.admin || u.cid === e.dono;
  }

  const erro = (texto) => ({ ok: false, erro: texto });

  return {
    visao,

    async abrir(u, d) {
      if (e.fonte && !podeControlar(u) && !d?.fila) return erro('O controle está travado: só quem abriu o vídeo ou um admin troca.');
      let fonte;
      try {
        fonte = await interpretar(d);
      } catch (err) {
        return erro(err.message);
      }
      if (d?.fila && e.fonte) {
        if (e.fila.length >= MAX_FILA) return erro('A fila está cheia.');
        e.fila.push({ ...fonte, por: u.nome });
      } else {
        tocar(fonte, u);
      }
      mudou();
      return { ok: true };
    },

    controle(u, d) {
      if (!e.fonte) return erro('Nada passando.');
      if (!podeControlar(u)) return erro('O controle está travado: só quem abriu o vídeo ou um admin mexe.');
      const tempo = Math.max(0, Math.min(Number(d?.tempo) || 0, 24 * 3600));
      if (d?.acao === 'play') e.tocando = true;
      else if (d?.acao === 'pause') e.tocando = false;
      else if (d?.acao !== 'pular') return erro('Ação desconhecida.');
      e.tempo = Number.isFinite(Number(d?.tempo)) ? tempo : agoraNoVideo();
      e.em = Date.now();
      e.quem = u.nome;
      mudou();
      return { ok: true };
    },

    // O vídeo acabou no navegador de alguém: passa pro próximo da fila (só uma vez)
    fim(u, d) {
      if (!e.fonte || d?.chave !== e.fonte.chave) return { ok: true };
      const proximo = e.fila.shift();
      if (proximo) tocar(proximo, { nome: proximo.por, cid: e.dono });
      else {
        e.tocando = false;
        e.tempo = agoraNoVideo();
        e.em = Date.now();
      }
      mudou();
      return { ok: true };
    },

    fila(u, d) {
      if (!podeControlar(u)) return erro('O controle está travado.');
      const i = Number(d?.indice);
      if (d?.acao === 'remover' && e.fila[i]) e.fila.splice(i, 1);
      else if (d?.acao === 'tocar' && e.fila[i]) {
        const [f] = e.fila.splice(i, 1);
        tocar(f, u);
      } else if (d?.acao === 'proximo') {
        const f = e.fila.shift();
        if (!f) return erro('A fila está vazia.');
        tocar(f, u);
      } else return erro('Ação desconhecida.');
      mudou();
      return { ok: true };
    },

    fechar(u) {
      if (!podeControlar(u)) return erro('O controle está travado.');
      e.fonte = null;
      e.tocando = false;
      e.fila = [];
      mudou();
      return { ok: true };
    },

    travar(u, d) {
      if (!e.fonte) return erro('Nada passando.');
      if (!(u.admin || u.cid === e.dono)) return erro('Só quem abriu o vídeo ou um admin pode travar.');
      e.trava = !!d?.trava;
      mudou();
      return { ok: true };
    },

    assistindo(u, sim) {
      const antes = assistindo.has(u.id);
      if (sim) assistindo.set(u.id, u.nome);
      else assistindo.delete(u.id);
      if (antes !== !!sim) mudou();
    },
  };
}

module.exports = { criarCinema, interpretar, idDoYoutube };
