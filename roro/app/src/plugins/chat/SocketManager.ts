import { FastifyInstance, Session } from "fastify";
import { Socket, Namespace } from "socket.io";
import { parse } from "cookie";

export default class SocketManager {
  private userSockets = new Map<number, Set<string>>();
  private socketToSession = new Map<string, number>();
  private fastify: FastifyInstance;

  constructor(instance: FastifyInstance) {
    this.fastify = instance;
  }

  getUserSockets() {
    return (this.userSockets);
}

  getSocketToSession() {
    return (this.socketToSession);
  }

  authenticate(chatNamespace: Namespace) {
    chatNamespace.use((socket: Socket, next: Function) => {
      const cookies = parse(socket.handshake.headers.cookie || "");
      const signedSessionId = cookies.sessionId;
      if (!signedSessionId) return (next(new Error("No session Id found")));
      const sessionId = signedSessionId.split(".")[0];

      this.fastify.sessionStore.get(sessionId, (err: Error | null, session: Session | null | undefined) => {
        if (err || !session || !session.authenticated) {
          return (next(new Error("Unauthorized connection")));
        }
        socket.session = session;
        this.fastify.sessionStore.set(sessionId, session, (e: Error | null) => {
          if (e) return (next(new Error("Failed to refresh session")));
          next();
        });
      });
    });
  }

  async getUsername(userId: number): Promise<string> {
    const row = await this.fastify.database.fetch_one(
      `SELECT username FROM user WHERE id = ?`, [userId]
    );
    return (row ? row.username : "Unknown user");
  }

  async setSessionInfo(socket: Socket) {
    const sessionId = socket.session.userId;
    socket.username = await this.getUsername(sessionId);
    socket.join(sessionId.toString());
    if (!this.userSockets.has(sessionId))
      this.userSockets.set(sessionId, new Set());
    this.userSockets.get(sessionId)!.add(socket.id);
    this.socketToSession.set(socket.id, sessionId);
  }

  handleDisconnect(socket: Socket) {
    socket.on("disconnect", () => {
    const userId = this.socketToSession.get(socket.id);
    if (userId) {
      const socketSet = this.userSockets.get(userId);
      if (socketSet) {
        socketSet.delete(socket.id);
        if (socketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.socketToSession.delete(socket.id);
  });
  }
}
