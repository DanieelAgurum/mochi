// ── Fondo animado del menú ──
const menuCanvas = document.getElementById('menuBg');
const mctx = menuCanvas.getContext('2d');
let mW, mH, mStars = [], mLanterns = [], mTime = 0;
let menuLoopActive = false;

const menuBgImg = new Image();
menuBgImg.onload = () => {
    menuLoopActive = true;
    menuResize();
    menuBgLoop();
};
menuBgImg.src = "img/inicio.png";

function menuResize() {
    mW = menuCanvas.width = window.innerWidth;
    mH = menuCanvas.height = window.innerHeight;
    mStars = Array.from({ length: 160 }, () => ({
        x: Math.random() * mW, y: Math.random() * mH,
        r: Math.random() * 1.8 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.04 + 0.01,
        color: ['#fff', '#ffd6f0', '#c9a8ff', '#ffe066'][Math.floor(Math.random() * 4)]
    }));
    mLanterns = Array.from({ length: 14 }, () => {
        const l = makeMenuLantern(); l.y = Math.random() * mH; return l;
    });
}

function makeMenuLantern() {
    return {
        x: Math.random() * mW, y: mH + 40,
        size: Math.random() * 12 + 10, speed: Math.random() * 0.4 + 0.2,
        swaySpeed: Math.random() * 0.02 + 0.005, swayOff: Math.random() * Math.PI * 2,
        color: ['rgba(255,180,255,0.35)', 'rgba(200,150,255,0.35)', 'rgba(255,220,100,0.35)', 'rgba(150,200,255,0.3)'][Math.floor(Math.random() * 4)],
        glow: ['rgba(255,150,255,0.18)', 'rgba(180,120,255,0.18)', 'rgba(255,200,80,0.15)'][Math.floor(Math.random() * 3)]
    };
}

function drawMenuBg() {
    mctx.drawImage(menuBgImg, 0, 0, mW, mH);
}

function drawMenuStars() {
    mStars.forEach(s => {
        s.twinkle += s.twinkleSpeed;
        const a = 0.4 + 0.6 * Math.abs(Math.sin(s.twinkle));
        mctx.beginPath(); mctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        mctx.fillStyle = s.color; mctx.globalAlpha = a; mctx.fill(); mctx.globalAlpha = 1;
    });
}

function drawMenuLanterns() {
    mLanterns.forEach(l => {
        l.y -= l.speed;
        l.x += Math.sin(mTime * l.swaySpeed + l.swayOff) * 0.3;
        if (l.y < -60) {
            const n = makeMenuLantern();
            Object.assign(l, n);
            l.x = Math.random() * mW;
            l.y = mH + 40;
        }
        mctx.save();
        mctx.translate(l.x, l.y);
        mctx.shadowColor = l.glow;
        mctx.shadowBlur = l.size * 2;
        mctx.fillStyle = l.color;
        mctx.beginPath();
        const r = l.size * 0.5;
        mctx.moveTo(0, -r);
        mctx.quadraticCurveTo(0, 0, r, 0);
        mctx.quadraticCurveTo(0, 0, 0, r);
        mctx.quadraticCurveTo(0, 0, -r, 0);
        mctx.quadraticCurveTo(0, 0, 0, -r);
        mctx.closePath();
        mctx.strokeStyle = 'rgba(255,255,255,0.5)';
        mctx.lineWidth = 1.5;
        mctx.stroke();
        mctx.fill(); // Rellena la figura
        mctx.shadowBlur = 0;
        mctx.restore();
    });
}

function menuBgLoop() {
    if (!menuLoopActive) return;
    mTime++;
    mctx.clearRect(0, 0, mW, mH);
    drawMenuBg();
    drawMenuStars();
    drawMenuLanterns();
    requestAnimationFrame(menuBgLoop);
}

window.addEventListener('resize', menuResize);

// ── Funciones del menú ──
function openMenuOverlay(id, btn) { if (btn) menuBurst(btn); document.getElementById(id).classList.add('active'); }
function closeMenuOverlay(id) { document.getElementById(id).classList.remove('active'); }
function toggleSwitch(el) { el.classList.toggle('on'); menuBurst(el); }

function onPlayBtn(btn) {
    menuBurst(btn);
    btn.style.transform = 'scale(0.93)';
    setTimeout(() => {
        btn.style.transform = '';
        btn.innerHTML = '<span class="icon">✨</span> ¡Cargando el circo!';
        document.getElementById('mainMenuScene').style.display = 'none';
        menuLoopActive = false;
        menuCanvas.style.display = 'none';
        requestFullscreen();
        AudioSystem.stopMusic();
        showBossIntro('poppi', () => {
            startGameWithoutFullscreen();
        });
        setTimeout(() => { btn.innerHTML = 'Jugar'; }, 2200);
    }, 180);
}

function menuBurst(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const colors = ['#ff9ff3', '#ffe066', '#c9a8ff', '#ff6b9d', '#80dfff', '#b8ff9f'];
    const wrap = document.createElement('div'); wrap.className = 'burst'; document.body.appendChild(wrap);
    for (let i = 0; i < 14; i++) {
        const d = document.createElement('div'); d.className = 'confetti-dot';
        const angle = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 60;
        d.style.cssText = `left:${cx - 4}px;top:${cy - 4}px;background:${colors[Math.floor(Math.random() * colors.length)]};--tx:${Math.cos(angle) * dist}px;--ty:${Math.sin(angle) * dist}px;animation-duration:${0.5 + Math.random() * 0.3}s;`;
        wrap.appendChild(d);
    }
    setTimeout(() => wrap.remove(), 900);
}

document.addEventListener('mousemove', e => {
    if (Math.random() < 0.12) {
        const s = document.createElement('div'); s.className = 'sparkle-trail';
        const colors = ['#ff9ff3', '#c9a8ff', '#ffe066', '#80dfff'];
        s.style.cssText = `left:${e.clientX - 3}px;top:${e.clientY - 3}px;background:${colors[Math.floor(Math.random() * colors.length)]};`;
        document.body.appendChild(s); setTimeout(() => s.remove(), 500);
    }
});

// ── Boss Intro Screen ──
const BOSS_INTROS = {
    poppi: {
        img: "img/poppi.png",
        name: "Poppi the Balloon Clown",
        pre: "¡Damas y caballeros!",
        sub: "Esta noche, el circo tiene un número especial...",
        desc: '"Dicen que Poppi nunca ha terminado un show. Sus globos simplemente... explotan antes.',
        chips: [
            { label: "Globos bomba" },
            { label: "Inflado" },
            { label: "Rebote" }
        ],
        decor: [
            { symbol: "🎈", left: "12%", top: "65%", delay: "0s" },
            { symbol: "🎈", left: "80%", top: "70%", delay: "1.2s" },
            { symbol: "🎈", left: "25%", top: "75%", delay: "2.4s" },
            { symbol: "🎈", left: "70%", top: "60%", delay: "0.7s" }
        ],
        music: "combat"
    },
    lady: {
        img: "img/lady.png",
        name: "Lady Twinkle",
        pre: "Silencio, por favor.",
        sub: "La caja musical ha comenzado a girar.",
        desc: '"Lleva bailando desde antes de que el circo abriera. Nadie sabe cuándo fue la última vez que se detuvo."',
        chips: [
            { label: "Patrones circulares" },
            { label: "Notas musicales" },
            { label: "Pista de baile" }
        ],
        decor: [
            { symbol: "♩", left: "12%", top: "65%", delay: "0s" },
            { symbol: "♫", left: "80%", top: "70%", delay: "1.2s" },
            { symbol: "♪", left: "25%", top: "75%", delay: "2.4s" },
            { symbol: "♬", left: "70%", top: "60%", delay: "0.7s" }
        ],
        music: "lady"
    }
};

function showBossIntro(bossKey, onFinish) {
    const boss = BOSS_INTROS[bossKey];
    if (!boss) { onFinish(); return; }

    const screen = document.getElementById('bossIntroScreen');

    // ── Contenido ──
    document.querySelector('#introBossImg img').src = boss.img;
    document.querySelector('#introBossImg img').alt = boss.name;
    document.getElementById('introTextPre').textContent = boss.pre;
    document.getElementById('introTextSub').textContent = boss.sub;
    document.getElementById('introTextName').textContent = boss.name;

    // Chips de ataques
    const chipsContainer = document.getElementById('introChips');
    chipsContainer.innerHTML = '';
    boss.chips.forEach(chip => {
        const el = document.createElement('span');
        el.className = 'intro-chip';
        el.innerHTML = `<span class="intro-chip-icon">✦</span><span>${chip.label}</span>`;
        chipsContainer.appendChild(el);
    });
    const chipEls = chipsContainer.querySelectorAll('.intro-chip');

    // ── Reset de estados visuales ──
    screen.classList.remove('spot-on');
    document.getElementById('curtainLeft').classList.remove('open');
    document.getElementById('curtainRight').classList.remove('open');
    document.getElementById('introBossImg').classList.remove('visible');

    ['introHeading', 'introTextName', 'introStars', 'introTextDesc', 'introContinue'].forEach(id => {
        document.getElementById(id).classList.remove('show');
    });
    chipEls.forEach(el => el.classList.remove('show'));

    // Decoraciones flotantes (varían según el boss)
    const decorContainer = document.getElementById('introDecor');
    decorContainer.innerHTML = '';
    (boss.decor || []).forEach(d => {
        const el = document.createElement('span');
        el.className = 'intro-decor';
        el.textContent = d.symbol;
        el.style.left = d.left;
        el.style.top = d.top;
        el.style.animationDelay = d.delay;
        decorContainer.appendChild(el);
    });

    const descTextEl = document.getElementById('introDescText');
    const cursorEl = document.getElementById('introCursor');
    descTextEl.textContent = '';
    cursorEl.classList.remove('hidden');

    const progressFill = document.getElementById('introProgressFill');
    progressFill.style.transition = 'none';
    progressFill.style.width = '0%';

    const iris = document.getElementById('introIrisOverlay');
    iris.classList.remove('closing');
    iris.style.transition = 'none';

    screen.style.display = 'flex';

    let finished = false;
    let typeTimer = null;
    let progressTimeout = null;

    function finish() {
        if (finished) return;
        finished = true;
        clearInterval(typeTimer);
        clearTimeout(progressTimeout);
        document.removeEventListener('keydown', finish);
        screen.removeEventListener('click', finish);

        const irisEl = document.getElementById('introIrisOverlay');
        irisEl.style.transition = 'none';
        irisEl.classList.remove('closing');
        void irisEl.offsetWidth;
        irisEl.style.transition = ''; // limpia el inline para que la transición del CSS funcione
        irisEl.classList.add('closing');

        setTimeout(() => {
            hideBossIntro();
            AudioSystem.playMusic(boss.music);

            // Pausa antes de que comience la acción (ataques / movimiento de Mochi)
            setTimeout(() => {
                onFinish();
            }, 1000);
        }, 1400);
    }

    // ── Cortinas ──
    setTimeout(() => {
        document.getElementById('curtainLeft').classList.add('open');
        document.getElementById('curtainRight').classList.add('open');
    }, 300);

    // ── Spotlight + imagen del jefe ──
    setTimeout(() => screen.classList.add('spot-on'), 1700);
    setTimeout(() => document.getElementById('introBossImg').classList.add('visible'), 2000);

    // ── Revelado escalonado del panel de texto ──
    const STAGGER = 280;
    let t = 2400;

    setTimeout(() => document.getElementById('introHeading').classList.add('show'), t);
    t += STAGGER;

    setTimeout(() => document.getElementById('introTextName').classList.add('show'), t);
    t += STAGGER;

    setTimeout(() => document.getElementById('introStars').classList.add('show'), t);
    t += STAGGER;

    // Chips de ataques, uno por uno
    chipEls.forEach((el, i) => {
        setTimeout(() => el.classList.add('show'), t + i * 220);
    });
    t += chipEls.length * 220 + 200;

    // ── Descripción tipo máquina de escribir ──
    setTimeout(() => {
        document.getElementById('introTextDesc').classList.add('show');
        const fullText = boss.desc;
        const TYPE_SPEED = 28; // ms por caracter
        let i = 0;
        typeTimer = setInterval(() => {
            i++;
            descTextEl.textContent = fullText.slice(0, i);
            if (i >= fullText.length) {
                clearInterval(typeTimer);
                cursorEl.classList.add('hidden');
                showContinue();
            }
        }, TYPE_SPEED);
    }, t);

    function showContinue() {
        document.getElementById('introContinue').classList.add('show');

        const PROGRESS_MS = 4000;
        requestAnimationFrame(() => {
            progressFill.style.transition = `width ${PROGRESS_MS}ms linear`;
            progressFill.style.width = '100%';
        });
        progressTimeout = setTimeout(finish, PROGRESS_MS);

        document.addEventListener('keydown', finish);
        screen.addEventListener('click', finish);
    }
}

function hideBossIntro() {
    const screen = document.getElementById('bossIntroScreen');
    screen.style.display = 'none';
    screen.classList.remove('spot-on');
    document.getElementById('curtainLeft').classList.remove('open');
    document.getElementById('curtainRight').classList.remove('open');
    document.getElementById('introBossImg').classList.remove('visible');

    ['introHeading', 'introTextName', 'introStars', 'introTextDesc', 'introContinue'].forEach(id => {
        document.getElementById(id).classList.remove('show');
    });
    document.querySelectorAll('#introChips .intro-chip').forEach(el => el.classList.remove('show'));

    document.getElementById('introDescText').textContent = '';
    document.getElementById('introCursor').classList.remove('hidden');

    const progressFill = document.getElementById('introProgressFill');
    progressFill.style.transition = 'none';
    progressFill.style.width = '0%';
}