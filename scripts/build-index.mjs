// Chunks src/data/knowledge.md by heading, embeds each chunk with the NVIDIA
// embeddings API, and writes src/data/index.json for the chat API to search.
// Usage: npm run build:index

import { readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
config({ path: ".env.local" });

const apiKey = process.env.NVIDIA_API_KEY;
const embedModel = process.env.NVIDIA_EMBED_MODEL;
if (!apiKey) {
  console.error("Set NVIDIA_API_KEY in .env.local first.");
  process.exit(1);
}
if (!embedModel) {
  console.error("Set NVIDIA_EMBED_MODEL in .env.local first (run `npm run list-models`).");
  process.exit(1);
}

const source = readFileSync(new URL("../src/data/knowledge.md", import.meta.url), "utf-8");

// Split on level-2 and level-3 headings ("## ..." / "### ..."), so each role/entry
// under a broad section (e.g. "Work experience") becomes its own chunk. Each level-3
// chunk is prefixed with its parent level-2 heading for context.
const lines = source.split("\n");
const chunks = [];
let current = [];
let currentH2 = "";

function flush() {
  const text = current.join("\n").trim();
  if (text) chunks.push(text);
  current = [];
}

for (const line of lines) {
  if (/^## /.test(line)) {
    flush();
    currentH2 = line.replace(/^##\s+/, "");
    current.push(line);
  } else if (/^### /.test(line)) {
    flush();
    current.push(`## ${currentH2}`, line);
  } else {
    current.push(line);
  }
}
flush();

console.log(`Embedding ${chunks.length} chunks with ${embedModel}...`);

const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: embedModel,
    input: chunks,
    input_type: "passage",
    encoding_format: "float",
  }),
});

if (!res.ok) {
  console.error(`Embeddings request failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}

const { data } = await res.json();
const indexed = chunks.map((text, i) => ({ text, embedding: data[i].embedding }));

writeFileSync(
  new URL("../src/data/index.json", import.meta.url),
  JSON.stringify({ model: embedModel, chunks: indexed }, null, 2)
);

console.log(`Wrote src/data/index.json with ${indexed.length} chunks.`);
