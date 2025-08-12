export default class HistoryManager {
    constructor(chatClient) {
        this.chatClient = chatClient;
    }
    async openFirstConv() {
        const convContainer = document.getElementById("conversation-container");
        const chatWindow = await this.chatClient.getBubbleHandler().loadTemplate("/chat/chat-window.html");
        if (!chatWindow || !convContainer)
            return;
        const p = document.getElementById("conv-placeholder");
        if (p)
            p.remove();
        convContainer.appendChild(chatWindow);
        const input = document.querySelector('textarea');
        this.chatClient.setInputListeners();
        this.chatClient.getOptionHandler().initDropdownListeners();
    }
    async fetchMessageHistory(targetId) {
        try {
            const res = await fetch(`/api/chat/messages?target=${targetId}`);
            const data = await res.json();
            if (res.status === 500 || res.status === 404) {
                console.error(data.message);
                return (null);
            }
            return (data);
        }
        catch (err) {
            console.error("Failed to fetch or parse JSON:", err);
            return (null);
        }
    }
    async displayMessageHistory(targetId) {
        const messages = await this.fetchMessageHistory(targetId);
        if (messages) {
            for (const entry of messages) {
                const message = {
                    content: entry.content,
                    senderId: entry.sender_id.toString(),
                    sentAt: entry.sent_at
                };
                const isSent = message.senderId === targetId;
                await this.chatClient.getBubbleHandler().addChatBubble(isSent, message, targetId);
            }
        }
        else
            console.error("Failed to fetch messages for conversation with target: ", targetId);
    }
    async openChat(user) {
        if (!document.getElementById("chat-window"))
            await this.openFirstConv();
        const chatBox = document.getElementById("conversation-box");
        const recipientName = document.getElementById("recipient-name");
        if (!chatBox || !recipientName)
            return;
        chatBox.innerHTML = "";
        recipientName.textContent = user.username;
        this.displayMessageHistory(user.userId);
        this.chatClient.getOptionHandler().getBlockManager().checkBlockedTarget();
    }
}
