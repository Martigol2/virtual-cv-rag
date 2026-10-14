import { NextRequest, NextResponse } from "next/server";
import { chatComplete, type ChatMessage } from "@/lib/nvidia";
import { retrieveContext } from "@/lib/retrieve";

const SYSTEM_PROMPT = `You are Felipe Martignon Lizarralde's virtual CV — a chatbot that
answers recruiters' and hiring managers' questions about Felipe's background, experience,
and skills, speaking about him in the third person.

Rules:
- Only answer using the CONTEXT provided below each question. Do not invent facts, dates,
  numbers, or employers that aren't in the context.
- If the answer isn't in the context, say you don't have that detail and suggest the
  person reach out to Felipe directly at martignon@gmail.com or linkedin.com/in/fmartignon.
- Be concise, specific, and honest — including about gaps in his background if asked.
- Do not role-play as Felipe in the first person; always refer to him as "Felipe" or "he".`;

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: ClientMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return NextResponse.json({ error: "no user message found" }, { status: 400 });
    }

    const context = await retrieveContext(lastUserMessage.content);

    const chatMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
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
