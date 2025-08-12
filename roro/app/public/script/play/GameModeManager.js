import { move_to } from '../N_nav.js';
import { connectSocket } from '../socket.js';
export default class GameModeManager {
    constructor() {
        this.currentState = 'selection';
        this.gameInitialized = false;
        this.pingInterval = null;
        this.socket = connectSocket();
        this.initializeGameFlow();
    }
    initializeGameFlow() {
        setTimeout(() => {
            this.showModeSelection();
            this.setupEventListeners();
        }, 100);
    }
    showModeSelection() {
        this.currentState = 'selection';
        this.hideWaitlist();
        this.hideGame();
        const selection = document.getElementById('gameModeSelection');
        if (selection) {
            selection.style.display = 'flex';
        }
    }
    setupEventListeners() {
        const localButton = document.getElementById('localButton');
        const remoteButton = document.getElementById('remoteButton');
        const tournamentButton = document.getElementById('tournamentButton');
        if (localButton) {
            localButton.addEventListener('click', () => this.handleLocalMode());
        }
        if (remoteButton) {
            remoteButton.addEventListener('click', () => this.handleRemoteMode());
        }
        if (tournamentButton) {
            tournamentButton.addEventListener('click', () => this.handleTournamentMode());
        }
        this.setupSocketListeners();
    }
    async handleLocalMode() {
        console.log('Mode local sélectionné');
        this.showGame();
        await this.notifyServer('local');
    }
    async handleRemoteMode() {
        console.log('Mode remote sélectionné');
        await this.notifyServer('remote');
        this.showWaitlist();
    }
    async handleTournamentMode() {
        console.log('Mode tournament sélectionné');
        this.showWaitlist();
        await this.notifyServer('tournament');
    }
    showWaitlist() {
        this.currentState = 'waitlist';
        this.hideModeSelection();
        this.hideGame();
        const waitlist = document.getElementById('waitingForMatch');
        if (waitlist) {
            waitlist.style.display = 'flex';
        }
        this.setupCancelButton();
    }
    hideWaitlist() {
        const waitlist = document.getElementById('waitingForMatch');
        if (waitlist) {
            waitlist.style.display = 'none';
        }
    }
    setupCancelButton() {
        const cancelButton = document.getElementById('cancelQueue');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                console.log('Annulation de la recherche');
                this.socket.emit('cancel_queue');
                this.showModeSelection();
            });
        }
    }
    showGame() {
        this.currentState = 'game';
        this.hideModeSelection();
        this.hideWaitlist();
        this.createGameCanvas();
        const scores = document.getElementById('scoresSection');
        if (scores) {
            scores.classList.remove('hidden');
        }
        this.initializeGame();
    }
    removeGameCanvas() {
        const wrapper = document.getElementById('gameCanvasWrapper');
        if (wrapper) {
            wrapper.remove();
        }
        const canvas = document.getElementById('renderCanvas');
        if (canvas) {
            canvas.remove();
        }
    }
    createGameCanvas() {
        this.removeGameCanvas();
        const wrapper = document.createElement('div');
        wrapper.id = 'gameCanvasWrapper';
        wrapper.style.cssText = "fixed top-32 left-1/2 -translate-x-1/2 w-[90vw] max-w-5xl h-[80vh] flex justify-center items-center z-40 bg-transparent";
        const canvas = document.createElement('canvas');
        canvas.id = 'renderCanvas';
        const width = 1000;
        const height = 600;
        canvas.width = width;
        canvas.height = height;
        canvas.style.cssText = `
  width: ${width}px;
  height: ${height}px;
  border: 3px solid #00ff88;
  border-radius: 12px;
  display: block;
  margin: 0;
  padding: 0;
  outline: none;
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  z-index: 1;
`;
        wrapper.appendChild(canvas);
        document.body.appendChild(wrapper);
        canvas.focus();
        this.createGameControls(wrapper);
    }
    //TODO: revoir les handle games wrapper : moche + gestion de la deco plus fine 
    createGameControls(wrapper) {
        const quitButton = document.createElement('button');
        quitButton.id = 'quitGameButton';
        quitButton.textContent = 'Quitter';
        quitButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #ef4444;
            color: white;
            border: 2px solid #dc2626;
            border-radius: 8px;
            font-family: 'Press Start 2P', monospace;
            font-size: 12px;
            cursor: pointer;
            z-index: 10000;
            transition: all 0.2s ease;
        `;
        quitButton.addEventListener('mouseenter', () => {
            quitButton.style.backgroundColor = '#dc2626';
            quitButton.style.transform = 'scale(1.05)';
        });
        quitButton.addEventListener('mouseleave', () => {
            quitButton.style.backgroundColor = '#ef4444';
            quitButton.style.transform = 'scale(1)';
        });
        quitButton.addEventListener('click', () => {
            this.handleQuitGame();
        });
        wrapper.appendChild(quitButton);
    }
    handleQuitGame() {
        console.log('Sortie du jeu demandée - Retour à l\'accueil');
        this.destroyEverything();
        if (this.socket) {
            this.socket.emit('leave_game');
        }
        this.returnToHomeScreen();
    }
    destroyEverything() {
        try {
            if (window.BABYLON && BABYLON.Engine.Instances.length > 0) {
                BABYLON.Engine.Instances.forEach((engine, index) => {
                    engine.stopRenderLoop();
                    const scenes = engine.scenes;
                    scenes.forEach((scene) => {
                        if (scene && !scene.isDisposed) {
                            scene.dispose();
                        }
                    });
                    engine.dispose();
                });
            }
            if (this.socket) {
                this.socket.removeAllListeners();
            }
            this.removeGameCanvas();
        }
        catch (error) {
            console.error('Erreur lors de la destruction:', error);
        }
    }
    returnToHomeScreen() {
        console.log('Retour à l\'écran d\'accueil');
        this.destroy();
        move_to("home");
    }
    destroy() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
        }
        this.socket = null;
        this.gameInitialized = false;
        this.currentState = 'selection';
        if (window.gameManager === this) {
            window.gameManager = null;
        }
        console.log('GameModeManager détruit');
    }
    hideGame() {
        this.gameInitialized = false;
        this.removeGameCanvas();
        const scores = document.getElementById('scoresSection');
        if (scores) {
            scores.classList.add('hidden');
        }
        console.log('Nettoyage du jeu terminé');
    }
    hideModeSelection() {
        const selection = document.getElementById('gameModeSelection');
        if (selection) {
            selection.style.display = 'none';
        }
    }
    async initializeGame() {
        if (this.gameInitialized) {
            return;
        }
        try {
            const canvas = document.getElementById('renderCanvas');
            if (!canvas) {
                throw new Error('Canvas renderCanvas non trouvé');
            }
            this.gameInitialized = true;
            const { initScene } = await import('../game/main.js');
            await initScene(this.socket);
        }
        catch (error) {
            console.error('Erreur lors du chargement du jeu Babylon.js:', error);
            this.gameInitialized = false;
        }
    }
    // ========== COMMUNICATION SERVEUR ==========
    async notifyServer(mode) {
        try {
            await fetch('/api/handle-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mode })
            });
        }
        catch (error) {
            console.error('Erreur lors de la requête:', error);
        }
    }
    // ========== WEBSOCKET EVENTS ==========
    setupSocketListeners() {
        this.socket.on('match_found', (data) => {
            this.handleMatchFound(data);
        });
        this.socket.on('match_ended', (data) => {
            this.handleMatchEnded(data);
        });
        this.socket.on('opponent_left', (data) => {
            this.handleOpponentLeft(data);
        });
        this.socket.on('playerType', (playerType) => {
            this.receivedPlayerType = playerType;
        });
        this.socket.on("pong_check", (start) => {
            const rtt = Date.now() - start;
        });
        // Mesure de latence
        this.pingInterval = setInterval(() => {
            if (this.socket) {
                const start = Date.now();
                this.socket.emit("ping_check", start);
            }
        }, 2000);
    }
    handleMatchFound(data) {
        const statusText = document.getElementById('matchStatus');
        const opponentName = document.getElementById('opponentName');
        const opponentValue = document.getElementById('opponentNameValue');
        if (statusText)
            statusText.textContent = "Adversaire trouvé ! Prépare-toi...";
        if (opponentName)
            opponentName.classList.remove('hidden');
        if (opponentValue)
            opponentValue.textContent = data.opponent;
        setTimeout(() => {
            this.showGame();
        }, 2000);
    }
    handleMatchEnded(data) {
        //TODO : faire un truc plus beau
        alert(`Match terminé ! Gagnant: ${data.winner}`);
        this.returnToHomeScreen();
    }
    handleOpponentLeft(data) {
        alert(`Adversaire parti: ${data.message}`);
        this.returnToHomeScreen();
    }
    // ========== API PUBLIQUE ==========
    getCurrentState() {
        return this.currentState;
    }
    reset() {
        this.showModeSelection();
    }
}
