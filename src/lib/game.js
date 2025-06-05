
// KpopArcheryGame class adapted for React integration

export class KpopArcheryGame {
  constructor(canvas, options) { // canvas is the DOM element, options contains callbacks
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.options = options; // { onScoreUpdate, onArrowsUpdate, onGameOver, isGameEffectivelyActive }
    console.log("KpopArcheryGame constructor: canvas, options received", canvas, options);


    // AdMob Settings
    this.admobAppId = 'ca-app-pub-6305491227155574~9346740465';
    this.rewardedAdUnitId = 'ca-app-pub-6305491227155574/7475030251';
    this.rewardedAd = null;

    if (typeof admob !== 'undefined' && admob.RewardedAd) {
      admob.setAppMuted(false);
      admob.setAppVolume(1);
      console.log("AdMob SDK detected and configured.");
    } else {
      console.warn("AdMob SDK (global 'admob' variable or RewardedAd class) not detected. Ads will not function.");
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
    this.clickHandler = null; // For canvas click
    this.touchStartHandler = null; // For canvas touch

    // Bind methods that will be used as event handlers or callbacks
    this.shoot = this.shoot.bind(this);
    this.gameLoop = this.gameLoop.bind(this);
    this.handleCanvasResize = this.handleCanvasResize.bind(this);
  }

  initializeCanvasDimensions() {
    if (!this.canvas) {
        console.warn("initializeCanvasDimensions: Canvas not found.");
        return;
    }
    this.w = this.canvas.width;
    this.h = this.canvas.height;
    this.bow.y = this.h / 2;
    this.target.x = this.w - 120;
    this.target.y = this.h / 2;
    this.resetArrow(); // Ensure arrow position is updated after dimension changes
    console.log(`Canvas dimensions initialized/updated: ${this.w}x${this.h}`);
  }

  handleCanvasResize() {
    if (!this.canvas || !this.canvas.parentElement) {
      console.warn("handleCanvasResize: Canvas or parentElement not found.");
      return;
    }
    // Ensure the canvas element itself is being observed for size changes,
    // or its direct parent if the canvas size is meant to fill the parent.
    const newWidth = this.canvas.parentElement.offsetWidth;
    const newHeight = this.canvas.parentElement.offsetHeight;

    if (newWidth === 0 || newHeight === 0) {
        console.warn("handleCanvasResize: Parent element has zero dimensions. Canvas not resized to avoid 0x0.");
        return;
    }

    if (this.canvas.width !== newWidth || this.canvas.height !== newHeight) {
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.initializeCanvasDimensions(); // Re-initialize game elements based on new size
    }
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
        console.error("Error calling rewardedAd.load():", err);
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
    console.log(`KpopArcheryGame: Loading ${assetCount} assets...`);

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
        console.log(`KpopArcheryGame: Asset loaded: ${key}`);
        if (assetsLoaded === assetCount && callback) {
            console.log("KpopArcheryGame: All assets loaded.");
            callback();
        }
      };
      img.onerror = () => {
        console.error(`KpopArcheryGame: Failed to load asset: ${this.assets[key]}`);
        this.loadedAssets[key] = null; // Mark as attempted but failed
        assetsLoaded++;
        if (assetsLoaded === assetCount && callback) {
            console.warn("KpopArcheryGame: Finished loading assets with some errors.");
            callback(); // Still callback so game can proceed, maybe with placeholders
        }
      };
    });
  }

  initListeners() {
    if (!this.canvas) {
        console.warn("KpopArcheryGame.initListeners: Canvas not available.");
        return;
    }
    console.log("KpopArcheryGame: Initializing event listeners for canvas and body.");

    // Remove existing listeners first to prevent duplicates if init is called multiple times
    if (this.clickHandler) this.canvas.removeEventListener('click', this.clickHandler);
    if (this.touchStartHandler) this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    if (this.keydownHandler) document.body.removeEventListener('keydown', this.keydownHandler);

    this.clickHandler = (event) => this.shoot(event);
    this.touchStartHandler = (event) => {
        event.preventDefault(); // Good for preventing default touch behaviors
        this.shoot(event);
    };
    this.keydownHandler = (e) => {
      if (e.code === 'Space' && !this.isGameOver && this.options.isGameEffectivelyActive && this.options.isGameEffectivelyActive()) {
        e.preventDefault();
        this.shoot(e);
      }
    };

    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    document.body.addEventListener('keydown', this.keydownHandler);
    console.log("KpopArcheryGame: Event listeners initialized.");
  }

  removeListeners() {
    console.log("KpopArcheryGame: Removing event listeners.");
    if (this.canvas) {
        if (this.clickHandler) this.canvas.removeEventListener('click', this.clickHandler);
        if (this.touchStartHandler) this.canvas.removeEventListener('touchstart', this.touchStartHandler);
        this.clickHandler = null;
        this.touchStartHandler = null;
    }
    if (this.keydownHandler) {
      document.body.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
        console.log("KpopArcheryGame: Disconnected ResizeObserver.");
    }
  }

  gameLoop() {
    if (this.isGameOver) {
      console.log("KpopArcheryGame: Game loop halting because isGameOver is true.");
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      return;
    }
    if (!this.canvas || this.w === 0 || this.h === 0) {
      console.warn("KpopArcheryGame: Game loop aborted: canvas not ready or dimensions are zero.");
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      // Potentially attempt to re-initialize dimensions or wait
      // For now, just stop the loop. The resize observer should eventually fix dimensions.
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

      // Collision detection
      if (this.arrow.x - this.arrow.width / 2 < this.target.x + this.target.width / 2 && // Arrow's front edge is past target's left edge
          this.arrow.x + this.arrow.width / 2 > this.target.x - this.target.width / 2) { // Arrow's back edge is before target's right edge (overlap on X)
        // Check Y overlap more precisely
        if (this.arrow.y > this.target.y - this.target.height / 2 && this.arrow.y < this.target.y + this.target.height / 2) {
          this.handleHit(); // This will call resetArrow
        }
      }

      // Arrow off-screen (miss)
      if (this.arrow.x > this.w) {
        console.log("KpopArcheryGame: Arrow missed, went off screen.");
        this.resetArrow(); // This will now check for game over if arrows are 0
      }
    } else {
      // Lock arrow’s Y to bow’s Y when not flying
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
    // event can be undefined if called by spacebar
    if (event && event.type === 'touchstart') {
        event.preventDefault();
    }
    if (!this.arrow.isFlying && this.totalArrows > 0 && !this.isGameOver) {
      console.log("KpopArcheryGame: Shooting arrow. Arrows left before shot:", this.totalArrows);
      this.arrowReleaseSound.play().catch(e => console.warn('Error playing release sound:', e));
      this.arrow.isFlying = true;
      this.totalArrows--;
      this.updateUIViaCallbacks();
    } else if (this.totalArrows <= 0 && !this.isGameOver) {
      console.log("KpopArcheryGame: Attempted to shoot with 0 arrows. Showing ad.");
      this.showRewardedAd();
    } else if (this.isGameOver) {
        console.log("KpopArcheryGame: Attempted to shoot but game is over.");
    } else if (this.arrow.isFlying) {
        console.log("KpopArcheryGame: Attempted to shoot while arrow is already flying.");
    }
  }

  handleHit() {
    console.log("KpopArcheryGame: Arrow hit target.");
    this.arrowImpactSound.play().catch(e => console.warn('Error playing impact sound:', e));
    const hitOffset = Math.abs(this.arrow.y - this.target.y);
    const points = Math.max(0, 10 - Math.floor(hitOffset / (this.target.height / 20))); // Assuming target height is relevant for scoring zones
    this.score += points;
    console.log("KpopArcheryGame: Scored", points, "New total score:", this.score);

    if (points >= 9) { // Bullseye or near bullseye
      this.totalArrows += 2;
      console.log("KpopArcheryGame: Bullseye bonus! +2 arrows. Total arrows:", this.totalArrows);
    }
    this.updateUIViaCallbacks();
    this.resetArrow(); // This will call triggerGameOver if conditions met
    this.increaseDifficulty();
  }

  increaseDifficulty() {
    if (this.score > 20 && !this.bow.speedIncremented) {
      this.bow.dy = this.bow.dy > 0 ? this.bow.dy + 1 : this.bow.dy - 1;
      this.bow.speedIncremented = true;
      console.log("KpopArcheryGame: Difficulty increased - Bow speed now:", this.bow.dy);
    }
  }

  resetArrow() {
    this.arrow.isFlying = false;
    this.arrow.x = this.bow.x + this.bow.width; // Start arrow at the tip of the bow
    console.log("KpopArcheryGame: Arrow reset. Arrows left:", this.totalArrows, "Is game over:", this.isGameOver);
    if (this.totalArrows <= 0 && !this.isGameOver) {
      console.log("KpopArcheryGame: resetArrow detected game over condition. Triggering game over.");
      this.triggerGameOver();
    }
  }

  updateUIViaCallbacks() {
    if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
    if (this.options.onArrowsUpdate) this.options.onArrowsUpdate(this.totalArrows);
  }

  triggerGameOver() {
    if (this.isGameOver) {
        console.log("KpopArcheryGame: triggerGameOver called, but game already over.");
        return;
    }
    console.log("KpopArcheryGame: Triggering Game Over. Final Score:", this.score);
    this.isGameOver = true;

    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        console.log("KpopArcheryGame: Animation frame cancelled.");
    }

    const newBest = this.score > this.personalBestScore;
    if (newBest) {
        this.personalBestScore = this.score; // Update internal tracking
        console.log("KpopArcheryGame: New personal best achieved:", this.personalBestScore);
    }

    if (this.options.onGameOver) {
      console.log("KpopArcheryGame: Calling React onGameOver callback with score:", this.score, "isNewBest:", newBest);
      this.options.onGameOver(this.score, newBest);
    } else {
      console.warn("KpopArcheryGame: onGameOver callback not provided in options.");
    }
  }

  start(initialBestScore) {
    console.log("KpopArcheryGame: Start method called. Initial best score from React:", initialBestScore);
    this.isGameOver = false;
    this.score = 0;
    this.totalArrows = 10; // Reset arrows
    this.bow.dy = 3; // Reset bow speed
    this.bow.speedIncremented = false;
    this.personalBestScore = initialBestScore || 0;

    this.updateUIViaCallbacks(); // Initial UI update

    if (!this.canvas || !this.canvas.parentElement) {
        console.error("KpopArcheryGame.start: Canvas or its parentElement is not available. Game cannot start.");
        this.isGameOver = true; // Prevent game loop if canvas is bad
        return;
    }

    // Attempt initial sizing based on current parent dimensions
    this.handleCanvasResize();

    if (this.w === 0 || this.h === 0) {
        console.warn("KpopArcheryGame.start: Canvas dimensions are 0x0 after initial resize. Game might not display correctly until parent is sized and ResizeObserver triggers.");
        // Game loop will check this and not run if dimensions are 0
    }

    if (!this.resizeObserver) {
        this.resizeObserver = new ResizeObserver(this.handleCanvasResize);
        // Observe the parent element, as canvas size is derived from it
        this.resizeObserver.observe(this.canvas.parentElement);
        console.log("KpopArcheryGame: ResizeObserver attached to canvas parent.");
    } else {
        // If observer exists, ensure it's observing the correct element,
        // though it should be fine if parent hasn't changed.
        this.resizeObserver.observe(this.canvas.parentElement);
    }


    this.loadAssets(() => {
      console.log("KpopArcheryGame: Assets loaded callback. Initializing listeners and starting game loop.");
      this.initListeners(); // Initialize listeners after assets are loaded
      this.loadRewardedAd(); // Load ad (non-blocking)

      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId); // Clear any old loop
      if (!this.isGameOver) { // Double check game isn't over before starting loop
          console.log("KpopArcheryGame: Requesting first animation frame.");
          this.animationFrameId = requestAnimationFrame(this.gameLoop);
      } else {
          console.warn("KpopArcheryGame: Game was marked over before loop could start.");
      }
    });
  }

  destroy() {
    console.log("KpopArcheryGame: Destroy method called.");
    this.isGameOver = true; // Ensure game stops
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      console.log("KpopArcheryGame: Animation frame cancelled on destroy.");
    }
    this.removeListeners(); // Clean up all listeners

    if (this.rewardedAd && typeof this.rewardedAd.destroy === 'function') {
         try {
            // this.rewardedAd.destroy(); // Some AdMob SDKs might have a destroy method
            console.log("KpopArcheryGame: Rewarded ad destroy method called if available.");
         } catch (e) {
            console.warn("KpopArcheryGame: Error trying to destroy rewarded ad:", e);
         }
    }
    this.rewardedAd = null;
    this.loadedAssets = {}; // Clear loaded assets
    console.log("KpopArcheryGame: Instance resources released.");
  }
}
