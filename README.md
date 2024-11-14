# Meetwith

Meetwith provides an easy way to share your (or your DAO's) calendar and schedule meetings without any hassle or back-and-forth communication. All possible by simply connecting your crypto wallet. No registration needed, no more emails (only if you want to) - Own your private data! You know Calendly right? Same thing here, but for web3!

## Basic Setup

First of all, you'll need `node`installed in your environment, and you'll also need [doppler cli](https://docs.doppler.com/docs) with propper access given by one of our team members.

Given that you have the requirements ready, to run the development server:

```bash
npm install
npm run dev
# or
yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Internal Documentation

- [Module Aliases](./docs/module-alias.md) - Learn how module aliases are configured in this project
- [Calendar Integrations](./docs/calendar-integrations.md) - How do external calendar integrations work

## External Documentation

To learn more:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Smart Contracts](https://cryptozombies.io/) - to learn more about smart contracts

## Docker image

### Building

```bash
docker build --build-arg DOPPLER_TOKEN="$(doppler configs tokens create docker --max-age 100m --plain)" -t nextjs-docker .
```

### Running

```bash
docker run -p 3000:3000 -e DOPPLER_TOKEN="TOKEN" nextjs-docker
```

## Deployment with AWS Copilot

The AWS configs are committed in this repo.

If the environments are not setup in AWS, you can run:

```bash
copilot init
copilot env init # name it preview
copilot env init # name it production
copilot deploy -e preview && copilot deploy -e production
```

It should pick up the configs that we already have to set up the environments.

Information about how we do deploy can be found in `./.github/workflows/deploy.yml`.

### Watching logs from your terminal

```bash
copilot svc logs --follow -e preview # preview/production
```

## Contribute

Contributions are welcomed! Please read the [contribution guidelines](CONTRIBUTING.md) first.
