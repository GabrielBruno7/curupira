# Official Playwright image: Node 24 + browsers + system dependencies.
# The image version must match @playwright/test in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /tests

# Dependencies first: only reinstalls when package.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN chown -R ubuntu:ubuntu /tests

# Runs as non-root: generated files belong to your user (UID 1000), not to root.
USER ubuntu

CMD ["npm", "test"]
