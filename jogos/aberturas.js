'use strict';
/*
 * ABERTURAS E ENCERRAMENTOS de anime, vindos do AnimeThemes (animethemes.moe),
 * um site grátis que guarda os vídeos das aberturas (OP) e encerramentos (ED).
 *
 * Por que não o YouTube? No YouTube o título do vídeo entrega a resposta,
 * e muitos vídeos oficiais são bloqueados pra tocar fora do site. No
 * AnimeThemes o vídeo é um arquivo direto (.webm), sem título nenhum.
 *
 * Como funciona:
 *   - pega os animes mais populares que já baixamos do AniList
 *   - pergunta pro AnimeThemes, de 25 em 25, quais aberturas cada um tem
 *     (o AnimeThemes sabe o "número" de cada anime no AniList)
 *   - guarda tudo em dados/aberturas.json (vale por 30 dias)
 * O AnimeThemes deixa 90 pedidos por minuto; a gente faz bem menos.
 */
const fs = require('fs');
const path = require('path');

const API = process.env.ANIMETHEMES_API || 'https://api.animethemes.moe';
const AUDIO = process.env.ANIMETHEMES_AUDIO || 'https://a.animethemes.moe'; // onde ficam as músicas (.ogg)
const VALIDADE = 30 * 24 * 3600_000;
const POR_PEDIDO = 25;
const QUANTOS_ANIMES = 300; // os 300 animes mais populares
const ESPERA = Number(process.env.ANIMETHEMES_ESPERA) || 1500; // ms entre pedidos

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

function criarAberturas(pastaDados, log, anilist) {
  const arquivo = path.join(pastaDados, 'aberturas.json');
  let dados = { quando: 0, porAnime: {} };
  try {
    dados = { ...dados, ...JSON.parse(fs.readFileSync(arquivo, 'utf8')) };
  } catch {
    /* ainda não baixou */
  }
  let baixando = null;

  // Escolhe o melhor vídeo de um tema: sem créditos (nc), sem cena do episódio por cima, o menor arquivo
  function melhorVideo(tema) {
    const videos = [];
    for (const e of tema.animethemeentries || []) {
      if (e.spoiler || e.nsfw) continue;
      for (const v of e.videos || []) videos.push({ ...v, versao: e.version || 1 });
    }
    videos.sort((a, b) => (b.nc ? 1 : 0) - (a.nc ? 1 : 0) || (a.overlap === 'None' ? -1 : 1) - (b.overlap === 'None' ? -1 : 1) || (a.versao || 1) - (b.versao || 1) || (a.size || 0) - (b.size || 0));
    return videos[0] || null;
  }

  function converter(anime) {
    const temas = [];
    for (const t of anime.animethemes || []) {
      if (t.type !== 'OP' && t.type !== 'ED') continue;
      const v = melhorVideo(t);
      if (!v?.link) continue;
      temas.push({
        tipo: t.type,
        numero: t.sequence || 1,
        musica: t.song?.title || '',
        artistas: (t.song?.artists || []).map((a) => a.name).slice(0, 3),
        video: v.link,
        // a música fica em outro endereço, com o mesmo nome: Naruto-OP1.webm → Naruto-OP1.ogg
        audio: `${AUDIO}/${v.link.split('/').pop().replace(/\.webm$/, '.ogg')}`,
      });
    }
    return temas;
  }

  async function pedir(ids) {
    const url =
      `${API}/anime?filter[has]=resources&filter[site]=AniList&filter[external_id]=${ids.join(',')}` +
      `&include=animethemes.animethemeentries.videos,animethemes.song.artists,resources&page[size]=${POR_PEDIDO}`;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const r = await fetch(url, {
        // sem um "User-Agent" o site recusa o pedido
        headers: { 'User-Agent': 'Resenha/1.0 (app de amigos)', Accept: 'application/json' },
        signal: AbortSignal.timeout(60000),
      });
      if (r.status === 429) {
        await dormir((Number(r.headers.get('retry-after')) || 30) * 1000);
        continue;
      }
      if (!r.ok) throw new Error('o AnimeThemes respondeu ' + r.status);
      return (await r.json()).anime || [];
    }
    throw new Error('o AnimeThemes está recusando pedidos agora');
  }

  async function baixarTudo() {
    const { animes } = await anilist.garantir();
    const alvo = animes.slice(0, QUANTOS_ANIMES).map((a) => a.id);
    log(`  [AnimeThemes] Baixando a lista de aberturas de ${alvo.length} animes (só na primeira vez, uns 3 minutos)...`);
    const porAnime = {};
    for (let i = 0; i < alvo.length; i += POR_PEDIDO) {
      const lote = alvo.slice(i, i + POR_PEDIDO);
      const lista = await pedir(lote);
      for (const a of lista) {
        const ids = (a.resources || []).filter((r) => r.site === 'AniList').map((r) => Number(r.external_id));
        const temas = converter(a);
        for (const id of ids) if (lote.includes(id) && temas.length) porAnime[id] = [...(porAnime[id] || []), ...temas];
      }
      // deixa jogar enquanto baixa o resto
      dados = { quando: 0, porAnime: { ...dados.porAnime, ...porAnime } };
      await dormir(ESPERA);
    }
    dados = { quando: Date.now(), porAnime };
    fs.writeFile(arquivo, JSON.stringify(dados), () => {});
    log(`  [AnimeThemes] Pronto: aberturas de ${Object.keys(porAnime).length} animes.`);
  }

  function comecar() {
    const fresco = Object.keys(dados.porAnime).length && Date.now() - dados.quando < VALIDADE;
    if (fresco || baixando) return baixando;
    baixando = baixarTudo()
      .catch((e) => log('  [AnimeThemes] Não consegui baixar: ' + e.message))
      .finally(() => (baixando = null));
    return baixando;
  }

  // Temas de um tipo ('OP' ou 'ED'): [{ animeId, tema }]
  function temas(tipo) {
    const saida = [];
    for (const [id, lista] of Object.entries(dados.porAnime)) {
      for (const t of lista) if (t.tipo === tipo) saida.push({ animeId: Number(id), tema: t });
    }
    return saida;
  }

  async function garantir(tipo, minimo = 10) {
    if (temas(tipo).length < minimo) {
      comecar();
      // espera um pouco: o primeiro lote já dá pra jogar
      for (let i = 0; i < 40 && temas(tipo).length < minimo; i++) await dormir(1000);
    }
    const lista = temas(tipo);
    if (lista.length < minimo) throw new Error('Ainda estou baixando as aberturas do AnimeThemes. Tenta de novo em 1 minutinho.');
    return lista;
  }

  return { comecar, garantir, temas };
}

module.exports = { criarAberturas };
