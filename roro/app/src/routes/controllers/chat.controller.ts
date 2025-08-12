import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

// GET /api/chat/messages?target=1
export function getMessages(fastify: FastifyInstance) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const { target } = request.query as { target: string };
    const userId = request.session.userId!;
    const targetId = parseInt(target);
    let [user1, user2] = [userId, targetId].sort((a, b) => a - b);
    try {
      const messages = await fastify.database.fetch_all(
        `SELECT 
           m.id AS message_id,
           m.content,
           m.sent_at,
           m.sender_id,
           m.conversation_id
        FROM messages m
        INNER JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.user1_id = ? AND c.user2_id = ?)
        ORDER BY m.id ASC`,
        [user1, user2]
      );
      if (!messages || messages.length === 0) return reply.status(404).send({ message: "No messages found" });
      reply.send(messages);
    } catch (err) {
      console.error("Failed to fetch messages", err);
      reply.status(500).send({ error: "Database error" });
    }
  };
}

// GET /api/chat/blocked
export function getBlocked(fastify: FastifyInstance) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const blockerId = request.session.userId;
      const blockedUsers = await fastify.database.fetch_all(
        `SELECT blocked_id FROM blocks WHERE blocker_id = ?`,
        [blockerId]
      );
      if (!blockedUsers) return (reply.status(404).send({ message: "No blocked users" }));
      return (reply.send(blockedUsers));
    } catch (err) {
      console.error("Failed to fetch blocked users", err);
      reply.status(500).send({ error: "Database error" });
    }
  }
}
