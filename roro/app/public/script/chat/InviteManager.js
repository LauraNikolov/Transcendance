export default class InviteHandler {
    constructor(chatClient) {
        this.targetInvited = false;
        this.chatClient = chatClient;
        this.socket = chatClient.getSocket();
        this.initInviteListeners();
    }
    initInviteListeners() {
        this.socket.on("inviteToGame", (inviterUsername, inviterId) => {
            this.showInvitePopup(inviterUsername, inviterId);
            console.log(`Invitation received from user ${inviterUsername}`);
        });
        this.socket.on("getResponse", (invitedId, accepted) => {
            if (!accepted)
                this.toggleInviteMsg();
            console.log(`Invitation accepted : ${accepted} by ${invitedId}`);
        });
    }
    initPopupListeners(inviterId) {
        const closeBtn = document.getElementById("close-popup-btn");
        const playBtn = document.getElementById("play-btn");
        const popup = document.getElementById("game-invite-popup");
        const targetId = this.chatClient.getUserManager().getTargetId();
        if (!closeBtn || !playBtn || !popup)
            return;
        closeBtn.addEventListener("click", () => {
            popup.remove();
            this.socket.emit("respondToGameInvite", inviterId, false);
        });
        playBtn.addEventListener("click", () => {
            popup.remove();
            this.socket.emit("respondToGameInvite", inviterId, true);
            console.log("Play game button clicked");
        });
    }
    async showInvitePopup(inviterUsername, inviterId) {
        const mainDiv = document.getElementById("main_content");
        if (!mainDiv)
            console.error("Main content div not found.");
        const popup = await this.chatClient.getBubbleHandler().loadTemplate("/chat/chat-popup.html");
        if (!mainDiv || !popup)
            return;
        mainDiv.appendChild(popup);
        const inviterName = document.getElementById("inviter-name");
        if (!inviterName)
            return;
        inviterName.textContent = inviterUsername;
        this.initPopupListeners(inviterId);
    }
    toggleInviteMsg() {
        const btn = document.querySelector('[data-action="invite-game"]');
        if (this.targetInvited) {
            btn.textContent = "Invitation sent";
            btn.classList.add("text-gray-500", "pointer-events-none");
            btn.classList.remove("text-gray-900", "pointer-events-auto");
        }
        else {
            btn.textContent = "Invite to game";
            btn.classList.remove("text-gray-500");
            btn.classList.add("hover:bg-blue-200", "text-gray-900");
        }
    }
    inviteToGame() {
        const targetId = this.chatClient.getUserManager().getTargetId();
        this.socket.emit("inviteToGame", targetId);
        this.targetInvited = !this.targetInvited;
        this.toggleInviteMsg();
    }
}
