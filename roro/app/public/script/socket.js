let socket = null;
export function connectSocket(url) {
    const socketUrl = url || 'http://localhost:8080';
    if (socket && socket.connected) {
        if (socket.io.uri !== socketUrl) {
            console.log("URL de socket changée, déconnexion de l'ancienne...");
            socket.disconnect();
            socket = null;
        }
        else {
            console.log("Socket déjà connecté à", socketUrl);
            return socket;
        }
    }
    console.log("Connexion à la socket:", socketUrl);
    socket = io(socketUrl);
    window.socket = socket;
    socket.on('connect', () => {
        console.log("Connecté au serveur Socket.IO avec id =", socket?.id);
    });
    socket.on('disconnect', (reason) => {
        console.log("Déconnecté du serveur Socket.IO :", reason);
    });
    socket.on('log', (message) => {
        console.log("[log serveur]", message);
    });
    return socket;
}
export function log(message) {
    if (!socket || !socket.connected) {
        console.warn("Socket non connecté, impossible d'envoyer le message");
        return;
    }
    socket.emit('log', message);
}
export function logout() {
    if (!socket)
        return;
    socket.disconnect();
    socket = null;
    if (window.socket) {
        window.socket = null;
    }
    console.log("Socket déconnecté (logout)");
}
export function reconnectSocket(newUrl) {
    console.log("Reconnexion socket vers:", newUrl);
    if (socket) {
        socket.disconnect();
    }
    socket = null;
    return connectSocket(newUrl);
}
export function getCurrentSocket() {
    return socket;
}
export { socket };
