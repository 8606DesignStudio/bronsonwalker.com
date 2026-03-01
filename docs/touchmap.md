# Touchmap System

## What It Is
`touchmap.html` is a coordinate-finding tool. Deploy it as `t.html` to the VPS, open it on your device, click anywhere on the image, and it logs `left: X%  top: Y%` coordinates you can paste directly into CSS.

## How to Deploy
```
scp -i ~/.ssh/id_ed25519 touchmap.html root@82.29.155.226:/var/www/bronsonwalker.com/t.html
```
Then open: https://bronsonwalker.com/t.html

**Always drop the link immediately after deploying** — Claude reads the image directly and confirms the box is live.

## Key Rules
- The touchmap image must match the live site exactly: same `object-fit: cover; object-position: top`, same any transforms
- If the scene image is flipped (`scaleX(-1)`), the touchmap image must also be flipped
- Coordinates come from the displayed (rendered) image, which accounts for `object-fit: cover` cropping
- Place the dot element using `position: absolute` inside `.cockpit-bg` — same coordinate space as the touchmap container

## Current Touchmaps

### cockpit.png (scene-cockpit)
- Standard: `<img src="assets/cockpit.png">`
- No transform

### cockpitDoor.png (scene-door)
- Flipped: `<img src="assets/cockpitDoor.png" style="transform: scaleX(-1);">`
- The live site applies `#scene-door .cockpit-img { transform: scaleX(-1); }`

## How Claude Uses It
Claude can read image files directly with the Read tool. For coordinate work, Claude reads the asset, estimates coordinates visually, builds the element, and deploys. You iterate from there.

## door-arch Element (in progress)
- Located in `#scene-door` in `index.html`
- CSS: `#door-arch` in `style.css`
- Current position: `top: 9%; left: 50%; transform: translateX(-50%); width: 22%`
- Sits at the top of the arch curve over the cockpit door
- Currently shows placeholder text `---`
- Plan: introduce interactivity here — number display, glow effects, clickable
- Style: blue glow (`#4bb8e9`), dark semi-transparent background, same text-shadow as `.episode`
- `pointer-events: none` for now — enable when ready for interaction
