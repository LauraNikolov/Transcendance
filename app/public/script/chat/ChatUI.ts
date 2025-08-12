import ChatClient from "./ChatClient.js";

export default class ChatUI {
  private chatClient: ChatClient;
  
  constructor(chatClient: any) {
    this.chatClient = chatClient;
  }

  initInputListeners() {
    const input = document.querySelector("textarea") as HTMLTextAreaElement;
    const sendBtn = document.getElementById("send-btn") as HTMLButtonElement;
    if (!input || !sendBtn) return;
  
    sendBtn.onclick = (e) => {
      e.preventDefault();
      this.sendInput(input);
    };
  
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toUpperCase().includes("MAC");
      if (e.key === "Enter" && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        this.sendInput(input);
      }
    });
  }
    
  private sendInput(input: HTMLTextAreaElement) {
    if (!input.value.trim()) return;
    this.chatClient.sendMessage(input.value);
    input.value = "";
  }

  async updateConvPreviewUI(targetId: string, targetName: string) {
    const allMessages = document.getElementById("all-messages");
    if (!allMessages) return (null);
    const displayed = allMessages.querySelector(`[data-user-id="${targetId}"]`);
    if (displayed) {
      displayed.classList.add("transition-all", "duration-300");
      allMessages.prepend(displayed);
    } else {
      const card = await this.chatClient.getBubbleHandler().loadTemplate("/chat/conv-preview.html");
      if (!card) return (null);
      card.setAttribute("data-user-id", targetId);
      const name = card.querySelector("p");
      if (name) name.textContent = targetName;
      return { card, allMessages };
    }
    return (null);
  }
}