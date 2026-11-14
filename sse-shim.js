// Cloudflare quick tunnels hold back live streams, so turn fetch(BOX + '/events') into 1-second polling of /api/feed.
(function () {
  var of = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      var u = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (/trycloudflare\.com$/.test(u.hostname) && u.pathname === '/events') {
        var test = u.searchParams.get('channel') === 'test', sig = init && init.signal, enc = new TextEncoder();
        var body = new ReadableStream({ start: function (c) {
          var stop = false, since = -1, lastPing = 0;
          c.enqueue(enc.encode('retry: 3000\n\n'));
          if (sig) sig.addEventListener('abort', function () { stop = true; try { c.close(); } catch (e) {} });
          (async function loop() {
            while (!stop) {
              try {
                var r = await of(u.origin + '/api/feed?since=' + since + (test ? '&channel=test' : ''), { cache: 'no-store' });
                var j = await r.json();
                if (since >= 0 && j.seq >= since) j.events.forEach(function (e) { if (!stop) c.enqueue(enc.encode('data: ' + e.data + '\n\n')); });
                since = j.seq;
              } catch (e) {}
              if (!stop && Date.now() - lastPing > 15000) { lastPing = Date.now(); try { c.enqueue(enc.encode('data: {"type":"ping"}\n\n')); } catch (e) {} }
              await new Promise(function (res) { setTimeout(res, 1000); });
            }
          })();
        } });
        return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
      }
    } catch (e) {}
    return of(input, init);
  };
})();
