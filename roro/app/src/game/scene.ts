
import { NullEngine, Scene, MeshBuilder, Vector3, Quaternion, FreeCamera, Mesh, Animation, PhysicsImpostor } from "@babylonjs/core";
//import { Animation } from "@babylonjs/core/Animations/animation";
import { Player } from "../../includes/custom.js";
import { AmmoJSPlugin } from "@babylonjs/core";
import type AmmoType from 'ammojs-typed';
import Ammo from 'ammojs-typed';
import { timeStamp } from "console";

export class GameScene {
    engine: NullEngine;
    scene: Scene;
    ball!: Mesh;
    camera!: FreeCamera;
    leftPaddle!: Mesh;
    rightPaddle!: Mesh;
    leftAnimating: boolean;
    RightAnimating: boolean;
    ground!: Mesh;
    mode!: string;
    canHitLeft: boolean;
    canHitRight: boolean;
    private constructor() {
        // NullEngine
        this.engine = new NullEngine();
        this.scene = new Scene(this.engine);
        this.leftAnimating = false;
        this.RightAnimating = false;
        this.canHitLeft = false;
        this.canHitRight = false;
    }


    private emitToPlayers(player1: Player, player2: Player, event: string, data: any) {
        const players = [player1, player2];

        players.forEach((player, index) => {

            if (this.mode === "local" && player.username === "guest")
                return; 
            player.socket.emit(event, data);
        });
    }

    static async create(mode: string): Promise<GameScene> {
        const instance = new GameScene();
        instance.mode = mode;
        instance.camera = new FreeCamera("camera", new Vector3(0, 5, -10), instance.scene);

        await instance.initializePhysics();

        //console.log("Physics initialized, setting up scene...");

        instance.ground = MeshBuilder.CreateGround("ground", { width: 30, height: 20 }, instance.scene);

        instance.ball = MeshBuilder.CreateSphere("pingPongBall", { diameter: 1, segments: 32 }, instance.scene);
        instance.ball.position = new Vector3(-13, 0, 0);

        instance.ball.physicsImpostor = new PhysicsImpostor(
            instance.ball,
            PhysicsImpostor.SphereImpostor,
            { mass: 0.9, restitution: 0.9 },
            instance.scene
        );

        console.log("Initial velocity:", instance.ball.physicsImpostor!.getLinearVelocity()?.toString());


        instance.leftPaddle = instance.createPaddle(
            "paddleLeft",
            new Vector3(-16, 1.5, 0),
            new Vector3(2, 2, 2),
            new Vector3(0, 0, -1),
            -Math.PI / 2
        );

        instance.rightPaddle = instance.createPaddle(
            "paddleRight",
            new Vector3(16, 1.5, 0),
            new Vector3(2, 2, 2),
            new Vector3(0, 0, -1),
            -Math.PI / 2
        );

        instance.ground.physicsImpostor = new PhysicsImpostor(
            instance.ground,
            PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.5 },
            instance.scene
        );

        instance.leftPaddle.physicsImpostor = new PhysicsImpostor(
            instance.leftPaddle,
            PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.9 },
            instance.scene
        );

        instance.rightPaddle.physicsImpostor = new PhysicsImpostor(
            instance.rightPaddle,
            PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.9 },
            instance.scene
        );


        instance.engine.runRenderLoop(() => {
            instance.scene.render();
        });

        let canHitLeft = false;
        let canHitRight = false;

        instance.ball.physicsImpostor!.registerOnPhysicsCollide(instance.rightPaddle.physicsImpostor!, () => {
            if (!canHitRight) return;

            const paddlePos = instance.rightPaddle.position;
            const ballPos = instance.ball.position;
            const yOffset = (ballPos.y - paddlePos.y) * 2;
            const impulse = new Vector3(-60, yOffset, 0);
            const contactPoint = instance.ball.getAbsolutePosition();

            instance.ball.physicsImpostor!.applyImpulse(impulse, contactPoint);
            canHitRight = false; 
        });

        instance.ball.physicsImpostor!.registerOnPhysicsCollide(instance.leftPaddle.physicsImpostor!, () => {
            if (!canHitLeft) return;

            const paddlePos = instance.leftPaddle.position;
            const ballPos = instance.ball.position;
            const yOffset = (ballPos.y - paddlePos.y) * 2;
            const impulse = new Vector3(60, yOffset, 0);
            const contactPoint = instance.ball.getAbsolutePosition();

            instance.ball.physicsImpostor!.applyImpulse(impulse, contactPoint);
            canHitLeft = false; 
        });

        return instance;
    }

    private createPaddle(
        name: string,
        position: Vector3,
        scaling: Vector3,
        rotationAxis: Vector3,
        rotationAngle: number
    ): Mesh {
        const scaleFactor = 0.8;
        const paddle = MeshBuilder.CreateBox(name, {
            width: 1,
            height: 3,
            depth: 0.5
        }, this.scene);

        paddle.position = position.clone();
        paddle.scaling = scaling.clone();
        paddle.rotationQuaternion = Quaternion.RotationAxis(rotationAxis, rotationAngle);

        return paddle;
    }

    moovePaddle(playerId: string, direction: string, player1: Player, player2: Player) {
        switch (direction) {
            // paddle moove
            case "o":
                this.leftPaddle.position.z += 0.1;
                break;
            case "l":
                this.leftPaddle.position.z -= 0.1;
                break;
            case "q":
                this.rightPaddle.position.z += 0.1;
                break;
            case "w":
                this.rightPaddle.position.z -= 0.1;
                break;

            // paddle shoot
            case "p":
                if (!this.leftAnimating) {
                    this.leftAnimating = true;
                    this.animateLeftPaddle(player1, player2, () => {
                        this.leftAnimating = false;
                    });
                }
                break;
            case "d":
                if (!this.RightAnimating) {
                    this.RightAnimating = true;
                    this.animateRightPaddle(player1, player2, () => {
                        this.RightAnimating = false;
                    });
                }
                break;
        }
    }

    getSceneState() {
        return {
            ball: {
                position: this.ball.position.asArray(),
                rotationQuaternion: this.ball.rotationQuaternion ? this.ball.rotationQuaternion.toArray(new Array(4)) : null,
                linearVelocity: this.ball.physicsImpostor?.getLinearVelocity()?.asArray(),
                angularVelocity: this.ball.physicsImpostor?.getAngularVelocity()?.asArray(),
            },
            leftPaddle: {
                position: this.leftPaddle.position.asArray(),
                rotationQuaternion: this.leftPaddle.rotationQuaternion ? this.leftPaddle.rotationQuaternion.toArray(new Array(4)) : null,
            },
            rightPaddle: {
                position: this.rightPaddle.position.asArray(),
                rotationQuaternion: this.rightPaddle.rotationQuaternion ? this.rightPaddle.rotationQuaternion.toArray(new Array(4)) : null,
            },
            timeStamp: Date.now(),
        };
    }

    animateLeftPaddle(player1: Player, player2: Player, onComplete: any) {
        if (!this.leftPaddle) {
            if (onComplete) onComplete();
            return;
        }

        this.leftPaddle.animations = [];

        const startPos = this.leftPaddle.position.clone();
        const forwardPos = startPos.add(new Vector3(3, 0, 1));

        const animation = new Animation(
            "paddleHitAnimation",
            "position",
            30,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        animation.setKeys([
            { frame: 0, value: startPos },
            { frame: 10, value: forwardPos },
            { frame: 20, value: startPos }
        ]);

        this.leftPaddle.animations.push(animation);
        this.canHitLeft = true;
        const anim = this.scene.beginAnimation(this.leftPaddle, 0, 20, false);

        const observable = this.scene.onBeforeRenderObservable.add(() => {
            const sceneState = this.getSceneState();
            this.emitToPlayers(player1, player2, "animationUpdate", sceneState)
        });

        anim.onAnimationEnd = () => {
            this.scene.onBeforeRenderObservable.remove(observable);
            if (onComplete) onComplete();
        };
    }


    animateRightPaddle(player1: Player, player2: Player, onComplete: any) {
        if (!this.rightPaddle) {
            console.error("Left paddle doesn't exist");
            if (onComplete) onComplete();
            return;
        }

        this.rightPaddle.animations = [];

        const startPos = this.rightPaddle.position.clone();
        const forwardPos = startPos.add(new Vector3(-3, 0, 1));

        const animation = new Animation(
            "paddleHitAnimation",
            "position",
            30,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        animation.setKeys([
            { frame: 0, value: startPos },
            { frame: 10, value: forwardPos },
            { frame: 20, value: startPos }
        ]);

        this.rightPaddle.animations.push(animation);
        this.canHitRight = true;
        const anim = this.scene.beginAnimation(this.rightPaddle, 0, 20, false);

        const observable = this.scene.onBeforeRenderObservable.add(() => {
            const sceneState = this.getSceneState();
            this.emitToPlayers(player1, player2, "animationUpdate", sceneState)
        });


        anim.onAnimationEnd = () => {
            this.scene.onBeforeRenderObservable.remove(observable);
            if (onComplete) onComplete();
        };
    }

    private async initializePhysics(): Promise<void> {
        try {
            const ammo = await Ammo(); 
            const ammoPlugin = new AmmoJSPlugin(true, ammo); 
            this.scene.enablePhysics(new Vector3(0, -9.81, 0), ammoPlugin); 
            console.log("Physics engine initialized successfully with Ammo.js");
        } catch (error) {
            console.error("Failed to initialize Ammo.js", error);
            throw new Error("Physics initialization failed");
        }
    }


    public destroy(): void {
    
    try {
        if (this.engine) {
            this.engine.stopRenderLoop();
        }
        
        if (this.scene) {
            this.scene.onBeforeRenderObservable.clear();
        }
        
        if (this.ball?.physicsImpostor) {
            this.ball.physicsImpostor.dispose();
        }
        if (this.leftPaddle?.physicsImpostor) {
            this.leftPaddle.physicsImpostor.dispose();
        }
        if (this.rightPaddle?.physicsImpostor) {
            this.rightPaddle.physicsImpostor.dispose();
        }
        if (this.ground?.physicsImpostor) {
            this.ground.physicsImpostor.dispose();
        }
        

        if (this.scene && !this.scene.isDisposed) {
            this.scene.dispose();
        }
        

        if (this.engine) {
            this.engine.dispose();
        }
        
        this.ball = null as any;
        this.leftPaddle = null as any;
        this.rightPaddle = null as any;
        this.ground = null as any;
        this.scene = null as any;
        this.engine = null as any;
        
        
    } catch (error) {
        console.error('Error while cleaning gameScene:', error);
    }
}

}