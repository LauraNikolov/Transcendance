import ChatClient from "./chat/ChatClient.js";
import GameModeManager from "./play/GameModeManager.js";
import DashboardManager from "./dashboard/dashboard.js";
import { index_setup } from "./Index.js";
const site_map = ["home", "chat", "account", "dashboard", "play"];
function get_page() {
    return (window.location.href.substring(window.location.href.indexOf('#') + 1));
}
export async function move_to(to, force = false) {
    const current = get_page();
    if (to.length == 0)
        return;
    if (!force && current === to) {
        console.log("navigation: current page same as destination");
        return;
    }
    else if (!site_map.find((value, index, array) => { return value === to; })) {
        console.log(`navigation: invalid move to this destination => ${to}`);
        return;
    }
    try {
        const response = await fetch(to === "home" ? "/" : `/${to}`, {
            method: "GET",
            credentials: "include"
        });
        const main = await response.text();
        let old = document.getElementById("main_content");
        if (old) {
            old.innerHTML = "";
            old.outerHTML = main;
        }
        else {
            console.error("main not found");
            return;
        }
        if (to === "home") {
            index_setup();
        }
        if (to === "chat") {
            new ChatClient();
        }
        if (to === "play") {
            new GameModeManager();
        }
        if (to === "dashboard") {
            const dashboardManager = new DashboardManager();
            if (dashboardManager)
                dashboardManager.displayDashboard();
        }
        if (!force) {
            history.pushState(null, "", `#${to}`);
        }
    }
    catch (err) {
        console.error("move failed", err);
    }
}
export async function navbar() {
    // create navbar, add event listener on nav, all nav button must be registered here
    let nav = await fetch('/script/nav').then(async (response) => await response.text());
    const user = await fetch('/api/islogged').then(async (response) => await response.json());
    var target = document.body;
    if (user && user.autenticated) {
        nav = nav.replace('PLACEHOLDER_USERNAME', user.username);
    }
    if (target) {
        target.querySelector('nav')?.remove();
        target.insertAdjacentHTML("afterbegin", nav);
        const parser = new DOMParser();
        target.firstChild?.addEventListener("click", async function (e) {
            const target = e.target;
            if (target) {
                e.preventDefault();
                // ---- logout button listener ----
                if (target.id === "logout") {
                    try {
                        await fetch("/logout", {
                            method: "GET",
                            credentials: "include"
                        });
                        window.location.href = "/";
                    }
                    catch (err) {
                        console.error("Logout failed", err);
                    }
                }
                else {
                    move_to(target.id);
                }
            }
        });
    }
    else {
        console.error("Target element not found.");
    }
}
