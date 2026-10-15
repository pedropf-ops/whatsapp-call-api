FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts

RUN npm install --omit=dev

# Corrige o encerramento antecipado do envio de audio
RUN node -e 'const fs = require("fs"); const p = "node_modules/baileys-caller/dist/audio-feeder.mjs"; const s = fs.readFileSync(p, "utf8"); const old = "if (!this.#proc)\n            return;"; const replacement = "if (!this.#proc && this.#queue.length === 0)\n            return;"; if (s.split(old).length !== 2) { throw new Error("Trecho da biblioteca nao encontrado ou duplicado"); } fs.writeFileSync(p, s.replace(old, replacement)); console.log("Correcao de audio aplicada");'

# Libera a chamada ativa quando ela termina
RUN node -e 'const fs = require("fs"); const p = "node_modules/baileys-caller/dist/index.mjs"; const s = fs.readFileSync(p, "utf8"); const old = "        this.#activeCall = call;\n        this.#engine.startCall({"; const replacement = "        this.#activeCall = call;\n        call.once(\"ended\", (reason) => {\n            console.log(\"[VoipClient] Chamada encerrada:\", callId, reason);\n            if (this.#activeCall === call) {\n                this.#activeCall = null;\n            }\n        });\n        this.#engine.startCall({"; if (s.split(old).length !== 2) { throw new Error("Trecho de encerramento nao encontrado ou duplicado"); } fs.writeFileSync(p, s.replace(old, replacement)); console.log("Correcao de encerramento aplicada");'

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
