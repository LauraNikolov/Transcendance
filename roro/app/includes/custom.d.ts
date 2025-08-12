import { Socket, Server as SocketIOServer } from "socket.io";
import { Database } from "../src/plugins/dbplugin";
import "fastify";
import { SessionStore } from "@fastify/session";

declare module "fastify" {
    interface FastifyInstance {
        database: Database;
        io: SocketIOServer;
        sessionStore: SessionStore;
    }

    interface Session {
        authenticated?: boolean;
        userId?: number;
        socketId?: string;
    }
}

declare module "socket.io" {
    interface Socket extends Socket {
        session: Session;
        username: string;
    }
}
interface Player {
    session: FastifySessionObject | undefined;
    socket: any;
    username: string | undefined;
    online: boolean;
    role?: 'player1' | 'player2' | null;
}
