
// KpopArcheryGame class adapted for React integration

export class KpopArcheryGame {
  constructor(canvas, options) { // canvas is the DOM element, options contains callbacks
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.options = options; // { onScoreUpdate, onArrowsUpdate, onGameOver, isGameEffectivelyActive }

    // AdMob Settings
    this.admobAppId = 'ca-app-pub-6305491227155574~9346740465';
    this.rewardedAdUnitId = 'ca-app-pub-6305491227155574/7475030251';
    this.rewardedAd = null;

    if (typeof admob !== 'undefined') {
      admob.setAppMuted(false);
      admob.setAppVolume(1);
      console.log("AdMob SDK detected and configured.");
    } else {
      console.warn("AdMob SDK (global 'admob' variable) not detected. Ads will not function.");
    }

    this.w = 0;
    this.h = 0;
    this.resizeObserver = null;

    this.assets = {
      bow: '/assets/bow-sprite.png',
      arrow: '/assets/arrow-sprite.png',
      target: '/assets/target-sprite.png',
      background: '/assets/stadium-background.png'
    };
    this.loadedAssets = {};

    this.arrowImpactSound = new Audio('/assets/arrow-impact.mp3');
    this.arrowReleaseSound = new Audio('/assets/arrow-release.mp3');
    this.arrowImpactSound.volume = 0.3;
    this.arrowReleaseSound.volume = 0.3;

    this.score = 0;
    this.personalBestScore = 0;
    this.totalArrows = 10;

    this.bow = { x: 50, y: 0, width: 120, height: 180, dy: 3, speedIncremented: false };
    this.target = { x: 0, y: 0, width: 100, height: 160, dy: 4, autoMove: true };
    this.arrow = { x: 0, y: 0, width: 100, height: 20, isFlying: false, dx: 25 };

    this.isGameOver = false;
    this.animationFrameId = null;
    this.keydownHandler = null;

    this.shoot = this.shoot.bind(this);
    this.gameLoop = this.gameLoop.bind(this);
    this.handleCanvasResize = this.handleCanvasResize.bind(this);
  }

  initializeCanvasDimensions() {
    if (!this.canvas) return;
    this.w = this.canvas.width;
    this.h = this.canvas.height;
    this.bow.y = this.h / 2;
    this.target.x = this.w - 120;
    this.target.y = this.h / 2;
    this.resetArrow(); // Ensure arrow position is updated after dimension changes
    console.log(`Canvas dimensions initialized: ${this.w}x${this.h}`);
  }
  
  handleCanvasResize() {
    if (!this.canvas || !this.canvas.parentElement) {
      console.warn("handleCanvasResize: Canvas or parentElement not found.");
      return;
    }
    const newWidth = this.canvas.parentElement.offsetWidth;
    const newHeight = this.canvas.parentElement.offsetHeight;

    if (newWidth === 0 || newHeight === 0) {
        console.warn("handleCanvasResize: Parent element has zero dimensions. Canvas not resized.");
        return;
    }
    
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    this.initializeCanvasDimensions();
  }

  loadRewardedAd() {
    if (typeof admob === 'undefined' || !admob.RewardedAd) {
      console.warn("AdMob SDK or RewardedAd class not available. Cannot load ad.");
      return;
    }
    if (this.rewardedAd && typeof this.rewardedAd.isLoading === 'function' && this.rewardedAd.isLoading()) {
        console.log("Rewarded ad is already loading.");
        return;
    }

    console.log("Attempting to load new rewarded ad...");
    this.rewardedAd = new admob.RewardedAd({ adUnitId: this.rewardedAdUnitId });

    this.rewardedAd.on('load', () => {
      console.log('Rewarded ad loaded successfully via event.');
    });
    this.rewardedAd.on('error', (error) => {
      console.error('Rewarded ad failed to load via event:', error);
      this.rewardedAd = null; 
    });
    this.rewardedAd.on('close', () => {
      console.log('Rewarded ad closed.');
      this.loadRewardedAd(); // Preload next ad
    });
    this.rewardedAd.on('reward', (rewardItem) => {
      console.log('Rewarded ad granted reward:', rewardItem);
      this.totalArrows += 5;
      this.updateUIViaCallbacks();
    });
    
    this.rewardedAd.load().catch(err => {
        console.error("Error calling rewardedAd.load():", err); // Catch errors from the load promise
    });
  }

  showRewardedAd() {
    if (this.rewardedAd && typeof this.rewardedAd.isLoaded === 'function' && this.rewardedAd.isLoaded()) {
      console.log("Showing loaded rewarded ad.");
      this.rewardedAd.show().catch(err => {
          console.error("Error calling rewardedAd.show():", err);
      });
    } else {
      console.log('Rewarded ad is not loaded yet. Attempting to load for future use.');
      this.loadRewardedAd(); 
    }
  }

  loadAssets(callback) {
    let assetsLoaded = 0;
    const assetKeys = Object.keys(this.assets);
    const assetCount = assetKeys.length;
    console.log(`Loading ${assetCount} assets...`);

    if (assetCount === 0) {
        if (callback) callback();
        return;
    }

    assetKeys.forEach(key => {
      const img = new Image();
      img.src = this.assets[key];
      img.onload = () => {
        this.loadedAssets[key] = img;
        assetsLoaded++;
        console.log(`Asset loaded: ${key}`);
        if (assetsLoaded === assetCount && callback) callback();
      };
      img.onerror = () => {
        console.error(`Failed to load asset: ${this.assets[key]}`);
        this.loadedAssets[key] = null;
        assetsLoaded++;
        if (assetsLoaded === assetCount && callback) callback();
      };
    });
  }

  initListeners() {
    if (!this.canvas) return;
    console.log("Initializing event listeners for canvas and body.");
    // Clear existing listeners before adding new ones to prevent duplicates if init is called multiple times
    this.canvas.removeEventListener('click', this.shoot);
    this.canvas.removeEventListener('touchstart', this.shoot);
    if (this.keydownHandler) {
        document.body.removeEventListener('keydown', this.keydownHandler);
    }

    this.canvas.addEventListener('click', this.shoot);
    this.canvas.addEventListener('touchstart', this.shoot, { passive: false }); 
    
    this.keydownHandler = (e) => {
      // Use callback to check if game is considered active by React component
      if (e.code === 'Space' && !this.isGameOver && this.options.isGameEffectivelyActive && this.options.isGameEffectivelyActive()) {
        e.preventDefault(); 
        this.shoot();
      }
    };
    document.body.addEventListener('keydown', this.keydownHandler);
  }

  removeListeners() {
    console.log("Removing event listeners.");
    if (!this.canvas) return;
    this.canvas.removeEventListener('click', this.shoot);
    this.canvas.removeEventListener('touchstart', this.shoot);
    if (this.keydownHandler) {
      document.body.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
        console.log("Disconnected ResizeObserver.");
    }
  }
  
  gameLoop() {
    if (this.isGameOver || !this.canvas || this.w === 0 || this.h === 0) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if(this.w === 0 || this.h === 0) console.warn("Game loop aborted: canvas dimensions are zero.");
      return;
    }

    this.ctx.clearRect(0, 0, this.w, this.h);

    if (this.loadedAssets.background) {
      this.ctx.drawImage(this.loadedAssets.background, 0, 0, this.w, this.h);
    } else {
      this.ctx.fillStyle = '#ADD8E6'; // Light blue fallback
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
      if (this.arrow.x - this.arrow.width / 2 < this.target.x + this.target.width / 2 &&
          this.arrow.x + this.arrow.width / 2 > this.target.x - this.target.width / 2) {
        if (this.arrow.y > this.target.y - this.target.height / 2 && this.arrow.y < this.target.y + this.target.height / 2) {
          this.handleHit();
        }
      }
      if (this.arrow.x > this.w) {
        this.resetArrow();
        if (this.totalArrows <= 0 && !this.isGameOver) {
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
        event.preventDefault(); 
    }
    if (!this.arrow.isFlying && this.totalArrows > 0 && !this.isGameOver) {
      this.arrowReleaseSound.play().catch(e => console.warn('Error playing release sound:', e));
      this.arrow.isFlying = true;
      this.totalArrows--;
      this.updateUIViaCallbacks();
    } else if (this.totalArrows <= 0 && !this.isGameOver) {
      this.showRewardedAd();
    }
  }

  handleHit() {
    this.arrowImpactSound.play().catch(e => console.warn('Error playing impact sound:', e));
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
      this.bow.dy = this.bow.dy > 0 ? this.bow.dy + 1 : this.bow.dy -1; // make it faster regardless of direction
      this.bow.speedIncremented = true;
      console.log("Difficulty increased: Bow speed up.");
    }
  }

  resetArrow() {
    this.arrow.isFlying = false;
    this.arrow.x = this.bow.x + this.bow.width; // Start arrow at the tip of the bow
  }

  updateUIViaCallbacks() {
    if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
    if (this.options.onArrowsUpdate) this.options.onArrowsUpdate(this.totalArrows);
  }

  triggerGameOver() {
    if (this.isGameOver) return;
    console.log("Game Over triggered. Final Score:", this.score);
    this.isGameOver = true;
    
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    // Listeners are removed by React component via destroy()

    const newBest = this.score > this.personalBestScore; 
    if (newBest) {
        this.personalBestScore = this.score;
    }
    
    if (this.options.onGameOver) {
      this.options.onGameOver(this.score, newBest);
    }
  }

  start(initialBestScore) {
    console.log("KpopArcheryGame start method called. Initial best score:", initialBestScore);
    this.isGameOver = false;
    this.score = 0;
    this.totalArrows = 10;
    this.bow.dy = 3; 
    this.bow.speedIncremented = false;
    this.personalBestScore = initialBestScore || 0;
    
    this.updateUIViaCallbacks();
    
    if (!this.canvas || !this.canvas.parentElement) {
        console.error("KpopArcheryGame.start: Canvas or its parentElement is not available.");
        this.isGameOver = true; // Prevent game loop from starting if canvas is bad
        return;
    }
    
    this.handleCanvasResize(); // Initial sizing attempt
    
    if (this.w === 0 || this.h === 0) {
        console.warn("KpopArcheryGame.start: Canvas dimensions are 0x0 after initial resize. Game might not display correctly until resized.");
    }

    if (!this.resizeObserver) {
        this.resizeObserver = new ResizeObserver(this.handleCanvasResize);
        this.resizeObserver.observe(this.canvas.parentElement);
        console.log("ResizeObserver attached to canvas parent.");
    }

    this.loadAssets(() => {
      console.log("Assets loaded. Initializing listeners and starting game loop.");
      this.initListeners();
      this.loadRewardedAd(); 
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
      console.log("Game loop initiated.");
    });
  }

  destroy() {
    console.log("KpopArcheryGame destroy method called.");
    this.isGameOver = true; 
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.removeListeners(); 
    
    // Attempt to destroy AdMob ad if SDK and method exist
    if (this.rewardedAd && typeof this.rewardedAd.destroy === 'function') {
         try {
            // this.rewardedAd.destroy(); // Some SDKs might have this
            console.log("Rewarded ad destroy method called if available.");
         } catch (e) {
            console.warn("Error trying to destroy rewarded ad:", e);
         }
    }
    this.rewardedAd = null;
    console.log("KpopArcheryGame instance resources released.");
  }
}

