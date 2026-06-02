const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const bossBar = document.getElementById("boss-bar");

ctx.imageSmoothingEnabled = false;

// ── ESTADO GENERAL ──
let gameActive = false;
let gamePaused = false;
let lives = 3;

let starDustProjectiles = [];
let balloons = [];
let homingBalloons = [];  // ← NUEVO: globos teledirigidos fase 3

// ── IMÁGENES ──
const mochiImg = new Image(); mochiImg.src = "mochi.png";
const poppiImg = new Image(); poppiImg.src = "poppi.png";
const poppiAngryImg = new Image(); poppiAngryImg.src = "poppiBola.png";
const poppiAngryPhaseImg = new Image(); poppiAngryPhaseImg.src = "poppiAngry.png";
const heartImg = new Image(); heartImg.src = "heart.png";
const bgImg = new Image(); bgImg.src = "circo.png";

// ── MOCHI ──
const mochi = {
    x: 640, y: 530,
    width: 70, height: 70,
    normalWidth: 70, normalHeight: 70,
    radius: 20, normalRadius: 20, smallRadius: 14,
    vx: 0, vy: 0,
    accel: 0.8, friction: 0.92, maxSpeed: 7.5,
    shootCooldown: 0,
    isShrunk: false,
    invulnerable: false, invulnerableTimer: 0
};

const POPPI_MAX_HP = 1000;

// ── POPPI ──
const poppi = {
    x: 300, y: 100,
    width: 110, height: 110,
    baseWidth: 110, baseHeight: 110,
    radius: 45,
    vx: 4, vy: 3,
    accel: 0.2, friction: 0.98, maxSpeed: 5,
    hp: POPPI_MAX_HP,
    phase: 1,          // ← NUEVO: fase actual 1, 2 o 3
    state: "NORMAL",
    stateTimer: 0, shootTimer: 0,
    homingTimer: 0,    // ← NUEVO: timer para globos teledirigidos
    isAngryPhase: false,
    grabTimer: 0,
    windupTimer: 0,
    stunTimer: 0,
    isImmune: false,
    immuneTimer: 0,
    forcedGrabCount: 0
};

// ── CONTROLES ──
const keys = {};
window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === " " || e.key === "Spacebar" || e.key === "C") e.preventDefault();
    if (e.key === "Escape" && gameActive) togglePause();
});
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// ── FULLSCREEN ──
function requestFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

// ── MENÚS ──
function showOverlay(id) {
    document.querySelectorAll(".overlay").forEach(o => o.classList.remove("active"));
    if (id) document.getElementById(id).classList.add("active");
}

const MAX_LIVES = 3;

function renderHearts() {
    const container = document.getElementById("lives-container");
    if (container.children.length !== MAX_LIVES) {
        container.innerHTML = "";
        for (let i = 0; i < MAX_LIVES; i++) {
            const img = document.createElement("img");
            img.src = "heart.png";
            container.appendChild(img);
        }
    }
    Array.from(container.children).forEach((img, i) => {
        if (i < lives) img.classList.remove("empty");
        else img.classList.add("empty");
    });
}

function startGame() {
    requestFullscreen();
    resetState();
    gameActive = true;
    gamePaused = false;
    showOverlay(null);
}

function restartGame() {
    requestFullscreen();
    resetState();
    gameActive = true;
    gamePaused = false;
    showOverlay(null);
}

function goToMenu() {
    gameActive = false;
    gamePaused = false;
    showOverlay("mainMenu");
}

function resumeGame() {
    gamePaused = false;
    showOverlay(null);
}

function togglePause() {
    if (!gameActive) return;
    gamePaused = !gamePaused;
    if (gamePaused) showOverlay("pauseMenu");
    else showOverlay(null);
}

function openSettings() { showOverlay("settingsMenu"); }
function closeSettings() { showOverlay("mainMenu"); }

function resetState() {
    lives = 3;
    renderHearts();
    bossBar.style.width = "100%";
    bossBar.style.background = "linear-gradient(90deg, #86efac, #4ade80)";
    bossBar.style.animation = "";
    starDustProjectiles = [];
    balloons = [];
    homingBalloons = [];

    mochi.x = 640; mochi.y = 530;
    mochi.vx = 0; mochi.vy = 0;
    mochi.invulnerable = false; mochi.invulnerableTimer = 0;
    mochi.shootCooldown = 0;

    poppi.x = 300; poppi.y = 100;
    poppi.vx = 4; poppi.vy = 3;
    poppi.hp = POPPI_MAX_HP;
    poppi.phase = 1;
    poppi.width = poppi.baseWidth; poppi.height = poppi.baseHeight;
    poppi.radius = 45;
    poppi.state = "NORMAL";
    poppi.stateTimer = 0; poppi.shootTimer = 0; poppi.homingTimer = 0;
    poppi.isAngryPhase = false;
    poppi.grabTimer = 0; poppi.windupTimer = 0; poppi.stunTimer = 0;
    poppi.isImmune = false; poppi.immuneTimer = 0; poppi.forcedGrabCount = 0;
}

// ── TRANSICIÓN DE FASE ──
function triggerPhaseTransition(newPhase) {
    poppi.phase = newPhase;
    poppi.isImmune = true;
    poppi.forcedGrabCount = 0;
    poppi.state = "GRAB_WINDUP";
    poppi.windupTimer = 100;
    poppi.vx = 0;
    poppi.vy = 0;

    canvas.classList.add("shake");
    setTimeout(() => canvas.classList.remove("shake"), 700);

    const flash = document.getElementById("angryFlash");
    const text = document.getElementById("angryText");

    // Texto diferente según fase
    text.textContent = newPhase === 2
        ? "😡 ¡POPPI ESTÁ FURIOSA!"
        : "💀 ¡POPPI ESTÁ DESESPERADA!";

    // Color del flash diferente en fase 3
    flash.style.background = newPhase === 3
        ? "radial-gradient(circle, #9900ff55, transparent 70%)"
        : "radial-gradient(circle, #ff000055, transparent 70%)";

    flash.classList.add("active");
    text.classList.add("active");

    let flashes = 0;
    const flashInterval = setInterval(() => {
        flash.style.opacity = flash.style.opacity === "0" ? "1" : "0";
        if (++flashes >= 10) {
            clearInterval(flashInterval);
            flash.classList.remove("active");
            flash.style.opacity = "";
            flash.style.background = "";
        }
    }, 80);

    setTimeout(() => text.classList.remove("active"), 2500);

    // Fase 2: activa angry
    if (newPhase === 2) poppi.isAngryPhase = true;
}

// ── MOVIMIENTO MOCHI ──
function updateMochiPhysics() {
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) mochi.vx -= mochi.accel;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) mochi.vx += mochi.accel;
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) mochi.vy -= mochi.accel;
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) mochi.vy += mochi.accel;

    mochi.vx *= mochi.friction;
    mochi.vy *= mochi.friction;
    mochi.vx = Math.max(-mochi.maxSpeed, Math.min(mochi.maxSpeed, mochi.vx));
    mochi.vy = Math.max(-mochi.maxSpeed, Math.min(mochi.maxSpeed, mochi.vy));

    mochi.x += mochi.vx;
    mochi.y += mochi.vy;

    if (mochi.x < 0) { mochi.x = 0; mochi.vx = 0; }
    if (mochi.x + mochi.width > canvas.width) { mochi.x = canvas.width - mochi.width; mochi.vx = 0; }
    if (mochi.y < 0) { mochi.y = 0; mochi.vy = 0; }
    if (mochi.y + mochi.height > canvas.height) { mochi.y = canvas.height - mochi.height; mochi.vy = 0; }
}

// ── MOVIMIENTO POPPI ──
function updatePoppiMovement() {

    if (poppi.state === "NORMAL") {
        // Cada fase más rápida
        let speed = poppi.phase === 3 ? 1.6 : poppi.phase === 2 ? 1.3 : 1;
        poppi.x += poppi.vx * speed;
        poppi.y += poppi.vy * speed;
        if (poppi.x < 0 || poppi.x + poppi.width > canvas.width) poppi.vx *= -1;
        if (poppi.y < 0 || poppi.y + poppi.height > 320) poppi.vy *= -1;
    }

    else if (poppi.state === "BOUNCING") {
        let speed = poppi.phase === 3 ? 2.2 : 1.8;
        poppi.x += poppi.vx * speed;
        poppi.y += poppi.vy * speed;
        if (poppi.x < 0 || poppi.x + poppi.width > canvas.width) poppi.vx *= -1;
        if (poppi.y < 0 || poppi.y + poppi.height > canvas.height - 100) poppi.vy *= -1;
    }

    else if (poppi.state === "INFLATING") {
        poppi.x += ((canvas.width / 2 - poppi.width / 2) - poppi.x) * 0.04;
        poppi.y += (80 - poppi.y) * 0.04;
        if (poppi.stateTimer < 180) {
            if (poppi.width < poppi.baseWidth * 1.8) {
                poppi.width += 2; poppi.height += 2; poppi.radius += 0.8;
            }
        } else {
            if (poppi.width > poppi.baseWidth) {
                poppi.width -= 3; poppi.height -= 3; poppi.radius -= 1.2;
            }
        }
    }

    else if (poppi.state === "GRAB_WINDUP") {
        poppi.vx = 0;
        poppi.vy = 0;
        poppi.windupTimer--;
        const shake = Math.sin(Date.now() * 0.08) * 3;
        poppi.x += shake * 1.5;

        if (poppi.windupTimer <= 0) {
            let dx = (mochi.x + mochi.width / 2) - (poppi.x + poppi.width / 2);
            let dy = (mochi.y + mochi.height / 2) - (poppi.y + poppi.height / 2);
            let dist = Math.sqrt(dx * dx + dy * dy);
            let dashSpeed = poppi.phase === 3 ? 14 : 12;
            poppi.vx = (dx / dist) * dashSpeed;
            poppi.vy = (dy / dist) * dashSpeed;
            poppi.state = "ANGRY_GRAB";
            poppi.grabTimer = 90;
        }
    }

    else if (poppi.state === "ANGRY_GRAB") {
        poppi.x += poppi.vx;
        poppi.y += poppi.vy;
        if (poppi.x < 0 || poppi.x + poppi.width > canvas.width) poppi.vx *= -1;
        if (poppi.y < 0 || poppi.y + poppi.height > canvas.height) poppi.vy *= -1;

        poppi.grabTimer--;
        if (poppi.grabTimer <= 0) {
            poppi.state = "GRAB_STUN";
            // Fase 3: stun muy corto, casi no hay ventana
            poppi.stunTimer = poppi.phase === 3 ? 20 : 60;
            poppi.vx = 0;
            poppi.vy = 0;
        }
    }

    else if (poppi.state === "GRAB_STUN") {
        poppi.stunTimer--;
        if (poppi.stunTimer <= 0) {
            if (poppi.isImmune) {
                poppi.forcedGrabCount++;
                // Fase 3: 3 embestidas forzadas en lugar de 2
                const maxGrabs = poppi.phase === 3 ? 3 : 2;
                if (poppi.forcedGrabCount < maxGrabs) {
                    poppi.state = "GRAB_WINDUP";
                    poppi.windupTimer = poppi.phase === 3 ? 45 : 60;
                    poppi.vx = 0;
                    poppi.vy = 0;
                } else {
                    poppi.isImmune = false;
                    poppi.forcedGrabCount = 0;
                    switchBossState();
                }
            } else {
                switchBossState();
            }
        }
    }
}

// ── SHRINK ──
function updateShrinkMode() {
    if (keys["C"] || keys["c"]) {
        mochi.isShrunk = true;
        mochi.width = 55; mochi.height = 55;
        mochi.radius = mochi.smallRadius;
        mochi.maxSpeed = 4;
    } else {
        mochi.isShrunk = false;
        mochi.width = mochi.normalWidth; mochi.height = mochi.normalHeight;
        mochi.radius = mochi.normalRadius;
        mochi.maxSpeed = 7.5;
    }
}

// ── ATAQUES ──
function createBalloon(x, y, vx, vy) {
    balloons.push({ x, y, radius: 10, vx, vy, color: "#ffb7b2" });
}

function bossAttackPatterns() {
    poppi.shootTimer++;
    poppi.homingTimer++;

    // ── NORMAL: abanico de globos ──
    if (poppi.state === "NORMAL") {
        const cooldown = poppi.phase === 3 ? 18 : poppi.phase === 2 ? 22 : 40;
        if (poppi.shootTimer > cooldown) {
            poppi.shootTimer = 0;
            const count = poppi.phase === 3 ? 4 : poppi.phase === 2 ? 3 : 2;
            const spread = poppi.phase === 3 ? 3.5 : 2.5;
            const speed = poppi.phase === 3 ? 6.5 : poppi.phase === 2 ? 5.5 : 4;
            for (let i = 0; i < count; i++) {
                const offset = (i - (count - 1) / 2) * spread;
                createBalloon(
                    poppi.x + poppi.width / 2,
                    poppi.y + poppi.height,
                    (Math.random() - 0.5) * 2 + offset,
                    speed
                );
            }
        }
    }

    // ── INFLATING: círculo de globos ──
    if (poppi.state === "INFLATING" && poppi.shootTimer > 60) {
        poppi.shootTimer = 0;
        const count = poppi.phase === 3 ? 20 : poppi.phase === 2 ? 16 : 12;
        const speed = poppi.phase >= 2 ? 4 : 3;
        for (let i = 0; i < count; i++) {
            let angle = (Math.PI * 2 / count) * i;
            balloons.push({
                x: poppi.x + poppi.width / 2,
                y: poppi.y + poppi.height / 2,
                radius: 8,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: "#ffb7b2"
            });
        }
    }

    // ── BOUNCING: ráfaga doble ──
    if (poppi.state === "BOUNCING") {
        const cooldown = poppi.phase === 3 ? 7 : 12;
        if (poppi.shootTimer > cooldown) {
            poppi.shootTimer = 0;
            const count = poppi.phase >= 2 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                createBalloon(
                    poppi.x + poppi.width / 2,
                    poppi.y + poppi.height / 2,
                    (Math.random() - 0.5) * 5,
                    3.5 + Math.random()
                );
            }
        }
    }

    // ── ANGRY_GRAB: lluvia densa ──
    if (poppi.state === "ANGRY_GRAB") {
        const cooldown = poppi.phase === 3 ? 8 : 12;
        if (poppi.shootTimer > cooldown) {
            poppi.shootTimer = 0;
            const count = poppi.phase === 3 ? 3 : 2;
            for (let i = 0; i < count; i++) {
                createBalloon(
                    Math.random() * canvas.width,
                    -10,
                    (Math.random() - 0.5) * 5,
                    5 + Math.random() * 2
                );
            }
        }
    }

    // ── FASE 3: globos teledirigidos ──
    if (poppi.phase === 3 && poppi.homingTimer > 180) {
        poppi.homingTimer = 0;
        // Lanza 3 globos que siguen a Mochi
        for (let i = 0; i < 3; i++) {
            homingBalloons.push({
                x: poppi.x + poppi.width / 2 + (Math.random() - 0.5) * 60,
                y: poppi.y + poppi.height / 2,
                radius: 12,
                life: 240,      // cuántos frames persisten antes de explotar
                speed: 2.5,
                color: "#c084fc"
            });
        }
    }
}

// ── CAMBIO DE ESTADO BOSS ──
function switchBossState() {
    poppi.stateTimer = 0;

    const states = poppi.phase >= 2
        ? ["NORMAL", "INFLATING", "BOUNCING", "ANGRY_GRAB"]
        : ["NORMAL", "INFLATING", "BOUNCING"];

    let nextState = states[Math.floor(Math.random() * states.length)];
    while (nextState === poppi.state) {
        nextState = states[Math.floor(Math.random() * states.length)];
    }
    poppi.state = nextState;

    if (poppi.state === "BOUNCING") {
        let speed = poppi.phase === 3 ? 9 : 8;
        poppi.vx = poppi.vx > 0 ? speed : -speed;
        poppi.vy = poppi.vy > 0 ? (speed - 2) : -(speed - 2);
    } else if (poppi.state === "ANGRY_GRAB") {
        poppi.state = "GRAB_WINDUP";
        poppi.windupTimer = poppi.phase === 3 ? 45 : 50;
        poppi.vx = 0;
        poppi.vy = 0;
        return;
    } else {
        let speed = poppi.phase === 3 ? 5 : 4;
        poppi.vx = poppi.vx > 0 ? speed : -speed;
        poppi.vy = poppi.vy > 0 ? (speed - 1) : -(speed - 1);
    }
}

// ── DAÑO MOCHI ──
function handleMochiDamage() {
    if (mochi.invulnerable) return;
    lives--;
    renderHearts();
    mochi.invulnerable = true;
    mochi.invulnerableTimer = 90;
    mochi.x = canvas.width / 2;

    if (lives <= 0) {
        gameActive = false;
        showOverlay("gameOverMenu");
    }
}

// ── UPDATE ──
function update() {
    if (!gameActive || gamePaused) return;

    updateMochiPhysics();
    updateShrinkMode();
    updatePoppiMovement();

    if (mochi.invulnerable) {
        mochi.invulnerableTimer--;
        if (mochi.invulnerableTimer <= 0) mochi.invulnerable = false;
    }

    if (mochi.shootCooldown > 0) mochi.shootCooldown--;

    if ((keys[" "] || keys["Spacebar"] || keys["z"] || keys["Z"] || keys["x"] || keys["X"]) && mochi.shootCooldown === 0) {
        starDustProjectiles.push({
            x: mochi.x + mochi.width / 2,
            y: mochi.y,
            radius: 5, vy: -8
        });
        mochi.shootCooldown = 12;
    }

    // ── Proyectiles Mochi ──
    for (let i = starDustProjectiles.length - 1; i >= 0; i--) {
        let p = starDustProjectiles[i];
        p.y += p.vy;

        let dx = p.x - (poppi.x + poppi.width / 2);
        let dy = p.y - (poppi.y + poppi.height / 2);

        if (Math.sqrt(dx * dx + dy * dy) < p.radius + poppi.radius) {
            starDustProjectiles.splice(i, 1);

            if (!poppi.isImmune) {
                poppi.hp -= 10;
                bossBar.style.width = (poppi.hp / POPPI_MAX_HP) * 100 + "%";

                if (poppi.hp > POPPI_MAX_HP * 0.6) {
                    bossBar.style.background = "linear-gradient(90deg, #86efac, #4ade80)";
                } else if (poppi.hp > POPPI_MAX_HP * 0.3) {
                    bossBar.style.background = "linear-gradient(90deg, #fde68a, #f59e0b)";
                } else {
                    bossBar.style.background = "linear-gradient(90deg, #fca5a5, #ef4444)";
                }

                // Transición fase 1 → 2 al 66%
                if (poppi.hp <= POPPI_MAX_HP * 0.66 && poppi.phase === 1) {
                    triggerPhaseTransition(2);
                    bossBar.style.animation = "pulse 0.5s ease 3";
                }

                // Transición fase 2 → 3 al 33%
                if (poppi.hp <= POPPI_MAX_HP * 0.33 && poppi.phase === 2) {
                    triggerPhaseTransition(3);
                    bossBar.style.animation = "pulse 0.5s ease 4";
                }

                if (poppi.hp <= 0) {
                    gameActive = false;
                    showOverlay("winMenu");
                }
            }
            continue;
        }

        if (p.y < 0) starDustProjectiles.splice(i, 1);
    }

    // ── Estados boss ──
    poppi.stateTimer++;
    if (poppi.stateTimer > 300
        && poppi.state !== "ANGRY_GRAB"
        && poppi.state !== "GRAB_WINDUP"
        && poppi.state !== "GRAB_STUN") {
        switchBossState();
    }

    bossAttackPatterns();

    // ── Globos normales ──
    let mochiCX = mochi.x + mochi.width / 2;
    let mochiCY = mochi.y + mochi.height / 2;

    for (let i = balloons.length - 1; i >= 0; i--) {
        let b = balloons[i];
        b.x += b.vx;
        b.y += b.vy;

        let dx = b.x - mochiCX;
        let dy = b.y - mochiCY;
        if (Math.sqrt(dx * dx + dy * dy) < b.radius + mochi.radius) {
            balloons.splice(i, 1);
            handleMochiDamage();
            continue;
        }
        if (b.y > canvas.height + 50 || b.x < -50 || b.x > canvas.width + 50) {
            balloons.splice(i, 1);
        }
    }

    // ── Globos teledirigidos (fase 3) ──
    for (let i = homingBalloons.length - 1; i >= 0; i--) {
        let h = homingBalloons[i];
        h.life--;

        // Sigue lentamente a Mochi
        let dx = mochiCX - h.x;
        let dy = mochiCY - h.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            h.x += (dx / dist) * h.speed;
            h.y += (dy / dist) * h.speed;
        }

        // Colisión con Mochi
        let ddx = h.x - mochiCX;
        let ddy = h.y - mochiCY;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < h.radius + mochi.radius) {
            homingBalloons.splice(i, 1);
            handleMochiDamage();
            continue;
        }

        // Explotan al acabarse el tiempo
        if (h.life <= 0) {
            homingBalloons.splice(i, 1);
        }
    }

    // ── Colisión directa Poppi-Mochi ──
    let bossCX = poppi.x + poppi.width / 2;
    let bossCY = poppi.y + poppi.height / 2;
    let dx = bossCX - mochiCX;
    let dy = bossCY - mochiCY;
    if (Math.sqrt(dx * dx + dy * dy) < poppi.radius + mochi.radius) {
        handleMochiDamage();
    }
}

// ── DRAW ──
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgImg.complete && bgImg.naturalWidth !== 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }

    if (!gameActive && !gamePaused) return;

    // Tintes de estado
    if (poppi.state === "BOUNCING") {
        ctx.fillStyle = "rgba(255,0,0,0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (poppi.state === "GRAB_WINDUP") {
        ctx.fillStyle = "rgba(255,140,0,0.10)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (poppi.state === "ANGRY_GRAB") {
        ctx.fillStyle = "rgba(255,0,0,0.08)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (poppi.state === "GRAB_STUN") {
        ctx.fillStyle = "rgba(0,220,120,0.07)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Tinte púrpura en fase 3
    if (poppi.phase === 3) {
        ctx.fillStyle = "rgba(120,0,200,0.04)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Sprite Poppi según fase
    let currentPoppiImg;
    if (poppi.phase >= 2) {
        currentPoppiImg = (poppi.state === "BOUNCING" || poppi.state === "INFLATING")
            ? poppiAngryImg
            : poppiAngryPhaseImg;
    } else {
        currentPoppiImg = (poppi.state === "BOUNCING" || poppi.state === "INFLATING")
            ? poppiAngryImg
            : poppiImg;
    }

    // Mochi
    if (mochi.invulnerable) {
        ctx.globalAlpha = Math.sin(Date.now() * 0.03) > 0 ? 0.2 : 1;
    } else if (mochi.isShrunk) {
        ctx.globalAlpha = 0.7;
    }
    ctx.drawImage(mochiImg, mochi.x, mochi.y, mochi.width, mochi.height);
    ctx.globalAlpha = 1;

    // Poppi con brillo según fase
    if (poppi.isImmune) {
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = poppi.phase === 3 ? "#aa00ff" : "#ffd700";
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.3;
        ctx.drawImage(currentPoppiImg, poppi.x, poppi.y, poppi.width, poppi.height);
        ctx.restore();
    }
    ctx.drawImage(currentPoppiImg, poppi.x, poppi.y, poppi.width, poppi.height);

    // Globos normales
    balloons.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill(); ctx.closePath();
    });

    // Globos teledirigidos — púrpura con pulso
    homingBalloons.forEach(h => {
        const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#c084fc";
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#c084fc";
        ctx.fill(); ctx.closePath();
        ctx.restore();
    });

    // Proyectiles Mochi
    starDustProjectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#fff3b0";
        ctx.shadowBlur = 10; ctx.shadowColor = "#fff3b0";
        ctx.fill(); ctx.closePath(); ctx.shadowBlur = 0;
    });
}

// ── SERVICE WORKER ──
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
}

// ── PANTALLA DE CARGA ──
const imagesToLoad = [
    { img: mochiImg, src: "mochi.png" },
    { img: poppiImg, src: "poppi.png" },
    { img: poppiAngryImg, src: "poppiBola.png" },
    { img: poppiAngryPhaseImg, src: "poppiAngry.png" },
    { img: bgImg, src: "circo.png" },
    { img: heartImg, src: "heart.png" }
];

const loadingMessages = [
    "Preparando el circo...",
    "Inflando los globos...",
    "Afinando la música...",
    "Encendiendo las luces...",
    "¡Casi listo!"
];

let loaded = 0;
const total = imagesToLoad.length;
const loadingBar = document.getElementById("loadingBar");
const loadingText = document.getElementById("loadingText");
const loadingScreen = document.getElementById("loadingScreen");

imagesToLoad.forEach(({ img, src }) => {
    img.onload = img.onerror = () => {
        loaded++;
        const pct = Math.round((loaded / total) * 100);
        loadingBar.style.width = pct + "%";
        loadingText.textContent = loadingMessages[
            Math.min(
                Math.floor((loaded / total) * loadingMessages.length),
                loadingMessages.length - 1
            )
        ];
        if (loaded >= total) {
            setTimeout(() => {
                loadingScreen.classList.add("hidden");
                setTimeout(() => loadingScreen.remove(), 800);
            }, 400);
        }
    };
    img.src = src;
});

// ── LOOP ──
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();