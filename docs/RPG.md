# Masmorra da Pura Resenha — documento de design do RPG

> Nome decidido: **Masmorra da Pura Resenha**. Este arquivo guarda **o que já decidimos** e **o que falta decidir**.
> ✅ = já está no jogo · 📝 = decidido, falta fazer · ❓ = falta decidir

## A ideia em uma frase

Um **roguelike de turno** 2D em pixel art, jogado **em grupo dentro da Resenha**: cada amigo controla um herói, e o time desce **3 andares** de uma dungeon escolhendo o caminho num mapa, até o chefe final. Morreu? Começa do zero, mas com coisas novas desbloqueadas.

## Referências (e o que pegamos de cada uma)

Pegamos **ideias de mecânica**. Arte, personagens, nomes e história são **nossos**.

| Referência | O que inspira |
|---|---|
| **Darkest Dungeon** | Posições na fila (1 = frente), **estresse**, porta da morte, clima sombrio. |
| **Final Fantasy Resonance** | **Linha do tempo** dos turnos, **quebra** de escudo pela fraqueza, ação bônus, Sintonia. |
| **Elden Ring** | **Acúmulo de status**: cada golpe enche uma barra de sangramento, gelo, veneno ou sono no inimigo; encheu, **estoura**. A katana do Samurai é toda sobre sangramento. |
| **Slay the Spire / Hades** | **Mapa de caminhos**, relíquias, escolher 1 de 3 melhorias, mercador, eventos, desbloqueios entre runs. |
| **Persona** | (Futuro, talvez) andar junto num mapa 2D. |
| **Pixel Lineage** (Roblox) | Pixel art simples e progressão. |

## Decisões já tomadas

| Pergunta | Decisão |
|---|---|
| Como os amigos jogam juntos? | ✅ **Cada um controla 1 herói.** Time de 4; as vagas que sobram viram **ajudantes** que qualquer um comanda. |
| Base do combate? | ✅ Linha do tempo + quebra (FF) com posições + estresse (Darkest Dungeon). |
| Morte permanente? | ✅ **Só no modo difícil.** No normal o herói só desmaia. |
| Quem faz a arte? | 📝 **Sprites do Otávio** (11 classes animadas + inimigos). Os provisórios em código continuam valendo pro que ainda não tiver desenho. |
| Classes | 📝 **11 classes**, cada uma **uma vez só** no time. |
| Habilidades | 📝 Cada classe tem **7**; você **escolhe 4** antes de entrar (e pode trocar na fogueira). Mover e Defender todo mundo tem. |
| O que limita a habilidade forte? | 📝 **Mana (MP)** no Mago, Necromante, Clérigo, Bardo e Paladino. **Recarga em turnos** no resto. O Alquimista usa uma **bolsa de frascos**. |
| Golpe especial | 📝 Cada classe tem o **seu especial** (barra que enche). **Substitui** o Ataque da Resenha. |
| Sintonia (quebrou todos) | 📝 Todo mundo ganha **ação bônus** e **+50 na barra do especial**. |
| Estrutura | 📝 **Roguelike**: run de **3 andares** com chefe em cada; **mapa de caminhos** com voto do grupo. |
| Entre runs | 📝 **Desbloqueios** (habilidades, relíquias, cores). O herói sempre começa do zero. |
| Recompensas na run | 📝 **Relíquias**, **1 de 3 melhorias** depois de cada luta, **ouro + mercador**, **eventos aleatórios**. |
| Bots | ✅ No lobby o grupo escolhe: **completar com bots** (jogam sozinhos, ninguém comanda) ou ir **só com quem entrou**. Grupo menor = menos inimigos por sala, inimigos e chefe mais fracos, heróis um pouco mais fortes e uma cura depois de cada vitória (tabela `AJUSTE` em `jogos/rpg/index.js`). Com o computador jogando sozinho, vence: solo 70–98%, dupla 35–94%, trio 71–96%, dependendo das classes. |
| Ouro | 📝 **Dividido na equipe**: cada luta dá ouro e ele é repartido igual entre os heróis; cada um gasta o seu no mercador. |
| Visual dos inimigos | ✅ Tudo bem serem 16×16 (mais "quadradões") do lado dos heróis detalhados. |
| Mapa | 📝 **Tabuleiro estilo Inscryption**: o mapa é um tabuleiro de mesa visto de cima, com as salas como casas ligadas por trilhas. O time é um **peão** que anda casa por casa; nas bifurcações o grupo vota. Cada andar é uma região do tabuleiro com o chefe na última casa. |

## Os recursos (o que gasta cada habilidade)

- **Recarga:** depois de usar, a habilidade fica apagada por X vezes suas. Ex.: "recarga 2" = volta na sua terceira vez.
- **Mana (MP):** cada magia custa MP. Você recupera **+2 MP por vez sua**, e a fogueira enche tudo. Toda classe de mana tem **uma habilidade de 0 MP**, pra nunca ficar sem fazer nada.
- **Frascos (Alquimista):** começa a run com **6**. A fogueira devolve 3, o mercador vende, e a habilidade *Destilar* cria 1.
- **Barra do especial (0 a 100):** enche **+8** a cada golpe que você dá, **+6** a cada golpe que leva, **+15** quando quebra um inimigo e **+50** na Sintonia. Cheia: aparece o botão do especial.

## Acúmulo de status (estilo Elden Ring)

Alguns golpes enchem uma barrinha embaixo do inimigo. Quando chega em **100, estoura**:

| Acúmulo | Quando estoura |
|---|---|
| 🩸 **Hemorragia** | Perde **15% da vida máxima** de uma vez (chefe: 8%). A barra zera e dá pra estourar de novo. |
| ❄️ **Congelamento** | Leva um dano de gelo e fica **Congelado** por 2 vezes: +20% de dano recebido e mais lento. |
| 🟢 **Veneno** | Fica **Envenenado**: perde 5% da vida máxima no começo de cada vez, por 3 vezes. |
| 💤 **Sono** | **Dorme**: perde as vezes até levar um golpe (o golpe que acorda dá +30% de dano). |

Chefes e alguns inimigos resistem: a barra deles enche mais devagar. Os inimigos também podem encher essas barras nos heróis (o Yeti congela, o Vampiro faz sangrar).

## As 11 classes (📝 proposta: revise!)

Em cada uma: **posição** onde ela rende, **recurso**, as **7 habilidades** (você leva 4) e o **especial**.

### 🛡️ Guardião — tanque, protege o time · frente · recarga
1. **Golpe de Escudo** — impacto, quebra bem o escudo, pode atordoar.
2. **Martelada** — impacto pesado e lento no da frente. *Recarga 2.*
3. **Provocar** — os inimigos miram nele; ganha defesa por 2 vezes. *Recarga 3.*
4. **Muralha** — protege um aliado: os golpes nele vêm pra você. *Recarga 2.*
5. **Investida** — anda uma casa pra frente e bate. *Recarga 1.*
6. **Bastião** — o time inteiro leva 25% menos dano até a próxima vez dele. *Recarga 4.*
7. **Represália** — até a próxima vez, revida em quem bater nele. *Recarga 3.*
- ⭐ **Especial: Fortaleza Inabalável** — por 2 vezes, todo dano no time vai pra ele, pela metade.

### ✝️ Paladino — tanque que cura · frente · mana (18 MP) nas magias; espada sem custo
1. **Lâmina Sagrada** — corte de luz. *0 MP.*
2. **Investida Radiante** — corte de luz nas posições 1 e 2. *Recarga 2.*
3. **Julgamento** — luz forte; dano extra em mortos-vivos e demônios. *4 MP.*
4. **Imposição de Mãos** — cura forte num aliado. *5 MP.*
5. **Escudo da Fé** — um escudo que absorve dano num aliado. *4 MP.*
6. **Purificar** — tira veneno, sangramento e acúmulos de um aliado, e −10 de estresse. *3 MP.*
7. **Aura de Coragem** — −10 de estresse no time e ninguém fica Abalado por 2 vezes. *6 MP.*
- ⭐ **Especial: Juramento da Aurora** — cura 30% de todo o time e os golpes de todos viram luz por 2 vezes.

### ⚔️ Samurai — sangramento com a katana · frente · recarga
1. **Corte da Katana** — corte, **+30 de hemorragia**.
2. **Corte Duplo** — acerta as posições 1 e 2, **+20 de hemorragia** em cada. *Recarga 2.*
3. **Saque Relâmpago** — ação rápida, crítico alto, **+25 de hemorragia**. *Recarga 2.*
4. **Fio Carmesim** — gasta 10% da própria vida; por 3 vezes **todos os golpes dele dão +25 de hemorragia a mais**. *Recarga 4.*
5. **Postura do Vento** — fica em guarda; revida quem bater com um corte que sangra. *Recarga 3.*
6. **Concentração** — o próximo golpe causa o dobro e não erra. Ação rápida. *Recarga 3.*
7. **Golpe de Misericórdia** — dano dobrado em quem acabou de estourar a hemorragia. *Recarga 3.*
- ⭐ **Especial: Mil Cortes** — 8 cortes rápidos em inimigos aleatórios, cada um com hemorragia. Estoura em quase todo mundo.

### 👊 Monge — combo que acumula · frente · recarga
**Fluxo:** cada golpe do Monge ganha **1 de Fluxo** (máximo 5). Cada Fluxo = **+8% de dano**. Perde tudo se usar Defender ou ficar atordoado.
1. **Palma Rápida** — impacto, ação rápida, +1 Fluxo.
2. **Chute Giratório** — posições 1 e 2, +1 Fluxo. *Recarga 2.*
3. **Punho Quebra-Escudo** — tira 3 de escudo, +1 Fluxo. *Recarga 2.*
4. **Rajada** — 3 golpes fracos no mesmo alvo, +1 Fluxo cada. *Recarga 3.*
5. **Meditação** — cura 20% da vida e −15 de estresse, **sem perder o Fluxo**. *Recarga 3.*
6. **Passo Fantasma** — +40% de esquiva até a próxima vez; revida quem errar. *Recarga 3.*
7. **Golpe do Dragão** — **finalizador**: gasta todo o Fluxo, +35% de dano por Fluxo gasto. *Recarga 2.*
- ⭐ **Especial: Cem Punhos** — chuva de socos que conta como 5 de Fluxo e quebra muito escudo.

### 🗡️ Assassino — execução · meio · recarga
1. **Facada** — corte rápido, crítico alto.
2. **Lâmina Venenosa** — **+35 de veneno**.
3. **Facas Arremessadas** — acerta as posições 3 e 4.
4. **Marcar Presa** — o alvo leva +30% de dano por 3 vezes. Ação rápida. *Recarga 2.*
5. **Sumir nas Sombras** — ninguém mira nele até a próxima vez, e o próximo golpe é crítico garantido. *Recarga 3.*
6. **Bomba de Fumaça** — todos os inimigos erram mais por 2 vezes. *Recarga 4.*
7. **Execução** — se o alvo estiver com **25% de vida ou menos** (chefe: 10%), **mata na hora**. Senão, é um golpe normal. *Recarga 3.*
- ⭐ **Especial: Dança das Sombras** — golpeia todos os inimigos e executa quem ficar com 30% ou menos.

### 🏹 Arqueiro — flechas elementais · trás · recarga
1. **Flecha Certeira** — corte, alcança qualquer posição.
2. **Flecha de Fogo** — fogo, e o alvo queima por 2 vezes. *Recarga 1.*
3. **Flecha de Gelo** — gelo, **+35 de congelamento**. *Recarga 1.*
4. **Flecha de Raio** — raio que pula pra um segundo inimigo. *Recarga 2.*
5. **Chuva de Flechas** — acerta todos os inimigos, fraco. *Recarga 3.*
6. **Mirar** — o próximo tiro dá +80% de dano e é crítico. Ação rápida. *Recarga 3.*
7. **Flecha Rasteira** — acerta e empurra o inimigo uma posição pra trás. *Recarga 2.*
- ⭐ **Especial: Tempestade Elemental** — flechas de fogo, gelo e raio em todos; sempre acerta a fraqueza de cada um.

### 🔮 Mago — magia elemental · trás · mana (30 MP)
1. **Seta Arcana** — dano fraco. *0 MP.*
2. **Bola de Fogo** — fogo forte num inimigo. *4 MP.*
3. **Lança de Gelo** — gelo, **+35 de congelamento**. *4 MP.*
4. **Corrente de Raios** — raio em todos os inimigos. *6 MP.*
5. **Analisar** — descobre as fraquezas do alvo. Ação rápida. *1 MP.*
6. **Escudo Arcano** — escudo que absorve dano num aliado. *3 MP.*
7. **Meteoro** — fogo enorme em todos, muito lento. *9 MP.*
- ⭐ **Especial: Cataclismo** — explosão de fogo, gelo e raio em todos; tira muito escudo.

### 💀 Necromante — servo de osso · trás · mana (28 MP)
**Servo de Osso:** fica **do lado** do Necromante (não ocupa vaga nem pode ser alvo) e **ataca sozinho toda vez que o Necromante joga**. Dura 4 vezes do Necromante.
1. **Toque Sombrio** — sombra que rouba vida (cura metade do dano). *0 MP.*
2. **Erguer Servo** — chama o Servo de Osso. *6 MP.*
3. **Ordem ao Servo** — o servo dá um golpe forte agora. *2 MP.*
4. **Maldição** — o alvo leva +25% de dano e recebe metade da cura por 3 vezes. *3 MP.*
5. **Colheita de Almas** — sombra em todos; cada inimigo que morrer devolve 4 MP. *7 MP.*
6. **Pacto de Sangue** — gasta 15% da própria vida e ganha 8 MP. *Recarga 3.*
7. **Explodir Ossos** — sacrifica o servo num estouro em todos os inimigos. *3 MP.*
- ⭐ **Especial: Exército dos Mortos** — 3 servos por 3 vezes, atacando todos.

### ⚗️ Alquimista — poções · meio/trás · bolsa de frascos (6)
1. **Bomba Caseira** — fogo fraco. *Sem frasco.*
2. **Poção de Cura** — cura um aliado. *1 frasco.*
3. **Bomba de Fogo** — fogo nas posições 1 e 2. *1 frasco.*
4. **Névoa Venenosa** — **+30 de veneno** em todos os inimigos. *1 frasco.*
5. **Elixir de Fúria** — um aliado causa +30% de dano por 2 vezes. *1 frasco.*
6. **Ácido Corrosivo** — tira defesa e 2 de escudo do alvo. *1 frasco.*
7. **Destilar** — gasta a vez e cria 1 frasco. *Recarga 3.*
- ⭐ **Especial: Grande Experimento** — sorteia um efeito: cura todo o time, explosão enorme em todos, ou enche a bolsa.

### ☀️ Clérigo — o curandeiro · trás · mana (30 MP)
1. **Golpe de Maça** — impacto fraco. *0 MP.*
2. **Cura** — cura forte num aliado. *3 MP.*
3. **Prece Coletiva** — cura um pouco o time inteiro. *6 MP.*
4. **Ressurreição** — levanta quem caiu com 50% de vida (no difícil, tira da porta da morte). *6 MP.*
5. **Bênção** — o aliado ganha defesa e recupera vida a cada vez, por 3 vezes. *4 MP.*
6. **Luz Sagrada** — luz num inimigo; dano dobrado em mortos-vivos. *3 MP.*
7. **Purificação** — tira efeitos ruins e acúmulos do time todo. *3 MP.*
- ⭐ **Especial: Milagre** — cura 100% do time e −25 de estresse em todos.

### 🎵 Bardo — suporte · trás · mana (24 MP)
1. **Nota Cortante** — dano fraco. *0 MP.*
2. **Refrão de Coragem** — −15 de estresse no time. *3 MP.*
3. **Ritmo Acelerado** — um aliado fica mais rápido por 3 vezes. Ação rápida. *2 MP.*
4. **Canção de Ninar** — **+40 de sono** num inimigo. *4 MP.*
5. **Balada Heroica** — o time causa +20% de dano por 2 vezes. *5 MP.*
6. **Dissonância** — todos os inimigos erram mais e perdem 1 de escudo. *4 MP.*
7. **Inspirar** — um aliado ganha uma ação bônus agora. *5 MP, recarga 3.*
- ⭐ **Especial: Grande Final** — todo o time ganha ação bônus e −30 de estresse.

## Inimigos (📝 proposta)

| Inimigo | Sprite | Papel | Fraco / resiste |
|---|---|---|---|
| **Slime** | ✅ recebido | Fraco e chato: quando apanha de corte, **se divide** em dois menores. | Fraco: fogo, raio · Resiste: impacto |
| **Esqueleto Guerreiro** | ✅ recebido | Soldado da frente, escudo médio. | Fraco: impacto, luz · Resiste: corte |
| **Golem de Pedra** | ✅ recebido | Tanque com escudo enorme e lento; pancada que atordoa. | Fraco: raio, impacto · Resiste: corte, fogo |
| **Yeti de Gelo** | ✅ recebido | Bate forte e **congela** os heróis. | Fraco: fogo · Resiste: gelo |
| **Macaco Demônio** | ✅ recebido | Muito rápido, desvia muito e **rouba ouro**. | Fraco: gelo, luz |
| **Oni** | ✅ recebido | Golpes enormes; fica **furioso** com pouca vida. | Fraco: luz, raio · Resiste: fogo |
| **Senhor Vampiro** | ✅ recebido | **Chefe final**: rouba vida, faz sangrar, vira morcegos pra desviar. | Fraco: luz, fogo · Resiste: sombra |

Todos os 7 chegaram, em 16×16 com fundo transparente. A maioria tem 3 quadros de movimento + 1 piscando (quando apanha) + 1 se desfazendo (morte). O Slime tem 3 quadros e o Golem tem mais (uns 9).

## A run (roguelike) (📝)

- **3 andares.** Proposta de tema: 1. **Catacumbas** (Slime, Esqueleto; chefe: Golem) · 2. **Pico Congelado** (Yeti, Macaco Demônio; chefe: Yeti Ancião) · 3. **Castelo Carmesim** (Oni, Macaco; chefe final: Senhor Vampiro).
- **Mapa de caminhos (tabuleiro estilo Inscryption):** cada andar é um tabuleiro com umas 6 fileiras de casas ligadas por trilhas. O peão do time anda uma casa por vez; nas bifurcações o grupo **vota** pra onde ir (30 segundos; empate = sorteio). Dá pra ver as casas da frente antes de escolher.
- **Tipos de sala:** ⚔️ luta · 💀 elite (difícil, dá relíquia) · 🎁 baú · ❓ evento · 🛒 mercador · 🔥 fogueira · 👑 chefe.
- **Depois de cada luta:** cada um escolhe **1 de 3 melhorias** pro próprio herói (ex.: +vida máxima, +crítico, liberar uma das 3 habilidades que ficaram de fora, melhorar uma habilidade).
- **Ouro:** cai das lutas; gasta no **mercador** (relíquias, frascos, cura, tirar estresse).
- **Relíquias:** valem pro time todo. Exemplos: *Pena de Fênix* (a primeira pessoa que cair na run levanta com 30%), *Sino Rachado* (inimigos começam com −1 de escudo), *Presa Carmesim* (crítico cura 3 de vida).
- **Eventos:** altar que troca vida por relíquia, viajante misterioso, baú com armadilha, fonte que cura ou amaldiçoa...
- **Desbloqueios:** cada andar vencido dá **Fragmentos** que ficam salvos no servidor. No lobby você gasta pra liberar habilidades (cada classe começa com 5 das 7), relíquias novas no sorteio e cores dos heróis.

## Combate: as regras que já estão no jogo (✅)

### Linha do tempo
Joga quem tiver o menor "momento da próxima vez". Depois de agir: `prox = agora + 100 × peso ÷ velocidade`. Ação rápida (peso 0.5) faz você voltar antes. A tela mostra as 10 próximas vezes.

### Dano
`dano = poder × status × 1.2 × (1 − defesa ÷ (defesa + 20)) × sorte(0.9 a 1.1)`
Fraqueza ×1.5 · resistência ×0.5 · crítico ×1.5 · quebrado ×1.5 · marcado ×1.3 · defendendo ×0.5. Magia ignora metade da defesa.

### Escudo e quebra
Cada golpe tira 1 de escudo (ou mais, conforme a habilidade); na fraqueza, o dobro; golpe resistido não tira nada. Zerou: **QUEBROU** (perde a vez, +50% de dano, e quem quebrou ganha ação bônus). Quebrou todos: **Sintonia**.

### Posições
Fila de 1 a 4 (1 = frente). Cada habilidade diz de onde pode ser usada e quem alcança. **Mover** troca com o vizinho.

### Estresse
Sobe ao apanhar (+3), levar crítico (+10), ver amigo cair (+12) ou morrer (+25). Desce ao dar crítico ou quebrar (−5), com o Bardo e na fogueira. No **100**: 25% **Inspirado**, 75% **Abalado**.

### Cair e morrer
Normal: vida 0 = caído (alguém cura e levanta). Difícil: porta da morte, cada golpe tem 40% de chance de matar de vez.

## Onde está cada coisa no código

| Arquivo | O que tem |
|---|---|
| `jogos/rpg/dados.js` | As tabelas: classes, habilidades, inimigos, salas. |
| `jogos/rpg/combate.js` | O motor de combate (regras), sem rede nem tela. |
| `jogos/rpg/index.js` | A expedição: lobby, salas, prazo, quem comanda quem. |
| `public/rpg.js` | A tela. |
| `public/rpg-sprites.js` | Sprites provisórios em letrinhas. |
| `public/rpg/sprites/` | Seus desenhos (PNG). |

## Ordem de construção

1. ✅ Protótipo do combate (4 classes, 1 dungeon).
2. 📝 **Cortador de sprites**: recorta as folhas, tira o fundo preto e alinha os quadros pelos pés.
3. 📝 **11 classes**: mana, recarga, frascos, barra do especial, acúmulos, Fluxo, Servo de Osso, escolher 4 de 7.
4. 📝 **Inimigos novos** com os sprites.
5. 📝 **Roguelike**: mapa de caminhos com voto, melhorias, ouro, mercador, relíquias, eventos, 3 andares.
6. 📝 **Desbloqueios salvos** entre runs.

## ❓ Perguntas que ainda faltam

- Os chefes dos andares 1 e 2 (Golem e Yeti Ancião) usam o mesmo desenho, só maior e com outra cor? Ou você vai desenhar chefes próprios?
