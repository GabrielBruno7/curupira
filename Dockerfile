# Imagem com tudo que os testes precisam: Node 24 + Chromium + dependências do sistema.
FROM node:24-bookworm-slim

# Navegador numa pasta fixa, fora do /root, para o usuário "node" achar.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /tests

# Dependências primeiro: só reinstala quando o package.json muda.
COPY package.json package-lock.json ./
RUN npm ci

# Chromium e as bibliotecas do Linux que ele usa (precisa de root para o apt).
RUN npx @e2e-dev/web install chromium --with-deps

COPY . .
RUN chown -R node:node /tests

# Roda sem root: os arquivos em .e2e/ ficam com o seu usuário (UID 1000), não com o root.
USER node

CMD ["npm", "test"]
