export function index_setup() {
    document.getElementsByTagName("main")?.item(0)?.addEventListener('click', async (e) => {
        const target = e.target;
        if (target) {
            const user = await fetch('/api/islogged').then(async (response) => await response.json());
            // ---- play button listener ----
            if (target.id === "get_started_button" && user && user.autenticated) {
                const n = document.getElementById("Pong_game_content");
                let old = document.getElementById("main_content");
                if (old) {
                    old?.classList.add("hidden");
                    n?.classList.remove("hidden");
                }
                else
                    console.error("main not found");
            }
            else {
                console.warn("Pas authentifié: ", user, user.authenticated);
            }
        }
    });
}
