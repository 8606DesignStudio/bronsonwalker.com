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

// Click handler for desktop
function spin() {
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
    if (!('ontouchstart' in window)) return;

    // Inject keyframe animations and scanline style
    var style = document.createElement('style');
    style.textContent = [
        '@keyframes goldPulse {',
        '  0%,100% { text-shadow: 0 0 8px #F5B800, 0 0 20px #F5B800aa, 0 0 40px #c8860044; }',
        '  50%     { text-shadow: 0 0 18px #F5B800, 0 0 45px #F5B800cc, 0 0 80px #c88600aa; }',
        '}',
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
        '@keyframes arrowPulse {',
        '  0%,100% { filter: drop-shadow(0 0 4px #F5B800aa); }',
        '  50%     { filter: drop-shadow(0 0 10px #F5B800cc); }',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    // Build overlay with frosted glass background
    var overlay = document.createElement('div');
    overlay.className = 'fs-overlay';
    overlay.style.cssText = [
        'position:fixed;inset:0;z-index:9999;',
        'background:rgba(10,5,0,0.45);',
        'backdrop-filter:blur(14px);',
        '-webkit-backdrop-filter:blur(14px);',
        'display:flex;align-items:center;justify-content:center;cursor:pointer;'
    ].join('');

    // Arc text: each character placed along a quarter-circle, 11 o'clock to 4 o'clock
    var arcText = 'PRESS AND FLIP';
    var arcChars = arcText.split('');
    var arcSpans = [];
    var r = Math.min(window.innerWidth, window.innerHeight) * 0.40;
    var fontSize = Math.max(20, r * 0.22);
    var startAngle = -2 * Math.PI / 3;  // 11 o'clock
    var totalArc  =  5 * Math.PI / 6;   // sweep 150deg clockwise to 4 o'clock
    // Shift circle center left so the arc ends have equal horizontal margins
    var hOffset = -(r * 0.183);

    var arcContainer = document.createElement('div');
    arcContainer.style.cssText = 'position:absolute;left:calc(50% + ' + hOffset.toFixed(1) + 'px);top:50%;width:0;height:0;';

    arcChars.forEach(function (ch, i) {
        var t = (arcChars.length > 1) ? i / (arcChars.length - 1) : 0;
        var angle = startAngle + t * totalArc;
        var x = r * Math.cos(angle);
        var y = r * Math.sin(angle);
        var rotDeg = (angle * 180 / Math.PI) + 90; // tangent rotation so letter faces outward

        var span = document.createElement('span');
        span.textContent = (ch === ' ') ? '\u00A0' : ch;
        span.style.cssText = [
            'position:absolute;',
            'left:' + x.toFixed(1) + 'px;',
            'top:' + y.toFixed(1) + 'px;',
            'transform:translate(-50%,-50%) rotate(' + rotDeg.toFixed(1) + 'deg);',
            'display:inline-block;',
            'color:#F5B800;',
            'font-family:Nunito,sans-serif;',
            'font-size:' + fontSize.toFixed(1) + 'px;',
            'font-weight:700;',
            '-webkit-text-stroke:1.5px #F5B800;',
            'animation:goldPulse 2.5s ease-in-out infinite;',
            'opacity:0;',
            'transition:opacity 0.08s;'
        ].join('');
        arcContainer.appendChild(span);
        arcSpans.push(span);
    });

    overlay.appendChild(arcContainer);

    // Curved arrow: arc shaft + explicit polygon arrowhead (no marker junction issues)
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;animation:arrowPulse 2.5s ease-in-out infinite;';

    var arrowR = r * 0.72;
    var cx = window.innerWidth / 2 + hOffset;
    var cy = window.innerHeight / 2;
    var ang4  =  30 * Math.PI / 180;
    var ang11 = -120 * Math.PI / 180;
    var ax1 = cx + arrowR * Math.cos(ang4);
    var ay1 = cy + arrowR * Math.sin(ang4);
    var ax2 = cx + arrowR * Math.cos(ang11);
    var ay2 = cy + arrowR * Math.sin(ang11);

    // Arc shaft
    var arcShaft = document.createElementNS(svgNS, 'path');
    arcShaft.setAttribute('d', 'M ' + ax1.toFixed(1) + ',' + ay1.toFixed(1) + ' A ' + arrowR.toFixed(1) + ',' + arrowR.toFixed(1) + ' 0 0,0 ' + ax2.toFixed(1) + ',' + ay2.toFixed(1));
    arcShaft.setAttribute('fill', 'none');
    arcShaft.setAttribute('stroke', '#F5B800');
    arcShaft.setAttribute('stroke-width', '8');
    arcShaft.setAttribute('stroke-linecap', 'round');
    svg.appendChild(arcShaft);

    // Arrowhead: filled polygon at 11 o'clock endpoint, oriented along arc tangent
    // Tangent direction at ang11 for CCW arc: (sin(ang11), -cos(ang11))
    var tx = Math.sin(ang11);   // tangent x
    var ty = -Math.cos(ang11);  // tangent y
    var nx = ty;                // normal x (90deg CW from tangent)
    var ny = -tx;               // normal y
    var hl = arrowR * 0.16;    // arrowhead length
    var hw = arrowR * 0.12;    // arrowhead half-width
    var tipX  = ax2 + tx * hl;
    var tipY  = ay2 + ty * hl;
    var b1X = ax2 - tx * hl * 0.2 + nx * hw;
    var b1Y = ay2 - ty * hl * 0.2 + ny * hw;
    var b2X = ax2 - tx * hl * 0.2 - nx * hw;
    var b2Y = ay2 - ty * hl * 0.2 - ny * hw;
    var arrowHead = document.createElementNS(svgNS, 'polygon');
    arrowHead.setAttribute('points', tipX.toFixed(1)+','+tipY.toFixed(1)+' '+b1X.toFixed(1)+','+b1Y.toFixed(1)+' '+b2X.toFixed(1)+','+b2Y.toFixed(1));
    arrowHead.setAttribute('fill', '#F5B800');
    svg.appendChild(arrowHead);

    overlay.appendChild(svg);

    // Center: <3 in a simple gold circle
    var powerSvg = document.createElement('div');
    var btnSize = (r * 0.58).toFixed(1);
    powerSvg.style.cssText = [
        'position:absolute;',
        'left:calc(50% + ' + hOffset.toFixed(1) + 'px);',
        'top:50%;',
        'transform:translate(-50%,-50%);',
        'width:' + btnSize + 'px;',
        'height:' + btnSize + 'px;',
        'border-radius:50%;',
        'border:3px solid #F5B800;',
        'display:flex;align-items:center;justify-content:center;',
        'pointer-events:none;',
        'animation:goldPulse 2.5s ease-in-out infinite;'
    ].join('');
    var heartSpan = document.createElement('span');
    heartSpan.textContent = '<3';
    heartSpan.style.cssText = [
        'color:#F5B800;',
        'font-family:Nunito,sans-serif;',
        'font-size:' + fontSize.toFixed(1) + 'px;',
        'font-weight:700;',
        '-webkit-text-stroke:1.5px #F5B800;',
        'line-height:1;user-select:none;'
    ].join('');
    powerSvg.appendChild(heartSpan);
    overlay.appendChild(powerSvg);

    // Typewriter: reveal each character in sequence
    function startTypewriter() {
        arcSpans.forEach(function (s) { s.style.opacity = '0'; });
        var i = 0;
        var typeInterval = setInterval(function () {
            if (i < arcSpans.length) {
                arcSpans[i].style.opacity = '1';
                i++;
            } else {
                clearInterval(typeInterval);
            }
        }, 65);
    }

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

    // Smart-glass defrost: runs after rotation is applied
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

    // On tap: hide UI instantly, rotate (hidden under overlay), then defrost
    function enterFullscreen() {
        overlay.removeEventListener('click', enterFullscreen);
        arcSpans.forEach(function (s) { s.style.opacity = '0'; });
        svg.style.opacity = '0';
        powerSvg.style.opacity = '0';
        doEnterFullscreen();
    }

    overlay.addEventListener('click', enterFullscreen);

    // Re-show overlay when exiting fullscreen
    document.addEventListener('fullscreenchange', function () {
        if (!document.fullscreenElement) {
            document.body.style.transform = '';
            document.body.style.transformOrigin = '';
            document.body.style.width = '';
            document.body.style.height = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.overflow = '';
            overlay.style.display = 'flex';
            overlay.style.animation = '';
            svg.style.opacity = '1';
            powerSvg.style.opacity = '1';
            overlay.addEventListener('click', enterFullscreen);
            startTypewriter();
        }
    });

    // CSS rotation fallback for when orientation lock isn't supported (iOS)
    // Overlay (on <html>) stays visible and hides the rotation; callback fires after rotation settles
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

    document.documentElement.appendChild(overlay);
    startTypewriter();
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

    var btn = document.getElementById('headphones-btn');
    var muteBtn = document.getElementById('mute-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
        if (!ambient.playing()) ambient.play();
        ambient.fade(0, 0.16, 3000);
        btn.style.display = 'none';
        if (muteBtn) muteBtn.classList.add('visible');
    });

    if (muteBtn) {
        muteBtn.addEventListener('click', function () {
            ambient.fade(ambient.volume(), 0, 1500);
            setTimeout(function () { ambient.pause(); }, 1600);
            muteBtn.classList.remove('visible');
            btn.style.display = '';
        });
    }
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