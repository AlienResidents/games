| | |
|---|---|
| **Last Updated** | 2025-12-19 |
| **Author** | Claude Code |
| **Version** | 1.0.0 |

# Asteroids Clone - Game Specification

A classic Asteroids arcade game clone built with vanilla JavaScript and HTML5 Canvas, featuring vector-style graphics, physics-based movement, and progressive difficulty.

## Table of Contents

- [Overview](#overview)
- [Technical Stack](#technical-stack)
- [File Structure](#file-structure)
- [Game Configuration](#game-configuration)
- [Core Systems](#core-systems)
- [Entity Specifications](#entity-specifications)
- [Game Mechanics](#game-mechanics)
- [Collision Detection](#collision-detection)
- [User Interface](#user-interface)
- [Debug System](#debug-system)
- [Implementation Guide](#implementation-guide)

---

## Overview

### Concept
- **Genre**: Arcade shooter
- **Style**: Classic vector graphics (white lines on black background)
- **Core Loop**: Destroy asteroids → Avoid collisions → Clear level → Repeat with increased difficulty

### Key Features
- Physics-based ship movement with thrust and inertia
- Screen wrapping for all entities
- Asteroids split into smaller pieces when destroyed
- Hyperspace teleportation emergency escape
- Progressive difficulty (more asteroids per level)
- High score persistence via localStorage
- Particle effects for explosions and thrust

---

## Technical Stack

```
Language: Vanilla JavaScript (ES6+)
Rendering: HTML5 Canvas 2D Context
Storage: localStorage for high score
Server: Any static file server
Dependencies: None
```

---

## File Structure

```
asteroids/
├── index.html          # HTML structure with canvas and UI overlays
├── style.css           # Styling for UI, screens, and HUD
└── game.js             # Complete game logic (~700 lines)
```

---

## Game Configuration

```javascript
const CONFIG = {
    // Display
    CANVAS_WIDTH: 1000,
    CANVAS_HEIGHT: 700,

    // Ship physics (ADJUSTABLE)
    SHIP_SIZE: 20,
    SHIP_THRUST: 0.08,           // Acceleration (range: 0.02-0.2)
    SHIP_FRICTION: 0.99,         // Velocity decay per frame (0.95-0.995)
    SHIP_ROTATION_SPEED: 0.04,   // Radians per frame (range: 0.02-0.1)

    // Weapons
    BULLET_SPEED: 10,
    BULLET_LIFETIME: 60,         // Frames before bullet disappears
    MAX_BULLETS: 10,             // On screen at once

    // Asteroids
    ASTEROID_SPEEDS: [1.5, 2.5, 3.5],  // By size: [large, medium, small]
    ASTEROID_SIZES: [80, 40, 20],       // Radius by size index
    ASTEROID_POINTS: [20, 50, 100],     // Score by size index

    // Gameplay
    INITIAL_ASTEROIDS: 4,        // Starting asteroid count
    RESPAWN_DELAY: 180,          // Frames before ship respawns (3 sec @ 60fps)
    HYPERSPACE_COOLDOWN: 120,    // Frames between hyperspace uses
    INVULNERABILITY_TIME: 180,   // Frames of spawn protection

    // Persistence
    SAVE_KEY: 'asteroidsHighScore'
};
```

---

## Core Systems

### 1. Game State Structure

```javascript
game = {
    isRunning: boolean,
    isPaused: boolean,
    score: number,
    highScore: number,
    level: number,
    lives: number,
    ship: Ship | null,
    bullets: Bullet[],
    asteroids: Asteroid[],
    particles: Particle[],
    keys: { [keyCode: string]: boolean },
    respawnTimer: number,
    hyperspaceCooldown: number,
    invulnerabilityTimer: number
}
```

### 2. Input System

| Key | Action |
|-----|--------|
| W / ArrowUp | Thrust forward |
| A / ArrowLeft | Rotate counter-clockwise |
| D / ArrowRight | Rotate clockwise |
| S / ArrowDown | Hyperspace (random teleport) |
| Space | Fire bullet |
| P | Pause/unpause |

**Implementation Notes**:
- Use `keydown`/`keyup` events with `e.code` for key identification
- Store continuous key states in object for held keys (thrust, rotation)
- Fire on keydown event only (not continuous)
- Consume single-press keys immediately to prevent repeat

```javascript
document.addEventListener('keydown', (e) => {
    game.keys[e.code] = true;

    // Single-press actions
    if (e.code === 'Space' && game.ship) {
        game.ship.shoot();
    }
});

document.addEventListener('keyup', (e) => {
    game.keys[e.code] = false;
});
```

### 3. Screen Wrapping

All entities wrap around screen edges:

```javascript
function wrap(value, max) {
    if (value < 0) return max + value;
    if (value > max) return value - max;
    return value;
}

// Usage in entity update:
this.x = wrap(this.x, CONFIG.CANVAS_WIDTH);
this.y = wrap(this.y, CONFIG.CANVAS_HEIGHT);
```

### 4. Physics Model

```javascript
// Ship thrust (applied when W/Up held)
this.vx += Math.cos(this.angle) * CONFIG.SHIP_THRUST;
this.vy += Math.sin(this.angle) * CONFIG.SHIP_THRUST;

// Friction (applied every frame)
this.vx *= CONFIG.SHIP_FRICTION;
this.vy *= CONFIG.SHIP_FRICTION;

// Position update
this.x += this.vx;
this.y += this.vy;
```

---

## Entity Specifications

### Ship

```javascript
class Ship {
    x, y: number           // Center position
    vx, vy: number         // Velocity components
    angle: number          // Rotation in radians (-PI/2 = pointing up)
    size: number           // Collision/render size (20)
    isThrusting: boolean   // For flame rendering
}
```

**Methods**:
- `update()` - Apply friction, update position, wrap screen
- `thrust()` - Add velocity in facing direction, spawn thrust particles
- `rotateLeft()` - Decrease angle
- `rotateRight()` - Increase angle
- `shoot()` - Create bullet at ship nose
- `hyperspace()` - Teleport to random location (if cooldown ready)
- `draw(ctx)` - Render ship triangle with optional thrust flame
- `getCollisionRadius()` - Return size * 0.8

**Rendering** (vector style):
```javascript
// Ship shape: triangle pointing right at angle 0
ctx.moveTo(size, 0);                    // Nose
ctx.lineTo(-size, -size * 0.7);         // Top-left
ctx.lineTo(-size * 0.5, 0);             // Rear indent
ctx.lineTo(-size, size * 0.7);          // Bottom-left
ctx.closePath();

// Thrust flame (when thrusting):
ctx.moveTo(-size * 0.5, -size * 0.3);
ctx.lineTo(-size * 1.2 - random * 10, 0);  // Flickering tip
ctx.lineTo(-size * 0.5, size * 0.3);
```

### Bullet

```javascript
class Bullet {
    x, y: number           // Position
    vx, vy: number         // Velocity (constant, from ship angle at spawn)
    lifetime: number       // Frames remaining
    size: number           // Radius (3)
}
```

**Methods**:
- `update()` - Move, wrap screen, decrement lifetime, return alive status
- `draw(ctx)` - Render as small filled circle
- `getCollisionRadius()` - Return size

**CRITICAL**: Must implement `getCollisionRadius()` or collision detection crashes.

### Asteroid

```javascript
class Asteroid {
    x, y: number           // Center position
    vx, vy: number         // Velocity (random direction at spawn)
    angle: number          // Current rotation
    rotationSpeed: number  // Radians per frame
    sizeIndex: number      // 0=large, 1=medium, 2=small
    size: number           // Radius from CONFIG.ASTEROID_SIZES[sizeIndex]
    vertices: [{x,y}]      // Irregular polygon points
}
```

**Methods**:
- `constructor(x, y, sizeIndex)` - Initialize with random velocity, rotation, shape
- `generateVertices()` - Create irregular polygon (8-12 points with random radii)
- `update()` - Move, wrap, rotate
- `draw(ctx)` - Render polygon outline
- `getCollisionRadius()` - Return size * 0.8
- `split()` - Return array of 2 smaller asteroids (or empty if smallest)

**Vertex Generation**:
```javascript
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
```

### Particle

```javascript
class Particle {
    x, y: number           // Position
    vx, vy: number         // Velocity (decays over time)
    lifetime: number       // Frames remaining
    maxLifetime: number    // Initial lifetime (for alpha calculation)
    color: string          // CSS color
}
```

**Methods**:
- `update()` - Move, apply drag (0.98), decrement lifetime, return alive status
- `draw(ctx)` - Render 2x2 rect with alpha based on remaining lifetime

---

## Game Mechanics

### Scoring

| Asteroid Size | Points |
|---------------|--------|
| Large | 20 |
| Medium | 50 |
| Small | 100 |

**Extra Life**: Every 10,000 points

```javascript
function addScore(points) {
    const oldScore = game.score;
    game.score += points;

    // Extra life check
    if (Math.floor(game.score / 10000) > Math.floor(oldScore / 10000)) {
        game.lives++;
    }
}
```

### Level Progression

- Level 1: 4 large asteroids
- Level N: 3 + N large asteroids
- Asteroids spawn from screen edges, avoiding ship vicinity

```javascript
function nextLevel() {
    game.level++;
    spawnAsteroids(CONFIG.INITIAL_ASTEROIDS + game.level - 1);
}
```

### Ship Death & Respawn

1. Ship collision with asteroid triggers `destroyShip()`
2. Create explosion particles at ship position
3. Decrement lives
4. If lives > 0: Set `respawnTimer = RESPAWN_DELAY`
5. If lives = 0: Game over
6. After timer expires: Spawn new ship at center with invulnerability

### Hyperspace

- Teleports ship to random position
- Resets velocity to zero
- Has cooldown period between uses
- Visual effect: burst of cyan particles

---

## Collision Detection

### Circle-Circle Collision

```javascript
function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function circleCollision(obj1, obj2) {
    const dist = distance(obj1.x, obj1.y, obj2.x, obj2.y);
    const r1 = obj1.getCollisionRadius();
    const r2 = obj2.getCollisionRadius();
    return dist < r1 + r2;
}
```

### Collision Checks Per Frame

1. **Bullet vs Asteroid**: Iterate bullets (reverse), check against all asteroids
   - On hit: Remove bullet, split asteroid, create explosion, add score

2. **Ship vs Asteroid**: Only if ship exists and not invulnerable
   - On hit: Destroy ship

```javascript
function checkCollisions() {
    // Bullet vs Asteroid (iterate reverse for safe removal)
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        for (let j = game.asteroids.length - 1; j >= 0; j--) {
            const asteroid = game.asteroids[j];
            if (circleCollision(bullet, asteroid)) {
                game.bullets.splice(i, 1);
                createExplosion(asteroid.x, asteroid.y, 15, 3, '#fff');
                const newAsteroids = asteroid.split();
                game.asteroids.splice(j, 1);
                game.asteroids.push(...newAsteroids);
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
```

---

## User Interface

### HUD Layout

```
┌────────────────────────────────────────────────┐
│ 12500              LEVEL 3              ▲ ▲ ▲  │
│                                                │
│                                                │
│                    [GAME AREA]                 │
│                                                │
│                                                │
└────────────────────────────────────────────────┘
  Score              Level              Lives
```

### Lives Display

Render as ship-shaped triangles:
```css
.life-icon {
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 25px solid #fff;
}
```

### Screens

1. **Start Screen**: Title, controls, start button, high score
2. **Pause Screen**: "PAUSED" text, resume instruction
3. **Game Over Screen**: Final score, high score, restart button

---

## Debug System

### Logging Function

```javascript
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
```

### Log Categories

| Category | Events |
|----------|--------|
| INPUT | Key presses, button states |
| SHOOT | Bullet creation, max bullets |
| COLLISION | Bullet hits, ship collisions |
| LOOP | Frame count, entity counts (periodic) |
| ERROR | Exceptions, null checks, crashes |

### Error Handling

Wrap game loop in try-catch to prevent silent failures:

```javascript
function gameLoop() {
    try {
        // ... game logic ...
        requestAnimationFrame(gameLoop);
    } catch (e) {
        log('ERROR', `Game loop crashed: ${e.message}`);
        console.error('Stack:', e.stack);
    }
}
```

---

## Implementation Guide

### Step 1: HTML Structure

```html
<div id="game-container">
    <canvas id="gameCanvas"></canvas>
    <div id="ui-overlay">
        <div id="score-display"><span id="score">0</span></div>
        <div id="level-display">LEVEL <span id="level">1</span></div>
        <div id="lives-display"></div>
    </div>
    <div id="start-screen" class="screen">...</div>
    <div id="game-over-screen" class="screen">...</div>
    <div id="pause-screen" class="screen">...</div>
</div>
```

### Step 2: CSS Requirements

- Black background throughout
- White text, monospace font (Courier New)
- Canvas centered with border
- UI overlay with pointer-events: none
- Screen overlays with flexbox centering
- Button hover effects (invert colors)

### Step 3: JavaScript Architecture

```
1. Debug logging utility
2. Configuration constants
3. Game state object
4. Canvas/context setup
5. UI element references
6. Entity classes:
   - Ship (with all methods)
   - Bullet (with getCollisionRadius!)
   - Asteroid (with split, generateVertices)
   - Particle
7. Utility functions (wrap, distance, circleCollision)
8. Effect functions (createExplosion)
9. Spawn functions (spawnAsteroids)
10. Game state functions (addScore, destroyShip, respawnShip, nextLevel, gameOver)
11. Input handler function
12. Collision checker function
13. Game loop (with try-catch)
14. Draw function
15. Start/restart functions
16. Event listeners
17. Initial high score load
```

### Step 4: Game Loop Structure

```javascript
function gameLoop() {
    if (!game.isRunning) return;

    try {
        if (!game.isPaused) {
            handleInput();
            updateTimers();

            if (game.ship) game.ship.update();
            game.bullets = game.bullets.filter(b => b.update());
            game.asteroids.forEach(a => a.update());
            game.particles = game.particles.filter(p => p.update());

            checkCollisions();

            if (game.asteroids.length === 0) nextLevel();

            draw();
        }

        requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error('Game loop error:', e);
    }
}
```

### Step 5: Rendering Order

1. Clear canvas (black fill)
2. Particles (behind everything)
3. Asteroids
4. Bullets
5. Ship (with invulnerability flicker)

---

## Common Pitfalls

1. **Missing getCollisionRadius()**: All collidable entities MUST implement this method
2. **Modifying arrays while iterating**: Use reverse iteration or filter() for removal
3. **Angle units**: Use radians throughout, not degrees
4. **Ship null checks**: Ship can be null during respawn delay
5. **Screen wrap edge cases**: Test objects moving at high speeds
6. **Invulnerability timer**: Check before ship-asteroid collision only

---

## Extending the Game

### Suggested Enhancements

1. **UFOs**: Enemy ships that shoot at player
2. **Shields**: Temporary protection power-up
3. **Weapon upgrades**: Spread shot, rapid fire
4. **Sound effects**: Thrust, shoot, explosion, UFO warning
5. **Screen shake**: On explosions
6. **Touch controls**: Mobile support
7. **Multiplayer**: Two ships, cooperative or competitive
8. **Leaderboard**: Online high scores

### Extension Points

- Add new entity classes following existing pattern (update, draw, getCollisionRadius)
- Add to appropriate array in game state
- Include in game loop update/draw sections
- Add collision checks as needed
