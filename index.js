const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
app.use(express.json());
app.use(express.static("."));

app.post("/montar", async (req, res) => {
  try {
    const { imagens, audio } = req.body;

    if (!imagens || !audio) {
      return res.status(400).send({ error: "Dados incompletos." });
    }

    // Baixar imagens
    const imagensBaixadas = [];
    for (let i = 0; i < imagens.length; i++) {
      const url = imagens[i];
      const nome = `imagem${i}.jpg`;
      const writer = fs.createWriteStream(nome);
      const response = await axios({ url, responseType: "stream" });
      response.data.pipe(writer);
      await new Promise((resolve) => writer.on("finish", resolve));
      imagensBaixadas.push(nome);
    }

    // Baixar áudio
    const writerAudio = fs.createWriteStream("audio.mp3");
    const audioRes = await axios({ url: audio, responseType: "stream" });
    audioRes.data.pipe(writerAudio);
    await new Promise((resolve) => writerAudio.on("finish", resolve));

    // Criar lista.txt com imagens
    const lista = imagensBaixadas
      .map((img) => `file '${img}'\nduration 3`)
      .join("\n");
    fs.writeFileSync("lista.txt", lista);

    // Montar vídeo
    const comando = `ffmpeg -f concat -safe 0 -i lista.txt -i audio.mp3 -shortest -vf "fade=t=in:st=0:d=1,fade=t=out:st=2:d=1" -y output.mp4`;
    exec(comando, (err) => {
      if (err) {
        return res.status(500).send({ error: "Erro ao montar vídeo." });
      }
      return res.send({ url: "output.mp4" });
    });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// ✅ CORREÇÃO AQUI: usar porta dinâmica para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
