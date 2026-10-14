"use client";

import { useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Lang = "en" | "es";

type Topic = { label: string; prompts: string[] };

const COPY: Record<
  Lang,
  {
    tagline: string;
    subtitle: string;
    greeting: string;
    topics: Topic[];
    topicsToggle: { show: string; hide: string };
    placeholder: string;
    send: string;
    thinking: string;
    footer: string;
    source: string;
  }
> = {
  en: {
    tagline: "Account Management · Client Operations · Customer Success",
    subtitle: "An AI-powered virtual CV — ask about his experience and skills.",
    greeting:
      "Hi, I'm Felipe Martignon's virtual CV. Ask me about his experience, skills, or what he's looking for next.",
    topics: [
      {
        label: "Experience",
        prompts: [
          "What has Felipe been doing at Kraken?",
          "Tell me about his time at FundRock LIS",
          "What did he do at MAE Sports & Education?",
          "What was his role as a Financial Advisor at OVB?",
          "What did he build with Becas & Sports?",
        ],
      },
      {
        label: "AI & education",
        prompts: [
          "Why is he learning AI engineering?",
          "What certifications does he have?",
          "What languages does he speak?",
        ],
      },
      {
        label: "Fit",
        prompts: [
          "What kind of roles is he looking for?",
          "What's his experience with compliance or KYC?",
          "What are his gaps?",
          "What makes his background distinctive?",
        ],
      },
    ],
    topicsToggle: { show: "Suggested topics", hide: "Hide topics" },
    placeholder: "Ask about Felipe's experience...",
    send: "Send",
    thinking: "Thinking…",
    footer: "Answers are grounded in Felipe's CV via a small RAG pipeline.",
    source: "View source",
  },
  es: {
    tagline: "Gestión de Cuentas · Operaciones de Cliente · Customer Success",
    subtitle: "Un CV virtual con IA — pregunta sobre su experiencia y habilidades.",
    greeting:
      "Hola, soy el CV virtual de Felipe Martignon. Pregúntame sobre su experiencia, sus habilidades o qué busca a continuación.",
    topics: [
      {
        label: "Experiencia",
        prompts: [
          "¿Qué ha estado haciendo Felipe en Kraken?",
          "Cuéntame sobre su etapa en FundRock LIS",
          "¿Qué hizo en MAE Sports & Education?",
          "¿Cuál fue su rol como Financial Advisor en OVB?",
          "¿Qué construyó con Becas & Sports?",
        ],
      },
      {
        label: "IA y formación",
        prompts: [
          "¿Por qué está aprendiendo ingeniería de IA?",
          "¿Qué certificaciones tiene?",
          "¿Qué idiomas habla?",
        ],
      },
      {
        label: "Encaje",
        prompts: [
          "¿Qué tipo de roles está buscando?",
          "¿Qué experiencia tiene en compliance o KYC?",
          "¿Cuáles son sus puntos débiles?",
          "¿Qué hace distintivo su perfil?",
        ],
      },
    ],
    topicsToggle: { show: "Temas sugeridos", hide: "Ocultar temas" },
    placeholder: "Pregunta sobre la experiencia de Felipe...",
    send: "Enviar",
    thinking: "Pensando…",
    footer: "Las respuestas se basan en el CV de Felipe mediante un pequeño pipeline RAG.",
    source: "Ver código",
  },
};

const GITHUB_URL = "https://github.com/Martigol2/virtual-cv-rag";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const t = COPY[lang];

  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: t.greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset the conversation to a fresh greeting when the language changes.
  function switchLang(l: Lang) {
    setLang(l);
    setMessages([{ role: "assistant", content: COPY[l].greeting }]);
    setError(null);
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMessages([...next, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-100 font-sans dark:bg-slate-950">
      <main className="flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-0 sm:py-12">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-semibold text-white shadow-sm dark:from-slate-300 dark:to-slate-100 dark:text-slate-900">
              FM
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
                Felipe Martignon Lizarralde
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.tagline}</p>
            </div>
          </div>

          <div
            className="flex shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white text-xs font-medium shadow-sm dark:border-slate-800 dark:bg-slate-900"
            role="group"
            aria-label="Language"
          >
            <button
              onClick={() => switchLang("en")}
              className={`px-3 py-1.5 transition-colors ${
                lang === "en"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => switchLang("es")}
              className={`px-3 py-1.5 transition-colors ${
                lang === "es"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              ES
            </button>
          </div>
        </header>

        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>

        <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    m.role === "user"
                      ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      : "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                  }`}
                >
                  {m.role === "user" ? "You" : "FM"}
                </div>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    m.role === "user"
                      ? "bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-end gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  FM
                </div>
                <div className="max-w-[80%] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {t.thinking}
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              onClick={() => setTopicsOpen((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {topicsOpen ? t.topicsToggle.hide : t.topicsToggle.show}
              <span className={`transition-transform ${topicsOpen ? "rotate-180" : ""}`}>⌄</span>
            </button>

            {topicsOpen && (
              <div className="mt-3 flex flex-col gap-2.5">
                {t.topics.map((topic) => (
                  <div key={topic.label} className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {topic.label}
                    </span>
                    {topic.prompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        disabled={loading}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-slate-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-slate-50 transition-colors hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {t.send}
            </button>
          </form>
        </div>

        <footer className="mt-4 flex flex-col items-center gap-1 text-center text-xs text-slate-400 dark:text-slate-600">
          <p>{t.footer}</p>
          <p>
            martignon@gmail.com ·{" "}
            <a
              href="https://linkedin.com/in/fmartignon"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300"
            >
              LinkedIn
            </a>{" "}
            ·{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300"
            >
              {t.source}
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
