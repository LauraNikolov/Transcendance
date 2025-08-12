import { Player } from "../../includes/custom.js";
import { GameScene } from "./scene.js";
import { GameLogic } from "./gameLogic.js";

export class Room {
    id: string = "null";
    players: Player[] = [];
    gameScene! : GameScene;
    gameLogic! : GameLogic; 
    isActive: boolean = true;
    winner! : Player;
    mode: string;


    //TODO : nettoyer room
    public constructor (mode: string, player1: Player, player2: Player) {
        this.players.push(player1);
        this.players.push(player2);
        this.mode = mode;


        //TODO: faire une fonction pour gerer les 3 mode : moche
        if(mode == "local") {
          this.players[0].role = null;
          this.players[1].role = null;
          this.players[0].socket.emit("playerType", null);
        }
        if(mode == "remote") {
          this.players[0].role = 'player1';
          this.players[1].role = 'player2';
          this.players[0].socket.emit("playerType", "player1");
          this.players[1].socket.emit("playerType", "player2");
        }
        GameScene.create(this.mode).then((scene) => {
            this.gameScene = scene;
            this.gameLogic = new GameLogic(this.gameScene, this.players[0], this.players[1], mode);
            this.checkMatchStatus();
            this.keyPressedListener();
            this.emitToPlayers(mode);
            this.checkMatchStatus();
        }).catch((error) => {
            console.error("Failed to initialize GameScene", error);
        });

    }

       private checkMatchStatus(): void {
        const interval = setInterval(() => {
            if (!this.isActive) {
                clearInterval(interval);
                return;
            }
    
            if (this.gameLogic.player1Score >= 7 || this.gameLogic.player2Score >= 7) {
              this.endMatch();
                clearInterval(interval);
            }
    
        }, 100); 
    }

    private emitToPlayers(mode: string) {
        const interval = setInterval(() => {
          if (!this.isActive) {
            clearInterval(interval);
            return;
          }
      
          const sceneState = this.gameScene.getSceneState();
          for (const player of this.players) {
            if(player.username == "guest")
                continue;
            if (player.socket && player.socket.connected) {
              player.socket.emit("sceneUpdate", sceneState);
            }
          }
        }, 1000 / 30); 
      }
      

  private keyPressedListener() {
    this.players.forEach((player, index) => {
      if (!player.socket?.connected) {
        console.warn(`Socket non connectée pour le joueur ${index + 1}`);
        return;
      }

      if (player.username === "guest") {
        return;
      }

      //TODO: moche
      player.socket.on("keyPressed", (data: { key: string, position: { x: number, y: number, z: number } }) => {
        const authorizedKeysForPlayer1 = ["q", "w", "d"];
        const authorizedKeysForPlayer2 = ["o", "l", "p"];

        const key = data.key;
        if (
          (player.role === "player1" && !authorizedKeysForPlayer1.includes(key)) ||
          (player.role === "player2" && !authorizedKeysForPlayer2.includes(key))
        ) {
          return;
        }
        const paddleName = player.role === "player1" ? "players2" : "players1";
        this.gameScene.moovePaddle(paddleName, data.key, this.players[0], this.players[1]);
      });
    });
  }
    
    
    public isMatchActive(): boolean {
        if(this.gameLogic.player1Score > 7 || this.gameLogic.player2Score > 7)
          this.isActive = false;
        return this.isActive;
    }



    private endMatch(): void {
        this.isActive = false;
        this.winner = this.gameLogic.player1Score >= 7 ? this.players[0] : this.players[1];
      
        for (const player of this.players) {
            if(player.username == "guest")
                continue;
          if (player.socket && player.socket.connected) {
            player.socket.emit("match_ended", {
              message: "stop match",
              winner: this.winner.username,
            });
          }
        }
      }
    


public cleanupResources(): void {
    this.players.forEach(player => {
        if (player.socket) {
            player.socket.removeAllListeners('keyPressed');
        }
    });
    
    if (this.gameLogic) {
        if (typeof this.gameLogic.destroy === 'function') {
            this.gameLogic.destroy();
        }
        this.gameLogic = null as any;
    }
 
    if (this.gameScene) {
        if (typeof this.gameScene.destroy === 'function') {
            this.gameScene.destroy();
        }
        this.gameScene = null as any;
    }
    
}
    
public forceEndMatch(): void {
    this.isActive = false;
    this.players.forEach(player => {
        if (player.socket) {
            player.socket.emit('match_ended', {
                message: 'Match interrompu',
                reason: 'force_quit'
            });
        }
    });
    this.cleanupResources();
}

}
