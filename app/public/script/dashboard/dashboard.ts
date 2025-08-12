import renderCharts from "./renderCharts.js";
import { loadView } from "./chartUtils.js";

export interface userStats {
  totalGames: number;
  winRate: number;
  currentWinStreak: number;
  longestWinStreak: number;
  totalGoalsScored: number; 
  gamesPerDay: { [date: string]: number };
  winRateOverTime: { date: string; winRate: number }[];
}

interface gameStats {
  opponent: string;
  date: string;
  mode: string;
  winner: boolean;  
  currScore: number;
  oppScore: number;
  accuracy: number;
}

export default class DashboardManager {
  private gameStatsBtn;
  private dashboardBtn;
  private dashboardContent;
  private currentView;
  private userStats: userStats | null;
  private gameStats: gameStats[] | null;

  constructor() {
    this.userStats = null;
    this.gameStats = null;
    this.gameStatsBtn = document.getElementById("game-stats-btn");
	  this.dashboardBtn = document.getElementById("dashboard-btn");
	  this.dashboardContent = document.getElementById("dashboard-content");
    if (!this.gameStatsBtn || !this.dashboardContent || !this.dashboardBtn) console.log("Error loading DOM elements.");
    this.currentView = "user-dashboard";
  }

  private async fetchStats(): Promise<userStats | null> {
    try {
      const res = await fetch(`/api/dashboard/stats`);
      const data = await res.json();
      if (res.status === 404 || res.status === 500) {
        console.log(data.message);
        return (null);
      }
      return (data);
    } catch (err) {
      console.error("Failed to fetch or parse JSON:", err);
      return (null);
    }
  }

  private async initDashboard() {
    const view = await loadView("/dashboard/user-dashboard.html");
	  if (view) this.dashboardContent!.appendChild(view);
    this.userStats = await this.fetchStats();
    if (!this.userStats) {
      console.log("Error loading game stats.");
      return;
    }
  }

  private displaySimpleStats() {
    const gamesPlayed = document.getElementById("games-played");
    const currWinStreak = document.getElementById("current-streak");
    const longestWinStreak = document.getElementById("longest-streak");
    if (!gamesPlayed || !currWinStreak || !longestWinStreak) return;

    gamesPlayed.textContent = this.userStats!.totalGames.toString();
    currWinStreak.textContent = this.userStats!.currentWinStreak.toString();
    longestWinStreak.textContent = `Longest win streak: ${this.userStats!.longestWinStreak.toString()}`;
  }

  private renderGameStats() {
    // fetch game stats
    for (const game of this.gameStats!) {
      const entry = `
        <div class="flex justify-between px-4 py-2 text-sm text-gray-700 bg-white rounded-xl m-1">
        <span class="w-1/6 text-left">${game.opponent}</span>
        <span class="w-1/6 text-left">${game.date}</span>
        <span class="w-1/6 text-left">${game.mode}</span>
        <span class="w-1/6 text-left">${game.winner ? "Win" : "Loose"}</span>
        <span class="w-1/6 text-left">${game.currScore + " - " + game.oppScore}</span>
        <span class="w-1/6 text-left">${game.accuracy + "%" }</span>
        </div>`;
    }
  }

  async initBtn(view: string, selectedbtn: HTMLElement, unselectedbtn: HTMLElement) {
	selectedbtn.addEventListener("click", async () => {
		if (this.currentView === view) return;
		this.currentView = view;
		unselectedbtn.classList.remove("selected-button-style");
		selectedbtn.classList.add("selected-button-style");
		unselectedbtn.classList.add("button-style");
		selectedbtn.classList.remove("button-style");
		const newView = await loadView(`/dashboard/${view}.html`);
		if (newView) {
			this.dashboardContent!.innerHTML = "";
			this.dashboardContent!.appendChild(newView);
      if (view === "user-dashboard"){
        this.displaySimpleStats();
        renderCharts(this.userStats!);
      }
      else this.renderGameStats();
		}
	});
}

  async displayDashboard() {
    await this.initDashboard();
    await this.initBtn("game-stats", this.gameStatsBtn!, this.dashboardBtn!);
  	await this.initBtn("user-dashboard", this.dashboardBtn!, this.gameStatsBtn!);
    this.displaySimpleStats();
    renderCharts(this.userStats!);
  }
}


