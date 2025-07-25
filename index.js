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

      try {
        const writer = fs.createWriteStream(nome);
        const response = await axios({ url, responseType: "stream", timeout: 10000 });
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });
        imagensBaixadas.push(nome);
      } catch (err) {
        console.error(`❌ Erro ao baixar imagem ${i}:`, url);
        console.error(err.message);
        return res.status(503).send({ error: `Erro ao baixar imagem ${i}`, details: err.message });
      }
    }

    try {
      const writerAudio = fs.createWriteStream("audio.mp3");
      const audioRes = await axios({ url: audio, responseType: "stream", timeout: 10000 });
      audioRes.data.pipe(writerAudio);
      await new Promise((resolve, reject) => {
        writerAudio.on("finish", resolve);
        writerAudio.on("error", reject);
      });
    } catch (err) {
      console.error("❌ Erro ao baixar o áudio:", audio);
      console.error(err.message);
      return res.status(503).send({ error: "Erro ao baixar o áudio", details: err.message });
    }

    const lista = imagensBaixadas
      .map((img) => `file '${img}'\nduration 3`)
      .join("\n");
    fs.writeFileSync("lista.txt", lista);

    const outputPath = path.join("public", "output.mp4");
    const comando = `ffmpeg -f concat -safe 0 -i lista.txt -i audio.mp3 -shortest -vf "fade=t=in:st=0:d=1,fade=t=out:st=2:d=1" -y ${outputPath}`;
    
    exec(comando, (err) => {
      if (err) {
        console.error("❌ Erro ao rodar FFmpeg:", err.message);
        return res.status(500).send({ error: "Erro ao montar vídeo." });
      }
      return res.send({ url: "/output.mp4" });
    });

  } catch (err) {
    console.error("❌ Erro inesperado:", err);
    res.status(500).send({ error: err.message || "Erro inesperado." });
  }
});
