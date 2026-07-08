# syntax=docker/dockerfile:1.3
#--------------------------------------------
# Patched Orders App Stage
# Builds @openmrs/esm-patient-orders-app from our fork of
# openmrs-esm-patient-chart (translatable priority labels + laterality
# support for TestOrder-backed order types). The branch is based on
# v12.2.1, which must match the version pinned in spa-assemble-config.json.
#--------------------------------------------
FROM --platform=$BUILDPLATFORM node:22-alpine as orders_app_fork

ARG PATIENT_CHART_FORK_REF=fix/general-order-priority-labels-v12.2.1

RUN apk add --no-cache git python3 make g++
WORKDIR /build
ARG CACHE_BUST
RUN for i in 1 2 3; do \
    git clone --depth 1 --branch ${PATIENT_CHART_FORK_REF} https://github.com/cerveaubleu64/openmrs-esm-patient-chart.git . && break; \
    if [ "$i" = "3" ]; then exit 1; fi; sleep 10; \
  done
# The repo uses enableGlobalCache:false, so its yarn cache lives in .yarn/cache
RUN --mount=type=cache,target=/root/.cache/node/corepack \
  --mount=type=cache,target=/build/.yarn/cache \
  corepack enable && \
  for i in 1 2 3; do \
    yarn install && break; \
    if [ "$i" = "3" ]; then exit 1; fi; \
    echo "yarn install attempt $i failed, retrying..."; sleep 10; \
  done
RUN yarn workspace @openmrs/esm-patient-orders-app build

#--------------------------------------------
# Custom Orders App Stage
# Builds cerveaubleu-drc-esm-orders-app (Radiology & Imaging / Procedures
# home dashboards with lab-style fulfillment + patient chart tab).
#--------------------------------------------
FROM --platform=$BUILDPLATFORM node:22-alpine as custom_orders_app

ARG CUSTOM_ORDERS_APP_REF=main

RUN apk add --no-cache git python3 make g++
WORKDIR /build
ARG CACHE_BUST
RUN for i in 1 2 3; do \
    git clone --depth 1 --branch ${CUSTOM_ORDERS_APP_REF} https://github.com/cerveaubleu64/cerveaubleu-drc-esm-orders-app.git . && break; \
    if [ "$i" = "3" ]; then exit 1; fi; sleep 10; \
  done
RUN --mount=type=cache,target=/root/.cache/node/corepack \
  --mount=type=cache,target=/root/.yarn/berry/cache \
  corepack enable && \
  for i in 1 2 3; do \
    yarn install --immutable && break; \
    if [ "$i" = "3" ]; then exit 1; fi; \
    echo "yarn install attempt $i failed, retrying..."; sleep 10; \
  done
RUN yarn build

#--------------------------------------------
# Dev Stage - Assembles and Builds Frontend
#--------------------------------------------
FROM --platform=$BUILDPLATFORM node:22-alpine as dev

ARG APP_SHELL_VERSION=next

RUN mkdir -p /app
WORKDIR /app

COPY spa-assemble-config.json .
COPY spa-build-config.json .

ARG CACHE_BUST
RUN mkdir -p configuration
COPY ./configuration/*.json configuration

# Be resilient to flaky networks: npm retries with generous timeouts, a shared
# npm cache across builds (BuildKit cache mount), and up to 3 attempts per step
# (retries reuse the npm cache, so they only re-fetch what is missing).
ENV NPM_CONFIG_FETCH_RETRIES=5 \
  NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
  NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

RUN --mount=type=cache,target=/root/.npm \
  for i in 1 2 3; do \
    npx --legacy-peer-deps openmrs@${APP_SHELL_VERSION:-next} assemble --manifest --mode config --config spa-assemble-config.json --config-file configuration/*.json --target ./spa && break; \
    if [ "$i" = "3" ]; then exit 1; fi; \
    echo "assemble attempt $i failed, retrying..."; sleep 10; \
  done
RUN --mount=type=cache,target=/root/.npm \
  for i in 1 2 3; do \
    npx --legacy-peer-deps openmrs@${APP_SHELL_VERSION:-next} build --build-config spa-build-config.json --target ./spa && break; \
    if [ "$i" = "3" ]; then exit 1; fi; \
    echo "build attempt $i failed, retrying..."; sleep 10; \
  done
RUN if [ ! -f ./spa/index.html ]; then echo 'Build failed. Please check the logs above for details. This may have happened because of an update to a library that OpenMRS depends on.'; ls -al ./spa; exit 1; fi

# Replace the stock esm-patient-orders-app with our fork build (same importmap
# path, so no importmap change is needed). The `test -d` guard fails the build
# loudly if the version pinned in spa-assemble-config.json drifts from the
# fork branch base declared in the orders_app_fork stage above.
RUN test -d ./spa/openmrs-esm-patient-orders-app-12.2.1 && rm -rf ./spa/openmrs-esm-patient-orders-app-12.2.1/*
COPY --from=orders_app_fork /build/packages/esm-patient-orders-app/dist/ ./spa/openmrs-esm-patient-orders-app-12.2.1/

# Add the custom cerveaubleu-drc-esm-orders-app to the assembled SPA and
# register it in the importmap and routes registry.
COPY --from=custom_orders_app /build/dist/ ./spa/cerveaubleu-drc-esm-orders-app-1.0.0/
RUN node -e "\
const fs = require('fs'); \
const APP = 'cerveaubleu-drc-esm-orders-app'; \
const DIR = APP + '-1.0.0'; \
const im = JSON.parse(fs.readFileSync('./spa/importmap.json', 'utf8')); \
im.imports[APP] = './' + DIR + '/' + APP + '.js'; \
fs.writeFileSync('./spa/importmap.json', JSON.stringify(im, null, 2)); \
const reg = JSON.parse(fs.readFileSync('./spa/routes.registry.json', 'utf8')); \
reg[APP] = JSON.parse(fs.readFileSync('./spa/' + DIR + '/routes.json', 'utf8')); \
fs.writeFileSync('./spa/routes.registry.json', JSON.stringify(reg, null, 2)); \
console.log('registered', APP);"

#--------------------------------------------
# Runtime Stage - Published Image
#--------------------------------------------
FROM nginx:1.25-alpine

RUN apk update && \
  apk upgrade && \
  # add more utils for sponge and envsubst
  apk add --no-cache moreutils

# clear any default files installed by nginx
RUN rm -rf /usr/share/nginx/html/*

COPY startup.sh /usr/local/bin/startup.sh
RUN chmod +x /usr/local/bin/startup.sh

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=dev /app/spa /usr/share/nginx/html
COPY *.json /usr/share/nginx/html
COPY ./assets /usr/share/nginx/html

CMD ["/usr/local/bin/startup.sh"]
