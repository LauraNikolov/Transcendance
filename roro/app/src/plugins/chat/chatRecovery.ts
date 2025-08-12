import { FastifyInstance } from "fastify";
import { Socket, Namespace } from "socket.io";
import { currConvId } from "./chatMessages.js";
import { Message } from "./chatTypes.js";

export default async function handleRecovery(socket: Socket, fastify: FastifyInstance, chatNamespace: Namespace) {

    if (!socket.recovered) {
      try {
        const valid = await fastify.database.fetch_one(
          `SELECT 1 FROM conversations 
           WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
          [currConvId, socket.session.userId, socket.session.userId]
        );
        if (!valid) return;
        const messages = await fastify.database.fetch_all(
          `SELECT id, content, sender_id, sent_at FROM messages
           WHERE conversation_id = ? AND id > ? 
           ORDER BY id ASC`,
          [currConvId, socket.handshake.auth.serverOffset || 0]
          );
        for (const entry of messages) {
          const msg: Message = {
          isSent: entry.sender_id === socket.session.userId,
          senderId: entry.sender_id,
          content: entry.content,
          sentAt: entry.sent_at,
          serverOffset: entry.id,
          }

          chatNamespace.to(socket.session.userId!.toString()).emit("message", msg);
        }
      } catch (err) {
        console.error("Message recovery failed:", err);
      }
    }
  }
  