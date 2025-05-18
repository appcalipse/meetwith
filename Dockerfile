# Based on https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
# but reverting to this version this: https://github.com/ijjk/next.js/commit/95501c4bed91893ea9614566cf4ad7eb838c989d due not not having standalone output working

# Install dependencies only when needed
FROM node:18.19-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN apk add git
RUN apk add --update python3 make g++\
   && rm -rf /var/cache/apk/*

RUN corepack enable
RUN corepack prepare yarn@4.9.1 --activate

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY ./patches ./patches
RUN yarn install --immutable

# Rebuild the source code only when needed
FROM node:18.19-alpine AS builder
# Install Doppler CLI
RUN wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub && \
    echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' | tee -a /etc/apk/repositories && \
    apk add doppler

RUN corepack enable
RUN corepack prepare yarn@4.9.1 --activate

WORKDIR /app
ARG DOPPLER_TOKEN

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarnrc.yml ./
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN yarn build

# Production image, copy all the files and run next
FROM node:18.19-alpine AS runner
# Install Doppler CLI
RUN wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub && \
    echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' | tee -a /etc/apk/repositories && \
    apk add doppler

RUN corepack enable
RUN corepack prepare yarn@4.9.1 --activate

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/zoom-token.json ./zoom-token.json
COPY --from=builder --chown=nextjs:nodejs /app/credentials.json ./credentials.json
COPY --from=builder --chown=nextjs:nodejs /app/google-master-token.json ./google-master-token.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.yarnrc.yml ./
COPY --from=builder /app/src/emails ./src/emails

USER nextjs

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["doppler", "run", "--", "yarn", "next", "start"]
