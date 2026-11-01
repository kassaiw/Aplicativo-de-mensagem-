'use strict';
/*
 * Listas de palavras dos jogos.
 *  - RESPOSTAS: palavras de 5 letras que podem ser sorteadas no Cinco Letras
 *  - SECRETAS: palavras das cartas do Palavras Secretas
 *  - Dicionário: lista grande de palavras em português (baixada uma vez)
 *    pra saber se um chute é uma palavra de verdade.
 */
const fs = require('fs');
const path = require('path');
const { normalizar } = require('./util');

const URL_DICIONARIO =
  process.env.DICIONARIO_URL || 'https://raw.githubusercontent.com/pythonprobr/palavras/master/palavras.txt';

const RESPOSTAS = `
abrir acaso aceso acima agora ainda aluno amigo amiga ambos andar ânimo antes apoio areia arroz assim atrás autor avião
baixo banco banho barco beijo bicho bolsa braço bravo breve briga brisa burro cabra caixa calma calor campo canal canto
capaz carga carne carro carta casal causa certo chave chefe cheio chuva cinco cinza claro clima cobra coisa comum conta
corpo corte couro cravo crime culpa curso curto dança dente desde diabo dizer doido drama dupla época errar estar etapa
exame falar falta farol favor febre feira feito festa ficar filho filme final firme fluxo folga folha força forma forno
forte fraco frase freio fruta fugir fundo furto ganso garfo gente gesto girar globo golpe gordo gosto grama grana grave
grito grupo honra hotel humor ideia idoso igual ímpar irmão janta jeito jogar jovem justo lápis largo legal leite lento
letra limão limpo lindo linha livre livro louco lugar lutar macio mágoa maior malha manga manhã marca massa matar medir
meigo melão menor mente mesmo metal metro miolo misto moeda molho monte moral morar morno morte mosca motor móvel mudar
muito mundo nadar nação navio negro nervo ninho nobre noite norte nosso notar nuvem olhar ontem ordem outro ouvir padre
palco palha papel parar pardo parte passo pasta pátio pedir pedra peito peixe perto pesar piada pilha pingo plano pleno
pobre poder poema poeta ponte ponto porco porta posse praça praia prato prazo preço preto primo prova pulso punho quase
queda raiva rampa rapaz rasgo redor regra reino relva renda resto rezar risco ritmo rosto roupa ruído saber sabor saída
salto samba santo saúde secar selva senha senso sinal sobra sogra solar somar sonho sorte suave subir sujar susto tarde
tecla telha tempo tenso termo terra texto tigre tinta tocar tomar torre tosse total traço traje trevo trigo tribo troca
trote turma turno único urubu usina vagão valor vapor velho venda vento verão verde verso vigor vilão vinho virar vista
viver volta zebra águia altar amora anzol arame astro atlas átomo baile balde balão bambu banda barba bater beber boato
bolha bomba borda botão brasa broto cacau caldo canja canoa caqui cerca cetim chapa chute circo cisne clube cofre colar
comer conto coral corda corvo costa couve creme crina crise dados dieta disco dólar duelo ébano entre envio esqui faixa
fardo fauna fenda ferro fibra flora fogão frade frevo funil gaita galho garça gênio goela gruta harpa herói hiato horta
ícone índio jaula junta lagoa lança lapso laser lavar lazer lebre limbo lince longe lousa lucro magia manto milho monge
morro nariz nível oliva ópera órgão ostra pagar palma panda pasto pavio pedal pente perna piano pilar pinho pires pista
pizza placa pluma polvo pombo porão prado prata pulga puxar radar ralar remar rocha rolha ronco sabão safra salsa sarda
serra sítio solda sopro sushi talco tango tábua tenda tênis tocha tombo touca trava trenó trono tumba túnel verbo vidro
viola vírus vulto xampu xeque zinco abuso achar ajuda amado amplo apelo armar atual baixa boate busca calar casar cavar
choro cruel dever dobro durar fazer feliz fixar focar fumar ganho gasto gelar geral grato guiar hábil ideal imune irado
junto levar lidar longo magro manso obter ousar pausa pegar penal pesca pisar podre porém preso roubo salvo sábio sério
série sobre solto suado supor tirar topar torto usual vazio viral visar votar
`;

const SECRETAS = `
agulha água águia amor anel anjo apito aranha arco areia arma asa astronauta ator avião bala balão baleia banco bandeira
banho barco barril bateria bebê beijo biblioteca bicicleta bigode bola bolo bomba boneca bota bruxa cabelo cabra cachorro
caixa cama camelo campo caneta canguru carro carta castelo cavalo céu chapéu chave chefe chocolate chuva cinema circo
cobra código coelho cofre cola cometa copo coração coroa corda coruja cruz dado dente deserto diamante dinossauro disco
doutor dragão escada escola espada espelho espião esponja estrela faca fada fantasma farol fazenda ferro festa filme fio
flecha flor fogo foguete folha fonte formiga forno futebol galinha garrafa gato gelo gigante girafa golfinho grama guarda
guitarra helicóptero hospital hotel igreja ilha impressora inverno janela jardim jogo joia jornal ladrão lago lâmpada
lápis laranja leão leite limão linha livro lobo lua luva luz maçã macaco mágico mala mapa mar martelo máscara mel mesa
metrô milho mina mochila moeda monstro montanha morango moto múmia música nariz nave navio neve ninja nota nuvem olho onda
ópera ouro ovo palácio palhaço panela papel paraquedas pato pedra peixe pena pente piano piloto pimenta pinguim pipa
pirata pirâmide piscina pista pizza planeta planta polícia ponte porco porta praia prato prêmio presente príncipe prisão
pulga queijo rainha raio rato rede rei relógio remédio rio robô roda rosa sapato sapo sereia sino sol soldado sombra
sonho sorvete submarino tapete tatu teatro teclado telefone telhado templo tenda terra tesoura tesouro tigre tinta tomate
torre trem trono tubarão túnel unicórnio urso vampiro vaso vela vento vidro violão vulcão zebra zumbi alvo braço corrida
cubo gancho geladeira gravata ímã jacaré lanterna máquina mercado microfone novela ônibus palco papagaio parque peão
pirulito portal quadro radar sal satélite selva serra tambor tela touca trator vaca varinha viagem xadrez zoológico
`;

function lista(texto) {
  return [...new Set(texto.split(/\s+/).filter(Boolean))];
}

function criarPalavras(pastaDados, log) {
  const arquivo = path.join(pastaDados, 'dicionario5.json');
  // normalizada -> como aparece (com acento). Ex.: "ACUCAR" -> "AÇÚCAR"
  const comAcento = new Map();
  let dicionario = null; // Set com as palavras de 5 letras válidas
  let baixadas = new Set(); // só as que vieram do dicionário baixado
  let baixando = null;

  const respostas = lista(RESPOSTAS)
    .map((p) => ({ norm: normalizar(p), exibir: p.toUpperCase() }))
    .filter((p) => /^[A-Z]{5}$/.test(p.norm));
  for (const r of respostas) comAcento.set(r.norm, r.exibir);

  function usarLista(palavras) {
    dicionario = new Set(respostas.map((r) => r.norm));
    baixadas = new Set();
    for (const p of palavras) {
      const norm = normalizar(p);
      if (!/^[A-Z]{5}$/.test(norm)) continue;
      dicionario.add(norm);
      baixadas.add(norm);
      if (!comAcento.has(norm)) comAcento.set(norm, p.toUpperCase());
    }
  }

  try {
    usarLista(JSON.parse(fs.readFileSync(arquivo, 'utf8')));
  } catch {
    /* ainda não baixou */
  }

  async function baixarDicionario() {
    if (baixadas.size > 1000) return;
    if (baixando) return baixando;
    baixando = (async () => {
      try {
        const r = await fetch(URL_DICIONARIO, { signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error('resposta ' + r.status);
        const bytes = Buffer.from(await r.arrayBuffer());
        let texto = new TextDecoder('utf-8').decode(bytes);
        if ((texto.match(/�/g) || []).length > 50) texto = new TextDecoder('latin1').decode(bytes);
        const cinco = texto
          .split(/\r?\n/)
          .map((p) => p.trim())
          .filter((p) => p && !/[A-Z]/.test(p[0]) && /^[a-zà-ü]{5}$/i.test(p) && /^[A-Z]{5}$/.test(normalizar(p)));
        usarLista(cinco);
        fs.writeFile(arquivo, JSON.stringify(cinco), () => {});
        log(`  [palavras] Dicionário pronto: ${dicionario.size} palavras de 5 letras.`);
      } catch (e) {
        log('  [palavras] Não consegui baixar o dicionário (' + e.message + '). O Cinco Letras vai aceitar qualquer palavra.');
      } finally {
        baixando = null;
      }
    })();
    return baixando;
  }

  // Se o dicionário baixou, só sorteia respostas que existem nele (evita erro de digitação na lista)
  function respostasValidas() {
    if (baixadas.size < 1000) return respostas;
    const filtradas = respostas.filter((r) => baixadas.has(r.norm));
    return filtradas.length > respostas.length * 0.7 ? filtradas : respostas;
  }

  return {
    respostas: respostasValidas,
    secretas: () => lista(SECRETAS).map((p) => p.toUpperCase()),
    // true = é palavra; se o dicionário não baixou, aceita qualquer coisa
    valida: (norm) => baixadas.size < 1000 || dicionario.has(norm),
    exibir: (norm) => comAcento.get(norm) || norm,
    baixarDicionario,
  };
}

module.exports = { criarPalavras, RESPOSTAS, SECRETAS };
