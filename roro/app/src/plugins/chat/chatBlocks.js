export async function checkBlockedTarget(senderId, targetId, fastify) {
    try {
        const isBlocked = await fastify.database.fetch_one(`SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?`, [targetId, senderId]);
        // console.log(`${senderId} blocked by ${targetId} isBlocked = ${isBlocked ? true : false}`); // ! DEBUG
        return (isBlocked ? true : false);
    }
    catch (err) {
        console.error("Error checking blocked target:", err);
        return (null);
    }
}
async function runInsertBlock(fastify, blockerId, blockedId) {
    return new Promise((resolve, reject) => {
        fastify.database.run(`INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)`, [blockerId, blockedId], function (err) {
            if (err) {
                console.error("Failed to insert blocked user:", err.message);
                return (reject(err));
            }
            resolve();
        });
    });
}
async function runDeleteBlock(fastify, blockerId, blockedId) {
    return new Promise((resolve, reject) => {
        fastify.database.run(`DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`, [blockerId, blockedId], function (err) {
            if (err) {
                console.error("Failed to insert blocked user:", err.message);
                return (reject(err));
            }
            resolve();
        });
    });
}
export function handleBlocks(socket, fastify) {
    socket.on("blockUser", async (blocked, callback) => {
        try {
            const targetId = blocked.targetId;
            if (blocked.block) {
                await runInsertBlock(fastify, socket.session.userId, targetId);
                return callback({ status: "blocked" });
                // console.log(`User ${socket.session.userId} blocked user ${targetId}, block ID: ${blockId}`); // ! DEBUG
            }
            else if (!blocked.block) {
                await runDeleteBlock(fastify, socket.session.userId, targetId);
                return callback({ status: "unblocked" });
                // console.log(`User ${socket.session.userId} unblocked user ${targetId}, result: ${res}`); // ! DEBUG
            }
        }
        catch (err) {
            console.error("Error handling blockUser event:", err);
            callback({ status: "error" });
        }
    });
}
