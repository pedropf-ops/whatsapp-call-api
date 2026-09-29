import express from "express";
import { VoipClient } from "baileys-caller";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const AUTH_DIR = process.env.AUTH_DIR || "./auth";

const client = new VoipClient({
  authDir: AUTH_DIR
});

let connected = false;
let connecting = false;

async function connectWhatsApp() {
  if (connected || connecting) return;

  connecting = true;

  try {
    console.log("Conectando ao WhatsApp...");
    console.log("Na primeira execução, escaneie o QR exibido nos logs.");

    await client.connect();

    connected = true;
    console.log("WhatsApp conectado.");
  } catch (error) {
    connected = false;
    console.error("Erro ao conectar ao WhatsApp:", error);
  } finally {
    connecting = false;
  }
}

app.get("/", (req, res) => {
  res.json({
    service: "whatsapp-call-api",
    status: "online",
    whatsapp: connected ? "connected" : "not-connected"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    whatsapp: connected
  });
});

app.post("/call", async (req, res) => {
  try {
    const { number, audioSource, durationMs } = req.body;

    if (!number) {
      return res.status(400).json({
        error: "O campo number é obrigatório."
      });
    }

    if (!connected) {
      return res.status(503).json({
        error: "WhatsApp ainda não está conectado."
      });
    }

    const phoneNumber = String(number).replace(/\D/g, "");

    console.log("DEBUG phoneNumber:", phoneNumber);
    console.log("DEBUG client:", Object.keys(client));

    const call = await client.call(phoneNumber, {
      audioSource: audioSource || "silence",
      ...(durationMs ? { durationMs: Number(durationMs) } : {})
    });

    console.log(`Chamada iniciada para ${phoneNumber}. ID: ${call.callId}`);

    call.on("ringing", () => {
      console.log(`Chamada ${call.callId}: tocando.`);
    });

    call.on("connected", () => {
      console.log(`Chamada ${call.callId}: atendida.`);
    });

    call.on("ended", (reason) => {
      console.log(`Chamada ${call.callId}: encerrada. Motivo: ${reason}`);
    });

    call.on("error", (error) => {
      console.error(`Chamada ${call.callId}: erro:`, error);
    });

    return res.status(202).json({
      success: true,
      callId: call.callId,
      number: phoneNumber,
      status: "started"
    });
  } catch (error) {
    console.error("Erro ao iniciar chamada:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Erro ao iniciar chamada."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Call API rodando na porta ${PORT}`);
  connectWhatsApp();
});

process.on("SIGTERM", () => {
  client.disconnect();
  process.exit(0);
});
