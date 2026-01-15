FROM node:20.17.0-alpine AS deps

RUN apk add --no-cache libc6-compat git python3 make g++ \
    && rm -rf /var/cache/apk/* \
    && corepack enable \
    && corepack prepare yarn@4.9.1 --activate

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY ./patches ./patches
RUN yarn install --immutable


FROM node:20.17.0-alpine AS builder

RUN wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub \
    && echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' | tee -a /etc/apk/repositories \
    && apk add doppler \
    && corepack enable \
    && corepack prepare yarn@4.9.1 --activate

WORKDIR /app
ARG DOPPLER_TOKEN

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarnrc.yml ./
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=4096"

RUN yarn build


FROM node:20.17.0-alpine AS prod-deps

RUN corepack enable \
    && corepack prepare yarn@4.9.1 --activate

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY ./patches ./patches

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN yarn workspaces focus --all --production


FROM node:20.17.0-alpine AS runner

RUN wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub \
    && echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' | tee -a /etc/apk/repositories \
    && apk add --no-cache doppler chromium nss freetype harfbuzz ca-certificates ttf-freefont \
    && rm -rf /var/cache/apk/* \
    && corepack enable \
    && corepack prepare yarn@4.9.1 --activate \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_OPTIONS="--max-old-space-size=4096"

COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/package.json ./
COPY --from=prod-deps --chown=nextjs:nodejs /app/.yarnrc.yml ./
COPY --from=prod-deps --chown=nextjs:nodejs /app/.yarn ./.yarn

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/zoom-token.json ./zoom-token.json
COPY --from=builder --chown=nextjs:nodejs /app/credentials.json ./credentials.json
COPY --from=builder --chown=nextjs:nodejs /app/google-master-token.json ./google-master-token.json
COPY --from=builder --chown=nextjs:nodejs /app/src/emails ./src/emails
COPY --from=builder --chown=nextjs:nodejs /app/.yarnrc.yml ./
COPY --from=builder --chown=nextjs:nodejs /app/yarn.lock ./

USER nextjs

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["doppler", "run", "--", "yarn", "next", "start"]
