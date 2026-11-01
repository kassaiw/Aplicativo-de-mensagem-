'use strict';
/*
 * =================================================================
 *  MASMORRA — SPRITES PROVISÓRIOS (pixel art feita em código)
 * =================================================================
 *  Cada sprite é uma lista de linhas. Cada LETRA é um pixel, e a cor
 *  dela vem da PALETA logo abaixo. Ponto (.) = transparente.
 *  Todos olham pra DIREITA (o jogo vira os inimigos pra esquerda).
 *
 *  Quer trocar por um desenho seu? NÃO precisa mexer aqui:
 *  salve um PNG com o mesmo nome em  public/rpg/sprites/
 *  (ex.: public/rpg/sprites/guardiao.png) e o jogo usa o seu.
 * =================================================================
 */
const RPG_PALETA = {
  k: '#1b1626', // contorno
  w: '#f4efe4', // branco
  s: '#f0c29a', // pele
  S: '#c98a66', // pele (sombra)
  a: '#c7cfdc', // armadura
  A: '#7d879c', // armadura (sombra)
  b: '#3d6fd1', // azul
  B: '#23408a', // azul escuro
  r: '#d0453f', // vermelho
  R: '#7c2230', // vinho
  g: '#3f9a5a', // verde
  G: '#24603a', // verde escuro
  p: '#9b62e0', // roxo
  P: '#4f2a85', // roxo escuro
  y: '#f2c94c', // dourado
  Y: '#b8892a', // dourado escuro
  n: '#9a6236', // marrom
  N: '#5c3a22', // marrom escuro
  o: '#e9dfc4', // osso
  O: '#a99c7c', // osso (sombra)
  e: '#ff4b4b', // olho vermelho brilhando
  v: '#c78bff', // olho roxo brilhando
  f: '#ff8a2a', // fogo
  z: '#9a9ca6', // pedra
  Z: '#5f616b', // pedra escura
  m: '#e3eaf2', // lâmina de metal
};

const RPG_SPRITES = {
  guardiao: [
    '......rr........',
    '.....krrk.......',
    '....kaaaak......',
    '...kaaaaaak.....',
    '...kaaAkkkk.....',
    '...kaaaaaak.....',
    '...kAaaaaAk.....',
    '....kkAAkk......',
    '..kAAbbbbkkkkk..',
    '.kaAkbbybkyyyyk.',
    '.kAAkbyyykyrryk.',
    '..kk.kbbbkyrryk.',
    '....kBBBBkyyyyk.',
    '....kAAkAAkkkk..',
    '....kAAkAAk.....',
    '...kkkkkkkkk....',
  ],
  lamina: [
    '................',
    '.....kkkkk......',
    '....kGgggGk.....',
    '...kGggggggk....',
    '...kgggssssk....',
    '...kggsskskk....',
    '...kGgssssk.....',
    '....kRRRRRk.....',
    '...kNRRNNNk.m...',
    '..kssNNNNNNkmk..',
    '...kkNNyNNNksk..',
    '....kNNNNNk.k...',
    '....kGGkGGk.....',
    '....kGGkGGk.....',
    '...kkNkkkNkk....',
    '...kkkk.kkkk....',
  ],
  arcano: [
    '.......kk.......',
    '......kppk......',
    '.....kpppk..kkk.',
    '....kppyppkkfffk',
    '..kkkkkkkkkkfyfk',
    '...kssssssk.kkk.',
    '...kskssksk..n..',
    '...kssssssk..n..',
    '....kwwwwk...n..',
    '...kpwwwwpk..n..',
    '..kppkwwkppkksk.',
    '..kspppppppk.n..',
    '...kppppppk..n..',
    '...kpPppPpk..n..',
    '..kpppppppPk.n..',
    '..kkkkkkkkkk.N..',
  ],
  bardo: [
    '.........w......',
    '.....kkkkwk.....',
    '....krrrrrwk....',
    '...krrrrrrrrk...',
    '...knnsssssk....',
    '...knssssksk....',
    '...knssssssk....',
    '....kkssssk.....',
    '...krrkkkkrk....',
    '..ksrrryyrrknnk.',
    '..kkrrrryrknNNnk',
    '....krrrrrknNNnk',
    '....kbbkbbkknnk.',
    '....kbbkbbk.....',
    '...kkNkkNkk.....',
    '...kkkk.kkkk....',
  ],
  esqueleto: [
    '................',
    '.....kkkkk......',
    '....kooooOk.....',
    '...kooooooOk....',
    '...kokkokkOk....',
    '...koekoekOk....',
    '...kooooooOk....',
    '....kokokok.....',
    '.....kkkkk..m...',
    '...kOokooOk.m...',
    '..koOkokoOkkmk..',
    '..kk.kokok.kyk..',
    '.....kOOOk..k...',
    '.....kOkOk......',
    '.....kOkOk......',
    '....kkk.kkk.....',
  ],
  arqueiro: [
    '................',
    '.....kkkkk...k..',
    '....kNNNNNk..kk.',
    '...kNNooooNk.knk',
    '...kNokkokNk.k.n',
    '...kNoekoeNk.k.n',
    '...kNNooooNk.k.n',
    '....kNkokokkkokn',
    '...kNNNNNNkook.n',
    '..koNNNNNNNk.k.n',
    '..kk.kNNNNk..k.n',
    '.....kOOOk...knk',
    '.....kOkOk...kk.',
    '.....kOkOk...k..',
    '....kkk.kkk.....',
    '................',
  ],
  morcego: [
    '................',
    '................',
    'k..............k',
    'kk....k..k....kk',
    'kPk...kkkk...kPk',
    'kPPk.kPPPPk.kPPk',
    'kPPPkPePPePkPPPk',
    'kPPPPPPPPPPPPPPk',
    '.kPPPkPwwPkPPPk.',
    '.kPk.kPPPPk.kPk.',
    '..k...kPPk...k..',
    '.......kk.......',
    '................',
    '................',
    '................',
    '................',
  ],
  cultista: [
    '......kkkk......',
    '.....kPPPPk.....',
    '....kPpPPPPk....',
    '...kPpkkkkPPk...',
    '...kPkvkkvkPk...',
    '...kPkkkkkkPk...',
    '...kPPkkkkPPk...',
    '....kPPPPPPk....',
    '...kPPPyyPPPk...',
    '..kPpPPyyPPPPk..',
    '..kPsPPyyPPsPk..',
    '..kPpPPPPPPPPk..',
    '..kPpPPPPPPPPk..',
    '...kPpPPPPPPk...',
    '..kPpPPPPPPPPk..',
    '..kkkkkkkkkkkk..',
  ],
  gargula: [
    '..k..........k..',
    '..kk..kkkk..kk..',
    '...kkkzzzzkkk...',
    '....kzzzzzzk....',
    '....kzekkezk....',
    '....kzzzzzzk....',
    '.kk.kZzwwzZk.kk.',
    'kzZkkkzzzzkkkZzk',
    'kzzZzkzzzzkzZzzk',
    '.kzzzkzZZzkzzzk.',
    '..kkkzzzzzzkkk..',
    '....kzzZZzzk....',
    '....kzzkkzzk....',
    '...kzzk..kzzk...',
    '...kZZk..kZZk...',
    '...kkkk..kkkk...',
  ],
  abade: [
    '..........kkkk..........',
    '.........kRRRRk.........',
    '........kRRRRRRk........',
    '.......kRRkkkkRRk.......',
    '.......kRkoooookRk......',
    '.......kRkoeooekRk......',
    '.......kRkoooookRk......',
    '.......kRkkoOokkRk......',
    '......kRRRkkkkkRRRk.....',
    '.....kRRRRRyyyRRRRRk....',
    '....kRRRRRRRyRRRRRRRk...',
    '...kRRRRRRRRyRRRRRRRRk..',
    '...kRRoRRRRRyRRRkkkkkk..',
    '...kRooRRRRRRRRkyyyyyyk.',
    '...kRRRRRRRRRRkyyYyyyyk.',
    '...kRRRRRRRRRRkyyYkyyyk.',
    '...kRRRRRRRRRkyyyykYyyyk',
    '...kRRRRRRRRRkyyyyyYyyyk',
    '...kRRRRRRRRRkyyyyyyYyyk',
    '...kRRRRRRRRRkkkkkkkkkkk',
    '..kRRRRRRRRRRRk..kyyk...',
    '..kRRRRRRRRRRRk...kk....',
    '.kRRRRRRRRRRRRRk........',
    '.kkkkkkkkkkkkkkk........',
  ],
};
