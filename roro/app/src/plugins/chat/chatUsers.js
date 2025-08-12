function listUsers(socket, chatNamespace, socketManager) {
    const users = [];
    const userSockets = socketManager.getUserSockets();
    for (const [sessionId, socketIds] of userSockets) {
        const firstSocketId = socketIds.values().next().value;
        const sock = chatNamespace.sockets.get(firstSocketId);
        if (sock) {
            users.push({
                userId: sessionId.toString(),
                username: sock.username,
                self: sock.session.userId === socket.session.userId
            });
        }
    }
    socket.emit("users", users);
}
function notifyUsers(socket) {
    socket.broadcast.emit("User connected", {
        userId: socket.session.userId.toString(),
        username: socket.username,
    });
}
export default function getActiveUsers(socket, chatNamespace, socketManager) {
    listUsers(socket, chatNamespace, socketManager);
    notifyUsers(socket);
}
