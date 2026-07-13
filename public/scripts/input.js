// ── CONTROLES ──
const keys = {};

// ── GAMEPAD ──
let gamepadIndex = null;
window.addEventListener("gamepadconnected", (e) => {
    gamepadIndex = e.gamepad.index;
    console.log("Mando conectado:", e.gamepad.id);
});
window.addEventListener("gamepaddisconnected", () => {
    gamepadIndex = null;
    console.log("Mando desconectado");
});

function getGamepad() {
    if (gamepadIndex === null) return null;
    return navigator.getGamepads()[gamepadIndex] || null;
}

const shootDir = { x: 0, y: -1 };

let startWasPressed = false;
function checkGamepadPause() {
    const gp = getGamepad();
    if (!gp) { startWasPressed = false; return; }
    const isPressed = gp.buttons[9]?.pressed;
    if (isPressed && !startWasPressed) togglePause();
    startWasPressed = !!isPressed;
}

let introSkipWasPressed = false;
function checkGamepadIntroSkip() {
    const gp = getGamepad();
    if (!gp || typeof introFinishFn !== "function") {
        introSkipWasPressed = false;
        return;
    }
    const anyPressed = gp.buttons.some(b => b.pressed);
    if (anyPressed && !introSkipWasPressed) {
        introFinishFn();
    }
    introSkipWasPressed = anyPressed;
}

window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === " " || e.key === "Spacebar" || e.key === "C") e.preventDefault();
    if (e.key === "P" || e.key === "p") togglePause();
});
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// ── NAVEGACIÓN DE MENÚS CON MANDO ──
// Menús y sus botones en orden de navegación
const MENU_BUTTONS = {
    mainMenuScene: [".btn-play", ".btn-controls-main", ".btn-settings-main", ".btn-credits-main"],
    pauseMenu: [".btn-primary", ".btn-secondary", ".btn-terciary", ".btn-ghost"],
    gameOverMenu: [".btn-primary", ".btn-ghost"],
    winMenu: [".btn-primary", ".btn-secondary", ".btn-terciary", ".btn-ghost"],
};

// Elementos navegables del overlay de configuración en orden
const CONFIG_SELECTORS = [
    { sel: "#sliderMusic", type: "slider" },
    { sel: "#sliderSFX", type: "slider" },
    { sel: "#settingsCloseBtn", type: "button" },
];

let menuFocusIndex = 0;       // botón actualmente enfocado
let menuNavCooldown = 0;      // evita que el stick navegue demasiado rápido
let aWasPressed = false;      // evita repetición del botón A
let currentMenuId = null;     // menú activo actualmente
let configFocusIndex = 0;
let configHeld = 0; // para que el slider se mueva fluidamente al mantener

// Detecta qué menú está visible ahora mismo
function getActiveMenuId() {
    // Configuración — menú especial con toggles y sliders
    const settings = document.getElementById("settings-overlay");
    if (settings && settings.classList.contains("active")) return "settings-overlay";

    // Otros submenús — solo B para cerrar
    for (const id of ["controls-overlay", "credits-overlay"]) {
        const el = document.getElementById(id);
        if (el && el.classList.contains("active")) return "submenu:" + id;
    }
    // Menú principal
    const main = document.getElementById("mainMenuScene");
    if (main && main.style.display !== "none" && main.style.display !== "") {
        return "mainMenuScene";
    }
    // Overlays del juego
    for (const id of ["pauseMenu", "gameOverMenu", "winMenu"]) {
        const el = document.getElementById(id);
        if (el && el.classList.contains("active")) return id;
    }
    return null;
}

function checkGamepadConfig(gp) {
    const container = document.getElementById("settings-overlay");
    if (!container) return;

    // Obtiene elementos en orden
    const elements = CONFIG_SELECTORS.map(c => ({
        el: container.querySelector(c.sel),
        type: c.type
    })).filter(c => c.el);

    if (elements.length === 0) return;

    // Aplica foco visual
    elements.forEach((c, i) => {
        c.el.classList.toggle("gamepad-focus", i === configFocusIndex);
    });

    // Navegación vertical
    if (menuNavCooldown === 0) {
        const ly = gp.axes[1];
        const dpadUp = gp.buttons[12]?.pressed;
        const dpadDown = gp.buttons[13]?.pressed;

        if (ly < -0.5 || dpadUp) {
            configFocusIndex = (configFocusIndex - 1 + elements.length) % elements.length;
            menuNavCooldown = 18;
        } else if (ly > 0.5 || dpadDown) {
            configFocusIndex = (configFocusIndex + 1) % elements.length;
            menuNavCooldown = 18;
        }
    }
    if (menuNavCooldown > 0) menuNavCooldown--;

    const current = elements[configFocusIndex];

    // A — activa toggle o botón
    const aPressed = gp.buttons[0]?.pressed;
    if (aPressed && !aWasPressed) {
        if (current.type === "toggle" || current.type === "button") {
            current.el.click();
        }
    }
    aWasPressed = !!aPressed;

    // Stick derecho o D-pad izq/der — ajusta sliders
    if (current.type === "slider") {
        const rx = gp.axes[2];
        const dpadLeft = gp.buttons[14]?.pressed;
        const dpadRight = gp.buttons[15]?.pressed;

        configHeld++;
        const speed = configHeld > 30 ? 3 : 1; // acelera al mantener

        if (rx > 0.3 || dpadRight) {
            current.el.value = Math.min(100, Number(current.el.value) + speed);
            current.el.dispatchEvent(new Event("input"));
        } else if (rx < -0.3 || dpadLeft) {
            current.el.value = Math.max(0, Number(current.el.value) - speed);
            current.el.dispatchEvent(new Event("input"));
        } else {
            configHeld = 0;
        }
    }

    // B — cierra configuración
    const bPressed = gp.buttons[1]?.pressed;
    if (bPressed && !aWasPressed) {
        closeMenuOverlay("settings-overlay");
        configFocusIndex = 0;
    }
}

// Obtiene los botones del menú activo como array de elementos DOM
function getMenuButtons(menuId) {
    if (!menuId || !MENU_BUTTONS[menuId]) return [];
    const container = document.getElementById(menuId);
    if (!container) return [];
    return MENU_BUTTONS[menuId]
        .map(sel => container.querySelector(sel))
        .filter(Boolean);
}

// Aplica la clase de foco al botón correcto
function applyMenuFocus(buttons, index) {
    buttons.forEach((btn, i) => {
        btn.classList.toggle("gamepad-focus", i === index);
    });
}

// Limpia el foco de todos los botones conocidos
function clearAllFocus() {
    document.querySelectorAll(".gamepad-focus").forEach(el => {
        el.classList.remove("gamepad-focus");
    });
}

// Loop de navegación — se llama cada frame desde mecanicas.js
function checkGamepadMenu() {
    const gp = getGamepad();
    const activeId = getActiveMenuId();

    // Si no hay menú visible o no hay mando, limpia y sal
    if (!activeId || !gp) {
        if (!activeId) clearAllFocus();
        return;
    }

    // ── Configuración: navegación especial ──
    if (activeId === "settings-overlay") {
        checkGamepadConfig(gp);
        return;
    }

    // ── Submenú abierto: solo B para cerrar, sin navegación ──
    if (activeId.startsWith("submenu:")) {
        clearAllFocus();
        const overlayId = activeId.replace("submenu:", "");
        const bPressed = gp.buttons[1]?.pressed;
        if (bPressed && !aWasPressed) {
            closeMenuOverlay(overlayId);
        }
        aWasPressed = !!bPressed;
        return;
    }

    // Si cambió el menú activo, reinicia el índice
    if (activeId !== currentMenuId) {
        currentMenuId = activeId;
        menuFocusIndex = 0;
    }

    const buttons = getMenuButtons(activeId);
    if (buttons.length === 0) return;

    applyMenuFocus(buttons, menuFocusIndex);

    // ── Navegación vertical ──
    if (menuNavCooldown > 0) menuNavCooldown--;

    if (menuNavCooldown === 0) {
        const ly = gp.axes[1];                        // stick izquierdo Y
        const dpadUp = gp.buttons[12]?.pressed;       // D-pad arriba
        const dpadDown = gp.buttons[13]?.pressed;     // D-pad abajo

        if (ly < -0.5 || dpadUp) {
            menuFocusIndex = (menuFocusIndex - 1 + buttons.length) % buttons.length;
            menuNavCooldown = 18;
        } else if (ly > 0.5 || dpadDown) {
            menuFocusIndex = (menuFocusIndex + 1) % buttons.length;
            menuNavCooldown = 18;
        }
    }

    // ── Confirmar con A ──
    const aPressed = gp.buttons[0]?.pressed;
    if (aPressed && !aWasPressed) {
        buttons[menuFocusIndex]?.click();
    }
    aWasPressed = !!aPressed;
}