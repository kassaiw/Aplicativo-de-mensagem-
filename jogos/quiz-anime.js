'use strict';
/*
 * =================================================================
 *  QUIZ DE ANIME — os jogos de adivinhar da seção de Animes
 * =================================================================
 *  Um motor só, com 2 MODOS:
 *    personagem → o retrato inteiro
 *    abertura   → só a música da abertura, começando ABAFADA
 *
 *  Como é a partida:
 *    - 10 rodadas. Cada rodada tem um tempo.
 *    - Todo mundo chuta ao mesmo tempo. Cada um tem 3 CHANCES por rodada.
 *    - Retrato: acertou = 100 pontos. Simples assim.
 *    - Abertura: cada erro deixa o som mais limpo pra você, mas o
 *      acerto vale menos (100, 70, 40).
 *  Os pontos vão pro ranking da seção (jogos/ranking.js).
 * =================================================================
 */
const fs = require('fs');
const path = require('path');
const { embaralhar, jogador, normalizar, erro, OK } = require('./util');

const MODOS = {
  personagem: { titulo: 'Adivinhe o Personagem', alvo: 'personagem', tempo: 30 },
  abertura: { titulo: 'Adivinhe a Abertura', alvo: 'anime', tempo: 45, tema: 'OP' },
};
const CHANCES = 3;
const PONTOS = { normal: [100, 100, 100], abertura: [100, 70, 40] };
const RODADAS = 10;
const PAUSA_RESPOSTA = Number(process.env.QUIZ_PAUSA) || 6000; // ms mostrando a resposta
const TEMPO_TESTE = Number(process.env.QUIZ_TEMPO) || 0; // nos testes, rodadas curtinhas
const REVELAR = process.env.QUIZ_REVELAR === '1'; // só nos testes automáticos: manda a resposta junto
const LIMITES = {
  personagem: { facil: 100, medio: 200, dificil: 400 },
  tema: { facil: 60, medio: 150, dificil: 300 },
};

// "Shingeki no Kyojin Season 3 Part 2" e "Shingeki no Kyojin" são da mesma franquia
function franquia(titulo) {
  const limpo = (t) => normalizar(t).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  let base = String(titulo || '');
  const antes = base.split(':')[0];
  if (limpo(antes).length >= 5) base = antes; // "Re:Zero" não vira só "Re"
  const sem = limpo(base)
    .replace(/\b(SEASON|PART|COUR|1ST|2ND|3RD|\d+TH|\d+|II|III|IV|SHIPPUUDEN|SHIPPUDEN|BROTHERHOOD|KAN|ZOKU|SHOU|FINAL)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return sem.length >= 3 ? sem : limpo(base);
}

// Nome do arquivo de áudio (ex.: "Naruto-OP1.ogg") a partir do link do AnimeThemes
const nomeDoAudio = (link) => (String(link).match(/\/([A-Za-z0-9_-]+\.ogg)$/) || [])[1] || '';

/*
 * CACHE DAS MÚSICAS: o servidor baixa a música do AnimeThemes uma vez e
 * entrega pros amigos. Por quê? Pro navegador conseguir "abafar" o som,
 * o áudio precisa vir do mesmo endereço do site (regra de segurança do
 * navegador chamada CORS). E de quebra fica mais rápido da segunda vez.
 */
function criarCacheAudio(pastaDados, log) {
  const pasta = path.join(pastaDados, 'musicas');
  fs.mkdirSync(pasta, { recursive: true });
  const baixando = new Map();
  const MAXIMO = 40; // guarda as 40 mais recentes (~150 MB)

  function limpar() {
    const arquivos = fs
      .readdirSync(pasta)
      .filter((a) => a.endsWith('.ogg'))
      .map((a) => ({ a, t: fs.statSync(path.join(pasta, a)).mtimeMs }))
      .sort((x, y) => y.t - x.t);
    for (const { a } of arquivos.slice(MAXIMO)) fs.rm(path.join(pasta, a), () => {});
  }

  async function baixar(link) {
    const nome = nomeDoAudio(link);
    if (!nome) throw new Error('link estranho');
    const destino = path.join(pasta, nome);
    if (fs.existsSync(destino)) return destino;
    if (!baixando.has(nome)) {
      const tarefa = (async () => {
        const r = await fetch(link, { headers: { 'User-Agent': 'Resenha/1.0 (app de amigos)' }, signal: AbortSignal.timeout(60000) });
        if (!r.ok) throw new Error('o AnimeThemes respondeu ' + r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        await fs.promises.writeFile(destino + '.parcial', buf);
        await fs.promises.rename(destino + '.parcial', destino);
        limpar();
        return destino;
      })().finally(() => baixando.delete(nome));
      baixando.set(nome, tarefa);
    }
    return baixando.get(nome);
  }

  return { pasta, baixar, nomeDoAudio, adiantar: (link) => baixar(link).catch((e) => log('  [Músicas] ' + e.message)) };
}
let cacheGlobal = null;

// Monta a lista de "perguntas" da partida
async function montarPerguntas(modo, cfg, opcoes, fontes) {
  const dificuldade = ['facil', 'medio', 'dificil'].includes(opcoes.dificuldade) ? opcoes.dificuldade : 'medio';
  const dados = await fontes.anilist.garantir();

  if (cfg.alvo === 'personagem') {
    const pool = dados.personagens.slice(0, LIMITES.personagem[dificuldade]).filter((p) => p.imagem);
    if (pool.length < RODADAS) throw new Error('Ainda não tenho personagens suficientes baixados.');
    return embaralhar(pool)
      .slice(0, RODADAS)
      .map((p) => ({ id: p.id, resposta: { id: p.id, nome: p.nome, sub: p.anime, img: p.imagem }, midia: { tipo: 'imagem', url: p.imagem } }));
  }

  // abertura
  const posicao = new Map(dados.animes.map((a, i) => [a.id, i]));
  const porId = new Map(dados.animes.map((a) => [a.id, a]));
  const temas = (await fontes.aberturas.garantir(cfg.tema, RODADAS)).filter(
    (t) => porId.has(t.animeId) && posicao.get(t.animeId) < LIMITES.tema[dificuldade] && nomeDoAudio(t.tema.audio)
  );
  if (temas.length < RODADAS) throw new Error('Ainda não tenho aberturas suficientes. Tenta no difícil, ou espera o download terminar.');
  const usadas = new Set();
  const escolhidas = [];
  for (const t of embaralhar(temas)) {
    const f = franquia(porId.get(t.animeId).titulo);
    if (usadas.has(f)) continue;
    usadas.add(f);
    escolhidas.push(t);
    if (escolhidas.length === RODADAS) break;
  }
  return escolhidas.map(({ animeId, tema }) => {
    const a = porId.get(animeId);
    const quem = tema.artistas.length ? ` — ${tema.artistas.join(', ')}` : '';
    return {
      id: animeId,
      link: tema.audio,
      resposta: { id: animeId, nome: a.titulo, sub: `Abertura ${tema.numero}${tema.musica ? ` · "${tema.musica}"${quem}` : ''}`, img: a.capa, franquia: franquia(a.titulo) },
      midia: { tipo: 'audio', url: '/musicas/' + nomeDoAudio(tema.audio), original: tema.audio },
    };
  });
}

function criarTipo(modo) {
  const cfg = MODOS[modo];
  const tabela = modo === 'abertura' ? PONTOS.abertura : PONTOS.normal;
  return {
    titulo: cfg.titulo,

    async listaParaBusca({ anilist }) {
      const dados = await anilist.garantir();
      // sem foto na lista: senão era só comparar com o retrato!
      if (cfg.alvo === 'personagem') return dados.personagens.map((p) => ({ id: p.id, t: p.nome, sub: p.anime, s: p.nativo ? [p.nativo] : [] }));
      return dados.animes.map((a) => ({ id: a.id, t: a.titulo, sub: a.ingles, s: a.sinonimos }));
    },

    async criar({ opcoes, criador, estaOnline, mudou, pastaDados, ranking, log, ...fontes }) {
      if (modo === 'abertura') cacheGlobal ||= criarCacheAudio(pastaDados, log || (() => {}));
      const cache = cacheGlobal;
      const tempo = TEMPO_TESTE || cfg.tempo;
      let perguntas = await montarPerguntas(modo, cfg, opcoes, fontes);
      // já começa a baixar as duas primeiras músicas
      if (cache) for (const p of perguntas.slice(0, 2)) cache.adiantar(p.link);
      // pra saber o nome de cada chute (sem confiar no que o navegador manda)
      const dadosAniList = await fontes.anilist.garantir();
      const nomes = new Map(cfg.alvo === 'personagem' ? dadosAniList.personagens.map((x) => [x.id, x.nome]) : dadosAniList.animes.map((x) => [x.id, x.titulo]));

      const jogadores = new Map(); // cid -> { cid, nome, cor, avatar, total, acertos }
      let fase = 'lobby'; // lobby | rodada | resposta | fim
      let n = -1;
      let rodada = null; // { inicio, fim, estados: Map }
      let mostrarAte = 0;
      let timer = null;
      const historico = [];

      const lista = () => [...jogadores.values()];
      const estadoNovo = () => ({ erros: [], acertou: false, desistiu: false, pontos: 0 });
      function entrar(u) {
        if (!jogadores.has(u.cid)) jogadores.set(u.cid, { ...jogador(u), total: 0, acertos: 0 });
        if (rodada && !rodada.estados.has(u.cid)) rodada.estados.set(u.cid, estadoNovo());
      }
      entrar(criador);
      const terminou = (e) => e.acertou || e.desistiu || e.erros.length >= CHANCES;

      function comecarRodada() {
        n++;
        fase = 'rodada';
        const agora = Date.now();
        rodada = { inicio: agora, fim: agora + tempo * 1000, estados: new Map(lista().map((j) => [j.cid, estadoNovo()])) };
        if (cache && perguntas[n + 1]) cache.adiantar(perguntas[n + 1].link);
        clearTimeout(timer);
        timer = setTimeout(acabarRodada, tempo * 1000 + 300);
      }

      function acabarRodada() {
        if (fase !== 'rodada') return;
        clearTimeout(timer);
        fase = 'resposta';
        const p = perguntas[n];
        historico.push({ ...p.resposta, acertaram: lista().filter((j) => rodada.estados.get(j.cid)?.acertou).map((j) => j.nome) });
        for (const j of lista()) ranking.rodada(j, !!rodada.estados.get(j.cid)?.acertou);
        mostrarAte = Date.now() + PAUSA_RESPOSTA;
        timer = setTimeout(() => {
          if (n + 1 >= perguntas.length) terminar();
          else comecarRodada();
          mudou();
        }, PAUSA_RESPOSTA);
        mudou();
      }

      function terminar() {
        fase = 'fim';
        rodada = null;
        for (const j of lista()) ranking.partida(j, j.total);
      }

      // Todo mundo que está online já terminou? Então nem espera o tempo.
      function verificar() {
        if (fase !== 'rodada') return;
        const ativos = lista().filter((j) => estaOnline(j.cid));
        if (ativos.length && ativos.every((j) => rodada.estados.get(j.cid) && terminou(rodada.estados.get(j.cid)))) acabarRodada();
      }

      return {
        visao(u) {
          const eu = jogadores.get(u.cid);
          const meu = rodada?.estados.get(u.cid);
          const p = perguntas[n];
          const base = {
            modo,
            fase,
            alvo: cfg.alvo,
            rodada: n + 1,
            totalRodadas: perguntas.length,
            tempo,
            chances: CHANCES,
            pontosPorErro: tabela,
            dentro: !!eu,
            jogadores: lista()
              .map((j) => {
                const e = rodada?.estados.get(j.cid);
                return { cid: j.cid, nome: j.nome, cor: j.cor, avatar: j.avatar, total: j.total, acertos: j.acertos, online: estaOnline(j.cid), agora: e ? { acertou: e.acertou, terminou: terminou(e), erros: e.erros.length, pontos: e.pontos } : null };
              })
              .sort((a, b) => b.total - a.total),
          };
          if (fase === 'rodada' || fase === 'resposta') {
            base.inicio = rodada.inicio;
            base.fim = rodada.fim;
            base.midia = p.midia;
            base.eu = meu ? { erros: meu.erros, acertou: meu.acertou, terminou: terminou(meu), pontos: meu.pontos } : null;
          }
          if (REVELAR && fase === 'rodada') base.teste = p.resposta.id;
          if (fase === 'resposta') {
            base.resposta = p.resposta;
            base.mostrarAte = mostrarAte;
          }
          if (fase === 'fim' || fase === 'resposta') base.historico = historico;
          return base;
        },

        acao(u, d) {
          const eu = jogadores.get(u.cid);
          switch (d.acao) {
            case 'entrar':
              entrar(u);
              return OK;
            case 'sair':
              if (fase !== 'lobby') return erro('A partida já começou.');
              jogadores.delete(u.cid);
              return OK;
            case 'comecar':
              if (fase !== 'lobby') return erro('Já começou.');
              if (!eu) return erro('Entre primeiro.');
              comecarRodada();
              return OK;
            case 'chutar': {
              if (fase !== 'rodada') return erro('A rodada não está valendo agora.');
              if (!eu) return erro('Entre no jogo pra chutar.');
              const e = rodada.estados.get(u.cid);
              if (terminou(e)) return erro('Você já terminou essa rodada.');
              const p = perguntas[n];
              const id = Number(d.id);
              const nomeChute = nomes.get(id);
              if (!nomeChute) return erro('Escolha uma opção da lista.');
              if (e.erros.some((x) => x.id === id)) return erro('Você já chutou esse.');
              // anime: vale acertar a franquia (ex.: chutou a 1ª temporada e era a abertura da 2ª)
              const certo = id === p.resposta.id || (cfg.alvo === 'anime' && franquia(nomeChute) !== '' && franquia(nomeChute) === p.resposta.franquia);
              if (certo) {
                e.acertou = true;
                e.pontos = tabela[e.erros.length];
                eu.total += e.pontos;
                eu.acertos++;
                verificar();
                return { ok: true, certo: true, pontos: e.pontos };
              }
              e.erros.push({ id, nome: nomeChute });
              verificar();
              return { ok: true, certo: false, restam: CHANCES - e.erros.length };
            }
            case 'pular': {
              if (fase !== 'rodada' || !eu) return erro('Agora não dá.');
              rodada.estados.get(u.cid).desistiu = true;
              verificar();
              return OK;
            }
            case 'denovo':
              if (fase !== 'fim') return erro('A partida ainda não acabou.');
              return montarPerguntas(modo, cfg, opcoes, fontes).then((novas) => {
                perguntas = novas;
                if (cache) for (const p of perguntas.slice(0, 2)) cache.adiantar(p.link);
                n = -1;
                historico.length = 0;
                for (const j of lista()) {
                  j.total = 0;
                  j.acertos = 0;
                }
                fase = 'lobby';
                return OK;
              });
            default:
              return erro('Ação desconhecida.');
          }
        },

        saiu() {
          verificar();
        },

        destruir() {
          clearTimeout(timer);
        },
      };
    },
  };
}

const TIPOS = Object.fromEntries(Object.keys(MODOS).map((m) => ['quiz-' + m, criarTipo(m)]));

// Pro server.js entregar as músicas: só as que estão na lista do AnimeThemes
async function arquivoDeMusica(nome, aberturas, pastaDados, log) {
  if (!/^[A-Za-z0-9_-]+\.ogg$/.test(nome)) return null;
  const tema = aberturas.temas('OP').find((t) => nomeDoAudio(t.tema.audio) === nome);
  if (!tema) return null;
  cacheGlobal ||= criarCacheAudio(pastaDados, log || (() => {}));
  return cacheGlobal.baixar(tema.tema.audio);
}

module.exports = { TIPOS, franquia, MODOS, arquivoDeMusica };
