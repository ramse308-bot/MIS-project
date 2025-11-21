/**
 * Geometry Dash Style Game
 * Auto-scrolling platformer with jump mechanics
 */

class GeometryDashGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas resolution for Retina displays (will retry if dimensions not ready)
        this.resizeCanvas();
        
        // Game state
        this.gameState = 'start'; // start, playing, dead, win
        this.scrollSpeed = 5; // Constant scroll speed
        this.cameraX = 0; // Camera position for scrolling
        
        // Player properties
        this.player = {
            x: 100, // Fixed horizontal position
            y: 0,
            width: 30,
            height: 30,
            velocityY: 0,
            rotation: 0,
            rotationSpeed: 0,
            isJumping: false,
            jumpStartTime: 0,
            color: '#ffffff', // White
            groundY: 0 // Will be set based on ground level
        };
        
        // Physics constants - tuned for clearing small obstacles
        this.gravity = 0.8;
        this.jumpPower = -16; // Initial jump velocity (slightly stronger)
        this.maxJumpHold = 300; // Max milliseconds to hold jump
        this.holdJumpBonus = 0.35; // Additional velocity per frame while holding
        
        // Input handling
        this.keys = {
            space: false,
            mouse: false
        };
        this.jumpHeld = false;
        this.jumpHeldTime = 0;
        
        // Level data - Complete playable demo level
        this.level = {
            width: 8000, // Total level width
            groundHeight: 50,
            obstacles: [],
            platforms: [],
            spikes: []
        };
        
        // Parallax layers
        this.parallaxLayers = [
            { speed: 0.2, color: '#2a2a2a', elements: [] }, // Background (slow) - dark grey
            { speed: 0.5, color: '#3a3a3a', elements: [] }, // Mid layer (medium) - medium grey
            { speed: 1.0, color: '#4a4a4a', elements: [] }   // Foreground (fast) - lighter grey
        ];
        
        // Particles for player trail
        this.particles = [];
        
        // Audio system
        this.audio = {
            bgMusic: null,
            jumpSound: null,
            deathSound: null,
            musicPlaying: false
        };
        
        // Score and UI
        this.score = 0;
        this.distance = 0;
        this.highScore = this.loadHighScore();
        
        // Initialize level
        this.createLevel();
        this.initParallax();
        this.initAudio();
        this.setupEventListeners();
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    /**
     * Create a complete playable demo level with small, jumpable obstacles
     */
    createLevel() {
        // Use logical canvas height (not scaled)
        const logicalHeight = this.canvas.offsetHeight || 600;
        const groundY = logicalHeight - this.level.groundHeight;
        this.player.groundY = groundY - this.player.height;
        this.player.y = this.player.groundY;
        
        // Calculate max jump height (approximately 150-180px based on physics)
        const maxJumpHeight = 180;
        
        // Level design - small, jumpable block obstacles
        let x = 500; // Start after initial safe zone
        
        // Section 1: Easy warm-up - small ground blocks
        for (let i = 0; i < 4; i++) {
            this.level.obstacles.push({
                x: x + i * 120,
                y: groundY - 25, // Small blocks on ground
                width: 35,
                height: 25,
                color: '#d0d0d0' // Light grey blocks
            });
        }
        x += 480;
        
        // Section 2: Jumpable blocks - low blocks that can be jumped over
        for (let i = 0; i < 5; i++) {
            this.level.obstacles.push({
                x: x + i * 100,
                y: groundY - 30, // Low blocks
                width: 40,
                height: 30,
                color: '#b0b0b0' // Medium grey blocks
            });
        }
        x += 500;
        
        // Section 3: Alternating pattern - jump over blocks
        for (let i = 0; i < 6; i++) {
            this.level.obstacles.push({
                x: x + i * 90,
                y: groundY - (i % 2 === 0 ? 25 : 35), // Alternating heights
                width: 35,
                height: i % 2 === 0 ? 25 : 35,
                color: '#909090' // Darker grey blocks
            });
        }
        x += 540;
        
        // Section 4: Spaced blocks - rhythm timing
        for (let i = 0; i < 8; i++) {
            this.level.obstacles.push({
                x: x + i * 80,
                y: groundY - 30,
                width: 30,
                height: 30,
                color: '#c0c0c0' // Light grey blocks
            });
        }
        x += 640;
        
        // Section 5: Mixed small blocks
        for (let i = 0; i < 7; i++) {
            const height = 20 + (i % 3) * 10; // Vary height slightly
            this.level.obstacles.push({
                x: x + i * 85,
                y: groundY - height,
                width: 35,
                height: height,
                color: '#a0a0a0' // Medium grey blocks
            });
        }
        x += 595;
        
        // Section 6: Final sequence - small blocks
        for (let i = 0; i < 10; i++) {
            this.level.obstacles.push({
                x: x + i * 70,
                y: groundY - 28,
                width: 32,
                height: 28,
                color: '#e0e0e0' // Very light grey blocks
            });
        }
        x += 700;
        
        // Section 7: Victory zone - clear path
        // No obstacles, just clear path to end
        
        this.level.width = x + 300; // End of level
    }
    
    /**
     * Initialize parallax background elements
     */
    initParallax() {
        const logicalHeight = this.canvas.offsetHeight || 600;
        this.parallaxLayers.forEach((layer, layerIndex) => {
            layer.elements = [];
            const elementCount = 15 + layerIndex * 5;
            
            for (let i = 0; i < elementCount; i++) {
                layer.elements.push({
                    x: Math.random() * this.level.width,
                    y: Math.random() * (logicalHeight - this.level.groundHeight),
                    size: 20 + Math.random() * 40,
                    opacity: 0.1 + layerIndex * 0.1
                });
            }
        });
    }
    
    /**
     * Initialize audio system
     */
    initAudio() {
        // Create audio context for sound generation
        // Will be resumed on user interaction (required by browsers)
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Audio context starts suspended, will resume on first user interaction
            if (this.audioContext.state === 'suspended') {
                this.audioContextReady = false;
            } else {
                this.audioContextReady = true;
            }
        } catch (e) {
            console.log('Audio context not supported');
            this.audioContext = null;
            this.audioContextReady = false;
        }
    }
    
    /**
     * Resume audio context (called on user interaction)
     */
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.audioContextReady = true;
                if (this.gameState === 'playing') {
                    this.startBackgroundMusic();
                }
            }).catch(e => {
                console.log('Could not resume audio context:', e);
            });
        }
    }
    
    /**
     * Generate background music using Web Audio API
     */
    startBackgroundMusic() {
        if (!this.audioContext || !this.audioContextReady) return;
        
        // Simple looping beat
        const playBeat = () => {
            if (this.gameState !== 'playing' && this.gameState !== 'start') return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = 220 + Math.sin(Date.now() * 0.001) * 20;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
            
            setTimeout(playBeat, 500);
        };
        
        if (this.gameState === 'playing' || this.gameState === 'start') {
            playBeat();
        }
    }
    
    /**
     * Play jump sound effect
     */
    playJumpSound() {
        if (!this.audioContext || !this.audioContextReady) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 400;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    /**
     * Play death sound effect
     */
    playDeathSound() {
        if (!this.audioContext || !this.audioContextReady) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 150;
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    /**
     * Resize canvas for Retina displays
     */
    resizeCanvas() {
        // Get actual dimensions from CSS or use defaults
        const rect = this.canvas.getBoundingClientRect();
        let width = rect.width || this.canvas.offsetWidth;
        let height = rect.height || this.canvas.offsetHeight;
        
        // If dimensions aren't ready, use defaults and retry later
        if (!width || !height || width === 0 || height === 0) {
            width = 1200;
            height = 600;
            // Retry after a short delay
            setTimeout(() => this.resizeCanvas(), 50);
        }
        
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Recalculate ground position (use logical height, not scaled)
        if (this.level) {
            const groundY = height - this.level.groundHeight;
            this.player.groundY = groundY - this.player.height;
            if (this.gameState === 'start' || this.gameState === 'dead') {
                this.player.y = this.player.groundY;
            }
        }
    }
    
    /**
     * Setup event listeners for controls
     */
    setupEventListeners() {
        // Keyboard controls - use window to catch spacebar anywhere
        const keyDownHandler = (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                this.handleJumpStart();
            }
        };
        
        const keyUpHandler = (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                this.handleJumpEnd();
            }
        };
        
        window.addEventListener('keydown', keyDownHandler);
        window.addEventListener('keyup', keyUpHandler);
        
        // Store handlers for cleanup if needed
        this.keyDownHandler = keyDownHandler;
        this.keyUpHandler = keyUpHandler;
        
        // Mouse controls - also allow starting game by clicking canvas
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            // If game is in start state, clicking canvas will start it
            if (this.gameState === 'start') {
                this.startGame();
            } else {
                this.handleJumpStart();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.handleJumpEnd();
        });
        
        // Touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleJumpStart();
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleJumpEnd();
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
    
    /**
     * Handle jump start (tap or hold)
     */
    handleJumpStart() {
        // Resume audio context on first user interaction
        if (!this.audioContextReady && this.audioContext) {
            this.resumeAudioContext();
        }
        
        if (this.gameState === 'start') {
            this.startGame();
            return;
        }
        
        if (this.gameState === 'dead') {
            this.restart();
            return;
        }
        
        if (this.gameState !== 'playing') return;
        
        if (!this.player.isJumping && this.isOnGround()) {
            // Start jump
            this.player.velocityY = this.jumpPower;
            this.player.isJumping = true;
            this.jumpHeld = true;
            this.jumpHeldTime = 0;
            this.player.rotationSpeed = 15; // Start rotation
            this.playJumpSound();
        } else if (this.player.isJumping && this.jumpHeld) {
            // Continue holding jump for higher jump
            this.jumpHeldTime++;
            if (this.jumpHeldTime < this.maxJumpHold / 16) { // Convert ms to frames (60fps)
                this.player.velocityY += this.holdJumpBonus;
            }
        }
    }
    
    /**
     * Handle jump end (release)
     */
    handleJumpEnd() {
        this.jumpHeld = false;
        this.jumpHeldTime = 0;
    }
    
    /**
     * Check if player is on ground or platform
     */
    isOnGround() {
        const logicalHeight = this.canvas.offsetHeight || 600;
        
        // Check ground (with small tolerance for floating point)
        if (this.player.y + this.player.height >= this.player.groundY - 2) {
            return true;
        }
        
        // Check platforms
        for (const platform of this.level.platforms) {
            const platformScreenX = platform.x - this.cameraX;
            if (platformScreenX < this.player.x + this.player.width &&
                platformScreenX + platform.width > this.player.x &&
                Math.abs((this.player.y + this.player.height) - platform.y) < 5 &&
                this.player.velocityY >= 0) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Update game logic
     */
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update camera (auto-scroll)
        this.cameraX += this.scrollSpeed;
        this.distance = Math.floor(this.cameraX / 10);
        this.score = this.distance;
        
        // Update player physics
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        
        // Update player rotation
        if (this.player.isJumping) {
            this.player.rotation += this.player.rotationSpeed;
            if (this.player.rotation >= 360) {
                this.player.rotation -= 360;
            }
        } else {
            // Continuous rotation like Geometry Dash
            this.player.rotation += 5;
            if (this.player.rotation >= 360) {
                this.player.rotation -= 360;
            }
        }
        
        // Ground collision (use logical height)
        const logicalHeight = this.canvas.offsetHeight || 600;
        const groundY = logicalHeight - this.level.groundHeight;
        if (this.player.y + this.player.height >= this.player.groundY) {
            this.player.y = this.player.groundY;
            this.player.velocityY = 0;
            this.player.isJumping = false;
            this.player.rotationSpeed = 0;
        }
        
        // Platform collision (top only)
        for (const platform of this.level.platforms) {
            const platformScreenX = platform.x - this.cameraX;
            
            if (platformScreenX < this.player.x + this.player.width &&
                platformScreenX + platform.width > this.player.x &&
                this.player.y + this.player.height > platform.y &&
                this.player.y < platform.y + platform.height &&
                this.player.velocityY > 0) {
                
                // Landing on top of platform
                if (this.player.y + this.player.height <= platform.y + 10) {
                    this.player.y = platform.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isJumping = false;
                    this.player.rotationSpeed = 0;
                }
            }
        }
        
        // Ceiling collision
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velocityY = 0;
        }
        
        // Check collisions with obstacles
        for (const obstacle of this.level.obstacles) {
            const obstacleScreenX = obstacle.x - this.cameraX;
            
            if (this.checkCollision(
                this.player.x, this.player.y, this.player.width, this.player.height,
                obstacleScreenX, obstacle.y, obstacle.width, obstacle.height
            )) {
                this.die();
                return;
            }
        }
        
        // Check collisions with spikes
        for (const spike of this.level.spikes) {
            const spikeScreenX = spike.x - this.cameraX;
            
            if (this.checkCollision(
                this.player.x, this.player.y, this.player.width, this.player.height,
                spikeScreenX, spike.y, spike.width, spike.height
            )) {
                this.die();
                return;
            }
        }
        
        // Check if player fell off screen (use logical height)
        const logicalHeight = this.canvas.offsetHeight || 600;
        if (this.player.y > logicalHeight) {
            this.die();
            return;
        }
        
        // Check win condition
        if (this.cameraX >= this.level.width) {
            this.win();
            return;
        }
        
        // Update particles
        this.updateParticles();
        
        // Update parallax
        this.updateParallax();
    }
    
    /**
     * Check collision between two rectangles
     */
    checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 &&
               x1 + w1 > x2 &&
               y1 < y2 + h2 &&
               y1 + h1 > y2;
    }
    
    /**
     * Update particle effects
     */
    updateParticles() {
        // Add new particles for trail
        if (this.gameState === 'playing') {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 20,
                maxLife: 20,
                size: 3 + Math.random() * 3,
                color: this.player.color
            });
        }
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Limit particle count
        if (this.particles.length > 50) {
            this.particles.splice(0, this.particles.length - 50);
        }
    }
    
    /**
     * Update parallax layers
     */
    updateParallax() {
        this.parallaxLayers.forEach(layer => {
            layer.elements.forEach(element => {
                element.x -= this.scrollSpeed * layer.speed;
                if (element.x + element.size < -this.cameraX) {
                    element.x = this.level.width + Math.random() * 500;
                }
            });
        });
    }
    
    /**
     * Render game graphics
     */
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw parallax layers
        this.drawParallax();
        
        // Draw ground
        this.drawGround();
        
        // Draw obstacles
        this.drawObstacles();
        
        // Draw spikes
        this.drawSpikes();
        
        // Draw platforms
        this.drawPlatforms();
        
        // Draw particles
        this.drawParticles();
        
        // Draw player
        this.drawPlayer();
        
        // Draw UI
        this.drawUI();
    }
    
    /**
     * Draw parallax background layers
     */
    drawParallax() {
        this.parallaxLayers.forEach((layer, layerIndex) => {
            this.ctx.fillStyle = layer.color;
            this.ctx.globalAlpha = layer.elements[0]?.opacity || 0.2;
            
            layer.elements.forEach(element => {
                const screenX = element.x - (this.cameraX * layer.speed);
                
                if (screenX > -element.size && screenX < this.canvas.width) {
                    this.ctx.fillRect(
                        screenX,
                        element.y,
                        element.size,
                        element.size
                    );
                }
            });
            
            this.ctx.globalAlpha = 1;
        });
    }
    
    /**
     * Draw ground
     */
    drawGround() {
        const logicalHeight = this.canvas.offsetHeight || 600;
        const groundY = logicalHeight - this.level.groundHeight;
        
        const logicalWidth = this.canvas.offsetWidth || 1200;
        
        // Ground fill
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, groundY, logicalWidth, this.level.groundHeight);
        
        // Ground line
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(logicalWidth, groundY);
        this.ctx.stroke();
    }
    
    /**
     * Draw obstacles - small, colorful blocks
     */
    drawObstacles() {
        for (const obstacle of this.level.obstacles) {
            const screenX = obstacle.x - this.cameraX;
            
            if (screenX > -obstacle.width && screenX < this.canvas.width) {
                const color = obstacle.color || '#c0c0c0'; // Default to grey if no color
                
                // Main block
                this.ctx.fillStyle = color;
                this.ctx.fillRect(screenX, obstacle.y, obstacle.width, obstacle.height);
                
                // Highlight on top and left
                this.ctx.fillStyle = this.lightenColor(color, 30);
                this.ctx.fillRect(screenX, obstacle.y, obstacle.width, 3);
                this.ctx.fillRect(screenX, obstacle.y, 3, obstacle.height);
                
                // Shadow on bottom and right
                this.ctx.fillStyle = this.darkenColor(color, 30);
                this.ctx.fillRect(screenX, obstacle.y + obstacle.height - 3, obstacle.width, 3);
                this.ctx.fillRect(screenX + obstacle.width - 3, obstacle.y, 3, obstacle.height);
            }
        }
    }
    
    /**
     * Lighten a color
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const r = Math.min(255, (num >> 16) + percent);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
        const b = Math.min(255, (num & 0x0000FF) + percent);
        return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }
    
    /**
     * Darken a color
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const r = Math.max(0, (num >> 16) - percent);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - percent);
        const b = Math.max(0, (num & 0x0000FF) - percent);
        return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }
    
    /**
     * Draw spikes (if any remain in level)
     */
    drawSpikes() {
        if (this.level.spikes.length === 0) return;
        
        this.ctx.fillStyle = '#808080'; // Grey
        this.ctx.strokeStyle = '#606060';
        this.ctx.lineWidth = 2;
        
        for (const spike of this.level.spikes) {
            const screenX = spike.x - this.cameraX;
            
            if (screenX > -spike.width && screenX < this.canvas.width) {
                // Draw triangle spike
                this.ctx.beginPath();
                this.ctx.moveTo(screenX + spike.width / 2, spike.y);
                this.ctx.lineTo(screenX, spike.y + spike.height);
                this.ctx.lineTo(screenX + spike.width, spike.y + spike.height);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
            }
        }
    }
    
    /**
     * Draw platforms
     */
    drawPlatforms() {
        this.ctx.fillStyle = '#d0d0d0'; // Light grey
        this.ctx.strokeStyle = '#b0b0b0';
        this.ctx.lineWidth = 2;
        
        for (const platform of this.level.platforms) {
            const screenX = platform.x - this.cameraX;
            
            if (screenX > -platform.width && screenX < this.canvas.width) {
                // Platform fill
                this.ctx.fillRect(screenX, platform.y, platform.width, platform.height);
                
                // Platform outline
                this.ctx.strokeRect(screenX, platform.y, platform.width, platform.height);
                
                // Platform highlight
                this.ctx.fillStyle = '#f0f0f0';
                this.ctx.fillRect(screenX, platform.y, platform.width, 3);
                this.ctx.fillStyle = '#d0d0d0';
            }
        }
    }
    
    /**
     * Draw player as rotating cube
     */
    drawPlayer() {
        this.ctx.save();
        
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y + this.player.height / 2;
        
        // Translate to center for rotation
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate((this.player.rotation * Math.PI) / 180);
        
        // Draw cube with glow effect
        this.ctx.shadowColor = this.player.color;
        this.ctx.shadowBlur = 15;
        
        // Main cube
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(
            -this.player.width / 2,
            -this.player.height / 2,
            this.player.width,
            this.player.height
        );
        
        // Cube face details
        this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = '#e0e0e0';
                this.ctx.fillRect(
                    -this.player.width / 2 + 5,
                    -this.player.height / 2 + 5,
                    this.player.width - 10,
                    this.player.height - 10
                );
        
        // Cube edges
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            -this.player.width / 2,
            -this.player.height / 2,
            this.player.width,
            this.player.height
        );
        
        this.ctx.restore();
    }
    
    /**
     * Draw particle effects
     */
    drawParticles() {
        for (const particle of this.particles) {
            const alpha = particle.life / particle.maxLife;
            this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 5;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Draw UI elements
     */
    drawUI() {
        const logicalWidth = this.canvas.offsetWidth || 1200;
        const logicalHeight = this.canvas.offsetHeight || 600;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Distance: ${this.distance}m`, 20, 40);
        this.ctx.fillText(`High Score: ${this.highScore}m`, 20, 70);
        
        if (this.gameState === 'dead') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('DEAD', logicalWidth / 2, logicalHeight / 2);
            this.ctx.fillStyle = '#e0e0e0';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText('Press SPACE or CLICK to restart', logicalWidth / 2, logicalHeight / 2 + 50);
        } else if (this.gameState === 'win') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('VICTORY!', logicalWidth / 2, logicalHeight / 2);
        }
    }
    
    /**
     * Start the game
     */
    startGame() {
        if (this.gameState === 'playing') return; // Already playing
        
        console.log('Game.startGame() called, current state:', this.gameState);
        this.gameState = 'playing';
        this.cameraX = 0;
        this.player.y = this.player.groundY;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        this.player.rotation = 0;
        this.score = 0;
        this.distance = 0;
        this.particles = [];
        this.startBackgroundMusic();
        this.hideStartScreen();
        console.log('Game started, state is now:', this.gameState);
    }
    
    /**
     * Handle player death
     */
    die() {
        if (this.gameState === 'dead') return;
        
        this.gameState = 'dead';
        this.playDeathSound();
        
        // Death animation particles
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                maxLife: 30,
                size: 5 + Math.random() * 5,
                color: '#ffffff'
            });
        }
        
        // Check high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore(this.highScore);
        }
        
        this.showGameOverScreen();
    }
    
    /**
     * Handle level completion
     */
    win() {
        this.gameState = 'win';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore(this.highScore);
        }
    }
    
    /**
     * Restart game
     */
    restart() {
        this.startGame();
        this.hideGameOverScreen();
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (!document.hidden) {
            this.update();
            this.render();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * UI Helper functions
     */
    hideStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'none';
            console.log('Start screen hidden');
        } else {
            console.warn('Start screen element not found');
        }
    }
    
    showGameOverScreen() {
        const gameOverScreen = document.getElementById('gameOverScreen');
        const finalScore = document.getElementById('finalScore');
        const newHighScore = document.getElementById('newHighScore');
        
        if (gameOverScreen) gameOverScreen.style.display = 'block';
        if (finalScore) finalScore.textContent = `Distance: ${this.distance}m`;
        if (newHighScore && this.score > this.loadHighScore()) {
            newHighScore.style.display = 'block';
        }
    }
    
    hideGameOverScreen() {
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) gameOverScreen.style.display = 'none';
    }
    
    /**
     * High score management
     */
    loadHighScore() {
        try {
            const stored = localStorage.getItem('geometryDashHighScore');
            return stored ? parseInt(stored, 10) : 0;
        } catch (e) {
            return 0;
        }
    }
    
    saveHighScore(score) {
        try {
            localStorage.setItem('geometryDashHighScore', score.toString());
        } catch (e) {
            console.error('Failed to save high score:', e);
        }
    }
}

// Global game instance
let gameInstance = null;

// Initialize game function
function initGame() {
    if (gameInstance) {
        return; // Already initialized
    }
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    try {
        gameInstance = new GeometryDashGame(canvas);
        window.gameInstance = gameInstance;
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('Error initializing game: ' + error.message);
    }
}

// Start game function - simplified and direct
function startGame() {
    console.log('startGame() called');
    
    // Get instance
    const instance = gameInstance || window.gameInstance;
    
    if (!instance) {
        console.log('No game instance, initializing...');
        initGame();
        // Try again after initialization
        setTimeout(() => {
            const retryInstance = gameInstance || window.gameInstance;
            if (retryInstance) {
                console.log('Starting game after initialization');
                retryInstance.startGame();
            } else {
                alert('Failed to start game. Please refresh the page.');
            }
        }, 100);
        return;
    }
    
    // Start the game
    console.log('Starting game with instance');
    try {
        instance.startGame();
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Error starting game: ' + error.message);
    }
}

function restartGame() {
    // Try multiple ways to access game instance
    const instance = gameInstance || window.gameInstance;
    if (instance) {
        instance.restart();
    } else {
        // If game instance doesn't exist yet, wait and try again
        setTimeout(() => {
            const retryInstance = gameInstance || window.gameInstance;
            if (retryInstance) {
                retryInstance.restart();
            } else {
                console.error('Game instance not found. Please refresh the page.');
            }
        }, 200);
    }
}

// Initialize when DOM is ready
function setupGame() {
    // Initialize game
    initGame();
    
    // Setup button handlers
    const startButton = document.getElementById('startButton');
    if (startButton) {
        // Remove any existing handlers and add new one
        startButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Start button clicked via onclick handler');
            startGame();
            return false;
        };
        
        // Also add event listener as backup
        startButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Start button clicked via event listener');
            startGame();
        });
        
        console.log('Start button handlers attached');
    } else {
        console.warn('Start button not found');
    }
    
    // Allow clicking canvas to start
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('click', function(e) {
            const instance = gameInstance || window.gameInstance;
            if (instance && instance.gameState === 'start') {
                console.log('Canvas clicked, starting game');
                instance.startGame();
            }
        });
    }
}

// Run setup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGame);
} else {
    // DOM already loaded
    setupGame();
}

