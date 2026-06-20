const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bossBar = document.getElementById("boss-bar");

ctx.imageSmoothingEnabled = false;

// ── ESTADO GENERAL ──
let gameActive = false;
let gamePaused = false;
let lives = 3;
let fightStartTime = 0;  // ← nuevo
let damagesTaken = 0;    // ← nuevo

let starDustProjectiles = [];
let balloons = [];
let homingBalloons = [];

// ── IMÁGENES ──
const mochiImg = new Image(); mochiImg.src = "img/mochi.png";
const poppiImg = new Image(); poppiImg.src = "img/poppi.png";
const poppiAngryImg = new Image(); poppiAngryImg.src = "img/poppiBola.png";
const poppiAngryPhaseImg = new Image(); poppiAngryPhaseImg.src = "img/poppiAngry.png";
const balloonBlueImg = new Image(); balloonBlueImg.src = "img/globo_azul.png";
const balloonPurpleImg = new Image(); balloonPurpleImg.src = "img/globo_morado.png";
const balloonPinkImg = new Image(); balloonPinkImg.src = "img/globo_rosa.png";
const heartImg = new Image(); heartImg.src = "img/heart.png";
const bgImg = new Image(); bgImg.src = "img/circo.png";

// ── MOCHI ──
const mochi = {
    x: 640, y: 530,
    width: 60, height: 70,
    normalWidth: 60, normalHeight: 70,
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

    if (id === 'gameOverMenu') playEndScreenEffects('gameover');
    else if (id === 'winMenu') playEndScreenEffects('win');
}

// ── Efectos pantalla de fin ──
function playEndScreenEffects(type) {
    const isWin = type === 'win';
    const prefix = isWin ? 'win' : 'gameOver';

    const title = document.getElementById(prefix + 'Title');
    const subtitle = document.getElementById(prefix + 'Subtitle');
    const btn1 = document.getElementById(prefix + 'BtnPrimary');
    const btn2 = document.getElementById(prefix + 'BtnSecondary');
    const particles = document.getElementById(prefix + 'Particles');

    // Reset
    title.classList.remove('show');
    subtitle.classList.remove('show');
    btn1.classList.remove('show');
    btn2.classList.remove('show');
    particles.innerHTML = '';
    void title.offsetWidth;

    // Quita resumen anterior si existía
    const oldStats = document.getElementById('winStats');
    if (oldStats) oldStats.remove();

    // Partículas de fondo
    const count = isWin ? 18 : 10;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (isWin ? 2 + Math.random() * 1.5 : 3 + Math.random() * 2) + 's';
        p.style.animationDelay = Math.random() * 2.5 + 's';
        if (isWin) {
            p.className = 'end-confetti';
            p.style.background = ['#ff9ff3', '#ffe066', '#c9a8ff', '#86efac', '#80dfff'][Math.floor(Math.random() * 5)];
        } else {
            p.className = 'end-dust';
        }
        particles.appendChild(p);
    }

    // Chispas desde Mochi (solo victoria)
    if (isWin) {
        const wrap = document.getElementById('winPortraitWrap');
        function burstSparkles() {
            for (let i = 0; i < 8; i++) {
                const s = document.createElement('div');
                s.className = 'end-sparkle';
                const angle = Math.random() * Math.PI * 2;
                const dist = 30 + Math.random() * 40;
                s.style.setProperty('--sx', Math.cos(angle) * dist + 'px');
                s.style.setProperty('--sy', Math.sin(angle) * dist + 'px');
                s.style.background = ['#ffe066', '#ff9ff3', '#80dfff'][Math.floor(Math.random() * 3)];
                wrap.appendChild(s);
                setTimeout(() => s.remove(), 900);
            }
        }
        burstSparkles();
        const si = setInterval(burstSparkles, 700);
        setTimeout(() => clearInterval(si), 6000);

        // Resumen de estadísticas
        const elapsed = Math.floor((Date.now() - fightStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const timeStr = mins > 0
            ? `${mins}m ${secs}s`
            : `${secs}s`;

        const stats = document.createElement('div');
        stats.id = 'winStats';
        stats.innerHTML = `
            <div class="win-stat end-reveal" id="winStat1">
                <span class="win-stat-icon">⏱</span>
                <span class="win-stat-label">Tiempo</span>
                <span class="win-stat-value">${timeStr}</span>
            </div>
            <div class="win-stat end-reveal" id="winStat2">
                <span class="win-stat-icon">💥</span>
                <span class="win-stat-label">Golpes recibidos</span>
                <span class="win-stat-value">${damagesTaken}</span>
            </div>
            <div class="win-stat end-reveal" id="winStat3">
                <span class="win-stat-icon">❤️</span>
                <span class="win-stat-label">Vidas restantes</span>
                <span class="win-stat-value">${lives}</span>
            </div>
        `;

        // Inserta el resumen justo antes de los botones
        btn1.parentNode.insertBefore(stats, btn1);

        // Revelado escalonado de estadísticas
        setTimeout(() => document.getElementById('winStat1')?.classList.add('show'), 900);
        setTimeout(() => document.getElementById('winStat2')?.classList.add('show'), 1100);
        setTimeout(() => document.getElementById('winStat3')?.classList.add('show'), 1300);
    }

    // Revelado escalonado base
    setTimeout(() => title.classList.add('show'), 100);
    setTimeout(() => subtitle.classList.add('show'), 500);
    setTimeout(() => btn1.classList.add('show'), isWin ? 1500 : 700);
    setTimeout(() => btn2.classList.add('show'), isWin ? 1700 : 900);
}

// ── Secuencia de impacto al perder ──
function triggerGameOverSequence() {
    const canvas = document.getElementById('gameCanvas');
    const flash = document.getElementById('deathFlash');

    canvas.classList.add('shake-hard');

    flash.classList.remove('flash-white', 'flash-red');
    void flash.offsetWidth;
    flash.classList.add('flash-white');

    setTimeout(() => {
        flash.classList.remove('flash-white');
        flash.classList.add('flash-red');
    }, 150);

    setTimeout(() => {
        canvas.classList.remove('shake-hard');
        canvas.classList.add('desaturating');
    }, 200);

    setTimeout(() => {
        flash.classList.remove('flash-red');
        canvas.classList.remove('desaturating');
        canvas.style.filter = '';
        gameActive = false;  // ← ahora sí apaga todo
        gamePaused = false;
        showOverlay('gameOverMenu');
    }, 1100);
}

const MAX_LIVES = 3;

function renderHearts() {
    const container = document.getElementById("lives-container");
    if (container.children.length !== MAX_LIVES) {
        container.innerHTML = "";
        for (let i = 0; i < MAX_LIVES; i++) {
            const img = document.createElement("img");
            img.src = "img/heart.png";
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
    AudioSystem.playMusic("combat");
}

function startGameWithoutFullscreen() {
    resetState();
    gameActive = true;
    gamePaused = false;
    showOverlay(null);
    // La música ya la inicia showBossIntro al terminar
}

function restartGame() {
    requestFullscreen();
    resetState();
    gameActive = true;
    gamePaused = false;
    showOverlay(null);
    AudioSystem.playMusic("combat");
}

function goToMenu() {
    gameActive = false;
    gamePaused = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';                    // ← oculta el canvas del juego
    document.getElementById('game-wrap').style.background = 'none';
    document.getElementById('mainMenuScene').style.display = 'flex';
    menuCanvas.style.display = 'block';
    menuLoopActive = true;
    menuBgLoop();
    document.getElementById('hud-top').style.display = 'none';
    document.querySelectorAll(".overlay").forEach(o => o.classList.remove("active"));
    AudioSystem.playMusic("menu");
}

function resumeGame() {
    gamePaused = false;
    showOverlay(null);
    requestFullscreen();
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
    document.getElementById('hud-top').style.display = 'flex';
    document.getElementById('lives-container').style.display = 'flex';
    document.getElementById('boss-bar-container').style.display = 'block';
    document.getElementById('boss-name').style.display = 'block';
    canvas.style.display = 'block';
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
    fightStartTime = Date.now(); // ← nuevo
    damagesTaken = 0;            // ← nuevo
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
        ? "¡POPPI ESTÁ FURIOSA!"
        : "¡POPPI ESTÁ DESESPERADA!";

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
    const gp = getGamepad();

    // ── Movimiento: teclado + stick izquierdo ──
    let moveX = 0, moveY = 0;

    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) moveX -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) moveX += 1;
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) moveY -= 1;
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) moveY += 1;

    if (gp) {
        const DEAD = 0.18; // zona muerta
        const lx = gp.axes[0], ly = gp.axes[1];
        if (Math.abs(lx) > DEAD) moveX += lx;
        if (Math.abs(ly) > DEAD) moveY += ly;
    }

    mochi.vx += moveX * mochi.accel;
    mochi.vy += moveY * mochi.accel;

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

    // ── Dirección de disparo ──
    // Prioridad: stick derecho > teclas WASD como dirección > última dirección
    let dirUpdated = false;

    if (gp) {
        const DEAD = 0.25;
        const rx = gp.axes[2], ry = gp.axes[3];
        if (Math.abs(rx) > DEAD || Math.abs(ry) > DEAD) {
            const len = Math.sqrt(rx * rx + ry * ry);
            shootDir.x = rx / len;
            shootDir.y = ry / len;
            dirUpdated = true;
        }
    }

    // En teclado (sin mando): la dirección de movimiento actualiza la dirección de disparo
    if (!dirUpdated && !getGamepad() && (moveX !== 0 || moveY !== 0)) {
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        shootDir.x = moveX / len;
        shootDir.y = moveY / len;
    }
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
    const _gp = getGamepad();
    if (keys["C"] || keys["c"] || (_gp && _gp.buttons[4]?.pressed)) { // LB
        mochi.isShrunk = true;
        mochi.width = 55; mochi.height = 55;
        mochi.radius = mochi.smallRadius;
        mochi.maxSpeed = 9;
    } else {
        mochi.isShrunk = false;
        mochi.width = mochi.normalWidth; mochi.height = mochi.normalHeight;
        mochi.radius = mochi.normalRadius;
        mochi.maxSpeed = 7.5;
    }
}

// ── ATAQUES ──
function createBalloon(x, y, vx, vy) {
    balloons.push({ x, y, radius: 22, vx, vy, color: "#ffb7b2", phase: poppi.phase });
}

function bossAttackPatterns() {
    poppi.shootTimer++;
    poppi.homingTimer++;

    // ── NORMAL: abanico de globos ──
    if (poppi.state === "NORMAL") {
        const cooldown = poppi.phase === 3 ? 18 : poppi.phase === 2 ? 45 : 40;
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
                radius: 22,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: "#ffb7b2",
                phase: poppi.phase
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
            const count = poppi.phase === 3 ? 1 : 2;
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
    if (poppi.phase === 3 && poppi.homingTimer > 300) {
        poppi.homingTimer = 0;
        // Lanza 3 globos que siguen a Mochi
        for (let i = 0; i < 2; i++) {
            homingBalloons.push({
                x: poppi.x + poppi.width / 2 + (Math.random() - 0.5) * 60,
                y: poppi.y + poppi.height / 2,
                radius: 22,
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
    damagesTaken++;
    renderHearts();
    mochi.invulnerable = true;
    mochi.invulnerableTimer = 90;

    if (lives <= 0) {
        gamePaused = true;   // ← detiene update() pero draw() sigue corriendo
        AudioSystem.stopMusic();
        triggerGameOverSequence();
    }
}

// ── UPDATE ──
function update() {
    checkGamepadMenu();
    checkGamepadPause();
    if (!gameActive || gamePaused) return;

    updateMochiPhysics();
    updateShrinkMode();
    updatePoppiMovement();

    if (mochi.invulnerable) {
        mochi.invulnerableTimer--;
        if (mochi.invulnerableTimer <= 0) mochi.invulnerable = false;
    }

    if (mochi.shootCooldown > 0) mochi.shootCooldown--;

    // ── Disparo: teclado + RT del mando ──
    const gp = getGamepad();
    const shootPressed =
        keys[" "] || keys["Spacebar"] || keys["z"] || keys["Z"] || keys["x"] || keys["X"] ||
        (gp && gp.buttons[7]?.value > 0.5); // RT

    if (shootPressed && mochi.shootCooldown === 0) {
        const SPEED = 10;
        starDustProjectiles.push({
            x: mochi.x + mochi.width / 2,
            y: mochi.y + mochi.height / 2,
            radius: 5,
            vx: shootDir.x * SPEED,
            vy: shootDir.y * SPEED
        });
        mochi.shootCooldown = 12;
    }

    // ── Proyectiles Mochi ──
    for (let i = starDustProjectiles.length - 1; i >= 0; i--) {
        let p = starDustProjectiles[i];
        p.x += p.vx;
        p.y += p.vy;

        let dx = p.x - (poppi.x + poppi.width / 2);
        let dy = p.y - (poppi.y + poppi.height / 2);

        if (Math.sqrt(dx * dx + dy * dy) < p.radius + poppi.radius) {
            starDustProjectiles.splice(i, 1);

            if (!poppi.isImmune) {
                poppi.hp -= 100;
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
                    AudioSystem.stopMusic();
                    showOverlay("winMenu");
                }
            }
            continue;
        }

        if (p.y < 0 || p.y > canvas.height || p.x < 0 || p.x > canvas.width)
            starDustProjectiles.splice(i, 1);
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

    if (!gameActive && !gamePaused) return;

    if (bgImg.complete && bgImg.naturalWidth !== 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }

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
        const img = b.phase >= 2 ? balloonPurpleImg : balloonBlueImg;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.drawImage(img, -b.radius * 0.7, -b.radius, b.radius * 1.4, b.radius * 2);
        ctx.restore();
    });

    // Globos teledirigidos — rosa con pulso
    homingBalloons.forEach(h => {
        const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ff6eb4";
        ctx.globalAlpha = pulse;
        ctx.drawImage(balloonPinkImg, -h.radius * 0.7, -h.radius, h.radius * 1.4, h.radius * 2);
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
    { img: mochiImg, src: "img/mochi.png" },
    { img: poppiImg, src: "img/poppi.png" },
    { img: poppiAngryImg, src: "img/poppiBola.png" },
    { img: poppiAngryPhaseImg, src: "img/poppiAngry.png" },
    { img: bgImg, src: "img/circo.png" },
    { img: heartImg, src: "img/heart.png" },
    { img: balloonBlueImg, src: "img/globo_azul.png" },
    { img: balloonPurpleImg, src: "img/globo_morado.png" },
    { img: balloonPinkImg, src: "img/globo_rosa.png" },
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