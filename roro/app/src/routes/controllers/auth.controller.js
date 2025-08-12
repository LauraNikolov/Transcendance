import bcrypt from 'bcrypt';
const saltRounds = 10;
//usual query
const insertuser = 'INSERT INTO user (username, email, password, created_at) VALUES (?, ?, ?, date())';
export function register(fastify) {
    // add a new entry to the database user, at this point all checks for the credential
    // used should have been done
    return async function (request, reply) {
        const { username, email, password } = request.body;
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) {
                console.error(err);
            }
            else {
                fastify.database.prepare(insertuser).all([username, email, hash], (err) => {
                    fastify.log.error(err?.message);
                    return reply.send({ "registered": false, "reason": err?.message });
                });
                fastify.log.info("new user entry:\nusername:%s, email:%s, password:%s", username, email, hash);
            }
        });
        return reply.send({ "registered": true });
    };
}
export function login(fastify) {
    return async function (request, reply) {
        const { username, password } = request.body;
        if (!username || !password) {
            return reply.send({
                "logged": false,
                "reason": "parsing error, no username or password",
            });
        }
        fastify.log.info("request login for: %s, with password %s", username, password);
        // fetch all = execute la requete SQL et retourne les données sous forme de tableau. Si aucun utilisateur n'est trouvé le tableau est vide
        const rows = await fastify.database.fetch_all('SELECT id, password FROM user WHERE username = ?', [username]);
        if (!rows || rows.length === 0) {
            fastify.log.error('query returned empty');
            return reply.send({
                "logged": false,
                "reason": "username unknown",
            });
        }
        // comparaison du mot de passe fourni et celui stocké (hashé) dans la base données
        else {
            const user = rows[0];
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
    };
}
export function logout(FastifyInstance) {
    return async function (request, reply) {
        request.session.authenticated = false;
        request.session.userId = NaN;
        request.session.destroy(err => {
            return reply.send({ "logout": true });
        });
    };
}
export function whoami(fastify) {
    return async function (request, reply) {
        const { authenticated, userId } = request.session;
        console.log("Session object in /me:", request.session); // optional debug
        if (!authenticated || !userId) {
            return reply.status(401).send({ success: false, message: "Unauthorized" });
        }
        const user = await fastify.database.fetch_one("SELECT id, username, email, is_admin FROM user WHERE id = ?", [userId]);
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
