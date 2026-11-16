# Christmas gift-thanks clips (preview only)

Used by `overlay-xmas-preview.html` and the standalone demo `gift-thanks-xmas-preview.html`. The live overlay (`overlay.html` + `sounds/thanks/`) is unchanged.

Each `thanks-*.mp3` is a sleigh-bell / “Jingle Bells” motif plus a Santa “ho ho ho”, scaled by gift tier:

| File | Tier | About |
| --- | --- | --- |
| thanks-heartme.mp3 | heartme | Short shake + ding, one soft ho (~1.8s) |
| thanks-small.mp3 | small | Short jingle, one ho (~2.1s) |
| thanks-medium.mp3 | medium | Opening “Jingle Bells” motif, two hos (~3.2s) |
| thanks-request.mp3 | request | Same shape as medium, two slightly deeper hos (~3.2s) |
| thanks-big.mp3 / thanks-big-b.mp3 | big | Longer motif, three hos (~4.6s); two variants so a repeat is not identical |
| thanks-huge.mp3 | huge | Extended motif, four hos (~6.0s) |
| thanks-legend.mp3 | legend | Fullest phrase + sparkle, five hos (~6.7s) |

`ho-*.mp3` and `jingle-*.mp3` are the isolated parts, for the demo page. See `SOURCES.md` for licence. Peaks are about −3 dBFS, mixed to sit under speech and music; the overlay still honours `?vol=` and `?sound=0`.
