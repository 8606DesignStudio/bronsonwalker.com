// Load episodes data with Firefox-compatible cache busting
// Episode data loading and initialization
let episodes = {};

async function loadEpisodes() {
    try {
        const module = await import('./data/generatedEpisodes.js?t=' + Math.random());
        episodes = module.episodes;
        maxEpisode = episodes.length - 1; // Dynamically set max episode
        updateEpisodeContent();
    } catch (error) {
        console.error('Failed to load episodes:', error);
        const fallbackModule = await import('./data/generatedEpisodes.js');
        episodes = fallbackModule.episodes;
        maxEpisode = episodes.length - 1; // Dynamically set max episode
        updateEpisodeContent();
    }
}

// Dial state and setup
let currentNumber = 0;
let maxEpisode = 192; // Will be updated when episodes load

loadEpisodes();

// Use the existing #dial container as the interactive element and create
// a dedicated child for the numeric text so we don't overwrite children.
const dialContainer = document.getElementById('dial');
const dialText = document.createElement('span');
dialText.id = 'dial-text';
dialText.textContent = String(currentNumber).padStart(3, '0');
if (dialContainer) dialContainer.appendChild(dialText);

const dialElement = dialContainer;

// Create invisible touch area for better mobile interaction
const touchArea = document.createElement('div');
touchArea.style.position = 'absolute';
touchArea.style.width = '225px';
touchArea.style.height = '150px';
touchArea.style.left = '50%';
touchArea.style.top = '50%';
touchArea.style.transform = 'translate(-50%, -50%)';
touchArea.style.zIndex = '10';

document.getElementById('dial').appendChild(touchArea);

// Event listeners
dialElement.addEventListener('click', () => spin());
touchArea.addEventListener('touchstart', (e) => handleTouchStart(e));
touchArea.addEventListener('touchmove', (e) => handleTouchMove(e));

// Click handler for desktop
function spin() {
    currentNumber = (currentNumber + 1) % (maxEpisode + 1);
    updateDialOnly();
    updateEpisodeContent();
}

// Touch handling variables
let touchStartY = 0;
let touchStartX = 0;
const swipeSensitivity = 8;

// Touch event handlers
function handleTouchStart(e) {
    // Hide instruction arrow on first touch
    const arrow = document.querySelector('.instruction-arrow');
    if (arrow) {
        arrow.style.display = 'none';
    }
    
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    e.preventDefault();
}

function handleTouchMove(e) {
    const currentTouchX = e.touches[0].clientX;
    const totalDeltaX = currentTouchX - touchStartX;
    
    if (Math.abs(totalDeltaX) > swipeSensitivity) {
        // Determine direction: positive = right, negative = left
        const direction = totalDeltaX > 0 ? 1 : -1;
        
        // Apply single step change
        currentNumber = (currentNumber + direction) % (maxEpisode + 1);
        if (currentNumber < 0) {
            currentNumber += (maxEpisode + 1);
        }
        
        // Reset touch start position to prevent multiple changes
        touchStartX = currentTouchX;
        updateDialOnly();
        updateEpisodeContent();
    }
    
    e.preventDefault();
}

// Update functions
function updateDialOnly() {
    const t = document.getElementById('dial-text');
    if (t) t.textContent = String(currentNumber).padStart(3, '0');
}

function updateEpisodeContent() {
    if (episodes.length === 0) {
        document.getElementById('episode').innerHTML = "Loading...";
    } else {
        document.getElementById('episode').innerHTML = episodes[currentNumber] || "";
    }
}

// Fullscreen + forced landscape on mobile
(function () {
    // Only show on touch devices (mobile/tablet)
    if (!('ontouchstart' in window)) return;

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:pointer;';
    overlay.innerHTML = '<div style="color:#4bb8e9;font-family:Quicksand,sans-serif;font-size:clamp(1.2rem,4vw,2rem);text-align:center;padding:20px;">Tap to go fullscreen</div>';

    function enterFullscreen() {
        var el = document.documentElement;
        var rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (rfs) {
            var p = rfs.call(el);
            if (p && p.then) {
                p.then(function () {
                    try { screen.orientation.lock('landscape'); } catch (e) {}
                    applyLandscapeIfNeeded();
                });
            } else {
                try { screen.orientation.lock('landscape'); } catch (e) {}
                applyLandscapeIfNeeded();
            }
        }
        overlay.style.display = 'none';
    }

    overlay.addEventListener('click', enterFullscreen);

    // Re-show overlay when exiting fullscreen
    document.addEventListener('fullscreenchange', function () {
        if (!document.fullscreenElement) {
            // Undo any CSS rotation
            document.body.style.transform = '';
            document.body.style.transformOrigin = '';
            document.body.style.width = '';
            document.body.style.height = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.overflow = '';
            // Show overlay again
            overlay.style.display = 'flex';
        }
    });

    // CSS rotation fallback for when orientation lock isn't supported (iOS)
    function applyLandscapeIfNeeded() {
        // Give the browser a moment to process orientation lock
        setTimeout(function () {
            if (window.innerHeight > window.innerWidth) {
                // Still portrait -- rotate the page 90deg CCW
                var w = window.innerWidth;
                var h = window.innerHeight;
                document.body.style.transform = 'rotate(-90deg)';
                document.body.style.transformOrigin = 'top left';
                document.body.style.width = h + 'px';
                document.body.style.height = w + 'px';
                document.body.style.position = 'absolute';
                document.body.style.top = h + 'px';
                document.body.style.left = '0';
                document.body.style.overflow = 'hidden';
            }
        }, 300);
    }

    // Undo rotation if user physically rotates to landscape
    if (screen.orientation) {
        screen.orientation.addEventListener('change', function () {
            if (screen.orientation.type.startsWith('landscape')) {
                document.body.style.transform = '';
                document.body.style.transformOrigin = '';
                document.body.style.width = '';
                document.body.style.height = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.left = '';
                document.body.style.overflow = '';
            }
        });
    }

    document.body.appendChild(overlay);
})();

// Scene switching: instant toggle, no DOM swap
(function () {
    document.querySelectorAll('.new-page-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var target = link.getAttribute('data-scene');
            if (target) {
                document.querySelectorAll('.scene').forEach(function (s) { s.classList.remove('active'); });
                document.getElementById(target).classList.add('active');
            }
        });
    });

    // Keypad overlay
    var keypadBtn = document.getElementById('keypadBtn');
    var keypadOverlay = document.getElementById('keypadOverlay');
    if (keypadBtn && keypadOverlay) {
        keypadBtn.addEventListener('click', function () { keypadOverlay.classList.add('active'); });
        keypadOverlay.addEventListener('click', function () { keypadOverlay.classList.remove('active'); });
    }
})();