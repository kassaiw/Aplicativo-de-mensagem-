'use strict';
/*
 * ================================================================
 *  ADMIN — quem manda no servidor
 * ================================================================
 *  Quem digitar o CÓDIGO DE ADMIN (Configurações → Admin) vira admin.
 *  O código aparece na janela preta quando o servidor liga. Dá pra
 *  escolher um código seu colocando "senhaAdmin" no config.json.
 *
 *  Depois de entrar com o código, o navegador recebe uma "chave" secreta
 *  e continua admin mesmo fechando e abrindo de novo. O servidor guarda
 *  só um "hash" da chave (uma impressão digital), nunca a chave em si.
 *
 *  Também guarda a lista de banidos (pelo navegador e pelo IP).
 *  Tudo fica em dados/admin.json.
 * ================================================================
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I pra não confundir

function gerarCodigo() {
  let c = '';
  for (let i = 0; i < 8; i++) c += LETRAS[crypto.randomInt(LETRAS.length)];
  return c.slice(0, 4) + '-' + c.slice(4);
}

const hash = (texto) => crypto.createHash('sha256').update(String(texto)).digest('hex');
const normalizar = (texto) => String(texto || '').trim().toUpperCase();

// IPs da própria máquina (o dono do servidor) nunca são banidos por IP
function ipLocal(ip) {
  return !ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function criarAdmin({ pastaDados, senhaConfig }) {
  const arquivo = path.join(pastaDados, 'admin.json');
  let d = { codigo: '', chaves: [], banidos: [] };
  try {
    d = { ...d, ...JSON.parse(fs.readFileSync(arquivo, 'utf8')) };
  } catch {
    /* primeira vez */
  }
  const salvar = () => fs.writeFile(arquivo, JSON.stringify(d, null, 2), () => {});
  if (!senhaConfig && !d.codigo) {
    d.codigo = gerarCodigo();
    salvar();
  }
  const codigo = () => normalizar(senhaConfig || d.codigo);

  return {
    codigo,
    personalizado: !!senhaConfig,

    // Compara sem vazar informação pelo tempo de resposta
    conferirCodigo(tentativa) {
      const a = Buffer.from(normalizar(tentativa));
      const b = Buffer.from(codigo());
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },

    novaChave() {
      const chave = crypto.randomBytes(24).toString('hex');
      d.chaves.push(hash(chave));
      if (d.chaves.length > 50) d.chaves.shift();
      salvar();
      return chave;
    },

    chaveValida(chave) {
      return typeof chave === 'string' && /^[a-f0-9]{48}$/.test(chave) && d.chaves.includes(hash(chave));
    },

    esquecerChave(chave) {
      d.chaves = d.chaves.filter((h) => h !== hash(chave));
      salvar();
    },

    banir({ cid, ip, nome, motivo, por }) {
      d.banidos.push({ cid, ip: ipLocal(ip) ? '' : ip, nome, motivo: String(motivo || '').slice(0, 100), por, quando: Date.now() });
      salvar();
    },

    desbanir(indice) {
      const b = d.banidos[indice];
      if (!b) return null;
      d.banidos.splice(indice, 1);
      salvar();
      return b;
    },

    estaBanido(cid, ip) {
      return d.banidos.find((b) => (cid && b.cid === cid) || (!ipLocal(ip) && b.ip && b.ip === ip)) || null;
    },

    // Lista pro painel (o IP aparece só pela metade, por privacidade)
    banidos() {
      return d.banidos.map((b, i) => ({ indice: i, nome: b.nome, motivo: b.motivo, por: b.por, quando: b.quando, ip: b.ip ? b.ip.replace(/[\d]+$|[a-f\d]+$/i, '•••') : '' }));
    },
  };
}

module.exports = { criarAdmin, ipLocal };
