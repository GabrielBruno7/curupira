FROM mcr.microsoft.com/playwright:v1.63.0-noble

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /tests

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN chown -R ubuntu:ubuntu /tests

USER ubuntu

CMD ["npm", "test"]
