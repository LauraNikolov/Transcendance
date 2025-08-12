import { initForm } from "./form.js";
import { index_setup } from "./Index.js";
import { move_to, navbar } from "./N_nav.js";
await navbar();
initForm();
index_setup();
window.addEventListener("popstate", () => {
    const target = window.location.hash.replace("#", "") || "home";
    move_to(target, true);
});
