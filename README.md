# DIG DUG (web recreation)

A faithful browser recreation of the 1982 Namco arcade classic — built with vanilla
JavaScript, HTML5 canvas, and Web Audio. No frameworks, no build step, no assets:
all sprites are original pixel art drawn in code, and all sounds are synthesized
at runtime in the style of Namco's 3-voice wavetable sound hardware.

This is a fan tribute for personal/educational use. Dig Dug is a trademark of
Bandai Namco; no original ROM graphics or audio are used.

## Play

Serve the directory with any static file server and open it:

```sh
python3 -m http.server 8080
# → http://localhost:8080
```

(ES modules require http://, so opening index.html directly from disk won't work.)

## Controls

| Key | Action |
|-----|--------|
| Arrows / WASD | Move & dig |
| Space | Fire pump / inflate |
| Enter | Start / insert coin |
| M | Mute |

## Faithful to the original

- 224×288 portrait playfield, 4 dirt layers, 2px-resolution digging with rounded tunnel edges
- Pooka & Fygar AI: tunnel patrol, player chase, ghost mode through dirt
- Pump mechanics: 4 inflation stages, deflation when you stop pumping
- Rocks: wobble, fall, crush chains; 2 rocks dropped spawns the bonus vegetable
- Original scoring tables (depth-based kill scores, horizontal Fygar ×2, rock chains, vegetables)
- Music only plays while you're moving — just like the arcade
- Round progression, flower counters, last-enemy-flees behavior

## Deploy

It's a static site — any web server can host the repo root as-is.
