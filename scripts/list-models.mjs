// Lists the models available to your NVIDIA API key, so you can pick a chat
// model and an embedding model to put in .env.local.
// Usage: npm run list-models

import { config } from "dotenv";
config({ path: ".env.local" });

const apiKey = process.env.NVIDIA_API_KEY;
if (!apiKey) {
  console.error("Set NVIDIA_API_KEY in .env.local first (get a free key at https://build.nvidia.com).");
  process.exit(1);
}

const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
  headers: { Authorization: `Bearer ${apiKey}` },
});

if (!res.ok) {
  console.error(`Request failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}

const { data } = await res.json();
const ids = data.map((m) => m.id).sort();

const nemotron = ids.filter((id) => /nemotron/i.test(id));
const embed = ids.filter((id) => /embed/i.test(id));
const other = ids.filter((id) => !nemotron.includes(id) && !embed.includes(id));

console.log(`\nFound ${ids.length} models available to your key.\n`);
console.log("Nemotron (chat) candidates for NVIDIA_CHAT_MODEL:");
nemotron.forEach((id) => console.log(`  ${id}`));
console.log("\nEmbedding candidates for NVIDIA_EMBED_MODEL:");
embed.forEach((id) => console.log(`  ${id}`));
console.log(`\n(${other.length} other models also available — see build.nvidia.com for the full catalog.)`);
