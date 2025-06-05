
// KpopArcheryGame class adapted for React integration

export class KpopArcheryGame {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.options = options; // { onScoreUpdate, onArrowsUpdate, onGameOver, getUsername, getGroup }

    // AdMob Settings (requires AdMob SDK to be available)
    this.admobAppId = 'ca-app-pub-6305491227155574~9346740465';
    this.rewardedAdUnitId = 'ca-app-pub-6305491227155574/7475030251';
    this.rewardedAd = null;

    if (typeof admob !== 'undefined') {
      admob.setAppMuted(false);
      admob.setAppVolume(1);
    } else {
      console.warn("AdMob SDK not detected. Ads will not function.");
    }

    // Canvas Dimensions
    this.w = 0;
    this.h = 0;
    this.resizeObserver = null;


    // Asset Paths
    this.assets = {
      bow: '/assets/bow-sprite.png',
      arrow: '/assets/arrow-sprite.png',
      target: '/assets/target-sprite.png',
      background: '/assets/stadium-background.png'
    };
    this.loadedAssets = {};

    this.arrowImpactSound = new Audio('/assets/arrow-impact.mp3');
    this.arrowReleaseSound = new Audio('/assets/arrow-release.mp3');
    this.arrowImpactSound.volume = 0.5;
    this.arrowReleaseSound.volume = 0.5;


    // Score, Best Score & Arrows
    this.score = 0;
    this.bestScore = 0; // Will be loaded from localStorage
    this.totalArrows = 10;

    // Bow Settings
    this.bow = {
      x: 50,
      y: 0, // Will be set in resize
      width: 120,
      height: 180,
      dy: 3,
      speedIncremented: false
    };

    // Target Settings
    this.target = {
      x: 0, // Will be set in resize
      y: 0, // Will be set in resize
      width: 100,
      height: 160,
      dy: 4,
      autoMove: true
    };

    // Arrow Settings
    this.arrow = {
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      isFlying: false,
      dx: 25
    };

    this.isGameOver = false;
    this.animationFrameId = null;

    this.shoot = this.shoot.bind(this);
    this.gameLoop = this.gameLoop.bind(this);
    this.handleCanvasResize = this.handleCanvasResize.bind(this);
  }

  initializeCanvasDimensions() {
    this.w = this.canvas.width;
    this.h = this.canvas.height;
    this.bow.y = this.h / 2;
    this.target.x = this.w - 120;
    this.target.y = this.h / 2;
    this.resetArrow();
  }
  
  handleCanvasResize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.initializeCanvasDimensions();
  }


  loadRewardedAd() {
    if (typeof admob === 'undefined' || !admob.RewardedAd) {
      console.warn("AdMob SDK not loaded or RewardedAd not available. Cannot load ad.");
      return;
    }
    if (this.rewardedAd && this.rewardedAd.isLoading()) {
        console.log("Rewarded ad is already loading.");
        return;
    }

    this.rewardedAd = new admob.RewardedAd({ adUnitId: this.rewardedAdUnitId });

    this.rewardedAd.on('adloaded', () => {
      console.log('Rewarded ad loaded successfully');
    });
    this.rewardedAd.on('aderror', (error) => {
      console.error('Rewarded ad failed to load:', error);
      this.rewardedAd = null; 
    });
    this.rewardedAd.on('adclosed', () => {
      this.loadRewardedAd(); // Preload next ad
    });
    this.rewardedAd.on('adrewarded', () => {
      this.totalArrows += 5;
      this.updateUIViaCallbacks();
    });
    this.rewardedAd.loadAd();
  }

  showRewardedAd() {
    if (this.rewardedAd && this.rewardedAd.isLoaded()) {
      this.rewardedAd.show();
    } else {
      console.log('Rewarded ad is not loaded yet. Attempting to load.');
      this.loadRewardedAd(); 
    }
  }

  loadAssets(callback) {
    let assetsLoaded = 0;
    const assetKeys = Object.keys(this.assets);
    const assetCount = assetKeys.length;

    if (assetCount === 0) {
        callback();
        return;
    }

    assetKeys.forEach(key => {
      const img = new Image();
      img.src = this.assets[key];
      img.onload = () => {
        this.loadedAssets[key] = img;
        assetsLoaded++;
        if (assetsLoaded === assetCount) callback();
      };
      img.onerror = () => {
        console.error(`Failed to load asset: ${this.assets[key]}`);
        this.loadedAssets[key] = null; // Mark as failed
        assetsLoaded++;
        if (assetsLoaded === assetCount) callback(); // Still call callback
      };
    });
  }

  initListeners() {
    this.canvas.addEventListener('click', this.shoot);
    this.canvas.addEventListener('touchstart', this.shoot, { passive: false }); 
    
    // Keydown listener on document.body
    this.keydownHandler = (e) => {
      if (e.code === 'Space' && !this.isGameOver) {
        e.preventDefault(); // Prevent page scroll
        this.shoot();
      }
    };
    document.body.addEventListener('keydown', this.keydownHandler);
  }

  removeListeners() {
    this.canvas.removeEventListener('click', this.shoot);
    this.canvas.removeEventListener('touchstart', this.shoot);
    document.body.removeEventListener('keydown', this.keydownHandler);
    if (this.resizeObserver) {
        this.resizeObserver.disconnect();
    }
  }
  
  gameLoop() {
    if (this.isGameOver || !this.canvas) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      return;
    }

    this.ctx.clearRect(0, 0, this.w, this.h);

    if (this.loadedAssets.background) {
      this.ctx.drawImage(this.loadedAssets.background, 0, 0, this.w, this.h);
    } else {
      // Fallback background color if image fails to load
      this.ctx.fillStyle = '#87CEEB'; // Light Sky Blue
      this.ctx.fillRect(0, 0, this.w, this.h);
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
    if (this.bow.y + this.bow.height / 2 > this.h || this.bow.y - this.bow.height / 2 < 0) {
      this.bow.dy *= -1;
    }
  }

  updateTargetPosition() {
    if (this.target.autoMove) {
      this.target.y += this.target.dy;
      if (this.target.y + this.target.height / 2 > this.h || this.target.y - this.target.height / 2 < 0) {
        this.target.dy *= -1;
      }
    }
  }

  updateArrowPosition() {
    if (this.arrow.isFlying) {
      this.arrow.x += this.arrow.dx;
      if (this.arrow.x + this.arrow.width / 2 > this.target.x - this.target.width / 2 && 
          this.arrow.x - this.arrow.width / 2 < this.target.x + this.target.width / 2) {
        if (this.arrow.y > this.target.y - this.target.height / 2 && this.arrow.y < this.target.y + this.target.height / 2) {
          this.handleHit();
        }
      }
      if (this.arrow.x > this.w) {
        this.resetArrow();
        if (this.totalArrows <= 0) {
          this.triggerGameOver();
        }
      }
    } else {
      this.arrow.y = this.bow.y;
    }
  }

  drawBow() {
    if (this.loadedAssets.bow) {
      this.ctx.drawImage(this.loadedAssets.bow, this.bow.x, this.bow.y - this.bow.height / 2, this.bow.width, this.bow.height);
    }
  }

  drawTarget() {
    if (this.loadedAssets.target) {
      this.ctx.drawImage(this.loadedAssets.target, this.target.x - this.target.width / 2, this.target.y - this.target.height / 2, this.target.width, this.target.height);
    }
  }

  drawArrow() {
    if (this.arrow.isFlying && this.loadedAssets.arrow) {
      this.ctx.drawImage(this.loadedAssets.arrow, this.arrow.x, this.arrow.y - this.arrow.height / 2, this.arrow.width, this.arrow.height);
    }
  }

  shoot(event) {
    if(event && event.type === 'touchstart') {
        event.preventDefault(); // Essential for preventing click simulation and other default behaviors
    }
    if (!this.arrow.isFlying && this.totalArrows > 0 && !this.isGameOver) {
      this.arrowReleaseSound.play().catch(e => console.error('Error playing release sound:', e));
      this.arrow.isFlying = true;
      this.totalArrows--;
      this.updateUIViaCallbacks();
    } else if (this.totalArrows <= 0 && !this.isGameOver) {
      this.showRewardedAd();
    }
  }

  handleHit() {
    this.arrowImpactSound.play().catch(e => console.error('Error playing impact sound:', e));
    const hitOffset = Math.abs(this.arrow.y - this.target.y);
    const points = Math.max(0, 10 - Math.floor(hitOffset / (this.target.height / 20)));
    this.score += points;

    if (points >= 9) {
      this.totalArrows += 2;
    }
    this.updateUIViaCallbacks();
    this.resetArrow();
    this.increaseDifficulty();
  }

  increaseDifficulty() {
    if (this.score > 20 && !this.bow.speedIncremented) {
      this.bow.dy *= 1.5;
      this.bow.speedIncremented = true;
    }
  }

  resetArrow() {
    this.arrow.isFlying = false;
    this.arrow.x = this.bow.x + this.bow.width / 2;
  }

  updateUIViaCallbacks() {
    if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
    if (this.options.onArrowsUpdate) this.options.onArrowsUpdate(this.totalArrows);
  }

  triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
    }
    this.removeListeners(); // Clean up listeners on game over

    const personalBestScore = parseInt(localStorage.getItem('kpopArcheryBestScore') || '0');
    if (this.score > personalBestScore) {
      localStorage.setItem('kpopArcheryBestScore', this.score.toString());
    }
    
    if (this.options.onGameOver) {
      this.options.onGameOver(this.score, this.score > personalBestScore);
    }
  }

  start() {
    this.isGameOver = false;
    this.score = 0;
    this.totalArrows = 10;
    this.bow.dy = 3; // Reset bow speed
    this.bow.speedIncremented = false;
    
    this.bestScore = parseInt(localStorage.getItem('kpopArcheryBestScore') || '0');
    this.updateUIViaCallbacks();
    
    // Ensure canvas is sized before loading assets or starting game loop
    this.handleCanvasResize(); // Initial size
    
    this.resizeObserver = new ResizeObserver(this.handleCanvasResize);
    this.resizeObserver.observe(this.canvas);

    this.loadAssets(() => {
      this.initListeners();
      this.loadRewardedAd(); // Preload rewarded ad
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    });
  }

  destroy() {
    this.isGameOver = true; // Ensure game loop stops
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.removeListeners();
    // Any other cleanup specific to the game (e.g., AdMob ad disposal if applicable)
    if (this.rewardedAd && typeof this.rewardedAd.destroy === 'function') {
         // this.rewardedAd.destroy(); // If AdMob SDK provides a destroy method
    }
    this.rewardedAd = null;
    console.log("KpopArcheryGame instance destroyed");
  }
}
