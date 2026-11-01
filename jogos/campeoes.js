'use strict';
/*
 * Dados dos campeões do League of Legends.
 *  - Data Dragon (site oficial da Riot): nome e título em português + imagens
 *  - Meraki Analytics (site grátis da comunidade): posição, classes, recurso,
 *    alcance, região e data de lançamento
 * Baixa uma vez e guarda em dados/campeoes.json (renova a cada 14 dias).
 */
const fs = require('fs');
const path = require('path');

const DDRAGON = process.env.DDRAGON_URL || 'https://ddragon.leagueoflegends.com';
const MERAKI = process.env.MERAKI_URL || 'https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json';
const VALIDADE = 14 * 24 * 3600_000;

async function pegarJson(url, tempo = 30000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(tempo) });
  if (!r.ok) throw new Error(`${new URL(url).host} respondeu ${r.status}`);
  return r.json();
}

function criarCampeoes(pastaDados, log) {
  const arquivo = path.join(pastaDados, 'campeoes.json');
  let dados = { quando: 0, campeoes: [] };
  try {
    dados = { ...dados, ...JSON.parse(fs.readFileSync(arquivo, 'utf8')) };
  } catch {
    /* ainda não baixou */
  }

  async function baixar() {
    log('  [LoL] Baixando os campeões (só na primeira vez)...');
    const versoes = await pegarJson(`${DDRAGON}/api/versions.json`);
    const versao = versoes[0];
    const pt = await pegarJson(`${DDRAGON}/cdn/${versao}/data/pt_BR/champion.json`);
    const meraki = await pegarJson(MERAKI, 180000); // arquivo grande
    const campeoes = Object.values(meraki)
      .map((c) => {
        const dd = pt.data?.[c.key];
        return {
          id: c.key,
          nome: dd?.name || c.name,
          titulo: dd?.title || c.title || '',
          icone: dd ? `${DDRAGON}/cdn/${versao}/img/champion/${dd.image.full}` : c.icon,
          splash: `${DDRAGON}/cdn/img/champion/splash/${c.key}_0.jpg`,
          posicoes: c.positions || [],
          classes: c.roles || [],
          recurso: c.resource || 'NONE',
          alcance: c.attackType || '',
          regiao: c.faction || 'unaffiliated',
          ano: Number(String(c.releaseDate || '').slice(0, 4)) || 0,
          dificuldade: c.attributeRatings?.difficulty || 0,
        };
      })
      .filter((c) => c.id && c.nome)
      .sort((a, b) => a.nome.localeCompare(b.nome));
    if (campeoes.length < 50) throw new Error('vieram poucos campeões');
    dados = { quando: Date.now(), campeoes };
    fs.writeFile(arquivo, JSON.stringify(dados), () => {});
    log(`  [LoL] Pronto: ${campeoes.length} campeões.`);
  }

  let baixando = null;
  async function garantir() {
    if (dados.campeoes.length && Date.now() - dados.quando < VALIDADE) return dados;
    if (!baixando) {
      baixando = baixar()
        .catch((e) => {
          if (!dados.campeoes.length) throw e;
          log('  [LoL] Não consegui atualizar (' + e.message + '), usando os dados antigos.');
        })
        .finally(() => (baixando = null));
    }
    try {
      await baixando;
    } catch (e) {
      throw new Error('Não consegui baixar os campeões do LoL: ' + e.message + '. O servidor está com internet?');
    }
    return dados;
  }

  return { garantir };
}

module.exports = { criarCampeoes };
