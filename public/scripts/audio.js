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

    function playSFX(name) {
        if (name !== "click") return; // solo click habilitado
        const sfx = new Audio("sounds/clickButton.wav");
        const slider = document.getElementById("sliderSFX");
        sfx.volume = slider ? slider.value / 100 : 0.8;
        sfx.play().catch(() => { });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const sliderMusic = document.getElementById("sliderMusic");
        if (sliderMusic) {
            sliderMusic.addEventListener("input", () => {
                setMusicVolume(sliderMusic.value / 100);
            });
        }
    });

    return { playMusic, stopMusic, playSFX };
})();