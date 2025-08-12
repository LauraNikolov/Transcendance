import { createScene } from "./scene.js";
import { PlayerInput } from "./inputController.js";
import { GameManager } from "./handleGame.js";
//import * as BABYLON from 'babylonjs';
/// <reference types="babylonjs" />
/// <reference types="babylonjs-gui" />
function updateData(playerInput, socket) {
    socket.on("sceneUpdate", (sceneState) => {
        playerInput._updateFromServer(sceneState.leftPaddle, sceneState.rightPaddle, sceneState.ball);
        const ballPos = BABYLON.Vector3.FromArray(sceneState.ball.position);
        const ballTimestamp = sceneState.timeStamp;
        playerInput.onServerBallUpdate(ballPos, ballTimestamp);
    });
    socket.on("animationUpdate", (sceneState) => {
        playerInput._updateFromServer(sceneState.leftPaddle, sceneState.rightPaddle, sceneState.ball);
    });
}
function whichPlayer(socket) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve('local');
        }, 3000);
        socket.on("playerType", (playerState) => {
            clearTimeout(timeout);
            if (playerState === null || playerState === undefined || playerState === 'null') {
                resolve('local');
            }
            else {
                resolve(playerState);
            }
        });
    });
}
export async function initScene(socket) {
    socket.removeAllListeners('sceneUpdate');
    socket.removeAllListeners('animationUpdate');
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true);
    const scene = await createScene(engine, canvas);
    const playerType = await whichPlayer(socket);
    const playerInput = new PlayerInput(scene, playerType, socket);
    const ball = scene.getMeshByName("pingPongBall");
    const ground = scene.getMeshByName("ground");
    if (!ball || !ground) {
        throw new Error("The 'pingPongBall' or 'ground' mesh was not found!");
    }
    const gameManager = new GameManager(scene, ball, ground, socket);
    engine.runRenderLoop(() => {
        if (scene) {
            scene.render();
        }
    });
    updateData(playerInput, socket);
    window.addEventListener("resize", () => {
        if (engine) {
            engine.resize();
        }
    });
}
