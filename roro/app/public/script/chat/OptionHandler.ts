import ChatClient from "./ChatClient.js";
import BlockManager from "./BlockManager.js";
import InviteManager from "./InviteManager.js";

export default class OptionHandler {
  private chatClient: ChatClient;
  private blockManager: BlockManager | null = null;
  private inviteManager: InviteManager | null = null;
  private tournamentText: HTMLElement | null = null;
  private tournamentSection: HTMLElement | null = null;

  constructor(chatClient: ChatClient) {
    this.chatClient = chatClient;
    this.tournamentText = document.getElementById("tournament-text");
    this.tournamentSection = document.getElementById("tournament-section");
    this.initTournamentListener();
  }

  getBlockManager() {
    return (this.blockManager!);
  }

  private initTournamentListener() {
    this.chatClient.getSocket().on("newTournament", (players: string[]) => {
      this.tournamentText!.textContent = `New tournament starting with players: ${players.join(", ")}`;
      this.tournamentSection!.classList.remove("hidden");
      console.log("Players in tournament:", players); 
    });
  }

  initDropdownListeners() {
    const optionsIcon = document.getElementById("options-icon") as HTMLElement;
    const optionsMenu = document.getElementById("options-menu") as HTMLElement;
    this.blockManager = new BlockManager(this.chatClient);
    this.inviteManager = new InviteManager(this.chatClient);
      
    const toggleDropdown = (show: boolean) => {
      if (show) {
        optionsMenu.classList.remove("opacity-0", "scale-20", "pointer-events-none");
        optionsMenu.classList.add("opacity-100", "scale-100", "pointer-events-auto");
      } else {
        optionsMenu.classList.add("opacity-0", "scale-20", "pointer-events-none");
        optionsMenu.classList.remove("opacity-100", "scale-100", "pointer-events-auto");
      }
    };
  
    optionsIcon.addEventListener("click", () => {
      const show = optionsMenu.classList.contains("opacity-0");
      toggleDropdown(show);
      });
  
    document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (!optionsIcon.contains(target) && !optionsMenu.contains(target)) {
          optionsMenu.classList.add("opacity-0", "scale-20", "pointer-events-none");
          optionsMenu.classList.remove("opacity-100", "scale-100", "pointer-events-auto");
      }
    });
  
    optionsMenu.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        if (!action) return;    
        switch(action) {
          case "invite-game":
            this.inviteManager!.inviteToGame();
            break;
          case "block-user":
            this.blockManager!.blockOrUnblockUser(this.chatClient);
            break;
        }
        toggleDropdown(false);
    });
  }
}