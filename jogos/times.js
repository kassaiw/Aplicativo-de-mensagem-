'use strict';
// Coisas usadas pelo Draft e pelo Leilão: escolher os personagens e decidir quem ganhou.
const { comStatus, avaliarTime } = require('./status');

// opcoes.anime vazio = personagens mais populares do AniList; senão, só desse anime
async function pegarPersonagens(opcoes, anilist) {
  const busca = String(opcoes.anime || '').trim().slice(0, 60);
  let titulo;
  let lista;
  if (busca) {
    const r = await anilist.personagensDoAnime(busca);
    if (r.personagens.length < 12) throw new Error(`"${r.titulo}" tem poucos personagens no AniList. Tente outro anime.`);
    titulo = r.titulo;
    lista = r.personagens;
  } else {
    const dados = await anilist.garantir();
    titulo = 'Personagens mais populares';
    lista = dados.personagens;
  }
  // Os status dependem da popularidade: ordena do mais favoritado pro menos
  const ordenada = [...lista].sort((a, b) => (b.favoritos || 0) - (a.favoritos || 0));
  return { titulo, lista: comStatus(ordenada) };
}

// Calcula o poder de cada time e decide o vencedor.
// Com MAIS de 2 jogadores a galera vota (empate no voto = ganha quem tem mais poder).
// Com 1 ou 2 jogadores ganha direto quem tem mais poder.
function precisaVotacao(jogadores) {
  return jogadores.length > 2;
}

function resultado(jogadores, posicoes, comVotos) {
  const poder = new Map(jogadores.map((j) => [j.cid, avaliarTime(j.time, posicoes).total]));
  const votos = {};
  if (comVotos) for (const j of jogadores) if (j.voto) votos[j.voto] = (votos[j.voto] || 0) + 1;
  const pontuacao = (cid) => (comVotos ? (votos[cid] || 0) * 100000 : 0) + poder.get(cid);
  const maior = Math.max(...jogadores.map((j) => pontuacao(j.cid)));
  return {
    votos,
    porVoto: comVotos,
    vencedores: jogadores.filter((j) => pontuacao(j.cid) === maior).map((j) => j.cid),
  };
}

// O que cada jogador mostra na tela (time + pontos por posição)
function visaoDoTime(j, posicoes) {
  const av = avaliarTime(j.time, posicoes);
  return { time: j.time, pontos: av.vagas.map((v) => v.pontos), sinergia: av.sinergia, poder: av.total };
}

module.exports = { pegarPersonagens, resultado, precisaVotacao, visaoDoTime };
