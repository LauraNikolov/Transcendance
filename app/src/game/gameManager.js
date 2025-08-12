var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _a, _GameManager_instance;
import { Room } from './room.js';
import cookie from "cookie";
import { WaitList } from "./waitList.js";
//Singleton GameManager
export class GameManager {
    constructor() {
        // tableau de room
        this.rooms = [];
        this.fastify = null;
        this.mapPlayer = new Map();
        this.waitList = new WaitList;
        console.log("Game Manager crée");
    }
    static getInstance(server) {
        if (!__classPrivateFieldGet(this, _a, "f", _GameManager_instance)) {
            __classPrivateFieldSet(this, _a, new _a(), "f", _GameManager_instance);
            __classPrivateFieldGet(this, _a, "f", _GameManager_instance).configureSocketIO(server);
            __classPrivateFieldGet(this, _a, "f", _GameManager_instance).fastify = server;
            __classPrivateFieldGet(this, _a, "f", _GameManager_instance).waitList = new WaitList();
            __classPrivateFieldGet(this, _a, "f", _GameManager_instance).waitList.on('RemoteMatchCreated', ({ player1, player2 }) => {
                __classPrivateFieldGet(this, _a, "f", _GameManager_instance).handleNewRoom(player1, player2);
            });
        }
        return __classPrivateFieldGet(this, _a, "f", _GameManager_instance);
    }
    ;
    handleNewRoom(player1, player2) {
        const room = new Room("remote", player1, player2);
        this.rooms.push(room);
    }
    async getUsername(userId) {
        return new Promise((resolve, reject) => {
            this.fastify.database.get('SELECT username FROM user WHERE id = ?', [userId], (err, row) => {
                if (err) {
                    reject(new Error("Error retrieving username: " + err.message));
                }
                else if (!row || !row.username) {
                    reject(new Error("No user found for this Id"));
                }
                else {
                    resolve(row.username);
                }
            });
        });
    }
    //TODO: recuperer via sessionStore directement ?
    configureSocketIO(server) {
        server.ready().then(() => {
            server.io.on("connection", (socket) => {
                const sessionId = this.extractSessionIdFromSocket(socket);
                if (!sessionId) {
                    return;
                }
                this.getSessionFromDb(sessionId)
                    .then(async (sessionData) => {
                    if (!sessionData) {
                        console.warn(`No session found for the SID : ${sessionId}`);
                        return;
                    }
                    const userId = sessionData.userId;
                    if (!userId) {
                        socket.disconnect();
                        return;
                    }
                    let username;
                    try {
                        username = await this.getUsername(userId);
                    }
                    catch {
                        console.warn("Unable to retrieve username");
                        username = sessionData.username || "undefined";
                    }
                    this.managePlayerConnection(userId, username, sessionData, socket);
                    this.setupSocketEvents(userId, socket);
                })
                    .catch((error) => {
                    console.error("Error retrieving session:", error);
                });
            });
        });
    }
    extractSessionIdFromSocket(socket) {
        const cookies = cookie.parse(socket.handshake.headers.cookie || "");
        const rawSessionId = cookies.sessionId;
        if (!rawSessionId)
            return null;
        return rawSessionId.startsWith("s:")
            ? rawSessionId.slice(2).split('.')[0]
            : rawSessionId.split('.')[0];
    }
    getSessionFromDb(sessionId) {
        return new Promise((resolve, reject) => {
            this.fastify?.database.get(`SELECT session FROM session WHERE sid = ?`, [sessionId], (err, row) => {
                if (err)
                    return reject(err);
                if (!row)
                    return resolve(null);
                try {
                    const sessionData = JSON.parse(row.session);
                    resolve(sessionData);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
    managePlayerConnection(userId, username, sessionData, socket) {
        let player = this.mapPlayer.get(userId);
        if (!player) {
            player = {
                session: sessionData,
                socket: socket,
                username: username,
                online: true,
                role: null,
            };
            this.mapPlayer.set(userId, player);
        }
        else {
            if (player.socket && player.socket.id !== socket.id) {
                player.socket.disconnect(true);
            }
            player.socket = socket;
            player.online = true;
            player.session = sessionData;
            player.username = username;
        }
    }
    setupSocketEvents(userId, socket) {
        socket.on("leave_game", () => {
            this.handleLeaveGame(userId);
        });
        socket.on("cancel_queue", () => {
            this.waitList.removePlayer(userId);
        });
        socket.on("disconnect", () => {
            const player = this.mapPlayer.get(userId);
            if (player) {
                player.online = false;
                player.socket = null;
            }
        });
    }
    async socketPlayerMatch(userSession) {
        if (userSession.userId) {
            const value = this.mapPlayer.get(userSession.userId);
            if (!value)
                return;
            return value;
        }
    }
    // DEBUG
    listConnectedPlayers() {
        console.log("Players online :");
        this.mapPlayer.forEach((player, sessionKey) => {
            if (player.socket)
                console.log(`SessionKey: ${sessionKey}, username: ${player.username}, socket id: ${player.socket.id}`);
        });
    }
    async addRoom(mode, userSession) {
        const player = await this.socketPlayerMatch(userSession);
        if (!player) {
            console.error("Cannot find session with sessionID");
            return;
        }
        if (mode === "local") {
            this.createGuest((guest) => {
                if (!guest)
                    return;
                const room = new Room(mode, player, guest);
                this.rooms.push(room);
            });
        }
        if (mode === "remote") {
            this.listConnectedPlayers();
            this.waitList.addRemote(player);
        }
    }
    createGuest(callback) {
        if (!this.fastify) {
            console.error("Fastify not initialize.");
            callback(null);
            return;
        }
        this.fastify.database.get(`SELECT id, username FROM user WHERE username = ?`, ['guest'], (err, row) => {
            if (err) {
                console.error("SQL error retrieving guest:", err.message);
                callback(null);
                return;
            }
            if (!row) {
                console.error("No guest User found.");
                callback(null);
                return;
            }
            const guest = {
                session: { userId: row.id },
                socket: null,
                username: row.username,
                online: false,
                role: null,
            };
            callback(guest);
        });
    }
    checkRoomsStatus() {
        this.rooms.forEach(room => {
            if (room.isMatchActive() == false) {
                this.addInfoDb(room);
                room.cleanupResources();
                this.rooms = this.rooms.filter(r => r !== room);
            }
        });
    }
    // ? enregister certaines infos des le debut ?
    addInfoDb(match) {
        const player1Id = match.players[0].session.userId;
        const player2Id = match.players[1].session.userId;
        const player1Score = match.gameLogic.player1Score;
        const player2Score = match.gameLogic.player2Score;
        const winnerId = match.winner.session.userId;
        const dateMatch = new Date().toISOString().slice(0, 19).replace('T', ' ');
        if (this.fastify) {
            this.fastify.database.run(`INSERT INTO match (
                    player_1, score_player_1,
                    player_2, score_player_2,
                    winner, date
                ) VALUES (?, ?, ?, ?, ?, ?)`, [player1Id, player1Score, player2Id, player2Score, winnerId, dateMatch], function (err) {
                if (err) {
                    console.log({
                        player1Id,
                        player2Id,
                        player1Score,
                        player2Score,
                        winnerId,
                        dateMatch
                    });
                    console.error("Erreur insertion match:", err.message);
                }
                else {
                    console.log("Match sucessfuly add in db.");
                }
            });
        }
    }
    handleLeaveGame(userId) {
        const player = this.mapPlayer.get(userId);
        if (!player) {
            return;
        }
        const playerRoom = this.rooms.find(room => room.players.some(p => p.session.userId === userId));
        if (playerRoom) {
            if (playerRoom.mode === "remote") {
                const otherPlayer = playerRoom.players.find(p => p.session.userId !== userId);
                if (otherPlayer && otherPlayer.socket) {
                    otherPlayer.socket.emit('opponent_left', {
                        message: `${player.username} a quitté la partie`,
                        reason: 'player_quit'
                    });
                }
            }
            playerRoom.forceEndMatch();
            this.rooms = this.rooms.filter(r => r !== playerRoom);
        }
        this.waitList.removePlayer(userId);
    }
}
_a = GameManager;
_GameManager_instance = { value: void 0 };
