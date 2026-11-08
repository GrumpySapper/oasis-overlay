// Builds a single-file OFFLINE demo of the Duck Race (three.js inlined, DEMO forced on, no network).
// Usage: node tools/build-duck-demo.js <path/to/three.module.min.js (r169)> <out.html>
const fs = require('fs'), path = require('path');
const [threePath, out] = process.argv.slice(2);
if (!threePath || !out) { console.error('usage: build-duck-demo.js three.module.min.js out.html'); process.exit(1); }
const root = path.join(__dirname, '..');
let s = fs.readFileSync(path.join(root, 'duck-race.html'), 'utf8');
const three = fs.readFileSync(threePath, 'utf8');
if (/<\/script/i.test(three)) throw new Error('three source contains </script');
const inline = f => '<script>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '\n</script>';
// NOTE: replacer FUNCTIONS, never replacement strings – three.js contains `$&`, which String.replace would expand.
s = s.replace('<script src="duck-race-core.js?v=2"></script>', () => inline('duck-race-core.js'));
s = s.replace('<script src="duck-race-3d.js?v=1"></script>', () => inline('duck-race-3d.js') +
  '\n<script type="text/plain" id="three-src">' + three + '</script>\n<script>window.__DUCK_THREE_URL = URL.createObjectURL(new Blob([document.getElementById("three-src").textContent], { type: "text/javascript" }));</script>');
// self-check: the embedded three.js must be byte-identical to the source
{ const i = s.indexOf('id="three-src">') + 'id="three-src">'.length, j = s.indexOf('</script>', i); if (s.slice(i, j) !== three) throw new Error('embedded three.js corrupted'); }
s = s.replace("const DEMO = q.get('demo') === '1'", "const DEMO = true /* offline preview build */");
s = s.replace('<title>Oasis Radio Duck Race</title>', '<title>Oasis Radio Duck Race 3D – OFFLINE DEMO</title>');
for (const must of ['const DEMO = true', '__DUCK_THREE_URL = URL.createObjectURL', 'window.DuckCore', 'window.Duck3D', 'root.Duck3D']) if (!s.includes(must) && must !== 'window.DuckCore' && must !== 'window.Duck3D') throw new Error('missing ' + must);
fs.writeFileSync(out, s); console.log('wrote', out, s.length, 'bytes');
