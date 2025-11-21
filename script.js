// ADDED BY AGENT: 2024 - Main JavaScript for navigation and cinematic background

/**
 * Initialize navigation menu
 */
function initNavigation() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', !isExpanded);
      navLinks.classList.toggle('active');
    });
    
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('active');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('active');
      }
    });
  }
  
  // Set active nav link based on current page
  const currentPage = window.location.pathname.split('/').pop() || 'Index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPage || 
        (currentPage === '' && link.getAttribute('href') === 'Index.html')) {
      link.classList.add('active');
    }
  });
}

/**
 * Create cinematic canvas background animation
 * Falls back to canvas if video is not available
 */
function initCinematicBackground() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  
  // Check if video background exists
  const video = hero.querySelector('.hero__bg');
  if (video && video.tagName === 'VIDEO') {
    // Video background - ensure it plays
    video.addEventListener('loadedmetadata', () => {
      video.play().catch(e => {
        console.log('Video autoplay prevented, using canvas fallback');
        createCanvasBackground(hero);
      });
    });
    
    // Fallback to canvas if video fails
    video.addEventListener('error', () => {
      createCanvasBackground(hero);
    });
    
    return;
  }
  
  // Create canvas background as fallback
  createCanvasBackground(hero);
}

/**
 * Create procedural canvas animation background
 */
function createCanvasBackground(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__canvas';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '0';
  
  const ctx = canvas.getContext('2d');
  let animationId;
  let particles = [];
  
  function resizeCanvas() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }
  
  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      color: `hsl(0, 0%, ${70 + Math.random() * 30}%)` // Greys and silvers
    };
  }
  
  function initParticles() {
    particles = [];
    const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }
  }
  
  function updateParticles() {
    particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Wrap around edges
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = canvas.height;
      if (particle.y > canvas.height) particle.y = 0;
    });
  }
  
  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(26, 26, 26, 0.8)');
    gradient.addColorStop(0.5, 'rgba(42, 42, 42, 0.6)');
    gradient.addColorStop(1, 'rgba(26, 26, 26, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw particles
    particles.forEach(particle => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.opacity;
      ctx.fill();
    });
    
    // Draw connections between nearby particles
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    
    ctx.globalAlpha = 1;
  }
  
  function animate() {
    if (document.hidden) {
      // Pause animation when page is hidden
      return;
    }
    
    updateParticles();
    drawParticles();
    animationId = requestAnimationFrame(animate);
  }
  
  function startAnimation() {
    resizeCanvas();
    initParticles();
    animate();
  }
  
  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
    initParticles();
  });
  resizeObserver.observe(container);
  
  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !animationId) {
      animate();
    }
  });
  
  container.appendChild(canvas);
  startAnimation();
}

/**
 * Initialize fade-in animations for elements
 */
function initFadeInAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // Skip animations if user prefers reduced motion
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  document.querySelectorAll('section, .hobby-card, .gallery-item').forEach(el => {
    observer.observe(el);
  });
}

/**
 * Initialize all functionality when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCinematicBackground();
  initFadeInAnimations();
});

