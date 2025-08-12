import { EventEmitter } from 'events';
function getTwoRandomPlayers(players) {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return [shuffled[0], shuffled[1]];
}
export class WaitList extends EventEmitter {
    constructor() {
        super();
        this.mapPlayer = new Map();
        console.log("WaitList class created");
        this.createMatch();
    }
    addRemote(player) {
        this.mapPlayer.set(player.session.userId.toString(), player);
    }
    removePlayer(userId) {
        const wasInWaitlist = this.mapPlayer.has(userId.toString());
        if (wasInWaitlist) {
            this.mapPlayer.delete(userId.toString());
        }
        return wasInWaitlist;
    }
    createMatch() {
        setInterval(() => {
            if (this.mapPlayer.size >= 2) {
                const playersArray = Array.from(this.mapPlayer.values());
                const [player1, player2] = getTwoRandomPlayers(playersArray);
                this.mapPlayer.delete(player1.session.userId.toString());
                this.mapPlayer.delete(player2.session.userId.toString());
                console.log(`Match created between ${player1.username} and ${player2.username}`);
                this.emit('RemoteMatchCreated', { player1, player2 });
                if (player1.socket && player2.socket) {
                    console.log("socket.id joueur 1 =", player1.socket?.id);
                    console.log("socket.id joueur 2 =", player2.socket?.id);
                    player1.socket.emit('match_found', { opponent: player2.username });
                    player2.socket.emit('match_found', { opponent: player1.username });
                }
            }
        }, 1000);
    }
}
