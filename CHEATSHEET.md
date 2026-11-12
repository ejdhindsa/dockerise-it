# Docker cheatsheet

Commands from Day 1 of Dockerise It, grouped by what you're trying to do. Examples use the workshop names: `js-bot`, `python-bot`, `arena`, the network `arena-net`, and the image `ejdhindsa/rps-arena:1.0`. Compose is coming on Day 2, so it's not here.

Jump to: [Check Docker](#check-docker-works) | [Images](#images) | [Run](#running-containers) | [Look](#looking-at-containers) | [Stop and remove](#stopping-and-removing) | [Networks](#networks) | [Cleanup](#cleanup) | [Docker Hub](#docker-hub) | [Dockerfile](#dockerfile-instructions) | [Reading -p](#reading--p) | [Errors](#common-errors-and-fixes)

## Check Docker works

| Command                  | What it does                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `docker --version`       | Prints the Docker version. Quick check that the CLI is installed.                  |
| `docker version`         | Shows client and server versions. If the server part errors, Docker isn't running. |
| `docker run hello-world` | Pulls a tiny test image and runs it. If you see the welcome message, you're good.  |

## Images

An image is a read-only template. A container is a running copy of it.

| Command                    | What it does                                                                                                                                | Example                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `docker pull <image>`      | Downloads an image from a registry (Docker Hub by default).                                                                                 | `docker pull ejdhindsa/rps-arena:1.0` |
| `docker images`            | Lists images on your machine, with sizes.                                                                                                   |                                       |
| `docker build -t <name> .` | Builds an image from the Dockerfile in the current folder. `-t` names it. The `.` is the build context (the folder Docker can `COPY` from). | `docker build -t js-bot .`            |
| `docker rmi <image>`       | Removes an image. Fails if a container still uses it.                                                                                       | `docker rmi js-bot`                   |
| `docker history <image>`   | Shows the layers an image is made of and how big each one is.                                                                               | `docker history js-bot`               |

Run the build commands from inside the bot's folder (`bots/js-bot` or `bots/python-bot`). Otherwise you get `failed to read dockerfile`.

## Running containers

`docker run <image>` creates a container from an image and starts it. The flags go before the image name.

| Flag                  | What it does                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `-d`                  | Detached. Runs in the background and gives you your terminal back.                                                              |
| `-p 8001:8000`        | Publishes a port. Laptop port on the left, container port on the right. See [Reading -p](#reading--p).                          |
| `--name js-bot`       | Gives the container a name, so you don't have to use the random ID.                                                             |
| `-e BOT_NAME=my-bot`  | Sets an environment variable inside the container. Only applies when the container starts. To change it, start a new container. |
| `--rm`                | Deletes the container when it exits. Good for throwaway ones.                                                                   |
| `-it`                 | Interactive plus a terminal. Needed for shells and REPLs.                                                                       |
| `--network arena-net` | Puts the container on that network when it starts.                                                                              |

Examples:

```bash
docker run -d -p 3000:3000 --name arena ejdhindsa/rps-arena:1.0
docker run -d -p 8001:8000 --name js-bot js-bot
docker run -d -p 8002:8000 --name python-bot python-bot
docker run -it --rm python:3.14
docker run -d -p 3000:3000 --name arena --network arena-net -e BOT_A=http://js-bot:8000 -e BOT_B=http://python-bot:8000 ejdhindsa/rps-arena:1.0
```

Leave the Python prompt with `exit()`. In `jshell` (`docker run -it --rm eclipse-temurin:21 jshell`) it's `/exit`.

## Looking at containers

| Command                        | What it does                                                                                 | Example                    |
| ------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------- |
| `docker ps`                    | Lists running containers.                                                                    |                            |
| `docker ps -a`                 | Lists all containers, including stopped ones. A stopped container is still a container.      |                            |
| `docker logs <name>`           | Prints what the container has written so far.                                                | `docker logs arena`        |
| `docker logs -f <name>`        | Same, but keeps following new output. Ctrl+C to stop watching (the container keeps running). | `docker logs -f js-bot`    |
| `docker exec -it <name> sh`    | Opens a shell inside a running container. Type `exit` to leave.                              | `docker exec -it arena sh` |
| `docker exec <name> <command>` | Runs one command inside a running container.                                                 | `docker exec arena ls`     |

## Stopping and removing

| Command                    | What it does                                                                                                                       | Example                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `docker stop <name>`       | Asks the container to stop (SIGTERM), then kills it after 10 seconds. The bots take the full 10 because they don't handle SIGTERM. | `docker stop js-bot`                   |
| `docker rm <name>`         | Removes a stopped container. Its files go with it.                                                                                 | `docker rm js-bot`                     |
| `docker rm -f <name>`      | Stops and removes in one go. You'll use this a lot.                                                                                | `docker rm -f arena`                   |
| `docker rm -f <a> <b> <c>` | Same, for several containers.                                                                                                      | `docker rm -f arena js-bot python-bot` |

## Networks

Containers on a network you create can reach each other by container name. This doesn't work on Docker's default `bridge` network. Between containers, use the port inside the container (8000), not your laptop port (8001).

| Command                                    | What it does                                         | Example                                   |
| ------------------------------------------ | ---------------------------------------------------- | ----------------------------------------- |
| `docker network create <name>`             | Makes a new network.                                 | `docker network create arena-net`         |
| `docker network connect <net> <container>` | Adds a running container to a network.               | `docker network connect arena-net js-bot` |
| `docker network inspect <net>`             | Shows details, including which containers are on it. | `docker network inspect arena-net`        |
| `docker network ls`                        | Lists networks.                                      |                                           |
| `docker network rm <net>`                  | Removes a network.                                   | `docker network rm arena-net`             |

## Cleanup

| Command                  | What it does                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `docker system prune`    | Removes stopped containers, unused networks and leftover build cache. Asks before it does it.                 |
| `docker system prune -a` | Does all of that and also removes every image no container is using. You'll have to pull or build them again. |

## Docker Hub

| Command                                                                       | What it does                                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `docker login`                                                                | Logs you in to Docker Hub. A free account also fixes `toomanyrequests` when pulling.         |
| `docker push <user>/<image>:<tag>`                                            | Uploads an image to your Docker Hub account. The image name has to start with your username. |
| `docker buildx build --platform linux/amd64 -t <user>/<image>:<tag> --push .` | Builds for a specific CPU type and pushes in one step.                                       |

For the tournament, your bot has to be built for `linux/amd64`:

```bash
docker login
docker buildx build --platform linux/amd64 -t YOUR_DOCKERHUB_USER/my-bot:1.0 --push .
```

Codespaces already builds amd64 images. This matters mostly on an M-series Mac, where a plain `docker build` makes an arm64 image and you get `exec format error` on other machines.

## Dockerfile instructions

| Instruction | What it means                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FROM`      | The base image to start from. Every Dockerfile starts with one.                                                                                                 |
| `WORKDIR`   | Sets the folder inside the image that later instructions run in. Creates it if it doesn't exist.                                                                |
| `COPY`      | Copies files from the build context into the image. `COPY . .` is context folder to current `WORKDIR`.                                                          |
| `RUN`       | Runs a command while building the image (installing dependencies, for example).                                                                                 |
| `ENV`       | Sets an environment variable in the image.                                                                                                                      |
| `EXPOSE`    | Documents which port the app listens on. It doesn't publish anything. `-p` does that.                                                                           |
| `CMD`       | The command that runs when a container starts. Exec form `["node", "server.js"]` runs the program directly. Shell form `node server.js` goes through `/bin/sh`. |

`.dockerignore` is a file next to the Dockerfile that keeps files out of the build context (`node_modules`, virtual envs, `.env` secrets).

The two workshop Dockerfiles:

`bots/js-bot/Dockerfile`

```dockerfile
FROM node:24
WORKDIR /app
COPY . .
RUN npm ci --omit=dev
EXPOSE 8000
CMD ["node", "server.js"]
```

`bots/python-bot/Dockerfile`

```dockerfile
FROM python:3.14
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
CMD ["flask", "--app", "app", "run", "--host", "0.0.0.0", "--port", "8000"]
```

What's different: the `FROM` image, Python's `ENV PYTHONUNBUFFERED=1`, the install command, and the start command. Same shape otherwise.

The `--host 0.0.0.0` in the Python `CMD` matters. Without it Flask only listens on the container's own 127.0.0.1 and `-p` can't reach it. Node listens on all interfaces by default.

## Reading -p

```
-p 8001:8000
   |    |
   |    +-- container port (inside)
   +------- laptop port (your side)
```

Left is your laptop, right is the container. `-p 8001:8000` sends traffic hitting `localhost:8001` on your laptop to port 8000 inside the container. That's why you can run the JS bot on 8001 and the Python bot on 8002 even though both listen on 8000 inside.

If you're in a codespace, `localhost` in your own browser won't work. Use the Ports tab and click the globe icon.

## Common errors and fixes

| Error                                                       | Fix                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker: command not found` or `'docker' is not recognized` | Docker isn't installed, or you opened the terminal before installing. Open a new one. On WSL: Docker Desktop, Settings, Resources, WSL integration, turn on your distro. Otherwise use Codespaces. |
| `Cannot connect to the Docker daemon`                       | Docker Desktop isn't running. Open it and wait for "Engine running". In a codespace, wait a minute and retry.                                                                                      |
| `port is already allocated`                                 | Something already uses that laptop port, usually your own old container. `docker rm -f <name>` or pick another left-hand port.                                                                     |
| `The container name "/js-bot" is already in use`            | `docker rm -f js-bot`, then run again.                                                                                                                                                             |
| `Connection reset by peer`                                  | The app inside listens on 127.0.0.1. Make it listen on 0.0.0.0.                                                                                                                                    |
| Arena says `connection refused`                             | You used `localhost` between containers. Put them on the same network and use container names with port 8000.                                                                                      |
| `failed to read dockerfile`                                 | You're not in the folder with the Dockerfile, or Windows saved it as `Dockerfile.txt`.                                                                                                             |
| `exec format error`                                         | The image was built for a different CPU (an M-series Mac, for example). Build with `--platform linux/amd64`.                                                                                       |
| curl acts weird in Windows PowerShell                       | PowerShell's `curl` is a different command. Type `curl.exe`.                                                                                                                                       |
| `toomanyrequests` when pulling                              | Docker Hub limits logged-out pulls per IP and campus shares one. Run `docker login` with a free account.                                                                                           |
