/**
 * Multi-model AI provider system for TLD lifecycle extraction.
 * Models are tried in priority order; fallback to next on failure.
 *
 * Free providers supported (each needs its own env var):
 *   ZHIPU_API_KEY     → GLM-4-FlashX, GLM-4-Flash, GLM-4-Air  (bigmodel.cn, free quota)
 *   GROQ_API_KEY      → Llama-3.3-70B, Mixtral-8x7B             (groq.com, free tier)
 *   GEMINI_API_KEY    → Gemini-2.0-Flash, Gemini-1.5-Flash       (ai.google.dev, free tier)
 *   DEEPSEEK_API_KEY  → DeepSeek-V3, DeepSeek-V2.5               (platform.deepseek.com, free)
 *   DASHSCOPE_API_KEY → Qwen-Turbo, Qwen-Long                    (dashscope.aliyun.com, free)
 *   MOONSHOT_API_KEY  → Kimi moonshot-v1-8k                      (platform.moonshot.cn, free)
 *   SILICONFLOW_API_KEY → Qwen2.5-7B, Llama-3.1-8B etc.         (siliconflow.cn, free)
 */

export interface AiProviderInfo {
  id: string;
  name: string;
  model: string;
  provider: string;
  env_var: string;
  configured: boolean;
  priority: number;
}

type ChatRole = "system" | "user";

export interface AiProvider extends AiProviderInfo {
  chat: (messages: { role: ChatRole; content: string }[]) => Promise<string>;
}

// ─── Helper: OpenAI-compatible POST ──────────────────────────────────────────
async function openAiCompatChat(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: { role: ChatRole; content: string }[]
): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`${model} API error ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) throw new Error(`${model} returned empty response`);
  return content;
}

// ─── Helper: Google Gemini ────────────────────────────────────────────────────
async function geminiChat(
  apiKey: string,
  model: string,
  messages: { role: ChatRole; content: string }[]
): Promise<string> {
  // Gemini uses a different format: merge system into first user message
  const systemMsg = messages.find(m => m.role === "system");
  const userMsgs = messages.filter(m => m.role === "user");
  const mergedUser = systemMsg
    ? `${systemMsg.content}\n\n${userMsgs.map(m => m.content).join("\n")}`
    : userMsgs.map(m => m.content).join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: mergedUser }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 600 },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini ${model} error ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  const content: string = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!content) throw new Error(`Gemini returned empty response`);
  return content;
}

// ─── Provider definitions ─────────────────────────────────────────────────────
function buildProviders(): AiProvider[] {
  const ZHIPU   = process.env.ZHIPU_API_KEY ?? "";
  const GROQ    = process.env.GROQ_API_KEY ?? "";
  const GEMINI  = process.env.GEMINI_API_KEY ?? "";
  const DEEPSEEK = process.env.DEEPSEEK_API_KEY ?? "";
  const DASH    = process.env.DASHSCOPE_API_KEY ?? "";
  const MOON    = process.env.MOONSHOT_API_KEY ?? "";
  const SILI    = process.env.SILICONFLOW_API_KEY ?? "";

  const all: AiProvider[] = [
    // ── Zhipu (primary, existing key) ────────────────────────────────────
    {
      id: "glm4flashx", name: "GLM-4-FlashX", model: "glm-4-flashx",
      provider: "智谱 Zhipu", env_var: "ZHIPU_API_KEY",
      configured: !!ZHIPU, priority: 10,
      chat: (msgs) => openAiCompatChat(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions", ZHIPU, "glm-4-flashx", msgs),
    },
    {
      id: "glm4flash", name: "GLM-4-Flash", model: "glm-4-flash",
      provider: "智谱 Zhipu", env_var: "ZHIPU_API_KEY",
      configured: !!ZHIPU, priority: 11,
      chat: (msgs) => openAiCompatChat(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions", ZHIPU, "glm-4-flash", msgs),
    },
    {
      id: "glm4air", name: "GLM-4-Air", model: "glm-4-air",
      provider: "智谱 Zhipu", env_var: "ZHIPU_API_KEY",
      configured: !!ZHIPU, priority: 20,
      chat: (msgs) => openAiCompatChat(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions", ZHIPU, "glm-4-air", msgs),
    },
    // ── Groq (international, very fast) ──────────────────────────────────
    {
      id: "llama33-70b", name: "Llama-3.3-70B", model: "llama-3.3-70b-versatile",
      provider: "Groq", env_var: "GROQ_API_KEY",
      configured: !!GROQ, priority: 15,
      chat: (msgs) => openAiCompatChat(
        "https://api.groq.com/openai/v1/chat/completions", GROQ, "llama-3.3-70b-versatile", msgs),
    },
    {
      id: "gemma2-9b", name: "Gemma2-9B", model: "gemma2-9b-it",
      provider: "Groq", env_var: "GROQ_API_KEY",
      configured: !!GROQ, priority: 25,
      chat: (msgs) => openAiCompatChat(
        "https://api.groq.com/openai/v1/chat/completions", GROQ, "gemma2-9b-it", msgs),
    },
    // ── Google Gemini (free 1500 req/day) ────────────────────────────────
    {
      id: "gemini20flash", name: "Gemini-2.0-Flash", model: "gemini-2.0-flash",
      provider: "Google", env_var: "GEMINI_API_KEY",
      configured: !!GEMINI, priority: 12,
      chat: (msgs) => geminiChat(GEMINI, "gemini-2.0-flash", msgs),
    },
    {
      id: "gemini15flash", name: "Gemini-1.5-Flash", model: "gemini-1.5-flash",
      provider: "Google", env_var: "GEMINI_API_KEY",
      configured: !!GEMINI, priority: 22,
      chat: (msgs) => geminiChat(GEMINI, "gemini-1.5-flash", msgs),
    },
    // ── DeepSeek (free tier, strong reasoning) ───────────────────────────
    {
      id: "deepseekv3", name: "DeepSeek-V3", model: "deepseek-chat",
      provider: "DeepSeek", env_var: "DEEPSEEK_API_KEY",
      configured: !!DEEPSEEK, priority: 13,
      chat: (msgs) => openAiCompatChat(
        "https://api.deepseek.com/chat/completions", DEEPSEEK, "deepseek-chat", msgs),
    },
    // ── Alibaba Qwen (DashScope, free tier) ──────────────────────────────
    {
      id: "qwenturbo", name: "Qwen-Turbo", model: "qwen-turbo",
      provider: "阿里云 DashScope", env_var: "DASHSCOPE_API_KEY",
      configured: !!DASH, priority: 18,
      chat: (msgs) => openAiCompatChat(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", DASH, "qwen-turbo", msgs),
    },
    {
      id: "qwenlong", name: "Qwen-Long", model: "qwen-long",
      provider: "阿里云 DashScope", env_var: "DASHSCOPE_API_KEY",
      configured: !!DASH, priority: 28,
      chat: (msgs) => openAiCompatChat(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", DASH, "qwen-long", msgs),
    },
    // ── Moonshot Kimi (free tier) ─────────────────────────────────────────
    {
      id: "kimi8k", name: "Kimi moonshot-v1-8k", model: "moonshot-v1-8k",
      provider: "月之暗面 Kimi", env_var: "MOONSHOT_API_KEY",
      configured: !!MOON, priority: 19,
      chat: (msgs) => openAiCompatChat(
        "https://api.moonshot.cn/v1/chat/completions", MOON, "moonshot-v1-8k", msgs),
    },
    // ── SiliconFlow (free, many open models) ─────────────────────────────
    {
      id: "sili-qwen25-7b", name: "Qwen2.5-7B (SiliconFlow)", model: "Qwen/Qwen2.5-7B-Instruct",
      provider: "硅基流动 SiliconFlow", env_var: "SILICONFLOW_API_KEY",
      configured: !!SILI, priority: 30,
      chat: (msgs) => openAiCompatChat(
        "https://api.siliconflow.cn/v1/chat/completions", SILI, "Qwen/Qwen2.5-7B-Instruct", msgs),
    },
    {
      id: "sili-llama31-8b", name: "Llama-3.1-8B (SiliconFlow)", model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
      provider: "硅基流动 SiliconFlow", env_var: "SILICONFLOW_API_KEY",
      configured: !!SILI, priority: 31,
      chat: (msgs) => openAiCompatChat(
        "https://api.siliconflow.cn/v1/chat/completions", SILI, "meta-llama/Meta-Llama-3.1-8B-Instruct", msgs),
    },
  ];

  return all.sort((a, b) => a.priority - b.priority);
}

// Cached provider list (rebuilt per cold start so env vars are fresh)
let _providers: AiProvider[] | null = null;
export function getProviders(): AiProvider[] {
  if (!_providers) _providers = buildProviders();
  return _providers;
}

export function getConfiguredProviders(): AiProvider[] {
  return getProviders().filter(p => p.configured);
}

/** Public info only (no chat function), safe to send to frontend */
export function getProvidersInfo(): AiProviderInfo[] {
  return getProviders().map(({ id, name, model, provider, env_var, configured, priority }) => ({
    id, name, model, provider, env_var, configured, priority,
  }));
}

/**
 * Call providers in priority order, return first successful content string.
 * Skips providers whose keys are not configured.
 * If `preferredId` is set, tries that provider first.
 */
export async function callProviderWithFallback(
  messages: { role: ChatRole; content: string }[],
  preferredId?: string,
  errors: string[] = []
): Promise<{ content: string; provider: AiProvider }> {
  const available = getConfiguredProviders();
  if (available.length === 0) throw new Error("No AI providers configured. Set ZHIPU_API_KEY or other provider keys.");

  // Put preferred first if specified
  const ordered = preferredId
    ? [
        ...available.filter(p => p.id === preferredId),
        ...available.filter(p => p.id !== preferredId),
      ]
    : available;

  for (const provider of ordered) {
    try {
      const content = await provider.chat(messages);
      return { content, provider };
    } catch (e: any) {
      errors.push(`[${provider.name}] ${e.message}`);
    }
  }

  throw new Error(`All AI providers failed:\n${errors.join("\n")}`);
}
