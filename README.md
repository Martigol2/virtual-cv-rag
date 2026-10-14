# Felipe Martignon — Virtual CV (RAG chatbot)

A small retrieval-augmented chatbot that answers questions about Felipe's experience,
skills, and background, grounded only in [`src/data/knowledge.md`](src/data/knowledge.md).
Built with Next.js, deployed on Vercel, powered by NVIDIA's free hosted API
(Nemotron for chat, an NVIDIA embedding model for retrieval).

## How it works

1. [`src/data/knowledge.md`](src/data/knowledge.md) holds the source of truth about Felipe,
   organized by `## heading`.
2. `npm run build:index` splits that file into chunks (one per heading), embeds each chunk
   with the NVIDIA embeddings API, and writes `src/data/index.json` (committed to the repo —
   it's just text + vectors, no secrets).
3. At request time, [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) embeds the
   visitor's question, finds the most relevant chunks via cosine similarity
   ([`src/lib/retrieve.ts`](src/lib/retrieve.ts)), and asks the Nemotron chat model to
   answer using only that context.
4. [`src/app/page.tsx`](src/app/page.tsx) is the chat UI.

No vector database — the knowledge base is small enough that an in-memory similarity search
over a JSON file is simpler and free.

## Local setup

```bash
npm install
cp .env.local.example .env.local
```

1. Get a free API key at [build.nvidia.com](https://build.nvidia.com) and put it in
   `.env.local` as `NVIDIA_API_KEY`.
2. Run `npm run list-models` to see which chat and embedding models are currently live on
   your key, and set `NVIDIA_CHAT_MODEL` / `NVIDIA_EMBED_MODEL` in `.env.local` accordingly.
   (Model availability on NVIDIA's free tier changes over time — don't trust hardcoded
   model names from elsewhere; this script always reflects what your key can use today.)
3. Build the vector index: `npm run build:index`
4. Run the app: `npm run dev`, then open http://localhost:3000

## Updating Felipe's info

Edit `src/data/knowledge.md`, then re-run `npm run build:index` and commit the updated
`src/data/index.json` along with it. The chat route reads the committed index, not the
markdown file, so forgetting this step means the chatbot answers from stale data.

## Deploying to Vercel with a custom domain

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" → import the repo. Framework preset auto-detects Next.js.
3. Under Project Settings → Environment Variables, add `NVIDIA_API_KEY`,
   `NVIDIA_CHAT_MODEL`, and `NVIDIA_EMBED_MODEL` (same values as your local `.env.local`).
4. Deploy. `src/data/index.json` ships with the repo, so no build-time indexing step is
   needed on Vercel — just remember to rebuild it locally and commit whenever you edit
   `knowledge.md`.
5. Buy/point your domain: Project Settings → Domains → add your domain, then follow
   Vercel's DNS instructions at your registrar (or buy the domain directly through Vercel's
   domain registration if you prefer one-stop setup).

## Notes

- The system prompt in `src/app/api/chat/route.ts` instructs the model to answer only from
  retrieved context and to say when it doesn't know something, rather than inventing facts
  about Felipe — worth keeping an eye on in practice, since smaller free-tier models can
  still stray from instructions.
- `src/data/index.json` contains no secrets (just chunked CV text + embedding vectors), so
  it's safe to commit.
