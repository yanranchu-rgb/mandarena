// ====== Global State ======
let wordsPool = [];
let currentPlayer = 1;       // 1 or 2
let gameStarted = false;
let gameOver = false;

// Per-turn control
const MAX_ATTEMPTS_PER_CELL = 3;
const MAX_CELLS_PER_TURN = 2;
let failedCellsThisTurn = 0;

// Modal attempt state
let attemptsForCell = 0;
let activeCell = null;
let modalCountdown = null;
let topCountdown = null;
let isModalTimerRunning = false;

// Sounds
const clickSound   = new Audio(AUDIO_CLICK);
const bingoSound   = new Audio(AUDIO_BINGO);
const errorSound   = new Audio(AUDIO_ERROR);
const winnerSound  = new Audio(AUDIO_WINNER);
const markingSound = new Audio(AUDIO_MARKING);
const tiktokSound  = new Audio(AUDIO_TIKTOK);
tiktokSound.loop = true; // loops during countdown

// DOM elements
const boardEl       = document.getElementById("board");
const instructionEl = document.getElementById("instruction");
const topTimerEl    = document.getElementById("topTimer");

const startBtn   = document.getElementById("startBtn");
const endBtn     = document.getElementById("endBtn");
const randomBtn  = document.getElementById("randomBtn");

// Modal
const speechModal   = document.getElementById("speechModal");
const modalTimerEl  = document.getElementById("modalTimer");
const attemptTextEl = document.getElementById("attemptText");
const modalWordEl   = document.getElementById("modalWord");
const modalResultEl = document.getElementById("modalResult");
const speakBtn      = document.getElementById("speakBtn");

// Winner overlay
const winnerOverlay = document.getElementById("winnerOverlay");
const winnerTextEl  = document.getElementById("winnerText");

// ====== Fetch Words & Init ======
fetch("/get_words")
  .then(res => res.json())
  .then(data => {
    wordsPool = data.words;
    buildBoard(wordsPool);
    setInstruction("Press <strong>Start Game</strong>");
    setBoardDisabled(true);
  })
  .catch(err => {
    console.error(err);
    setInstruction("Error loading words.");
  });

// ====== UI Functions ======
function setInstruction(html) {
  instructionEl.classList.remove("typewriter");
  void instructionEl.offsetWidth;

  // Get avatar boxes
  const avatarBoxP1 = document.getElementById("avatar-box-p1");
  const avatarBoxP2 = document.getElementById("avatar-box-p2");

  // If showing a player message, hide both side avatars and show only the relevant avatar inside instruction
  if (avatarBoxP1 && avatarBoxP2) {
    if (html.includes("Player 1")) {
      avatarBoxP1.style.display = "none";
      avatarBoxP2.style.display = "none";
      instructionEl.innerHTML = `
        <span class="avatar p1" style="vertical-align:middle;display:inline-block;width:40px;height:40px;">
          <svg viewBox="0 0 100 100" class="avatar-svg" width="40" height="40">
            <rect x="2" y="2" width="96" height="96" fill="#ffd1e0" stroke="#000" stroke-width="3" />
            <circle cx="35" cy="40" r="8" fill="#000" class="eye eye-left" />
            <circle cx="65" cy="40" r="8" fill="#000" class="eye eye-right" />
            <polygon points="40,65 50,75 60,65" fill="#f27f8a" stroke="#000" stroke-width="2" />
            <ellipse cx="50" cy="55" rx="5" ry="3" fill="#000" />
            <path d="M20 25 L35 5 L50 25" stroke="#000" stroke-width="3" fill="#ffd1e0" />
            <path d="M80 25 L65 5 L50 25" stroke="#000" stroke-width="3" fill="#ffd1e0" />
          </svg>
        </span>
        ${html}
      `;
    } else if (html.includes("Player 2")) {
      avatarBoxP1.style.display = "none";
      avatarBoxP2.style.display = "none";
      instructionEl.innerHTML = `
        <span class="avatar p2" style="vertical-align:middle;display:inline-block;width:40px;height:40px;">
          <svg viewBox="0 0 100 100" class="avatar-svg" width="40" height="40">
            <rect x="2" y="2" width="96" height="96" fill="#ffcf99" stroke="#000" stroke-width="3" />
            <polygon points="20,20 35,5 45,25" fill="#ffa94d" stroke="#000" stroke-width="3" />
            <polygon points="80,20 65,5 55,25" fill="#ffa94d" stroke="#000" stroke-width="3" />
            <rect x="20" y="48" width="60" height="10" fill="#000" />
            <rect x="22" y="50" width="56" height="6" fill="#222" />
            <circle cx="35" cy="40" r="6" fill="#000" class="eye eye-left" />
            <circle cx="65" cy="40" r="6" fill="#000" class="eye eye-right" />
            <circle cx="50" cy="60" r="4" fill="#c00" />
            <path d="M20,70 L90,70" stroke="#000" stroke-width="2" />
          </svg>
        </span>
        ${html}
      `;
    } else {
      // Neutral message: show both side avatars, no avatar in instruction
      avatarBoxP1.style.display = "";
      avatarBoxP2.style.display = "";
      instructionEl.innerHTML = html;
    }
  } else {
    // Fallback: just set the instruction
    instructionEl.innerHTML = html;
  }

  instructionEl.classList.add("typewriter");
}

function playClickIfEnabled(btn) {
  if (!btn.disabled) {
    clickSound.currentTime = 0;
    clickSound.play();
  }
}

function setBoardDisabled(disabled) {
  if (disabled) boardEl.classList.add("disabled");
  else boardEl.classList.remove("disabled");
  document.querySelectorAll(".cell").forEach(c => {
    if (disabled) c.classList.add("disabled");
    else c.classList.remove("disabled");
  });
}

function buildBoard(words) {
  boardEl.innerHTML = "";
  words.slice(0, 100).forEach((w, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i.toString();
    cell.dataset.word = w;
    cell.dataset.owner = "0";
    cell.textContent = w;
    cell.addEventListener("click", () => onCellClick(cell));
    boardEl.appendChild(cell);
  });
}

function highlightCell(cell, on) {
  document.querySelectorAll(".cell.highlight").forEach(c => {
    c.classList.remove("highlight", "modal-open");
  });
  if (on) cell.classList.add("highlight");
}

function setHighlightModalState(activeCell) {
  if (!activeCell) return;
  activeCell.classList.add("modal-open");
}

// ====== Buttons ======
startBtn.addEventListener("click", () => {
  if (gameStarted || gameOver) return;
  playClickIfEnabled(startBtn);
  gameStarted = true;
  startBtn.disabled = true;
  randomBtn.disabled = true;
  endBtn.disabled = false;

  setInstruction("Get ready for match");
  setBoardDisabled(true);

  // Play tiktok sound during countdown
  try { tiktokSound.currentTime = 0; tiktokSound.play(); } catch(e){}

  startTopCountdown(3, () => {
    try { tiktokSound.pause(); } catch(e){}
    setInstruction("Player 1's turn");
    setBoardDisabled(false);
  }, {silent:true});
});

randomBtn.addEventListener("click", () => {
  if (gameStarted && !gameOver) return;
  playClickIfEnabled(randomBtn);
  shuffleWords();
  buildBoard(wordsPool);
  setInstruction("Board randomized.");
});

endBtn.addEventListener("click", () => {
  if (gameStarted && !gameOver) {
    playClickIfEnabled(endBtn);
    const conf = confirm("Are you sure you want to end this game? Progress will be lost.");
    if (!conf) return;
    resetGame();
  } else {
    playClickIfEnabled(endBtn);
    resetGame();
  }
});

// ====== Board events ======
function onCellClick(cell) {
  if (!gameStarted || gameOver) return;
  if (cell.dataset.owner !== "0") return;
  if (boardEl.classList.contains("disabled")) return;
  highlightCell(cell, true);
  openSpeechModal(cell);
}

// ====== Modal Flow ======
function openSpeechModal(cell) {
  activeCell = cell;
  attemptsForCell = 0;
  modalWordEl.textContent = cell.dataset.word || "";
  modalResultEl.textContent = "";
  attemptTextEl.textContent = `Attempt ${attemptsForCell+1} / ${MAX_ATTEMPTS_PER_CELL}`;

  setInstruction(`Player ${currentPlayer} is guessing…`);
  setBoardDisabled(true);

  speechModal.classList.remove("hidden");
  setHighlightModalState(cell);

  startModalCountdown(5, () => {
    attemptFail("Time out. Try again.");
  });

  speakBtn.disabled = false;
  speakBtn.onclick = () => {
    clickSound.currentTime = 0; clickSound.play();
    pauseModalCountdown();
    startSpeechRecognition(cell);
  };
}

function closeSpeechModal() {
  stopModalCountdown(true);
  speechModal.classList.add("hidden");
  if (activeCell) activeCell.classList.remove("modal-open");
  highlightCell(activeCell, false);
  activeCell = null;
  setBoardDisabled(false);
}

function attemptFail(msg) {
  errorSound.currentTime = 0; errorSound.play();
  modalResultEl.textContent = msg;
  const modalContent = speechModal.querySelector(".modal-content");
  modalContent.classList.remove("shake");
  void modalContent.offsetWidth;
  modalContent.classList.add("shake");

  attemptsForCell++;
  if (attemptsForCell < MAX_ATTEMPTS_PER_CELL) {
    attemptTextEl.textContent = `Attempt ${attemptsForCell+1} / ${MAX_ATTEMPTS_PER_CELL}`;
    startModalCountdown(5, () => {
      attemptFail("Time out. Try again.");
    });
  } else {
    closeSpeechModal();
    failedCellsThisTurn++;
    if (failedCellsThisTurn >= MAX_CELLS_PER_TURN) {
      failedCellsThisTurn = 0;
      switchTurn();
    } else {
      setInstruction(`Player ${currentPlayer}'s turn`);
    }
  }
}

function attemptSuccess(cell) {
  bingoSound.currentTime = 0; bingoSound.play();
  animateMark(cell, currentPlayer);
  markingSound.currentTime = 0; markingSound.play();

  cell.dataset.owner = String(currentPlayer);
  cell.classList.add("disabled");

  closeSpeechModal();

  if (checkWin(currentPlayer)) {
    onWin(currentPlayer);
    return;
  }

  failedCellsThisTurn = 0;
  switchTurn();
}

// ====== Speech Recognition ======
function startSpeechRecognition(cell) {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Web Speech API not supported in this browser. Please use Chrome.");
    resumeModalCountdown();
    return;
  }

  const target = (cell.dataset.word || "").trim();
  const rec = new webkitSpeechRecognition();
  rec.lang = "zh-CN";
  rec.interimResults = false;
  rec.maxAlternatives = 3;

  let finished = false;

  rec.onresult = (event) => {
    if (finished) return;
    finished = true;
    let spokenCandidates = [];
    for (let i = 0; i < event.results[0].length; i++) {
      spokenCandidates.push(event.results[0][i].transcript.trim());
    }
    const matched = spokenCandidates.some(s => looseMatchChinese(s, target));
    if (matched) {
      modalResultEl.textContent = "✔ Correct!";
      setTimeout(() => {
        attemptSuccess(cell);
      }, 250);
    } else {
      modalResultEl.textContent = "✖ Not quite.";
      setTimeout(() => {
        resumeModalCountdown();
        attemptFail("Wrong. Try again.");
      }, 200);
    }
  };

  rec.onerror = () => {
    if (!finished) {
      finished = true;
      modalResultEl.textContent = "✖ Error. Try again.";
      setTimeout(() => {
        resumeModalCountdown();
        attemptFail("Recogniser error. Try again.");
      }, 200);
    }
  };

  rec.onend = () => {
    if (!finished) {
      finished = true;
      modalResultEl.textContent = "✖ No audio detected.";
      setTimeout(() => {
        resumeModalCountdown();
        attemptFail("No audio detected.");
      }, 200);
    }
  };

  rec.start();
}

function looseMatchChinese(spoken, target) {
  const norm = s => s.replace(/[，。！？、,.!?]/g,"").replace(/\s+/g,"").trim();
  const s = norm(spoken);
  const t = norm(target);
  if (!s || !t) return false;
  if (s === t) return true;
  if (s.includes(t)) return true;
  return false;
}

// ====== Timers ======
function startTopCountdown(seconds, onEnd, {silent=false}={}) {
  clearInterval(topCountdown);
  let t = seconds;
  topTimerEl.textContent = String(t);
  topTimerEl.classList.remove("hidden");
  topCountdown = setInterval(() => {
    t--;
    topTimerEl.textContent = String(t);
    if (t <= 0) {
      clearInterval(topCountdown);
      topTimerEl.classList.add("hidden");
      if (onEnd) onEnd();
    }
  }, 1000);
}

function startModalCountdown(seconds, onEnd) {
  stopModalCountdown();
  let t = seconds;
  modalTimerEl.textContent = String(t);
  isModalTimerRunning = true;
  try { tiktokSound.currentTime = 0; tiktokSound.play(); } catch(e){}
  modalCountdown = setInterval(() => {
    if (!isModalTimerRunning) return;
    t--;
    modalTimerEl.textContent = String(t);
    if (t <= 0) {
      stopModalCountdown(true);
      if (onEnd) onEnd();
    }
  }, 1000);
}

function pauseModalCountdown() {
  isModalTimerRunning = false;
  try { tiktokSound.pause(); } catch(e){}
}
function resumeModalCountdown() {
  isModalTimerRunning = true;
  try { tiktokSound.play(); } catch(e){}
}
function stopModalCountdown(stopSound=false) {
  clearInterval(modalCountdown);
  modalCountdown = null;
  isModalTimerRunning = false;
  if (stopSound) {
    try { tiktokSound.pause(); } catch(e){}
  }
}

// ====== Turn & Win ======
function switchTurn() {
  currentPlayer = (currentPlayer === 1) ? 2 : 1;
  setInstruction(`Player ${currentPlayer}'s turn`);
  setBoardDisabled(false);
}

function checkWin(player) {
  const owners = [];
  const cells = [...document.querySelectorAll(".cell")];
  for (let r=0; r<10; r++) {
    owners[r] = [];
    for (let c=0; c<10; c++) {
      const idx = r*10 + c;
      owners[r][c] = parseInt(cells[idx].dataset.owner || "0", 10);
    }
  }
  const need = 5;
  // horizontal
  for (let r=0; r<10; r++) {
    let streak = 0;
    for (let c=0; c<10; c++) {
      streak = (owners[r][c] === player) ? streak+1 : 0;
      if (streak >= need) return true;
    }
  }
  // vertical
  for (let c=0; c<10; c++) {
    let streak = 0;
    for (let r=0; r<10; r++) {
      streak = (owners[r][c] === player) ? streak+1 : 0;
      if (streak >= need) return true;
    }
  }
  // diag down-right
  for (let r=0; r<=10-5; r++) {
    for (let c=0; c<=10-5; c++) {
      let ok = true;
      for (let k=0; k<5; k++) {
        if (owners[r+k][c+k] !== player) { ok = false; break; }
      }
      if (ok) return true;
    }
  }
  // diag up-right
  for (let r=4; r<10; r++) {
    for (let c=0; c<=10-5; c++) {
      let ok = true;
      for (let k=0; k<5; k++) {
        if (owners[r-k][c+k] !== player) { ok = false; break; }
      }
      if (ok) return true;
    }
  }
  return false;
}

function onWin(player) {
  gameOver = true;
  setBoardDisabled(true);
  startBtn.disabled = true;
  randomBtn.disabled = true;
  endBtn.disabled = true;

  winnerTextEl.textContent = `Player ${player} Wins!`;
  winnerOverlay.classList.remove("hidden");
  winnerSound.currentTime = 0; winnerSound.play();

  try {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  } catch(e){}

  setTimeout(() => {
    winnerOverlay.classList.add("hidden");
    endBtn.disabled = false;
    setInstruction(`Player ${player} wins!`);
  }, 4000);
}

function resetGame() {
  try { tiktokSound.pause(); } catch(e){}
  stopModalCountdown(true);
  clearInterval(topCountdown);
  topTimerEl.classList.add("hidden");
  speechModal.classList.add("hidden");
  winnerOverlay.classList.add("hidden");

  gameOver = false;
  gameStarted = false;
  currentPlayer = 1;
  failedCellsThisTurn = 0;
  attemptsForCell = 0;
  activeCell = null;

  document.querySelectorAll(".cell").forEach(c => {
    c.dataset.owner = "0";
    c.classList.remove("disabled", "highlight", "modal-open");
    const ml = c.querySelector(".mark-layer");
    if (ml) ml.remove();
  });

  startBtn.disabled = false;
  randomBtn.disabled = false;
  endBtn.disabled = false;
  setBoardDisabled(true);

  setInstruction("Press <strong>Start Game</strong>");
}

// ====== Mark Animation ======
function animateMark(cell, player) {
  let layer = cell.querySelector(".mark-layer");
  if (!layer) {
    layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    layer.setAttribute("class", "mark-layer");
    layer.setAttribute("viewBox", "0 0 100 100");
    layer.setAttribute("preserveAspectRatio", "none");
    cell.appendChild(layer);
  }
  while (layer.firstChild) layer.removeChild(layer.firstChild);

  const stroke = (player === 1)
    ? getComputedStyle(document.documentElement).getPropertyValue('--p1').trim()
    : getComputedStyle(document.documentElement).getPropertyValue('--p2').trim();
  const ns = "http://www.w3.org/2000/svg";
  let shape;
  if (player === 1) {
    // Ellipse fits inside cell with enough margin for stroke
    shape = document.createElementNS(ns, "ellipse");
    shape.setAttribute("cx", "50");
    shape.setAttribute("cy", "50");
    shape.setAttribute("rx", "44"); // leave 6px margin for stroke
    shape.setAttribute("ry", "34");
  } else {
    // Rectangle fits inside cell with enough margin for stroke
    shape = document.createElementNS(ns, "rect");
    shape.setAttribute("x", "8");
    shape.setAttribute("y", "16");
    shape.setAttribute("width", "84");
    shape.setAttribute("height", "68");
    shape.setAttribute("rx", "12");
    shape.setAttribute("ry", "12");
  }
  shape.setAttribute("fill", "transparent");
  shape.setAttribute("stroke", stroke);
  shape.setAttribute("stroke-width", "6");
  shape.setAttribute("class", "mark-stroke crayon-stroke");
  layer.appendChild(shape);
}

// ====== Helpers ======
function shuffleWords() {
  for (let i = wordsPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wordsPool[i], wordsPool[j]] = [wordsPool[j], wordsPool[i]];
  }
}
