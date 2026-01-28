// Pong Evolution - Frontend Game Logic

const socket = io();
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const leftName = document.getElementById('left-name');
const rightName = document.getElementById('right-name');
const leftScore = document.getElementById('left-score');
const rightScore = document.getElementById('right-score');
const roundInfo = document.getElementById('round-info');
const matchInfo = document.getElementById('match-info');
const generation = document.getElementById('generation');
const tournamentProgress = document.getElementById('tournament-progress');
const bracket = document.getElementById('bracket');
const standings = document.getElementById('standings');
const log = document.getElementById('log');

const initBtn = document.getElementById('init-btn');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const numTournaments = document.getElementById('num-tournaments');
const speedSelect = document.getElementById('speed-select');

// Game state
let gameState = null;
let isRunning = false;

// Colors
const COLORS = {
    background: '#1a1a2e',
    paddle: '#00ff88',
    ball: '#ff6b6b',
    net: '#333355',
    text: '#ffffff'
};

// Initialize canvas
function initCanvas() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawNet();
    drawWaitingMessage();
}

function drawNet() {
    ctx.strokeStyle = COLORS.net;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawWaitingMessage() {
    ctx.fillStyle = COLORS.text;
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Click "Initialize" to create AI players', canvas.width / 2, canvas.height / 2);
}

function drawGame(state) {
    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw net
    drawNet();

    // Draw paddles
    ctx.fillStyle = COLORS.paddle;

    // Left paddle
    const lp = state.left_paddle;
    ctx.fillRect(
        lp.x - lp.width / 2,
        lp.y - lp.height / 2,
        lp.width,
        lp.height
    );

    // Right paddle
    const rp = state.right_paddle;
    ctx.fillRect(
        rp.x - rp.width / 2,
        rp.y - rp.height / 2,
        rp.width,
        rp.height
    );

    // Draw ball
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw player names on paddles
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
}

function updateScores(state) {
    leftScore.textContent = state.left_score;
    rightScore.textContent = state.right_score;
}

function updateBracket(tournamentState) {
    if (!tournamentState || !tournamentState.rounds) {
        bracket.innerHTML = '<p>No tournament in progress</p>';
        return;
    }

    let html = '<div class="bracket-rounds">';

    tournamentState.rounds.forEach((round, roundIdx) => {
        html += `<div class="bracket-round">`;
        html += `<h3>Round ${roundIdx + 1}</h3>`;

        round.forEach((match) => {
            const p1 = match.player1 ? match.player1.name.split('-')[0] : 'TBD';
            const p2 = match.player2 ? match.player2.name.split('-')[0] : 'TBD';
            const isActive = !match.completed && match.player1 && match.player2;
            const winnerId = match.winner ? match.winner.id : null;

            html += `<div class="bracket-match ${isActive ? 'active' : ''} ${match.completed ? 'completed' : ''}">`;
            html += `<div class="match-player ${match.player1 && winnerId === match.player1.id ? 'winner' : ''}">${p1} ${match.completed ? match.player1_score : ''}</div>`;
            html += `<div class="match-vs">vs</div>`;
            html += `<div class="match-player ${match.player2 && winnerId === match.player2.id ? 'winner' : ''}">${p2} ${match.completed ? match.player2_score : ''}</div>`;
            html += `</div>`;
        });

        html += `</div>`;
    });

    html += '</div>';

    if (tournamentState.champion) {
        html += `<div class="champion">Champion: ${tournamentState.champion.name}</div>`;
    }

    bracket.innerHTML = html;
}

function updateStandings(standingsList) {
    if (!standingsList || standingsList.length === 0) {
        standings.innerHTML = '<p>No standings available</p>';
        return;
    }

    let html = '<table><thead><tr><th>#</th><th>Name</th><th>W</th><th>L</th><th>Gen</th></tr></thead><tbody>';

    standingsList.slice(0, 10).forEach((player, idx) => {
        html += `<tr>`;
        html += `<td>${idx + 1}</td>`;
        html += `<td>${player.name.split('-')[0]}</td>`;
        html += `<td>${player.wins}</td>`;
        html += `<td>${player.losses}</td>`;
        html += `<td>${player.generation}</td>`;
        html += `</tr>`;
    });

    html += '</tbody></table>';
    standings.innerHTML = html;
}

function addLog(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.insertBefore(entry, log.firstChild);

    // Keep only last 50 entries
    while (log.children.length > 50) {
        log.removeChild(log.lastChild);
    }
}

// Socket events
socket.on('connect', () => {
    addLog('Connected to server');
});

socket.on('disconnect', () => {
    addLog('Disconnected from server');
    isRunning = false;
    updateButtons();
});

socket.on('state_update', (state) => {
    generation.textContent = state.generation;
    tournamentProgress.textContent = `${state.tournaments_completed}/${state.tournaments_to_run}`;
    updateBracket(state.tournament);
    updateStandings(state.standings);
});

socket.on('game_update', (state) => {
    gameState = state;
    drawGame(state);
    updateScores(state);
});

socket.on('match_start', (data) => {
    leftName.textContent = data.player1.name.split('-')[0];
    rightName.textContent = data.player2.name.split('-')[0];
    roundInfo.textContent = `Round ${data.round + 1}`;
    matchInfo.textContent = `Match ${data.match_id + 1}`;
    leftScore.textContent = '0';
    rightScore.textContent = '0';
    addLog(`Match: ${data.player1.name} vs ${data.player2.name}`);
});

socket.on('match_complete', (data) => {
    addLog(`Winner: ${data.winner.name} (${data.player1_score}-${data.player2_score})`);
});

socket.on('tournament_complete', (state) => {
    isRunning = false;
    updateButtons();
    addLog('Tournament series complete!');

    if (state.tournament && state.tournament.champion) {
        addLog(`Final Champion: ${state.tournament.champion.name}`);
    }
});

socket.on('message', (data) => {
    addLog(data.text);
});

// Button handlers
initBtn.addEventListener('click', () => {
    socket.emit('initialize', { population_size: 32 });
    initCanvas();
});

startBtn.addEventListener('click', () => {
    const numTourns = parseInt(numTournaments.value) || 1;
    socket.emit('start_tournament', { num_tournaments: numTourns });
    isRunning = true;
    updateButtons();
});

stopBtn.addEventListener('click', () => {
    if (isRunning) {
        socket.emit('stop');
        isRunning = false;
        stopBtn.textContent = 'Resume';
    } else {
        socket.emit('resume');
        isRunning = true;
        stopBtn.textContent = 'Pause';
    }
    updateButtons();
});

speedSelect.addEventListener('change', () => {
    const speed = parseInt(speedSelect.value);
    socket.emit('set_speed', { speed });
});

function updateButtons() {
    startBtn.disabled = isRunning;
    stopBtn.disabled = false;
    stopBtn.textContent = isRunning ? 'Pause' : 'Resume';
}

// Initialize
initCanvas();
