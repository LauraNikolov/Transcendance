//import * as BABYLON from 'babylonjs';
import { animateLeftPaddle, animateRightPaddle, serveBall } from "./animation.js";
// import * as BABYLON from 'babylonjs';

/// <reference types="babylonjs" />
/// <reference types="babylonjs-gui" />

interface BallState {
    position: BABYLON.Vector3;
    timestamp: number; // en ms
}

export class PlayerInput {
    inputMap: { [key: string]: boolean };
    leftAnimating: boolean;
    rightAnimating: boolean;
    ballAnimating: boolean;

    leftStartZ: number | null;
    rightStartZ: number | null;
    Scene: BABYLON.Scene;
    Player: 'player1' | 'player2' | 'local';
    socket:any;
    private leftTargetPos: BABYLON.Vector3 | null = null;
    private rightTargetPos: BABYLON.Vector3 | null = null;
    private ballTargetPos: BABYLON.Vector3 | null = null;
    private ballTargetRot: BABYLON.Quaternion | null = null;
    // Facteur d’interpolation 
    private readonly lerpAlpha = 0.5; 
    private _ballVel: BABYLON.Vector3 | null = null;
    private _ballAngVel: BABYLON.Vector3 | null = null;
    private _needBallWakeUp: boolean = false;
    private ballStates: [BallState | null, BallState | null] = [null, null];

    private _left: BABYLON.Mesh;
    private _right: BABYLON.Mesh;
    private _ball: BABYLON.Mesh;


    constructor(scene: BABYLON.Scene, player: 'player1' | 'player2' | 'local' | null, socket:any) {
        
        this.Player = player === null ? 'local' : player;
        scene.actionManager = new BABYLON.ActionManager(scene);
        this.Scene = scene;
        this.socket = socket;
        

        this._left = this.Scene.getMeshByName("paddleLeft_hitbox") as BABYLON.Mesh;
        this._right = this.Scene.getMeshByName("paddleRight_hitbox") as BABYLON.Mesh;
        this._ball = this.Scene.getMeshByName("pingPongBall") as BABYLON.Mesh;
        
        

        const allBalls = scene.meshes.filter(m => m.name === "pingPongBall");
        if (allBalls.length > 1) {
            console.error("Error: several balls detected: ", 
                allBalls.map(b => ({ name: b.name, id: b.uniqueId, pos: b.position })));
        }
        
        this.adjustCamera();
        this.inputMap = {};

        this.leftStartZ = null;
        this.rightStartZ = null;

        this.leftAnimating = false;
        this.rightAnimating = false;
        this.ballAnimating = false;

        this.Player = player === null ? 'local' : player;

        scene.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
                this.inputMap[evt.sourceEvent.key] = true;
            })
        );
        scene.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, (evt) => {
                this.inputMap[evt.sourceEvent.key] = false;
            })
        );

        scene.onBeforeRenderObservable.add(() => {
            this._updateFromKeyboard(scene);
            const now = performance.now(); 
            const interpPos = this.interpolateBallPosition(now - 100); 
            if (interpPos && this._ball) {
                const oldPos = this._ball.position.clone();
                this._ball.position.copyFrom(interpPos);
            }
        });
    }

    private emitKey(key: string, paddle: BABYLON.Mesh): void {
        this.socket.emit("keyPressed", {
            key,
            position: {
                x: paddle.position.x,
                y: paddle.position.y,
                z: paddle.position.z
            }
        });
    }


    private adjustCamera() {
        const camera = this.Scene.activeCamera as BABYLON.ArcRotateCamera;
        if (!camera) return;

        let paddle: BABYLON.Mesh | null = null;

        if (this.Player === 'player1') {
            paddle = this.Scene.getMeshByName("paddleRight_hitbox") as BABYLON.Mesh;
        } else if (this.Player === 'player2') {
            paddle = this.Scene.getMeshByName("paddleLeft_hitbox") as BABYLON.Mesh;
        } else {
            return;
        }

        if (!paddle) return;

        const offsetTarget = new BABYLON.Vector3(3, 1, 0);

        camera.target = paddle.position.add(offsetTarget);

        const radius = 25;

        if (this.Player === 'player1') {
            camera.alpha = Math.PI / 2 + Math.PI / 2 + Math.PI;
            camera.beta = Math.PI / 3;
            camera.radius = radius;
        }

        if (this.Player === 'player2') {
            camera.alpha = Math.PI / 2 + Math.PI + Math.PI / 2 + Math.PI;
            camera.beta = Math.PI / 3;
            camera.radius = radius;
        }

    }

    private readonly keyBindings = {
        leftPaddle: {
            meshName: "paddleLeft_hitbox",
            allowedPlayers: ["player2", "local"] as const,
            animationFlag: "leftAnimating" as const,
            startZProperty: "leftStartZ" as const,
            keys: {
                "o": { requiresAnimation: false },
                "l": { requiresAnimation: false },
                "p": { requiresAnimation: true }
            }
        },
        rightPaddle: {
            meshName: "paddleRight_hitbox", 
            allowedPlayers: ["player1", "local"] as const,
            animationFlag: "rightAnimating" as const,
            startZProperty: "rightStartZ" as const,
            keys: {
                "q": { requiresAnimation: false },
                "w": { requiresAnimation: false },
                "d": { requiresAnimation: true }
            }
        }
    };

    private _updateFromKeyboard(scene: BABYLON.Scene): void {
        this.processPaddleInput(scene, this.keyBindings.leftPaddle);
        this.processPaddleInput(scene, this.keyBindings.rightPaddle);
    }

    private processPaddleInput(scene: BABYLON.Scene, config: any) {
        const paddle = scene.getMeshByName(config.meshName) as BABYLON.Mesh;
        if (!paddle) return;

        if ((this as any)[config.startZProperty] === null) {
            (this as any)[config.startZProperty] = paddle.position.z;
        }

        if (!this.canControlPaddle(config.allowedPlayers)) return;

        for (const [key, keyConfig] of Object.entries(config.keys)) {
            this.processKeyInput(key, paddle, keyConfig as any, config.animationFlag);
        }
    }

    private canControlPaddle(allowedPlayers: readonly string[]): boolean {
        return allowedPlayers.includes(this.Player);
    }

    private processKeyInput(
        key: string, 
        paddle: BABYLON.Mesh, 
        keyConfig: { requiresAnimation: boolean },
        animationFlag: string
    ): void {
        if (!this.inputMap[key]) return;
        if (keyConfig.requiresAnimation && (this as any)[animationFlag]) return;
        this.emitKey(key, paddle);
    }

    _updateFromServer(leftPaddle: any, rightPaddle: any, ball: any) {


        if (this._left && leftPaddle?.position) {
            this._left.position.x = leftPaddle.position[0];
            this._left.position.y = leftPaddle.position[1];
            this._left.position.z = leftPaddle.position[2];
        }

        if (this._right && rightPaddle?.position) {
            this._right.position.x = rightPaddle.position[0];
            this._right.position.y = rightPaddle.position[1];
            this._right.position.z = rightPaddle.position[2];
        }

    }

    onServerBallUpdate(newPos: BABYLON.Vector3, newTimestamp: number) {
        this.ballStates[0] = this.ballStates[1]; 
        this.ballStates[1] = { position: newPos, timestamp: newTimestamp };
    }

    private lerpVec3(a: BABYLON.Vector3, b: BABYLON.Vector3, t: number): BABYLON.Vector3 {
        return new BABYLON.Vector3(
            a.x + t * (b.x - a.x),
            a.y + t * (b.y - a.y),
            a.z + t * (b.z - a.z)
        );
    }

    private interpolateBallPosition(timeNow: number): BABYLON.Vector3 | null {
        if (!this.ballStates[0] || !this.ballStates[1])
            return null;

        const prev = this.ballStates[0];
        const curr = this.ballStates[1];

        // If current time is outside the interval, we clamp it
        let t = (timeNow - prev.timestamp) / (curr.timestamp - prev.timestamp);
        t = Math.min(Math.max(t, 0), 1);

        return this.lerpVec3(prev.position, curr.position, t);
    }



}