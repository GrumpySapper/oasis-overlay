# Grumpy's thank-you voice clips

The overlay plays a random clip here when someone sends a gift (no clip twice in a row).

1. Put the audio file in this folder (mp3, m4a, ogg, wav or webm; letters, numbers, spaces, `.`, `-`, `_`, `()` only in the name). Keep it short (1-4 s) and level.
2. Add it to `manifest.json`, with the tier it suits: `small` (under 50 diamonds), `medium` (50-99), `big` (100-499), `huge` (500-999), `legend` (1000+, full-screen takeover), `heartme` (the daily Heart Me gift; replaces the bell ding), `request` (gifter's song request) or `any`.

```json
{
  "clips": [
    { "file": "ta-very-much.mp3", "tier": "any" },
    { "file": "cor-blimey.mp3", "tier": "small" },
    { "file": "you-legend.mp3", "tier": "legend" }
  ]
}
```

3. Commit and push. GitHub Pages updates in about a minute; refresh the overlay source in Live Studio/OBS.

With no clips for a tier, `huge`/`legend` borrow the next tier down, then `any`; with none at all the synth sounds play.
URL options: `?voice=after` (default: synth, then clip), `?voice=instead` (clip only), `?voice=off` (synth only), `?sound=0` (mute everything).
