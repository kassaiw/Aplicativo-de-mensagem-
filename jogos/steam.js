'use strict';
/*
 * Dados dos jogos de videogame (pro Adivinhe o Jogo).
 *  - SteamSpy (steamspy.com): lista dos jogos mais jogados da Steam + tags
 *  - Loja da Steam: ano, gêneros, desenvolvedora, modos, nota e imagens
 *
 * A Steam só deixa uns 40 pedidos por minuto, então baixar uns 180 jogos
 * leva uns 5 minutos. Isso acontece sozinho, em segundo plano, na primeira
 * vez que o servidor liga. Dá pra jogar quando já tiver uns 40 jogos.
 * Fica guardado em dados/steam.json (renova a cada 30 dias).
 */
const fs = require('fs');
const path = require('path');

const SPY = process.env.STEAMSPY_URL || 'https://steamspy.com/api.php';
const LOJA = process.env.STEAM_URL || 'https://store.steampowered.com/api/appdetails';
const ESPERA_LOJA = Number(process.env.STEAM_ESPERA) || 1600;
const ESPERA_SPY = Number(process.env.STEAMSPY_ESPERA) || 1100;
const VALIDADE = 30 * 24 * 3600_000;
const MINIMO_PRA_JOGAR = 40;

// Gêneros que mostram que é um programa, não um jogo
const NAO_JOGO = /utilit|software|design|animação e modelagem|produção de|edição de|treinamento|contabilidade|desenvolvimento web|educação/i;

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function pegarJson(url) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } });
    if (r.status === 429 || r.status === 403) {
      await dormir(60000); // limite de pedidos: espera 1 minuto
      continue;
    }
    if (!r.ok) throw new Error(`${new URL(url).host} respondeu ${r.status}`);
    return r.json();
  }
  throw new Error('a Steam está recusando pedidos agora');
}

function modosDe(categorias) {
  const nomes = categorias.map((c) => c.description || '');
  const modos = [];
  if (nomes.some((n) => /um jogador|single/i.test(n))) modos.push('Um jogador');
  if (nomes.some((n) => /multijogador|multi-player|multiplayer/i.test(n))) modos.push('Multijogador');
  if (nomes.some((n) => /cooperativo|co-op/i.test(n))) modos.push('Cooperativo');
  if (nomes.some((n) => /jxj|pvp/i.test(n))) modos.push('Competitivo');
  return modos;
}

function converter(appid, det, spy) {
  const d = det?.data;
  if (!det?.success || !d || d.type !== 'game') return null;
  const generos = (d.genres || []).map((g) => g.description).filter(Boolean);
  if (generos.some((g) => NAO_JOGO.test(g)) || /soundtrack|dedicated server|benchmark|sdk\b/i.test(d.name)) return null;
  const ano = Number((String(d.release_date?.date || '').match(/(\d{4})/) || [])[1]) || 0;
  const telas = (d.screenshots || []).slice(0, 8).map((s) => s.path_thumbnail || s.path_full).filter(Boolean);
  if (!ano || !telas.length) return null;
  const tags = spy?.tags && typeof spy.tags === 'object' && !Array.isArray(spy.tags)
    ? Object.entries(spy.tags).sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 10)
    : [];
  return {
    id: Number(appid),
    nome: d.name,
    ano,
    generos,
    desenvolvedoras: d.developers || [],
    publicadoras: d.publishers || [],
    modos: modosDe(d.categories || []),
    nota: d.metacritic?.score || 0,
    gratis: !!d.is_free,
    capa: d.header_image || '',
    telas,
    tags,
  };
}

function criarSteam(pastaDados, log) {
  const arquivo = path.join(pastaDados, 'steam.json');
  let dados = { quando: 0, completo: false, jogos: [], vistos: [] };
  try {
    dados = { ...dados, ...JSON.parse(fs.readFileSync(arquivo, 'utf8')) };
  } catch {
    /* ainda não baixou */
  }
  let progresso = { feitos: 0, total: 0 };
  let baixando = null;

  const salvar = () => fs.writeFile(arquivo, JSON.stringify(dados), () => {});

  async function baixar() {
    const velho = Date.now() - dados.quando > VALIDADE;
    if (velho) dados = { quando: Date.now(), completo: false, jogos: [], vistos: [] };
    log('  [Steam] Baixando a lista de jogos mais jogados...');
    const ids = [];
    for (const lista of ['top100forever', 'top100owned', 'top100in2weeks']) {
      try {
        const r = await pegarJson(`${SPY}?request=${lista}`);
        for (const id of Object.keys(r || {})) if (!ids.includes(id)) ids.push(id);
      } catch (e) {
        log('  [Steam] Não consegui a lista ' + lista + ': ' + e.message);
      }
      await dormir(ESPERA_SPY);
    }
    if (!ids.length) throw new Error('não consegui a lista de jogos do SteamSpy');
    const vistos = new Set(dados.vistos.map(String));
    const faltam = ids.filter((id) => !vistos.has(id));
    progresso = { feitos: ids.length - faltam.length, total: ids.length };
    if (faltam.length) log(`  [Steam] Baixando detalhes de ${faltam.length} jogos (uns ${Math.ceil((faltam.length * ESPERA_LOJA) / 60000)} minutos, em segundo plano)...`);
    for (const id of faltam) {
      const [det, spy] = await Promise.all([
        pegarJson(`${LOJA}?appids=${id}&l=brazilian&cc=br`).then((r) => r?.[id]).catch(() => null),
        pegarJson(`${SPY}?request=appdetails&appid=${id}`).catch(() => null),
        dormir(ESPERA_LOJA),
      ]);
      const jogo = converter(id, det, spy);
      if (jogo && !dados.jogos.some((j) => j.id === jogo.id)) dados.jogos.push(jogo);
      dados.vistos.push(id);
      progresso.feitos++;
      if (progresso.feitos % 10 === 0) salvar();
    }
    dados.completo = true;
    dados.quando = dados.quando || Date.now();
    salvar();
    log(`  [Steam] Pronto: ${dados.jogos.length} jogos.`);
  }

  function comecar() {
    if (baixando) return;
    if (dados.completo && Date.now() - dados.quando < VALIDADE) return;
    baixando = baixar()
      .catch((e) => log('  [Steam] Parou de baixar: ' + e.message))
      .finally(() => (baixando = null));
  }

  async function garantir() {
    comecar();
    if (dados.jogos.length >= MINIMO_PRA_JOGAR) return dados;
    if (baixando) {
      const p = progresso.total ? ` (${progresso.feitos} de ${progresso.total})` : '';
      throw new Error(`Ainda baixando os jogos da Steam${p}. Isso só acontece na primeira vez: tente de novo em alguns minutos.`);
    }
    throw new Error('Não consegui baixar os jogos da Steam. O servidor está com internet?');
  }

  return { garantir, comecar };
}

module.exports = { criarSteam };
