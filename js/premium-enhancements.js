/**
 * Premium Enhancements - FREE & Resellable
 * Includes: PWA, Lottie, Custom Cursor, Micro-interactions, Confetti
 */

// ============================================
// PWA REGISTRATION
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ PWA: Service Worker registered', registration.scope);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        showUpdateToast();
                    }
                });
            });
        } catch (error) {
            console.log('⚠️ PWA: Service Worker registration failed', error);
        }
    });
}

// Install prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

function showInstallButton() {
    // Create install banner if doesn't exist
    if (document.getElementById('pwa-install-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
        <div class="pwa-banner-content">
            <span>📱 Namesti aplikacijo za hitrejši dostop</span>
            <button onclick="installPWA()" class="pwa-install-btn">Namesti</button>
            <button onclick="dismissInstallBanner()" class="pwa-dismiss-btn">✕</button>
        </div>
    `;
    document.body.appendChild(banner);
    
    // Animate in
    setTimeout(() => banner.classList.add('visible'), 100);
}

window.installPWA = async function() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('✅ PWA installed');
        showToast('Aplikacija nameščena! 🎉', 'success');
    }
    
    deferredPrompt = null;
    dismissInstallBanner();
};

window.dismissInstallBanner = function() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 300);
    }
};

function showUpdateToast() {
    showToast('Nova verzija je na voljo! Osvežite stran.', 'info', 10000);
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
window.showToast = function(message, type = 'info', duration = 4000) {
    // Remove existing toasts
    document.querySelectorAll('.premium-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `premium-toast toast-${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });
    
    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// ============================================
// CUSTOM CURSOR (Desktop only)
// ============================================
function initCustomCursor() {
    // Skip on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
    
    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    cursor.innerHTML = `
        <div class="cursor-dot"></div>
        <div class="cursor-ring"></div>
    `;
    document.body.appendChild(cursor);
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    // Smooth follow animation
    function animateCursor() {
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        
        cursorX += dx * 0.15;
        cursorY += dy * 0.15;
        
        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    // Hover effects
    const interactiveElements = 'a, button, input, textarea, select, [role="button"], .clickable';
    
    document.querySelectorAll(interactiveElements).forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
    });
    
    // Click effect
    document.addEventListener('mousedown', () => cursor.classList.add('cursor-click'));
    document.addEventListener('mouseup', () => cursor.classList.remove('cursor-click'));
    
    // Hide on mouse leave
    document.addEventListener('mouseleave', () => cursor.classList.add('cursor-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('cursor-hidden'));
}

// ============================================
// LOTTIE ANIMATIONS (Free from LottieFiles)
// ============================================
const LOTTIE_ANIMATIONS = {
    loading: 'https://lottie.host/embed/a35ea7ae-b2f8-4954-8d2d-27e6b7d23b87/9QGwvQMNwi.lottie',
    success: 'https://lottie.host/embed/5e0b8b17-d6b7-48c8-b8ec-24e7fbf0c89e/6Hv5zFYJh0.lottie',
    scissors: 'https://lottie.host/embed/47f2ad4a-f6a0-4e12-b3f0-29e11aafe7b3/rT4lMqhqNR.lottie'
};

window.createLottieAnimation = function(container, animationUrl, options = {}) {
    const {
        width = '100px',
        height = '100px',
        loop = true,
        autoplay = true
    } = options;
    
    const lottieEl = document.createElement('dotlottie-player');
    lottieEl.setAttribute('src', animationUrl);
    lottieEl.setAttribute('background', 'transparent');
    lottieEl.setAttribute('speed', '1');
    lottieEl.style.width = width;
    lottieEl.style.height = height;
    
    if (loop) lottieEl.setAttribute('loop', '');
    if (autoplay) lottieEl.setAttribute('autoplay', '');
    
    if (typeof container === 'string') {
        document.querySelector(container)?.appendChild(lottieEl);
    } else {
        container?.appendChild(lottieEl);
    }
    
    return lottieEl;
};

// ============================================
// CONFETTI EFFECT (Booking success)
// ============================================
window.fireConfetti = function() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10000;
    `;
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#007AFF', '#5AC8FA', '#34C759', '#FF9500', '#FF2D55', '#AF52DE'];
    
    // Create particles
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20 - 10,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            gravity: 0.3 + Math.random() * 0.2
        });
    }
    
    let frame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.x += p.vx;
            p.vy += p.gravity;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            p.vx *= 0.99;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });
        
        frame++;
        if (frame < 180) {
            requestAnimationFrame(animate);
        } else {
            canvas.remove();
        }
    }
    
    animate();
};

// ============================================
// SKELETON LOADERS
// ============================================
window.showSkeleton = function(container, count = 3) {
    const skeletonHTML = `
        <div class="skeleton-loader">
            ${Array(count).fill(`
                <div class="skeleton-item">
                    <div class="skeleton-line skeleton-title"></div>
                    <div class="skeleton-line skeleton-text"></div>
                    <div class="skeleton-line skeleton-text short"></div>
                </div>
            `).join('')}
        </div>
    `;
    
    if (typeof container === 'string') {
        document.querySelector(container).innerHTML = skeletonHTML;
    } else {
        container.innerHTML = skeletonHTML;
    }
};

window.hideSkeleton = function(container) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    const skeleton = el?.querySelector('.skeleton-loader');
    if (skeleton) {
        skeleton.classList.add('fade-out');
        setTimeout(() => skeleton.remove(), 300);
    }
};

// ============================================
// SMOOTH REVEAL ANIMATIONS
// ============================================
function initRevealAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                
                // Stagger children if present
                const children = entry.target.querySelectorAll('.stagger-child');
                children.forEach((child, i) => {
                    child.style.transitionDelay = `${i * 0.1}s`;
                    child.classList.add('revealed');
                });
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// RIPPLE EFFECT FOR BUTTONS
// ============================================
function initRippleEffect() {
    document.addEventListener('click', (e) => {
        const button = e.target.closest('button, .ripple');
        if (!button) return;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
        `;
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
}

// ============================================
// NUMBER COUNTER ANIMATION
// ============================================
window.animateNumber = function(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * eased);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
};

// ============================================
// MAGNETIC BUTTONS
// ============================================
function initMagneticButtons() {
    document.querySelectorAll('.magnetic-btn').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}

// ============================================
// TYPING EFFECT
// ============================================
window.typeWriter = function(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
};

// ============================================
// INIT ALL ENHANCEMENTS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initCustomCursor();
    initRippleEffect();
    initRevealAnimations();
    initMagneticButtons();
    
    console.log('✨ Premium enhancements loaded');
});

// Add Lottie player script
(function loadLottiePlayer() {
    if (document.querySelector('script[src*="dotlottie-player"]')) return;
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs';
    script.type = 'module';
    document.head.appendChild(script);
})();
