import { FastifyInstance } from "fastify"

class picture {
    private user_id: number
    private fastify: FastifyInstance
    private static query_picture_get: string = "SELECT * FROM profile p WHERE p.user_id = ?"
    private static query_picture_set: string = "UPDATE profile SET title = ?, picture = ? WHERE p.user_id = ?"
    private static query_picture_create: string = "INSERT INTO profile (title, picture, user_id) VALUES (?,?,?)"

    constructor(user_id: number, fastify: FastifyInstance) {
        this.user_id = user_id
        this.fastify = fastify
    }

    async get() {
        const res = await this.fastify.database.fetch_all(picture.query_picture_get)
        if (res.length == 0)
            return null
        return res[0] as Blob;
    }

    async set(title: string, image: BinaryType) {
        if (await this.get()) {
            return this.fastify.database.prepare(picture.query_picture_set).run([title, image, this.user_id])
        } else {
            return this.fastify.database.prepare(picture.query_picture_create).run([title, image, this.user_id])
        }
    }
}

class match {
    private user_id: number
    private fastify: FastifyInstance
    private static query_get_match: string = `Select m.id, u1.username as player_1, m.score_player_1, u2.username as player_2, m.score_player_2, w.username as winner from "match" m
                INNER JOIN user u1 ON m.player_1 = u1.id
                INNER JOIN user u2 ON m.player_2 = u2.id
                INNER JOIN user w ON m.winner = w.id
                WHERE m.player_1 == ? OR m.player_2 == ?;`

    constructor(user_id: number, fastify: FastifyInstance) {
        this.user_id = user_id
        this.fastify = fastify
    }

    async get_all() {
        return this.fastify.database.fetch_all(match.query_get_match, [this.user_id, this.user_id]);
    }
}

export default class UserManager {
    private id: number
    private fastify: FastifyInstance
    picture: picture
    match: match
    private static query_info: string = "SELECT username, email FROM user WHERE id=?"

    constructor(user_id: number, fastify: FastifyInstance) {
        this.fastify = fastify
        this.id = user_id
        this.picture = new picture(user_id, fastify)
        this.match = new match(user_id, fastify)
        console.log("new userManager: ", this.id)
    }

    async info() {
        const resp = await this.fastify.database.fetch_one(UserManager.query_info, [this.id])
        console.log(resp)
        return resp
    }
}
