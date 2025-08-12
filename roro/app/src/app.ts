import './env.js';
import * as path from "path";
import fastifyStatic from "@fastify/static";
import fastify from "fastify";
import root from "./routes/root.js";
import dbPlugin from "./plugins/dbplugin.js";
import formbody from "@fastify/formbody";
import fastifySession from "@fastify/session";
import fastifyCookie from "@fastify/cookie";
import Store from "./db/store.js";
import fastifyIO from "fastify-socket.io";
import fastifySocketIO from "fastify-socket.io";
import chatPlugin from "./plugins/chat/chatplugin.js";
import { fileURLToPath } from "url"; 
import { GameManager } from "./game/gameManager.js";
import cookie from "cookie";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

const server = fastify({
    logger: {
        level: "error",
    },
});
// PLUGINS (register plugins first or problems)
let db = server.register(dbPlugin);
server.register(formbody);
server.register(fastifyCookie);
await db; // db needed for session

const sessionStore = new Store.SessionStore(server.database, server.log);
server.register(fastifySession, {
    cookieName: "sessionId",
    //TODO: secret should be in .ENV file
    secret: "2c8c3c1549e14bfc7f124ed4a8dbbb94",
    cookie: { maxAge: 1800000, secure: "auto" },
    store: sessionStore,
});
server.decorate("sessionStore", new Store.SessionStore(server.database, server.log));
await server.register(fastifySocketIO.default, { connectionStateRecovery: {} });
await server.register(chatPlugin);
server.register(fastifyStatic, {
    root: path.join(__dirname, "..", "public"),
    prefix: "/",
});

//all user endpoint here
server.register(root.routes);

//all api routes (and hooks ?) here
server.register(root.api);

//all request linked to authentification (and sessions managment ?) here
server.register(root.auth);

const gm = GameManager.getInstance(server);

server.listen({ port: 8080 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
});

