import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { int } from "@babylonjs/core";
import { fileURLToPath } from "url"; 

export class Database extends sqlite3.Database {
    async fetch_all(query: string, params: any[] = []) {
        return new Promise<any[]>((resolve, reject) => {
            this.prepare(query).all(params, (err: Error, rows: string[]) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(rows);
            });
        });
    }

    async fetch_one(query: string, params: any[] = []) {
        return new Promise<any>((resolve, reject) => {
            this.prepare(query).get(params, (err: Error, row: any) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(row);
            });
        });
    }

}


export default fp(async function (
    fastify: FastifyInstance,
    options: FastifyPluginOptions,
) {
    const db = new Database("src/db/db.sqlite3");
    const __dirname = import.meta.dirname;
    console.log("dirname: ", __dirname); //test
    const schema = fs.readFileSync(
        path.join(__dirname, "../db/schema.sql"),
        "utf8",
    );
    db.exec(schema, (err) => {
        if (err) {
            fastify.log.error("Error initializing DB:", err.message);
        } else {
            fastify.log.info("Database initialized successfully.");
        }
    });

    fastify.decorate("database", db);
});
