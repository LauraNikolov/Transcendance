import { FastifyRequest, FastifyReply } from "fastify";
import { googleClient } from '../../utils/googleClient.js';

export async function getGoogleClientId(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ clientId: process.env.GOOGLE_CLIENT_ID });
}

export async function handleGoogleAuth(request: FastifyRequest, reply: FastifyReply) {
    const { token } = request.body as { token?: string };

    const fastify = request.server;
    const db = fastify.database;

    if (!token) {
        return reply.code(400).send({ success: false, message: "Missing token" });
    }

    try {

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email || !payload.sub) {
            return reply.code(400).send({ success: false, message: "Invalid token payload" });
        }
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name || email.split("@")[0]; 


        let user = await db.fetch_one(
            `SELECT * FROM user WHERE google_id = ? OR email = ? LIMIT 1`,
            [googleId, email]
        );

        if (!user) {

            let baseUsername = name.replace(/\s/g, "_").toLowerCase();
            let username = baseUsername;
            let suffix = 1;

            while (await db.fetch_one(`SELECT * FROM user WHERE username = ?`, [username])) {
                username = `${baseUsername}${suffix++}`;
            }
            console.log("Saving user email:", email); 
            await db.run(
                `INSERT INTO user (google_id, email, username, created_at) VALUES (?, ?, ?, ?)`,
                [googleId, email, username, new Date().toISOString()]
            );
            user = await db.fetch_one(
                `SELECT * FROM user WHERE google_id = ? LIMIT 1`,
                [googleId]
            );
        }

        request.session.authenticated = true;
        request.session.userId = user.id;


        return reply.send({ success: true });
    } catch (err) {

        request.log.error({ err }, "Google login error");
        return reply.code(401).send({ success: false, message: "Invalid Google token" });
    }
}

