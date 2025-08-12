export default class ChatUI {
    constructor(chatClient) {
        this.chatClient = chatClient;
    }
    initInputListeners() {
        const input = document.querySelector("textarea");
        const sendBtn = document.getElementById("send-btn");
        if (!input || !sendBtn)
            return;
        sendBtn.onclick = (e) => {
            e.preventDefault();
            this.sendInput(input);
        };
        input.addEventListener("keydown", (e) => {
            const isMac = navigator.userAgent.toUpperCase().includes("MAC");
            if (e.key === "Enter" && (isMac ? e.metaKey : e.ctrlKey)) {
                e.preventDefault();
                this.sendInput(input);
            }
        });
    }
    sendInput(input) {
        if (!input.value.trim())
            return;
        this.chatClient.sendMessage(input.value);
        input.value = "";
    }
    async updateConvPreviewUI(targetId, targetName) {
        const allMessages = document.getElementById("all-messages");
        if (!allMessages)
            return (null);
        const displayed = allMessages.querySelector(`[data-user-id="${targetId}"]`);
        if (displayed) {
            displayed.classList.add("transition-all", "duration-300");
            allMessages.prepend(displayed);
        }
        else {
            const card = await this.chatClient.getBubbleHandler().loadTemplate("/chat/conv-preview.html");
            if (!card)
                return (null);
            card.setAttribute("data-user-id", targetId);
            const name = card.querySelector("p");
            if (name)
                name.textContent = targetName;
            return { card, allMessages };
        }
        return (null);
    }
}
