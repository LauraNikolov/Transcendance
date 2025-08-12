import HistoryManager from "./HistoryManager.js";
export default class UserManager {
    constructor(chatClient) {
        this.activeUsers = [];
        this.targetUsers = [];
        this.targetId = null;
        this.convId = null;
        this.targetToConvId = new Map();
        this.socket = chatClient.getSocket();
        this.chatUI = chatClient.getChatUI();
        this.historyManager = new HistoryManager(chatClient);
        this.initUserListeners();
    }
    getTargetId() {
        return (this.targetId);
    }
    getConvId() {
        return (this.convId);
    }
    initUserListeners() {
        this.socket.on("users", (newUsers) => {
            newUsers = newUsers.sort((a, b) => {
                if (a.self)
                    return -1;
                if (b.self)
                    return 1;
                if (a.username < b.username)
                    return -1;
                return a.username > b.username ? 1 : 0;
            });
            this.activeUsers = newUsers;
            this.displayActiveUsers();
        });
        this.socket.on("user connected", (user) => {
            this.activeUsers.push(user);
            this.displayActiveUsers();
        });
    }
    addActiveUser(userList, user) {
        const li = document.createElement("li");
        li.textContent = user.username;
        if (user.self)
            return;
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
            this.targetId = user.userId;
            this.convId = this.targetToConvId.get(this.targetId);
            this.historyManager.openChat(user);
        });
        userList.appendChild(li);
    }
    displayActiveUsers() {
        const userList = document.getElementById("user-list");
        if (!userList)
            return;
        userList.innerHTML = "";
        this.activeUsers.forEach((user) => {
            this.addActiveUser(userList, user);
        });
    }
    loadConversations(conversations, convInfo) {
        if (!conversations || conversations.length === 0) {
            console.log("No conversations found.");
        }
        else {
            for (const conv of conversations) {
                const otherUsername = convInfo[conv.otherUserId];
                if (otherUsername)
                    this.updateConvPreview(conv.otherUserId.toString(), otherUsername);
                this.targetToConvId.set(conv.otherUserId.toString(), conv.id);
                this.targetUsers.push({
                    userId: conv.otherUserId.toString(),
                    username: otherUsername,
                    self: false
                });
            }
        }
    }
    getTargetUsername(otherUserId, senderUsername, isSent) {
        if (isSent) {
            const targetUser = this.targetUsers.find(u => u.userId === otherUserId.toString());
            if (targetUser)
                return (targetUser.username);
            const activeTargetUser = this.activeUsers.find(u => u.userId === otherUserId.toString());
            if (activeTargetUser)
                return (activeTargetUser.username);
        }
        else
            return (senderUsername);
        console.warn("No target user found for ID:", otherUserId);
        return ("Unknown User");
    }
    async updateConvPreview(userId, targetName) {
        const res = await this.chatUI.updateConvPreviewUI(userId, targetName);
        if (!res)
            return;
        const { card, allMessages } = res;
        card.addEventListener("click", () => {
            this.targetId = userId;
            this.convId = this.targetToConvId.get(this.targetId);
            this.historyManager.openChat({ userId: userId, username: targetName, self: false });
        });
        allMessages.prepend(card);
    }
}
