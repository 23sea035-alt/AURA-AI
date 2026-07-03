import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const dir = path.resolve("server/tts-output");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".mp3") && !f.includes("inworld"));

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    const list = files.map(f => `<li><a href="/${f}">${f}</a></li>`).join("\n");
    res.end(`<h2>Persona audio samples (12 files)</h2><ul>${list}</ul>`);
  } else {
    const file = path.basename(req.url);
    const p = path.join(dir, file);
    if (fs.existsSync(p)) {
      res.writeHead(200, { "Content-Type": "audio/mpeg" });
      fs.createReadStream(p).pipe(res);
    } else {
      res.writeHead(404).end("Not found");
    }
  }
});

server.listen(0, "0.0.0.0", () => {
  console.log(`Audio server: http://${os.hostname()}:${server.address().port}`);
  console.log(`Local:       http://127.0.0.1:${server.address().port}`);
});
