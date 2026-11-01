'use strict';
/*
 * Dados de anime vindos do AniList (anilist.co), um site grátis com
 * informações de animes e personagens. Ele tem uma API pública (sem chave).
 *
 * Na primeira vez o servidor baixa ~500 animes e ~400 personagens populares
 * e guarda em dados/anilist.json. Depois só baixa de novo depois de 7 dias.
 * O AniList deixa fazer no máximo 30 pedidos por minuto, então a gente
 * espera um pouquinho entre cada pedido.
 */
const fs = require('fs');
const path = require('path');

const API = process.env.ANILIST_API || 'https://graphql.anilist.co';
const VALIDADE = 7 * 24 * 3600_000; // 7 dias
const VERSAO = 2; // muda quando a gente passa a baixar campos novos (2 = banners pro Adivinhe o Cenário)
const ESPERA_ENTRE_PEDIDOS = Number(process.env.ANILIST_ESPERA) || 2200; // ms (30 por minuto)

const PAGINAS_ANIMES = 10; // 10 x 50 = 500 animes
const PAGINAS_PERSONAGENS = 8; // 8 x 50 = 400 personagens

const CONSULTA_ANIMES = `
query ($pagina: Int) {
  Page(page: $pagina, perPage: 50) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      id
      title { romaji english }
      synonyms
      format
      episodes
      season
      seasonYear
      source
      genres
      averageScore
      popularity
      studios(isMain: true) { nodes { name } }
      coverImage { large medium }
      bannerImage
      tags { name rank isMediaSpoiler }
    }
  }
}`;

const CAMPOS_PERSONAGEM = `
  id
  name { full native }
  image { large medium }
  favourites
  media(perPage: 1, sort: POPULARITY_DESC) { nodes { title { romaji english } } }
`;

const CONSULTA_PERSONAGENS = `
query ($pagina: Int) {
  Page(page: $pagina, perPage: 50) {
    characters(sort: FAVOURITES_DESC) { ${CAMPOS_PERSONAGEM} }
  }
}`;

const CONSULTA_PERSONAGENS_DO_ANIME = `
query ($busca: String, $pagina: Int) {
  Media(search: $busca, type: ANIME, sort: SEARCH_MATCH) {
    title { romaji english }
    characters(sort: FAVOURITES_DESC, page: $pagina, perPage: 50) {
      pageInfo { hasNextPage }
      nodes { ${CAMPOS_PERSONAGEM} }
    }
  }
}`;

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

function criarAniList(pastaDados, log) {
  const arquivo = path.join(pastaDados, 'anilist.json');
  let dados = { quando: 0, animes: [], personagens: [], buscas: {} };
  try {
    dados = { ...dados, ...JSON.parse(fs.readFileSync(arquivo, 'utf8')) };
  } catch {
    /* ainda não baixou */
  }

  let ultimoPedido = 0;
  let fila = Promise.resolve();

  // Faz um pedido ao AniList, respeitando o limite de pedidos por minuto
  function consultar(query, variables) {
    const tarefa = fila.then(async () => {
      const espera = ultimoPedido + ESPERA_ENTRE_PEDIDOS - Date.now();
      if (espera > 0) await dormir(espera);
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        ultimoPedido = Date.now();
        const r = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(20000),
        });
        if (r.status === 429) {
          const segundos = Number(r.headers.get('retry-after')) || 60;
          log(`  [AniList] Muitos pedidos, esperando ${segundos}s...`);
          await dormir(segundos * 1000);
          continue;
        }
        if (!r.ok) throw new Error('o AniList respondeu ' + r.status);
        const json = await r.json();
        if (json.errors?.length) throw new Error(json.errors[0].message);
        return json.data;
      }
      throw new Error('o AniList está recusando pedidos agora');
    });
    fila = tarefa.catch(() => {});
    return tarefa;
  }

  function salvar() {
    fs.writeFile(arquivo, JSON.stringify(dados), () => {});
  }

  function converterAnime(m) {
    const tags = (m.tags || [])
      .filter((t) => !t.isMediaSpoiler && t.rank >= 60)
      .slice(0, 6)
      .map((t) => t.name);
    return {
      id: m.id,
      titulo: m.title?.romaji || m.title?.english || '?',
      ingles: m.title?.english || '',
      sinonimos: (m.synonyms || []).slice(0, 6),
      formato: m.format || '',
      episodios: m.episodes || 0,
      temporada: m.season || '',
      ano: m.seasonYear || 0,
      fonte: m.source || '',
      generos: m.genres || [],
      nota: m.averageScore || 0,
      popularidade: m.popularity || 0,
      estudio: m.studios?.nodes?.[0]?.name || '',
      capa: m.coverImage?.large || m.coverImage?.medium || '',
      banner: m.bannerImage || '',
      tags,
    };
  }

  function converterPersonagem(c) {
    const anime = c.media?.nodes?.[0]?.title;
    return {
      id: c.id,
      nome: c.name?.full || '?',
      nativo: c.name?.native || '',
      imagem: c.image?.large || c.image?.medium || '',
      favoritos: c.favourites || 0,
      anime: anime?.english || anime?.romaji || '',
    };
  }

  let baixando = null;
  async function baixarTudo() {
    log('  [AniList] Baixando dados de anime pros jogos (só na primeira vez, ~40 segundos)...');
    const animes = [];
    for (let p = 1; p <= PAGINAS_ANIMES; p++) {
      const d = await consultar(CONSULTA_ANIMES, { pagina: p });
      animes.push(...(d.Page?.media || []).map(converterAnime));
    }
    const personagens = [];
    for (let p = 1; p <= PAGINAS_PERSONAGENS; p++) {
      const d = await consultar(CONSULTA_PERSONAGENS, { pagina: p });
      personagens.push(...(d.Page?.characters || []).map(converterPersonagem).filter((c) => c.imagem));
    }
    dados = { ...dados, versao: VERSAO, quando: Date.now(), animes, personagens };
    salvar();
    log(`  [AniList] Pronto: ${animes.length} animes e ${personagens.length} personagens.`);
  }

  // Garante que os dados estão baixados (espera se precisar)
  async function garantir() {
    const fresco = dados.animes.length && dados.versao === VERSAO && Date.now() - dados.quando < VALIDADE;
    if (fresco) return dados;
    if (!baixando) {
      baixando = baixarTudo()
        .catch((e) => {
          if (!dados.animes.length) throw e;
          log('  [AniList] Não consegui atualizar (' + e.message + '), usando os dados antigos.');
        })
        .finally(() => (baixando = null));
    }
    try {
      await baixando;
    } catch (e) {
      throw new Error('Não consegui baixar os dados do AniList: ' + e.message + '. O servidor está com internet?');
    }
    return dados;
  }

  // Personagens de um anime específico (ex.: "Naruto")
  async function personagensDoAnime(busca) {
    const chave = busca.trim().toLowerCase();
    const guardado = dados.buscas[chave];
    if (guardado && Date.now() - guardado.quando < VALIDADE) return guardado;
    let titulo = '';
    const lista = [];
    for (let p = 1; p <= 3; p++) {
      let d;
      try {
        d = await consultar(CONSULTA_PERSONAGENS_DO_ANIME, { busca, pagina: p });
      } catch (e) {
        if (/not found/i.test(e.message)) break;
        throw new Error('Não consegui buscar no AniList: ' + e.message);
      }
      if (!d?.Media) break;
      titulo = d.Media.title?.english || d.Media.title?.romaji || busca;
      lista.push(...(d.Media.characters?.nodes || []).map(converterPersonagem).filter((c) => c.imagem));
      if (!d.Media.characters?.pageInfo?.hasNextPage) break;
    }
    if (!lista.length) throw new Error(`Não achei personagens de "${busca}" no AniList.`);
    const resultado = { quando: Date.now(), titulo, personagens: lista };
    dados.buscas[chave] = resultado;
    const chaves = Object.keys(dados.buscas);
    if (chaves.length > 30) delete dados.buscas[chaves[0]];
    salvar();
    return resultado;
  }

  return { garantir, personagensDoAnime, temDados: () => dados.animes.length > 0 };
}

module.exports = { criarAniList };
