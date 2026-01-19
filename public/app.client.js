/* ===== Helpers ===== */
const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, html = "") => {
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v);
    if (html) n.innerHTML = html;
    return n;
};

/* ===== Configuración de juegos ===== */
const GAMES = [
    { id:"pacman", title:"Pac-Man", emoji:"🟡", desc:"Come puntos, esquiva fantasmas.", url:"/pacman/" },
    { id:"2048",   title:"2048",    emoji:"🔢", desc:"Une fichas hasta 2048.",          url:"/juego-2048/" },
    { id:"tetris", title:"Tetris",   emoji:"🧱", desc:"Encaja piezas sin dejar huecos.", url:"/tetris/" }
];

/* ===== Obtener el Score de los juegos ===== */
function attachScoreObserver() {
    const iframe = $('#game-frame');
    const doc = iframe.contentWindow.document;

    const scoreNode = doc.getElementById('score') || doc.querySelector('.score') || doc.querySelector('.score-container');
    if (!scoreNode) { console.warn('No se encontró el nodo de score'); return; }

    
    const readScore = () => readScoreFromNode(scoreNode);

    currentScore = readScore();

    const mo = new MutationObserver(() => { currentScore = readScore(); });
    mo.observe(scoreNode, { childList: true, subtree: true, characterData: true });
}


function readScoreFromNode(scoreNode) {
  const texts = Array.from(scoreNode.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)  
    .map(n => n.textContent.trim())
    .filter(Boolean);

  const text = texts[0] || '';
  const num = parseInt(text.replace(/[^\d-]/g, ''), 10); 
  return num || 0;
}

/* ===== Switcher de secciones ===== */
const ventasSec = $("#ventas-section");
const arcadeSec = $("#arcade-section");
const btnVentas = $("#btn-ventas");
const btnArcade = $("#btn-arcade");

function showSection(which) {
    const v = which === "ventas";
    ventasSec.style.display = v ? "" : "none";
    arcadeSec.style.display = v ? "none" : "";
    btnVentas.classList.toggle("active", v);
    btnArcade.classList.toggle("active", !v);
    if (v) load_games(); else load_scores();
}
btnVentas.onclick = () => showSection("ventas");
btnArcade.onclick  = () => showSection("arcade");

/* ===== Render de Arcade ===== */
const gamesWrap = $("#games");
function renderGames() {
    gamesWrap.innerHTML = "";
    GAMES.forEach(g => {
    const card = el("div", { class:"game" });
    card.innerHTML = `
        <div class="game-header">
        <div class="game-emoji">${g.emoji}</div>
        <div>
            <h3 class="game-title">${g.title}</h3>
            <p class="game-desc">${g.desc}</p>
        </div>
        </div>
        <div class="game-actions">
        <button class="play">Jugar</button>
        </div>`;
    card.querySelector(".play").onclick = () => openGame(g);
    gamesWrap.appendChild(card);
    });
}

/* ===== Modal de juego ===== */
const modal = $("#game-modal");
const frame = $("#game-frame");
const title = $("#game-title");
const openBtn = $("#game-open");

let currentgame = null;
let currentScore = null;

function openGame(game) {
    currentgame = game;
    console.log('Abriendo juego:', game.id, '->', game.url);
    title.textContent = game.title;
    frame.src = game.url;
    frame.addEventListener('load', attachScoreObserver, { once: true });
    openBtn.onclick = () => window.open(game.url, "_blank", "noopener");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
}
function closeGame() {
    frame.src = "";
    modal.classList.remove("open");
    document.body.style.overflow = "";
}

$("#game-close").onclick = closeGame;
modal.addEventListener("click", e => { if (e.target === modal) closeGame(); });

/* ===== Añadir Record ===== */
const recordOverlay = $("#record-overlay");
const inNombre = $("#rec-nombre");
const inScore  = $("#rec-score");
const btnAddRecord = $("#game-record");
const btnCloseRecord = $("#rec-close");
const btnSaveRecord  = $("#rec-save");

function openRecord() {
    inNombre.value = "";
    inScore.value  = String(currentScore || 0);
    inScore.readOnly = true;
    recordOverlay.classList.add("open");      
    document.body.style.overflow = "hidden";  
    inNombre.focus();
}

function closeRecord() {
    recordOverlay.classList.remove("open");   
    document.body.style.overflow = "";
}
btnAddRecord.addEventListener("click", openRecord);
btnCloseRecord.addEventListener("click", closeRecord);

/* ===== Guardar ===== */
btnSaveRecord.addEventListener("click", async () => {
    const nombre = inNombre.value.trim() || "Anon";
    const score  = Number(inScore.value.trim());
    if (!currentgame) return alert("Abre un juego antes de guardar.");
    if (!Number.isFinite(score) || score < 0) return alert("Puntaje inválido.");

    btnSaveRecord.disabled = true;
    try {
    const resp = await fetch("/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: currentgame.id, player: nombre, score })
    });

    const payload = await resp.json().catch(() => ({}));
    console.log("POST /record ->", resp.status, payload);

    if (!resp.ok) {
        alert(payload?.error || "Error al guardar el récord");
        return;
    }

    await load_scores();
    closeRecord();
    } finally {
    btnSaveRecord.disabled = false;
    }
});

/* ===== Ranking (VENTAS) ===== */
const tbody = $("#table tbody");
const statusEl = $("#status");
const countEl = $("#count");

const fmt = n => new Intl.NumberFormat("en",{ maximumFractionDigits:2 }).format(n);

function buildQuery() {
    const qs = new URLSearchParams();
    const y = $("#year").value.trim();
    const p = $("#platform").value.trim();
    const l = $("#limit").value;
    if (y) qs.set("year", y);
    if (p) qs.set("platform", p);
    if (l) qs.set("limit", l);
    return qs.toString();
}

function pick(obj, ...keys) {
    for (const k of keys) if (obj && obj[k] !== undefined) return obj[k];
    return undefined;
}

async function load_games() {
    const url = "/ranking?" + buildQuery();
    statusEl.textContent = "Cargando…";
    tbody.innerHTML = "";
    try {
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
        statusEl.textContent = "Sin resultados con esos filtros.";
        countEl.textContent = "0 resultados";
        return;
    }

    const rows = data.map((r, i) => {
        const name = pick(r, "name", "Name") ?? "—";
        const platform = pick(r, "platform", "Platform") ?? "—";
        const year = pick(r, "year", "Year") ?? "—";
        const global = pick(r, "Global_Sales") ?? 0;
        return { rank: i + 1, name, platform, year, global };
    });

    for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td><span class="pill">#${r.rank}</span></td>
        <td>${r.name}</td>
        <td>${r.platform}</td>
        <td class="right">${r.year}</td>
        <td class="right"><strong>${fmt(r.global)}</strong> M</td>
        `;
        tbody.appendChild(tr);
    }
    statusEl.textContent = "";
    countEl.textContent = `${rows.length} resultados`;
    } catch (e) {
    statusEl.textContent = "Error cargando datos. Revisa que el servidor esté en 3000.";
    countEl.textContent = "—";
    }
}

$("#search").addEventListener("click", load_games);
$("#reset").addEventListener("click", () => {
    $("#year").value = ""; $("#platform").value = ""; $("#limit").value = "20";
    load_games();
});

renderGames();
load_games();

/* ===== Leaderboard ===== */
const lbTbody  = document.querySelector("#lb-table tbody");
const lbStatus = document.querySelector("#lb-status");
const lbCount  = document.querySelector("#lb-count");

const fmtInt = n => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);

function buildLbQuery() {
    const qs = new URLSearchParams();
    const g = $("#lb-game").value.trim();
    const l = $("#lb-limit").value;
    if (g) qs.set("game", g);
    if (l) qs.set("limit", l);
    return qs.toString();
}

async function load_scores() {
    const url = "/leaderboard?" + buildLbQuery();
    lbStatus.textContent = "Cargando…";
    lbTbody.innerHTML = "";
    try {
    const res = await fetch(url);
    const data = await res.json();
    console.table(data)

    if (!Array.isArray(data) || data.length === 0) {
        lbStatus.textContent = "Sin resultados con esos filtros.";
        lbCount.textContent = "0 resultados";
        return;
    }

    const rows = data.map((r, i) => {
        const game = pick(r, "game", "Game") ?? "—";
        const player = pick(r, "player", "Player") ?? "—";
        const score = pick(r, "score", "Score") ?? 0;

        return { rank: r.rank ?? (i + 1), game, player, score };
    });

    for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td><span class="pill">#${r.rank}</span></td>
        <td>${r.game}</td>
        <td>${r.player}</td>
        <td class="right"><strong>${fmtInt(r.score)}</strong></td>
        `;
        lbTbody.appendChild(tr);
    }
    lbStatus.textContent = "";
    lbCount.textContent = `${rows.length} resultados`;
    } catch (e) {
    lbStatus.textContent = "Error cargando datos. Revisa que el servidor esté en 3000.";
    lbCount.textContent = "—";
    }
}

$("#lb-search").addEventListener("click", load_scores);
$("#lb-reset").addEventListener("click", () => {
    $("#lb-game").value = "pacman"; $("#lb-limit").value = "10";
    load_scores();
});

load_scores();