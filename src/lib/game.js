
// KpopArcheryGame class adapted for React integration - User Provided Version

class KpopArcheryGame {
  constructor(canvasId, ui) {
    // ————— Canvas & Context —————
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`KpopArcheryGame: Canvas element with ID '${canvasId}' not found.`);
      this.isErrorState = true;
      return;
    }
    this.ctx    = this.canvas.getContext('2d');
    this.ui     = ui; // Expects an object with DOM elements

    // ————— Make canvas fullscreen —————
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width  = this.w;
    this.canvas.height = this.h;

    this.resizeHandler = () => {
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width  = this.w;
      this.canvas.height = this.h;

      // Recompute bow/target positions when resizing:
      this._positionBow();
      this._positionTarget();
      this._positionArrow();
    };
    window.addEventListener('resize', this.resizeHandler);

    // ————— Score & Arrow Count —————
    this.score      = 0;
    this.bestScore  = parseInt(localStorage.getItem('bestArcheryScore')) || 0;
    this.totalArrows = 10;
    this.isGameOver = false; // Initialize isGameOver

    // ————— Bow, Target, Arrow Initialization —————
    this._initBow();       // positions/scales the bow
    this._initTarget();    // positions/scales the target
    this._initArrow();     // positions/scales the arrow

    // ————— Background & Sprites —————
    this.assets = {
      background: '/assets/stadium-background.png', // Adjusted path
      bow:        '/assets/bow-sprite.png',        // Adjusted path
      arrow:      '/assets/arrow-sprite.png',      // Adjusted path
      target:     '/assets/target-sprite.png'      // Adjusted path
    };
    this.loadedAssets = {};

    // ————— Bind methods —————
    this.shoot      = this.shoot.bind(this);
    this.gameLoop   = this.gameLoop.bind(this);
    this.destroy = this.destroy.bind(this); // Ensure destroy is bound

    // ————— Load AdMob Rewarded Ad (optional) —————
    this.admobAppId      = 'ca-app-pub-6305491227155574~9346740465';
    this.rewardedAdUnitId = 'ca-app-pub-6305491227155574/7475030251';
    this.rewardedAd      = null;
    if (typeof window !== 'undefined' && window.admob) { // Check if admob is available
        this.loadRewardedAd();
    }
  }

  // ————— Initialize Bow properties —————
  _initBow() {
    this.bow = {
      x:  this.w * 0.10,
      y:  this.h * 0.50,
      width:  this.h * 0.15 * (120 / 180), 
      height: this.h * 0.15,
      dy:   2,  
      speedIncremented: false
    };
  }

  // ————— Initialize Target properties —————
  _initTarget() {
    this.target = {
      x:  this.w * 0.85,
      y:  this.h * 0.48,
      width:  this.h * 0.12 * (100 / 160), 
      height: this.h * 0.12,
      dy:   3,
      autoMove: true
    };
  }

  // ————— Initialize Arrow properties —————
  _initArrow() {
    this.arrow = {
      x: 0,
      y: 0,
      width:  this.h * 0.10 * (100 / 20),
      height: this.h * 0.10,
      isFlying: false,
      dx: 25
    };
    this._positionArrow();
  }

  _positionBow() {
    if (!this.bow) this._initBow();
    this.bow.x = this.w * 0.10;
    this.bow.y = this.h * 0.50;
    this.bow.height = this.h * 0.15;
    this.bow.width  = this.bow.height * (120 / 180);
  }

  _positionTarget() {
    if (!this.target) this._initTarget();
    this.target.x = this.w * 0.85;
    this.target.y = this.h * 0.48;
    this.target.height = this.h * 0.12;
    this.target.width  = this.target.height * (100 / 160);
  }

  _positionArrow() {
    if (!this.arrow) this._initArrow();
    this.arrow.x = this.bow.x + this.bow.width / 2;
    this.arrow.y = this.bow.y;
    this.arrow.height = this.h * 0.10;
    this.arrow.width  = this.arrow.height * (100 / 20);
  }

  loadRewardedAd() {
    if (!window.admob || !admob.RewardedAd) return;
    this.rewardedAd = new admob.RewardedAd({
      adUnitId: this.rewardedAdUnitId
    });

    this.rewardedAd.on('adloaded', () => console.log('Rewarded ad loaded'));
    this.rewardedAd.on('aderror', (err) => {
      console.error('Rewarded ad failed:', err);
      this.rewardedAd = null;
    });
    this.rewardedAd.on('adopened', () => console.log('Rewarded ad opened'));
    this.rewardedAd.on('adclosed', () => {
      console.log('Rewarded ad closed');
      this.loadRewardedAd();
    });
    this.rewardedAd.on('adrewarded', (item) => {
      console.log('Reward granted:', item);
      this.totalArrows += 5;
      this.updateUI();
    });
    this.rewardedAd.load(); // Changed from loadAd() to load() if that's the correct API
  }

  showRewardedAd() {
    if (this.rewardedAd && this.rewardedAd.show) { // Check if show method exists
        this.rewardedAd.show();
    } else if (typeof window !== 'undefined' && window.admob) {
        this.loadRewardedAd(); // Attempt to reload if not available
    }
  }

  loadAssets(callback) {
    if (this.isErrorState) {
        if (callback) callback(new Error("Game is in error state, cannot load assets."));
        return;
    }
    let loadedCount = 0;
    const total = Object.keys(this.assets).length;
    if (total === 0) {
        if (callback) callback();
        return;
    }

    for (let key in this.assets) {
      const img = new Image();
      img.src = this.assets[key];
      img.onload = () => {
        this.loadedAssets[key] = img;
        if (++loadedCount === total && callback) callback();
      };
      img.onerror = () => {
        console.error(`Failed to load: ${this.assets[key]}`);
        this.loadedAssets[key] = null; // Mark as failed but continue
        if (++loadedCount === total && callback) callback();
      };
    }
  }

  initListeners() {
    if (this.isErrorState) return;
    this.boundShoot = this.shoot.bind(this); // Ensure shoot is correctly bound
    this.boundKeyDown = (e) => {
      if (e.code === 'Space' && !this.isGameOver) {
        e.preventDefault(); // Prevent page scroll
        this.shoot();
      }
    };

    this.canvas.addEventListener('click', this.boundShoot);
    document.body.addEventListener('keydown', this.boundKeyDown);
  }

  removeListeners() {
    if (this.canvas && this.boundShoot) {
        this.canvas.removeEventListener('click', this.boundShoot);
    }
    if (this.boundKeyDown) {
        document.body.removeEventListener('keydown', this.boundKeyDown);
    }
    if (this.resizeHandler) {
        window.removeEventListener('resize', this.resizeHandler);
    }
  }
  
  start() { // Added a start method
    if (this.isErrorState) return;
    this.isGameOver = false;
    this.score = 0;
    this.totalArrows = 10;
    this.bestScore  = parseInt(localStorage.getItem('bestArcheryScore')) || 0;
    this._initBow();
    this._initTarget();
    this._initArrow();
    this.updateUI(); // Initial UI update

    this.loadAssets(() => {
      if (this.isErrorState) return; // Check again after async operation
      this.initListeners();
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.gameLoop();
    });
  }


  gameLoop() {
    if (this.isGameOver || this.isErrorState) {
      if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      return;
    }
    
    this.ctx.clearRect(0, 0, this.w, this.h); // Clear canvas first

    if (this.loadedAssets.background) {
      this.ctx.drawImage(
        this.loadedAssets.background,
        0, 0,
        this.loadedAssets.background.width,
        this.loadedAssets.background.height,
        0, 0,
        this.w, this.h
      );
    }

    this.updateBowPosition();
    this.updateTargetPosition();
    this.updateArrowPosition();

    this.drawBow();
    this.drawTarget();
    this.drawArrow();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  updateBowPosition() {
    this.bow.y += this.bow.dy;
    const minY = this.h * 0.25 + this.bow.height / 2;
    const maxY = this.h * 0.75 - this.bow.height / 2;
    if (this.bow.y > maxY || this.bow.y < minY) {
      this.bow.dy *= -1;
    }
    if (!this.arrow.isFlying) {
      this.arrow.y = this.bow.y;
    }
  }

  drawBow() {
    if (!this.loadedAssets.bow || this.isErrorState) return;
    this.ctx.drawImage(
      this.loadedAssets.bow,
      this.bow.x,
      this.bow.y - this.bow.height / 2,
      this.bow.width,
      this.bow.height
    );
  }

  updateTargetPosition() {
    if (!this.target.autoMove) return;
    this.target.y += this.target.dy;
    const minY = this.h * 0.15 + this.target.height / 2;
    const maxY = this.h * 0.85 - this.target.height / 2;
    if (this.target.y > maxY || this.target.y < minY) {
      this.target.dy *= -1;
    }
  }

  drawTarget() {
    if (!this.loadedAssets.target || this.isErrorState) return;
    this.ctx.drawImage(
      this.loadedAssets.target,
      this.target.x - this.target.width / 2,
      this.target.y - this.target.height / 2,
      this.target.width,
      this.target.height
    );
  }

  updateArrowPosition() {
    if (this.arrow.isFlying) {
      this.arrow.x += this.arrow.dx;

      if (this.arrow.x > this.target.x - this.target.width / 2 && 
          this.arrow.x < this.target.x + this.target.width / 2) { // Check if arrow is within target's X bounds
        if (
          this.arrow.y > this.target.y - this.target.height / 2 &&
          this.arrow.y < this.target.y + this.target.height / 2
        ) {
          this.handleHit();
        }
      }

      if (this.arrow.x > this.w) {
        this.resetArrow();
        if (this.totalArrows <= 0 && !this.isGameOver) { // Check !this.isGameOver before calling gameOver
          this.performGameOver();
        }
      }
    } else {
      this.arrow.y = this.bow.y;
    }
  }

  drawArrow() {
    if (!this.loadedAssets.arrow || !this.arrow.isFlying || this.isErrorState) return; // Only draw if flying
    this.ctx.drawImage(
      this.loadedAssets.arrow,
      this.arrow.x, // Arrow's x is its tip
      this.arrow.y - this.arrow.height / 2,
      this.arrow.width,
      this.arrow.height
    );
  }

  shoot() {
    if (this.isErrorState) return;
    if (!this.arrow.isFlying && this.totalArrows > 0) {
      this.arrow.isFlying = true;
      this.totalArrows--;
      this.updateUI();
    } else if (this.totalArrows <= 0 && !this.isGameOver) {
      if (typeof window !== 'undefined' && window.admob) {
          this.showRewardedAd();
      } else {
         this.performGameOver(); // If no ads, just end game
      }
    }
  }

  handleHit() {
    const offset = Math.abs(this.arrow.y - this.target.y);
    const points = Math.max(
      0,
      10 - Math.floor(offset / (this.target.height / 20))
    );
    this.score += points;

    if (points >= 9) {
      this.totalArrows += 2;
    }

    this.updateUI();
    this.resetArrow();
    this.increaseDifficulty();
  }

  increaseDifficulty() {
    if (this.score > 20 && !this.bow.speedIncremented) {
      this.bow.dy *= 1.5; // This could make dy very large quickly, consider additive or smaller multiplier
      this.bow.speedIncremented = true;
    }
  }

  resetArrow() {
    this.arrow.isFlying = false;
    // Position arrow relative to bow after bow's potential resize
    this.arrow.x = this.bow.x + this.bow.width / 2; 
    this.arrow.y = this.bow.y;
  }

  updateUI() {
    if (this.isErrorState || !this.ui) return;
    if (this.ui.scoreDisplay) this.ui.scoreDisplay.textContent = `SCORE: ${this.score}`;
    if (this.ui.arrowsDisplay) this.ui.arrowsDisplay.textContent = `ARROWS: ${this.totalArrows}`;
    if (this.ui.bestScoreDisplay) this.ui.bestScoreDisplay.textContent = `BEST: ${this.bestScore}`;
  }

  performGameOver() { // Renamed from gameOver to avoid conflict with React component's potential naming
    if (this.isGameOver) return; // Prevent multiple calls
    this.isGameOver = true;
    if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);


    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bestArcheryScore', this.bestScore.toString());
    }

    // Persist player & group leaderboard (if inputs are available)
    if(this.ui.usernameInput && this.ui.groupSelect && this.ui.newGroupInput){
        this.updatePlayerLeaderboard();
        this.updateGroupLeaderboard();
    }


    const startMenu = document.getElementById('startMenu');
    if (startMenu) {
        const titleElement = startMenu.querySelector('#title');
        if (titleElement) titleElement.innerHTML = `Your Score<br>${this.score}`;
        startMenu.style.display = 'flex';
    }
    
    this.buildLeaderboardsUI();
    this.updateUI(); // Final UI update for best score

    // Notify React component that game is over
    if (this.ui && this.ui.onGameOverCallback) {
        this.ui.onGameOverCallback(this.score, this.score > parseInt(localStorage.getItem('bestArcheryScorePriorToThisGame') || '0'));
    }
  }
  
  updatePlayerLeaderboard() {
    const username = this.ui.usernameInput.value.trim();
    if (!username) return;

    let data = {};
    try {
      data = JSON.parse(localStorage.getItem('playerLeaderboard') || '{}');
    } catch (e) { data = {}; }

    const prev = data[username] || 0;
    if (this.score > prev) {
      data[username] = this.score;
      localStorage.setItem('playerLeaderboard', JSON.stringify(data));
    }
  }

  updateGroupLeaderboard() {
    const sel  = this.ui.groupSelect.value;
    const neu  = this.ui.newGroupInput.value.trim();
    const grp  = neu || sel; // Prioritize new group input
    if (!grp) return;

    let data = {};
    try {
      data = JSON.parse(localStorage.getItem('groupLeaderboard') || '{}');
    } catch (e) { data = {}; }

    const prev = data[grp] || 0;
    if (this.score > prev) {
      data[grp] = this.score;
      localStorage.setItem('groupLeaderboard', JSON.stringify(data));
    }
  }

  buildLeaderboardsUI() {
    const playerLeaderboardList = document.getElementById('playerLeaderboardList');
    const groupLeaderboardList = document.getElementById('groupLeaderboardList');

    if (!playerLeaderboardList || !groupLeaderboardList) return;

    // Player leaderboard
    let pData = {};
    try {
      pData = JSON.parse(localStorage.getItem('playerLeaderboard') || '{}');
    } catch { pData = {}; }
    const players = Object.entries(pData).sort((a, b) => b[1] - a[1]).slice(0, 5);
    playerLeaderboardList.innerHTML = '';
    if (players.length === 0) {
      playerLeaderboardList.innerHTML = `<li style="font-size:16px; color:#666;">No players yet</li>`;
    } else {
      players.forEach(([user, sc], idx) => {
        let medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="medal" style="margin-right: 8px;">${medal}</span>
          <span class="name" style="flex-grow: 1; margin-right: 8px;">${user}</span>
          <span class="score">${sc}</span>
        `;
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.marginBottom = '4px';
        playerLeaderboardList.appendChild(li);
      });
    }

    // Group leaderboard (with fanbase names)
    const fanbaseMap = { /* ... same map ... */ }; // Assuming fanbaseMap is available or passed if needed
    let gData = {};
    try {
      gData = JSON.parse(localStorage.getItem('groupLeaderboard') || '{}');
    } catch { gData = {}; }
    const groups = Object.entries(gData).sort((a, b) => b[1] - a[1]).slice(0, 5);
    groupLeaderboardList.innerHTML = '';
    if (groups.length === 0) {
      groupLeaderboardList.innerHTML = `<li style="font-size:16px; color:#666;">No groups yet</li>`;
    } else {
      groups.forEach(([grp, sc], idx) => {
        const fb = this.ui.fanbaseMap?.[grp] || ''; // Use fanbaseMap from ui if provided
        let medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        const displayName = fb ? `${grp} – ${fb}` : grp;
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="medal" style="margin-right: 8px;">${medal}</span>
          <span class.name" style="flex-grow: 1; margin-right: 8px;">${displayName}</span>
          <span class="score">${sc}</span>
        `;
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.marginBottom = '4px';
        groupLeaderboardList.appendChild(li);
      });
    }
  }
  
  destroy() {
    console.log("KpopArcheryGame: Destroy method called from new game.js.");
    this.isGameOver = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.removeListeners(); // Call the method to remove event listeners
    // Any other cleanup specific to this game version
  }
}
// Export the class if this file is treated as a module by Next.js
// export { KpopArcheryGame }; // This line would be added if it's a module
// For a simple script, it's globally available or needs to be handled by the bundler.
// Since it's in src/lib, Next.js likely treats it as a module.
export { KpopArcheryGame };
