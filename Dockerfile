# Imagem oficial do Playwright: Node 24 + navegadores + dependências do sistema.
# A versão da imagem precisa ser a mesma do @playwright/test no package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /tests

# Dependências primeiro: só reinstala quando o package.json muda.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN chown -R ubuntu:ubuntu /tests

# Roda sem root: os arquivos gerados ficam com o seu usuário (UID 1000), não com o root.
USER ubuntu

CMD ["npm", "test"]
