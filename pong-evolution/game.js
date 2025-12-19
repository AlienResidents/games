// Pong Evolution - Genetic Algorithm Tournament
// ==============================================

// ============ CONFIGURATION ============
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 500,
    PADDLE_WIDTH: 15,
    PADDLE_HEIGHT: 80,
    PADDLE_MARGIN: 30,
    BALL_SIZE: 12,
    BALL_SPEED: 6,
    PADDLE_SPEED: 8,
    MAX_BALL_SPEED: 15
};

// ============ GENETIC ALGORITHM ============

// Gene definitions - each gene controls a behavior aspect
const GENE_DEFINITIONS = {
    // Tracking behavior
    trackingWeight: { min: 0, max: 1, description: 'How much to track ball Y position' },
    predictionWeight: { min: 0, max: 1, description: 'How much to predict ball trajectory' },
    predictionFrames: { min: 5, max: 60, description: 'Frames ahead to predict' },

    // Positioning
    centerBias: { min: 0, max: 1, description: 'Tendency to return to center' },
    aggressiveness: { min: 0, max: 1, description: 'How far from center to position' },
    sweetSpotOffset: { min: -0.5, max: 0.5, description: 'Preferred hit point on paddle' },

    // Reaction
    reactionDelay: { min: 0, max: 10, description: 'Frames before reacting' },
    movementSmoothing: { min: 0, max: 0.9, description: 'Smoothing factor for movement' },

    // Strategy
    defensiveThreshold: { min: 0.3, max: 0.7, description: 'X position to switch to defense' },
    offensiveAngling: { min: 0, max: 1, description: 'Attempt to angle returns' },

    // Error/noise
    errorRate: { min: 0, max: 0.3, description: 'Random error in positioning' },
    jitterAmount: { min: 0, max: 5, description: 'Random movement noise' }
};

// Create a random genome
function createRandomGenome() {
    const genome = {};
    for (const [gene, def] of Object.entries(GENE_DEFINITIONS)) {
        genome[gene] = def.min + Math.random() * (def.max - def.min);
    }
    return genome;
}

// Crossover two genomes
function crossover(parent1, parent2) {
    const child = {};
    for (const gene of Object.keys(GENE_DEFINITIONS)) {
        // Random crossover point per gene
        if (Math.random() < 0.5) {
            child[gene] = parent1[gene];
        } else {
            child[gene] = parent2[gene];
        }
        // Sometimes blend
        if (Math.random() < 0.3) {
            const blend = Math.random();
            child[gene] = parent1[gene] * blend + parent2[gene] * (1 - blend);
        }
    }
    return child;
}

// Mutate a genome
function mutate(genome, mutationRate) {
    const mutated = { ...genome };
    for (const [gene, def] of Object.entries(GENE_DEFINITIONS)) {
        if (Math.random() < mutationRate) {
            // Random mutation
            const range = def.max - def.min;
            const mutation = (Math.random() - 0.5) * range * 0.4;
            mutated[gene] = Math.max(def.min, Math.min(def.max, mutated[gene] + mutation));
        }
    }
    return mutated;
}

// Generate a unique name for a player
const NAME_PREFIXES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Omega', 'Sigma', 'Nova', 'Quantum', 'Cyber', 'Neo', 'Hyper', 'Ultra', 'Mega', 'Giga', 'Tera', 'Nano'];
const NAME_SUFFIXES = ['Prime', 'X', 'Zero', 'One', 'Max', 'Pro', 'Elite', 'Core', 'Net', 'Bot', 'Mind', 'Wave', 'Flux', 'Storm', 'Pulse', 'Spark', 'Blaze', 'Frost', 'Shadow', 'Light'];

let nameCounter = 0;
function generateName() {
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    nameCounter++;
    return `${prefix}-${suffix}-${nameCounter}`;
}

// ============ PLAYER CLASS ============

class Player {
    constructor(genome = null, name = null, generation = 0) {
        this.genome = genome || createRandomGenome();
        this.name = name || generateName();
        this.generation = generation;

        // Stats
        this.wins = 0;
        this.losses = 0;
        this.pointsFor = 0;
        this.pointsAgainst = 0;
        this.matchesPlayed = 0;
        this.fitness = 0;

        // Runtime state
        this.reactionCounter = 0;
        this.lastTargetY = CONFIG.CANVAS_HEIGHT / 2;
        this.smoothedY = CONFIG.CANVAS_HEIGHT / 2;
    }

    // Calculate target Y position based on genome
    calculateTarget(ball, paddle, isLeftSide) {
        const genome = this.genome;
        const canvasHeight = CONFIG.CANVAS_HEIGHT;
        const paddleHeight = CONFIG.PADDLE_HEIGHT;

        // Reaction delay
        this.reactionCounter++;
        if (this.reactionCounter < genome.reactionDelay) {
            return this.lastTargetY;
        }
        this.reactionCounter = 0;

        let targetY = canvasHeight / 2;

        // Check if ball is coming towards us
        const ballComingToUs = isLeftSide ? ball.vx < 0 : ball.vx > 0;
        const ballX = ball.x;
        const paddleX = isLeftSide ? CONFIG.PADDLE_MARGIN : CONFIG.CANVAS_WIDTH - CONFIG.PADDLE_MARGIN;
        const distanceToBall = Math.abs(paddleX - ballX);
        const relativeDistance = distanceToBall / CONFIG.CANVAS_WIDTH;

        if (ballComingToUs) {
            // Direct tracking
            const trackY = ball.y;

            // Prediction
            let predictY = ball.y;
            if (ball.vx !== 0) {
                const framesToReach = Math.abs((paddleX - ballX) / ball.vx);
                const predictFrames = Math.min(framesToReach, genome.predictionFrames);
                predictY = ball.y + ball.vy * predictFrames;

                // Account for bounces
                while (predictY < 0 || predictY > canvasHeight) {
                    if (predictY < 0) {
                        predictY = -predictY;
                    }
                    if (predictY > canvasHeight) {
                        predictY = 2 * canvasHeight - predictY;
                    }
                }
            }

            // Combine tracking and prediction
            const combinedY = trackY * genome.trackingWeight + predictY * genome.predictionWeight;
            const totalWeight = genome.trackingWeight + genome.predictionWeight;
            targetY = totalWeight > 0 ? combinedY / totalWeight : ball.y;

            // Sweet spot offset
            targetY += genome.sweetSpotOffset * paddleHeight;

            // Offensive angling - try to hit ball with edge of paddle
            if (genome.offensiveAngling > 0.5 && relativeDistance < 0.3) {
                const angleDirection = ball.y > canvasHeight / 2 ? -1 : 1;
                targetY += angleDirection * paddleHeight * 0.3 * (genome.offensiveAngling - 0.5);
            }
        } else {
            // Ball going away - defensive positioning
            const centerY = canvasHeight / 2;
            const defensiveY = ball.y;

            // Blend between center and tracking based on aggressiveness
            if (relativeDistance > genome.defensiveThreshold) {
                targetY = centerY * genome.centerBias + defensiveY * (1 - genome.centerBias);
            } else {
                targetY = defensiveY * genome.aggressiveness + centerY * (1 - genome.aggressiveness);
            }
        }

        // Add error/noise
        if (genome.errorRate > 0) {
            targetY += (Math.random() - 0.5) * paddleHeight * genome.errorRate;
        }
        targetY += (Math.random() - 0.5) * genome.jitterAmount;

        // Clamp to valid range
        targetY = Math.max(paddleHeight / 2, Math.min(canvasHeight - paddleHeight / 2, targetY));

        // Apply smoothing
        this.smoothedY = this.smoothedY * genome.movementSmoothing + targetY * (1 - genome.movementSmoothing);
        this.lastTargetY = this.smoothedY;

        return this.smoothedY;
    }

    // Calculate fitness score
    calculateFitness() {
        if (this.matchesPlayed === 0) {
            this.fitness = 0;
            return;
        }

        const winRate = this.wins / this.matchesPlayed;
        const pointDiff = this.pointsFor - this.pointsAgainst;
        const avgPointDiff = pointDiff / this.matchesPlayed;

        // Fitness formula: wins matter most, then point differential
        this.fitness = Math.round((winRate * 1000) + (avgPointDiff * 10));
    }

    // Reset for new tournament
    resetStats() {
        this.wins = 0;
        this.losses = 0;
        this.pointsFor = 0;
        this.pointsAgainst = 0;
        this.matchesPlayed = 0;
        this.fitness = 0;
    }

    // Create offspring with another player
    breed(partner, mutationRate) {
        const childGenome = mutate(crossover(this.genome, partner.genome), mutationRate);
        return new Player(childGenome, null, Math.max(this.generation, partner.generation) + 1);
    }

    // Clone this player
    clone() {
        const cloned = new Player({ ...this.genome }, this.name + '-clone', this.generation);
        return cloned;
    }
}

// ============ PONG GAME ENGINE ============

class PongGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;

        this.reset();
    }

    reset() {
        this.ball = {
            x: CONFIG.CANVAS_WIDTH / 2,
            y: CONFIG.CANVAS_HEIGHT / 2,
            vx: 0,
            vy: 0
        };

        this.leftPaddle = {
            x: CONFIG.PADDLE_MARGIN,
            y: CONFIG.CANVAS_HEIGHT / 2
        };

        this.rightPaddle = {
            x: CONFIG.CANVAS_WIDTH - CONFIG.PADDLE_MARGIN,
            y: CONFIG.CANVAS_HEIGHT / 2
        };

        this.leftScore = 0;
        this.rightScore = 0;
        this.serving = true;
        this.serveDirection = Math.random() < 0.5 ? -1 : 1;
    }

    serve() {
        this.ball.x = CONFIG.CANVAS_WIDTH / 2;
        this.ball.y = CONFIG.CANVAS_HEIGHT / 2;

        const angle = (Math.random() - 0.5) * Math.PI / 3;
        this.ball.vx = CONFIG.BALL_SPEED * this.serveDirection * Math.cos(angle);
        this.ball.vy = CONFIG.BALL_SPEED * Math.sin(angle);

        this.serveDirection *= -1;
        this.serving = false;
    }

    update(leftPlayer, rightPlayer) {
        if (this.serving) {
            this.serve();
        }

        // Update paddles based on AI
        const leftTarget = leftPlayer.calculateTarget(this.ball, this.leftPaddle, true);
        const rightTarget = rightPlayer.calculateTarget(this.ball, this.rightPaddle, false);

        // Move paddles towards targets
        this.movePaddle(this.leftPaddle, leftTarget);
        this.movePaddle(this.rightPaddle, rightTarget);

        // Update ball
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Ball collision with top/bottom
        if (this.ball.y - CONFIG.BALL_SIZE / 2 <= 0) {
            this.ball.y = CONFIG.BALL_SIZE / 2;
            this.ball.vy *= -1;
        }
        if (this.ball.y + CONFIG.BALL_SIZE / 2 >= CONFIG.CANVAS_HEIGHT) {
            this.ball.y = CONFIG.CANVAS_HEIGHT - CONFIG.BALL_SIZE / 2;
            this.ball.vy *= -1;
        }

        // Ball collision with paddles
        this.checkPaddleCollision(this.leftPaddle, true);
        this.checkPaddleCollision(this.rightPaddle, false);

        // Scoring
        let scored = null;
        if (this.ball.x < 0) {
            this.rightScore++;
            scored = 'right';
            this.serving = true;
        } else if (this.ball.x > CONFIG.CANVAS_WIDTH) {
            this.leftScore++;
            scored = 'left';
            this.serving = true;
        }

        return scored;
    }

    movePaddle(paddle, targetY) {
        const diff = targetY - paddle.y;
        const maxMove = CONFIG.PADDLE_SPEED;

        if (Math.abs(diff) < maxMove) {
            paddle.y = targetY;
        } else {
            paddle.y += Math.sign(diff) * maxMove;
        }

        // Clamp to canvas
        paddle.y = Math.max(CONFIG.PADDLE_HEIGHT / 2,
            Math.min(CONFIG.CANVAS_HEIGHT - CONFIG.PADDLE_HEIGHT / 2, paddle.y));
    }

    checkPaddleCollision(paddle, isLeft) {
        const paddleLeft = paddle.x - CONFIG.PADDLE_WIDTH / 2;
        const paddleRight = paddle.x + CONFIG.PADDLE_WIDTH / 2;
        const paddleTop = paddle.y - CONFIG.PADDLE_HEIGHT / 2;
        const paddleBottom = paddle.y + CONFIG.PADDLE_HEIGHT / 2;

        const ballLeft = this.ball.x - CONFIG.BALL_SIZE / 2;
        const ballRight = this.ball.x + CONFIG.BALL_SIZE / 2;
        const ballTop = this.ball.y - CONFIG.BALL_SIZE / 2;
        const ballBottom = this.ball.y + CONFIG.BALL_SIZE / 2;

        const collision = isLeft
            ? (ballLeft <= paddleRight && ballRight >= paddleLeft && this.ball.vx < 0)
            : (ballRight >= paddleLeft && ballLeft <= paddleRight && this.ball.vx > 0);

        if (collision && ballBottom >= paddleTop && ballTop <= paddleBottom) {
            // Calculate hit position (-1 to 1)
            const hitPos = (this.ball.y - paddle.y) / (CONFIG.PADDLE_HEIGHT / 2);

            // Reflect and angle based on hit position
            const maxAngle = Math.PI / 3;
            const angle = hitPos * maxAngle;

            const speed = Math.min(
                Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2) * 1.05,
                CONFIG.MAX_BALL_SPEED
            );

            this.ball.vx = speed * Math.cos(angle) * (isLeft ? 1 : -1);
            this.ball.vy = speed * Math.sin(angle);

            // Push ball out of paddle
            if (isLeft) {
                this.ball.x = paddleRight + CONFIG.BALL_SIZE / 2;
            } else {
                this.ball.x = paddleLeft - CONFIG.BALL_SIZE / 2;
            }
        }
    }

    draw() {
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Center line
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(CONFIG.CANVAS_WIDTH / 2, 0);
        ctx.lineTo(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);

        // Paddles
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(
            this.leftPaddle.x - CONFIG.PADDLE_WIDTH / 2,
            this.leftPaddle.y - CONFIG.PADDLE_HEIGHT / 2,
            CONFIG.PADDLE_WIDTH,
            CONFIG.PADDLE_HEIGHT
        );

        ctx.fillStyle = '#ff8800';
        ctx.fillRect(
            this.rightPaddle.x - CONFIG.PADDLE_WIDTH / 2,
            this.rightPaddle.y - CONFIG.PADDLE_HEIGHT / 2,
            CONFIG.PADDLE_WIDTH,
            CONFIG.PADDLE_HEIGHT
        );

        // Ball
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, CONFIG.BALL_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============ TOURNAMENT SYSTEM ============

class Tournament {
    constructor(players) {
        this.players = [...players];
        this.bracket = [];
        this.currentRound = 0;
        this.currentMatch = 0;
        this.matchesPerPairing = 3;
        this.pointsToWin = 5;
        this.results = [];
    }

    // Generate bracket
    generateBracket() {
        // Shuffle players
        const shuffled = [...this.players].sort(() => Math.random() - 0.5);

        this.bracket = [];
        this.results = [];

        // Calculate rounds needed
        const numPlayers = shuffled.length;
        const numRounds = Math.ceil(Math.log2(numPlayers));

        // First round
        const firstRoundMatches = [];
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                firstRoundMatches.push({
                    player1: shuffled[i],
                    player2: shuffled[i + 1],
                    winner: null,
                    scores: [],
                    completed: false
                });
            } else {
                // Bye
                firstRoundMatches.push({
                    player1: shuffled[i],
                    player2: null,
                    winner: shuffled[i],
                    scores: [],
                    completed: true
                });
            }
        }

        this.bracket.push(firstRoundMatches);

        // Subsequent rounds (empty for now)
        let matchesInRound = Math.ceil(firstRoundMatches.length / 2);
        for (let r = 1; r < numRounds; r++) {
            const round = [];
            for (let m = 0; m < matchesInRound; m++) {
                round.push({
                    player1: null,
                    player2: null,
                    winner: null,
                    scores: [],
                    completed: false
                });
            }
            this.bracket.push(round);
            matchesInRound = Math.ceil(matchesInRound / 2);
        }

        this.currentRound = 0;
        this.currentMatch = 0;
    }

    // Get next match to play
    getNextMatch() {
        while (this.currentRound < this.bracket.length) {
            const round = this.bracket[this.currentRound];

            while (this.currentMatch < round.length) {
                const match = round[this.currentMatch];

                // Check if match is ready and not completed
                if (!match.completed) {
                    // For rounds > 0, check if players are set
                    if (this.currentRound > 0) {
                        this.updateBracketPlayers();
                        if (!match.player1 || !match.player2) {
                            // Not ready yet
                            this.currentMatch++;
                            continue;
                        }
                    }

                    if (match.player1 && match.player2) {
                        return match;
                    } else if (match.player1 && !match.player2) {
                        // Bye
                        match.winner = match.player1;
                        match.completed = true;
                    }
                }

                this.currentMatch++;
            }

            this.currentRound++;
            this.currentMatch = 0;
        }

        return null; // Tournament complete
    }

    // Update bracket with winners from previous round
    updateBracketPlayers() {
        for (let r = 1; r < this.bracket.length; r++) {
            const prevRound = this.bracket[r - 1];
            const thisRound = this.bracket[r];

            for (let m = 0; m < thisRound.length; m++) {
                const match = thisRound[m];
                const sourceMatch1 = prevRound[m * 2];
                const sourceMatch2 = prevRound[m * 2 + 1];

                if (sourceMatch1 && sourceMatch1.completed && !match.player1) {
                    match.player1 = sourceMatch1.winner;
                }
                if (sourceMatch2 && sourceMatch2.completed && !match.player2) {
                    match.player2 = sourceMatch2.winner;
                }

                // Handle bye if only one player
                if (match.player1 && !match.player2 && !sourceMatch2) {
                    match.winner = match.player1;
                    match.completed = true;
                }
            }
        }
    }

    // Record match result
    recordResult(match, leftScore, rightScore) {
        match.scores.push({ left: leftScore, right: rightScore });

        // Check if match series is complete
        const winsNeeded = Math.ceil(this.matchesPerPairing / 2);
        let p1Wins = 0, p2Wins = 0;

        for (const score of match.scores) {
            if (score.left > score.right) p1Wins++;
            else p2Wins++;
        }

        if (p1Wins >= winsNeeded || p2Wins >= winsNeeded) {
            match.winner = p1Wins > p2Wins ? match.player1 : match.player2;
            match.completed = true;

            // Update player stats
            const winner = match.winner;
            const loser = winner === match.player1 ? match.player2 : match.player1;

            winner.wins++;
            loser.losses++;
            winner.matchesPlayed++;
            loser.matchesPlayed++;

            // Aggregate points
            for (const score of match.scores) {
                match.player1.pointsFor += score.left;
                match.player1.pointsAgainst += score.right;
                match.player2.pointsFor += score.right;
                match.player2.pointsAgainst += score.left;
            }

            this.results.push({
                winner: winner.name,
                loser: loser.name,
                scores: [...match.scores]
            });

            return true; // Match series complete
        }

        return false; // More games needed
    }

    // Check if tournament is complete
    isComplete() {
        if (this.bracket.length === 0) return true;
        const finalMatch = this.bracket[this.bracket.length - 1][0];
        return finalMatch && finalMatch.completed;
    }

    // Get tournament winner
    getWinner() {
        if (!this.isComplete()) return null;
        return this.bracket[this.bracket.length - 1][0].winner;
    }

    // Get standings
    getStandings() {
        const standings = [...this.players];
        standings.forEach(p => p.calculateFitness());
        standings.sort((a, b) => b.fitness - a.fitness);
        return standings;
    }
}

// ============ EVOLUTION MANAGER ============

class EvolutionManager {
    constructor() {
        this.population = [];
        this.generation = 0;
        this.tournamentCount = 0;
        this.allTimeStats = new Map();
    }

    // Initialize population
    initPopulation(size) {
        this.population = [];
        for (let i = 0; i < size; i++) {
            this.population.push(new Player());
        }
        this.generation = 1;
    }

    // Evolve to next generation
    evolve(mutationRate) {
        // Calculate fitness
        this.population.forEach(p => p.calculateFitness());

        // Sort by fitness
        this.population.sort((a, b) => b.fitness - a.fitness);

        // Store all-time stats
        for (const player of this.population) {
            if (!this.allTimeStats.has(player.name)) {
                this.allTimeStats.set(player.name, {
                    name: player.name,
                    generation: player.generation,
                    bestFitness: player.fitness,
                    totalWins: player.wins,
                    totalLosses: player.losses,
                    totalPointsFor: player.pointsFor,
                    totalPointsAgainst: player.pointsAgainst
                });
            } else {
                const stats = this.allTimeStats.get(player.name);
                stats.bestFitness = Math.max(stats.bestFitness, player.fitness);
                stats.totalWins += player.wins;
                stats.totalLosses += player.losses;
                stats.totalPointsFor += player.pointsFor;
                stats.totalPointsAgainst += player.pointsAgainst;
            }
        }

        // Selection - top 50% survive
        const survivors = this.population.slice(0, Math.ceil(this.population.length / 2));

        // Create new population
        const newPopulation = [];

        // Keep best performer (elitism)
        const elite = survivors[0].clone();
        elite.name = survivors[0].name;
        elite.generation = this.generation + 1;
        elite.resetStats();
        newPopulation.push(elite);

        // Breed remaining
        while (newPopulation.length < this.population.length) {
            // Tournament selection
            const parent1 = this.tournamentSelect(survivors);
            const parent2 = this.tournamentSelect(survivors);

            const child = parent1.breed(parent2, mutationRate);
            newPopulation.push(child);
        }

        this.population = newPopulation;
        this.generation++;

        // Reset stats for new tournament
        this.population.forEach(p => p.resetStats());
    }

    // Tournament selection
    tournamentSelect(candidates) {
        const tournamentSize = 3;
        let best = null;

        for (let i = 0; i < tournamentSize; i++) {
            const candidate = candidates[Math.floor(Math.random() * candidates.length)];
            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }

        return best;
    }

    // Get leaderboard data
    getLeaderboard() {
        const entries = Array.from(this.allTimeStats.values());
        entries.sort((a, b) => b.bestFitness - a.bestFitness);
        return entries.slice(0, 20);
    }
}

// ============ MAIN CONTROLLER ============

class GameController {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.game = new PongGame(this.canvas);
        this.evolution = new EvolutionManager();
        this.tournament = null;

        this.isRunning = false;
        this.isPaused = false;
        this.gameSpeed = 1;
        this.currentMatch = null;
        this.currentMatchGames = 0;

        this.leftPlayer = null;
        this.rightPlayer = null;

        this.setupUI();
        this.bindEvents();
    }

    setupUI() {
        this.elements = {
            populationSize: document.getElementById('population-size'),
            pointsToWin: document.getElementById('points-to-win'),
            matchesPerRound: document.getElementById('matches-per-round'),
            gameSpeed: document.getElementById('game-speed'),
            speedDisplay: document.getElementById('speed-display'),
            mutationRate: document.getElementById('mutation-rate'),
            mutationDisplay: document.getElementById('mutation-display'),
            btnStart: document.getElementById('btn-start'),
            btnPause: document.getElementById('btn-pause'),
            btnReset: document.getElementById('btn-reset'),
            generationNum: document.getElementById('generation-num'),
            bestFitness: document.getElementById('best-fitness'),
            avgFitness: document.getElementById('avg-fitness'),
            tournamentsRun: document.getElementById('tournaments-run'),
            leftName: document.getElementById('left-name'),
            leftScore: document.getElementById('left-score'),
            rightName: document.getElementById('right-name'),
            rightScore: document.getElementById('right-score'),
            matchStatus: document.getElementById('match-status'),
            bracketContainer: document.getElementById('bracket-container'),
            leaderboardBody: document.getElementById('leaderboard-body'),
            genomeSelect: document.getElementById('genome-select'),
            genomeDisplay: document.getElementById('genome-display'),
            eventLog: document.getElementById('event-log')
        };
    }

    bindEvents() {
        this.elements.btnStart.addEventListener('click', () => this.start());
        this.elements.btnPause.addEventListener('click', () => this.togglePause());
        this.elements.btnReset.addEventListener('click', () => this.reset());

        this.elements.gameSpeed.addEventListener('input', (e) => {
            this.gameSpeed = parseInt(e.target.value);
            this.elements.speedDisplay.textContent = this.gameSpeed + 'x';
        });

        this.elements.mutationRate.addEventListener('input', (e) => {
            this.elements.mutationDisplay.textContent = Math.round(e.target.value * 100) + '%';
        });

        this.elements.genomeSelect.addEventListener('change', (e) => {
            this.displayGenome(e.target.value);
        });
    }

    log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `<span class="timestamp">[${time}]</span> ${message}`;
        this.elements.eventLog.insertBefore(entry, this.elements.eventLog.firstChild);

        // Keep log manageable
        while (this.elements.eventLog.children.length > 100) {
            this.elements.eventLog.removeChild(this.elements.eventLog.lastChild);
        }
    }

    start() {
        const popSize = parseInt(this.elements.populationSize.value);

        if (this.evolution.population.length === 0) {
            this.evolution.initPopulation(popSize);
            this.log(`Initialized population with ${popSize} players`, 'evolution');
        }

        this.startNewTournament();
        this.isRunning = true;
        this.isPaused = false;

        this.elements.btnStart.disabled = true;
        this.elements.btnPause.disabled = false;

        this.gameLoop();
    }

    startNewTournament() {
        this.tournament = new Tournament(this.evolution.population);
        this.tournament.matchesPerPairing = parseInt(this.elements.matchesPerRound.value);
        this.tournament.pointsToWin = parseInt(this.elements.pointsToWin.value);
        this.tournament.generateBracket();

        this.evolution.tournamentCount++;
        this.log(`Tournament #${this.evolution.tournamentCount} started (Generation ${this.evolution.generation})`, 'tournament');

        this.updateBracketDisplay();
        this.startNextMatch();
    }

    startNextMatch() {
        this.currentMatch = this.tournament.getNextMatch();

        if (!this.currentMatch) {
            this.endTournament();
            return;
        }

        this.leftPlayer = this.currentMatch.player1;
        this.rightPlayer = this.currentMatch.player2;
        this.currentMatchGames = 0;

        this.game.reset();

        this.elements.leftName.textContent = this.leftPlayer.name;
        this.elements.rightName.textContent = this.rightPlayer.name;
        this.elements.matchStatus.textContent = `Game ${this.currentMatch.scores.length + 1}`;

        this.log(`Match: ${this.leftPlayer.name} vs ${this.rightPlayer.name}`, 'match');
        this.updateBracketDisplay();
    }

    endTournament() {
        const winner = this.tournament.getWinner();
        this.log(`Tournament #${this.evolution.tournamentCount} complete! Winner: ${winner.name}`, 'tournament');

        // Update stats display
        this.updateStatsDisplay();
        this.updateLeaderboard();
        this.updateGenomeSelect();

        // Evolve
        const mutationRate = parseFloat(this.elements.mutationRate.value);
        this.evolution.evolve(mutationRate);
        this.log(`Evolution complete. Generation ${this.evolution.generation} created.`, 'evolution');

        // Start next tournament
        setTimeout(() => {
            if (this.isRunning) {
                this.startNewTournament();
            }
        }, 1000);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.elements.btnPause.textContent = this.isPaused ? 'Resume' : 'Pause';

        if (!this.isPaused) {
            this.gameLoop();
        }
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.evolution = new EvolutionManager();
        this.tournament = null;
        this.currentMatch = null;

        this.game.reset();
        this.game.draw();

        this.elements.btnStart.disabled = false;
        this.elements.btnPause.disabled = true;
        this.elements.btnPause.textContent = 'Pause';

        this.elements.leftName.textContent = '---';
        this.elements.rightName.textContent = '---';
        this.elements.leftScore.textContent = '0';
        this.elements.rightScore.textContent = '0';
        this.elements.matchStatus.textContent = 'Ready';
        this.elements.generationNum.textContent = '0';
        this.elements.bestFitness.textContent = '0';
        this.elements.avgFitness.textContent = '0';
        this.elements.tournamentsRun.textContent = '0';
        this.elements.bracketContainer.innerHTML = '';
        this.elements.leaderboardBody.innerHTML = '';
        this.elements.genomeSelect.innerHTML = '<option value="">Select a player...</option>';
        this.elements.genomeDisplay.innerHTML = '';
        this.elements.eventLog.innerHTML = '';

        this.log('System reset', 'info');
    }

    gameLoop() {
        if (!this.isRunning || this.isPaused) return;

        // Run multiple updates per frame for speed
        for (let i = 0; i < this.gameSpeed; i++) {
            if (this.currentMatch && this.leftPlayer && this.rightPlayer) {
                const scored = this.game.update(this.leftPlayer, this.rightPlayer);

                if (scored) {
                    // Update display
                    this.elements.leftScore.textContent = this.game.leftScore;
                    this.elements.rightScore.textContent = this.game.rightScore;

                    // Check if game is won
                    const pointsToWin = this.tournament.pointsToWin;
                    if (this.game.leftScore >= pointsToWin || this.game.rightScore >= pointsToWin) {
                        const matchComplete = this.tournament.recordResult(
                            this.currentMatch,
                            this.game.leftScore,
                            this.game.rightScore
                        );

                        this.log(
                            `Game: ${this.leftPlayer.name} ${this.game.leftScore} - ${this.game.rightScore} ${this.rightPlayer.name}`,
                            'match'
                        );

                        if (matchComplete) {
                            this.log(`Match winner: ${this.currentMatch.winner.name}`, 'match');
                            this.updateBracketDisplay();
                            this.startNextMatch();
                        } else {
                            // Next game in match
                            this.game.reset();
                            this.elements.leftScore.textContent = '0';
                            this.elements.rightScore.textContent = '0';
                            this.elements.matchStatus.textContent = `Game ${this.currentMatch.scores.length + 1}`;
                        }
                    }
                }
            }
        }

        this.game.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    updateBracketDisplay() {
        if (!this.tournament) return;

        const container = this.elements.bracketContainer;
        container.innerHTML = '';

        const roundNames = ['Round 1', 'Quarterfinals', 'Semifinals', 'Finals', 'Champion'];

        this.tournament.bracket.forEach((round, roundIndex) => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'bracket-round';

            const title = document.createElement('h4');
            title.textContent = roundNames[roundIndex] || `Round ${roundIndex + 1}`;
            roundDiv.appendChild(title);

            round.forEach((match, matchIndex) => {
                const matchDiv = document.createElement('div');
                matchDiv.className = 'bracket-match';

                if (match.completed) {
                    matchDiv.classList.add('completed');
                } else if (this.currentMatch === match) {
                    matchDiv.classList.add('active');
                }

                const p1Div = document.createElement('div');
                p1Div.className = 'bracket-player';
                if (match.winner === match.player1) p1Div.classList.add('winner');
                else if (match.winner) p1Div.classList.add('loser');
                p1Div.innerHTML = `<span>${match.player1?.name || 'TBD'}</span><span>${this.getMatchScore(match, 1)}</span>`;

                const p2Div = document.createElement('div');
                p2Div.className = 'bracket-player';
                if (match.winner === match.player2) p2Div.classList.add('winner');
                else if (match.winner) p2Div.classList.add('loser');
                p2Div.innerHTML = `<span>${match.player2?.name || 'BYE'}</span><span>${this.getMatchScore(match, 2)}</span>`;

                matchDiv.appendChild(p1Div);
                matchDiv.appendChild(p2Div);
                roundDiv.appendChild(matchDiv);
            });

            container.appendChild(roundDiv);
        });
    }

    getMatchScore(match, playerNum) {
        if (match.scores.length === 0) return '';
        let wins = 0;
        for (const score of match.scores) {
            if (playerNum === 1 && score.left > score.right) wins++;
            if (playerNum === 2 && score.right > score.left) wins++;
        }
        return wins;
    }

    updateStatsDisplay() {
        this.elements.generationNum.textContent = this.evolution.generation;
        this.elements.tournamentsRun.textContent = this.evolution.tournamentCount;

        if (this.evolution.population.length > 0) {
            this.evolution.population.forEach(p => p.calculateFitness());
            const sorted = [...this.evolution.population].sort((a, b) => b.fitness - a.fitness);

            this.elements.bestFitness.textContent = sorted[0].fitness;

            const avgFitness = this.evolution.population.reduce((sum, p) => sum + p.fitness, 0) / this.evolution.population.length;
            this.elements.avgFitness.textContent = Math.round(avgFitness);
        }
    }

    updateLeaderboard() {
        const leaderboard = this.evolution.getLeaderboard();
        const tbody = this.elements.leaderboardBody;
        tbody.innerHTML = '';

        leaderboard.forEach((entry, index) => {
            const row = document.createElement('tr');
            if (index === 0) row.classList.add('rank-1');
            if (index === 1) row.classList.add('rank-2');
            if (index === 2) row.classList.add('rank-3');

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.name}</td>
                <td>${entry.totalWins}</td>
                <td>${entry.totalLosses}</td>
                <td>${entry.totalPointsFor}</td>
                <td>${entry.totalPointsAgainst}</td>
                <td>${entry.bestFitness}</td>
                <td>${entry.generation}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateGenomeSelect() {
        const select = this.elements.genomeSelect;
        select.innerHTML = '<option value="">Select a player...</option>';

        for (const player of this.evolution.population) {
            const option = document.createElement('option');
            option.value = player.name;
            option.textContent = `${player.name} (Gen ${player.generation})`;
            select.appendChild(option);
        }
    }

    displayGenome(playerName) {
        const display = this.elements.genomeDisplay;
        display.innerHTML = '';

        if (!playerName) return;

        const player = this.evolution.population.find(p => p.name === playerName);
        if (!player) return;

        for (const [gene, def] of Object.entries(GENE_DEFINITIONS)) {
            const value = player.genome[gene];
            const normalized = (value - def.min) / (def.max - def.min);

            const geneDiv = document.createElement('div');
            geneDiv.className = 'genome-gene';
            geneDiv.innerHTML = `
                <div class="gene-name">${gene}</div>
                <div class="gene-value">${value.toFixed(3)}</div>
                <div class="gene-bar"><div class="gene-bar-fill" style="width: ${normalized * 100}%"></div></div>
            `;
            display.appendChild(geneDiv);
        }
    }
}

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', () => {
    window.controller = new GameController();
    window.controller.game.draw();
});
