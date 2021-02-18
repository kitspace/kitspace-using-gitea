# Kitspace Using a Gitea Backend

_work in progress_

![Publish Docker images status badge](https://github.com/kitspace/kitspace-v2/workflows/Publish%20Docker%20images/badge.svg)


Re-writing [Kitspace](https://github.com/kitspace/kitspace) to use [Gitea](https://github.com/go-gitea/gitea) as a Git and authentication service.

## Goals
Allow people to:
1. Add projects without knowing Git/Github
2. Still import/sync external Git repositories
3. Edit/make improvements and propose these changes to project creators


## Development

### Set Up
0. Get all the source code
```
git clone https://github.com/kitspace/kitspace-using-gitea
cd kitspace-using-gitea
git submodule update --init
```

1. Install [Docker](https://www.docker.com/get-started) and [docker-compose](https://pypi.org/project/docker-compose/) (on Ubuntu: `snap install docker` and `apt install docker-compose`)
2. Add the following to `/etc/hosts` (If you are not using Linux this won't work, please open an issue and we'll figure out how to support non-Linux development).

```
172.17.0.1    kitspace.test
172.17.0.1    gitea.kitspace.test
172.17.0.1    processor.kitspace.test
```

3. Copy the example .env

```
cp .env.example .env
```
4. Build and run the docker containers
```
docker-compose up
```

5. Go to [gitea.kitspace.test:3000/install](http://gitea.kitspace.test:3000/install) and complete the install (everything should already be filled in correctly). Create a new user and login, this will be the admin user.


## Frontend

The frontend is a [NextJS](https://nextjs.org) server in the [frontend directory](frontend/). Making edits on the code should auto compile and reload at [kitspace.test:3000](http://kitspace.test:3000).

Changing dependencies requires you to restart the development container:

```
cd frontend
yarn add <new dependency>
cd ..
docker-compose restart frontend
```

## Gitea

This is built from a git submodule of [our fork of Gitea](https://github.com/kitspace/gitea).

When it first builds the docker container it builds the whole Gitea project (`make clean-all build`). When you restart the container it recompiles only the backend and doesn't recompile unchanged files (`make backend`).


## Processor

This is a NodeJS and [Express](https://expressjs.com/) server that processes all the assets. As with the frontend, changing dependencies requires you to restart the development container.


## Running Integration Tests

1. Make sure the frontend is being served at [http://kitspace.test:3000](http://kitspace.test:3000); by following the `Set Up` steps.

2. navigate to `frontend`: `cd frontend/`.

3. Source the `.env` file with `set -a && source ../.env && set +a`

4. Start the testing client with the `npx cypress open` command.

5. The Cypress GUI should pop up.

6. To run all tests, press `Run all specs`.
