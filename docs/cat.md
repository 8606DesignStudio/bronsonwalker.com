# The Cat

A black cat that lives in the cockpit. Not a guide, not a helper. More of a shepherd, but not even that -- closer to the loving indifference of a cat. It belongs to this space more than the visitor does.

## Location

Curled up on the dash (probable), or near the door on the landing scene (alternate). It does not solicit attention -- you have to seek it out. Finding it is the reward. (Bronson, 2026-07-16)

## Presence on Deeper Pages

The deeper you go into the site, the more it's around. On pages past the
surface, it might be there when you arrive -- peering at you from behind
something, already watching. It's aware you're in its space, but never
menacing: curious, a little mysterious. If you interact with it, it's
friendly. (Bronson, 2026-07-16)

Design implication: the cat is one continuous presence across the whole
site, not a per-page decoration. It got there ahead of you. Each page just
answers: where is it hiding here, and how much of it do you see -- a full
cat on the dash, or just ears and eyes over the edge of a panel.

## Personality

- Aware of you, but not performing for you
- Presence is ambient, not reactive
- The cockpit is its home. You're a guest it's decided to tolerate.

## Cursor Behavior

Does NOT track the cursor constantly. Every 30-90 seconds (randomized), it samples the cursor position. If the cursor moved enough -- maybe it looks over. Maybe it doesn't. Weighted coin flip.

The glance is brief: head turn, a beat, slow drift back to whatever it was doing. Like a cat that's seen the red dot before and isn't sure it wants to bother. Or a toy it wasn't certain it wanted to play with.

The key quality: it never feels reactive. It checked in on its own schedule and found you there.

Rare exception to the indifference: sometimes -- rarely, unpredictably -- it
bats at the cursor as it flies by. A quick paw swipe at the passing mouse,
then back to composure like nothing happened. The instinct won for half a
second. Should feel like a surprise even on the tenth visit: probability
low enough that seeing it feels lucky. (Bronson, 2026-07-16)

**You can't game it.** Swipe past it more than a few times per second and
the odds don't just stay low -- they decay rapidly to zero. Begging for the
swipe guarantees you never get it; the cat sees the red-dot trick coming.
Odds recover only after you've left it alone for a while. The swipe happens
on ITS schedule, to visitors who weren't asking. (Bronson, 2026-07-16)

## Animation States (to be designed)

- Idle / resting
- Grooming
- Slow blink
- Glance (toward cursor)
- Brief track (cursor moving a lot during a glance -- it follows for a second, then loses interest)
- Paw swipe (the rare bat at a passing cursor, then instant composure)
- Wander (when ignored long enough, it moves somewhere on its own)

## Sound

- Low purr underneath the ambient cockpit hum
- Occasional sounds that aren't for you -- just things the cat does
- May react to cockpit sounds (dial click, keypad beep) -- ears perk, then back to not caring

## Teletype Text (if the cat ever speaks -- or for any cockpit text)

Pacing was tuned by hand on real hardware (Arduino Serial Monitor, 2026-07-16)
and these are the rules that made it read cleanly:

- **One uniform beat per character** -- letters, spaces, and line breaks all
  cost exactly the same delay. Any extra pause at spaces or line ends reads
  as jerky, not dramatic.
- **~30 chars/sec (33 ms/beat)** -- brisk typing, just under reading speed,
  so the eye rides along with the cursor and never waits.
- **Clear the display first** -- old text on screen kills the moment.

Simplest working JavaScript version:

```js
const CHAR_MS = 33; // one beat -- the whole rhythm is this one knob

function typewriter(el, text, done) {
  el.textContent = "";                 // clear the "monitor" first
  let i = 0;
  (function tick() {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(tick, CHAR_MS);
    } else if (done) {
      done();                          // optional: chain what happens after
    }
  })();
}

// usage: typewriter(dialogueBox, "mrrp.", () => catLooksAway());
```

Fits the cat's character: if it speaks at all, sparse and on its own schedule.
Also reusable for any cockpit readout -- the "incoming transmission" vibe
matches the submarine world. Original Arduino version this was distilled
from: `DOE/projects/sandbox/blink_hello/blink_hello.ino`.

## Visual Style

TBD. Needs a visual identity before behavior can be built around it.
Animation states depend on art style and how it moves.

## Notes

- This is a character, not a UI element
- Further down the line -- document first, build later
- The website is a sandbox in constant development; the cat grows with it
