'use strict';
/*
 * Grupos do jogo Conexões. Cada partida sorteia 1 grupo de cada nível.
 *   nível 1 (amarelo) = fácil, categoria direta
 *   nível 2 (verde)   = médio
 *   nível 3 (azul)    = expressões e duplo sentido
 *   nível 4 (roxo)    = pegadinha com as letras/palavras
 * Quando um grupo tem mais de 4 palavras, o jogo escolhe 4 delas.
 * Quer inventar mais? É só seguir o mesmo formato!
 */
module.exports = [
  // ---------------- Nível 1 ----------------
  { nivel: 1, nome: 'Frutas', palavras: ['MAÇÃ', 'BANANA', 'UVA', 'PERA', 'KIWI', 'MAMÃO'] },
  { nivel: 1, nome: 'Cores', palavras: ['AZUL', 'VERDE', 'ROXO', 'AMARELO', 'VERMELHO', 'CINZA'] },
  { nivel: 1, nome: 'Animais da fazenda', palavras: ['VACA', 'PORCO', 'GALINHA', 'CAVALO', 'OVELHA', 'CABRA'] },
  { nivel: 1, nome: 'Partes do corpo', palavras: ['BRAÇO', 'PERNA', 'NARIZ', 'ORELHA', 'JOELHO', 'OMBRO'] },
  { nivel: 1, nome: 'Meios de transporte', palavras: ['ÔNIBUS', 'TREM', 'METRÔ', 'AVIÃO', 'BARCO', 'MOTO'] },
  { nivel: 1, nome: 'Esportes com bola', palavras: ['FUTEBOL', 'VÔLEI', 'BASQUETE', 'TÊNIS', 'HANDEBOL', 'GOLFE'] },
  { nivel: 1, nome: 'Instrumentos musicais', palavras: ['VIOLÃO', 'PIANO', 'BATERIA', 'FLAUTA', 'SAXOFONE', 'VIOLINO'] },
  { nivel: 1, nome: 'Planetas', palavras: ['MARTE', 'VÊNUS', 'SATURNO', 'JÚPITER', 'NETUNO', 'MERCÚRIO'] },
  { nivel: 1, nome: 'Material escolar', palavras: ['LÁPIS', 'CADERNO', 'BORRACHA', 'RÉGUA', 'MOCHILA', 'ESTOJO'] },
  { nivel: 1, nome: 'Móveis', palavras: ['SOFÁ', 'MESA', 'CADEIRA', 'ARMÁRIO', 'ESTANTE', 'CAMA'] },
  { nivel: 1, nome: 'Comidas de festa junina', palavras: ['PAMONHA', 'CANJICA', 'PAÇOCA', 'QUENTÃO', 'CURAU', 'MILHO'] },
  { nivel: 1, nome: 'Bebidas', palavras: ['SUCO', 'CAFÉ', 'CHÁ', 'REFRIGERANTE', 'LEITE', 'ÁGUA'] },
  { nivel: 1, nome: 'Profissões', palavras: ['MÉDICO', 'PEDREIRO', 'ADVOGADO', 'PROFESSOR', 'BOMBEIRO', 'CARTEIRO'] },
  { nivel: 1, nome: 'Estações do ano', palavras: ['VERÃO', 'OUTONO', 'INVERNO', 'PRIMAVERA'] },

  // ---------------- Nível 2 ----------------
  { nivel: 2, nome: 'Coisas com teclas', palavras: ['TECLADO', 'CALCULADORA', 'NOTEBOOK', 'ACORDEÃO', 'CONTROLE', 'TELEFONE'] },
  { nivel: 2, nome: 'Coisas que voam com asas', palavras: ['BORBOLETA', 'ANJO', 'MORCEGO', 'DRAGÃO', 'PATO', 'ABELHA'] },
  { nivel: 2, nome: 'Coisas de praia', palavras: ['AREIA', 'CONCHA', 'GUARDA-SOL', 'ONDA', 'CANGA', 'PROTETOR'] },
  { nivel: 2, nome: 'Coisas no céu', palavras: ['NUVEM', 'ESTRELA', 'LUA', 'ARCO-ÍRIS', 'COMETA', 'RAIO'] },
  { nivel: 2, nome: 'Jogos de tabuleiro', palavras: ['XADREZ', 'DAMAS', 'LUDO', 'GAMÃO', 'TRILHA', 'DOMINÓ'] },
  { nivel: 2, nome: 'Coisas redondas', palavras: ['BOLA', 'PNEU', 'MOEDA', 'PIZZA', 'RELÓGIO', 'DISCO'] },
  { nivel: 2, nome: 'Bichos do mar', palavras: ['TUBARÃO', 'POLVO', 'BALEIA', 'GOLFINHO', 'ÁGUA-VIVA', 'LULA'] },
  { nivel: 2, nome: 'Coisas da cozinha', palavras: ['PANELA', 'FOGÃO', 'GELADEIRA', 'ESPÁTULA', 'FRIGIDEIRA', 'ESCORREDOR'] },
  { nivel: 2, nome: 'Gírias pra dinheiro', palavras: ['GRANA', 'BUFUNFA', 'TUTU', 'CASCALHO', 'DINDIN', 'PILA'] },
  { nivel: 2, nome: 'Ferramentas', palavras: ['MARTELO', 'ALICATE', 'SERROTE', 'TRENA', 'LIXA', 'FURADEIRA'] },
  { nivel: 2, nome: 'Gêneros de filme', palavras: ['TERROR', 'COMÉDIA', 'DRAMA', 'ROMANCE', 'SUSPENSE', 'FAROESTE'] },
  { nivel: 2, nome: 'Doces de festa', palavras: ['BRIGADEIRO', 'BEIJINHO', 'COCADA', 'QUINDIM', 'CAJUZINHO', 'BEM-CASADO'] },
  { nivel: 2, nome: 'Coisas de videogame', palavras: ['FASE', 'CHEFÃO', 'SAVE', 'JOYSTICK', 'CHECKPOINT', 'MAPA'] },
  { nivel: 2, nome: 'Folclore brasileiro', palavras: ['SACI', 'CURUPIRA', 'IARA', 'BOITATÁ', 'CUCA', 'BOTO'] },

  // ---------------- Nível 3 ----------------
  { nivel: 3, nome: 'BATER ___', palavras: ['PORTA', 'PAPO', 'PONTO', 'CARTEIRA', 'PALMA', 'BOLO'] },
  { nivel: 3, nome: 'QUEBRAR ___', palavras: ['GALHO', 'GELO', 'PROMESSA', 'CABEÇA', 'SILÊNCIO', 'RECORDE'] },
  { nivel: 3, nome: 'PÃO DE ___', palavras: ['QUEIJO', 'AÇÚCAR', 'LÓ', 'FORMA', 'MEL', 'BATATA'] },
  { nivel: 3, nome: 'CABEÇA DE ___', palavras: ['VENTO', 'BAGRE', 'ALHO', 'PREGO', 'CHAVE', 'PONTE'] },
  { nivel: 3, nome: 'PÉ DE ___', palavras: ['MOLEQUE', 'MEIA', 'PATO', 'CHINELO', 'CABRA', 'VALSA'] },
  { nivel: 3, nome: 'OLHO DE ___', palavras: ['SOGRA', 'GATO', 'ÁGUIA', 'LINCE', 'PEIXE', 'TIGRE'] },
  { nivel: 3, nome: 'Coisas que têm dentes', palavras: ['PENTE', 'ZÍPER', 'ENGRENAGEM', 'GARFO', 'SERRA', 'CHAVE'] },
  { nivel: 3, nome: 'Mascotes de times', palavras: ['GALO', 'URUBU', 'RAPOSA', 'LEÃO', 'PEIXE', 'PORCO'] },
  { nivel: 3, nome: 'TIRAR ___', palavras: ['FOTO', 'NOTA', 'SONECA', 'FÉRIAS', 'DÚVIDA', 'ONDA'] },
  { nivel: 3, nome: 'PEGAR ___', palavras: ['FOGO', 'GRIPE', 'SOL', 'PESADO', 'CARONA', 'NO PÉ'] },
  { nivel: 3, nome: 'Signos', palavras: ['ÁRIES', 'TOURO', 'GÊMEOS', 'CÂNCER', 'LIBRA', 'ESCORPIÃO'] },
  { nivel: 3, nome: 'DAR ___', palavras: ['BOLO', 'MOLE', 'UM JEITO', 'TCHAU', 'BRONCA', 'RISADA'] },

  // ---------------- Nível 4 ----------------
  { nivel: 4, nome: 'Começam com nota musical', palavras: ['DOMINGO', 'REMO', 'MIOJO', 'FAROFA', 'SOLDADO', 'LAREIRA', 'SINO'] },
  { nivel: 4, nome: 'Palíndromos (iguais de trás pra frente)', palavras: ['OVO', 'RADAR', 'ARARA', 'OSSO', 'REVIVER', 'SOMOS'] },
  { nivel: 4, nome: 'Começam com um número', palavras: ['CEMITÉRIO', 'MILHO', 'DEZEMBRO', 'SETEMBRO', 'UMBIGO'] },
  { nivel: 4, nome: 'Capitais que também são palavras comuns', palavras: ['NATAL', 'PALMAS', 'VITÓRIA', 'SALVADOR', 'RECIFE'] },
  { nivel: 4, nome: 'Gírias pra "legal"', palavras: ['MASSA', 'IRADO', 'DAORA', 'MANEIRO', 'SINISTRO', 'BRABO'] },
  { nivel: 4, nome: 'Escondem um animal', palavras: ['SAPATO', 'PRATO', 'GALOCHA', 'BOIA', 'FOCAR'] },
  { nivel: 4, nome: 'Viram outra palavra de trás pra frente', palavras: ['AMOR', 'SACO', 'ATOR', 'ALAS', 'OVA'] },
];
