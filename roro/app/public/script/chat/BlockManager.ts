import ChatClient from "./ChatClient.js";

export default class BlockManager {
    private blockedUsers: string[] = [];
    private targetBlocked: boolean = false;
    private chatClient: ChatClient;

    constructor(chatClient: ChatClient) {
        this.chatClient = chatClient;
        this.fetchBlockedUsers();
    }

    private async fetchBlockedUsers() {
        try {
            const res = await fetch(`/api/chat/blocked`);
            const data = await res.json();
            if (res.status === 404 || res.status === 500) {
              console.log(data.message);
              return;
            }
            this.blockedUsers = (data as { blocked_id: number }[]).map(u => u.blocked_id.toString());
        } catch (err) {
            console.error("Failed to fetch or parse JSON:", err);
        }
    }

    private toggleBlockedMsg() {
        const blockedBtn = document.querySelector('[data-action="block-user"]') as HTMLElement;
        const blockedMsg = document.getElementById("blocked-msg") as HTMLElement;
        if (!blockedBtn || !blockedMsg) return;
        if (this.targetBlocked) {
            blockedMsg.classList.remove("hidden");
            blockedBtn.textContent = "Unblock user";
        } else if (!this.targetBlocked) {
            blockedMsg.classList.add("hidden");
            blockedBtn.textContent = "Block user";
        }
    }
    
    checkBlockedTarget(): boolean {
        const targetId = this.chatClient.getUserManager().getTargetId();
        this.targetBlocked = this.blockedUsers.includes(targetId!);
        this.toggleBlockedMsg();
        return (this.targetBlocked);
    }
    
    blockOrUnblockUser(chatClient: ChatClient) {
        const socket = chatClient.getSocket();
        const targetId = this.chatClient.getUserManager().getTargetId();
        this.targetBlocked = this.checkBlockedTarget();
        socket.emit("blockUser", { targetId: parseInt(targetId!), block: !this.targetBlocked }, (response: { status: string }) => {
            if (response) console.log("Response from server: ", response.status);
        });
        if (!this.targetBlocked) this.blockedUsers.push(targetId!);
        else {
            const index = this.blockedUsers.indexOf(targetId!);
            if (index !== -1) this.blockedUsers.splice(index, 1);
        }
        this.checkBlockedTarget();
    }
}