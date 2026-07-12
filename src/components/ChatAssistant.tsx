import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `You are the Atria Assistant, a helpful chat widget embedded in the Atria hospital layout intelligence platform.

About Atria:
- Atria helps hospital communities everywhere (large academic medical centers, community hospitals, safety-net and rural facilities) stress-test emergency department and facility layouts before construction or renovation decisions are made.
- Users upload a graph-based floor plan (nodes for rooms, edges for corridors/hallways) or design one visually with the "Build Layout" tool.
- Atria models patient, staff, and equipment movement as "acuity clumps" and runs agent-based simulations for standard operations as well as surge scenarios (Mass-Casualty Incidents, pandemic surges, extreme transfer days).
- Output includes corridor congestion heatmaps, bottleneck reports, AI-generated layout improvement suggestions, exportable PDF/CSV reports, and an operational notes tool with AI summarization.
- The dashboard lets users pick a hospital/organization, upload a floor plan (.txt graph format) or corridor video, run simulations, and review live statistics like acuity clump density, corridor saturation, and transfer delay.
- There is also a demo mode that lets visitors explore the dashboard with sample data without creating an account.

Answer questions about how the platform works, its purpose, and how to use its features. Keep answers concise (2-5 sentences unless more detail is clearly requested), friendly, and focused on Atria. If asked something unrelated to the platform, gently redirect to what Atria can help with.`;

const GEMINI_MODEL = "gemini-2.5-flash";

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const isConfigured = Boolean(apiKey);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (!isConfigured) {
      setError("Chat assistant needs a Gemini API key. Add VITE_GEMINI_API_KEY to your .env file to enable it.");
      return;
    }

    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: nextMessages.map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 600,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || "Failed to reach the chat assistant.");
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!reply) {
        throw new Error("The assistant didn't return a response. Please try again.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Atria Assistant</p>
              <p className="text-xs text-white/50">Ask about the platform</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                Hi! I'm the Atria Assistant. Ask me how simulations work, how to upload a floor plan, or what the
                heatmaps mean.
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "ml-auto bg-emerald-300 text-slate-900"
                    : "bg-white/10 text-white/90"
                }`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-white/50">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
                Thinking…
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-white/10 p-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              className="border-white/15 bg-slate-950/60 text-white placeholder:text-white/30 focus-visible:ring-emerald-300/60"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={() => void sendMessage()}
              disabled={isLoading || !input.trim()}
              className="shrink-0 bg-emerald-300 text-slate-900 hover:bg-emerald-200"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-300 text-slate-900 shadow-[0_20px_50px_-20px_rgba(52,211,153,0.8)] transition hover:bg-emerald-200 hover:scale-105"
        aria-label={isOpen ? "Close chat assistant" : "Open chat assistant"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
