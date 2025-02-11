class DinoShape {
    constructor() {
        // Define the face shape points - made longer and wider at top
        this.facePoints = [
            {x: -0.35, y: -0.4},   // Top left
            {x: 0.35, y: -0.4},    // Top right
            {x: 0.35, y: 0.6},     // Bottom right (extended down)
            {x: -0.35, y: 0.6}     // Bottom left (extended down)
        ];
        
        // Define the eyes - moved to top corners
        this.eyePositions = [
            {x: -0.25, y: -0.3},  // Left eye
            {x: 0.25, y: -0.3}    // Right eye
        ];

        // Define the horn on top
        this.hornPosition = {x: 0, y: -0.45};
        
        // Define nostrils - two little curves
        this.nostrilPositions = [
            {x: -0.1, y: 0.2},  // Left nostril (moved down)
            {x: 0.1, y: 0.2}    // Right nostril (moved down)
        ];
        
        // Define smile curve points - moved down
        this.smileCenter = {x: 0, y: 0.35};
    }

    // Transform the shape based on size and animation with extra rounding
    transform(point, size, wobble = 0) {
        return {
            x: point.x * size * (1 + Math.sin(wobble) * 0.1),
            y: point.y * size * (1 + Math.cos(wobble * 0.7) * 0.1)
        };
    }
}

class CatVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.isPlaying = false;
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.cats = [];
        this.particles = [];
        this.waves = [];
        this.rings = [];
        this.hue = 0;
        this.time = 0;
        this.tunnelDepth = 0;
        this.catRotation = 0;
        this.baseRadius = 0; // Store the base radius for pulsing
        this.pulsePhase = 0; // Track pulse phase
        this.dinoPhase = 0; // For dino's vibing animation
        this.dinoShape = new DinoShape(); // Add the dino shape helper
        this.lastAudioData = new Array(32).fill(0);
        this.energyHistory = new Array(10).fill(0);
        this.peakDetected = false;
        this.setupCanvas();
        this.setupEventListeners();
        this.createCats();
        this.createParticles();
        this.createWaves();
        this.createRings();
        this.audioFile = 'Flume - Sleepless feat. Jezzabell Doran (Official).mp3';
        
        // Initialize audio context but keep it suspended
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.connect(this.audioContext.destination);
        
        // Start animation immediately
        this.animate();
        
        // Load audio in background
        this.loadAudio().catch(err => {
            console.error('Failed to load audio:', err);
            alert('Failed to load audio file. Please check if the file exists and try again.');
        });
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }

    setupEventListeners() {
        const playButton = document.getElementById('playButton');
        playButton.addEventListener('click', () => this.togglePlay());
    }

    createCats() {
        const numCats = 16;
        this.baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.22; // Keep the 10% size increase
        
        for (let i = 0; i < numCats; i++) {
            const angle = (i / numCats) * Math.PI * 2;
            const x = Math.cos(angle) * this.baseRadius;
            const y = Math.sin(angle) * this.baseRadius;
            
            this.cats.push({
                angle: angle,
                radius: this.baseRadius,
                baseRadius: this.baseRadius,
                x: this.canvas.width / 2 + x,
                y: this.canvas.height / 2 + y,
                size: 30,
                rotation: angle + Math.PI / 2, // Face outward
                baseRotation: angle + Math.PI / 2,
                z: 0,
                baseZ: 0,
                pulseOffset: Math.random() * Math.PI * 2,
                circleX: x, // Store circle coordinates for animation
                circleY: y
            });
        }
    }

    createWaves() {
        const numWaves = 3;
        for (let i = 0; i < numWaves; i++) {
            this.waves.push({
                amplitude: 50 + Math.random() * 50,
                frequency: 0.002 + Math.random() * 0.003,
                phase: Math.random() * Math.PI * 2,
                speed: 0.001 + Math.random() * 0.002
            });
        }
    }

    createParticles() {
        const numParticles = 100; // Increased number of particles
        for (let i = 0; i < numParticles; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 4 + 2,
                speedX: 0,
                speedY: 0,
                angle: Math.random() * Math.PI * 2,
                hue: Math.random() * 360,
                originalX: 0,
                originalY: 0
            });
        }
    }

    createRings() {
        const numRings = 15;
        for (let i = 0; i < numRings; i++) {
            this.rings.push({
                z: i * (1000 / numRings),
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                distortion: Math.random() * 0.2
            });
        }
    }

    async loadAudio() {
        try {
            console.log('Loading audio file:', this.audioFile);
            const response = await fetch(this.audioFile);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Store the decoded buffer
            this.audioBuffer = audioBuffer;
            
            console.log('Audio loaded successfully');
        } catch (error) {
            console.error('Error loading audio:', error);
            alert('Error loading audio file. Please check the console for details.');
            throw error;
        }
    }

    async initAudio() {
        try {
            if (!this.audioBuffer) {
                await this.loadAudio();
            }
            
            // Create new audio source
            if (this.source) {
                this.source.disconnect();
            }
            
            this.source = this.audioContext.createBufferSource();
            this.source.buffer = this.audioBuffer;
            this.source.connect(this.analyser);
            
            await this.audioContext.resume();
            this.source.start(0);
            this.isPlaying = true;
            document.getElementById('playButton').textContent = 'Pause';
            
            console.log('Audio playback started');
        } catch (error) {
            console.error('Error initializing audio:', error);
            alert('Error playing audio. Please try again.');
            throw error;
        }
    }

    async togglePlay() {
        try {
            if (this.isPlaying) {
                await this.audioContext.suspend();
                this.isPlaying = false;
                document.getElementById('playButton').textContent = 'Play';
            } else {
                if (!this.source || !this.source.buffer) {
                    await this.initAudio();
                } else {
                    await this.audioContext.resume();
                    this.isPlaying = true;
                    document.getElementById('playButton').textContent = 'Pause';
                }
            }
        } catch (error) {
            console.error('Error toggling playback:', error);
            alert('Error with audio playback. Please refresh the page and try again.');
        }
    }

    drawCat(x, y, size, rotation) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        
        // Draw cat face with gradient
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size/2);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FFA500');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw ears with gradient
        const earGradient = this.ctx.createLinearGradient(0, -size, 0, -size/2);
        earGradient.addColorStop(0, '#FFD700');
        earGradient.addColorStop(1, '#FFA500');
        this.ctx.fillStyle = earGradient;
        
        // Left ear
        this.ctx.beginPath();
        this.ctx.moveTo(-size/2, -size/2);
        this.ctx.lineTo(-size/4, -size);
        this.ctx.lineTo(0, -size/2);
        this.ctx.fill();
        
        // Right ear
        this.ctx.beginPath();
        this.ctx.moveTo(size/2, -size/2);
        this.ctx.lineTo(size/4, -size);
        this.ctx.lineTo(0, -size/2);
        this.ctx.fill();
        
        // Draw eyes with shine
        this.ctx.fillStyle = '#000';
        [-1, 1].forEach(side => {
            this.ctx.beginPath();
            this.ctx.arc(side * size/6, -size/8, size/8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add eye shine
            this.ctx.fillStyle = '#FFF';
            this.ctx.beginPath();
            this.ctx.arc(side * size/6 - size/16, -size/8 - size/16, size/16, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#000';
        });
        
        // Draw nose
        this.ctx.fillStyle = '#FF69B4';
        this.ctx.beginPath();
        this.ctx.arc(0, size/8, size/10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw whiskers with glow
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 2;
        
        [-1, 1].forEach(side => {
            // Draw multiple whiskers with slight angle variations
            [0, 0.2, -0.2].forEach(angleOffset => {
                this.ctx.beginPath();
                this.ctx.moveTo(side * size/4, size/8);
                const angle = (side === 1 ? 0 : Math.PI) + angleOffset;
                this.ctx.lineTo(
                    side * size/4 + Math.cos(angle) * size/2,
                    size/8 + Math.sin(angle) * size/4
                );
                this.ctx.stroke();
            });
        });
        
        this.ctx.restore();
    }

    calculateDynamics(dataArray) {
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const variance = dataArray.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / dataArray.length;
        const change = dataArray.reduce((acc, val, i) => acc + Math.abs(val - (this.lastAudioData[i] || 0)), 0) / dataArray.length;
        
        // Update last audio data
        this.lastAudioData = [...dataArray];
        
        // Calculate energy level with more dramatic scaling (increased by 10%)
        const energy = Math.pow(average / 255, 1.4); // Reduced from 1.5 to make it more sensitive
        
        // Update energy history
        this.energyHistory.push(energy);
        this.energyHistory.shift();
        
        // Detect peaks for dramatic moments (increased sensitivity by 10%)
        const currentEnergy = this.energyHistory[this.energyHistory.length - 1];
        const averageEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
        this.peakDetected = currentEnergy > averageEnergy * 1.35 && currentEnergy > 0.54; // Reduced thresholds by 10%

        return {
            intensity: energy * 1.1, // Increase base intensity by 10%
            variance: Math.pow(variance / (255 * 255), 0.63), // More pronounced variance (reduced from 0.7)
            change: Math.pow(change / 255, 0.45), // More pronounced change (reduced from 0.5)
            isPeak: this.peakDetected
        };
    }

    drawPalmTree(x, y, height, perspective, dynamics) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Add music-reactive swaying
        const swayAmount = 0.2 + dynamics.intensity * 0.3;
        const sway = Math.sin(this.time * 2) * swayAmount;
        this.ctx.rotate(sway);
        
        // Draw trunk with more realistic texture
        const trunkWidth = 20 * perspective;
        const trunkGradient = this.ctx.createLinearGradient(0, 0, 0, -height);
        trunkGradient.addColorStop(0, '#8B4513');  // More saturated brown at bottom
        trunkGradient.addColorStop(0.3, '#A0522D');
        trunkGradient.addColorStop(0.7, '#6B4423');
        trunkGradient.addColorStop(1, '#8B4513');  // Match bottom color for seamless texture
        
        // Draw main trunk
        this.ctx.fillStyle = trunkGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(-trunkWidth/2, 0);
        
        // Create curved trunk with slight bend
        const bendAmount = Math.sin(this.time) * 10 * perspective;
        this.ctx.bezierCurveTo(
            -trunkWidth/2 + bendAmount, -height * 0.33,
            -trunkWidth/2 + bendAmount, -height * 0.66,
            -trunkWidth/3, -height
        );
        this.ctx.lineTo(trunkWidth/3, -height);
        this.ctx.bezierCurveTo(
            trunkWidth/2 + bendAmount, -height * 0.66,
            trunkWidth/2 + bendAmount, -height * 0.33,
            trunkWidth/2, 0
        );
        this.ctx.closePath();
        this.ctx.fill();

        // Add trunk texture
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 1 * perspective;
        for (let i = 0; i < 8; i++) {
            const yPos = (-height * i / 8);
            const xOffset = Math.sin(this.time * 2 + i) * 3 * perspective;
            this.ctx.beginPath();
            this.ctx.moveTo(-trunkWidth/2 + xOffset, yPos);
            this.ctx.lineTo(trunkWidth/2 + xOffset, yPos);
            this.ctx.stroke();
        }

        // Draw palm fronds (20% smaller)
        const numFronds = 10;  // Reduced number of fronds for more iconic look
        const frondLength = height * 0.64;  // 20% smaller than original 0.8
        
        // Create gradient for fronds
        const frondGradient = this.ctx.createLinearGradient(0, -height, frondLength, -height);
        frondGradient.addColorStop(0, '#228B22');  // Forest green at base
        frondGradient.addColorStop(0.4, '#32CD32');  // Lime green in middle
        frondGradient.addColorStop(1, '#90EE90');  // Light green at tips
        
        this.ctx.strokeStyle = frondGradient;
        this.ctx.lineWidth = 6 * perspective; // Slightly thinner fronds
        this.ctx.lineCap = 'round';
        
        for (let i = 0; i < numFronds; i++) {
            const baseAngle = (i / numFronds) * Math.PI * 2;
            const frondSway = Math.sin(this.time * 2 + baseAngle) * 0.2 * (1 + dynamics.intensity * 0.5);
            const angle = baseAngle + frondSway;
            
            // Draw main frond stem with more curve
            this.ctx.beginPath();
            this.ctx.moveTo(0, -height);
            
            // Create curved frond with adjusted control points for more iconic curve
            const cp1x = Math.cos(angle) * frondLength * 0.4;
            const cp1y = -height + Math.sin(angle) * frondLength * 0.2;
            const cp2x = Math.cos(angle) * frondLength * 0.7;
            const cp2y = -height + Math.sin(angle) * frondLength * 0.5;
            const endX = Math.cos(angle) * frondLength;
            const endY = -height + Math.sin(angle) * frondLength;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            this.ctx.stroke();
            
            // Add smaller leaflets along the frond (20% smaller)
            const numLeaflets = 6; // Reduced number of leaflets
            this.ctx.lineWidth = 2 * perspective; // Thinner leaflets
            
            for (let j = 1; j < numLeaflets; j++) {
                const t = j / numLeaflets;
                const leafX = Math.cos(angle) * frondLength * t;
                const leafY = -height + Math.sin(angle) * frondLength * t;
                const leafLength = frondLength * 0.16; // 20% smaller than original 0.2
                const leafAngle = angle + Math.PI/3 * (j % 2 ? 1 : -1); // Wider angle for more iconic look
                
                this.ctx.beginPath();
                this.ctx.moveTo(leafX, leafY);
                this.ctx.lineTo(
                    leafX + Math.cos(leafAngle) * leafLength,
                    leafY + Math.sin(leafAngle) * leafLength
                );
                this.ctx.stroke();
            }
        }
        
        // Add highlight/glow during peaks
        if (dynamics.isPeak) {
            this.ctx.shadowColor = '#32CD32';
            this.ctx.shadowBlur = 15 * perspective; // Slightly reduced glow
            this.ctx.strokeStyle = '#90EE90';
            this.ctx.lineWidth = 2 * perspective;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawTunnel(dynamics) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Update tunnel depth
        this.tunnelDepth += (2 + dynamics.intensity * 8);
        
        // Draw palm trees along the tunnel
        const numPalmPairs = 8;
        for (let i = 0; i < numPalmPairs; i++) {
            const z = ((this.tunnelDepth + (i * 200)) % 1600) - 400;
            const perspective = 1000 / (1000 + z);
            const xOffset = this.canvas.width * 0.4;
            const height = 200 * perspective;
            
            // Left palm tree
            this.drawPalmTree(
                centerX - xOffset * perspective,
                centerY + 100 * perspective,
                height,
                perspective,
                dynamics
            );
            
            // Right palm tree
            this.drawPalmTree(
                centerX + xOffset * perspective,
                centerY + 100 * perspective,
                height,
                perspective,
                dynamics
            );
        }
        
        // Draw each ring with plasma effect
        this.rings.forEach((ring, index) => {
            // Update ring position and rotation
            ring.z -= (4 + dynamics.intensity * 12);
            ring.rotation += ring.rotationSpeed * (1 + dynamics.intensity);
            
            // Reset ring when it gets too close
            if (ring.z < -50) {
                ring.z = 1000;
                ring.rotation = Math.random() * Math.PI * 2;
            }
            
            // Calculate ring properties based on z-position
            const perspective = 1000 / (1000 + ring.z);
            const size = perspective * Math.min(this.canvas.width, this.canvas.height) * 
                        (0.8 + dynamics.intensity * 0.4);
            
            // Draw the plasma ring
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(ring.rotation);
            
            // Create multiple thin rings for plasma effect
            const numLayers = 3;
            for (let layer = 0; layer < numLayers; layer++) {
                const layerSize = size * (1 + layer * 0.02);
                const segments = 64; // Increased segments for smoother curves
                this.ctx.beginPath();
                
                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    const timeOffset = this.time * (1 + layer * 0.5);
                    const distortion = dynamics.isPeak ? 
                        (1 + Math.sin(angle * 12 + timeOffset) * 0.15) : 
                        (1 + Math.sin(angle * 6 + timeOffset) * ring.distortion * 0.8);
                    
                    const x = Math.cos(angle) * layerSize * distortion;
                    const y = Math.sin(angle) * layerSize * distortion;
                    
                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                
                this.ctx.closePath();
                
                // Create plasma-like gradient with enhanced purple dynamics
                const baseHue = 270 + (dynamics.intensity * 30); // Purple base that shifts with intensity
                const hueOffset = (layer * 20 + index * 5 + this.time * 10) % 60; // More dynamic hue variation
                const intensity = dynamics.isPeak ? 80 : 50 + (dynamics.intensity * 20);
                const saturation = 90 + (dynamics.change * 10); // Dynamic saturation
                const layerOpacity = perspective * (dynamics.isPeak ? 0.5 : 0.3) * (1 - layer * 0.2);
                
                // Create more ethereal gradient with music-reactive colors
                const gradient = this.ctx.createLinearGradient(-layerSize, -layerSize, layerSize, layerSize);
                gradient.addColorStop(0, `hsla(${baseHue + hueOffset}, ${saturation}%, ${intensity + 20}%, ${layerOpacity})`);
                gradient.addColorStop(0.3, `hsla(${baseHue - 40 + hueOffset}, ${saturation - 10}%, ${intensity + 10}%, ${layerOpacity * 0.8})`);
                gradient.addColorStop(0.7, `hsla(${baseHue + 20 + hueOffset}, ${saturation - 5}%, ${intensity + 15}%, ${layerOpacity * 0.9})`);
                gradient.addColorStop(1, `hsla(${baseHue + 60 + hueOffset}, ${saturation}%, ${intensity + 5}%, ${layerOpacity})`);
                
                // Draw thinner lines with enhanced glow
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = 1 + perspective * 3 * (1 + dynamics.intensity) * (1 - layer * 0.2);
                this.ctx.stroke();
                
                // Add enhanced glow effect
                if (dynamics.isPeak) {
                    const peakHue = baseHue + Math.sin(this.time * 5) * 30;
                    this.ctx.shadowColor = `hsla(${peakHue}, ${saturation + 10}%, 70%, ${layerOpacity * 1.2})`;
                    this.ctx.shadowBlur = 15 * perspective * (1 + dynamics.intensity);
                    this.ctx.stroke();
                }
            }
            
            this.ctx.restore();
        });
    }

    drawDinosaur(centerX, centerY, dynamics) {
        this.ctx.save();
        
        // Vibe animation
        this.dinoPhase += 0.1 * (1 + dynamics.intensity);
        const bobAmount = 20 * (1 + dynamics.intensity * 0.5);
        const bobY = Math.sin(this.dinoPhase) * bobAmount;
        const tiltAmount = 0.2 * (1 + dynamics.intensity * 0.3);
        const tilt = Math.sin(this.dinoPhase * 0.7) * tiltAmount;
        
        // Move to center and apply animations
        this.ctx.translate(centerX, centerY + bobY);
        this.ctx.rotate(tilt);
        
        const baseSize = Math.min(this.canvas.width, this.canvas.height) * 0.2;
        const pulseSize = baseSize * (1 + dynamics.intensity * 0.2);
        
        // Draw the main face shape with rounded corners
        this.ctx.fillStyle = '#90EE90';  // Light green
        this.ctx.beginPath();
        
        // Create symmetrical shape with rounded corners
        const cornerRadius = pulseSize * 0.2; // Corner radius
        const topWidth = pulseSize * 0.7;
        const bottomWidth = pulseSize * 0.9; // Wider at bottom
        const height = pulseSize * 1;
        const topX = -topWidth / 2;
        const bottomX = -bottomWidth / 2;
        const y = -height / 2;
        
        // Top edge
        this.ctx.moveTo(topX + cornerRadius, y);
        this.ctx.lineTo(topX + topWidth - cornerRadius, y);
        this.ctx.quadraticCurveTo(topX + topWidth, y, topX + topWidth, y + cornerRadius);
        
        // Right edge (angled)
        const rightControlX = topX + topWidth;
        const rightControlY = y + height/2;
        this.ctx.quadraticCurveTo(
            rightControlX,
            rightControlY,
            bottomX + bottomWidth,
            y + height - cornerRadius
        );
        
        // Bottom edge with rounded corners
        this.ctx.quadraticCurveTo(bottomX + bottomWidth, y + height, bottomX + bottomWidth - cornerRadius, y + height);
        this.ctx.lineTo(bottomX + cornerRadius, y + height);
        this.ctx.quadraticCurveTo(bottomX, y + height, bottomX, y + height - cornerRadius);
        
        // Left edge (angled)
        const leftControlX = topX;
        const leftControlY = y + height/2;
        this.ctx.quadraticCurveTo(
            leftControlX,
            leftControlY,
            topX,
            y + cornerRadius
        );
        
        // Close the shape
        this.ctx.quadraticCurveTo(topX, y, topX + cornerRadius, y);
        
        this.ctx.closePath();
        this.ctx.fill();

        // Draw the horn on top
        const hornPos = this.dinoShape.transform(this.dinoShape.hornPosition, pulseSize, this.dinoPhase);
        this.ctx.fillStyle = '#90EE90';
        this.ctx.beginPath();
        this.ctx.arc(hornPos.x, hornPos.y, pulseSize * 0.1, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw big round eyes
        const eyeSize = pulseSize * 0.203;  // Increased by 20% from 0.169
        this.dinoShape.eyePositions.forEach(eyePos => {
            const transformedPos = this.dinoShape.transform(eyePos, pulseSize, this.dinoPhase);
            
            // White background
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(
                transformedPos.x,
                transformedPos.y,
                eyeSize,
                0, Math.PI * 2
            );
            this.ctx.fill();
            
            // Black outline
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Pie-cut pupils that bounce with the music
            this.ctx.fillStyle = 'black';
            const pupilBounce = Math.sin(this.dinoPhase) * eyeSize * 0.1;
            
            // Draw pie-cut pupil (pac-man style)
            this.ctx.beginPath();
            const pupilSize = eyeSize * 0.5;  // Slightly larger pupil
            const startAngle = Math.PI * 0.1;  // Start slightly after 0
            const endAngle = Math.PI * 1.9;    // End slightly before 2π
            this.ctx.arc(
                transformedPos.x,
                transformedPos.y + pupilBounce,
                pupilSize,
                startAngle,
                endAngle
            );
            this.ctx.lineTo(transformedPos.x, transformedPos.y + pupilBounce);
            this.ctx.closePath();
            this.ctx.fill();
        });

        // Draw nostrils
        // Calculate nostril positions based on the face shape
        const nostrilOffset = bottomWidth * 0.3; // Distance from center
        const nostrilY = y + height - cornerRadius * 1.2; // Just above the bottom corner rounding
        
        // Draw left nostril
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(
            bottomX + nostrilOffset,
            nostrilY,
            pulseSize * 0.05,
            0, Math.PI,
            false
        );
        this.ctx.stroke();
        
        // Draw right nostril
        this.ctx.beginPath();
        this.ctx.arc(
            bottomX + bottomWidth - nostrilOffset,
            nostrilY,
            pulseSize * 0.05,
            0, Math.PI,
            false
        );
        this.ctx.stroke();

        // Add glow effect during peaks
        if (dynamics.isPeak) {
            this.ctx.shadowColor = '#32CD32';
            this.ctx.shadowBlur = 20;
            this.ctx.strokeStyle = '#32CD32';
            this.ctx.lineWidth = 5;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawBackground(dataArray) {
        const dynamics = this.calculateDynamics(dataArray);
        const intensityEffect = Math.pow(dynamics.intensity, 1.5);
        
        // Clear with fade effect
        this.ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + dynamics.change * 0.2})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.globalCompositeOperation = 'lighter';
        
        // Draw tunnel first
        this.drawTunnel(dynamics);
        
        // Draw particles with tunnel-like movement
        this.particles.forEach((particle, index) => {
            // Calculate particle position in 3D space
            const angle = particle.angle;
            const radius = this.canvas.height * 0.4 * (1 + Math.sin(this.time + particle.hue * 0.1) * 0.2);
            const z = ((this.time * 100 + particle.hue * 10) % 1000) - 500;
            
            const perspective = 1000 / (1000 + z);
            const x = this.canvas.width/2 + Math.cos(angle) * radius * perspective;
            const y = this.canvas.height/2 + Math.sin(angle) * radius * perspective;
            
            // Update particle properties
            particle.x = x;
            particle.y = y;
            particle.angle += 0.02 * (1 + dynamics.intensity);
            
            // Draw enhanced particle
            const freq = dataArray[index % dataArray.length] / 255;
            const size = particle.size * perspective * (1 + dynamics.intensity * 2);
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 2);
            const hue = (particle.hue + this.hue) % 360;
            const opacity = perspective * (dynamics.isPeak ? 0.9 : 0.6) * (freq + 0.2);
            
            gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${opacity})`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        });

        // Update time and colors with increased reactivity
        this.time += 0.011 * (1 + dynamics.intensity * 1.1);
        this.hue = (this.hue + (0.55 + dynamics.change * 2.2)) % 360;
    }

    drawCavemanText(text, x, y, dynamics) {
        this.ctx.save();
        
        // Set up the chunky, rough text style
        const baseSize = Math.min(this.canvas.width, this.canvas.height) * 0.05;
        const fontSize = baseSize * (1 + dynamics.intensity * 0.1);
        this.ctx.font = `bold ${fontSize}px Arial`;
        
        // Center text alignment
        this.ctx.textAlign = 'center'; // Add text alignment for proper centering
        
        // Create rocky texture effect
        this.ctx.strokeStyle = '#8B4513';  // Dark brown outline
        this.ctx.lineWidth = 3;
        this.ctx.lineJoin = 'round';
        this.ctx.miterLimit = 2;
        
        // Add slight wobble animation
        const wobble = Math.sin(this.time * 2) * 2;
        this.ctx.translate(x + wobble, y);
        this.ctx.rotate(Math.sin(this.time) * 0.02);
        
        // Create stone texture gradient
        const gradient = this.ctx.createLinearGradient(0, -fontSize/2, 0, fontSize/2);
        gradient.addColorStop(0, '#D2B48C');    // Light sandy color
        gradient.addColorStop(0.4, '#8B4513');  // Dark brown
        gradient.addColorStop(0.6, '#A0522D');  // Medium brown
        gradient.addColorStop(1, '#6B4423');    // Darker brown
        
        // Draw the text with rough edges
        this.ctx.fillStyle = gradient;
        
        // Add chunky shadow
        this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;
        
        // Draw the main text
        this.ctx.fillText(text, 0, 0);
        this.ctx.strokeText(text, 0, 0);
        
        // Add highlight during peaks
        if (dynamics.isPeak) {
            this.ctx.shadowColor = '#FFA500';
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 2;
            this.ctx.strokeText(text, 0, 0);
        }
        
        this.ctx.restore();
    }

    animate() {
        let dataArray;
        
        if (this.analyser) {
            const bufferLength = this.analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            this.analyser.getByteFrequencyData(dataArray);
        } else {
            // Provide default values when audio isn't playing
            dataArray = new Uint8Array(32).fill(50); // Moderate default activity
        }

        // Draw trippy background first
        this.drawBackground(dataArray);

        // Reset composite operation for cats and dino
        this.ctx.globalCompositeOperation = 'source-over';

        const dynamics = this.calculateDynamics(dataArray);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw the dinosaur in the center
        this.drawDinosaur(centerX, centerY, dynamics);

        // Update global cat rotation and pulse (10% more reactive)
        this.catRotation += 0.011 * (1 + dynamics.intensity * 2.2);
        this.pulsePhase += 0.033 * (1 + dynamics.intensity);
        
        if (dynamics.isPeak) {
            this.catRotation += 0.055; // Extra rotation during peaks
        }

        // Calculate ring pulse with increased sensitivity
        const basePulse = Math.sin(this.pulsePhase) * 0.22;
        const dynamicPulse = dynamics.intensity * 0.44;
        const peakPulse = dynamics.isPeak ? Math.sin(this.time * 8.8) * 0.22 : 0;
        const totalPulse = 1 + basePulse + dynamicPulse + peakPulse;

        // Draw cats in circular formation
        this.cats.forEach((cat, i) => {
            const frequency = dataArray[i % dataArray.length];
            const scale = (frequency / 255) * 1.1; // Increase scale sensitivity
            
            // Individual cat pulse based on its frequency (10% more reactive)
            const individualPulse = Math.sin(this.time * 4.4 + cat.pulseOffset) * scale * 0.22;
            
            // Update cat's position in 3D space with enhanced movement
            cat.z = cat.baseZ + Math.sin(this.time * 2.2 + cat.angle) * 220 * dynamics.intensity;
            const perspective = 1000 / (1000 + cat.z);
            
            // Calculate circular position with combined pulse effects
            const radiusScale = totalPulse + individualPulse;
            const scaledX = cat.circleX * radiusScale * perspective;
            const scaledY = cat.circleY * radiusScale * perspective;
            
            // Add spiral motion during peaks (10% more dramatic)
            let spiralX = 0;
            let spiralY = 0;
            if (dynamics.isPeak) {
                const spiralRadius = 22 * Math.sin(this.time * 4.4);
                const spiralAngle = this.time * 3.3 + cat.angle;
                spiralX = Math.cos(spiralAngle) * spiralRadius;
                spiralY = Math.sin(spiralAngle) * spiralRadius;
            }
            
            // Update position
            cat.x = centerX + scaledX + spiralX;
            cat.y = centerY + scaledY + spiralY;
            
            // Calculate cat's rotation (10% more reactive)
            const rotationOffset = Math.sin(this.time * 4.4 + cat.angle) * 0.55 * dynamics.intensity;
            const peakRotation = dynamics.isPeak ? Math.sin(this.time * 8.8 + cat.angle) * 0.33 : 0;
            cat.rotation = cat.baseRotation + rotationOffset + scale * 0.55 + peakRotation;
            
            // Scale based on perspective and music (10% more reactive)
            const baseSize = cat.size * (1 + scale * 0.33);
            const pulseSize = baseSize * (1 + dynamics.intensity * 0.22);
            const dynamicSize = pulseSize * perspective;
            
            // Enhanced glow effect during peaks (10% more intense)
            if (dynamics.isPeak) {
                const glowIntensity = 0.55 + Math.sin(this.time * 8.8) * 0.33;
                this.ctx.shadowColor = `hsla(${(this.hue + i * 33) % 360}, 100%, 50%, ${glowIntensity})`;
                this.ctx.shadowBlur = 22 + Math.sin(this.time * 11) * 11;
            } else {
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
            }
            
            // Draw the cat with all effects applied
            this.drawCat(cat.x, cat.y, dynamicSize, cat.rotation);
        });

        // Draw the caveman text centered at the bottom
        const padding = 20;
        const textY = this.canvas.height - padding;
        const textX = this.canvas.width * 0.5; // Center horizontally
        this.drawCavemanText("DINO-VIS", textX, textY, dynamics);

        // Update time and colors with increased reactivity
        this.time += 0.011 * (1 + dynamics.intensity * 1.1);
        this.hue = (this.hue + (0.55 + dynamics.change * 2.2)) % 360;

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the visualizer when the page loads
window.addEventListener('load', () => {
    new CatVisualizer();
}); 