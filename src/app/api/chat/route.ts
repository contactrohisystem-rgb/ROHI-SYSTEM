import { ROHI_AGENT_SYSTEM_PROMPT } from "@/lib/rohi-agent-prompt";
import { ROHI_KNOWLEDGE_BASE } from "@/lib/rohi-knowledge-base";
import { retrieveRelevantKB } from "@/lib/kb-retrieval";
import { z } from "zod";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";

const messageSchema = z.object({
  // SECURITY: Only accept user + assistant roles from the client.
  // The system prompt (ROHI_AGENT_SYSTEM_PROMPT + KB) is added SERVER-SIDE
  // and never accepted from the client. This prevents:
  //   - Prompt injection (a visitor overriding the assistant's instructions)
  //   - Abuse of the endpoint as a free AI proxy (sending arbitrary system
  //     prompts to generate any content)
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Default to a free model. Override with OPENROUTER_MODEL in .env.
// Browse available models at https://openrouter.ai/models (filter: free)
// Last verified available: Oct 2026 (14 free models on OpenRouter)
const DEFAULT_MODEL = "nvidia/nemotron-3.5-super-vl:free";

export async function POST(req: Request) {
  const _rl = checkRateLimit(req, LIMITS.chat, "chat"); if (_rl) return _rl;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  // Check API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      "The AI assistant isn't configured yet. Set OPENROUTER_API_KEY in the .env file. Get a free key at https://openrouter.ai/keys.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // RAG-lite: retrieve only the relevant KB sections for the latest user question.
  // Uses the latest user message for retrieval (not assistant messages).
  const allMsgs = parsed.data.messages;
  const lastUserMsg = [...allMsgs].reverse().find((m) => m.role === "user");
  const relevantKB = lastUserMsg
    ? retrieveRelevantKB(lastUserMsg.content)
    : ROHI_KNOWLEDGE_BASE;

  // Combine system prompt + retrieved KB sections into ONE system message.
  // (Model treats KB as authoritative system-level reference material.)
  const messages = [
    {
      role: "system" as const,
      content: `${ROHI_AGENT_SYSTEM_PROMPT}\n\n# ROHI SYSTEMS KNOWLEDGE BASE — relevant sections\nUse this as reference material to answer the user's question. If the answer is not in this information, say you don't have enough confirmed information. Do not invent beyond what is documented here.\n\n${relevantKB}`,
    },
    ...parsed.data.messages,
  ];

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  // Call OpenRouter (OpenAI-compatible streaming API)
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rohi.systems",
        "X-Title": "ROHI SYSTEMS - AI Assistant",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });
  } catch (err) {
    console.error("[chat] upstream fetch error", err);
    return new Response(
      "I'm having trouble connecting right now. Please try again in a moment, or use the contact form to reach the ROHI team.",
      { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    // Read the error body for diagnostics
    let errText = "";
    try {
      errText = await upstreamResponse.text();
    } catch { /* ignore */ }
    console.error("[chat] upstream error", upstreamResponse.status, errText);
    // Return a user-friendly message (don't leak the raw API error)
    const friendly =
      upstreamResponse.status === 401
        ? "The AI assistant's API key isn't valid. Please check the OPENROUTER_API_KEY in the .env file."
        : upstreamResponse.status === 429
          ? "The AI assistant is getting too many requests right now. Please try again in a moment."
          : upstreamResponse.status === 402
            ? "The AI assistant's account has no credits. Please add credits at openrouter.ai."
            : "I'm having trouble responding right now. Please try again, or use the contact form to reach the ROHI team.";
    return new Response(friendly, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const upstreamStream = upstreamResponse.body;

  // Parse the upstream SSE stream and emit plain-text deltas to the client.
  // OpenRouter uses the standard OpenAI SSE format:
  //   data: {"choices":[{"delta":{"content":"..."}}]}
  //   data: [DONE]
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const clientStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamStream.getReader();
      let buffer = "";
      let done = false;
      try {
        while (true) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith(":")) continue;
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") { done = true; break; }
            try {
              const json = JSON.parse(data);
              // Only forward content deltas (skip reasoning_content)
              const delta = json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.message?.content ?? "";
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch { /* partial JSON — ignore */ }
          }
          if (done) break;
        }
        if (!done && buffer.startsWith("data:")) {
          const data = buffer.slice(5).trim();
          if (data && data !== "[DONE]") {
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.message?.content ?? "";
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.error("[chat] stream read error", err);
        try {
          controller.enqueue(encoder.encode(
            "\n\n[I encountered an issue mid-response. Please reach out via the Contact page if this continues.]",
          ));
        } catch { /* controller already closed */ }
      } finally {
        try { reader.releaseLock(); } catch { /* ignore */ }
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() {
      try { upstreamStream.cancel(); } catch { /* ignore */ }
    },
  });

  return new Response(clientStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
