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
