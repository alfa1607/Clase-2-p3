const YOUTUBE_VIDEO_ID = "hIkd9yvg-8w";

const overlay = document.getElementById("challengeOverlay");
const finalOverlay = document.getElementById("finalOverlay");
const answers = document.getElementById("answers");
const feedback = document.getElementById("feedback");
const continueBtn = document.getElementById("continueBtn");
const restartBtn = document.getElementById("restartBtn");
const xpEl = document.getElementById("xp");
const correctEl = document.getElementById("correctCount");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const missionCount = document.getElementById("missionCount");
const missionTitle = document.getElementById("missionTitle");
const missionDescription = document.getElementById("missionDescription");
const timerEl = document.getElementById("timer");

// Preguntas integradas en el propio JavaScript.
// Nota: esto no oculta las respuestas al inspeccionar el código.
const lessonData = {
    lessonTitle: "Laplace Challenge — Clase 2, parte 3",
    lessonDescription: "Sistemas de control, lazo abierto y cerrado, diagramas de bloques y funciones de transferencia",
    challenges: [
        { time: 85, title: "Identifica el sistema", icon: "🔎", question: "¿Qué se representa principalmente en el esquema que se construye durante la clase?", options: ["Un sistema y sus elementos relacionados", "Una lista de archivos del computador", "Una tabla de horarios"], answer: 0, explanation: "El esquema representa los elementos del sistema y cómo se relacionan entre sí.", xp: 100 },
        { time: 155, title: "Reconoce la planta", icon: "🏭", question: "En un sistema de control, ¿qué significa normalmente la planta o proceso?", options: ["El proceso físico que se desea controlar", "El valor de la nota del estudiante", "La interfaz del reproductor"], answer: 0, explanation: "La planta es el proceso o sistema físico cuyo comportamiento se busca regular.", xp: 100 },
        { time: 235, title: "Entrada y salida", icon: "↔️", question: "En un modelo de sistema, ¿qué describen la entrada y la salida?", options: ["La señal aplicada al sistema y la respuesta que produce", "El nombre del archivo y su extensión", "La duración y resolución del video"], answer: 0, explanation: "La entrada es la señal que se aplica y la salida es la respuesta del sistema.", xp: 100 },
        { time: 315, title: "Lazo abierto", icon: "➰", question: "¿Cuál es una característica de un sistema de control de lazo abierto?", options: ["La acción de control no se ajusta usando la salida medida", "Siempre compara la salida con la referencia", "No tiene entrada"], answer: 0, explanation: "En lazo abierto, la acción no se corrige a partir de una medición de la salida.", xp: 100 },
        { time: 405, title: "Lazo cerrado", icon: "🔁", question: "¿Qué distingue a un sistema de control de lazo cerrado?", options: ["Utiliza realimentación para comparar la salida con la referencia", "No tiene proceso que controlar", "La salida nunca se mide"], answer: 0, explanation: "La realimentación devuelve información de la salida para compararla con el valor deseado.", xp: 150 },
        { time: 495, title: "Bloques del controlador", icon: "⚙️", question: "¿Cuál es la función general del controlador en un sistema de control?", options: ["Determinar una acción de control según el error o la estrategia definida", "Mostrar únicamente el video", "Eliminar por definición todas las perturbaciones"], answer: 0, explanation: "El controlador determina la acción que se aplica al proceso para alcanzar el comportamiento deseado.", xp: 150 },
        { time: 610, title: "Desafío final", icon: "🏆", question: "¿Para qué sirve una función de transferencia en el análisis de sistemas lineales?", options: ["Relaciona matemáticamente la salida con la entrada en el dominio de Laplace, con condiciones iniciales nulas", "Indica la cantidad de colores de un diagrama", "Sustituye todos los componentes físicos del sistema"], answer: 0, explanation: "La función de transferencia expresa la relación salida/entrada en el dominio de Laplace bajo condiciones iniciales nulas.", xp: 200 }
    ]
};
let challenges = lessonData.challenges;

let current = 0;
let xp = 0;
let correct = 0;
let challengeOpen = false;
let answered = false;
let timer = null;
let seconds = 20;

// ============================================================
// YOUTUBE: reproductor + revisión del tiempo
// ============================================================
let player = null;        // objeto del reproductor de YouTube
let playerReady = false;  // true cuando el reproductor terminó de cargar
let watcher = null;       // intervalo que revisa el tiempo del video
let pendingPlay = false;  // por si se pide play antes de que cargue

// Carga la librería de YouTube. Cuando está lista, YouTube llama
// automáticamente a onYouTubeIframeAPIReady (debe ser una función global).
(function loadYouTubeAPI() {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
})();

window.onYouTubeIframeAPIReady = function () {
    // Reemplaza <div id="lessonVideo"> por el reproductor (un iframe)
    player = new YT.Player("lessonVideo", {
        videoId: YOUTUBE_VIDEO_ID,
        playerVars: {
            rel: 0,            // al pausar, solo sugiere videos de tu canal
            modestbranding: 1, // logo de YouTube más discreto
            playsinline: 1,    // reproduce dentro de la página en iPhone
            fs: 1
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
};

function onPlayerReady() {
    playerReady = true;
    if (pendingPlay) playVideo();
}

// YouTube avisa cada vez que el video cambia de estado:
// 1 = reproduciendo, 2 = en pausa, 0 = terminó, 3 = cargando...
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        startWatcher();
    } else {
        stopWatcher();
    }
    if (event.data === YT.PlayerState.ENDED) {
        handleEnded();
    }
}

// Reemplaza al evento "timeupdate" del <video>, que YouTube no tiene:
// mientras el video se reproduce, consultamos el tiempo cada 250 ms.
function startWatcher() {
    stopWatcher();
    watcher = setInterval(checkChallenge, 250);
}

function stopWatcher() {
    clearInterval(watcher);
    watcher = null;
}

function checkChallenge() {
    if (!playerReady || challengeOpen || current >= challenges.length) return;
    const c = challenges[current];
    if (player.getCurrentTime() >= c.time) {
        pauseVideo();
        showChallenge(c);
    }
}

function handleEnded() {
    if (current < challenges.length && !challengeOpen) {
        current = challenges.length;
        updateDashboard();
        finish();
    }
}

// Funciones auxiliares para no repetir código ni fallar si
// el reproductor todavía no ha cargado.
function playVideo() {
    if (!playerReady) { pendingPlay = true; return; }
    pendingPlay = false;
    player.playVideo();
}

function pauseVideo() {
    if (playerReady) player.pauseVideo();
}

function restartVideo() {
    if (playerReady) player.seekTo(0, true);
}

// ============================================================
// LÓGICA DE LA ACTIVIDAD (igual que antes)
// ============================================================
function updateDashboard() {
    const done = current;
    const total = challenges.length || 1;
    const pct = Math.round((done / total) * 100);
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `Misión ${done} de ${challenges.length}`;
    progressPercent.textContent = `${pct}%`;
    xpEl.textContent = xp;
    correctEl.textContent = correct;
    missionCount.textContent = `${String(Math.min(current + 1, challenges.length)).padStart(2, "0")} / ${String(challenges.length).padStart(2, "0")}`;
}

function showChallenge(c) {
    challengeOpen = true;
    answered = false;
    seconds = 20;
    clearInterval(timer);
    timerEl.textContent = seconds;

    document.getElementById("challengeTitle").textContent = c.title;
    document.getElementById("challengeQuestion").textContent = c.question;
    document.getElementById("challengeIcon").textContent = c.icon;
    feedback.textContent = "";
    feedback.className = "feedback";
    continueBtn.classList.add("hidden");
    answers.innerHTML = "";

    c.options.forEach((option, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "answer";
        btn.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
        btn.addEventListener("click", () => chooseAnswer(index));
        answers.appendChild(btn);
    });

    missionTitle.textContent = c.title;
    missionDescription.textContent = "Responde el reto para continuar con la clase.";
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");

    timer = setInterval(() => {
        seconds--;
        timerEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(timer);
            if (!answered) chooseAnswer(-1);
        }
    }, 1000);
}

function chooseAnswer(index) {
    if (answered) return;
    answered = true;
    clearInterval(timer);

    const c = challenges[current];
    const buttons = [...answers.querySelectorAll(".answer")];
    buttons.forEach((b, i) => {
        b.disabled = true;
        if (i === c.answer) b.classList.add("correct");
        if (i === index && index !== c.answer) b.classList.add("wrong");
    });

    if (index === c.answer) {
        correct++;
        xp += c.xp;
        feedback.textContent = `✓ ${c.explanation} +${c.xp} XP`;
        feedback.className = "feedback good";
    } else {
        feedback.textContent = index === -1
            ? `⏱️ Se acabó el tiempo. ${c.explanation}`
            : `✕ No esta vez. ${c.explanation}`;
        feedback.className = "feedback bad";
    }

    xpEl.textContent = xp;
    correctEl.textContent = correct;
    continueBtn.classList.remove("hidden");
}

continueBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    challengeOpen = false;
    current++;
    updateDashboard();

    if (current >= challenges.length) {
        finish();
        return;
    }

    missionTitle.textContent = "Sigue observando";
    missionDescription.textContent = "El siguiente reto aparecerá automáticamente durante la explicación.";
    playVideo();
});

function finish() {
    pauseVideo();
    document.getElementById("finalXP").textContent = xp;
    document.getElementById("finalCorrect").textContent = `${correct}/${challenges.length}`;
    document.getElementById("finalMessage").textContent =
        correct >= 5
            ? "Excelente trabajo. Completaste todos los retos de esta clase."
            : "Actividad completada. Puedes repetirla para reforzar los conceptos.";
    finalOverlay.classList.remove("hidden");
    finalOverlay.setAttribute("aria-hidden", "false");
    progressBar.style.width = "100%";
    progressText.textContent = `Misión ${challenges.length} de ${challenges.length}`;
    progressPercent.textContent = "100%";
}

restartBtn.addEventListener("click", () => {
    current = 0;
    xp = 0;
    correct = 0;
    challengeOpen = false;
    clearInterval(timer);
    finalOverlay.classList.add("hidden");
    finalOverlay.setAttribute("aria-hidden", "true");
    restartVideo();
    updateDashboard();
    missionTitle.textContent = "Prepárate";
    missionDescription.textContent = "Mira la clase y presta atención: aparecerán retos durante la explicación.";
    playVideo();
});

function loadQuestions() {
    document.title = lessonData.lessonTitle || document.title;
    document.querySelector(".topbar h1").textContent = lessonData.lessonTitle || "Laplace Challenge";
    document.querySelector(".topbar p").textContent = lessonData.lessonDescription || "Actividad interactiva";
    document.querySelector(".stats div:nth-child(2) strong").textContent = challenges.length;
    document.getElementById("missionCount").textContent = `01 / ${String(challenges.length).padStart(2, "0")}`;
    document.getElementById("progressText").textContent = `Misión 0 de ${challenges.length}`;
    document.getElementById("finalCorrect").textContent = `0/${challenges.length}`;
    updateDashboard();
}

loadQuestions();

