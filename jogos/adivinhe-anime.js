'use strict';
/*
 * ADIVINHE O ANIME (coop) — estilo Anidle.
 * O jogo sorteia um anime. A galera chuta animes e cada chute mostra
 * o que bate com o anime secreto: formato, ano, estúdio, gêneros...
 */
const { sortear } = require('./util');
const { criarAdivinhacao, numero, conjunto, igual, dicaTrancada } = require('./adivinhar');

const MAX_CHUTES = 15;
const LIMITE = { facil: 100, medio: 250, dificil: 500 };

const FORMATOS = { TV: 'TV', TV_SHORT: 'TV curta', MOVIE: 'Filme', SPECIAL: 'Especial', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Clipe' };
const FONTES = {
  MANGA: 'Mangá',
  LIGHT_NOVEL: 'Light novel',
  ORIGINAL: 'Original',
  VISUAL_NOVEL: 'Visual novel',
  VIDEO_GAME: 'Jogo',
  GAME: 'Jogo',
  NOVEL: 'Livro',
  WEB_NOVEL: 'Web novel',
  COMIC: 'Quadrinho',
  MULTIMEDIA_PROJECT: 'Multimídia',
  PICTURE_BOOK: 'Livro ilustrado',
  LIVE_ACTION: 'Live action',
  ANIME: 'Anime',
  DOUJINSHI: 'Doujinshi',
  OTHER: 'Outro',
};
const TEMPORADAS = { WINTER: 'Inverno', SPRING: 'Primavera', SUMMER: 'Verão', FALL: 'Outono' };
const GENEROS = {
  Action: 'Ação',
  Adventure: 'Aventura',
  Comedy: 'Comédia',
  Drama: 'Drama',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasia',
  Horror: 'Terror',
  'Mahou Shoujo': 'Garota mágica',
  Mecha: 'Mecha',
  Music: 'Música',
  Mystery: 'Mistério',
  Psychological: 'Psicológico',
  Romance: 'Romance',
  'Sci-Fi': 'Ficção científica',
  'Slice of Life': 'Cotidiano',
  Sports: 'Esportes',
  Supernatural: 'Sobrenatural',
  Thriller: 'Suspense',
};
const traduzir = (mapa, v) => mapa[v] || (v ? String(v).replace(/_/g, ' ').toLowerCase() : '?');

function comparar(c, a) {
  return {
    formato: igual(c.formato, a.formato, traduzir(FORMATOS, c.formato)),
    ano: { v: c.ano || '?', ...numero(c.ano, a.ano, 2) },
    temporada: igual(c.temporada, a.temporada, traduzir(TEMPORADAS, c.temporada)),
    episodios: { v: c.episodios || '?', ...numero(c.episodios, a.episodios, Math.max(3, Math.round(a.episodios * 0.2))) },
    estudio: igual(c.estudio, a.estudio),
    fonte: igual(c.fonte, a.fonte, traduzir(FONTES, c.fonte)),
    generos: conjunto(c.generos, a.generos, (g) => traduzir(GENEROS, g)),
    nota: { v: c.nota ? c.nota + '%' : '?', ...numero(c.nota, a.nota, 5) },
  };
}

const resumo = (a) => ({ id: a.id, titulo: a.titulo, sub: a.ingles && a.ingles !== a.titulo ? a.ingles : '', img: a.capa });

module.exports = {
  titulo: 'Adivinhe o Anime',

  async criar({ opcoes, anilist }) {
    const dados = await anilist.garantir();
    const todos = dados.animes.filter((a) => a.ano);
    if (todos.length < 20) throw new Error('Poucos animes baixados do AniList. Tente de novo daqui a pouco.');
    const dificuldade = LIMITE[opcoes.dificuldade] ? opcoes.dificuldade : 'medio';
    return criarAdivinhacao({
      itens: todos,
      maximo: MAX_CHUTES,
      sortear: () => sortear(todos.slice(0, LIMITE[dificuldade])),
      comparar,
      resumo,
      dicas: (alvo, n, acabou) => [
        dicaTrancada('tags', '🏷️ Temas', 'chips', alvo.tags.slice(0, 4), n, 5, acabou),
        dicaTrancada('capa', '🖼️ Capa', 'imagem', alvo.capa, n, 10, acabou, { borrar: !acabou }),
      ],
      extra: () => ({ dificuldade }),
    });
  },

  // Lista enxuta pro campo de busca do navegador
  async listaParaBusca({ anilist }) {
    const dados = await anilist.garantir();
    return dados.animes.filter((a) => a.ano).map((a) => ({ id: a.id, t: a.titulo, sub: a.ingles, s: a.sinonimos, img: a.capa }));
  },
};
