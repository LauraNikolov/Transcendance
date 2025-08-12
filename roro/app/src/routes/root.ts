import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { getRoot, getAccount, navbar, getChat, getDashboard, play } from "./controllers/root.controller.js";
import { check_user, is_logged } from "./controllers/api.controller.js";
import { register, login, logout, whoami } from "./controllers/auth.controller.js";
import { getMessages, getBlocked } from "./controllers/chat.controller.js";
import { getStats } from "./controllers/dashboard.controller.js";
import { getGoogleClientId, handleGoogleAuth } from "./controllers/google.controller.js";
import { handle_game } from "./controllers/api.controller.js";

/**
 * A plugin that provide encapsulated routes
 * @param {FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} options plugin options, refer to https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
async function routes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // dummy route
  fastify.get("/ping", async (request, reply) => {
    return { reply: "pong" };
  });

  // index.html
  fastify.get("/", getRoot(fastify));

  // nav bar
  fastify.get("/script/nav", navbar);

  // account.html
  fastify.get("/account", getAccount(fastify));

  // chat.html
  fastify.get("/chat", getChat());

  //dashboard.html
  fastify.get("/dashboard", getDashboard());

  fastify.get("/play", play());
}

async function auth(fastify: FastifyInstance, options: FastifyPluginOptions) {
    //authentification api route, now return json
    fastify.post("/register", register(fastify));
    fastify.post("/login", login(fastify));
    fastify.get("/logout", logout(fastify));

    //google authentification
    fastify.get("/api/auth/google-client-id", getGoogleClientId);
    fastify.post("/api/auth/google", handleGoogleAuth);
}

async function api(fastify: FastifyInstance, options: FastifyPluginOptions) {
    fastify.post("/api/check-username", check_user(fastify));
    fastify.get("/api/islogged", is_logged(fastify));
    // api/chat
    fastify.get("/api/chat/:conversationId/messages", getMessages(fastify));
    fastify.get("/api/chat/blocked", getBlocked(fastify));
    // api/dashboard
    fastify.get("/api/dashboard/stats", getStats(fastify));
    fastify.post("/api/handle-game", handle_game(fastify));
}


export default { routes, api, auth };
