// ── SISTEMA DE AUDIO ──
const AudioSystem = (() => {
    const music = {
        menu: new Audio("sounds/gregorquendel__procrastination-rag-1927-george-l.mp3"),
        combat: new Audio("sounds/Batty McFaddin.mp3"),
        lady: new Audio("sounds/designerschoice__musctoy_music-box-playing-carousel-possible-use-for-ice-cream-truck-bells_nicholas-judy_tdc.wav"),
    };

    Object.values(music).forEach(m => {
        m.loop = true;
        m.volume = 0.7;
    });

    let currentMusic = null;

    function playMusic(track) {
        if (currentMusic === music[track]) return;
        if (currentMusic) {
            currentMusic.pause();
            currentMusic.currentTime = 0;
        }
        currentMusic = music[track];
        currentMusic.volume = getMusicVolume();
        currentMusic.play().catch(() => { });
    }

    function stopMusic() {
        if (currentMusic) {
            currentMusic.pause();
            currentMusic.currentTime = 0;
            currentMusic = null;
        }
    }

    function getMusicVolume() {
        const slider = document.getElementById("sliderMusic");
        return slider ? slider.value / 100 : 0.7;
    }

    function setMusicVolume(val) {
        if (currentMusic) currentMusic.volume = val;
    }

    const sfx = {
        buttonPush: new Audio("sounds/earth_cord__button-push.wav"),
        lose: new Audio("sounds/littlerobotsoundfactory__jingle_lose_00.wav"),
        win: new Audio("sounds/matustrm__completed.wav"),
    };

    function getSFXVolume() {
        const slider = document.getElementById("sliderSFX");
        return slider ? slider.value / 100 : 0.8;
    }

    function playSFX(name) {
        const sound = sfx[name];
        if (!sound) return;
        sound.currentTime = 0;
        sound.volume = getSFXVolume();
        sound.play().catch(() => { });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const sliderMusic = document.getElementById("sliderMusic");
        if (sliderMusic) {
            sliderMusic.addEventListener("input", () => {
                setMusicVolume(sliderMusic.value / 100);
            });
        }
    });

    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".menu-btn, .main-menu-btn, .close-btn");
        if (btn) playSFX("buttonPush");
    });

    return { playMusic, stopMusic, playSFX };
})();