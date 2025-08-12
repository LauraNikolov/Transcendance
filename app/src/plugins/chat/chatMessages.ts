import { FastifyInstance } from "fastify";
import { Socket, Namespace } from "socket.io";
import { runInsertConversation, runInsertMessage } from "./chatHistory.js";
import { checkBlockedTarget } from "./chatBlocks.js";
import { Message } from "./chatTypes.js";
import SocketManager from "./SocketManager.js";

export let currConvId = 0;

export async function getAllConversations(fastify: FastifyInstance, userId: number, chatNamespace: Namespace, socketManager: SocketManager) {
    try {
        const convInfo: Record<number, string> = {};
        const conversations = await fastify.database.fetch_all(
        `SELECT id, 
        CASE WHEN user1_id = ? THEN user2_id ELSE user1_id END AS otherUserId
        FROM conversations WHERE user1_id = ? OR user2_id = ?`,
        [userId, userId, userId]
        );
        for (const conv of conversations) {
          const username = await socketManager.getUsername(conv.otherUserId);
          if (username) convInfo[conv.otherUserId] = username;
        }

        chatNamespace.to(userId.toString()).emit("allConversations", conversations, convInfo);
    } catch (err) {
        console.error("Failed to fetch conversations", err);
    }
}

async function getOrCreateConversation(fastify: FastifyInstance, senderId: number,
    targetId: number): Promise<number> {
    try {
        let [user1, user2] = [senderId!, targetId!].sort((a, b) => a - b);
        const conv = await fastify.database.fetch_one(
          `SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?`,
          [user1, user2]
        );

        if (conv) return (conv.id);
        const conversationId = await runInsertConversation(fastify, user1, user2);

        return (conversationId);
    } catch (err) {
        console.error("Failed to create or get conversation: ", err);
        return (-1);
    }
}

async function insertMessage(fastify: FastifyInstance, msg: Message, socket: Socket): Promise<number> {
    try {
        const messageId = await runInsertMessage(fastify, msg, socket);

        return (messageId);
    } catch (err) {
        console.error("Failed to insert message: ", err);
        return (-1);
    }
}

export async function handleMessages(fastify: FastifyInstance, socket: Socket, chatNamespace: Namespace) {
    socket.on("message", async (msg: Message, callback) => {
        try {
            msg.senderId = socket.session.userId;
            msg.senderUsername = socket.username; 
            const senderBlocked = await checkBlockedTarget(msg.senderId, parseInt(msg.targetId!), fastify);
            const conversationId = await getOrCreateConversation(fastify, socket.session.userId, parseInt(msg.targetId!));
            if (conversationId === -1) return (callback({ status: "DBerror" }));
            msg.convId = currConvId = conversationId;
            msg.serverOffset = await insertMessage(fastify, msg, socket);
            msg.isSent = false;
            if (!senderBlocked) chatNamespace.to(msg.targetId!).emit("message", msg);
            msg.isSent = true;
            chatNamespace.to(msg.senderId.toString()).emit("message", msg);
            return callback({ status: "ok", serverOffset: msg.serverOffset });
        } catch (err: any) {
            if (err.errno === "SQLITE_CONSTRAINT") callback({ status: "duplicate" });
            console.error("Message insert failed:", err);
            callback({ status: "retry" });
        }
    });
}