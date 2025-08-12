import EventEmitter from "events";
import fastify, { FastifyBaseLogger, FastifyInstance, Session } from "fastify"
import { Statement } from 'sqlite3';
import { Database } from "../plugins/dbplugin.js";


class SessionStore extends EventEmitter {
    logger: FastifyBaseLogger
    db: Database;
    setSession: Statement;
    getSession: Statement;
    destroySession: Statement;

    constructor(fastifyDb: Database, fastifylog: FastifyBaseLogger) {
        super();
        this.logger = fastifylog;
        this.db = fastifyDb;
        this.setSession = this.db.prepare(`INSERT INTO session (sid, expires, session) VALUES (?, ?, ?) ON CONFLICT (sid) DO UPDATE SET session = excluded.session, expires = excluded.expires`)
        this.getSession = this.db.prepare(`SELECT sid, expires, session FROM session WHERE sid = ?`)
        this.destroySession = this.db.prepare(`DELETE FROM session WHERE sid = ?`)
    }

    set(sessionId: string, session: Session, callback: (err: Error | null, session?: Session) => void) {
        this.logger.info("set required for %s", sessionId)
        try {
            if (typeof session.cookie.expires === 'string') session.cookie.expires = new Date(session.cookie.expires);
            this.setSession.run(
                sessionId,
                session.cookie.expires?.toISOString(),
                JSON.stringify(session),
            )
            callback(null)
        } catch (err: any) {
            this.logger.error(err)
            if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                callback(null)
            } else {
                this.logger.error([err, sessionId,
                    session.cookie.expires?.toISOString(),
                    JSON.stringify(session)])
                callback(err)
            }
        }
    }

    get(sessionId: string, callback: (err: Error | null, session?: Session) => void) {
        type SessionRow = {
            sid: string;
            expires: string;
            session: string;
        }

        this.logger.info("get required for %s", sessionId)
        try {
            this.getSession.get(sessionId, (err: any, row: SessionRow | undefined) => {
                if (err) {
                    this.logger.error(err);
                    return callback(err);
                }
                let session = null
                if (!row || !row.session) {
                    this.logger.info("No session found for %s", sessionId);
                    return callback(null);
                }
                const found = JSON.parse(row.session)
                if (found.cookie.expires) {
                    if (new Date() < new Date(found.cookie.expires)) {
                        session = found
                    }
                } else {
                    session = found
                }
                this.logger.info("session found: %s", JSON.stringify(found))
                callback(null, session)
            })
        } catch (err: any) {
            this.logger.error(err);
            callback(err)
        }
    }

    destroy(sessionId: string, callback: (err: Error | null, session?: Session) => void) {
        this.logger.info("destroy required for %s", sessionId)
        try {
            this.destroySession.run(sessionId)
            callback(null)
        } catch (err: any) {
            this.logger.error(err);
            callback(err)
        }
    }
}
export default { SessionStore }
