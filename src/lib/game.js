
// KpopArcheryGame class adapted for React integration

export class KpopArcheryGame {
  constructor(canvas, options) { // canvas is the DOM element, options contains callbacks
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.options = options; // { onScoreUpdate, onArrowsUpdate, onGameOver }

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

    // Canvas Dimensions (will be set by resize handler)
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
    this.personalBestScore = 0; // Loaded from localStorage via React component
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
    if (!this.canvas) return;
    this.w = this.canvas.width;
    this.h = this.canvas.height;
    this.bow.y = this.h / 2;
    this.target.x = this.w - 120; // Keep target on the right
    this.target.y = this.h / 2;
    this.resetArrow();
  }
  
  handleCanvasResize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    // Ensure canvas uses the size of its parent container for responsiveness
    this.canvas.width = this.canvas.parentElement.offsetWidth;
    this.canvas.height = this.canvas.parentElement.offsetHeight;
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

    this.rewardedAd.on('load', () => { // Corrected event name from 'adloaded'
      console.log('Rewarded ad loaded successfully');
    });
    this.rewardedAd.on('error', (error) => { // Corrected event name from 'aderror'
      console.error('Rewarded ad failed to load:', error);
      this.rewardedAd = null; 
    });
    this.rewardedAd.on('close', () => { // Corrected event name from 'adclosed'
      console.log('Rewarded ad closed');
      this.loadRewardedAd(); // Preload next ad
    });
    this.rewardedAd.on('reward', () => { // Corrected event name from 'adrewarded'
      console.log('Rewarded ad granted reward');
      this.totalArrows += 5;
      this.updateUIViaCallbacks();
    });
    this.rewardedAd.load(); // Corrected method name from 'loadAd'
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
    if (!this.canvas) return;
    this.canvas.addEventListener('click', this.shoot);
    this.canvas.addEventListener('touchstart', this.shoot, { passive: false }); 
    
    this.keydownHandler = (e) => {
      if (e.code === 'Space' && !this.isGameOver && this.options.isGameEffectivelyActive()) { // Check if game is active via callback
        e.preventDefault(); 
        this.shoot();
      }
    };
    document.body.addEventListener('keydown', this.keydownHandler);
  }

  removeListeners() {
    if (!this.canvas) return;
    this.canvas.removeEventListener('click', this.shoot);
    this.canvas.removeEventListener('touchstart', this.shoot);
    if (this.keydownHandler) {
      document.body.removeEventListener('keydown', this.keydownHandler);
    }
    if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
    }
  }
  
  gameLoop() {
    if (this.isGameOver || !this.canvas) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      return;
    }

    this.ctx.clearRect(0, 0, this.w, this.h);

    if (this.loadedAssets.background) {
      this.ctx.drawImage(this.loadedAssets.background, 0, 0, this.w, this.h);
    } else {
      this.ctx.fillStyle = '#87CEEB'; 
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
      if (this.arrow.x > this.w) { // Arrow went off screen
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
    const points = Math.max(0, 10 - Math.floor(hitOffset / (this.target.height / 20))); // Max 10 points
    this.score += points;

    if (points >= 9) { // Bullseye or near bullseye
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
    this.arrow.x = this.bow.x + this.bow.width / 2; // Reset to bow's front
    // Game over due to missed arrow is checked in updateArrowPosition after reset if arrows ran out
  }

  updateUIViaCallbacks() {
    if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
    if (this.options.onArrowsUpdate) this.options.onArrowsUpdate(this.totalArrows);
  }

  triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    
    // Stop game loop
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    // Listeners will be removed by the React component's cleanup effect calling destroy()

    // Determine if it's a new personal best (React component will manage actual localStorage for best score)
    const newBest = this.score > this.personalBestScore; 
    if (newBest) {
        this.personalBestScore = this.score; // Update internal tracking for the session
    }
    
    if (this.options.onGameOver) {
      this.options.onGameOver(this.score, newBest);
    }
  }

  // Called by React component to initialize/reset the game
  start(initialBestScore) {
    this.isGameOver = false;
    this.score = 0;
    this.totalArrows = 10;
    this.bow.dy = 3; 
    this.bow.speedIncremented = false;
    this.personalBestScore = initialBestScore || 0;
    
    this.updateUIViaCallbacks();
    
    if (!this.canvas || !this.canvas.parentElement) {
        console.error("Canvas or its parent is not available for sizing.");
        return;
    }
    
    // Initial canvas sizing
    this.handleCanvasResize(); 
    
    // Set up ResizeObserver
    if (!this.resizeObserver) {
        this.resizeObserver = new ResizeObserver(this.handleCanvasResize);
    }
    this.resizeObserver.observe(this.canvas.parentElement);


    this.loadAssets(() => {
      this.initListeners();
      this.loadRewardedAd(); // Preload rewarded ad
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    });
  }

  // Called by React component on unmount or when game needs to stop
  destroy() {
    this.isGameOver = true; 
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.removeListeners(); // Cleans up canvas and body listeners, and ResizeObserver
    
    if (this.rewardedAd && typeof this.rewardedAd.destroy === 'function') { // If AdMob SDK provides a destroy method
         // this.rewardedAd.destroy(); 
    }
    this.rewardedAd = null;
    console.log("KpopArcheryGame instance destroyed");
  }
}

