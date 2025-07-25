const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public")); // Pasta pública para servir o vídeo

app.post("/montar", async (req, res) => {
  try {
    const { imagens, audio } = req.body;

    if (!imagens || !audio || !Array.isArray(imagens) || imagens.length === 0) {
      return res.status(400).send({ error: "Dados incompletos ou inválidos." });
    }

    const imagensBaixadas = [];
    for (let i = 0; i < imagens.length; i++) {
      const url = imagens[i];
      const nome = `imagem${i}.jpg`;
      const writer = fs.createWriteStream(nome);
      const response = await axios({ url, responseType: "stream" });
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      imagensBaixadas.push(nome);
    }

    const writerAudio = fs.createWriteStream("audio.mp3");
    const audioRes = await axios({ url: audio, responseType: "stream" });
    audioRes.data.pipe(writerAudio);
    await new Promise((resolve, reject) => {
      writerAudio.on("finish", resolve);
      writerAudio.on("error", reject);
    });

    const lista = imagensBaixadas
      .map((img) => `file '${img}'\nduration 3`)
      .join("\n");
    fs.writeFileSync("lista.txt", lista);

    // Salvar o vídeo na pasta pública
    const outputPath = path.join("public", "output.mp4");
    const comando = `ffmpeg -f concat -safe 0 -i lista.txt -i audio.mp3 -shortest -vf "fade=t=in:st=0:d=1,fade=t=out:st=2:d=1" -y ${outputPath}`;
    exec(comando, (err) => {
      if (err) {
        return res.status(500).send({ error: "Erro ao montar vídeo." });
      }
      return res.send({ url: "/output.mp4" });
    });

  } catch (err) {
    res.status(500).send({ error: err.message || "Erro inesperado." });
  }
});

// Rota de status
app.get("/", (req, res) => {
  res.status(200).send("Servidor online");
});

// Porta para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
