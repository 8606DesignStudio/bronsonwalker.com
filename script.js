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
dialText.textContent = currentNumber === 0 ? '<3' : String(currentNumber).padStart(3, '0');
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

// Soft sine ping for dial — clean, musical, low volume
var _dialCtx = null;
function playDialTick() {
    try {
        if (!_dialCtx) _dialCtx = new (window.AudioContext || window.webkitAudioContext)();
        var ctx = _dialCtx;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 420;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.022, ctx.currentTime + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
    } catch(e) {}
}

// Stop pulse animation on first interaction
function stopDialPulse() {
    if (dialElement) dialElement.classList.add('dialed');
}

// Click handler for desktop
function spin() {
    stopDialPulse();
    showDescription = false;
    currentNumber = (currentNumber + 1) % (maxEpisode + 1);
    playDialTick();
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
        stopDialPulse();
        showDescription = false;
        // Determine direction: positive = right, negative = left
        const direction = totalDeltaX > 0 ? 1 : -1;
        
        // Apply single step change
        currentNumber = (currentNumber + direction) % (maxEpisode + 1);
        if (currentNumber < 0) {
            currentNumber += (maxEpisode + 1);
        }
        
        // Reset touch start position to prevent multiple changes
        touchStartX = currentTouchX;
        playDialTick();
        updateDialOnly();
        updateEpisodeContent();
    }
    
    e.preventDefault();
}

// Update functions
function updateDialOnly() {
    const t = document.getElementById('dial-text');
    if (t) t.textContent = currentNumber === 0 ? '<3' : String(currentNumber).padStart(3, '0');
}

let showDescription = false;

function updateEpisodeContent() {
    const instruction = document.getElementById('dial-instruction');
    const epDiv = document.getElementById('episode');

    if (!episodes || episodes.length === 0) {
        epDiv.innerHTML = 'Loading...';
        if (instruction) instruction.style.display = 'none';
        return;
    }

    if (currentNumber === 0) {
        epDiv.innerHTML = '';
        showDescription = false;
        if (instruction) instruction.style.display = '';
        return;
    }

    const ep = episodes[currentNumber];
    if (!ep) {
        epDiv.innerHTML = '';
        if (instruction) instruction.style.display = 'none';
        return;
    }

    if (instruction) instruction.style.display = 'none';

    const content = showDescription
        ? '<span class="ep-desc">' + ep.description + '</span>'
        : '<a href="' + ep.link + '" target="_blank" rel="noopener">' + ep.title + '</a>';

    epDiv.innerHTML = content;
}

// Frosted entry overlay with ENTER button
(function () {
    // Inject scanline + enter button styles
    var style = document.createElement('style');
    style.textContent = [
        '@keyframes overlayFlicker {',
        '  0%   { opacity: 1; }',
        '  5%   { opacity: 0.1; }',
        '  12%  { opacity: 1; }',
        '  18%  { opacity: 0.15; }',
        '  26%  { opacity: 1; }',
        '  100% { opacity: 0; }',
        '}',
        '.fs-overlay { position: relative; overflow: hidden; }',
        '.fs-overlay::after {',
        '  content: "";',
        '  position: absolute;',
        '  inset: 0;',
        '  background: repeating-linear-gradient(',
        '    to bottom,',
        '    transparent 0px, transparent 2px,',
        '    rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px',
        '  );',
        '  pointer-events: none;',
        '}',
        '@keyframes enterPulse {',
        '  0%,100% { box-shadow: 0 0 8px rgba(245,184,0,0.3), inset 0 0 0 1.5px #F5B800; }',
        '  50%     { box-shadow: 0 0 20px rgba(245,184,0,0.7), inset 0 0 0 1.5px #F5B800; }',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    // Build frosted overlay
    var overlay = document.createElement('div');
    overlay.className = 'fs-overlay';
    overlay.style.cssText = [
        'position:fixed;inset:0;z-index:9999;',
        'background:rgba(10,5,0,0.45);',
        'backdrop-filter:blur(14px);',
        '-webkit-backdrop-filter:blur(14px);',
        'display:flex;align-items:center;justify-content:center;'
    ].join('');

    // ENTER button
    var enterBtn = document.createElement('button');
    enterBtn.textContent = 'ENTER';
    enterBtn.style.cssText = [
        'font-family:Nunito,sans-serif;',
        'font-size:clamp(1rem,2vw,1.4rem);',
        'font-weight:700;',
        'letter-spacing:0.15em;',
        'color:#F5B800;',
        'background:#000;',
        'border:1.5px solid #F5B800;',
        'border-radius:8px;',
        'padding:10px 28px;',
        'cursor:pointer;',
        'box-shadow:0 0 8px rgba(245,184,0,0.3);',
        'transform:translateY(0);',
        'transition:box-shadow 0.08s,transform 0.08s;',
        'animation:enterPulse 2.4s ease-in-out infinite;'
    ].join('');
    enterBtn.addEventListener('mousedown', function () {
        enterBtn.style.boxShadow = '0 0 4px rgba(245,184,0,0.2)';
        enterBtn.style.transform = 'translateY(4px)';
    });
    overlay.appendChild(enterBtn);

    function doEnterFullscreen() {
        var el = document.documentElement;
        var rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (rfs) {
            var p = rfs.call(el);
            if (p && p.then) {
                p.then(function () {
                    try { screen.orientation.lock('landscape'); } catch (e) {}
                    applyLandscapeIfNeeded(startDefrost);
                });
            } else {
                try { screen.orientation.lock('landscape'); } catch (e) {}
                applyLandscapeIfNeeded(startDefrost);
            }
        } else {
            startDefrost();
        }
    }

    // Smart-glass defrost
    function startDefrost() {
        overlay.style.transition = [
            'backdrop-filter 1.4s ease-out',
            '-webkit-backdrop-filter 1.4s ease-out',
            'background 1.4s ease-out'
        ].join(',');
        overlay.style.backdropFilter = 'blur(0px)';
        overlay.style.webkitBackdropFilter = 'blur(0px)';
        overlay.style.background = 'rgba(10,5,0,0)';
        setTimeout(function () {
            overlay.style.display = 'none';
            overlay.style.transition = '';
            overlay.style.backdropFilter = 'blur(14px)';
            overlay.style.webkitBackdropFilter = 'blur(14px)';
            overlay.style.background = 'rgba(10,5,0,0.45)';
        }, 1400);
    }

    // On ENTER click: hide button immediately, then trigger fullscreen + defrost
    enterBtn.addEventListener('click', function () {
        enterBtn.style.display = 'none';
        doEnterFullscreen();
    });

    // Re-show overlay when fullscreen exits (tab switch, back button, ESC, link click)
    function onFullscreenExit() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            document.body.style.transform = '';
            document.body.style.transformOrigin = '';
            document.body.style.width = '';
            document.body.style.height = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.overflow = '';
            enterBtn.style.display = '';
            overlay.style.backdropFilter = 'blur(14px)';
            overlay.style.webkitBackdropFilter = 'blur(14px)';
            overlay.style.background = 'rgba(10,5,0,0.45)';
            overlay.style.transition = '';
            overlay.style.display = 'flex';
        }
    }
    document.addEventListener('fullscreenchange', onFullscreenExit);
    document.addEventListener('webkitfullscreenchange', onFullscreenExit);

    // Re-show overlay when returning from bfcache (browser back button)
    window.addEventListener('pageshow', function (e) {
        if (e.persisted && !document.fullscreenElement) {
            enterBtn.style.display = '';
            overlay.style.backdropFilter = 'blur(14px)';
            overlay.style.webkitBackdropFilter = 'blur(14px)';
            overlay.style.background = 'rgba(10,5,0,0.45)';
            overlay.style.transition = '';
            overlay.style.display = 'flex';
        }
    });

    // CSS rotation fallback for iOS (orientation lock not supported)
    function applyLandscapeIfNeeded(callback) {
        setTimeout(function () {
            if (window.innerHeight > window.innerWidth) {
                var w = window.innerWidth;
                var h = window.innerHeight;
                requestAnimationFrame(function () {
                    document.body.style.transform = 'rotate(-90deg)';
                    document.body.style.transformOrigin = 'top left';
                    document.body.style.width = h + 'px';
                    document.body.style.height = w + 'px';
                    document.body.style.position = 'absolute';
                    document.body.style.top = h + 'px';
                    document.body.style.left = '0';
                    document.body.style.overflow = 'hidden';
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            if (callback) callback();
                        });
                    });
                });
            } else {
                if (callback) callback();
            }
        }, 50);
    }

    // Undo CSS rotation if user physically rotates to landscape
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

    document.documentElement.appendChild(overlay);
})();

// Audio system — ambient cockpit sound, toggled by the headphones button
// Requires: Howler.js (loaded via CDN before this script)
// Sound file: place ambient audio at assets/ambient.mp3 (and .ogg for Firefox)
(function () {
    if (typeof Howl === 'undefined') return;

    var ambient = new Howl({
        src: ['assets/ambient.mp3', 'assets/ambient.ogg'],
        loop: true,
        volume: 0,
        onloaderror: function () {
            console.warn('bronsonwalker.com: ambient sound not found at assets/ambient.mp3');
        }
    });

    var btns = document.querySelectorAll('.headphones-btn');
    var muteBtns = document.querySelectorAll('.mute-btn');
    if (!btns.length) return;

    btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (!ambient.playing()) ambient.play();
            ambient.fade(0, 0.03, 3000);
            btns.forEach(function (b) { b.style.display = 'none'; });
            muteBtns.forEach(function (b) { b.classList.add('visible'); });
        });
    });

    muteBtns.forEach(function (muteBtn) {
        muteBtn.addEventListener('click', function () {
            ambient.fade(ambient.volume(), 0, 1500);
            setTimeout(function () { ambient.pause(); }, 1600);
            muteBtns.forEach(function (b) { b.classList.remove('visible'); });
            btns.forEach(function (b) { b.style.display = ''; });
        });
    });
})();

// Linktree scene — mirrors cockpit-bg structure for consistent sizing
(function () {
    var overlay = document.createElement('div');
    overlay.style.cssText = [
        'position:fixed;inset:0;z-index:9998;',
        'background:#000;',
        'display:none;flex-direction:column;',
        'align-items:center;justify-content:center;',
        'padding-bottom:7.6vh;'
    ].join('');

    var frame = document.createElement('div');
    frame.style.cssText = [
        'position:relative;width:100%;max-width:100%;',
        'aspect-ratio:16/9;overflow:hidden;',
        'margin:18px auto;',
        'box-shadow:0 6px 18px rgba(0,0,0,0.6);'
    ].join('');

    var img = document.createElement('img');
    img.src = 'assets/BonsaiTree.png';
    img.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;object-position:top;pointer-events:none;';
    frame.appendChild(img);

    var backBtn = document.createElement('a');
    backBtn.textContent = 'Back';
    backBtn.href = '#';
    backBtn.style.cssText = [
        'position:absolute;bottom:2%;left:3%;z-index:1;',
        'font-family:Nunito,system-ui,sans-serif;font-weight:700;',
        'font-size:clamp(0.8rem,1.6vw,1.1rem);',
        'color:#F5B800;background:#000;text-decoration:none;',
        'border:1.5px solid #F5B800;border-radius:6px;',
        'padding:2px 8px;cursor:pointer;'
    ].join('');
    backBtn.addEventListener('click', function (e) { e.preventDefault(); overlay.style.display = 'none'; });
    frame.appendChild(backBtn);

    overlay.appendChild(frame);
    document.documentElement.appendChild(overlay);

    document.querySelectorAll('.bonsai-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { overlay.style.display = 'flex'; });
    });
})();

// Scene switching: instant toggle, no DOM swap
(function () {
    document.querySelectorAll('.turn-around-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var target = btn.getAttribute('data-scene');
            if (target) {
                document.querySelectorAll('.scene').forEach(function (s) { s.classList.remove('active'); });
                document.getElementById(target).classList.add('active');
            }
        });
    });
})();