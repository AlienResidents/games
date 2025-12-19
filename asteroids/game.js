// Asteroids Clone
// ================

// Debug logging
const DEBUG = true;
function log(category, message, data = null) {
    if (!DEBUG) return;
    const timestamp = performance.now().toFixed(2);
    if (data) {
        console.log(`[${timestamp}] [${category}] ${message}`, data);
    } else {
        console.log(`[${timestamp}] [${category}] ${message}`);
    }
}

const CONFIG = {
    CANVAS_WIDTH: 1000,
    CANVAS_HEIGHT: 700,
    SHIP_SIZE: 20,
    // ===== ADJUSTABLE SHIP CONTROLS =====
    SHIP_THRUST: 0.08,           // Acceleration force (default: 0.08, range: 0.02-0.2)
    SHIP_FRICTION: 0.99,         // Speed decay per frame (default: 0.99, lower = more drag)
    SHIP_ROTATION_SPEED: 0.04,   // Turn speed in radians (default: 0.04, range: 0.02-0.1)
    // ====================================
    BULLET_SPEED: 10,
    BULLET_LIFETIME: 60,
    MAX_BULLETS: 10,
    ASTEROID_SPEEDS: [1.5, 2.5, 3.5],
    ASTEROID_SIZES: [80, 40, 20],
    ASTEROID_POINTS: [20, 50, 100],
    INITIAL_ASTEROIDS: 4,
    RESPAWN_DELAY: 180,
    HYPERSPACE_COOLDOWN: 120,
    INVULNERABILITY_TIME: 180,
    SAVE_KEY: 'asteroidsHighScore'
};

// Game State
let game = {
    isRunning: false,
    isPaused: false,
    score: 0,
    highScore: 0,
    level: 1,
    lives: 3,
    ship: null,
    bullets: [],
    asteroids: [],
    particles: [],
    keys: {},
    respawnTimer: 0,
    hyperspaceCooldown: 0,
    invulnerabilityTimer: 0
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;

// UI Elements
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives-display');
const highScoreDisplay = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score');
const finalHighScoreDisplay = document.getElementById('final-high-score');
const restartBtn = document.getElementById('restart-btn');
const pauseScreen = document.getElementById('pause-screen');

// Ship class
class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = -Math.PI / 2; // Pointing up
        this.size = CONFIG.SHIP_SIZE;
        this.isThrusting = false;
    }

    update() {
        // Apply friction
        this.vx *= CONFIG.SHIP_FRICTION;
        this.vy *= CONFIG.SHIP_FRICTION;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen
        this.x = wrap(this.x, CONFIG.CANVAS_WIDTH);
        this.y = wrap(this.y, CONFIG.CANVAS_HEIGHT);
    }

    thrust() {
        this.vx += Math.cos(this.angle) * CONFIG.SHIP_THRUST;
        this.vy += Math.sin(this.angle) * CONFIG.SHIP_THRUST;
        this.isThrusting = true;

        // Create thrust particles
        if (Math.random() > 0.5) {
            const particleAngle = this.angle + Math.PI + (Math.random() - 0.5) * 0.5;
            game.particles.push(new Particle(
                this.x - Math.cos(this.angle) * this.size,
                this.y - Math.sin(this.angle) * this.size,
                Math.cos(particleAngle) * 3,
                Math.sin(particleAngle) * 3,
                20,
                '#ff6600'
            ));
        }
    }

    rotateLeft() {
        this.angle -= CONFIG.SHIP_ROTATION_SPEED;
    }

    rotateRight() {
        this.angle += CONFIG.SHIP_ROTATION_SPEED;
    }

    shoot() {
        log('SHOOT', `Attempting shot. Bullets: ${game.bullets.length}/${CONFIG.MAX_BULLETS}`);
        if (game.bullets.length < CONFIG.MAX_BULLETS) {
            const bulletX = this.x + Math.cos(this.angle) * this.size;
            const bulletY = this.y + Math.sin(this.angle) * this.size;
            const bullet = new Bullet(bulletX, bulletY, this.angle);
            game.bullets.push(bullet);
            log('SHOOT', `Bullet created at (${bulletX.toFixed(1)}, ${bulletY.toFixed(1)})`);
        } else {
            log('SHOOT', 'Max bullets reached');
        }
    }

    hyperspace() {
        if (game.hyperspaceCooldown <= 0) {
            // Random teleport
            this.x = Math.random() * CONFIG.CANVAS_WIDTH;
            this.y = Math.random() * CONFIG.CANVAS_HEIGHT;
            this.vx = 0;
            this.vy = 0;
            game.hyperspaceCooldown = CONFIG.HYPERSPACE_COOLDOWN;

            // Create teleport effect
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                game.particles.push(new Particle(
                    this.x, this.y,
                    Math.cos(angle) * 5,
                    Math.sin(angle) * 5,
                    30,
                    '#00ffff'
                ));
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Flicker when invulnerable
        if (game.invulnerabilityTimer > 0 && Math.floor(game.invulnerabilityTimer / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Draw ship
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size, -this.size * 0.7);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.lineTo(-this.size, this.size * 0.7);
        ctx.closePath();
        ctx.stroke();

        // Draw thrust flame
        if (this.isThrusting) {
            ctx.strokeStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.5, -this.size * 0.3);
            ctx.lineTo(-this.size * 1.2 - Math.random() * 10, 0);
            ctx.lineTo(-this.size * 0.5, this.size * 0.3);
            ctx.stroke();
        }

        ctx.restore();
        this.isThrusting = false;
    }

    getCollisionRadius() {
        return this.size * 0.8;
    }
}

// Bullet class
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * CONFIG.BULLET_SPEED;
        this.vy = Math.sin(angle) * CONFIG.BULLET_SPEED;
        this.lifetime = CONFIG.BULLET_LIFETIME;
        this.size = 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.x = wrap(this.x, CONFIG.CANVAS_WIDTH);
        this.y = wrap(this.y, CONFIG.CANVAS_HEIGHT);
        this.lifetime--;
        return this.lifetime > 0;
    }

    draw(ctx) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    getCollisionRadius() {
        return this.size;
    }
}

// Asteroid class
class Asteroid {
    constructor(x, y, sizeIndex) {
        this.x = x;
        this.y = y;
        this.sizeIndex = sizeIndex;
        this.size = CONFIG.ASTEROID_SIZES[sizeIndex];

        // Random velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = CONFIG.ASTEROID_SPEEDS[sizeIndex] * (0.5 + Math.random() * 0.5);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Random rotation
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;

        // Generate random shape
        this.vertices = this.generateVertices();
    }

    generateVertices() {
        const vertices = [];
        const numVertices = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const radius = this.size * (0.7 + Math.random() * 0.3);
            vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        return vertices;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.x = wrap(this.x, CONFIG.CANVAS_WIDTH);
        this.y = wrap(this.y, CONFIG.CANVAS_HEIGHT);
        this.angle += this.rotationSpeed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    getCollisionRadius() {
        return this.size * 0.8;
    }

    split() {
        const newAsteroids = [];
        if (this.sizeIndex < 2) {
            // Create two smaller asteroids
            for (let i = 0; i < 2; i++) {
                const asteroid = new Asteroid(this.x, this.y, this.sizeIndex + 1);
                newAsteroids.push(asteroid);
            }
        }
        return newAsteroids;
    }
}

// Particle class for explosions
class Particle {
    constructor(x, y, vx, vy, lifetime, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.color = color || '#fff';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.lifetime--;
        return this.lifetime > 0;
    }

    draw(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(this.x - 1, this.y - 1, 2, 2);
        ctx.globalAlpha = 1;
    }
}

// Utility functions
function wrap(value, max) {
    if (value < 0) return max + value;
    if (value > max) return value - max;
    return value;
}

function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function circleCollision(obj1, obj2) {
    try {
        const dist = distance(obj1.x, obj1.y, obj2.x, obj2.y);
        const r1 = obj1.getCollisionRadius();
        const r2 = obj2.getCollisionRadius();
        return dist < r1 + r2;
    } catch (e) {
        log('ERROR', `Collision check failed: ${e.message}`, { obj1, obj2 });
        console.error('Collision error:', e);
        return false;
    }
}

// Create explosion effect
function createExplosion(x, y, count, speed, color) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vel = Math.random() * speed;
        game.particles.push(new Particle(
            x, y,
            Math.cos(angle) * vel,
            Math.sin(angle) * vel,
            30 + Math.random() * 30,
            color
        ));
    }
}

// Spawn asteroids
function spawnAsteroids(count, avoidShip = true) {
    for (let i = 0; i < count; i++) {
        let x, y;
        let attempts = 0;

        do {
            // Spawn from edges
            if (Math.random() > 0.5) {
                x = Math.random() > 0.5 ? 0 : CONFIG.CANVAS_WIDTH;
                y = Math.random() * CONFIG.CANVAS_HEIGHT;
            } else {
                x = Math.random() * CONFIG.CANVAS_WIDTH;
                y = Math.random() > 0.5 ? 0 : CONFIG.CANVAS_HEIGHT;
            }
            attempts++;
        } while (
            avoidShip &&
            game.ship &&
            distance(x, y, game.ship.x, game.ship.y) < 200 &&
            attempts < 10
        );

        game.asteroids.push(new Asteroid(x, y, 0));
    }
}

// Update lives display
function updateLivesDisplay() {
    livesDisplay.innerHTML = '';
    for (let i = 0; i < game.lives; i++) {
        const life = document.createElement('div');
        life.className = 'life-icon';
        livesDisplay.appendChild(life);
    }
}

// Update score
function addScore(points) {
    const oldScore = game.score;
    game.score += points;
    scoreDisplay.textContent = game.score;

    // Extra life every 10000 points
    if (Math.floor(game.score / 10000) > Math.floor(oldScore / 10000)) {
        game.lives++;
        updateLivesDisplay();
    }

    // Update high score
    if (game.score > game.highScore) {
        game.highScore = game.score;
        localStorage.setItem(CONFIG.SAVE_KEY, game.highScore);
    }
}

// Ship destroyed
function destroyShip() {
    createExplosion(game.ship.x, game.ship.y, 30, 5, '#fff');
    game.lives--;
    updateLivesDisplay();

    if (game.lives <= 0) {
        gameOver();
    } else {
        game.ship = null;
        game.respawnTimer = CONFIG.RESPAWN_DELAY;
    }
}

// Respawn ship
function respawnShip() {
    game.ship = new Ship(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    game.invulnerabilityTimer = CONFIG.INVULNERABILITY_TIME;
}

// Next level
function nextLevel() {
    game.level++;
    levelDisplay.textContent = game.level;
    spawnAsteroids(CONFIG.INITIAL_ASTEROIDS + game.level - 1);
}

// Game over
function gameOver() {
    game.isRunning = false;
    finalScoreDisplay.textContent = game.score;
    finalHighScoreDisplay.textContent = game.highScore;
    gameOverScreen.style.display = 'flex';
}

// Handle input
function handleInput() {
    if (!game.ship) return;

    if (game.keys['KeyW'] || game.keys['ArrowUp']) {
        game.ship.thrust();
    }
    if (game.keys['KeyA'] || game.keys['ArrowLeft']) {
        game.ship.rotateLeft();
    }
    if (game.keys['KeyD'] || game.keys['ArrowRight']) {
        game.ship.rotateRight();
    }
    if (game.keys['KeyS'] || game.keys['ArrowDown']) {
        game.ship.hyperspace();
        game.keys['KeyS'] = false;
        game.keys['ArrowDown'] = false;
    }
}

// Check collisions
function checkCollisions() {
    // Bullet vs Asteroid
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        if (!bullet) {
            log('ERROR', `Null bullet at index ${i}`);
            continue;
        }
        for (let j = game.asteroids.length - 1; j >= 0; j--) {
            const asteroid = game.asteroids[j];
            if (!asteroid) {
                log('ERROR', `Null asteroid at index ${j}`);
                continue;
            }
            if (circleCollision(bullet, asteroid)) {
                log('COLLISION', `Bullet hit asteroid at (${asteroid.x.toFixed(1)}, ${asteroid.y.toFixed(1)})`);
                // Remove bullet
                game.bullets.splice(i, 1);

                // Create explosion
                createExplosion(asteroid.x, asteroid.y, 15, 3, '#fff');

                // Split asteroid
                const newAsteroids = asteroid.split();
                game.asteroids.splice(j, 1);
                game.asteroids.push(...newAsteroids);

                // Add score
                addScore(CONFIG.ASTEROID_POINTS[asteroid.sizeIndex]);

                break;
            }
        }
    }

    // Ship vs Asteroid
    if (game.ship && game.invulnerabilityTimer <= 0) {
        for (const asteroid of game.asteroids) {
            if (circleCollision(game.ship, asteroid)) {
                destroyShip();
                break;
            }
        }
    }
}

// Main game loop
let frameCount = 0;
function gameLoop() {
    if (!game.isRunning) return;

    try {
        frameCount++;
        if (frameCount % 600 === 0) {
            log('LOOP', `Frame ${frameCount}, bullets: ${game.bullets.length}, asteroids: ${game.asteroids.length}`);
        }

        if (!game.isPaused) {
            // Handle input
            handleInput();

            // Update timers
            if (game.hyperspaceCooldown > 0) game.hyperspaceCooldown--;
            if (game.invulnerabilityTimer > 0) game.invulnerabilityTimer--;

            // Respawn ship
            if (!game.ship && game.respawnTimer > 0) {
                game.respawnTimer--;
                if (game.respawnTimer <= 0) {
                    respawnShip();
                }
            }

            // Update ship
            if (game.ship) {
                game.ship.update();
            }

            // Update bullets
            game.bullets = game.bullets.filter(bullet => bullet.update());

            // Update asteroids
            game.asteroids.forEach(asteroid => asteroid.update());

            // Update particles
            game.particles = game.particles.filter(particle => particle.update());

            // Check collisions
            checkCollisions();

            // Check for level complete
            if (game.asteroids.length === 0) {
                nextLevel();
            }

            // Draw
            draw();
        }

        requestAnimationFrame(gameLoop);
    } catch (e) {
        log('ERROR', `Game loop crashed: ${e.message}`);
        console.error('Game loop error:', e);
        console.error('Stack:', e.stack);
    }
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Draw particles
    game.particles.forEach(particle => particle.draw(ctx));

    // Draw asteroids
    game.asteroids.forEach(asteroid => asteroid.draw(ctx));

    // Draw bullets
    game.bullets.forEach(bullet => bullet.draw(ctx));

    // Draw ship
    if (game.ship) {
        game.ship.draw(ctx);
    }
}

// Start game
function startGame() {
    game.isRunning = true;
    game.isPaused = false;
    game.score = 0;
    game.level = 1;
    game.lives = 3;
    game.bullets = [];
    game.asteroids = [];
    game.particles = [];
    game.respawnTimer = 0;
    game.hyperspaceCooldown = 0;
    game.invulnerabilityTimer = CONFIG.INVULNERABILITY_TIME;

    scoreDisplay.textContent = '0';
    levelDisplay.textContent = '1';
    updateLivesDisplay();

    game.ship = new Ship(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    spawnAsteroids(CONFIG.INITIAL_ASTEROIDS);

    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    pauseScreen.style.display = 'none';

    gameLoop();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    game.keys[e.code] = true;

    // Shoot on space press (not hold)
    if (e.code === 'Space') {
        log('INPUT', `Space pressed. ship=${!!game.ship}, running=${game.isRunning}, paused=${game.isPaused}`);
        if (game.ship && game.isRunning && !game.isPaused) {
            game.ship.shoot();
        }
    }

    // Pause
    if (e.code === 'KeyP' && game.isRunning) {
        game.isPaused = !game.isPaused;
        pauseScreen.style.display = game.isPaused ? 'flex' : 'none';
    }

    // Prevent scrolling
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    game.keys[e.code] = false;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Load high score
game.highScore = parseInt(localStorage.getItem(CONFIG.SAVE_KEY)) || 0;
highScoreDisplay.textContent = game.highScore;

// Prevent context menu
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
