import BlockManager from "./BlockManager.js";
import InviteManager from "./InviteManager.js";
export default class OptionHandler {
    constructor(chatClient) {
        this.blockManager = null;
        this.inviteManager = null;
        this.tournamentText = null;
        this.tournamentSection = null;
        this.chatClient = chatClient;
        this.tournamentText = document.getElementById("tournament-text");
        this.tournamentSection = document.getElementById("tournament-section");
        this.initTournamentListener();
    }
    getBlockManager() {
        return (this.blockManager);
    }
    initTournamentListener() {
        this.chatClient.getSocket().on("newTournament", (players) => {
            this.tournamentText.textContent = `New tournament starting with players: ${players.join(", ")}`;
            this.tournamentSection.classList.remove("hidden");
            console.log("Players in tournament:", players);
        });
    }
    initDropdownListeners() {
        const optionsIcon = document.getElementById("options-icon");
        const optionsMenu = document.getElementById("options-menu");
        this.blockManager = new BlockManager(this.chatClient);
        this.inviteManager = new InviteManager(this.chatClient);
        const toggleDropdown = (show) => {
            if (show) {
                optionsMenu.classList.remove("opacity-0", "scale-20", "pointer-events-none");
                optionsMenu.classList.add("opacity-100", "scale-100", "pointer-events-auto");
            }
            else {
                optionsMenu.classList.add("opacity-0", "scale-20", "pointer-events-none");
                optionsMenu.classList.remove("opacity-100", "scale-100", "pointer-events-auto");
            }
        };
        optionsIcon.addEventListener("click", () => {
            const show = optionsMenu.classList.contains("opacity-0");
            toggleDropdown(show);
        });
        document.addEventListener("click", (e) => {
            const target = e.target;
            if (!optionsIcon.contains(target) && !optionsMenu.contains(target)) {
                optionsMenu.classList.add("opacity-0", "scale-20", "pointer-events-none");
                optionsMenu.classList.remove("opacity-100", "scale-100", "pointer-events-auto");
            }
        });
        optionsMenu.addEventListener("click", (e) => {
            const target = e.target;
            const action = target.dataset.action;
            if (!action)
                return;
            switch (action) {
                case "invite-game":
                    this.inviteManager.inviteToGame();
                    break;
                case "block-user":
                    this.blockManager.blockOrUnblockUser(this.chatClient);
                    break;
            }
            toggleDropdown(false);
        });
    }
}
