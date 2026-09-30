const fs = require("fs");

const file = "node_modules/baileys-caller/dist/index.mjs";

let source = fs.readFileSync(file, "utf8");

const oldCode = `        const targetNumber = phoneNumber.replace(/\\D/g, "");
        const targetPnJid = \`\${targetNumber}@s.whatsapp.net\`;
        const durationMs = opts.durationMs ?? 120_000;
        const audioSource = opts.audioSource ?? "silence";
        const peerLid = await this.#signaling.resolveLid(targetPnJid);
        if (!peerLid)
            throw new Error(\`Could not resolve LID for \${targetPnJid}\`);`;

const newCode = `        let targetNumber = phoneNumber.replace(/\\D/g, "");
        let targetPnJid = \`\${targetNumber}@s.whatsapp.net\`;
        const durationMs = opts.durationMs ?? 120_000;
        const audioSource = opts.audioSource ?? "silence";
        let peerLid = await this.#signaling.resolveLid(targetPnJid);

        // Fallback para celulares brasileiros:
        // 55 + DDD + 9 + 8 digitos -> tenta tambem sem o nono digito.
        if (!peerLid && /^55\\d{2}9\\d{8}$/.test(targetNumber)) {
            const normalizedNumber =
                targetNumber.slice(0, 4) + targetNumber.slice(5);

            const normalizedPnJid =
                \`\${normalizedNumber}@s.whatsapp.net\`;

            const normalizedLid =
                await this.#signaling.resolveLid(normalizedPnJid);

            if (normalizedLid) {
                console.log(
                    \`Numero normalizado pelo WhatsApp: \${targetNumber} -> \${normalizedNumber}\`
                );

                targetNumber = normalizedNumber;
                targetPnJid = normalizedPnJid;
                peerLid = normalizedLid;
            }
        }

        if (!peerLid)
            throw new Error(\`Could not resolve LID for \${targetPnJid}\`);`;

if (source.includes(newCode)) {
    console.log("Patch do baileys-caller ja aplicado.");
    process.exit(0);
}

if (!source.includes(oldCode)) {
    console.error("ERRO: trecho original do baileys-caller nao encontrado.");
    process.exit(1);
}

source = source.replace(oldCode, newCode);

fs.writeFileSync(file, source);

console.log("Patch brasileiro do baileys-caller aplicado com sucesso.");


// Diagnostico do audio
const audioFile = "node_modules/baileys-caller/dist/audio-feeder.mjs";
let audioSource = fs.readFileSync(audioFile, "utf8");

const audioOld = `    start = () => {
        if (this.#proc)
            return;`;

const audioNew = `
    start = () => {
        console.log("[AudioFeeder] START source=", this.source, "rate=", this.sampleRate, "channels=", this.channels, "frames=", this.framesPerChunk);
        if (this.#proc)
            return;
        this._debugDataLogged = false;
        this._debugLastChunks = 0;
`;

if (audioSource.includes(audioNew)) {
    console.log("Patch de diagnostico do audio ja aplicado.");
} else if (audioSource.includes(audioOld)) {
    audioSource = audioSource.replace(audioOld, audioNew);
    fs.writeFileSync(audioFile, audioSource);
    console.log("Patch de diagnostico do audio aplicado com sucesso.");
} else {
    console.error("AVISO: trecho do AudioFeeder nao encontrado.");
}

// Diagnostico: verificar dados recebidos do FFmpeg
const audioOld2 = `        this.#proc.stdout.on("data", (chunk) => {`;

const audioNew2 = `        this.#proc.stdout.on("data", (chunk) => {
            if (!this._debugDataLogged) {
                console.log("[AudioFeeder] FFmpeg DATA bytes=", chunk.length);
                this._debugDataLogged = true;
            }`;

if (audioSource.includes(audioNew2)) {
    console.log("Patch FFmpeg DATA ja aplicado.");
} else if (audioSource.includes(audioOld2)) {
    audioSource = audioSource.replace(audioOld2, audioNew2);
    fs.writeFileSync(audioFile, audioSource);
    console.log("Patch FFmpeg DATA aplicado com sucesso.");
} else {
    console.error("AVISO: trecho stdout do AudioFeeder nao encontrado.");
}
