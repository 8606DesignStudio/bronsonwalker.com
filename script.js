// Virtual Adventures Scene Engine — bronsonwalker.com
import { scenes, initialScene } from './data/scenes.js';

// ── Scene map + pre-built containers ─────────────────────────────────────────
const sceneMap = {};
scenes.forEach(s => { sceneMap[s.id] = s; });

// Each scene gets its own .cockpit-bg div built once at startup.
// navigate() just toggles display — no DOM rebuild, instant transitions.
const builtContainers = {};

// ── Persistent audio buttons (re-parented on each navigate, never destroyed) ──
const audioUnmuteBtn = (() => {
    const b = document.createElement('button');
    b.className = 'headphones-btn';
    b.setAttribute('aria-label', 'Toggle ambient sound');
    b.textContent = 'Unmute';
    return b;
})();
const audioMuteBtn = (() => {
    const b = document.createElement('button');
    b.className = 'mute-btn';
    b.textContent = 'Mute';
    return b;
})();

// ── Episode data (loaded once, persists across scene changes) ─────────────────
let episodes = {};
let maxEpisode = 192;
let currentEpisodeNumber = 0;

async function loadEpisodes() {
    try {
        const m = await import('./data/generatedEpisodes.js?t=' + Math.random());
        episodes = m.episodes;
        maxEpisode = episodes.length - 1;
    } catch (e) {
        try {
            const m = await import('./data/generatedEpisodes.js');
            episodes = m.episodes;
            maxEpisode = episodes.length - 1;
        } catch (e2) { console.error('Failed to load episodes:', e2); }
    }
}

// ── Scene builder (lazy) ──────────────────────────────────────────────────────
// Initial scene reuses the static HTML container from index.html.
// All other scenes are built on demand and cached — never rebuilt.
const building = new Set();

function buildScene(sceneId) {
    if (builtContainers[sceneId] || building.has(sceneId)) return;
    building.add(sceneId);

    const scene = sceneMap[sceneId];
    if (!scene) { building.delete(sceneId); return; }

    // Reuse existing static HTML container if present, otherwise create one
    let container = document.querySelector(`[data-scene="${sceneId}"]`);
    if (!container) {
        container = document.createElement('div');
        container.className = 'cockpit-bg';
        container.setAttribute('data-scene', sceneId);
        container.style.display = 'none';
        const img = document.createElement('img');
        img.src = scene.image;
        img.alt = scene.imageAlt || sceneId;
        img.className = 'cockpit-img';
        container.appendChild(img);
        document.body.appendChild(container);
    }

    if (scene.overlay && overlayHandlers[scene.overlay]) {
        overlayHandlers[scene.overlay].mount(container);
    }
    (scene.buttons || []).forEach(cfg => container.appendChild(buildButton(cfg)));

    builtContainers[sceneId] = container;
    building.delete(sceneId);
}

// ── Navigate ──────────────────────────────────────────────────────────────────
function navigate(id) {
    if (!sceneMap[id]) { console.warn('Unknown scene:', id); return; }
    if (!builtContainers[id]) buildScene(id);

    Object.values(builtContainers).forEach(c => c.style.display = 'none');
    const target = builtContainers[id];
    target.style.display = '';
    target.appendChild(audioUnmuteBtn);
    target.appendChild(audioMuteBtn);

    // Evict scenes more than one click away, then preload immediate neighbors
    evictDistantScenes(id);
    preloadNeighbors(id);
}

function preloadNeighbors(sceneId) {
    const scene = sceneMap[sceneId];
    if (!scene) return;
    // Preload any scene reachable from this one — nav buttons AND action buttons with a target
    (scene.buttons || [])
        .filter(b => b.target && !builtContainers[b.target])
        .forEach(b => setTimeout(() => buildScene(b.target), 50));
}

function evictDistantScenes(currentId) {
    // Keep current scene + its immediate neighbors. Evict everything else.
    const keep = new Set([currentId]);
    const scene = sceneMap[currentId];
    if (scene) {
        (scene.buttons || []).filter(b => b.target).forEach(b => keep.add(b.target));
    }
    Object.keys(builtContainers).forEach(id => {
        if (!keep.has(id)) {
            builtContainers[id].remove();
            delete builtContainers[id];
        }
    });
}

// ── Button builder ────────────────────────────────────────────────────────────
const actionHandlers = {
    'go-linktree': () => navigate('linktree')
};

function buildButton(cfg) {
    const el = document.createElement('button');
    el.textContent = cfg.label;
    if (cfg.className) el.className = cfg.className;
    if (cfg.type === 'nav') {
        el.addEventListener('click', e => { e.preventDefault(); navigate(cfg.target); });
    } else if (cfg.type === 'action') {
        el.addEventListener('click', e => { e.preventDefault(); actionHandlers[cfg.action]?.(); });
    }
    return el;
}

// ── Overlay handlers ──────────────────────────────────────────────────────────
// Each handler: { mount(container) → cleanup fn | null }
// mount() appends DOM into container, then wires behavior.
// getTotalLength() and other DOM queries are safe here — container is live.

const overlayHandlers = {

    // ── Episode dial (cockpit scene) ──────────────────────────────────────────
    'episode-dial': {
        mount(container) {
            // Episode title display
            const epDiv = document.createElement('div');
            epDiv.id = 'episode';
            epDiv.className = 'episode';
            container.appendChild(epDiv);

            // Instruction arrows
            const instruction = document.createElement('div');
            instruction.id = 'dial-instruction';
            instruction.innerHTML = '&lt;-----&gt;';
            container.appendChild(instruction);

            // Dial container + text + touch area
            const dialEl = document.createElement('div');
            dialEl.id = 'dial';
            const dialText = document.createElement('span');
            dialText.id = 'dial-text';
            dialText.textContent = currentEpisodeNumber === 0 ? '<3' : String(currentEpisodeNumber).padStart(3, '0');
            dialEl.appendChild(dialText);
            const touchArea = document.createElement('div');
            touchArea.style.cssText = 'position:absolute;width:225px;height:150px;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10;';
            dialEl.appendChild(touchArea);
            container.appendChild(dialEl);

            // Soft sine ping
            let _ctx = null;
            function playTick() {
                try {
                    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = _ctx.createOscillator(), gain = _ctx.createGain();
                    osc.type = 'sine'; osc.frequency.value = 420;
                    gain.gain.setValueAtTime(0.0001, _ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.022, _ctx.currentTime + 0.025);
                    gain.gain.exponentialRampToValueAtTime(0.001, _ctx.currentTime + 0.28);
                    osc.connect(gain); gain.connect(_ctx.destination);
                    osc.start(_ctx.currentTime); osc.stop(_ctx.currentTime + 0.28);
                } catch(e) {}
            }

            function updateDialText() {
                dialText.textContent = currentEpisodeNumber === 0 ? '<3' : String(currentEpisodeNumber).padStart(3, '0');
            }

            function updateEpisodeContent() {
                if (!episodes || episodes.length === 0) {
                    epDiv.innerHTML = 'Loading...';
                    instruction.style.display = 'none';
                    return;
                }
                if (currentEpisodeNumber === 0) {
                    epDiv.innerHTML = '';
                    instruction.style.display = '';
                    return;
                }
                const ep = episodes[currentEpisodeNumber];
                if (!ep) { epDiv.innerHTML = ''; instruction.style.display = 'none'; return; }
                instruction.style.display = 'none';
                epDiv.innerHTML = '<a href="' + ep.link + '" target="_blank" rel="noopener">' + ep.title + '</a>';
            }

            updateEpisodeContent();

            function spin() {
                dialEl.classList.add('dialed');
                currentEpisodeNumber = (currentEpisodeNumber + 1) % (maxEpisode + 1);
                playTick(); updateDialText(); updateEpisodeContent();
            }

            dialEl.addEventListener('click', spin);

            let touchStartX = 0;
            touchArea.addEventListener('touchstart', e => {
                touchStartX = e.touches[0].clientX;
                e.preventDefault();
            }, { passive: false });
            touchArea.addEventListener('touchmove', e => {
                const dx = e.touches[0].clientX - touchStartX;
                if (Math.abs(dx) > 8) {
                    dialEl.classList.add('dialed');
                    const dir = dx > 0 ? 1 : -1;
                    currentEpisodeNumber = (currentEpisodeNumber + dir + maxEpisode + 1) % (maxEpisode + 1);
                    touchStartX = e.touches[0].clientX;
                    playTick(); updateDialText(); updateEpisodeContent();
                }
                e.preventDefault();
            }, { passive: false });

            return null; // no document-level listeners to clean up
        }
    },

    // ── Arch dial (door scene) ────────────────────────────────────────────────
    'arch-dial': {
        mount(container) {
            const NS = 'http://www.w3.org/2000/svg';
            const ARCH_D = 'M 33.98 50.42 C 33.997 48.547 33.757 42.413 34.08 39.18 C 34.403 35.947 34.763 33.802 35.92 31.02 C 37.077 28.238 39.167 24.667 41.02 22.49 C 42.873 20.313 45.255 18.837 47.04 17.96 C 48.825 17.083 50.167 17.23 51.73 17.23 C 53.293 17.23 54.635 17.083 56.42 17.96 C 58.205 18.837 60.587 20.313 62.44 22.49 C 64.293 24.667 66.383 28.238 67.54 31.02 C 68.697 33.802 69.057 35.947 69.38 39.18 C 69.703 42.413 69.463 48.547 69.48 50.42';

            // Build SVG
            const svg = document.createElementNS(NS, 'svg');
            svg.id = 'door-arch';
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.setAttribute('xmlns', NS);

            // defs
            const defs = document.createElementNS(NS, 'defs');

            const archGlow = document.createElementNS(NS, 'filter');
            archGlow.id = 'arch-glow';
            archGlow.setAttribute('x', '-20%'); archGlow.setAttribute('y', '-20%');
            archGlow.setAttribute('width', '140%'); archGlow.setAttribute('height', '140%');
            archGlow.innerHTML = '<feGaussianBlur stdDeviation="0.5" result="blur1"/><feGaussianBlur stdDeviation="1.2" result="blur2"/><feMerge><feMergeNode in="blur2"/><feMergeNode in="blur1"/><feMergeNode in="SourceGraphic"/></feMerge>';
            defs.appendChild(archGlow);

            const doorBlur = document.createElementNS(NS, 'filter');
            doorBlur.id = 'door-blur';
            doorBlur.setAttribute('x', '-5%'); doorBlur.setAttribute('y', '-5%');
            doorBlur.setAttribute('width', '110%'); doorBlur.setAttribute('height', '110%');
            doorBlur.innerHTML = '<feGaussianBlur stdDeviation="0.6"/>';
            defs.appendChild(doorBlur);

            const spotBlur = document.createElementNS(NS, 'filter');
            spotBlur.id = 'spot-blur';
            spotBlur.setAttribute('x', '-200%'); spotBlur.setAttribute('y', '-200%');
            spotBlur.setAttribute('width', '500%'); spotBlur.setAttribute('height', '500%');
            spotBlur.innerHTML = '<feGaussianBlur stdDeviation="2"/>';
            defs.appendChild(spotBlur);

            const mask = document.createElementNS(NS, 'mask');
            mask.id = 'arch-mask';
            mask.setAttribute('maskUnits', 'userSpaceOnUse');
            const maskRect = document.createElementNS(NS, 'rect');
            maskRect.setAttribute('x', '0'); maskRect.setAttribute('y', '0');
            maskRect.setAttribute('width', '100'); maskRect.setAttribute('height', '100');
            maskRect.setAttribute('fill', 'white');
            const darkSpot = document.createElementNS(NS, 'circle');
            darkSpot.id = 'arch-dark-spot';
            darkSpot.setAttribute('cx', '-50'); darkSpot.setAttribute('cy', '-50');
            darkSpot.setAttribute('r', '14'); darkSpot.setAttribute('fill', 'black');
            darkSpot.setAttribute('filter', 'url(#spot-blur)');
            mask.appendChild(maskRect); mask.appendChild(darkSpot);
            defs.appendChild(mask);
            svg.appendChild(defs);

            // Door shape (colored fill)
            const doorShape = document.createElementNS(NS, 'path');
            doorShape.id = 'door-shape';
            doorShape.setAttribute('d', 'M 37.5 50.5 C 37.5 35 44.5 24 51.73 24 C 59 24 65.96 35 65.96 50.5 L 65.96 82 L 62.5 88.5 L 40.96 88.5 L 37.5 82 Z');
            doorShape.setAttribute('fill', 'rgba(75,184,233,0.30)');
            doorShape.setAttribute('stroke', '#4bb8e9');
            doorShape.setAttribute('stroke-width', '0.5');
            doorShape.setAttribute('filter', 'url(#door-blur)');
            doorShape.setAttribute('opacity', '0.85');
            doorShape.style.pointerEvents = 'none';
            svg.appendChild(doorShape);

            // Arch path — visible glowing line
            const archPath = document.createElementNS(NS, 'path');
            archPath.id = 'arch-path';
            archPath.setAttribute('d', ARCH_D);
            archPath.setAttribute('fill', 'none');
            archPath.setAttribute('stroke', '#4bb8e9');
            archPath.setAttribute('stroke-width', '0.35');
            archPath.setAttribute('stroke-linecap', 'round');
            archPath.setAttribute('filter', 'url(#arch-glow)');
            archPath.setAttribute('mask', 'url(#arch-mask)');
            archPath.style.pointerEvents = 'none';
            svg.appendChild(archPath);

            // Arch hit — invisible stroke-width touch target
            const archHit = document.createElementNS(NS, 'path');
            archHit.id = 'arch-hit';
            archHit.setAttribute('d', ARCH_D);
            archHit.setAttribute('fill', 'none');
            archHit.setAttribute('stroke', 'transparent');
            archHit.setAttribute('stroke-width', '6');
            archHit.style.cssText = 'cursor:pointer;pointer-events:stroke;';
            svg.appendChild(archHit);

            // Append SVG to container BEFORE calling getTotalLength()
            container.appendChild(svg);

            // Number display
            const archNumber = document.createElement('div');
            archNumber.id = 'arch-number';
            archNumber.textContent = '00';
            container.appendChild(archNumber);

            // Safe to call now — SVG is in live DOM
            const totalLen = archPath.getTotalLength();
            const SAMPLES = 300;
            const samples = [];
            for (let i = 0; i <= SAMPLES; i++) {
                const pt = archPath.getPointAtLength((i / SAMPLES) * totalLen);
                samples.push({ x: pt.x, y: pt.y, t: i / SAMPLES });
            }

            function toSVG(clientX, clientY) {
                const p = svg.createSVGPoint();
                p.x = clientX; p.y = clientY;
                return p.matrixTransform(svg.getScreenCTM().inverse());
            }

            function closestT(clientX, clientY) {
                const s = toSVG(clientX, clientY);
                let bestD = Infinity, bestT = 0;
                for (let i = 0; i < samples.length; i++) {
                    const dx = samples[i].x - s.x, dy = samples[i].y - s.y;
                    const d = dx * dx + dy * dy;
                    if (d < bestD) { bestD = d; bestT = samples[i].t; }
                }
                return bestT;
            }

            function update(clientX, clientY) {
                const t = closestT(clientX, clientY);
                const val = Math.round(t * 99);
                const pt = archPath.getPointAtLength(t * totalLen);
                darkSpot.setAttribute('cx', pt.x);
                darkSpot.setAttribute('cy', pt.y);
                archNumber.textContent = String(val).padStart(2, '0');
                const hue = Math.round(val / 99 * 360);
                doorShape.setAttribute('fill', `hsla(${hue},90%,55%,0.35)`);
                doorShape.setAttribute('stroke', `hsl(${hue},100%,70%)`);
                doorShape.setAttribute('stroke-width', '0.5');
                archNumber.style.color = `hsl(${hue},80%,65%)`;
            }

            function hideDot() { darkSpot.setAttribute('cx', '-50'); }

            let dragging = false;
            const onMouseMove = e => { if (dragging) update(e.clientX, e.clientY); };
            const onMouseUp   = () => { dragging = false; hideDot(); };

            archHit.addEventListener('mousedown', e => { dragging = true; update(e.clientX, e.clientY); });
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            archHit.addEventListener('touchstart', e => { update(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });
            archHit.addEventListener('touchmove',  e => { update(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });
            archHit.addEventListener('touchend', hideDot);

            // Listeners stay for the lifetime of the page (overlay is permanent)
        }
    }

};

// ── Audio system (wired once to persistent buttons) ───────────────────────────
function initAudio() {
    if (typeof Howl === 'undefined') return;
    const ambient = new Howl({
        src: ['assets/ambient.mp3', 'assets/ambient.ogg'],
        loop: true, volume: 0,
        onloaderror: () => console.warn('bronsonwalker.com: ambient sound not found at assets/ambient.mp3')
    });
    audioUnmuteBtn.addEventListener('click', () => {
        if (!ambient.playing()) ambient.play();
        ambient.fade(0, 0.03, 3000);
        audioUnmuteBtn.style.display = 'none';
        audioMuteBtn.classList.add('visible');
    });
    audioMuteBtn.addEventListener('click', () => {
        ambient.fade(ambient.volume(), 0, 1500);
        setTimeout(() => ambient.pause(), 1600);
        audioMuteBtn.classList.remove('visible');
        audioUnmuteBtn.style.display = '';
    });
}

// ── Fullscreen overlay ────────────────────────────────────────────────────────
function initFullscreenOverlay() {
    const style = document.createElement('style');
    style.textContent = [
        '@keyframes overlayFlicker{0%{opacity:1}5%{opacity:0.1}12%{opacity:1}18%{opacity:0.15}26%{opacity:1}100%{opacity:0}}',
        '.fs-overlay{position:relative;overflow:hidden}',
        '.fs-overlay::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(to bottom,transparent 0px,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px);pointer-events:none}',
        '@keyframes enterPulse{0%,100%{box-shadow:0 0 8px rgba(245,184,0,0.3),inset 0 0 0 1.5px #F5B800}50%{box-shadow:0 0 20px rgba(245,184,0,0.7),inset 0 0 0 1.5px #F5B800}}'
    ].join('\n');
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'fs-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(10,5,0,0.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;';

    const enterBtn = document.createElement('button');
    enterBtn.textContent = 'ENTER';
    enterBtn.style.cssText = 'font-family:Nunito,sans-serif;font-size:clamp(1rem,2vw,1.4rem);font-weight:700;letter-spacing:0.15em;color:#F5B800;background:#000;border:1.5px solid #F5B800;border-radius:8px;padding:10px 28px;cursor:pointer;box-shadow:0 0 8px rgba(245,184,0,0.3);transform:translateY(0);transition:box-shadow 0.08s,transform 0.08s;animation:enterPulse 2.4s ease-in-out infinite;';
    enterBtn.addEventListener('mousedown', () => {
        enterBtn.style.boxShadow = '0 0 4px rgba(245,184,0,0.2)';
        enterBtn.style.transform = 'translateY(4px)';
    });
    overlay.appendChild(enterBtn);

    function startDefrost() {
        overlay.style.transition = 'backdrop-filter 1.4s ease-out,-webkit-backdrop-filter 1.4s ease-out,background 1.4s ease-out';
        overlay.style.backdropFilter = 'blur(0px)';
        overlay.style.webkitBackdropFilter = 'blur(0px)';
        overlay.style.background = 'rgba(10,5,0,0)';
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.style.transition = '';
            overlay.style.backdropFilter = 'blur(14px)';
            overlay.style.webkitBackdropFilter = 'blur(14px)';
            overlay.style.background = 'rgba(10,5,0,0.45)';
        }, 1400);
    }

    function showOverlay() {
        enterBtn.style.display = '';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(10,5,0,0.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;';
    }

    function doEnterFullscreen() {
        const el = document.documentElement;
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (rfs) {
            const p = rfs.call(el);
            if (p && p.then) {
                p.then(() => { try { screen.orientation.lock('landscape'); } catch(e) {} applyLandscapeIfNeeded(startDefrost); });
            } else {
                try { screen.orientation.lock('landscape'); } catch(e) {}
                applyLandscapeIfNeeded(startDefrost);
            }
        } else { startDefrost(); }
    }

    enterBtn.addEventListener('click', () => { enterBtn.style.display = 'none'; doEnterFullscreen(); });

    function onFullscreenExit() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            document.body.style.cssText = '';
            showOverlay();
        }
    }
    document.addEventListener('fullscreenchange', onFullscreenExit);
    document.addEventListener('webkitfullscreenchange', onFullscreenExit);
    window.addEventListener('pageshow', e => {
        if (e.persisted && !document.fullscreenElement) showOverlay();
    });

    function applyLandscapeIfNeeded(callback) {
        setTimeout(() => {
            if (window.innerHeight > window.innerWidth) {
                const w = window.innerWidth, h = window.innerHeight;
                requestAnimationFrame(() => {
                    document.body.style.transform = 'rotate(-90deg)';
                    document.body.style.transformOrigin = 'top left';
                    document.body.style.width = h + 'px';
                    document.body.style.height = w + 'px';
                    document.body.style.position = 'absolute';
                    document.body.style.top = h + 'px';
                    document.body.style.left = '0';
                    document.body.style.overflow = 'hidden';
                    requestAnimationFrame(() => { requestAnimationFrame(() => { if (callback) callback(); }); });
                });
            } else { if (callback) callback(); }
        }, 50);
    }

    if (screen.orientation) {
        screen.orientation.addEventListener('change', () => {
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
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    loadEpisodes();         // start loading in background, don't block
    initAudio();
    initFullscreenOverlay();
    navigate(initialScene); // takes over static HTML container, starts neighbor preload
}

init();
