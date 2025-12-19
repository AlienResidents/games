// Border Runner - A Smuggler's Survival Game
// ==========================================

const GAME_CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    WORLD_WIDTH: 4000,
    WORLD_HEIGHT: 3000,
    TILE_SIZE: 50,
    PLAYER_SIZE: 30,
    PLAYER_SPEED: 4,
    SPRINT_MULTIPLIER: 1.8,
    MAX_CARGO: 5,
    WALL_Y: 1500, // The Trump Wall position
    WALL_THICKNESS: 80,
    SAVE_KEY: 'borderRunnerSave'
};

// Game State
let gameState = {
    isRunning: false,
    isPaused: false,
    player: null,
    camera: { x: 0, y: 0 },
    entities: {
        packages: [],
        dropZones: [],
        patrols: [],
        obstacles: [],
        bushes: []
    },
    stats: {
        health: 100,
        stamina: 100,
        wanted: 0,
        cash: 0,
        totalDelivered: 0
    },
    cargo: [],
    keys: {},
    lastTime: 0,
    messageTimeout: null
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');

canvas.width = GAME_CONFIG.CANVAS_WIDTH;
canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
minimap.width = 180;
minimap.height = 135;

// UI Elements
const healthBar = document.getElementById('health-bar');
const staminaBar = document.getElementById('stamina-bar');
const wantedBar = document.getElementById('wanted-bar');
const cashDisplay = document.getElementById('cash-display');
const cargoDisplay = document.getElementById('cargo-display');
const messageBox = document.getElementById('message-box');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const continueBtn = document.getElementById('continue-btn');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverReason = document.getElementById('game-over-reason');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.PLAYER_SIZE;
        this.height = GAME_CONFIG.PLAYER_SIZE;
        this.speed = GAME_CONFIG.PLAYER_SPEED;
        this.direction = { x: 0, y: 1 }; // Facing down initially
        this.isHidden = false;
    }

    update(deltaTime) {
        const keys = gameState.keys;
        let dx = 0, dy = 0;
        let isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];

        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Update direction for rendering
        if (dx !== 0 || dy !== 0) {
            this.direction = { x: dx, y: dy };
        }

        // Stamina management
        let speed = this.speed;
        if (isSprinting && (dx !== 0 || dy !== 0)) {
            if (gameState.stats.stamina > 0) {
                speed *= GAME_CONFIG.SPRINT_MULTIPLIER;
                gameState.stats.stamina = Math.max(0, gameState.stats.stamina - 0.5);
            }
        } else if (gameState.stats.stamina < 100) {
            gameState.stats.stamina = Math.min(100, gameState.stats.stamina + 0.2);
        }

        // Calculate new position
        let newX = this.x + dx * speed;
        let newY = this.y + dy * speed;

        // Wall collision - THE TRUMP WALL
        if (this.isCollidingWithWall(newX, newY)) {
            // Apply penalty for hitting the wall
            gameState.stats.health -= 0.1;
            gameState.stats.wanted = Math.min(100, gameState.stats.wanted + 0.05);
            showMessage("THE WALL BLOCKS YOUR PATH!", 500);

            // Find wall gaps
            const gap = this.findNearestWallGap();
            if (gap) {
                showMessage(`Wall gap nearby at X: ${Math.floor(gap.x)}`, 2000);
            }

            // Prevent movement through wall
            if (this.isCollidingWithWall(newX, this.y)) newX = this.x;
            if (this.isCollidingWithWall(this.x, newY)) newY = this.y;
        }

        // Obstacle collision
        for (const obstacle of gameState.entities.obstacles) {
            if (this.isCollidingWith(newX, newY, obstacle)) {
                gameState.stats.health -= 0.05;
                if (obstacle.type === 'cactus') {
                    showMessage("Ouch! Cactus!", 500);
                } else if (obstacle.type === 'rock') {
                    showMessage("Blocked by rocks!", 500);
                }
                if (this.isCollidingWith(newX, this.y, obstacle)) newX = this.x;
                if (this.isCollidingWith(this.x, newY, obstacle)) newY = this.y;
            }
        }

        // Check if hidden in bush
        this.isHidden = false;
        for (const bush of gameState.entities.bushes) {
            if (this.isCollidingWith(newX, newY, bush)) {
                this.isHidden = true;
                break;
            }
        }

        // World bounds
        newX = Math.max(this.width/2, Math.min(GAME_CONFIG.WORLD_WIDTH - this.width/2, newX));
        newY = Math.max(this.height/2, Math.min(GAME_CONFIG.WORLD_HEIGHT - this.height/2, newY));

        this.x = newX;
        this.y = newY;
    }

    isCollidingWithWall(x, y) {
        const wallTop = GAME_CONFIG.WALL_Y;
        const wallBottom = GAME_CONFIG.WALL_Y + GAME_CONFIG.WALL_THICKNESS;

        // Check if player is at wall position
        if (y + this.height/2 > wallTop && y - this.height/2 < wallBottom) {
            // Check for gaps in the wall
            for (const gap of wallGaps) {
                if (x > gap.x && x < gap.x + gap.width) {
                    return false; // In a gap, no collision
                }
            }
            return true;
        }
        return false;
    }

    findNearestWallGap() {
        let nearest = null;
        let minDist = Infinity;
        for (const gap of wallGaps) {
            const dist = Math.abs(this.x - (gap.x + gap.width/2));
            if (dist < minDist) {
                minDist = dist;
                nearest = gap;
            }
        }
        return nearest;
    }

    isCollidingWith(x, y, obj) {
        return x - this.width/2 < obj.x + obj.width &&
               x + this.width/2 > obj.x &&
               y - this.height/2 < obj.y + obj.height &&
               y + this.height/2 > obj.y;
    }

    draw(ctx) {
        const screenX = this.x - gameState.camera.x;
        const screenY = this.y - gameState.camera.y;

        // Draw player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + this.height/2 + 5, this.width/2, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw player body
        ctx.fillStyle = this.isHidden ? 'rgba(50, 50, 50, 0.7)' : '#2d3436';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.width/2, 0, Math.PI * 2);
        ctx.fill();

        // Draw direction indicator (head)
        const headX = screenX + this.direction.x * 8;
        const headY = screenY + this.direction.y * 8;
        ctx.fillStyle = this.isHidden ? 'rgba(85, 85, 85, 0.7)' : '#636e72';
        ctx.beginPath();
        ctx.arc(headX, headY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw cargo indicator
        if (gameState.cargo.length > 0) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(screenX, screenY - this.height/2 - 10, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2d3436';
            ctx.font = 'bold 10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(gameState.cargo.length, screenX, screenY - this.height/2 - 7);
        }

        // Hidden indicator
        if (this.isHidden) {
            ctx.fillStyle = 'rgba(46, 213, 115, 0.8)';
            ctx.font = '12px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('HIDDEN', screenX, screenY - this.height/2 - 20);
        }
    }
}

// Patrol (Border Agent) class
class Patrol {
    constructor(x, y, patrolPath) {
        this.x = x;
        this.y = y;
        this.width = 35;
        this.height = 35;
        this.speed = 2;
        this.patrolPath = patrolPath;
        this.pathIndex = 0;
        this.detectionRadius = 150;
        this.chaseSpeed = 3.5;
        this.isChasing = false;
        this.alertTimer = 0;
    }

    update(deltaTime, player) {
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

        // Detection logic
        if (distToPlayer < this.detectionRadius && !player.isHidden) {
            this.isChasing = true;
            this.alertTimer = 180; // 3 seconds at 60fps
            gameState.stats.wanted = Math.min(100, gameState.stats.wanted + 0.3);
        }

        if (this.alertTimer > 0) {
            this.alertTimer--;
            if (this.alertTimer === 0) {
                this.isChasing = false;
            }
        }

        if (this.isChasing && !player.isHidden) {
            // Chase player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
                this.x += (dx / dist) * this.chaseSpeed;
                this.y += (dy / dist) * this.chaseSpeed;
            }

            // Catch player
            if (distToPlayer < 30) {
                gameState.stats.health -= 1;
                showMessage("CAUGHT! -Health", 500);

                // Confiscate cargo
                if (gameState.cargo.length > 0) {
                    const lost = gameState.cargo.pop();
                    showMessage("Cargo confiscated!", 1000);
                }
            }
        } else {
            // Patrol behavior
            if (this.patrolPath.length > 0) {
                const target = this.patrolPath[this.pathIndex];
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 5) {
                    this.pathIndex = (this.pathIndex + 1) % this.patrolPath.length;
                } else {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
            }
        }
    }

    draw(ctx) {
        const screenX = this.x - gameState.camera.x;
        const screenY = this.y - gameState.camera.y;

        // Detection radius (when chasing)
        if (this.isChasing) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.detectionRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw patrol body
        ctx.fillStyle = this.isChasing ? '#ff4757' : '#3742fa';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.width/2, 0, Math.PI * 2);
        ctx.fill();

        // Badge
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(screenX, screenY - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Alert indicator
        if (this.isChasing) {
            ctx.fillStyle = '#ff4757';
            ctx.font = 'bold 16px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('!', screenX, screenY - this.height/2 - 10);
        }
    }
}

// Package class (contraband)
class Package {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.value = value;
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    draw(ctx, time) {
        if (this.collected) return;

        const screenX = this.x - gameState.camera.x;
        const screenY = this.y - gameState.camera.y + Math.sin(time / 500 + this.bobOffset) * 3;

        // Glow effect
        ctx.fillStyle = 'rgba(46, 213, 115, 0.3)';
        ctx.beginPath();
        ctx.arc(screenX + this.width/2, screenY + this.height/2, 20, 0, Math.PI * 2);
        ctx.fill();

        // Package
        ctx.fillStyle = '#2ed573';
        ctx.fillRect(screenX, screenY, this.width, this.height);

        // Value indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('$' + this.value, screenX + this.width/2, screenY - 5);
    }
}

// Drop Zone class
class DropZone {
    constructor(x, y, name) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 60;
        this.name = name;
    }

    draw(ctx, time) {
        const screenX = this.x - gameState.camera.x;
        const screenY = this.y - gameState.camera.y;
        const pulse = Math.sin(time / 300) * 0.3 + 0.7;

        // Drop zone indicator
        ctx.strokeStyle = `rgba(255, 165, 0, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX, screenY, this.width, this.height);

        // Inner fill
        ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
        ctx.fillRect(screenX, screenY, this.width, this.height);

        // Label
        ctx.fillStyle = '#ffa502';
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, screenX + this.width/2, screenY - 10);
        ctx.fillText('DROP', screenX + this.width/2, screenY + this.height/2 + 5);
    }
}

// Obstacle class
class Obstacle {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
    }

    draw(ctx) {
        const screenX = this.x - gameState.camera.x;
        const screenY = this.y - gameState.camera.y;

        if (this.type === 'cactus') {
            ctx.fillStyle = '#00b894';
            // Main stem
            ctx.fillRect(screenX + this.width/2 - 8, screenY, 16, this.height);
            // Arms
            ctx.fillRect(screenX, screenY + 15, this.width/2 - 8, 12);
            ctx.fillRect(screenX, screenY + 15, 10, 25);
            ctx.fillRect(screenX + this.width/2 + 8, screenY + 25, this.width/2 - 8, 12);
            ctx.fillRect(screenX + this.width - 10, screenY + 25, 10, 20);
        } else if (this.type === 'rock') {
            ctx.fillStyle = '#636e72';
            ctx.beginPath();
            ctx.ellipse(screenX + this.width/2, screenY + this.height/2,
                       this.width/2, this.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4a5568';
            ctx.beginPath();
            ctx.ellipse(screenX + this.width/2 - 5, screenY + this.height/2 - 5,
                       this.width/4, this.height/4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Bush class (hiding spot)
class Bush {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 40;
    }

    draw(ctx) {
        const screenX = this.x - gameState.camera.x;
        const screenY = this.y - gameState.camera.y;

        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.ellipse(screenX + 15, screenY + 25, 18, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(screenX + 35, screenY + 25, 18, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.ellipse(screenX + 25, screenY + 18, 20, 18, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Wall gaps
let wallGaps = [];

// Initialize the world
function initWorld() {
    // Create wall gaps (only way through THE WALL)
    wallGaps = [
        { x: 500, width: 80 },
        { x: 1500, width: 80 },
        { x: 2800, width: 80 },
        { x: 3500, width: 80 }
    ];

    // Create packages (contraband) - mostly south of the wall
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * (GAME_CONFIG.WORLD_WIDTH - 100) + 50;
        const y = GAME_CONFIG.WALL_Y + GAME_CONFIG.WALL_THICKNESS + 100 +
                  Math.random() * (GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.WALL_Y - GAME_CONFIG.WALL_THICKNESS - 200);
        const value = Math.floor(Math.random() * 500) + 100;
        gameState.entities.packages.push(new Package(x, y, value));
    }

    // Create drop zones (north of the wall - USA side)
    gameState.entities.dropZones = [
        new DropZone(300, 200, 'Safe House A'),
        new DropZone(1200, 400, 'Warehouse B'),
        new DropZone(2500, 300, 'Contact C'),
        new DropZone(3600, 500, 'Stash D')
    ];

    // Create patrols along the wall
    for (let i = 0; i < 8; i++) {
        const startX = 200 + i * 450;
        const patrolPath = [
            { x: startX, y: GAME_CONFIG.WALL_Y - 80 },
            { x: startX + 200, y: GAME_CONFIG.WALL_Y - 80 },
            { x: startX + 200, y: GAME_CONFIG.WALL_Y + GAME_CONFIG.WALL_THICKNESS + 80 },
            { x: startX, y: GAME_CONFIG.WALL_Y + GAME_CONFIG.WALL_THICKNESS + 80 }
        ];
        gameState.entities.patrols.push(new Patrol(startX, GAME_CONFIG.WALL_Y - 80, patrolPath));
    }

    // Create obstacles
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * GAME_CONFIG.WORLD_WIDTH;
        let y = Math.random() * GAME_CONFIG.WORLD_HEIGHT;

        // Avoid placing on the wall
        if (y > GAME_CONFIG.WALL_Y - 50 && y < GAME_CONFIG.WALL_Y + GAME_CONFIG.WALL_THICKNESS + 50) {
            y = y < GAME_CONFIG.WALL_Y ? GAME_CONFIG.WALL_Y - 100 : GAME_CONFIG.WALL_Y + GAME_CONFIG.WALL_THICKNESS + 100;
        }

        const type = Math.random() > 0.5 ? 'cactus' : 'rock';
        const size = type === 'cactus' ? { w: 40, h: 60 } : { w: 45, h: 35 };
        gameState.entities.obstacles.push(new Obstacle(x, y, size.w, size.h, type));
    }

    // Create bushes (hiding spots)
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * GAME_CONFIG.WORLD_WIDTH;
        let y = Math.random() * GAME_CONFIG.WORLD_HEIGHT;

        if (y > GAME_CONFIG.WALL_Y - 30 && y < GAME_CONFIG.WALL_Y + GAME_CONFIG.WALL_THICKNESS + 30) {
            continue;
        }

        gameState.entities.bushes.push(new Bush(x, y));
    }
}

// Draw the world
function drawWorld(time) {
    // Clear canvas
    ctx.fillStyle = '#deb887'; // Desert tan
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid for reference
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    const startX = -gameState.camera.x % GAME_CONFIG.TILE_SIZE;
    const startY = -gameState.camera.y % GAME_CONFIG.TILE_SIZE;

    for (let x = startX; x < canvas.width; x += GAME_CONFIG.TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += GAME_CONFIG.TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw different terrain zones
    // North (USA) - greener
    const usaY = -gameState.camera.y;
    if (usaY + GAME_CONFIG.WALL_Y > 0) {
        ctx.fillStyle = 'rgba(144, 238, 144, 0.3)';
        ctx.fillRect(0, Math.max(0, usaY), canvas.width,
                    Math.min(GAME_CONFIG.WALL_Y, GAME_CONFIG.WALL_Y + usaY));
    }

    // Draw THE TRUMP WALL
    const wallScreenY = GAME_CONFIG.WALL_Y - gameState.camera.y;
    if (wallScreenY < canvas.height && wallScreenY + GAME_CONFIG.WALL_THICKNESS > 0) {
        // Wall shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, wallScreenY + 10, canvas.width, GAME_CONFIG.WALL_THICKNESS);

        // Main wall
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, wallScreenY, canvas.width, GAME_CONFIG.WALL_THICKNESS);

        // Wall segments
        ctx.fillStyle = '#A0522D';
        for (let x = 0; x < canvas.width; x += 100) {
            ctx.fillRect(x, wallScreenY, 5, GAME_CONFIG.WALL_THICKNESS);
        }

        // Wall top
        ctx.fillStyle = '#CD853F';
        ctx.fillRect(0, wallScreenY, canvas.width, 10);

        // Draw gaps
        for (const gap of wallGaps) {
            const gapScreenX = gap.x - gameState.camera.x;
            if (gapScreenX > -gap.width && gapScreenX < canvas.width) {
                ctx.fillStyle = '#deb887';
                ctx.fillRect(gapScreenX, wallScreenY, gap.width, GAME_CONFIG.WALL_THICKNESS);

                // Gap markers
                ctx.fillStyle = '#ff6348';
                ctx.font = 'bold 14px Courier New';
                ctx.textAlign = 'center';
                ctx.fillText('GAP', gapScreenX + gap.width/2, wallScreenY - 5);
            }
        }

        // Wall label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('THE WALL', canvas.width/2, wallScreenY + GAME_CONFIG.WALL_THICKNESS/2 + 8);
    }

    // Draw bushes (behind player)
    for (const bush of gameState.entities.bushes) {
        bush.draw(ctx);
    }

    // Draw obstacles
    for (const obstacle of gameState.entities.obstacles) {
        obstacle.draw(ctx);
    }

    // Draw packages
    for (const pkg of gameState.entities.packages) {
        pkg.draw(ctx, time);
    }

    // Draw drop zones
    for (const zone of gameState.entities.dropZones) {
        zone.draw(ctx, time);
    }

    // Draw patrols
    for (const patrol of gameState.entities.patrols) {
        patrol.draw(ctx);
    }

    // Draw player
    if (gameState.player) {
        gameState.player.draw(ctx);
    }
}

// Draw minimap
function drawMinimap() {
    const scaleX = minimap.width / GAME_CONFIG.WORLD_WIDTH;
    const scaleY = minimap.height / GAME_CONFIG.WORLD_HEIGHT;

    // Background
    minimapCtx.fillStyle = '#1a1a2e';
    minimapCtx.fillRect(0, 0, minimap.width, minimap.height);

    // Terrain zones
    minimapCtx.fillStyle = 'rgba(144, 238, 144, 0.3)';
    minimapCtx.fillRect(0, 0, minimap.width, GAME_CONFIG.WALL_Y * scaleY);

    // The Wall
    minimapCtx.fillStyle = '#8B4513';
    minimapCtx.fillRect(0, GAME_CONFIG.WALL_Y * scaleY,
                        minimap.width, GAME_CONFIG.WALL_THICKNESS * scaleY);

    // Wall gaps
    minimapCtx.fillStyle = '#ffa502';
    for (const gap of wallGaps) {
        minimapCtx.fillRect(gap.x * scaleX, GAME_CONFIG.WALL_Y * scaleY,
                           gap.width * scaleX, GAME_CONFIG.WALL_THICKNESS * scaleY);
    }

    // Packages
    minimapCtx.fillStyle = '#2ed573';
    for (const pkg of gameState.entities.packages) {
        if (!pkg.collected) {
            minimapCtx.fillRect(pkg.x * scaleX - 2, pkg.y * scaleY - 2, 4, 4);
        }
    }

    // Drop zones
    minimapCtx.fillStyle = '#ffa502';
    for (const zone of gameState.entities.dropZones) {
        minimapCtx.fillRect(zone.x * scaleX, zone.y * scaleY,
                           zone.width * scaleX, zone.height * scaleY);
    }

    // Patrols
    minimapCtx.fillStyle = '#3742fa';
    for (const patrol of gameState.entities.patrols) {
        minimapCtx.beginPath();
        minimapCtx.arc(patrol.x * scaleX, patrol.y * scaleY, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    // Player
    if (gameState.player) {
        minimapCtx.fillStyle = '#e94560';
        minimapCtx.beginPath();
        minimapCtx.arc(gameState.player.x * scaleX, gameState.player.y * scaleY, 4, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    // Camera viewport
    minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(
        gameState.camera.x * scaleX,
        gameState.camera.y * scaleY,
        canvas.width * scaleX,
        canvas.height * scaleY
    );
}

// Update UI
function updateUI() {
    healthBar.style.width = gameState.stats.health + '%';
    staminaBar.style.width = gameState.stats.stamina + '%';
    wantedBar.style.width = gameState.stats.wanted + '%';
    cashDisplay.textContent = '$' + gameState.stats.cash;
    cargoDisplay.textContent = gameState.cargo.length + '/' + GAME_CONFIG.MAX_CARGO;

    // Color changes based on values
    if (gameState.stats.health < 30) {
        healthBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4757)';
    }
    if (gameState.stats.wanted > 70) {
        wantedBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4757)';
    }
}

// Show message
function showMessage(text, duration = 2000) {
    messageBox.textContent = text;
    messageBox.classList.add('visible');

    if (gameState.messageTimeout) {
        clearTimeout(gameState.messageTimeout);
    }

    gameState.messageTimeout = setTimeout(() => {
        messageBox.classList.remove('visible');
    }, duration);
}

// Check interactions
function checkInteractions() {
    const player = gameState.player;

    // Package pickup (E key)
    if (gameState.keys['KeyE']) {
        gameState.keys['KeyE'] = false; // Consume the keypress

        if (gameState.cargo.length < GAME_CONFIG.MAX_CARGO) {
            for (const pkg of gameState.entities.packages) {
                if (!pkg.collected) {
                    const dist = Math.hypot(player.x - pkg.x - pkg.width/2,
                                           player.y - pkg.y - pkg.height/2);
                    if (dist < 40) {
                        pkg.collected = true;
                        gameState.cargo.push(pkg);
                        showMessage(`Picked up package worth $${pkg.value}!`);
                        break;
                    }
                }
            }
        } else {
            showMessage("Cargo full! Deliver first.");
        }
    }

    // Cargo drop (Space key)
    if (gameState.keys['Space']) {
        gameState.keys['Space'] = false;

        if (gameState.cargo.length > 0) {
            let dropped = false;
            for (const zone of gameState.entities.dropZones) {
                const dist = Math.hypot(player.x - zone.x - zone.width/2,
                                       player.y - zone.y - zone.height/2);
                if (dist < 100) {
                    const delivered = gameState.cargo.shift();
                    const bonus = Math.floor(delivered.value * (1 - gameState.stats.wanted / 200));
                    gameState.stats.cash += bonus;
                    gameState.stats.totalDelivered++;
                    gameState.stats.wanted = Math.max(0, gameState.stats.wanted - 10);
                    showMessage(`Delivered! +$${bonus} (Wanted reduced)`);
                    dropped = true;
                    break;
                }
            }
            if (!dropped) {
                showMessage("Find an orange DROP ZONE to deliver!");
            }
        } else {
            showMessage("No cargo to drop!");
        }
    }
}

// Update camera
function updateCamera() {
    const player = gameState.player;
    const targetX = player.x - canvas.width / 2;
    const targetY = player.y - canvas.height / 2;

    // Smooth camera follow
    gameState.camera.x += (targetX - gameState.camera.x) * 0.1;
    gameState.camera.y += (targetY - gameState.camera.y) * 0.1;

    // Clamp to world bounds
    gameState.camera.x = Math.max(0, Math.min(GAME_CONFIG.WORLD_WIDTH - canvas.width, gameState.camera.x));
    gameState.camera.y = Math.max(0, Math.min(GAME_CONFIG.WORLD_HEIGHT - canvas.height, gameState.camera.y));
}

// Game over
function gameOver(reason) {
    gameState.isRunning = false;
    gameOverReason.textContent = reason;
    finalScore.textContent = gameState.stats.cash;
    gameOverScreen.style.display = 'flex';

    // Clear save
    localStorage.removeItem(GAME_CONFIG.SAVE_KEY);
}

// Save game
function saveGame() {
    const saveData = {
        player: { x: gameState.player.x, y: gameState.player.y },
        stats: gameState.stats,
        cargo: gameState.cargo.map(c => ({ value: c.value })),
        collectedPackages: gameState.entities.packages
            .map((p, i) => p.collected ? i : -1)
            .filter(i => i >= 0)
    };
    localStorage.setItem(GAME_CONFIG.SAVE_KEY, JSON.stringify(saveData));
}

// Load game
function loadGame() {
    const saveData = localStorage.getItem(GAME_CONFIG.SAVE_KEY);
    if (saveData) {
        const data = JSON.parse(saveData);
        gameState.player.x = data.player.x;
        gameState.player.y = data.player.y;
        gameState.stats = data.stats;
        gameState.cargo = data.cargo.map(c => ({ value: c.value }));

        for (const idx of data.collectedPackages) {
            if (gameState.entities.packages[idx]) {
                gameState.entities.packages[idx].collected = true;
            }
        }
        return true;
    }
    return false;
}

// Main game loop
function gameLoop(currentTime) {
    if (!gameState.isRunning) return;

    const deltaTime = currentTime - gameState.lastTime;
    gameState.lastTime = currentTime;

    // Update
    gameState.player.update(deltaTime);

    for (const patrol of gameState.entities.patrols) {
        patrol.update(deltaTime, gameState.player);
    }

    // Wanted level decay
    if (gameState.stats.wanted > 0) {
        gameState.stats.wanted = Math.max(0, gameState.stats.wanted - 0.02);
    }

    checkInteractions();
    updateCamera();

    // Check game over conditions
    if (gameState.stats.health <= 0) {
        gameOver("You ran out of health!");
        return;
    }
    if (gameState.stats.wanted >= 100) {
        gameOver("Maximum wanted level reached! The feds got you!");
        return;
    }

    // Draw
    drawWorld(currentTime);
    drawMinimap();
    updateUI();

    // Auto-save every 30 seconds
    if (Math.floor(currentTime / 30000) !== Math.floor(gameState.lastTime / 30000)) {
        saveGame();
    }

    requestAnimationFrame(gameLoop);
}

// Start game
function startGame(loadSave = false) {
    // Reset game state
    gameState.entities = {
        packages: [],
        dropZones: [],
        patrols: [],
        obstacles: [],
        bushes: []
    };
    gameState.stats = {
        health: 100,
        stamina: 100,
        wanted: 0,
        cash: 0,
        totalDelivered: 0
    };
    gameState.cargo = [];

    // Initialize world
    initWorld();

    // Create player (start south of the wall - Mexico side)
    gameState.player = new Player(
        GAME_CONFIG.WORLD_WIDTH / 2,
        GAME_CONFIG.WORLD_HEIGHT - 200
    );

    // Load save if requested
    if (loadSave) {
        loadGame();
    }

    // Hide screens
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';

    // Start game
    gameState.isRunning = true;
    gameState.lastTime = performance.now();

    showMessage("Pick up packages (E) and deliver them across THE WALL!", 4000);

    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('keydown', (e) => {
    gameState.keys[e.code] = true;

    // Prevent default for game keys
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.code] = false;
});

// Check for existing save
if (localStorage.getItem(GAME_CONFIG.SAVE_KEY)) {
    continueBtn.style.display = 'block';
}

startBtn.addEventListener('click', () => startGame(false));
continueBtn.addEventListener('click', () => startGame(true));
restartBtn.addEventListener('click', () => startGame(false));

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ===== TOUCH CONTROLS =====
const touchControls = {
    isTouchDevice: false,
    joystick: {
        container: null,
        base: null,
        stick: null,
        active: false,
        touchId: null,
        baseX: 0,
        baseY: 0,
        baseRadius: 70,
        stickRadius: 30
    },
    buttons: {},
    activeTouches: new Map(),

    init() {
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (this.isTouchDevice) {
            document.body.classList.add('touch-device');
            this.createControls();
            this.attachListeners();
        }
    },

    createControls() {
        const container = document.getElementById('game-container');

        // Create joystick
        this.joystick.container = document.createElement('div');
        this.joystick.container.id = 'joystick-container';

        this.joystick.base = document.createElement('div');
        this.joystick.base.id = 'joystick-base';

        this.joystick.stick = document.createElement('div');
        this.joystick.stick.id = 'joystick-stick';

        this.joystick.base.appendChild(this.joystick.stick);
        this.joystick.container.appendChild(this.joystick.base);
        container.appendChild(this.joystick.container);

        // Create action buttons container
        const actionsContainer = document.createElement('div');
        actionsContainer.id = 'touch-actions';

        const buttonDefs = [
            { id: 'btn-pickup', label: 'PICKUP', key: 'KeyE', type: 'tap' },
            { id: 'btn-drop', label: 'DROP', key: 'Space', type: 'tap' },
            { id: 'btn-sprint', label: 'SPRINT', key: 'ShiftLeft', type: 'hold' }
        ];

        buttonDefs.forEach(def => {
            const btn = document.createElement('div');
            btn.id = def.id;
            btn.className = 'action-btn';
            btn.textContent = def.label;
            btn.dataset.key = def.key;
            btn.dataset.type = def.type;
            actionsContainer.appendChild(btn);
            this.buttons[def.id] = btn;
        });

        container.appendChild(actionsContainer);
    },

    attachListeners() {
        const container = document.getElementById('game-container');
        container.style.touchAction = 'none';

        container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        container.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
    },

    handleTouchStart(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            // Check if touching joystick area
            const joystickRect = this.joystick.container.getBoundingClientRect();
            if (touch.clientX >= joystickRect.left && touch.clientX <= joystickRect.right &&
                touch.clientY >= joystickRect.top && touch.clientY <= joystickRect.bottom) {

                if (!this.joystick.active) {
                    this.joystick.active = true;
                    this.joystick.touchId = touch.identifier;

                    const baseRect = this.joystick.base.getBoundingClientRect();
                    this.joystick.baseX = baseRect.left + baseRect.width / 2;
                    this.joystick.baseY = baseRect.top + baseRect.height / 2;

                    this.updateJoystick(touch.clientX, touch.clientY);
                }
                continue;
            }

            // Check action buttons
            const btn = this.getButtonAt(touch.clientX, touch.clientY);
            if (btn) {
                this.activeTouches.set(touch.identifier, btn.id);
                this.activateButton(btn);
            }
        }
    },

    handleTouchMove(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            // Handle joystick movement
            if (this.joystick.active && touch.identifier === this.joystick.touchId) {
                this.updateJoystick(touch.clientX, touch.clientY);
                continue;
            }

            // Handle button transitions
            const currentBtnId = this.activeTouches.get(touch.identifier);
            const newBtn = this.getButtonAt(touch.clientX, touch.clientY);

            if (currentBtnId && (!newBtn || newBtn.id !== currentBtnId)) {
                const oldBtn = this.buttons[currentBtnId];
                if (oldBtn) {
                    this.deactivateButton(oldBtn);
                }
            }

            if (newBtn && (!currentBtnId || newBtn.id !== currentBtnId)) {
                this.activeTouches.set(touch.identifier, newBtn.id);
                this.activateButton(newBtn);
            } else if (!newBtn && currentBtnId) {
                this.activeTouches.delete(touch.identifier);
            }
        }
    },

    handleTouchEnd(e) {
        for (const touch of e.changedTouches) {
            // Handle joystick release
            if (this.joystick.active && touch.identifier === this.joystick.touchId) {
                this.joystick.active = false;
                this.joystick.touchId = null;
                this.resetJoystick();
                continue;
            }

            // Handle button release
            const btnId = this.activeTouches.get(touch.identifier);
            if (btnId) {
                const btn = this.buttons[btnId];
                if (btn) {
                    this.deactivateButton(btn);
                }
                this.activeTouches.delete(touch.identifier);
            }
        }
    },

    updateJoystick(touchX, touchY) {
        const dx = touchX - this.joystick.baseX;
        const dy = touchY - this.joystick.baseY;
        const distance = Math.hypot(dx, dy);
        const maxDistance = this.joystick.baseRadius - this.joystick.stickRadius;

        let stickX, stickY;

        if (distance > maxDistance) {
            const angle = Math.atan2(dy, dx);
            stickX = Math.cos(angle) * maxDistance;
            stickY = Math.sin(angle) * maxDistance;
        } else {
            stickX = dx;
            stickY = dy;
        }

        // Update stick visual position
        this.joystick.stick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

        // Convert to normalized direction (-1 to 1)
        const normalizedX = stickX / maxDistance;
        const normalizedY = stickY / maxDistance;

        // Apply dead zone (15%)
        const deadZone = 0.15;

        gameState.keys['KeyA'] = normalizedX < -deadZone;
        gameState.keys['ArrowLeft'] = normalizedX < -deadZone;
        gameState.keys['KeyD'] = normalizedX > deadZone;
        gameState.keys['ArrowRight'] = normalizedX > deadZone;
        gameState.keys['KeyW'] = normalizedY < -deadZone;
        gameState.keys['ArrowUp'] = normalizedY < -deadZone;
        gameState.keys['KeyS'] = normalizedY > deadZone;
        gameState.keys['ArrowDown'] = normalizedY > deadZone;
    },

    resetJoystick() {
        this.joystick.stick.style.transform = 'translate(-50%, -50%)';

        // Clear all movement keys
        gameState.keys['KeyW'] = false;
        gameState.keys['KeyA'] = false;
        gameState.keys['KeyS'] = false;
        gameState.keys['KeyD'] = false;
        gameState.keys['ArrowUp'] = false;
        gameState.keys['ArrowDown'] = false;
        gameState.keys['ArrowLeft'] = false;
        gameState.keys['ArrowRight'] = false;
    },

    getButtonAt(clientX, clientY) {
        for (const btn of Object.values(this.buttons)) {
            const rect = btn.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom) {
                return btn;
            }
        }
        return null;
    },

    activateButton(btn) {
        const key = btn.dataset.key;
        const type = btn.dataset.type;

        btn.classList.add('pressed');
        gameState.keys[key] = true;
    },

    deactivateButton(btn) {
        const key = btn.dataset.key;
        const type = btn.dataset.type;

        btn.classList.remove('pressed');

        if (type === 'hold') {
            gameState.keys[key] = false;
        }
    }
};

// Initialize touch controls when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    touchControls.init();
});
