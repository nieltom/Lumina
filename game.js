document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.simon-button');
    const startBtn = document.getElementById('start-btn');
    const gameModeRadios = document.querySelectorAll('input[name="game-mode"]');
    const ttsToggle = document.getElementById('tts-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const statusMessage = document.getElementById('status-message');
    const currentRoundDisplay = document.getElementById('current-round-display');
    
    // Variáveis de estado do jogo
    let gameSequence = [];
    let playerSequence = [];
    let gameState = 'idle'; // idle, playing-sequence, awaiting-input, game-over, free-board
    let round = 0;
    let playerTurn = false;
    let ttsEnabled = true;
    let soundEnabled = true;
    let isDarkMode = false;
    let intervalId = null;
    let freeModeActive = false;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Audio API para geração de sons
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillators = {
        green: { frequency: 261.63, label: 'dó' }, // C4
        red: { frequency: 293.66, label: 'ré' },   // D4
        yellow: { frequency: 329.63, label: 'mi' }, // E4
        blue: { frequency: 392.00, label: 'sol' }    // G4
    };

    // Web Speech API para TTS
    const synth = window.speechSynthesis;
    
    // Mapeamento de botões e atalhos de teclado
    const buttonMap = {
        'KeyQ': buttons[0], 'ArrowUp': buttons[0],
        'KeyW': buttons[1], 'ArrowRight': buttons[1],
        'KeyE': buttons[2], 'ArrowDown': buttons[2],
        'KeyR': buttons[3], 'ArrowLeft': buttons[3],
    };
    
    // --- Funções de Acessibilidade e UI/UX ---

    // Função para falar um texto com a Web Speech API, verificando se o TTS está ativado
    function speakText(text) {
        if (ttsEnabled && 'speechSynthesis' in window) {
            if (synth.speaking) {
                synth.cancel();
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            synth.speak(utterance);
        }
    }

    // Função para tocar um som com a Web Audio API
    function playSound(frequency) {
        if (soundEnabled) {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            
            gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.5);
        }
    }
    
    // Atualiza o painel de status (oculto para leitores de tela)
    function updateStatus(message) {
        statusMessage.textContent = message;
        speakText(message);
    }
    
    // Atualiza a exibição de pontuações
    function updateScores() {
        currentRoundDisplay.textContent = round;
    }

    // Toca a sequência do jogo
    function playSequence() {
        playerTurn = false;
        gameState = 'playing-sequence';
        updateStatus(`Sequência da rodada ${round}. Preste atenção.`);
        
        let i = 0;
        let stepDelay = 800; // Tempo entre os flashes
        let lightDuration = 400; // Duração do flash
        
        intervalId = setInterval(() => {
            if (i < gameSequence.length) {
                const button = buttons[gameSequence[i]];
                flashButton(button, lightDuration, 'sequence');
                i++;
            } else {
                clearInterval(intervalId);
                intervalId = null;
                
                gameState = 'awaiting-input';
                playerTurn = true;
                updateStatus('Sua vez!');
            }
        }, stepDelay);
    }

    // Simula o clique e toca som/voz
    function flashButton(button, duration = 300, source = 'player') {
        const colorClass = button.classList[1];
        const buttonInfo = oscillators[colorClass];
        const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
        
        // Lógica para modo de jogo Normal
        if (gameMode === 'normal') {
            playSound(buttonInfo.frequency);
            flashLight(button, duration);
            if (source === 'player') {
                speakText(`Botão ${colorClass} tocado. Som: ${buttonInfo.label}.`);
            }
        }
        // Lógica para modo Apenas Som
        else if (gameMode === 'sound-only') {
            playSound(buttonInfo.frequency);
            if (source === 'player') {
                speakText(`Botão ${colorClass} tocado. Som: ${buttonInfo.label}.`);
            }
        }
        // Lógica para modo Apenas Luz
        else if (gameMode === 'light-only') {
            flashLight(button, duration);
        }
        // Lógica para modo Tabuleiro Livre
        else if (gameMode === 'free-board') {
            playSound(buttonInfo.frequency);
            flashLight(button, duration);
            speakText(`Botão ${colorClass} tocado. Som: ${buttonInfo.label}.`);
        }
    }
    
    // Lógica de animação de luz separada
    function flashLight(button, duration) {
         if (isReducedMotion) {
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), duration);
         } else {
            const originalTexturedClass = button.classList.contains('textured');
            button.classList.add('active');
            if (originalTexturedClass) {
                button.classList.remove('textured');
            }
            setTimeout(() => {
                button.classList.remove('active');
                if (originalTexturedClass) {
                    button.classList.add('textured');
                }
            }, duration);
         }
    }

    // Inicia um novo jogo
    function startGame() {
        gameSequence = [];
        round = 0;
        updateScores();
        
        // Desabilitar botões de modo
        gameModeRadios.forEach(radio => radio.disabled = true);
        startBtn.textContent = 'Reiniciar';
        
        nextRound();
    }

    // Próxima rodada
    function nextRound() {
        playerSequence = [];
        gameState = 'playing-sequence';
        round++;
        updateScores();
        
        // Adiciona um novo passo à sequência
        const newStep = Math.floor(Math.random() * 4);
        gameSequence.push(newStep);
        
        // Pequeno atraso para o usuário se preparar
        setTimeout(() => {
            playSequence();
        }, 1000);
    }

    // Checa a entrada do jogador
    function checkPlayerInput(index) {
        if (!playerTurn) return;
        
        playerSequence.push(index);
        
        // Checa se o último passo está correto
        if (playerSequence[playerSequence.length - 1] !== gameSequence[playerSequence.length - 1]) {
            gameOver();
            return;
        }
        
        // Checa se a sequência está completa
        if (playerSequence.length === gameSequence.length) {
            updateStatus('Acertou! Prepare-se para o próximo nível.');
            
            // Próxima rodada
            setTimeout(() => {
                nextRound();
            }, 1500);
        }
    }

    // Fim de jogo
    function gameOver() {
        gameState = 'game-over';
        updateStatus(`Fim de Jogo! Você chegou à rodada ${round}.`);

        // Habilitar botões de modo e reiniciar botão
        gameModeRadios.forEach(radio => radio.disabled = false);
        startBtn.textContent = 'Iniciar';
    }

    // Alterna o modo escuro
    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️ Claro';
            speakText('Modo escuro ativado.');
        } else {
            document.body.classList.remove('dark-mode');
            darkModeToggle.textContent = '🌙 Escuro';
            speakText('Modo escuro desativado.');
        }
        localStorage.setItem('darkMode', isDarkMode);
    }
    
    // --- Event listeners e inicialização ---

    // Inicialização do jogo e estados
    updateScores();
    
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true' || (savedDarkMode === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        isDarkMode = true;
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️ Claro';
    } else {
        isDarkMode = false;
        document.body.classList.remove('dark-mode');
        darkModeToggle.textContent = '🌙 Escuro';
    }
    
    // Event listeners para os botões do Simon
    buttons.forEach((button, index) => {
        button.addEventListener('click', () => {
            if (freeModeActive) {
                flashButton(button, 150, 'player');
            } else if (playerTurn && gameState === 'awaiting-input') {
                flashButton(button, 150, 'player');
                checkPlayerInput(index);
            }
        });
    });

    // Event listener para o botão Iniciar
    startBtn.addEventListener('click', () => {
        if (gameState === 'idle' || gameState === 'game-over') {
            startGame();
        } else {
            gameOver(); // Reinicia
        }
    });

    // Event listener para os modos de jogo
    gameModeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
            if (gameMode === 'free-board') {
                freeModeActive = true;
                startBtn.disabled = true;
                updateStatus('Modo tabuleiro livre ativado.');
                gameSequence = [];
                round = 0;
                updateScores();
            } else {
                freeModeActive = false;
                startBtn.disabled = false;
                if (gameState !== 'idle' && gameState !== 'game-over') {
                    // Se mudar de modo no meio do jogo, reinicia
                    gameOver();
                    updateStatus('O jogo foi reiniciado devido à mudança de modo.');
                }
            }
        });
    });

    // Toggles
    ttsToggle.addEventListener('click', () => {
        ttsEnabled = !ttsEnabled;
        ttsToggle.querySelector('#tts-status').textContent = ttsEnabled ? 'Ligado' : 'Desligado';
        speakText(ttsEnabled ? 'Voz ativada.' : 'Voz desativada.');
        ttsToggle.classList.toggle('active', ttsEnabled);
    });
    
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.querySelector('#sound-status').textContent = soundEnabled ? 'Ligado' : 'Desligado';
        speakText(soundEnabled ? 'Som ativado.' : 'Som desativado.');
        soundToggle.classList.toggle('active', soundEnabled);
    });
    
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Teclado
    document.addEventListener('keydown', (e) => {
        const button = buttonMap[e.code];
        
        // Atalhos de botões
        if (button) {
            e.preventDefault();
            if (freeModeActive || (playerTurn && gameState === 'awaiting-input')) {
                button.click();
            }
        }
        
        // Atalhos de controle
        switch(e.key.toLowerCase()) {
            case 'n':
                if (!freeModeActive) startBtn.click();
                break;
            case 's':
                soundToggle.click();
                break;
            case 't':
                ttsToggle.click();
                break;
            case 'd':
                darkModeToggle.click();
                break;
        }
    });
});
