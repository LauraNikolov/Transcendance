import { Room } from './room.js'
import fastifySession, { FastifySessionObject, SessionStore } from "@fastify/session";
import { notStrictEqual } from "assert";
import { FastifyReply, FastifyRequest, FastifyInstance } from "fastify";
import cookie from "cookie";
import { Player } from "../../includes/custom.js";
import { WaitList } from "./waitList.js";

//Singleton GameManager
export class GameManager {
    // tableau de room
    private rooms: Room[] = [];
    private fastify: FastifyInstance | null = null;
    private mapPlayer: Map<number, Player> = new Map<number, Player>();
    private waitList: WaitList = new WaitList;

    static #instance: GameManager
    private constructor() {
        console.log("Game Manager crée");
    }

    public static getInstance(server: FastifyInstance): GameManager {
        if (!this.#instance) {
            this.#instance = new GameManager();
             this.#instance.configureSocketIO(server);
            this.#instance.fastify = server;
            this.#instance.waitList = new WaitList();
             this.#instance.waitList.on('RemoteMatchCreated', ({ player1, player2 }) => {
                 this.#instance.handleNewRoom(player1, player2);
             });
        }
        return this.#instance;
    };

    private handleNewRoom(player1: Player, player2: Player) {
        const room = new Room("remote", player1, player2);
        this.rooms.push(room);
    }

    public async getUsername(userId: number): Promise<string> {
        return new Promise((resolve, reject) => {
            this.fastify!.database.get(
                'SELECT username FROM user WHERE id = ?',
                [userId],
                (err: Error | null, row: any) => {
                    if (err) {
                        reject(new Error("Error retrieving username: " + err.message));
                    } else if (!row || !row.username) {
                        reject(new Error("No user found for this Id"));
                    } else {
                        resolve(row.username);
                    }
                }
            );
        });
    }

//TODO: recuperer via sessionStore directement ?
private configureSocketIO(server: FastifyInstance): void {
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

                    let username: string;
                    try {
                        username = await this.getUsername(userId);
                    } catch {
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

private extractSessionIdFromSocket(socket: any): string | null {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const rawSessionId = cookies.sessionId;
    if (!rawSessionId) return null;


    return rawSessionId.startsWith("s:")
        ? rawSessionId.slice(2).split('.')[0]
        : rawSessionId.split('.')[0];
}


private getSessionFromDb(sessionId: string): Promise<any | null> {
    return new Promise((resolve, reject) => {
        this.fastify?.database.get(
            `SELECT session FROM session WHERE sid = ?`,
            [sessionId],
            (err: Error | null, row: any) => {
                if (err) return reject(err);
                if (!row) return resolve(null);

                try {
                    const sessionData = JSON.parse(row.session);
                    resolve(sessionData);
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
}


private managePlayerConnection(userId: number, username: string, sessionData: any, socket: any): void {
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
    } else {
        if (player.socket && player.socket.id !== socket.id) {
            player.socket.disconnect(true);
        }
        player.socket = socket;
        player.online = true;
        player.session = sessionData;
        player.username = username;
    }
}


private setupSocketEvents(userId: number, socket: any): void {

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


    public async socketPlayerMatch(userSession: FastifySessionObject): Promise<Player | undefined> {
        if (userSession.userId) {
            const value = this.mapPlayer.get(userSession.userId);
            if (!value) 
                return;
            return value;
        }
    }


    // DEBUG
    public listConnectedPlayers(): void {
        console.log("Players online :");
        this.mapPlayer.forEach((player, sessionKey) => {
            if (player.socket)
                console.log(`SessionKey: ${sessionKey}, username: ${player.username}, socket id: ${player.socket.id}`);
        });
    }

    public async addRoom(mode: string, userSession: FastifySessionObject) {
        const player = await this.socketPlayerMatch(userSession);
        if (!player) {
            console.error("Cannot find session with sessionID");
            return;
        }
        if (mode === "local") {
            this.createGuest((guest) => {
                if (!guest) return;
                const room = new Room(mode, player, guest);
                this.rooms.push(room);
            });
        }

        if (mode === "remote") {
            this.listConnectedPlayers();
            this.waitList.addRemote(player);
        }
    }

    private createGuest(callback: (guest: Player | null) => void): void {
        if (!this.fastify) {
            console.error("Fastify not initialize.");
            callback(null);
            return;
        }

        this.fastify.database.get(
            `SELECT id, username FROM user WHERE username = ?`,
            ['guest'],
            (err: Error | null, row: any) => {
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

                const guest: Player = {
                    session: { userId: row.id } as any,
                    socket: null,
                    username: row.username,
                    online: false,
                    role: null,
                };

                callback(guest);
            }
        );
    }



    public checkRoomsStatus(): void {
        this.rooms.forEach(room => {
            if (room.isMatchActive() == false) {
                this.addInfoDb(room);
                room.cleanupResources();
                this.rooms = this.rooms.filter(r => r !== room); 
            }
        });
    }


    // ? enregister certaines infos des le debut ?
    private addInfoDb(match: Room): void {

        const player1Id = match.players[0].session.userId;
        const player2Id = match.players[1].session.userId;
        const player1Score = match.gameLogic.player1Score;
        const player2Score = match.gameLogic.player2Score;
        const winnerId = match.winner.session.userId;
        const dateMatch = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (this.fastify) {
            this.fastify.database.run(
                `INSERT INTO match (
                    player_1, score_player_1,
                    player_2, score_player_2,
                    winner, date
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [player1Id, player1Score, player2Id, player2Score, winnerId, dateMatch],
                function (err: Error | null) {
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
                    } else {
                        console.log("Match sucessfuly add in db.");
                    }
                }
            );
        }
    }

    private handleLeaveGame(userId: number): void {
        const player = this.mapPlayer.get(userId);
        if (!player) {
            return;
        }

        const playerRoom = this.rooms.find(room => 
            room.players.some(p => p.session.userId === userId)
        );

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