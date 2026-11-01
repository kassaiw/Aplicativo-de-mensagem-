# Resenha — seu "Discord" com os amigos

Um servidor só da galera, com:

- **#geral** — chat de texto com histórico, links, imagens (cola com Ctrl+V ou arrasta) e **GIFs** (botão GIF, com busca e favoritos)
- **Perfil** — foto (pode ser GIF animado), status, "sobre mim" e cor; clique em alguém pra ver o cartão de perfil
- **Spoiler** — imagens e GIFs escondidos até a pessoa clicar, e `||texto||` escondido no chat
- **Admin** — expulsar, banir, silenciar no chat, mutar ou tirar da call, apagar mensagens e limpar o chat
- **Cinema** — assistir YouTube, link de vídeo ou arquivo do PC todo mundo junto e sincronizado, sem compartilhar tela
- **Sala de voz** — chamada com microfone, **câmera** e **compartilhamento de tela com som** (estilo watch party)
- Indicador de quem está falando, volume separado pra cada amigo, tela cheia, destaque na tela de quem está transmitindo
- **Jogos** — Cinco Letras (estilo Termo), Conexões (estilo Conexo), Adivinhe o Campeão (estilo Loldle), Adivinhe o Jogo (estilo Gamedle), Palavras Secretas (espiões em times) e **Masmorra**, um RPG de turno em grupo (protótipo)
- **Seção de Animes** — adivinhe o personagem pelo retrato e o anime pela abertura, mais Construir Personagem, Anidle, Draft e Leilão, com ranking da galera
- Senha opcional, link automático pros amigos, funciona no celular (menos compartilhar tela)

Não precisa instalar nada além do **Node.js**. Seus amigos **não instalam nada**: só abrem o link no Chrome ou Edge.

---

## Passo a passo (primeira vez)

### 1. Instale o Node.js (só uma vez)
1. Entre em **https://nodejs.org**
2. Baixe a versão **LTS** (o botão verde) e instale — é só ir clicando em *Next*.

### 2. Coloque a pasta num lugar fácil
Descompacte o `resenha.zip` em algum lugar, por exemplo `Documentos\resenha`.

### 3. Instale o cloudflared (só uma vez)
Ele cria o link que seus amigos usam pra entrar de qualquer lugar.
- Dê dois cliques em **`instalar-cloudflared.bat`**
- Se o Windows perguntar se pode fazer alterações, clique **Sim**.

### 4. Ligue o servidor
- Dê dois cliques em **`iniciar.bat`**
- Vai abrir uma **janela preta** (é o servidor — **não feche** enquanto estiverem usando) e o navegador já abre sozinho no Resenha.
- Se o Windows perguntar sobre o Firewall, pode clicar em **Permitir**.

### 5. Chame a galera
Depois de uns segundos aparece na janela preta:

```
 LINK PROS SEUS AMIGOS (mande no WhatsApp):
 https://palavras-aleatorias-aqui.trycloudflare.com
```

Mande esse link. Ele também aparece dentro do app, no botão de **convidar** (bonequinho com +, ao lado do nome do servidor).

> ⚠️ O link **muda toda vez** que você fecha e abre o `iniciar.bat`. E o seu PC precisa ficar **ligado** com a janela preta aberta enquanto a galera usa.

---

## Como usar

| Quero... | Faça isso |
|---|---|
| Entrar na chamada | Clique em **Sala de voz** na esquerda |
| Mutar / desmutar | Botão do microfone, ou **Ctrl+Shift+M** |
| Parar de ouvir todo mundo | Botão do fone, ou **Ctrl+Shift+D** |
| Abrir a câmera | Botão da câmera (embaixo da chamada) |
| Compartilhar a tela | Botão do monitor |
| Ver uma tela grandona | Clique no vídeo (clique de novo pra voltar) |
| Tela cheia | Clique duplo no vídeo, ou o botão ⛶ no canto |
| Abaixar o volume de um amigo | Passe o mouse no quadradinho dele e mexa na barrinha |
| Mostrar/esconder o chat na chamada | Botão de balãozinho lá em cima |
| Mandar imagem | Botão **+**, ou **Ctrl+V** com a imagem copiada, ou arrastar pro chat |
| Mandar GIF | Botão **GIF** na caixa de mensagem → clique no GIF. A ★ guarda nos favoritos |
| Mandar imagem ou GIF como spoiler | Antes de enviar, clique em **Spoiler** (do lado da imagem anexada, ou no topo do painel de GIF) |
| Esconder um pedaço do texto | Escreva entre duas barras: `o final é \|\|ele morre\|\|` |
| Apagar uma mensagem sua | Passe o mouse na mensagem e clique na lixeira 🗑️ |
| Mudar foto, status, "sobre mim" | Configurações → **Perfil** → **Salvar perfil** |
| Ver o perfil de alguém | Clique na pessoa na lista da direita, ou na foto/nome dela no chat |
| Trocar microfone, câmera, qualidade da tela | Botão de **configurações** (os 3 risquinhos, lá embaixo) |

### 🎬 Assistir filme/vídeo junto (watch party)
1. Abra o filme/vídeo numa **aba do Chrome** (YouTube, etc.).
2. No Resenha, clique em **compartilhar tela** → escolha a aba **"Guia do Chrome"** → selecione a aba do filme.
3. **Marque "Compartilhar áudio da guia"** — senão a galera vê mas não ouve!
4. Em configurações, deixe **Otimizar para: Movimento**.

**Por que aba e não a tela inteira?** Se você compartilhar a tela inteira com o som do PC, o som da chamada (a voz dos seus amigos) vai junto e eles ouvem eco da própria voz. Compartilhando só a aba, vai só o som do filme. Se precisar mesmo compartilhar a tela toda (um jogo, por exemplo), use **fone de ouvido**.

### 🎮 Transmitir jogo (Minecraft, etc.)
O navegador **não consegue capturar jogo em tela cheia normal** (a transmissão congela e o mouse some). O Discord só consegue porque tem um programa próprio que "entra" no jogo. Então faça assim:

1. Deixe o jogo em **janela sem bordas** (nas opções de vídeo pode estar como *Janela sem bordas*, *Borderless* ou *Tela cheia (janela)*). Se o jogo não tiver essa opção, use **janela maximizada**.
2. No Resenha, compartilhe a **Tela inteira** (não "Janela").
3. Pra ir o som do jogo, marque **"Também compartilhar o áudio do sistema"** e **use fone de ouvido** (senão seus amigos ouvem a própria voz de volta).

**Minecraft Java:** não use o F11. Em *Opções → Configurações de vídeo*, deixe **Tela cheia: Desligado** e maximize a janela. Quer tela cheia de verdade sem travar? Instale o mod **Cubes Without Borders** (precisa do Fabric, Forge ou NeoForge), que adiciona o modo sem bordas.

**Mouse:** dentro do jogo, enquanto você anda e mira, o próprio Minecraft esconde o mouse (aparece só a mira). Isso é normal, acontece no Discord também. Nos menus e no inventário, ele aparece.

**Notebook com duas placas de vídeo** e a transmissão fica **preta**: Configurações do Windows → Sistema → Tela → Elementos gráficos → adicione o Chrome e escolha **Alto desempenho** (a mesma placa do jogo).

### 🎮 Jogos
Clique em **jogos** na barra da esquerda, escolha um e aperte **Começar**. Todo mundo no servidor vê o jogo e pode entrar. Dá pra jogar e ficar na chamada ao mesmo tempo, e o chat fica do lado (botão de balãozinho). Só roda **um jogo por vez**; pra trocar, clique em **Encerrar jogo**.

| Jogo | Como funciona |
|---|---|
| 🔤 **Cinco Letras** | Estilo Termo, mas cooperativo: todo mundo chuta no mesmo tabuleiro. Verde = letra no lugar certo, amarelo = existe em outro lugar. Modos com 1, 2 ou 4 palavras. Digite no teclado e aperte Enter. |
| 🔗 **Conexões** | Estilo Conexo: 16 palavras escondem 4 grupos de 4. Cada um seleciona 4 palavras e envia; acertou, o grupo aparece colorido (amarelo = fácil ... roxo = pegadinha). São 4 erros no máximo. Se 3 das 4 estiverem certas, aparece "falta uma!". |
| 🎴 **Adivinhe o Anime** | Estilo Anidle. Chute animes pela busca; cada chute mostra o que bate com o secreto (formato, ano, estúdio, gêneros...). ↑ = o secreto tem número maior, ↓ = menor. Com 5 chutes libera os temas; com 10, a capa borrada. |
| ⚔️ **Adivinhe o Campeão** | Estilo Loldle, com os campeões do LoL. Compara posição, classes, recurso, alcance, região, ano de lançamento e dificuldade. Com 5 chutes libera o título do campeão; com 9, a arte borrada. |
| 🕹️ **Adivinhe o Jogo** | Estilo Gamedle, com os jogos mais jogados da Steam. Uma imagem do jogo começa bem pixelada e fica mais nítida a cada chute, e aparece mais uma tag. Compara ano, gêneros, desenvolvedora, publicadora, modos, preço e nota. São 10 chutes. |
| 🕵️ **Palavras Secretas** | Dois times com um mestre cada (precisa de 4+ pessoas). O mestre vê as cores e dá UMA palavra de dica + um número. Os agentes clicam na carta pra apontar e no ✔ pra revelar. Achou o assassino (preto), perdeu! |
| 🧩 **Draft de Anime** | 6 rodadas: cada um tira um personagem com **status** e escolhe a posição dele (Capitão, Vice, Tanque, Suporte, Curandeiro, Coringa). Os botões já mostram quanto ele rende em cada posição (⭐ = melhor). Pode pular 2. |
| 💰 **Leilão de Personagens** | Cada um começa com moedas e compra o time no leilão vendo os status de cada personagem. O comprado entra sozinho na posição onde rende mais, e você pode trocar clicando em duas posições. No fim tem 45 segundos pra arrumar o time. |
| 🏰 **Masmorra (RPG)** | RPG de turno em grupo (protótipo). Cada um escolhe uma classe (Guardião, Lâmina, Arcano, Bardo) e controla 1 herói. No lobby vocês escolhem se **completam o grupo com bots** (eles jogam sozinhos) ou se vão só com quem entrou (aí os inimigos ficam mais fracos). São 5 salas com acampamento e chefe. Clique numa habilidade e depois no alvo destacado. Modo difícil = morte permanente. As regras completas estão em `docs/RPG.md`. |

### 🎌 Seção de Animes

Na barra da esquerda, clique em **animes**. De um lado ficam os jogos, do outro o **ranking da galera** (pontos, sequência de acertos, recorde e quem mais joga). Lá em cima você escolhe a **dificuldade** dos quizzes (Fácil, Médio ou Difícil).

| Jogo | Como funciona |
|---|---|
| 🖼️ **Quem é?** | Aparece o retrato do personagem. Escreva o nome dele. |
| 🎵 **Pela abertura** | Toca a música da abertura **abafada** (tipo ouvindo de outro cômodo). Cada erro deixa o som mais limpo, mas o acerto vale menos: 100, 70 ou 40 pontos. Se o som não sair, clique em **🔊 Clique pra ouvir**. |
| 🎴 **Anidle** | Chute animes e use as pistas pra achar o secreto. |
| ⚡ **Construir Personagem** | Cada um monta um boneco com 5 atributos (💪 Força, ⚡ Velocidade, 🛡️ Resistência, 🧠 Inteligência, 🎯 Habilidade). Cada **giro** tira um personagem com raridade, e você escolhe em qual atributo ele entra. **Os números só aparecem depois que você coloca**: a graça é pensar se ele é forte, rápido ou esperto. Depois vêm as **lutas 1 contra 1** (⚔️ Ataque, 🛡️ Defesa, 🌀 Especial). Quem vence ganha moedas e sobe de nível; na **loja** dá pra treinar ou trocar um atributo. Precisa de 2 pessoas ou mais. |
| 🧩 **Draft** e 💰 **Leilão** | Os mesmos de antes, agora aqui. |

Nos quizzes são 10 rodadas, e **todo mundo chuta ao mesmo tempo**. Cada um tem **3 chances** por rodada (os ❤️ lá em cima). Acertou = 100 pontos. A lista de nomes da busca **não tem foto**, senão dava pra comparar.

- As **aberturas** vêm do **AnimeThemes.moe**. Na **primeira vez** o servidor leva uns **3 minutos** baixando a lista, sozinho e em segundo plano. Cada música (uns 3 MB) é baixada pelo servidor uma vez e guardada em `dados/musicas` (ele guarda as 40 mais recentes), então da segunda vez é na hora.

**Dicas da Masmorra:**
- A fila lá em cima mostra **quem joga depois**. Habilidades "rápidas" te fazem voltar antes.
- Os `?` embaixo do escudo 🛡️ do inimigo são **fraquezas escondidas**. Acertou a fraqueza, ela aparece e o escudo cai o dobro. Escudo zerou = **QUEBROU** e você ganha uma ação bônus.
- Quebrou **todos** os inimigos de uma vez = **SINTONIA** e aparece o **Ataque da Resenha** 🌟.
- O número no cantinho de cada boneco é a **posição** dele (1 = frente). Cada habilidade só funciona de certas posições.
- Quer usar seus desenhos? Salve o PNG em `public/rpg/sprites/` com o nome certo (veja o `LEIA-ME.txt` de lá) e aperte F5.

**Como funcionam os status (Draft e Leilão):**
- Cada personagem tem 6 status: 💪 Força, ⚡ Velocidade, 🧠 Inteligência, 🛡️ Resistência, 🎯 Técnica e ✨ Carisma. O status em amarelo é a especialidade dele.
- O AniList não tem esses números, então o jogo gera: **quanto mais popular o personagem, mais forte**, e cada um tem um "perfil" próprio que é sempre o mesmo.
- Cada posição valoriza status diferentes. Por exemplo, o **Tanque** é metade Resistência, e o **Capitão** puxa mais Carisma. O jogo mostra a tabela completa em "Como cada posição pontua?".
- Personagens do **mesmo anime** no time dão **+5 de sinergia** cada.
- **Poder do time** = soma dos pontos de cada posição + sinergia.
- **Até 2 jogadores:** ganha quem tem mais poder. **3 ou mais:** tem votação do melhor time, e se der empate nos votos ganha quem tem mais poder.

- Os animes e personagens vêm do **AniList** (anilist.co), um site grátis. Na **primeira vez** que você liga o servidor ele baixa os dados (uns 40 segundos) e guarda na pasta `dados`. O PC do servidor precisa de internet.
- Os campeões do LoL vêm do **Data Dragon** (site oficial da Riot) e do **Meraki Analytics**, e baixam em poucos segundos.
- Os jogos da Steam vêm do **SteamSpy** e da **loja da Steam**. A Steam limita os pedidos, então na **primeira vez** o servidor leva uns **5 minutos** baixando, sozinho e em segundo plano. Dá pra jogar o Adivinhe o Jogo assim que tiver uns 40 jogos baixados.
- O Cinco Letras baixa um **dicionário** na primeira vez, pra saber quais palavras existem. Se não conseguir, ele aceita qualquer palavra de 5 letras.
- Os grupos do Conexões estão em `jogos/grupos-conexoes.js`. Dá pra inventar grupos novos seguindo o mesmo formato!
- Se cair a internet de alguém no meio do jogo, é só voltar: o lugar no jogo fica guardado.

### 🍿 Cinema (assistir junto)
Clique em **cinema** na barra da esquerda. O vídeo toca **no navegador de cada um**, e o Resenha só sincroniza o play, o pause e o tempo. Então não pesa na chamada e dá pra continuar conversando na sala de voz.

- **YouTube:** cole o link do vídeo e clique em **Assistir agora**. Alguns donos de vídeo não deixam tocar fora do YouTube; aí aparece um aviso.
- **Link direto de vídeo:** um link que termina em `.mp4` ou `.webm`.
- **📁 Arquivo do PC:** quem abre escolhe o arquivo, e cada amigo escolhe **o mesmo arquivo no próprio PC**. O vídeo não é enviado pela internet, só o tempo. MP4 é o formato mais garantido; MKV às vezes não toca no navegador.
- **💬 Legenda:** pra link ou arquivo, dá pra carregar uma legenda `.srt` ou `.vtt` (vale só pra você). No YouTube use o botão de legenda do próprio player.
- **+ Fila:** adiciona o próximo vídeo; quando um acaba, o próximo começa sozinho.
- **🔒 Só eu controlo:** quem abriu o vídeo (ou um admin) trava o play/pause pros outros.
- **Sair (só eu):** para o vídeo só pra você. O vídeo continua tocando se você for pro chat ou pros jogos.
- Se alguém ficar fora de sincronia, clique em **🔄 Sincronizar**.

**E a Crunchyroll?** Ela não tem API aberta, não deixa o player ser colocado dentro de outro site e usa proteção (DRM). Por isso também a tela fica **preta** pra quem assiste se você compartilhar a tela com ela aberta. O Rave só consegue porque tem contrato com os estúdios. O jeito que funciona é uma **extensão de navegador** que sincroniza o player da Crunchyroll de cada um (cada amigo com a própria conta). Isso pode virar um próximo passo do projeto.

### 👑 Admin
Quando o servidor liga, a janela preta mostra o **Código de admin** (tipo `AB3K-9XZQ`). Ele é criado sozinho e fica guardado em `dados/admin.json`. Se quiser escolher o seu, coloque em `"senhaAdmin"` no `config.json`.

1. Vá em **Configurações** → **Admin**, digite o código e clique em **Virar admin**. Aparece uma 👑 do lado do seu nome.
2. O navegador lembra: você continua admin mesmo fechando e abrindo de novo.
3. **Clique em alguém** na lista da direita pra ver as ações:

| Ação | O que faz |
|---|---|
| Silenciar no chat | A pessoa não consegue mandar mensagem por 5 min, 30 min, 1 hora ou 1 dia |
| Mutar na call | Desliga o microfone dela e ela não consegue religar até você desmutar |
| Tirar da call | Tira a pessoa da sala de voz |
| Expulsar | Desconecta a pessoa (ela pode entrar de novo) |
| Banir | Desconecta e não deixa mais entrar (pelo navegador e pelo IP). Pra desfazer: Configurações → Admin → **Ver banidos** |

- Admin também apaga **qualquer** mensagem, **limpa o chat** inteiro e encerra qualquer jogo.
- Um admin não consegue usar essas ações em outro admin.
- **Não passe o código pra ninguém** em quem você não confia. Quem tiver o código vira admin.

### 🎞️ Ligar os GIFs (uma vez só, 5 minutos)
O Discord usava o Tenor, mas o Google desligou a API do Tenor em junho de 2026. Aqui a gente usa o **GIPHY**, que é grátis. Você precisa de uma "chave" (uma senha que libera as buscas):

1. Entre em **https://developers.giphy.com** e crie uma conta (ou entre com a sua).
2. Clique em **Create an App** (ou *Create API Key*).
3. Escolha **API** (não SDK), dê um nome tipo `Resenha` e uma descrição qualquer.
4. Copie a chave que aparecer (um monte de letras e números).
5. Abra o `config.json` no Bloco de Notas e cole entre as aspas: `"giphyChave": "SUA_CHAVE_AQUI",`
6. Feche a janela preta e abra o `iniciar.bat` de novo. Na janela preta tem que aparecer **GIFs: ligados**.

- **Sem filtro:** com `"gifClassificacao": ""` (o padrão) a busca traz todas as classificações do GIPHY, sem censura. Se um dia quiser filtrar, coloque `"pg-13"` (ou `"g"`, `"pg"`, `"r"`).
- A chave grátis tem um limite de buscas por hora. O servidor guarda as buscas repetidas por 10 minutos pra economizar.
- Mesmo sem chave dá pra **colar o link de um GIF** (ou de qualquer imagem `.gif`, `.png`, `.jpg`, `.webp`) no chat, que ele aparece.

---

## Configurações (`config.json`)

Abra o `config.json` com o Bloco de Notas:

```json
{
  "nomeDoServidor": "Resenha",
  "senha": "",
  "senhaAdmin": "",
  "porta": 3000,
  "linkParaAmigos": true,
  "abrirNavegador": true,
  "giphyChave": "",
  "gifClassificacao": "",
  "turnCloudflare": { "idDaChave": "", "token": "" },
  "turn": { "url": "", "usuario": "", "senha": "" }
}
```

- **nomeDoServidor** — o nome que aparece no app. Ex.: `"Os Brabos"`
- **senhaAdmin** — o código de admin. Vazio = o servidor cria um sozinho e mostra na janela preta.
- **senha** — deixe `""` pra qualquer um com o link entrar. Coloque algo tipo `"pizza123"` pra pedir senha. **Recomendo usar senha**, porque quem tiver o link entra.
- **porta** — só mude se der erro de "porta em uso".
- **linkParaAmigos** — `false` se não quiser gerar o link público.
- **giphyChave** — a chave do GIPHY pros GIFs (veja acima).
- **gifClassificacao** — `""` = sem filtro nenhum.
- **turnCloudflare** / **turn** — a ponte pra quem não consegue conectar na chamada (veja "Deu ruim?" abaixo).

Depois de mudar, feche a janela preta e abra o `iniciar.bat` de novo.

---

## Deu ruim? (problemas comuns)

**O amigo fica em "Conectando…" ou "Sem conexão"**
A internet de algumas pessoas (principalmente 4G/5G e algumas operadoras) bloqueia a ligação direta entre PCs. A solução é ligar a **ponte TURN**, que passa a conexão por um servidor no meio. A da Cloudflare é **grátis até 1.000 GB por mês** (sobra muito pra um grupo de amigos).

1. Crie uma conta grátis em **https://dash.cloudflare.com** (é a mesma empresa do link pros amigos).
2. No menu do painel, procure **Realtime** (em alguns painéis aparece como **Calls**) → **TURN Server** → **Create** (ou *Create TURN key*). Dê o nome `Resenha`.
3. Ele mostra dois códigos: o **Token ID** (ID da chave) e o **API Token**. Copie os dois. ⚠️ O API Token só aparece uma vez!
4. Abra o `config.json` e cole:
```json
"turnCloudflare": {
  "idDaChave": "COLE_O_TOKEN_ID_AQUI",
  "token": "COLE_O_API_TOKEN_AQUI"
},
```
5. Feche a janela preta e abra o `iniciar.bat` de novo. Tem que aparecer **"Ponte TURN: ligada"**.
6. Peça pro seu amigo **recarregar a página** (F5) e entrar na chamada de novo.

Se mesmo assim aparecer "Sem conexão", clique no botão **Tentar de novo** que aparece no quadradinho da pessoa.

*Outra opção:* o Metered (https://www.metered.ca/tools/openrelay/, 20 GB grátis) também funciona. Ele dá um endereço `turn:`, um usuário e uma senha, que vão na parte `"turn"` do `config.json` (os endereços separados por vírgula).

**A galera vê minha tela mas não ouve o som** → Você não marcou "Compartilhar áudio". Pare e compartilhe de novo marcando a opção (funciona melhor com **aba** do Chrome/Edge).

**Está travando / pixelando** → Configurações → Qualidade → **720p**. Cada amigo recebe uma cópia direto do seu PC, então quanto mais gente assistindo, mais internet de *upload* você precisa.

**"Acesso bloqueado" no microfone ou câmera** → Clique no **cadeado** ao lado do endereço do site e permita microfone/câmera. Depois recarregue a página.

**"Outro programa está usando"** → Feche Discord, Zoom, OBS, etc. que estejam usando a câmera/microfone.

**Abrindo pelo IP (ex.: `http://192.168.0.10:3000`) a chamada não funciona** → Normal: o navegador só libera microfone/câmera em `localhost` ou em `https`. Use o link do cloudflared.

**O link não apareceu na janela preta** → Rode o `instalar-cloudflared.bat` e abra o `iniciar.bat` de novo. Se não tiver winget, siga as instruções que aparecem nele.

**No celular não tem o botão de compartilhar tela** → Os navegadores de celular não deixam. Chat, chamada e câmera funcionam.

**Limite de pessoas** → A chamada liga cada pessoa direto com cada outra. Funciona bem até umas **5 ou 6 pessoas** na sala de voz (no chat pode ter mais).

---

## Como funciona (pra você aprender)

```
   Amigo A  ───────────┐                ┌─────────── Amigo B
     │                 │   WebSocket    │                │
     │                 ▼  (chat e       ▼                │
     │           ┌──────────────────────────┐            │
     │           │  server.js  (seu PC)     │            │
     │           │  - quem está online      │            │
     │           │  - histórico do chat     │            │
     │           │  - "apresenta" os PCs    │            │
     │           └──────────────────────────┘            │
     │                                                   │
     └──────── áudio, câmera e tela (WebRTC) ────────────┘
               vão DIRETO de um PC pro outro
```

- **`server.js`** — o servidor, em Node.js puro (sem bibliotecas). Entrega o site, cuida do chat e faz a "sinalização": troca as informações de rede entre os navegadores pra eles se conectarem.
- **`public/index.html`** — a estrutura da página (os botões, as áreas).
- **`public/style.css`** — o visual. As cores estão no começo do arquivo (`--acento` é o amarelo-sol, `--f0` a `--f4` são os tons de azul-noite). Quer outra cor? Muda ali.
- **`public/fontes/`** — as fontes do app (Bricolage Grotesque nos títulos e Figtree no texto), guardadas aqui mesmo pra funcionar até sem internet. São livres (licença SIL OFL).
- **`public/app.js`** — tudo que acontece no navegador: chat, microfone, câmera, tela e as conexões WebRTC. Tem um mapa no topo do arquivo.
- **`jogos/`** — um arquivo pra cada jogo (as regras ficam aqui, no servidor, pra ninguém roubar). `index.js` controla qual jogo está rolando; `adivinhar.js` é o motor dos três jogos de adivinhar; `status.js` calcula os status e o poder dos times; `anilist.js`, `campeoes.js` e `steam.js` baixam os dados; `palavras.js` e `grupos-conexoes.js` têm as listas de palavras (dá pra colocar mais!).
- **`public/jogos.js`** — a parte dos jogos que aparece na tela.
- **`jogos/quiz-anime.js`** (o motor dos quizzes de anime), **`jogos/construir.js`**, **`jogos/aberturas.js`** (baixa as aberturas do AnimeThemes) e **`jogos/ranking.js`** (o ranking da seção); a tela fica em **`public/animes.js`** e **`public/construir.js`**.
- **`jogos/rpg/`** e **`public/rpg.js`** — a Masmorra (RPG): `dados.js` tem as classes, habilidades, inimigos e salas; `combate.js` é o motor de combate; `index.js` cuida da expedição. Os sprites provisórios ficam em `public/rpg-sprites.js` e os seus em `public/rpg/sprites/`. O plano do jogo está em **`docs/RPG.md`**.
- **`admin.js`** — código de admin e lista de banidos. **`cinema.js`** (servidor) e **`public/cinema.js`** (navegador) — o cinema sincronizado.
- **`config.exemplo.json`** — o modelo do config. Na primeira vez o servidor copia ele pra `config.json`. O `config.json` e a pasta `dados` **não vão pro GitHub** (estão no `.gitignore`), porque têm suas senhas e chaves.
- **`dados/`** — criada sozinha. Guarda as últimas 300 mensagens, as imagens enviadas, as fotos de perfil e os dados baixados dos jogos. Apague a pasta pra zerar tudo.

O perfil (nome, foto, status, "sobre mim") fica salvo **no navegador de cada um** e é mandado pro servidor quando a pessoa entra. Se alguém limpar os dados do navegador ou usar outro PC, é só configurar de novo.

Palavras que você vai ver no código:
- **WebSocket** — uma conexão que fica aberta, pra mensagens chegarem na hora.
- **WebRTC** — tecnologia dos navegadores pra mandar áudio/vídeo direto entre PCs.
- **STUN/TURN** — ajudam os PCs a se acharem pela internet. STUN só descobre o endereço; TURN faz a ponte quando não dá pra conectar direto.
- **Track** — uma "faixa" de mídia: o som do microfone, o vídeo da câmera, o vídeo da tela...

Mac ou Linux: rode `sh iniciar-mac-linux.sh` no terminal (e instale o cloudflared com `brew install cloudflared` no Mac).
