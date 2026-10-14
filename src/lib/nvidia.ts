const BASE_URL = "https://integrate.api.nvidia.com/v1";

function apiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error("NVIDIA_API_KEY is not set. Add it to .env.local.");
  }
  return key;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function embedTexts(
  texts: string[],
  inputType: "query" | "passage"
): Promise<number[][]> {
  const model = process.env.NVIDIA_EMBED_MODEL;
  if (!model) {
    throw new Error("NVIDIA_EMBED_MODEL is not set. Run `npm run list-models` and pick one.");
  }

  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
      input_type: inputType,
      encoding_format: "float",
    }),
  });

  if (!res.ok) {
    throw new Error(`NVIDIA embeddings request failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data.map((d) => d.embedding);
}

export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  const model = process.env.NVIDIA_CHAT_MODEL;
  if (!model) {
    throw new Error("NVIDIA_CHAT_MODEL is not set. Run `npm run list-models` and pick one.");
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 700,
      stream: false,
      // nemotron-3-* models are hybrid reasoning models that otherwise burn most of
      // the token budget on a hidden chain-of-thought before answering (slow, and
      // risks truncating the actual answer). Not needed for simple grounded Q&A.
      chat_template_kwargs: { thinking: false },
    }),
  });

  if (!res.ok) {
    throw new Error(`NVIDIA chat request failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? "";
}
