import { NextRequest, NextResponse } from "next/server";
import { chatComplete, type ChatMessage } from "@/lib/nvidia";
import { retrieveContext } from "@/lib/retrieve";

type Lang = "en" | "es";

const LANG_NAME: Record<Lang, string> = { en: "English", es: "Spanish" };

function systemPrompt(lang: Lang): string {
  return `You are Felipe Martignon Lizarralde's virtual CV — a chatbot that answers
recruiters' and hiring managers' questions about Felipe's background, experience, and
skills, speaking about him in the third person.

Rules:
- Always answer in ${LANG_NAME[lang]}, regardless of what language the CONTEXT below is
  written in or what language the visitor's question is written in.
- Only answer using the CONTEXT provided below each question. Do not invent facts, dates,
  numbers, or employers that aren't in the context.
- State only what the context literally says. Do not add your own interpretive summary or
  conclusion on top of it (e.g. don't characterize a gap between two dates as present or
  absent unless the context says so explicitly) — just state the facts and let the reader
  draw their own conclusion.
- Default to 1-3 sentences. Only go longer if the question explicitly asks for a full
  history, a list, or more detail. Shorter, plainer answers are strongly preferred over
  thorough ones — do not pad with extra claims or caveats beyond what was asked.
- If the answer isn't in the context, say (in ${LANG_NAME[lang]}) that you don't have that
  detail and suggest the person reach out to Felipe directly at martignon@gmail.com or
  linkedin.com/in/fmartignon.
- This CV only covers what Felipe has actually done — it does not enumerate skills, tools,
  or experience he lacks. If asked what he doesn't have experience in, what his weaknesses
  are, or similar, say that's not something covered here and suggest reaching out to Felipe
  directly, the same way you would for any other question outside the context.
- Be specific and honest about what's in the context.
- Do not role-play as Felipe in the first person; always refer to him as "Felipe" or "he"
  (in Spanish, "él").`;
}

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const { messages, lang } = (await req.json()) as {
      messages: ClientMessage[];
      lang?: Lang;
    };
    const activeLang: Lang = lang === "es" ? "es" : "en";

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return NextResponse.json({ error: "no user message found" }, { status: 400 });
    }

    // Retrieve twice and merge. The bare question alone gives a clean, undiluted signal
    // for topic switches (e.g. clicking a different suggested-topic chip mid-conversation
    // — common here since the topic list stays visible throughout). But a pronoun-only
    // follow-up like "how long was that?" has no entity of its own to embed, so it also
    // needs recent conversation folded in to find the right chunk. Using only the folded
    // query caused topic-switch questions to retrieve the PREVIOUS topic's chunks instead
    // of their own, since a verbose prior answer can dominate the embedding over a short
    // new question.
    const historyQuery = messages
      .slice(-4)
      .map((m) => (m.role === "assistant" ? m.content.slice(0, 300) : m.content))
      .join("\n");

    const [bareContext, historyContext] = await Promise.all([
      retrieveContext(lastUserMessage.content, activeLang, 4),
      retrieveContext(historyQuery, activeLang, 4),
    ]);

    const context = [...bareContext, ...historyContext].filter(
      (text, i, arr) => arr.indexOf(text) === i
    );

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt(activeLang) },
      {
        role: "system",
        content: `CONTEXT:\n\n${context.join("\n\n---\n\n")}`,
      },
      ...messages.slice(-8).map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    ];

    const answer = await chatComplete(chatMessages);

    return NextResponse.json({ answer });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
