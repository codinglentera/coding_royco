const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreVal = document.getElementById('score-val');
const healthVal = document.getElementById('health-val');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const overTitle = document.getElementById('over-title');

// Game State Variables
let player;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let keys = {};
let mouse = { x: 0, y: 0 };
let score = 0;
let isGameOver = true;
let spawnInterval;
let enemySpeedMultiplier = 1;

// --- CLASSES ---

// Player Entity
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 5;
        this.health = 100;
        this.color = '#00ffc8';
        this.angle = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Menggambar badan pesawat tempur cyberpunk
        ctx.beginPath();
        ctx.moveTo(25, 0);
        ctx.lineTo(-15, -18);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-15, 18);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();

        // Inti Energi Tengah
        ctx.beginPath();
        ctx.arc(-2, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
    }

    update() {
        // Pergerakan Player Berdasarkan Input Keyboard
        if (keys['w'] || keys['arrowup']) this.y -= this.speed;
        if (keys['s'] || keys['arrowdown']) this.y += this.speed;
        if (keys['a'] || keys['arrowleft']) this.x -= this.speed;
        if (keys['d'] || keys['arrowright']) this.x += this.speed;

        // Batasan Layar (Boundary)
        if (this.x < this.radius) this.x = this.radius;
        if (this.x > canvas.width - this.radius) this.x = canvas.width - this.radius;
        if (this.y < this.radius) this.y = this.radius;
        if (this.y > canvas.height - this.radius) this.y = canvas.height - this.radius;

        // Menghitung sudut rotasi menghadap ke kursor mouse
        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    }
}

// Bullet Entity
class Bullet {
    constructor(x, y, angle, speed, color, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.radius = 4;
        this.color = color;
        this.isEnemy = isEnemy;
        this.markedForDeletion = false;
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Hapus jika keluar layar
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }
}

// Enemy Entity
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'scout', 'fighter'
        this.markedForDeletion = false;
        this.lastShot = Date.now();

        // Konfigurasi berdasarkan tipe musuh
        if (type === 'scout') {
            this.radius = 15;
            this.speed = (Math.random() * 1.5 + 2) * enemySpeedMultiplier;
            this.health = 1;
            this.color = '#ff3333';
            this.shootCooldown = 2000;
        } else if (type === 'fighter') {
            this.radius = 22;
            this.speed = (Math.random() * 1 + 1) * enemySpeedMultiplier;
            this.health = 3;
            this.color = '#ff9900';
            this.shootCooldown = 1500;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        ctx.rotate(angle);

        ctx.beginPath();
        if (this.type === 'scout') {
            ctx.moveTo(18, 0);
            ctx.lineTo(-12, -12);
            ctx.lineTo(-12, 12);
        } else {
            ctx.moveTo(22, 0);
            ctx.lineTo(0, -18);
            ctx.lineTo(-16, -12);
            ctx.lineTo(-16, 12);
            ctx.lineTo(0, 18);
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        let now = Date.now();
        if (now - this.lastShot > this.shootCooldown) {
            this.shoot(angle);
            this.lastShot = now;
        }
    }

    shoot(angle) {
        if (this.type === 'fighter') {
            enemyBullets.push(new Bullet(this.x, this.y, angle, 5, '#ff9900', true));
        }
    }
}

// Particle System untuk Efek Ledakan
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 3 + 1;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }
}

// --- CORE GAME LOGIC ---

function spawnEnemy() {
    if (isGameOver) return;

    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -30 : canvas.width + 30;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -30 : canvas.height + 30;
    }

    let type = 'scout';
    if (score > 100 && Math.random() > 0.4) {
        type = 'fighter';
    }

    enemies.push(new Enemy(x, y, type));

    enemySpeedMultiplier = 1 + (score / 500);
    let nextSpawn = Math.max(400, 1500 - (score * 2));
    
    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnEnemy, nextSpawn);
}

function createExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function checkCollision(obj1, obj2) {
    let dist = Math.hypot(obj1.x - obj2.x, obj1.y - obj2.y);
    return dist < obj1.radius + obj2.radius;
}

function initGame() {
    player = new Player(canvas.width / 2, canvas.height / 2);
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    score = 0;
    enemySpeedMultiplier = 1;
    isGameOver = false;

    scoreVal.innerText = score;
    healthVal.innerText = player.health;
    
    gameOverScreen.classList.add('hidden');
    
    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnEnemy, 1500);
}

function endGame(victory = false) {
    isGameOver = true;
    clearInterval(spawnInterval);
    finalScore.innerText = score;
    if (victory) {
        overTitle.innerText = "VICTORY!";
        overTitle.style.color = "#00ffc8";
    } else {
        overTitle.innerText = "GAME OVER";
        overTitle.style.color = "#ff3333";
    }
    gameOverScreen.classList.remove('hidden');
}

// --- MAIN GAME LOOP ---
function animate() {
    ctx.fillStyle = 'rgba(5, 5, 10, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isGameOver) {
        player.update();
        player.draw();

        bullets.forEach((bullet, bIndex) => {
            bullet.update();
            bullet.draw();

            enemies.forEach((enemy, eIndex) => {
                if (checkCollision(bullet, enemy)) {
                    bullet.markedForDeletion = true;
                    enemy.health--;
                    createExplosion(bullet.x, bullet.y, '#ffffff', 5);

                    if (enemy.health <= 0) {
                        createExplosion(enemy.x, enemy.y, enemy.color, 20);
                        enemies.splice(eIndex, 1);
                        score += enemy.type === 'fighter' ? 25 : 10;
                        scoreVal.innerText = score;
                    }
                }
            });
        });

        enemyBullets.forEach((eBullet, ebIndex) => {
            eBullet.update();
            eBullet.draw();

            if (checkCollision(eBullet, player)) {
                eBullet.markedForDeletion = true;
                player.health -= 10;
                healthVal.innerText = Math.max(0, player.health);
                createExplosion(player.x, player.y, '#ff3333', 15);

                if (player.health <= 0) {
                    createExplosion(player.x, player.y, '#00ffc8', 40);
                    endGame(false);
                }
            }
        });

        enemies.forEach((enemy, eIndex) => {
            enemy.update();
            enemy.draw();

            if (checkCollision(enemy, player)) {
                enemies.splice(eIndex, 1);
                player.health -= 20;
                healthVal.innerText = Math.max(0, player.health);
                createExplosion(enemy.x, enemy.y, enemy.color, 25);

                if (player.health <= 0) {
                    createExplosion(player.x, player.y, '#00ffc8', 40);
                    endGame(false);
                }
            }
        });

        bullets = bullets.filter(b => !b.markedForDeletion);
        enemyBullets = enemyBullets.filter(eb => !eb.markedForDeletion);
    }

    particles.forEach((particle, pIndex) => {
        if (particle.alpha <= 0) {
            particles.splice(pIndex, 1);
        } else {
            particle.update();
            particle.draw();
        }
    });

    requestAnimationFrame(animate);
}

// --- EVENT LISTENERS ---
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
    if (isGameOver || e.button !== 0) return;
    
    const originX = player.x + Math.cos(player.angle) * 20;
    const originY = player.y + Math.sin(player.angle) * 20;
    
    bullets.push(new Bullet(originX, originY, player.angle, 8, '#00ffc8'));
});

restartBtn.addEventListener('click', initGame);

gameOverScreen.classList.remove('hidden');
animate();
