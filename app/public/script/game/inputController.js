export class PlayerInput {
    constructor(scene, player, socket) {
        this.leftTargetPos = null;
        this.rightTargetPos = null;
        this.ballTargetPos = null;
        this.ballTargetRot = null;
        // Facteur d’interpolation 
        this.lerpAlpha = 0.5;
        this._ballVel = null;
        this._ballAngVel = null;
        this._needBallWakeUp = false;
        this.ballStates = [null, null];
        this.keyBindings = {
            leftPaddle: {
                meshName: "paddleLeft_hitbox",
                allowedPlayers: ["player2", "local"],
                animationFlag: "leftAnimating",
                startZProperty: "leftStartZ",
                keys: {
                    "o": { requiresAnimation: false },
                    "l": { requiresAnimation: false },
                    "p": { requiresAnimation: true }
                }
            },
            rightPaddle: {
                meshName: "paddleRight_hitbox",
                allowedPlayers: ["player1", "local"],
                animationFlag: "rightAnimating",
                startZProperty: "rightStartZ",
                keys: {
                    "q": { requiresAnimation: false },
                    "w": { requiresAnimation: false },
                    "d": { requiresAnimation: true }
                }
            }
        };
        this.Player = player === null ? 'local' : player;
        scene.actionManager = new BABYLON.ActionManager(scene);
        this.Scene = scene;
        this.socket = socket;
        this._left = this.Scene.getMeshByName("paddleLeft_hitbox");
        this._right = this.Scene.getMeshByName("paddleRight_hitbox");
        this._ball = this.Scene.getMeshByName("pingPongBall");
        const allBalls = scene.meshes.filter(m => m.name === "pingPongBall");
        if (allBalls.length > 1) {
            console.error("Error: several balls detected: ", allBalls.map(b => ({ name: b.name, id: b.uniqueId, pos: b.position })));
        }
        this.adjustCamera();
        this.inputMap = {};
        this.leftStartZ = null;
        this.rightStartZ = null;
        this.leftAnimating = false;
        this.rightAnimating = false;
        this.ballAnimating = false;
        this.Player = player === null ? 'local' : player;
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = true;
        }));
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = false;
        }));
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
    emitKey(key, paddle) {
        this.socket.emit("keyPressed", {
            key,
            position: {
                x: paddle.position.x,
                y: paddle.position.y,
                z: paddle.position.z
            }
        });
    }
    adjustCamera() {
        const camera = this.Scene.activeCamera;
        if (!camera)
            return;
        let paddle = null;
        if (this.Player === 'player1') {
            paddle = this.Scene.getMeshByName("paddleRight_hitbox");
        }
        else if (this.Player === 'player2') {
            paddle = this.Scene.getMeshByName("paddleLeft_hitbox");
        }
        else {
            return;
        }
        if (!paddle)
            return;
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
    _updateFromKeyboard(scene) {
        this.processPaddleInput(scene, this.keyBindings.leftPaddle);
        this.processPaddleInput(scene, this.keyBindings.rightPaddle);
    }
    processPaddleInput(scene, config) {
        const paddle = scene.getMeshByName(config.meshName);
        if (!paddle)
            return;
        if (this[config.startZProperty] === null) {
            this[config.startZProperty] = paddle.position.z;
        }
        if (!this.canControlPaddle(config.allowedPlayers))
            return;
        for (const [key, keyConfig] of Object.entries(config.keys)) {
            this.processKeyInput(key, paddle, keyConfig, config.animationFlag);
        }
    }
    canControlPaddle(allowedPlayers) {
        return allowedPlayers.includes(this.Player);
    }
    processKeyInput(key, paddle, keyConfig, animationFlag) {
        if (!this.inputMap[key])
            return;
        if (keyConfig.requiresAnimation && this[animationFlag])
            return;
        this.emitKey(key, paddle);
    }
    _updateFromServer(leftPaddle, rightPaddle, ball) {
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
    onServerBallUpdate(newPos, newTimestamp) {
        this.ballStates[0] = this.ballStates[1];
        this.ballStates[1] = { position: newPos, timestamp: newTimestamp };
    }
    lerpVec3(a, b, t) {
        return new BABYLON.Vector3(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y), a.z + t * (b.z - a.z));
    }
    interpolateBallPosition(timeNow) {
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
