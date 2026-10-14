import { readFileSync } from "node:fs";
import path from "node:path";
import { embedTexts } from "./nvidia";

type Chunk = { text: string; embedding: number[]; lang?: "en" | "es"; pinned?: boolean };
type Index = { model: string; chunks: Chunk[] };

let cachedIndex: Index | null = null;

function loadIndex(): Index {
  if (cachedIndex) return cachedIndex;
  const file = path.join(process.cwd(), "src/data/index.json");
  let raw: string;
  try {
    raw = readFileSync(file, "utf-8");
  } catch {
    throw new Error(
      "src/data/index.json not found. Run `npm run build:index` after setting NVIDIA_API_KEY and NVIDIA_EMBED_MODEL."
    );
  }
  cachedIndex = JSON.parse(raw) as Index;
  return cachedIndex;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieveContext(
  question: string,
  lang: "en" | "es" = "en",
  topK = 6
): Promise<string[]> {
  const index = loadIndex();
  const [queryEmbedding] = await embedTexts([question], "query");

  // Prefer chunks written in the active UI language, so answers are grounded in
  // natural same-language source text. Fall back to the full set if a language
  // isn't tagged (e.g. an older index built before bilingual support).
  const pool = index.chunks.some((c) => c.lang)
    ? index.chunks.filter((c) => c.lang === lang)
    : index.chunks;

  const scored = pool.map((chunk) => ({
    text: chunk.text,
    pinned: chunk.pinned ?? false,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Pinned chunks (baseline facts like current employment status) are always included,
  // regardless of similarity score — a recruiter's phrasing shouldn't be able to make
  // the bot miss them. They still count toward topK so context doesn't balloon.
  const pinned = scored.filter((s) => s.pinned);
  const topScored = scored.filter((s) => !s.pinned).slice(0, topK - pinned.length);

  return [...pinned, ...topScored].map((s) => s.text);
}
