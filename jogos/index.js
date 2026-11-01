'use strict';
/*
 * Gerente dos jogos: só existe UM jogo rolando por vez no servidor.
 * Ele recebe os pedidos dos navegadores ("jogo:criar", "jogo:acao"...),
 * repassa pro jogo certo e manda o estado atualizado pra todo mundo.
 *
 * Cada jogo (arquivo nesta pasta) tem:
 *   criar({...}) -> { visao(usuario), acao(usuario, dados), saiu?(), destruir?() }
 *   visao() = o que aquela pessoa pode ver (o mestre vê mais coisa, por ex.)
 */
const crypto = require('crypto');
const { criarAniList } = require('./anilist');
const { criarPalavras } = require('./palavras');
const { criarCampeoes } = require('./campeoes');
const { criarSteam } = require('./steam');
const { criarAberturas } = require('./aberturas');
const { criarRanking } = require('./ranking');
const quizAnime = require('./quiz-anime');
const { erro, OK } = require('./util');

const TIPOS = {
  'cinco-letras': require('./cinco-letras'),
  'adivinhe-anime': require('./adivinhe-anime'),
  'adivinhe-campeao': require('./adivinhe-campeao'),
  'adivinhe-jogo': require('./adivinhe-jogo'),
  conexoes: require('./conexoes'),
  'palavras-secretas': require('./palavras-secretas'),
  draft: require('./draft'),
  leilao: require('./leilao'),
  masmorra: require('./rpg'),
  construir: require('./construir'),
  ...quizAnime.TIPOS, // quiz-personagem, quiz-olho, quiz-cabelo, quiz-roupa, quiz-cenario, quiz-abertura, quiz-encerramento
};

function criarGerente({ pastaDados, online, log }) {
  // Fontes de dados (cada uma baixa da internet uma vez e guarda na pasta "dados")
  const fontes = {
    anilist: criarAniList(pastaDados, log),
    palavras: criarPalavras(pastaDados, log),
    campeoes: criarCampeoes(pastaDados, log),
    steam: criarSteam(pastaDados, log),
  };
  fontes.aberturas = criarAberturas(pastaDados, log, fontes.anilist);
  const ranking = criarRanking(pastaDados);
  let atual = null; // { id, tipo, titulo, criador, jogo }
  let criando = null; // tipo que está sendo preparado

  const estaOnline = (cid) => online().some((c) => c.usuario.cid === cid);

  function visaoPara(u) {
    if (criando && !atual) return { preparando: true, tipo: criando };
    if (!atual) return null;
    return {
      id: atual.id,
      tipo: atual.tipo,
      titulo: atual.titulo,
      criador: atual.criador,
      agora: Date.now(), // pra acertar o relógio do navegador (timer do leilão)
      ...atual.jogo.visao(u),
    };
  }

  function transmitir() {
    for (const c of online()) c.mandar('jogo:estado', visaoPara(c.usuario));
  }

  async function criar(u, d) {
    if (atual) return erro(`Já tem um jogo rolando (${atual.titulo}). Encerre ele primeiro.`);
    if (criando) return erro('Já tem um jogo sendo preparado. Espera um pouquinho.');
    const Tipo = TIPOS[d?.tipo];
    if (!Tipo) return erro('Jogo desconhecido.');
    criando = d.tipo;
    transmitir();
    try {
      const jogo = await Tipo.criar({
        ...fontes,
        pastaDados,
        ranking,
        log,
        opcoes: d.opcoes || {},
        criador: u,
        estaOnline,
        mudou: transmitir,
      });
      atual = { id: crypto.randomBytes(4).toString('hex'), tipo: d.tipo, titulo: Tipo.titulo, criador: u.nome, criadorCid: u.cid, jogo };
      log(`[jogo] ${u.nome} começou: ${Tipo.titulo}`);
      return OK;
    } catch (e) {
      return erro(e.message || 'Não consegui criar o jogo.');
    } finally {
      criando = null;
      transmitir();
    }
  }

  async function acao(u, d) {
    if (!atual) return erro('Nenhum jogo rolando.');
    if (d?.jogo && d.jogo !== atual.id) return erro('Esse jogo já acabou.');
    const resposta = (await atual.jogo.acao(u, d || {})) || OK;
    transmitir();
    return resposta;
  }

  // Pode encerrar: quem começou o jogo, um admin, ou qualquer um se quem começou já saiu
  function encerrar(u) {
    if (!atual) return OK;
    if (!u.admin && u.cid !== atual.criadorCid && estaOnline(atual.criadorCid)) {
      return erro(`Só ${atual.criador} (quem começou) ou um admin pode encerrar o jogo.`);
    }
    log(`[jogo] ${u.nome} encerrou: ${atual.titulo}`);
    atual.jogo.destruir?.();
    atual = null;
    transmitir();
    return OK;
  }

  function saiu() {
    if (!atual?.jogo.saiu) return;
    atual.jogo.saiu();
    transmitir();
  }

  // Liga o download dos dados assim que o servidor abre (pra não esperar depois)
  function preaquecer() {
    fontes.anilist
      .garantir()
      .then(() => fontes.aberturas.comecar()) // as aberturas dependem da lista de animes
      .catch((e) => log('  [AniList] ' + e.message));
    fontes.palavras.baixarDicionario();
    fontes.campeoes.garantir().catch((e) => log('  [LoL] ' + e.message));
    fontes.steam.comecar(); // demora uns minutos, roda em segundo plano
  }

  // Lista de opções pro campo de busca (animes, campeões ou jogos)
  async function listaPara(tipo) {
    const Tipo = TIPOS[tipo];
    if (!Tipo?.listaParaBusca) throw new Error('Esse jogo não tem lista.');
    return Tipo.listaParaBusca(fontes);
  }

  // Música de abertura (o servidor baixa uma vez e entrega pros amigos)
  const musica = (nome) => quizAnime.arquivoDeMusica(nome, fontes.aberturas, pastaDados, log);

  return { criar, acao, encerrar, saiu, visaoPara, preaquecer, listaPara, ranking: () => ranking.ver(), musica };
}

module.exports = { criarGerente };
