import { Socket, Namespace} from "socket.io";
import SocketManager from "./SocketManager.js";

function listUsers(socket: Socket, chatNamespace: Namespace, socketManager: SocketManager) {
    const users = [];
    const userSockets = socketManager.getUserSockets();
    for (const [sessionId, socketIds] of userSockets) {
        const firstSocketId = socketIds.values().next().value;
        const sock = chatNamespace.sockets.get(firstSocketId!);
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

function notifyUsers(socket: Socket) {
    socket.broadcast.emit("User connected", {
        userId: socket.session.userId.toString(),
        username: socket.username,
    });
}

export default function getActiveUsers(socket: Socket, chatNamespace: Namespace, socketManager: SocketManager) {
    listUsers(socket, chatNamespace, socketManager);
    notifyUsers(socket);
}