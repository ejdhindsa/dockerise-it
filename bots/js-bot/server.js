import express from "express";

const app = express();
const port = process.env.PORT || 8000;
const botName = process.env.BOT_NAME || "js-bot";
const moves = ["rock", "paper", "scissors"];

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "Ok" });
});

app.get("/info", (req, res) => {
  res.json({ name: botName, language: "JavaScript" });
});

app.post("/move", (req, res) => {
  const myHistory = Array.isArray(req.body?.myHistory)
    ? req.body.myHistory
    : [];
  const oppHistory = Array.isArray(req.body?.opponentHistory)
    ? req.body.opponentHistory
    : [];

  const move = moves[Math.floor(Math.random() * moves.length)];
  res.json({ move });
});

app.listen(port, () => {
  console.log(`${botName} listening on port: ${port}`);
});
