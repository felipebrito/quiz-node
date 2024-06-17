Aqui está a documentação atualizada com detalhes sobre a estrutura das perguntas:

---

# Jogo de Perguntas e Respostas

## Sumário

- [Introdução](#introdução)
- [Instalação](#instalação)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Configuração](#configuração)
- [Funcionalidades](#funcionalidades)
- [Estrutura das Perguntas](#estrutura-das-perguntas)
- [Arquitetura](#arquitetura)
- [Fluxo do Jogo](#fluxo-do-jogo)
- [Endpoints da API](#endpoints-da-api)
- [Mensagens OSC](#mensagens-osc)
- [Mensagens de Debug](#mensagens-de-debug)

## Introdução

Este é um jogo de perguntas e respostas onde os jogadores competem entre si para responder corretamente e rapidamente às perguntas apresentadas. O jogo é gerenciado por um servidor Node.js que utiliza WebSockets para comunicação em tempo real e envia mensagens OSC para controlar a partida.

## Instalação

1. Clone o repositório:

   ```sh
   git clone https://github.com/felipebrito/quiz-node.git
   cd quiz-node
   ```

2. Instale as dependências:

   ```sh
   npm install
   ```

## Configuração do Ambiente

### Configuração de Portas

- **Porta do Servidor HTTP**: O servidor HTTP roda na porta `3000`:
  ```javascript
  const PORT = 3000;
  ```

- **Porta para Envio de Mensagens OSC**: As mensagens OSC são enviadas para a porta `9000`:
  ```javascript
  const OSC_SEND_PORT = 9000;
  ```

- **Endereço e Porta Local do OSC**: Configuração do UDP para OSC:
  ```javascript
  const oscUDP = new osc.UDPPort({
    localAddress: '0.0.0.0',  // Escuta em todas as interfaces
    localPort: 0,             // Usa uma porta aleatória para envio
  });
  ```

### Banco de Dados JSON

- **Jogadores**: Os jogadores são armazenados em `jogadores.json`.
- **Perguntas**: As perguntas são armazenadas em `perguntas.json`.

### Webcam

Para capturar fotos durante o cadastro, é necessário ter uma webcam configurada.

## Configuração

1. **Inicie o servidor**:

   ```sh
   node server.js
   ```

2. **Verifique se o servidor está rodando**:

   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador para verificar se o servidor está funcionando corretamente.

## Funcionalidades

### Gerenciamento de Jogadores

- **Adicionar Jogador**: Cadastro de novos jogadores com captura de foto via webcam.
- **Editar Jogador**: Atualização das informações do jogador.
- **Excluir Jogador**: Remoção de jogadores do sistema.
- **Listar Jogadores**: Exibição de todos os jogadores cadastrados com funcionalidades de busca e paginação.

### Fluxo do Jogo

- **Iniciar Jogo**: Seleção de três jogadores para a partida e envio de mensagem OSC de início.
- **Rodadas de Perguntas**: Exibição de perguntas e respostas, contagem regressiva, e coleta de respostas dos jogadores.
- **Cálculo de Pontuação**: Pontuação baseada na rapidez e correção das respostas.
- **Mostrar Vencedor**: Anúncio do vencedor ao final da partida e atualização do placar.

### Operações do Servidor

- **Gerenciar Conexões**: Gerenciamento das conexões dos jogadores e controle das etapas do jogo.
- **Enviar Mensagens OSC**: Envio de mensagens OSC para sinalizar início, rodadas, respostas e fim do jogo.

## Estrutura das Perguntas

As perguntas são armazenadas no arquivo `perguntas.json` e seguem a estrutura abaixo:

### Estrutura de uma Pergunta

Cada pergunta é um objeto JSON com os seguintes campos:

- **id**: Um identificador único para a pergunta.
- **texto**: O texto da pergunta.
- **opcoes**: Um array de opções de resposta, onde cada opção é um objeto com `letra` e `texto`.
- **correta**: A letra da opção correta.

### Exemplo de Pergunta

```json
{
  "id": 1,
  "texto": "Qual é a capital da França?",
  "opcoes": [
    { "letra": "A", "texto": "Berlim" },
    { "letra": "B", "texto": "Madrid" },
    { "letra": "C", "texto": "Paris" },
    { "letra": "D", "texto": "Roma" }
  ],
  "correta": "C"
}
```

### Banco de Dados JSON de Perguntas

O arquivo `perguntas.json` contém um array de perguntas:

```json
[
  {
    "id": 1,
    "texto": "Qual é a capital da França?",
    "opcoes": [
      { "letra": "A", "texto": "Berlim" },
      { "letra": "B", "texto": "Madrid" },
      { "letra": "C", "texto": "Paris" },
      { "letra": "D", "texto": "Roma" }
    ],
    "correta": "C"
  },
  {
    "id": 2,
    "texto": "Qual é o maior oceano do mundo?",
    "opcoes": [
      { "letra": "A", "texto": "Atlântico" },
      { "letra": "B", "texto": "Índico" },
      { "letra": "C", "texto": "Pacífico" },
      { "letra": "D", "texto": "Ártico" }
    ],
    "correta": "C"
  }
]
```

## Arquitetura

O projeto segue a estrutura MVC (Model-View-Controller) para organizar o código de forma clara e modular.

### Estrutura de Diretórios

```
├── public
│   ├── index.html
│   ├── game.html
│   ├── servidor.html
│   ├── css
│   └── js
├── uploads
├── jogadores.json
├── perguntas.json
├── server.js
└── package.json
```

## Fluxo do Jogo

1. **Cadastro de Jogadores**: O administrador cadastra os jogadores no sistema via `index.html`.
2. **Seleção de Jogadores**: Três jogadores são selecionados para iniciar a partida.
3. **Início da Partida**: O jogo é iniciado e os jogadores acessam `game.html` para participar.
4. **Rodadas de Perguntas**: As perguntas são exibidas uma a uma, com um timer regressivo de 10 segundos.
5. **Coleta de Respostas**: As respostas são coletadas e enviadas ao servidor para processamento.
6. **Cálculo de Pontuação**: A pontuação é calculada com base na rapidez e correção das respostas.
7. **Anúncio do Vencedor**: O vencedor é anunciado e o jogo é resetado para uma nova partida.

## Endpoints da API

### GET /jogadores

Retorna a lista de jogadores cadastrados.

**Exemplo de Resposta:**

```json
[
  {
    "id": 1,
    "nome": "Alice",
    "cidade": "São Paulo",
    "foto": "/uploads/1625099673453.jpg",
    "pontuacao": 100
  },
  ...
]
```

### POST /jogadores

Adiciona um novo jogador.

**Parâmetros:**

- `nome`: Nome do jogador
- `cidade`: Cidade do jogador
- `foto`: Foto capturada via webcam

**Exemplo de Resposta:**

```json
{
  "id": 2,
  "nome": "Bob",
  "cidade": "Rio de Janeiro",
  "foto": "/uploads/1625099673454.jpg",
  "pontuacao": 0
}
```

### DELETE /jogadores/:id

Remove um jogador pelo ID.

**Exemplo de Resposta:**

```json
{
  "message": "Jogador deletado com sucesso"
}
```

### POST /start-game

Inicia uma nova partida com os jogadores selecionados.

**Parâmetros:**

- `jogadorIds`: IDs dos jogadores selecionados

**Exemplo de Resposta:**

```json
{
  "message": "Partida iniciada"
}
```

## Mensagens OSC

### /start

Envia a mensagem de início da partida.

### /rodada#

Envia a mensagem indicando a rodada atual, substituindo `#` pelo número da rodada.

### /jogador# : true/false

Envia a mensagem indicando se a resposta do jogador foi correta ou incorreta.

### /endGame

Envia a mensagem de fim da partida.

### /vencedor

Envia a mensagem indicando o vencedor da partida.

## Mensagens de Debug

Mensagens de debug são adicionadas ao longo do código para facilitar o rastreamento e resolução de problemas. Aqui estão algumas das principais mensagens de debug:

- **Início do Servidor**:
  ```sh
  console.log(`Servidor rodando na porta ${PORT}`);
  ```

- **Jogador Conectado

**:
  ```sh
  console.log(`Novo jogador conectado: ${jogador.nome}`);
  ```

- **Recebimento de Resposta**:
  ```sh
  console.log(`Resposta recebida: Jogador ${jogadorPosition} - Resposta: ${resposta}`);
  ```

- **Processamento de Resposta**:
  ```sh
  console.log(`Processando resposta do jogador ${jogador.nome}: ${jogador.resposta}`);
  ```

- **Pontuação Atualizada**:
  ```sh
  console.log(`Jogador ${jogador.nome} acertou! Pontuação Temporária: ${jogador.pontuacaoTemp}`);
  console.log(`Jogador ${jogador.nome} errou e perdeu 5 pontos. Pontuação Temporária: ${jogador.pontuacaoTemp}`);
  ```

- **Anúncio do Vencedor**:
  ```sh
  console.log('Jogo finalizado. Pontuações Temporárias:', selectedPlayers.map(j => `${j.nome}: ${j.pontuacaoTemp}`).join(', '));
  console.log(`Vencedor ${vencedorDb.nome} registrado com pontuação: ${pontuacaoDurantePartida}`);
  ```

- **Fim do Jogo**:
  ```sh
  console.log('Fim do jogo. Preparando para nova partida.');
  ```

---

Esta documentação cobre os principais aspectos do seu jogo de perguntas e respostas, incluindo funcionalidades, arquitetura, fluxo do jogo, estrutura das perguntas, endpoints da API, mensagens OSC e mensagens de debug. Se houver mais detalhes específicos que você gostaria de incluir, por favor, me avise!
