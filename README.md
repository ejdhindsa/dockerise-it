# Dockerise It

Everything for the Docker workshop run by the UWinnipeg Applied Computer Science Association (UWACSSA).

- Day 1 (beginner): Thursday, November 12, 2026, 12:00 to 1:45 pm. Last 15 to 30 minutes are Q&A.
- Day 2 (intermediate): Docker Compose, volumes, healthchecks, smaller images, and a bot tournament.

It's a live demo. Follow along on your own laptop. If you missed Day 1, the walkthrough below is enough to catch up.

## Getting started

You need a laptop and a GitHub account. Installing Docker is optional.

**Option 1: GitHub Codespaces (recommended if you don't have Docker).**

1. Open <https://codespaces.new/ejdhindsa/dockerise-it>
2. Wait 2 to 3 minutes for it to build.
3. Open a terminal with Ctrl+` (Ctrl+backtick, same on Mac). Docker already works there.

`localhost` in your own browser won't reach a codespace. To open a web page running in it, use the Ports tab next to the terminal and click the globe icon on the port. A codespace stops after about 30 minutes idle. Reopen it from github.com/codespaces.

**Option 2: Docker Desktop on your own laptop.** Windows, Mac or Linux. Download it from <https://www.docker.com/products/docker-desktop/> (it's free for students). Then check it works:

```bash
docker run hello-world
```

If you see a "Hello from Docker!" message, you're set.

**The five-minute rule.** If setup isn't working after five minutes, switch to Codespaces and fix your laptop at home. Don't spend the workshop debugging an install.

## What is Docker

Say you build an app on your laptop and it works. Your friend runs it and it breaks, because they have a different Node version, a missing library, a different OS. Docker fixes that by packaging the app together with everything it needs to run, so it behaves the same everywhere.

Three words to know:

- **Image**: a read-only template. The app, its dependencies, and instructions for how to start it. Think of it like a class.
- **Container**: a running instance of an image, with its own process, network and writable layer. Think of it like an object. A stopped container is still a container (`docker ps -a` shows it).
- **Registry**: where images are stored and pulled from. Docker Hub is the default one.

Containers are not virtual machines. A VM runs a whole guest operating system on virtual hardware. A container shares your machine's Linux kernel and only packages the app and its files, so it starts in seconds and is much smaller. On Windows and Mac, Docker Desktop quietly runs a small Linux VM in the background to host the containers, but you don't have to think about that.

Kubernetes (running containers across lots of machines) is out of scope for this workshop.

## What's in the repo

```
dockerise-it/
  .devcontainer/devcontainer.json   Codespaces setup (installs Docker)
  bots/
    js-bot/       Express bot (server.js, package.json, package-lock.json, Dockerfile, .dockerignore)
    python-bot/   Flask bot (app.py, requirements.txt, Dockerfile, .dockerignore)
    arena/        The arena (server.js, package.json, Dockerfile). Pre-built and pushed as ejdhindsa/rps-arena:1.0
```

The demo app is a rock-paper-scissors bot arena. There are two bots in two languages (JavaScript and Python). The arena plays 100 rounds between two bots and shows the score in your browser. The bots are only something to point Docker at. The workshop is about Docker.

The arena image is already built and pushed to Docker Hub for both amd64 and arm64, so you pull it instead of building it.

### The bot contract

Any language can play as long as the bot follows this:

- Listen on port 8000 on all interfaces (0.0.0.0).
- `GET /health` returns 200.
- `GET /info` returns `{ "name": "...", "language": "..." }`. The JS bot calls itself `js-bot` and the Python bot calls itself `py-bot`.
- `POST /move` returns `{ "move": "rock" | "paper" | "scissors" }`. The request body is `{ "myHistory": [...], "opponentHistory": [...] }`. An empty body also works.
- The arena gives each bot 1 second per move. Late or invalid moves forfeit the round.

The arena itself listens on port 3000 and reads bot addresses from the env vars `BOT_A` and `BOT_B`. With no bots it shows "No bots yet". Match results are kept in memory only, so they disappear when the container is removed. Day 2 fixes that with a volume.

## Day 1 walkthrough

Run these in order. If you fell behind, start from the step you're on.

### 1. To Begin

You can get a Python shell and a Java shell without installing either one.

```bash
docker run -it --rm python:3.14
docker run -it --rm eclipse-temurin:21 jshell
```

Leave Python with `exit()` and jshell with `/exit`. Docker pulled each image the first time, ran it, and `--rm` threw the container away when you left.

### 2. Running a container

Here we run the arena with no bots yet. `-d` runs it in the background, and `-p 3000:3000` publishes the port so your browser can reach it (in Codespaces, use the Ports tab).

```bash
docker run -d -p 3000:3000 --name arena ejdhindsa/rps-arena:1.0
docker ps
docker logs arena
docker exec -it arena sh
docker stop arena
docker ps -a
docker rm arena
```

Inside the `exec` shell, create a file with `touch hello.txt`, then `exit`. Remove the container, run a new one, and look for the file. It's gone. Containers are disposable, which is the point.

In `-p 8001:8000` the left number is your laptop and the right number is the container. You'll see that next.

### 3. Build and run the JS bot

From `bots/js-bot`:

```bash
docker build -t js-bot .
docker run -d -p 8001:8000 --name js-bot js-bot
curl -X POST localhost:8001/move
```

The Dockerfile is six short instructions: start from `node:24`, pick a folder, copy the code in, install dependencies, say which port, say how to start. `docker build` turns it into an image, and the `.` at the end is the build context, the folder Docker is allowed to copy files from. You should get back a move like `{"move":"rock"}`.

On Windows PowerShell, type `curl.exe` instead of `curl`.

### 4. Build and run the Python bot

From `bots/python-bot`:

```bash
docker build -t python-bot .
docker run -d -p 8002:8000 --name python-bot python-bot
curl -X POST localhost:8002/move
```

Same shape as the JS Dockerfile. Only the base image (`python:3.14`), an `ENV PYTHONUNBUFFERED=1` line, the install command and the start command change.

Then the issue: Open `bots/python-bot/Dockerfile` and delete `"--host", "0.0.0.0",` from the `CMD` line. Rebuild and run it again (remove the old container first with `docker rm -f python-bot`). The container runs, but curl fails:

```
curl: (56) Recv failure: Connection reset by peer
```

Flask was only listening on the container's own 127.0.0.1, and `-p` sends traffic to the container's network interface, so nothing answers. Put `--host 0.0.0.0` back, then `docker rm -f python-bot`, rebuild, and run it again. Now it works. Node listens on all interfaces by default, which is why the JS bot never had this problem.

One more thing. `-e BOT_NAME=my-bot` on `docker run` changes the name `/info` reports. Env vars are set when the container starts, so to change one you start a new container.

### 5. The first match, broken

Point the arena at both bots using localhost:

```bash
docker rm -f arena
docker run -d -p 3000:3000 --name arena -e BOT_A=http://localhost:8001 -e BOT_B=http://localhost:8002 ejdhindsa/rps-arena:1.0
```

Open the arena page and click Play. You get `Nothing is listening at http://localhost:8001 (connection refused).` Inside the arena container, `localhost` is the arena itself, not your laptop.

### 6. The first match, fixed

Put all three containers on a network you create:

```bash
docker network create arena-net
docker network connect arena-net js-bot
docker network connect arena-net python-bot
docker rm -f arena
docker run -d -p 3000:3000 --name arena --network arena-net -e BOT_A=http://js-bot:8000 -e BOT_B=http://python-bot:8000 ejdhindsa/rps-arena:1.0
docker network inspect arena-net
```

On a network you create, container names work as hostnames. (They don't on Docker's default `bridge` network.) Between containers you use the port inside the container (8000), not the laptop port (8001). Click Play again and the match runs.

### 7. Cleanup

```bash
docker rm -f arena js-bot python-bot
docker network rm arena-net
docker system prune
```

`docker system prune` removes stopped containers, unused networks and leftover build cache. Add `-a` and it also removes every image no container is using. The bot images are big (js-bot is about 1.45 GB, python-bot about 1.66 GB) because I used the full base images on purpose. Day 2 shrinks them.

## Tournament

Optional, but it's the fun part. Write a bot in any language that follows the contract above, put it in a Docker image, push it to Docker Hub, and post the image name in the ACSSA Discord (More details to be posted about it on the discord). The tournament runs at the end of Day 2.

Bots must be built for linux/amd64. You need a free Docker Hub account.

```bash
docker login
docker buildx build --platform linux/amd64 -t YOUR_DOCKERHUB_USER/my-bot:1.0 --push .
```

Swap `YOUR_DOCKERHUB_USER` for your own Docker Hub username. Building inside Codespaces already produces amd64 images, so you don't need to think about it there, in an M-series Mac, that `--platform` flag matters.

## Commands and help

Every command from the workshop, plus the extras people ask about, is in [CHEATSHEET.md](CHEATSHEET.md).

Stuck? Check the common errors section at the bottom of the cheatsheet first. Most setup problems (port already allocated, name already in use, `exec format error`, `toomanyrequests`) are in there with the fix. If you're still stuck after five minutes, use Codespaces.
