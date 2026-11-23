/* Oasis Radio – Song Hangman shared logic.
   Used by song-hangman.html (overlay) and song-hangman-control.html.
   Preview only: no live pages are changed. Chat play on air needs a small
   Bob backend addition (documented on the control page); this lib also
   accepts future SSE events of type "hangman" or raw "chat"/"comment".
   The puzzle is the SONG TITLE and the BAND, both hidden as letter blanks. Letters count if they are in
   either; typing the title (or "title by band") solves it. The decade/year is an optional host hint. */
(function (root) {
  const LIVES = 7;
  const LETTER_THROTTLE_MS = 1000;
  const USER_COOLDOWN_MS = 4000;
  const CHANNEL = 'oasis-song-hangman';
  const STORE = 'oasisSongHangman';

  // Puzzle = song title + band. Harder picks: deeper cuts and multi-word titles, 1950s-2020s,
  // no Christmas songs. year = original release year, used for the decade/year hint.
  const SONGS = [
    { title: "Whole Lotta Shakin' Goin' On", artist: "Jerry Lee Lewis", year: 1957 },
    { title: "Smoke Gets in Your Eyes", artist: "The Platters", year: 1958 },
    { title: "Summertime Blues", artist: "Eddie Cochran", year: 1958 },
    { title: "Lonely Teardrops", artist: "Jackie Wilson", year: 1958 },
    { title: "Rave On", artist: "Buddy Holly", year: 1958 },
    { title: "Mack the Knife", artist: "Bobby Darin", year: 1959 },
    { title: "Mr. Tambourine Man", artist: "The Byrds", year: 1965 },
    { title: "The Tracks of My Tears", artist: "The Miracles", year: 1965 },
    { title: "Reach Out I'll Be There", artist: "Four Tops", year: 1966 },
    { title: "Waterloo Sunset", artist: "The Kinks", year: 1967 },
    { title: "Nights in White Satin", artist: "The Moody Blues", year: 1967 },
    { title: "A Whiter Shade of Pale", artist: "Procol Harum", year: 1967 },
    { title: "Sunshine of Your Love", artist: "Cream", year: 1967 },
    { title: "All Along the Watchtower", artist: "The Jimi Hendrix Experience", year: 1968 },
    { title: "Gimme Shelter", artist: "The Rolling Stones", year: 1969 },
    { title: "Life on Mars?", artist: "David Bowie", year: 1971 },
    { title: "Tiny Dancer", artist: "Elton John", year: 1971 },
    { title: "Won't Get Fooled Again", artist: "The Who", year: 1971 },
    { title: "Go Your Own Way", artist: "Fleetwood Mac", year: 1976 },
    { title: "Year of the Cat", artist: "Al Stewart", year: 1976 },
    { title: "More Than a Feeling", artist: "Boston", year: 1976 },
    { title: "Hold the Line", artist: "Toto", year: 1978 },
    { title: "Hong Kong Garden", artist: "Siouxsie and the Banshees", year: 1978 },
    { title: "Ever Fallen in Love", artist: "Buzzcocks", year: 1978 },
    { title: "Down in the Tube Station at Midnight", artist: "The Jam", year: 1978 },
    { title: "Wuthering Heights", artist: "Kate Bush", year: 1978 },
    { title: "Once in a Lifetime", artist: "Talking Heads", year: 1980 },
    { title: "Love Will Tear Us Apart", artist: "Joy Division", year: 1980 },
    { title: "Enola Gay", artist: "Orchestral Manoeuvres in the Dark", year: 1980 },
    { title: "Fade to Grey", artist: "Visage", year: 1980 },
    { title: "Ghost Town", artist: "The Specials", year: 1981 },
    { title: "Rebel Yell", artist: "Billy Idol", year: 1983 },
    { title: "Here Comes the Rain Again", artist: "Eurythmics", year: 1984 },
    { title: "The Killing Moon", artist: "Echo & the Bunnymen", year: 1984 },
    { title: "Don't You (Forget About Me)", artist: "Simple Minds", year: 1985 },
    { title: "Hounds of Love", artist: "Kate Bush", year: 1985 },
    { title: "There Is a Light That Never Goes Out", artist: "The Smiths", year: 1986 },
    { title: "Give It Away", artist: "Red Hot Chili Peppers", year: 1991 },
    { title: "Disarm", artist: "The Smashing Pumpkins", year: 1993 },
    { title: "Black Hole Sun", artist: "Soundgarden", year: 1994 },
    { title: "Live Forever", artist: "Oasis", year: 1994 },
    { title: "Champagne Supernova", artist: "Oasis", year: 1995 },
    { title: "Common People", artist: "Pulp", year: 1995 },
    { title: "Fake Plastic Trees", artist: "Radiohead", year: 1995 },
    { title: "Bitter Sweet Symphony", artist: "The Verve", year: 1997 },
    { title: "Somebody Told Me", artist: "The Killers", year: 2004 },
    { title: "Take Me Out", artist: "Franz Ferdinand", year: 2004 },
    { title: "I Bet You Look Good on the Dancefloor", artist: "Arctic Monkeys", year: 2005 },
    { title: "Open Your Eyes", artist: "Snow Patrol", year: 2006 },
    { title: "Fluorescent Adolescent", artist: "Arctic Monkeys", year: 2007 },
    { title: "Dog Days Are Over", artist: "Florence and the Machine", year: 2008 },
    { title: "Pumped Up Kicks", artist: "Foster the People", year: 2010 },
    { title: "Little Talks", artist: "Of Monsters and Men", year: 2011 },
    { title: "Tongue Tied", artist: "Grouplove", year: 2011 },
    { title: "Midnight City", artist: "M83", year: 2011 },
    { title: "Do I Wanna Know?", artist: "Arctic Monkeys", year: 2013 },
    { title: "Riptide", artist: "Vance Joy", year: 2013 },
    { title: "The Less I Know the Better", artist: "Tame Impala", year: 2015 },
    { title: "Green Light", artist: "Lorde", year: 2017 },
    { title: "Cornelia Street", artist: "Taylor Swift", year: 2019 },
    { title: "Heat Waves", artist: "Glass Animals", year: 2020 },
    { title: "Pink Pony Club", artist: "Chappell Roan", year: 2020 },
    { title: "Late Night Talking", artist: "Harry Styles", year: 2022 },
    { title: "Bad Habit", artist: "Steve Lacy", year: 2022 },
    { title: "Kill Bill", artist: "SZA", year: 2022 },
    { title: "Paint the Town Red", artist: "Doja Cat", year: 2023 },
    { title: "Good Luck, Babe!", artist: "Chappell Roan", year: 2024 }
  ];

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\bthe\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function idOf(s) {
    return s.id || (norm(s.title) + '|' + norm(s.artist));
  }

  function lettersOf(s) {
    return new Set(String(s || '').toUpperCase().replace(/[^A-Z]/g, '').split(''));
  }

  function allLetters(title, artist) {
    const set = new Set();
    lettersOf(title).forEach(function (ch) { set.add(ch); });
    lettersOf(artist).forEach(function (ch) { set.add(ch); });
    return set;
  }

  function emptyState() {
    return {
      phase: 'idle',
      roundId: 0,
      puzzleId: null,
      title: '',
      artist: '',
      year: null,
      yearHint: null,
      revealed: [],
      wrong: [],
      lives: LIVES,
      livesLeft: LIVES,
      winner: null,
      recent: [],
      leaderboard: [],
      usedIds: [],
      customSongs: [],
      lastAcceptedAt: 0,
      userCooldown: {},
      startedAt: 0
    };
  }

  function catalog(state) {
    return SONGS.concat((state && state.customSongs) || []);
  }

  function pickPuzzle(state, forced) {
    if (forced) return forced;
    const all = catalog(state);
    const used = new Set(state.usedIds || []);
    let pool = all.filter(function (s) { return !used.has(idOf(s)); });
    if (!pool.length) {
      const last = (state.usedIds || [])[(state.usedIds || []).length - 1];
      pool = all.filter(function (s) { return idOf(s) !== last; });
      if (!pool.length) pool = all.slice();
      state.usedIds = last ? [last] : [];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function isComplete(state) {
    const need = allLetters(state.title, state.artist);
    if (!need.size) return false;
    return Array.from(need).every(function (ch) { return state.revealed.indexOf(ch) >= 0; });
  }

  function award(state, name) {
    const n = String(name || 'Viewer').trim() || 'Viewer';
    const lb = (state.leaderboard || []).map(function (x) { return { name: x.name, solves: x.solves }; });
    const i = lb.findIndex(function (x) { return x.name.toLowerCase() === n.toLowerCase(); });
    if (i >= 0) lb[i].solves += 1;
    else lb.push({ name: n, solves: 1 });
    lb.sort(function (a, b) { return b.solves - a.solves || a.name.localeCompare(b.name); });
    return lb;
  }

  function pushRecent(state, name, guess, ok, kind, now) {
    const row = { name: String(name || 'Viewer').trim() || 'Viewer', guess: String(guess || ''), ok: !!ok, kind: kind || 'letter', t: now || Date.now() };
    state.recent = [row].concat(state.recent || []).slice(0, 12);
    return state;
  }

  function clone(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function startNext(state, opts) {
    const s = clone(state);
    const p = pickPuzzle(s, opts && opts.puzzle);
    const id = idOf(p);
    const usedIds = (s.usedIds || []).filter(function (x, i, a) {
      // If the pool was exhausted, pickPuzzle may have reset usedIds already.
      return true;
    }).concat([id]);
    return {
      phase: 'playing',
      roundId: (s.roundId || 0) + 1,
      puzzleId: id,
      title: p.title,
      artist: p.artist || '',
      year: p.year || null,
      yearHint: null,
      revealed: [],
      wrong: [],
      lives: LIVES,
      livesLeft: LIVES,
      winner: null,
      recent: [],
      leaderboard: s.leaderboard || [],
      usedIds: usedIds,
      customSongs: s.customSongs || [],
      lastAcceptedAt: 0,
      userCooldown: {},
      startedAt: Date.now()
    };
  }

  function cooldownOk(state, name, now, host) {
    if (host) return true;
    const key = String(name || '').trim().toLowerCase();
    if (!key) return true;
    const until = (state.userCooldown || {})[key] || 0;
    return now >= until;
  }

  function markCooldown(state, name, now) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return;
    state.userCooldown = state.userCooldown || {};
    state.userCooldown[key] = now + USER_COOLDOWN_MS;
  }

  function guessLetter(state, letter, name, now, opts) {
    const s = clone(state);
    const host = !!(opts && opts.host);
    const ch = String(letter || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
    now = now || Date.now();
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    if (!ch) return { ok: false, reason: 'not-a-letter', state: s };
    if (s.revealed.indexOf(ch) >= 0 || s.wrong.indexOf(ch) >= 0) {
      return { ok: true, accepted: false, reason: 'already', letter: ch, state: s };
    }
    if (!host && !cooldownOk(s, name, now, false)) {
      return { ok: true, accepted: false, reason: 'cooldown', letter: ch, state: s };
    }
    if (!host && s.lastAcceptedAt && now - s.lastAcceptedAt < LETTER_THROTTLE_MS) {
      return { ok: true, accepted: false, reason: 'throttle', letter: ch, state: s, retry: true };
    }
    const need = allLetters(s.title, s.artist);
    const correct = need.has(ch);
    s.lastAcceptedAt = now;
    markCooldown(s, name, now);
    if (correct) {
      s.revealed = s.revealed.concat([ch]);
      pushRecent(s, name, ch, true, 'letter', now);
      if (isComplete(s)) {
        s.phase = 'won';
        s.winner = { name: String(name || 'Viewer').trim() || 'Viewer', how: 'letters' };
        s.leaderboard = award(s, name);
      }
      return { ok: true, accepted: true, correct: true, letter: ch, win: s.phase === 'won', state: s };
    }
    s.wrong = s.wrong.concat([ch]);
    s.livesLeft = Math.max(0, (s.livesLeft || LIVES) - 1);
    pushRecent(s, name, ch, false, 'letter', now);
    if (s.livesLeft <= 0) {
      s.phase = 'lost';
      s.revealed = Array.from(need);
      s.winner = null;
    }
    return { ok: true, accepted: true, correct: false, letter: ch, lost: s.phase === 'lost', state: s };
  }

  function matchesAnswer(state, text) {
    const t = norm(text);
    if (!t) return false;
    const title = norm(state.title);
    if (!title) return false;
    if (t === title) return true;
    const variants = [
      state.title + ' ' + state.artist,
      state.title + ' by ' + state.artist,
      state.title + ' - ' + state.artist,
      state.artist + ' ' + state.title,
      state.artist + ' - ' + state.title
    ];
    return variants.some(function (v) { return norm(v) === t; });
  }

  function trySolve(state, text, name, now, opts) {
    const s = clone(state);
    const host = !!(opts && opts.host);
    now = now || Date.now();
    const raw = String(text || '').trim();
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    if (norm(raw).length < 2) return { ok: false, reason: 'short', state: s };
    if (!host && !cooldownOk(s, name, now, false)) {
      return { ok: true, accepted: false, reason: 'cooldown', state: s };
    }
    if (!host && s.lastAcceptedAt && now - s.lastAcceptedAt < LETTER_THROTTLE_MS) {
      return { ok: true, accepted: false, reason: 'throttle', state: s, retry: true };
    }
    const hit = matchesAnswer(s, raw);
    s.lastAcceptedAt = now;
    markCooldown(s, name, now);
    if (!hit) {
      pushRecent(s, name, raw, false, 'solve', now);
      return { ok: true, accepted: true, correct: false, reason: 'wrong-solve', state: s };
    }
    s.revealed = Array.from(allLetters(s.title, s.artist));
    s.phase = 'won';
    s.winner = { name: String(name || 'Viewer').trim() || 'Viewer', how: 'solve' };
    s.leaderboard = award(s, name);
    pushRecent(s, name, raw, true, 'solve', now);
    return { ok: true, accepted: true, correct: true, win: true, state: s };
  }

  function handleChat(state, name, text, now, opts) {
    const raw = String(text || '').trim();
    const compact = raw.replace(/[^a-zA-Z]/g, '');
    // A single letter, maybe wrapped in punctuation or emoji, counts as a letter guess.
    if (compact.length === 1 && raw.length <= 6) {
      return guessLetter(state, compact, name, now, opts);
    }
    return trySolve(state, raw, name, now, opts);
  }

  function revealLetter(state) {
    const s = clone(state);
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    const hidden = Array.from(allLetters(s.title, s.artist)).filter(function (ch) {
      return s.revealed.indexOf(ch) < 0;
    });
    if (!hidden.length) return { ok: false, reason: 'none-left', state: s };
    const ch = hidden[Math.floor(Math.random() * hidden.length)];
    s.revealed = s.revealed.concat([ch]);
    s.lastAcceptedAt = Date.now();
    pushRecent(s, 'Grumpy', ch, true, 'hint', Date.now());
    if (isComplete(s)) {
      s.phase = 'revealed';
      s.winner = null;
    }
    return { ok: true, accepted: true, correct: true, letter: ch, host: true, state: s };
  }

  function revealAnswer(state) {
    const s = clone(state);
    if (s.phase !== 'playing' && s.phase !== 'idle') {
      if (s.title) {
        s.revealed = Array.from(allLetters(s.title, s.artist));
        if (s.phase === 'playing') s.phase = 'revealed';
      }
      return { ok: true, state: s };
    }
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    s.revealed = Array.from(allLetters(s.title, s.artist));
    s.phase = 'revealed';
    s.winner = null;
    return { ok: true, state: s };
  }

  // Main hint: first press shows the decade, a second press the exact year.
  function hintYear(state) {
    const s = clone(state);
    if (s.phase !== 'playing') return { ok: false, reason: 'not-playing', state: s };
    if (!s.year) return { ok: false, reason: 'no-year-for-this-song', state: s };
    if (s.yearHint === 'year') return { ok: false, reason: 'year-already-shown', state: s };
    s.yearHint = s.yearHint === 'decade' ? 'year' : 'decade';
    pushRecent(s, 'Grumpy', s.yearHint === 'year' ? 'Year hint' : 'Decade hint', true, 'hint', Date.now());
    return { ok: true, state: s };
  }

  // Decade/year hint text on screen, e.g. "1970s" or "1977" (the band is on the board as blanks).
  function hintText(state) {
    const st = state || {}, parts = [];
    const done = st.phase === 'won' || st.phase === 'lost' || st.phase === 'revealed';
    if (st.year && (done || st.yearHint === 'year')) parts.push(String(st.year));
    else if (st.year && st.yearHint === 'decade') parts.push((Math.floor(st.year / 10) * 10) + 's');
    return parts.join(' · ');
  }

  function skip(state, opts) {
    return { ok: true, state: startNext(state, opts) };
  }

  function addSong(state, title, artist, play, year) {
    const s = clone(state);
    const t = String(title || '').trim();
    const a = String(artist || '').trim();
    if (!t || !/[a-z]/i.test(t)) return { ok: false, reason: 'need-song-title', state: s };
    const y = parseInt(year, 10);
    const song = { title: t, artist: a, year: (y >= 1900 && y <= 2100) ? y : null, id: 'custom-' + Date.now() };
    s.customSongs = (s.customSongs || []).concat([song]);
    if (play) return { ok: true, added: song, state: startNext(s, { puzzle: song }) };
    return { ok: true, added: song, state: s };
  }

  function applyAction(state, action, now) {
    const type = action && action.type;
    if (type === 'next') return { ok: true, state: startNext(state, action) };
    if (type === 'skip') return skip(state, action);
    if (type === 'reveal-letter') return revealLetter(state);
    if (type === 'reveal-answer') return revealAnswer(state);
    if (type === 'hint-year') return hintYear(state);
    if (type === 'add-song') return addSong(state, action.title, action.artist, !!action.play, action.year);
    if (type === 'guess') return guessLetter(state, action.letter, action.name, now, action);
    if (type === 'solve' || type === 'chat') {
      return handleChat(state, action.name, action.text || action.guess, now, action);
    }
    if (type === 'reset-board') {
      const s = emptyState();
      s.customSongs = (state && state.customSongs) || [];
      return { ok: true, state: s };
    }
    return { ok: false, reason: 'unknown', state: state };
  }

  function tokens(line) {
    // Split a title/artist into words of characters, keeping punctuation visible.
    const words = [];
    String(line || '').split(/\s+/).forEach(function (w) {
      if (!w) return;
      const chars = [];
      for (let i = 0; i < w.length; i++) {
        const c = w[i];
        const up = c.toUpperCase();
        if (/[A-Za-z]/.test(c)) chars.push({ kind: 'letter', ch: up, raw: c });
        else chars.push({ kind: 'punct', ch: c, raw: c });
      }
      words.push(chars);
    });
    return words;
  }

  function chatName(d) {
    return (d && (d.nickname || d.uniqueId || d.name || d.user || d.display || d.username || d.unique_id)) || 'Viewer';
  }

  function chatText(d) {
    if (!d) return '';
    return d.comment || d.text || d.msg || d.message || d.content || d.chat || '';
  }

  function isChatEvent(d) {
    if (!d || !d.type) return false;
    return d.type === 'chat' || d.type === 'comment' || d.type === 'message' || d.type === 'tiktok-chat';
  }

  root.OasisHangman = {
    LIVES: LIVES,
    LETTER_THROTTLE_MS: LETTER_THROTTLE_MS,
    USER_COOLDOWN_MS: USER_COOLDOWN_MS,
    CHANNEL: CHANNEL,
    STORE: STORE,
    SONGS: SONGS,
    norm: norm,
    idOf: idOf,
    allLetters: allLetters,
    emptyState: emptyState,
    catalog: catalog,
    isComplete: isComplete,
    startNext: startNext,
    guessLetter: guessLetter,
    trySolve: trySolve,
    handleChat: handleChat,
    matchesAnswer: matchesAnswer,
    revealLetter: revealLetter,
    revealAnswer: revealAnswer,
    skip: skip,
    hintYear: hintYear,
    hintText: hintText,
    addSong: addSong,
    applyAction: applyAction,
    tokens: tokens,
    chatName: chatName,
    chatText: chatText,
    isChatEvent: isChatEvent
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.OasisHangman;
})(typeof window !== 'undefined' ? window : globalThis);
