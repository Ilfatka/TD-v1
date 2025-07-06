const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const BASE_WIDTH = 960;
const BASE_HEIGHT = 600;

function resizeGameCanvas() {
    let panelH = 90;   // высота верхней панели (примерно)
    let hudH = 72;     // высота нижнего HUD (примерно)
    let w = window.innerWidth;
    let h = window.innerHeight - panelH - hudH;
    let desiredRatio = BASE_WIDTH / BASE_HEIGHT;
    if (w / h > desiredRatio) w = h * desiredRatio;
    else h = w / desiredRatio;
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
}
window.addEventListener("resize", resizeGameCanvas);
resizeGameCanvas();

const path = [
    {x: 486, y:  0},   {x: 485, y:  40}, {x: 478, y:  70}, {x: 463, y: 100},
    {x: 446, y: 123},  {x: 425, y: 143}, {x: 415, y: 165}, {x: 419, y: 192},
    {x: 446, y: 210},  {x: 483, y: 230}, {x: 518, y: 255}, {x: 536, y: 285},
    {x: 527, y: 317},  {x: 497, y: 340}, {x: 468, y: 360}, {x: 449, y: 385},
    {x: 456, y: 410},  {x: 490, y: 430}, {x: 530, y: 460}, {x: 549, y: 489},
    {x: 540, y: 515},  {x: 510, y: 535}, {x: 482, y: 555}, {x: 467, y: 600}
];

const towerSpots = [
    {x: 410, y: 130}, {x: 580, y: 200}, {x: 355, y: 300}, {x: 530, y: 340}, {x: 440, y: 400}, {x: 600, y: 490},
    {x: 340, y: 200}, {x: 390, y: 520}
];

let wave, enemies, towers, bullets, gold, lives, isWaveActive, selectedTowerType, selectedTower, gameOver, pendingNextWave, started, win, gameSpeed;

function resetGameVars() {
    wave = 0;
    enemies = [];
    towers = [];
    bullets = [];
    gold = 200;
    lives = 10;
    isWaveActive = false;
    selectedTowerType = null;
    selectedTower = null;
    gameOver = false;
    pendingNextWave = false;
    started = false;
    win = false;
    gameSpeed = 2; // 2x стартовая скорость
}
resetGameVars();

const towerTypes = [
    { name: 'Арбалет', sprite: 'tower_archer.png', cost: 50, range: 130, damage: 18, fireRate: 20, effect: null },
    { name: 'Маг', sprite: 'tower_magic.png', cost: 70, range: 110, damage: 36, fireRate: 50, effect: null },
    { name: 'Замедление', sprite: 'tower_slow.png', cost: 60, range: 110, damage: 7, fireRate: 45, effect: 'slow' },
    { name: 'Огненная', sprite: 'tower_fire.png', cost: 80, range: 100, damage: 60, fireRate: 80, effect: null },
    { name: 'Поддержка', sprite: 'tower_support.png', cost: 40, range: 100, damage: 0, fireRate: 0, effect: 'buff' }
];

const enemyTypes = [
    {name: "Гоблин", sprite: "enemy_goblin.png", speed: 1.3, hp: 35},
    {name: "Голем", sprite: "enemy_golem.png", speed: 0.7, hp: 90},
    {name: "Демон", sprite: "enemy_demon.png", speed: 1.5, hp: 50},
    {name: "Некромант", sprite: "enemy_necromancer.png", speed: 1.0, hp: 60},
    {name: "Элементаль", sprite: "enemy_elemental.png", speed: 1.6, hp: 80},
    {name: "Щитоносец", sprite: "enemy_golem.png", speed: 1.1, hp: 140},
    {name: "Тролль", sprite: "enemy_troll.png", speed: 1.0, hp: 100},
    {name: "Вожак", sprite: "enemy_chief.png", speed: 1.4, hp: 150},
    {name: "Дракон", sprite: "enemy_dragon.png", speed: 1.2, hp: 600}
];

let loadedSprites = {};
function loadSprites(names, cb) {
    let left = names.length;
    for(let name of names){
        let img = new Image();
        img.src = "assets/" + name;
        img.onload = () => { loadedSprites[name] = img; if(--left === 0) cb(); };
        img.onerror = () => { loadedSprites[name] = img; if(--left === 0) cb(); };
    }
}
const allSprites = [
    "tower_archer.png", "tower_magic.png", "tower_slow.png", "tower_fire.png", "tower_support.png",
    "enemy_goblin.png", "enemy_golem.png", "enemy_demon.png", "enemy_necromancer.png",
    "enemy_elemental.png", "enemy_troll.png", "enemy_chief.png", "enemy_dragon.png",
    "map_bg.png"
];

function renderTowerPanel() {
    const panel = document.getElementById('towerPanel');
    panel.innerHTML = '';
    towerTypes.forEach((t, i) => {
        const btn = document.createElement('div');
        btn.className = 'tower-btn' + (i === selectedTowerType ? ' selected' : '');
        btn.innerHTML = `<img src="assets/${t.sprite}"><div class="name">${t.name}</div><div class="cost">💰${t.cost}</div>`;
        btn.onclick = () => {
            selectedTowerType = i;
            renderTowerPanel();
            selectedTower = null;
            hideHUD();
        };
        panel.appendChild(btn);
    });
}
loadSprites(allSprites, () => {
    renderTowerPanel();
    document.getElementById("speed1x").onclick = function() { gameSpeed = 1; updateSpeedButtons(); };
    document.getElementById("speed2x").onclick = function() { gameSpeed = 2; updateSpeedButtons(); };
    function updateSpeedButtons() {
        document.getElementById("speed1x").classList.toggle("active", gameSpeed === 1);
        document.getElementById("speed2x").classList.toggle("active", gameSpeed === 2);
    }
    updateSpeedButtons();
    document.getElementById("startWaveBtn").onclick = () => {
        document.getElementById("startWaveBtn").classList.add("hidden");
        started = true;
        startGame();
    };
    document.getElementById("startWaveBtn").classList.remove("hidden");
    hideHUD();
    document.getElementById("retryBtn").onclick = () => {
        document.getElementById("finalScreen").classList.add("hidden");
        resetGameVars();
        renderTowerPanel();
        document.getElementById("startWaveBtn").classList.remove("hidden");
        drawBackground();
    };
});

function startGame(){
    spawnWave(wave);
    isWaveActive = true;
    requestAnimationFrame(gameLoop);
}

function drawBackground() {
    let bg = loadedSprites["map_bg.png"];
    if(bg) ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    else { ctx.fillStyle = "#667f47"; ctx.fillRect(0,0,canvas.width,canvas.height); }
}

function drawEnemies() {
    let scaleX = canvas.width / BASE_WIDTH;
    let scaleY = canvas.height / BASE_HEIGHT;
    for(let enemy of enemies) {
        let img = loadedSprites[enemy.sprite];
        let ex = enemy.x * scaleX;
        let ey = enemy.y * scaleY;
        let sz = 36 * scaleX;
        if(img) ctx.drawImage(img, ex-sz/2, ey-sz/2, sz, sz);
        else { ctx.beginPath(); ctx.arc(ex, ey, 16*scaleX, 0, Math.PI*2); ctx.fillStyle = "red"; ctx.fill(); }
        ctx.fillStyle = "#f44";
        ctx.fillRect(ex-16*scaleX, ey-22*scaleY, 32*scaleX, 4*scaleY);
        ctx.fillStyle = "#4f4";
        ctx.fillRect(ex-16*scaleX, ey-22*scaleY, 32*scaleX * Math.max(enemy.hp,0)/enemy.maxHp, 4*scaleY);
        if (enemy.slowTicks && enemy.slowTicks > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(ex, ey, 22*scaleX, 0, Math.PI*2);
            ctx.strokeStyle = "rgba(70,190,255,0.7)";
            ctx.lineWidth = 3 * scaleX;
            ctx.stroke();
            ctx.restore();
        }
    }
}

function drawTowerSpots() {
    let scaleX = canvas.width / BASE_WIDTH;
    let scaleY = canvas.height / BASE_HEIGHT;
    towerSpots.forEach(spot => {
        const hasTower = towers.some(t => t.spot && t.spot.x === spot.x && t.spot.y === spot.y);
        let sx = spot.x * scaleX, sy = spot.y * scaleY;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, 24*scaleX, 0, 2*Math.PI);
        if (!hasTower) {
            ctx.fillStyle = selectedTowerType !== null ? "#8ddc92" : "#ddd";
            ctx.globalAlpha = 0.33;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 2.2 * scaleX;
            ctx.strokeStyle = selectedTowerType !== null ? "#5fad53" : "#bbb";
            ctx.stroke();
        }
        ctx.restore();
    });
}

function drawTowers() {
    let scaleX = canvas.width / BASE_WIDTH;
    let scaleY = canvas.height / BASE_HEIGHT;
    for (let t of towers) {
        const img = loadedSprites[t.sprite];
        let tx = t.x * scaleX;
        let ty = t.y * scaleY;
        let sz = 48 * scaleX;
        if (img) ctx.drawImage(img, tx-sz/2, ty-sz/2, sz, sz);
        else { ctx.beginPath(); ctx.arc(tx, ty, 24*scaleX, 0, Math.PI*2); ctx.fillStyle = "blue"; ctx.fill(); }
        ctx.fillStyle = "#222";
        ctx.font = `${16*scaleX}px Segoe UI`;
        ctx.fillText("L" + (t.level||1), tx-16*scaleX, ty+30*scaleY);
    }
    if (selectedTower) {
        let tx = selectedTower.x * scaleX;
        let ty = selectedTower.y * scaleY;
        ctx.save();
        ctx.beginPath();
        ctx.arc(tx, ty, selectedTower.range*scaleX, 0, 2*Math.PI);
        ctx.strokeStyle = "rgba(80,180,255,0.3)";
        ctx.lineWidth = 6*scaleX;
        ctx.stroke();
        ctx.restore();
    }
}

function drawBullets() {
    let scaleX = canvas.width / BASE_WIDTH;
    let scaleY = canvas.height / BASE_HEIGHT;
    for (let b of bullets) {
        let bx = b.x * scaleX;
        let by = b.y * scaleY;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, 10*scaleX, 0, 2*Math.PI);
        ctx.fillStyle = b.color || "#fff83a";
        ctx.globalAlpha = 0.98;
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 10*scaleX;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 3*scaleX;
        ctx.strokeStyle = "#f1c40f";
        ctx.stroke();
        ctx.restore();
    }
}

function slowEnemy(enemy) {
    if (!enemy.slowTicks || enemy.slowTicks < 20) {
        enemy.slowTicks = 60;
        enemy.slow = true;
    }
}

function updateBullets() {
    for (let b of bullets) {
        if (!b.target || !b.target.alive) { b.hit = true; continue; }
        let dx = b.target.x - b.x, dy = b.target.y - b.y;
        let dist = Math.sqrt(dx*dx+dy*dy);
        let speed = 15;
        if (dist < speed) {
            b.x = b.target.x; b.y = b.target.y; b.hit = true;
            if (b.towerEffect === "slow") {
                slowEnemy(b.target);
                b.target.hp -= b.damage;
            } else {
                b.target.hp -= b.damage;
            }
            if (b.target.hp <= 0 && b.target.alive) {
                b.target.alive = false;
                b.target.hp = 0;
                gold += 10;
            }
        } else {
            b.x += dx / dist * speed;
            b.y += dy / dist * speed;
        }
    }
    bullets = bullets.filter(b => !b.hit);
}

function spawnWave(waveNum) {
    enemies = [];
    let enemyIdx = Math.min(waveNum, enemyTypes.length-1);
    let eType = enemyTypes[enemyIdx];
    let hp = eType.hp + waveNum * 12;
    let speed = eType.speed + waveNum * 0.06;
    let count = (waveNum === 9) ? 2 : (waveNum === 8) ? 8 : (10 + waveNum * 2);

    for (let i = 0; i < count; i++) {
        enemies.push({
            name: eType.name,
            sprite: eType.sprite,
            pathIndex: 0,
            progress: -i*40,
            speed: speed,
            hp: hp,
            maxHp: hp,
            alive: true,
            reachedEnd: false,
            slow: false,
            slowTicks: 0
        });
    }
    isWaveActive = true;
    pendingNextWave = false;
}

function updateEnemies() {
    for(let enemy of enemies){
        if(!enemy.alive || enemy.reachedEnd) continue;
        if (enemy.slow && enemy.slowTicks > 0) {
            enemy.slowTicks--;
            if (enemy.slowTicks <= 0) {
                enemy.slow = false;
            }
        }
        let from = path[enemy.pathIndex];
        let to = path[enemy.pathIndex+1];
        if(!to) { 
            enemy.alive = false;
            enemy.reachedEnd = true;
            if (lives > 0) lives--;
            continue; 
        }
        let effSpeed = enemy.slow ? enemy.speed * 0.5 : enemy.speed;
        let dx = to.x-from.x, dy = to.y-from.y;
        let dist = Math.sqrt(dx*dx+dy*dy);
        let t = Math.min(1, (enemy.progress+effSpeed)/dist);
        enemy.x = from.x + dx*t;
        enemy.y = from.y + dy*t;
        enemy.progress += effSpeed;
        if(t>=1) { enemy.pathIndex++; enemy.progress=0; }
        if(enemy.pathIndex >= path.length-1) { 
            enemy.alive = false; 
            enemy.reachedEnd = true;
            if (lives > 0) lives--;
        }
    }
    enemies = enemies.filter(e => e.alive && !e.reachedEnd);
    if(isWaveActive && enemies.length === 0) isWaveActive = false;
}

function updateTowers() {
    for (let tower of towers) {
        tower.fireCooldown = (tower.fireCooldown || 0) - 1;
        if (tower.fireCooldown <= 0) {
            let target = null, minDist = 9999;
            for (let enemy of enemies) {
                if (!enemy.alive) continue;
                const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
                if (dist < tower.range && dist < minDist) { target = enemy; minDist = dist; }
            }
            if (target) {
                let bullet = {
                    x: tower.x, y: tower.y,
                    target: target,
                    damage: tower.damage,
                };
                if (tower.effect === "slow") bullet.towerEffect = "slow";
                bullets.push(bullet);
                tower.fireCooldown = tower.fireRate;
            }
        }
    }
}

function drawUI() {
    let scaleX = canvas.width / BASE_WIDTH;
    let scaleY = canvas.height / BASE_HEIGHT;
    ctx.save();
    ctx.fillStyle = "rgba(28,28,32,0.85)";
    ctx.fillRect(10*scaleX, 10*scaleY, 270*scaleX, 135*scaleY);
    ctx.fillStyle = "#fff";
    ctx.font = `${20*scaleX}px Segoe UI`;
    ctx.fillText("Золото: "+gold, 24*scaleX, 42*scaleY);
    ctx.fillText("Волна: "+(wave+1)+"/10", 24*scaleX, 72*scaleY);
    ctx.fillText("Жизни: "+lives, 24*scaleX, 102*scaleY);
    ctx.font = `${15*scaleX}px Segoe UI`;
    ctx.fillStyle = "#ddd";
    ctx.fillText("Выберите точку для башни!", 24*scaleX, 125*scaleY);
    ctx.restore();

    let fs = document.getElementById("finalScreen");
    if ((gameOver || win) && fs) {
        fs.classList.remove("hidden");
        document.getElementById("retryBtn").disabled = false;
        if (win) {
            document.getElementById("finalText").innerHTML = "ПОЗДРАВЛЯЕМ!<br>Вы прошли все 10 волн!";
        } else {
            document.getElementById("finalText").innerHTML = "Вы проиграли";
        }
    }
    if (!gameOver && !win && fs) fs.classList.add("hidden");
}

function gameLoop() {
    if (!started) return;
    drawBackground();
    drawTowerSpots();
    drawTowers();
    drawBullets();
    drawEnemies();
    drawUI();
    if (!gameOver && !win) {
        for (let i = 0; i < gameSpeed; i++) {
            updateTowers();
            updateBullets();
            updateEnemies();
        }
    }
    if (!isWaveActive && enemies.length === 0 && wave < 10 && !gameOver && !pendingNextWave) {
        pendingNextWave = true;
        setTimeout(()=>{
            wave++;
            if (wave < 10) {
                spawnWave(wave);
                isWaveActive = true;
            }
            if (wave === 10) {
                win = true;
                hideHUD();
            }
        }, 1100 / gameSpeed);
    }
    if (lives <= 0 && !gameOver) {
        gameOver = true;
        hideHUD();
    }
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', function(e) {
    if (gameOver || win) return;
    if (!started) return;
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / BASE_WIDTH;
    let scaleY = canvas.height / BASE_HEIGHT;
    let x = (e.clientX - rect.left) / scaleX;
    let y = (e.clientY - rect.top) / scaleY;

    for (let t of towers) {
        if (Math.hypot(t.x - x, t.y - y) < 24) {
            selectedTower = t;
            showHUD(t);
            return;
        }
    }

    if (selectedTowerType !== null) {
        for (let spot of towerSpots) {
            const hasTower = towers.some(t => t.spot && t.spot.x === spot.x && t.spot.y === spot.y);
            if (!hasTower && Math.hypot(spot.x - x, spot.y - y) < 28) {
                const tType = towerTypes[selectedTowerType];
                if (gold < tType.cost) return;
                towers.push({ ...tType, x: spot.x, y: spot.y, fireCooldown: 0, level: 1, spot });
                gold -= tType.cost;
                selectedTowerType = null;
                renderTowerPanel();
                hideHUD();
                return;
            }
        }
    }
    selectedTower = null;
    hideHUD();
    selectedTowerType = null;
    renderTowerPanel();
});

function showHUD(tower) {
    const hud = document.getElementById("bottomHUD");
    hud.classList.remove("hidden");
    document.getElementById("hudTowerName").innerText = tower.name + " (Ур. " + tower.level + ")";
    document.getElementById("hudTowerDesc").innerText = " | Урон: " + tower.damage + " | Дальность: " + tower.range;
    let upgBtn = document.getElementById("hudUpgradeBtn");
    if (tower.level < 3) {
        upgBtn.innerText = "Апгрейд (" + (tower.level * 70) + " золота)";
        upgBtn.disabled = gold < tower.level * 70;
        upgBtn.onclick = () => {
            if (tower.level < 3 && gold >= tower.level * 70) {
                gold -= tower.level * 70;
                tower.level++;
                tower.damage = Math.round(tower.damage * 1.55);
                tower.range = Math.round(tower.range * 1.17);
                showHUD(tower);
            }
        };
    } else {
        upgBtn.innerText = "Макс. уровень";
        upgBtn.disabled = true;
        upgBtn.onclick = null;
    }
    let sellBtn = document.getElementById("hudSellBtn");
    sellBtn.onclick = () => {
        let refund = Math.round((tower.cost + (tower.level-1)*70) * 0.6);
        gold += refund;
        towers = towers.filter(t => t !== tower);
        hud.classList.add("hidden");
        selectedTower = null;
    };
}
function hideHUD() {
    const hud = document.getElementById("bottomHUD");
    hud.classList.add("hidden");
}
