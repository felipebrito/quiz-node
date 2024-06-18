const express = require('express');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');
const osc = require('osc');

const app = express();
const PORT = 3000;
const OSC_SEND_PORT = 9000;  // Porta para envio de mensagens OSC

// Configurar o armazenamento de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Jogadores armazenados em JSON
let jogadores = require('./jogadores.json');
let perguntas = require('./perguntas.json');  // Carregando as perguntas do arquivo JSON

// Função para embaralhar array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Embaralhar perguntas para a partida atual
let perguntasPartida = shuffle([...perguntas]).slice(0, 5);  // Seleciona 5 perguntas randômicas

// Configurar o servidor OSC para envio
const oscUDP = new osc.UDPPort({
  localAddress: '0.0.0.0',  // Escuta em todas as interfaces
  localPort: 0,             // Usa uma porta aleatória para envio
});

oscUDP.open();

// Middleware para servir arquivos estáticos
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CRUD para jogadores
app.get('/jogadores', (req, res) => {
  res.json(jogadores);
});

app.post('/jogadores', upload.single('foto'), (req, res) => {
  const { nome, cidade, foto } = req.body;
  let fotoPath = null;

  if (req.file) {
    fotoPath = req.file.path;
  } else if (foto) {
    const base64Data = foto.replace(/^data:image\/jpeg;base64,/, '');
    const fotoName = `${Date.now()}.jpeg`;
    fotoPath = `uploads/${fotoName}`;
    fs.writeFileSync(fotoPath, base64Data, 'base64');
  }

  const jogador = {
    id: jogadores.length + 1,
    nome,
    cidade,
    foto: `/${fotoPath}`,
    pontuacao: 0,
    pontuacaoTemp: 0, // Campo temporário para armazenar a pontuação das rodadas
  };

  jogadores.push(jogador);
  fs.writeFileSync('jogadores.json', JSON.stringify(jogadores));
  res.status(201).json(jogador);
});

app.delete('/jogadores/:id', (req, res) => {
  const { id } = req.params;
  jogadores = jogadores.filter(j => j.id != id);
  fs.writeFileSync('jogadores.json', JSON.stringify(jogadores));
  res.status(200).send('Jogador deletado com sucesso');
});

// Rota para listar todas as perguntas
app.get('/perguntas', (req, res) => {
  res.json(perguntas);
});

// Rota para deletar uma pergunta
app.delete('/perguntas/:pergunta', (req, res) => {
  const { pergunta } = req.params;
  perguntas = perguntas.filter(p => p.pergunta !== pergunta);
  fs.writeFileSync('perguntas.json', JSON.stringify(perguntas));
  res.status(200).send('Pergunta deletada com sucesso');
});

// Rota para atualizar uma pergunta
app.put('/perguntas/:pergunta', (req, res) => {
  const { pergunta } = req.params;
  const { novaPergunta, opcoes, correta } = req.body;

  const perguntaIndex = perguntas.findIndex(p => p.pergunta === pergunta);
  if (perguntaIndex !== -1) {
    perguntas[perguntaIndex] = { pergunta: novaPergunta, opcoes, correta };
    fs.writeFileSync('perguntas.json', JSON.stringify(perguntas));
    res.status(200).json(perguntas[perguntaIndex]);
  } else {
    res.status(404).send('Pergunta não encontrada');
  }
});


// Adicionar rota para adicionar uma nova pergunta
app.post('/perguntas', (req, res) => {
  const { pergunta, opcoes, correta } = req.body;

  if (!pergunta || !opcoes || !correta) {
    return res.status(400).send('Dados incompletos');
  }

  const novaPergunta = {
    pergunta,
    opcoes,
    correta
  };

  perguntas.push(novaPergunta);
  fs.writeFileSync('perguntas.json', JSON.stringify(perguntas));
  res.status(201).json(novaPergunta);
});

// Iniciar o servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Configurar Socket.io
const io = new Server(server);

let currentRound = 0;
let timerInterval;
let selectedPlayers = [];
let currentTimer = 10;  // Definir currentTimer globalmente
const totalRounds = 5;
let gameStarted = false;

function sendOSCMessage(address, args = []) {
  if (gameStarted) {
    console.log(`Enviando mensagem OSC: ${address} ${args}`);
    oscUDP.send({
      address: address,
      args: args
    }, '127.0.0.1', OSC_SEND_PORT);
  }
}

function startRound() {
  currentTimer = 10;  // Inicializar currentTimer para cada rodada
  selectedPlayers.forEach(jogador => jogador.resposta = null); // Resetar respostas
  io.emit('timerUpdate', currentTimer);

  // Embaralhar as opções de resposta
  const perguntaAtual = perguntasPartida[currentRound - 1];
  const opcoesEmbaralhadas = shuffle([...perguntaAtual.opcoes]);

  io.emit('novaPergunta', perguntaAtual.pergunta);
  io.emit('opcoesPergunta', opcoesEmbaralhadas);
  sendOSCMessage(`/rodada${currentRound}`);
  timerInterval = setInterval(() => {
    currentTimer -= 0.1;
    currentTimer = parseFloat(currentTimer.toFixed(1));
    io.emit('timerUpdate', currentTimer);
    if (currentTimer <= 0) {
      clearInterval(timerInterval);
      processResponses();
    }
  }, 100);
}

function processResponses() {
  let fastestCorrect = { position: null, time: Infinity };
  selectedPlayers.forEach(jogador => {
    let acertou = false;
    console.log(`Processando resposta do jogador ${jogador.nome}: ${jogador.resposta}`);
    if (jogador.resposta === perguntasPartida[currentRound - 1].correta) {
      acertou = true;
      if (jogador.respostaTime < fastestCorrect.time) {
        fastestCorrect = { position: jogador.position, time: jogador.respostaTime };
      }
    }
    sendOSCMessage(`/jogador${jogador.position}`, [acertou]);
  });

  selectedPlayers.forEach(jogador => {
    if (jogador.resposta === perguntasPartida[currentRound - 1].correta) {
      let pontos = jogador.respostaTime + 5;
      if (jogador.position === fastestCorrect.position) {
        jogador.pontuacaoTemp += parseFloat(pontos.toFixed(2));
      } else {
        jogador.pontuacaoTemp += parseFloat(jogador.respostaTime.toFixed(2));
      }
      console.log(`Jogador ${jogador.nome} acertou! Pontuação Temporária: ${jogador.pontuacaoTemp}`);
    } else if (jogador.resposta) {
      jogador.pontuacaoTemp -= 5;
      jogador.pontuacaoTemp = parseFloat(jogador.pontuacaoTemp.toFixed(2));
      console.log(`Jogador ${jogador.nome} errou e perdeu 5 pontos. Pontuação Temporária: ${jogador.pontuacaoTemp}`);
    }
  });

  io.emit('statusUpdate', selectedPlayers);
  currentRound++;
  if (currentRound <= totalRounds) {
    io.emit('roundUpdate', currentRound);
    startRound();
  } else {
    io.emit('finalizarJogo', selectedPlayers);
    console.log('Jogo finalizado. Pontuações Temporárias:', selectedPlayers.map(j => `${j.nome}: ${j.pontuacaoTemp}`).join(', '));
    const vencedor = selectedPlayers.reduce((max, player) => (player.pontuacaoTemp > max.pontuacaoTemp ? player : max), selectedPlayers[0]);
    sendOSCMessage('/vencedor', [vencedor.position]);
    io.emit('mostrarVencedor', vencedor);  // Enviando o vencedor específico
    showRanking(vencedor);
  }
}

function showRanking(vencedor) {
  selectedPlayers.sort((a, b) => b.pontuacaoTemp - a.pontuacaoTemp);
  io.emit('rankingFinal', selectedPlayers);

  const vencedorDb = jogadores.find(j => j.id === vencedor.id);
  if (vencedorDb) {
    const pontuacaoDurantePartida = vencedor.pontuacaoTemp; // Pontuação acumulada durante a partida
    vencedorDb.pontuacao += pontuacaoDurantePartida;
    vencedorDb.pontuacao = parseFloat(vencedorDb.pontuacao.toFixed(2));
    console.log(`Vencedor ${vencedorDb.nome} registrado com pontuação: ${pontuacaoDurantePartida}`);
    io.emit('mostrarVencedor', { nome: vencedorDb.nome, pontuacao: pontuacaoDurantePartida });
  }

  fs.writeFileSync('jogadores.json', JSON.stringify(jogadores));
  setTimeout(() => {
    gameStarted = false;
    io.emit('resetGame');
    sendOSCMessage('/endGame');
    console.log('Fim do jogo. Preparando para nova partida.');
  }, 10000);
}

app.post('/start-game', (req, res) => {
  const { jogadorIds } = req.body;
  console.log('Recebido jogador IDs:', jogadorIds);  // Mensagem de depuração
  selectedPlayers = jogadorIds.map((id, index) => {
    const jogador = jogadores.find(j => j.id === parseInt(id));
    if (jogador) {
      jogador.position = index + 1; // Adiciona a posição do jogador na lista
      jogador.respostaTime = Infinity; // Inicializa o tempo de resposta
      jogador.pontuacaoTemp = 0; // Inicializa a pontuação temporária para o início do jogo
      console.log(`Jogador selecionado: ${jogador.nome} com ID: ${jogador.id} e posição: ${jogador.position}`);
      return jogador;
    } else {
      console.log('Jogador não encontrado para ID:', id);
    }
  }).filter(Boolean);
  currentRound = 1;
  gameStarted = true;
  perguntasPartida = shuffle([...perguntas]).slice(0, 5);  // Seleciona novas perguntas randômicas para cada partida
  console.log('Iniciando jogo com jogadores:', selectedPlayers.map(j => j.nome).join(', '));
  sendOSCMessage('/start');
  io.emit('iniciarPartida', selectedPlayers);
  startRound();
  res.sendStatus(200);
});

io.on('connection', (socket) => {
  socket.on('joinGame', (data) => {
    if (!gameStarted) {
      console.log(`Jogo ainda não começou. Jogador com posição ${data.jogadorPosition} está aguardando.`);
      return;
    }
    const { jogadorPosition } = data;
    console.log('Jogador Position recebido:', jogadorPosition);
    const jogador = selectedPlayers.find(j => j.position === jogadorPosition);
    if (jogador) {
      console.log(`Novo jogador conectado: ${jogador.nome}`);
      socket.emit('jogadorConectado', jogador);
    } else {
      console.log(`Jogador com posição ${jogadorPosition} não encontrado.`);
      console.log('Jogadores selecionados:', selectedPlayers);
    }
  });

  socket.on('resposta', (data) => {
    if (gameStarted) {
      const { jogadorPosition, resposta } = data;
      console.log(`Resposta recebida: Jogador ${jogadorPosition} - Resposta: ${resposta}`);
      const jogador = selectedPlayers.find(j => j.position === jogadorPosition);
      if (jogador) {
        jogador.resposta = resposta;
        jogador.respostaTime = currentTimer; // Registra o tempo de resposta
        console.log(`Jogador ${jogador.nome} respondeu: ${resposta} em ${currentTimer} segundos`);
        io.emit('statusUpdate', selectedPlayers);
        if (selectedPlayers.every(j => j.resposta !== null)) {
          clearInterval(timerInterval);
          processResponses();
        }
      }
    }
  });
});
