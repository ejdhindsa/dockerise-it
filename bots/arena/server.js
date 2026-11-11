import http from "node:http";

const PORT = process.env.PORT || 3000;
const ROUNDS = Number(process.env.ROUNDS) || 100;
const BOT_URLS = [process.env.BOT_A, process.env.BOT_B].filter(Boolean);
const MOVES = ["rock", "paper", "scissors"];
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };
const ICONS = { rock: "✊", paper: "✋", scissors: "✌️", null: "❌" };

// Kept in memory on purpose: it disappears when the container is removed (Day 2 fixes this with a volume).
const matches = [];
let lastError = null;

function describeError(url, err) {
  const code = err.cause?.code || err.cause?.errors?.[0]?.code || err.name;
  if (code === "ECONNREFUSED")
    return `Nothing is listening at ${url} (connection refused).`;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN")
    return `Can't find a host called "${new URL(url).hostname}".`;
  if (code === "TimeoutError")
    return `${url} took longer than 1 second to answer.`;
  return `Couldn't reach ${url}: ${err.message}${err.cause?.code ? ` (${err.cause.code})` : ""}`;
}

async function getInfo(url) {
  const res = await fetch(`${url}/info`, { signal: AbortSignal.timeout(1000) });
  const info = await res.json();
  return { url, name: info.name || url, language: info.language || "?" };
}

async function getMove(url, myHistory, opponentHistory) {
  try {
    const res = await fetch(`${url}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ myHistory, opponentHistory }),
      signal: AbortSignal.timeout(1000),
    });
    const { move } = await res.json();
    return MOVES.includes(move) ? move : null;
  } catch {
    return null;
  }
}

async function playMatch() {
  const [a, b] = await Promise.all(BOT_URLS.map(getInfo));
  const histA = [];
  const histB = [];
  const score = { a: 0, b: 0, draws: 0 };

  for (let i = 0; i < ROUNDS; i++) {
    const [moveA, moveB] = await Promise.all([
      getMove(a.url, histA, histB),
      getMove(b.url, histB, histA),
    ]);
    // A missing or invalid move forfeits the round.
    if (moveA === moveB || (!moveA && !moveB)) score.draws++;
    else if (!moveB || (moveA && BEATS[moveA] === moveB)) score.a++;
    else score.b++;
    histA.push(moveA);
    histB.push(moveB);
  }

  const winner =
    score.a === score.b ? "Draw" : score.a > score.b ? a.name : b.name;
  const lastRounds = histA.slice(-10).map((m, i) => [m, histB.slice(-10)[i]]);
  matches.unshift({ a, b, score, winner, lastRounds, at: new Date() });
  console.log(
    `${a.name} ${score.a} - ${score.b} ${b.name} (draws: ${score.draws}) -> ${winner}`,
  );
}

const escape = (s) =>
  String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function page() {
  const setup =
    BOT_URLS.length < 2
      ? `<p class="note">No bots yet. Start the arena with <code>-e BOT_A=...</code> and <code>-e BOT_B=...</code>.</p>`
      : `<p class="note">Bots: <code>${BOT_URLS.map(escape).join("</code> vs <code>")}</code></p>
       <form method="post" action="/match"><button>Play ${ROUNDS} rounds</button></form>`;
  const error = lastError ? `<p class="error">${escape(lastError)}</p>` : "";
  const rows = matches
    .map(
      (m) => `
    <article>
      <h2>${escape(m.a.name)} <small>${escape(m.a.language)}</small>
        <span class="score">${m.score.a} – ${m.score.b}</span>
        ${escape(m.b.name)} <small>${escape(m.b.language)}</small></h2>
      <p>Winner: <strong>${escape(m.winner)}</strong> · draws: ${m.score.draws}
        · ${m.at.toLocaleTimeString()}</p>
      <p class="rounds">${m.lastRounds.map(([x, y]) => `${ICONS[x]}${ICONS[y]}`).join(" ")}</p>
    </article>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RPS Arena</title><style>
body{font:20px/1.5 system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;background:#111;color:#eee}
h1{font-size:2.2rem;margin:0 0 .5rem}code{background:#222;padding:.1em .3em;border-radius:4px}
button{font:inherit;padding:.6rem 1.2rem;border:0;border-radius:6px;background:#2d7ff9;color:#fff;cursor:pointer}
.error{background:#4a1515;border:1px solid #c44;padding:.8rem;border-radius:6px}
article{border-top:1px solid #333;padding:1rem 0}h2{font-size:1.4rem;margin:0}
small{color:#999;font-weight:normal;font-size:.8rem}.score{margin:0 .6rem;color:#ffd24a}
.rounds{font-size:1.4rem;letter-spacing:.1rem}.note{color:#bbb}
</style></head><body>
<h1>RPS Arena</h1>${setup}${error}
${rows || (BOT_URLS.length === 2 ? `<p class="note">No matches played yet.</p>` : "")}
</body></html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }
  if (req.method === "POST" && req.url === "/match" && BOT_URLS.length === 2) {
    try {
      await playMatch();
      lastError = null;
    } catch (err) {
      const failed = await Promise.all(
        BOT_URLS.map((u) =>
          getInfo(u).then(
            () => null,
            (e) => describeError(u, e),
          ),
        ),
      );
      lastError = failed.filter(Boolean).join(" ") || err.message;
      console.error(lastError);
    }
    res.writeHead(303, { Location: "/" });
    return res.end();
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page());
});

server.listen(PORT, () => console.log(`Arena listening on port ${PORT}`));

process.on("SIGTERM", () => server.close(() => process.exit(0)));
