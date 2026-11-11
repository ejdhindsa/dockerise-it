import os
import random
from flask import Flask, request, jsonify

app = Flask(__name__)

port = int(os.environ.get("PORT", 8000))
bot_name = os.environ.get("BOT_NAME", "py-bot")
moves = ["rock", "paper", "scissors"]

@app.route("/health", methods=["GET"])
def health():
    return jsonify({ "status": "ok" }), 200

@app.route("/info", methods=["GET"])
def info():
    return jsonify({ "name": bot_name, "language": "Python" })

@app.route("/move", methods=["POST"])
def move():
    body = request.get_json(silent=True) or {}
    
    my_history = body.get("myHistory") if isinstance(body.get("myHistory"), list) else []
    opp_history = body.get("opponentHistory") if isinstance(body.get("opponentHistory"), list) else []

    chosen_move = random.choice(moves)
    return jsonify({"move": chosen_move})

if __name__ == "__main__":
    print(f"{bot_name} listening on port: {port}")
    print("bot starting")
    app.run(host="0.0.0.0", port=port)
