import { FastifyReply, FastifyRequest, FastifyInstance } from "fastify";
import bcrypt from 'bcrypt';
const saltRounds = 10;

// describe data from body request
interface RegisterBody {
    username: string; //username choisi par l'utilisateur
    email: string; //email
    password: string; //mdp
}

interface LoginBody {
    username: string;
    password: string;
}

//usual query
const insertuser = 'INSERT INTO user (username, email, password, created_at) VALUES (?, ?, ?, date())'

export function register(fastify: FastifyInstance) {
    // add a new entry to the database user, at this point all checks for the credential
    // used should have been done
    return async function (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
        const { username, email, password } = request.body;
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) {
                console.error(err)
            }
            else {
                fastify.database.prepare(insertuser).all([username, email, hash], (err: Error) => {
                    fastify.log.error(err?.message);
                    return reply.send({ "registered": false, "reason": err?.message })
                })
                fastify.log.info("new user entry:\nusername:%s, email:%s, password:%s", username, email, hash)
            }
        })
        return reply.send({ "registered": true })
    }
}

export function login(fastify: FastifyInstance) {
    return async function (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
        const { username, password } = request.body;
        if (!username || !password) {
            return reply.send({
                "logged": false,
                "reason": "parsing error, no username or password",
            });
        }
        fastify.log.info("request login for: %s, with password %s", username, password);
        // fetch all = execute la requete SQL et retourne les données sous forme de tableau. Si aucun utilisateur n'est trouvé le tableau est vide
        const rows = await fastify.database.fetch_all('SELECT id, password FROM user WHERE username = ?', [username])
        if (!rows || rows.length === 0) {
            fastify.log.error('query returned empty');
            return reply.send({
                "logged": false,
                "reason": "username unknown",
            });
        }
        // comparaison du mot de passe fourni et celui stocké (hashé) dans la base données
        else {
            const user = rows[0]
            if (await bcrypt.compare(password, user.password)) {
                fastify.log.info("user %s logged", username);
                // stockage des infos dans la session rataché a l'instance fastify
                request.session.authenticated = true;
                request.session.userId = user.id;
            }
            else {
                return reply.send({
                    "logged": false,
                    "reason": "wrong password",
                });
            }
            request.session.save();
            return reply.send({
                "logged": true,
            });
        }
    }
}

export function logout(FastifyInstance: FastifyInstance) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
        request.session.authenticated = false;
        request.session.userId = NaN
        request.session.destroy(err => {
            return reply.send({ "logout": true });
        })
    }
}

export function whoami(fastify: FastifyInstance) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
        const { authenticated, userId } = request.session;

        console.log("Session object in /me:", request.session); // optional debug

        if (!authenticated || !userId) {
            return reply.status(401).send({ success: false, message: "Unauthorized" });
        }

        const user = await fastify.database.fetch_one(
            "SELECT id, username, email, is_admin FROM user WHERE id = ?",
            [userId]
        );

        if (!user) {
            return reply.status(404).send({ success: false, message: "User not found" });
        }

        return reply.send({
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: !!user.is_admin
        });
    };
}