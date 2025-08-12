//import * as BABYLON from 'babylonjs';
//import * as GUI from 'babylonjs-gui';
/// <reference types="babylonjs" />
/// <reference types="babylonjs-gui" />
const player1ScoreDisplay = document.getElementById('player1ScoreDisplay');
const player2ScoreDisplay = document.getElementById('player2ScoreDisplay');
let player1ScoreValue = document.getElementById('player1ScoreValue');
let player2ScoreValue = document.getElementById('player2ScoreValue');
export class GameManager {
    constructor(scene, pingPongBall, floor, socket) {
        this.player1Score = 0;
        this.player2Score = 0;
        this.socketListeners = [];
        this.scene = scene;
        this.ball = pingPongBall;
        this.floor = floor;
        this.socket = socket;
        scene.onBeforeRenderObservable.add(() => {
            const maxSpeed = 13;
            if (this.ball.physicsImpostor) {
                const velocity = this.ball.physicsImpostor.getLinearVelocity();
                if (velocity && velocity.length() > maxSpeed) {
                    const newVelocity = velocity.normalize().scale(maxSpeed);
                    this.ball.physicsImpostor.setLinearVelocity(newVelocity);
                }
            }
        });
        this._initBallSuperviseur();
    }
    destroy() {
        this.socketListeners.forEach(eventName => {
            this.socket.off(eventName);
        });
        this.socketListeners = [];
        this.player1Score = 0;
        this.player2Score = 0;
        this._updateUI();
    }
    _initBallSuperviseur() {
        this.socketListeners.push("updateScore");
        this.socket.on("updateScore", (data) => {
            console.log("Score update :", data);
            this.player1Score = data.player1Score;
            this.player2Score = data.player2Score;
            this.ball.position = data.ball;
            if (data.winner === "player1" || data.winner === "player2") {
                this._handlePoint(data.winner);
            }
            else {
                console.warn("Unknow value for winner: ", data.winner);
            }
        });
    }
    _handlePoint(winner) {
        this.ball.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
        this.ball.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
        this._updateUI();
    }
    _updateUI() {
        player2ScoreValue.textContent = this.player2Score.toString();
        player1ScoreValue.textContent = this.player1Score.toString();
    }
}
