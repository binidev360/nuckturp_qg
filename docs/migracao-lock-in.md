# Migração de lock-in das Edge Functions (Lovable → Gemini direto + Resend)

> **Objetivo:** remover as duas dependências de lock-in do Lovable presentes nas Edge Functions (Deno) antes do cutover, mantendo paridade funcional.
> 1. **IA** — hoje via "Lovable AI Gateway" (`ai.gateway.lovable.dev`, formato OpenAI-compatible, Gemini por baixo) → **Gemini direto** (`generativelanguage.googleapis.com`).
> 2. **E-mail** — hoje via `@lovable.dev/email-js` (+ `@lovable.dev/webhooks-js`) → **Resend**.
>
> **APIs confirmadas via Context7** (28/mai/2026):
> - Gemini REST: `/websites/ai_google_dev_gemini-api` (benchmark 82.1) — `generateContent`, `streamGenerateContent`, `tools.functionDeclarations`, `toolConfig`/`generationConfig`, `responseMimeType`+`responseSchema`, `inlineData` multimodal, header `x-goog-api-key`.
> - Resend: `/websites/resend` (benchmark 88.7) — `POST /emails` (REST) e SDK `npm:resend` com prop `react` (React Email), header `Authorization: Bearer <RESEND_API_KEY>`.
>
> **Guardrail:** este doc descreve o que será construído no projeto NOVO (`Nuckturp_QG`). Nada no projeto antigo (`Nuckturp_2.1`) é tocado — ele é só referência de paridade.

---

## 1. Inventário — as 7 functions com lock-in

| # | Function | Tipo de lock-in | O que muda | Esforço |
|---|----------|-----------------|------------|---------|
| 1 | `generate-adventure` | IA (gateway) — **2 modos**: `check-system` (tool-calling JSON forçado) e geração de aventura (**streaming SSE** de texto) | Trocar endpoint e auth; `check-system` → `functionDeclarations` + `toolConfig`; geração → `streamGenerateContent?alt=sse` e **reformatar o stream** (SSE do Gemini ≠ SSE da OpenAI) | **Alto** (o streaming é o ponto sensível) |
| 2 | `session-prep-check` | IA (gateway) — tool-calling JSON forçado (`session_prep_result`) | Endpoint/auth + tool-calling REST do Gemini; parsing `functionCall.args` | **Médio** |
| 3 | `seo-specialist` | IA (gateway) — tool-calling JSON forçado (`seo_analysis`, schema grande) | Idem — schema porta quase 1:1, ajustar tipos (`type:"object"` etc.) | **Médio** |
| 4 | `analyze-feedback` | IA (gateway) — **misto**: texto puro (master overview) + tool-calling (`feedback_analysis`); usa `temperature` e modelo `gemini-2.5-flash` | Endpoint/auth; `temperature` vai p/ `generationConfig`; dois caminhos (texto + tool) | **Médio** |
| 5 | `finance-extract-receipt` | IA (gateway) — **multimodal/visão** (imagem base64 via `image_url` data-URL) + tool-calling (`extract_receipt`) | `image_url` → `inlineData {mimeType, data(base64)}`; tool-calling REST; tipos nullable do schema | **Médio** |
| 6 | `auth-email-hook` | E-mail — `@lovable.dev/webhooks-js` (`verifyWebhookRequest`) + `@lovable.dev/email-js` (`parseEmailWebhookPayload`); renderiza React Email; **enfileira** no pgmq | Trocar verificação de webhook (Lovable → **Supabase Auth Hook** com `standardwebhooks`); manter render React Email; manter o enqueue | **Alto** (muda o contrato do webhook de auth) |
| 7 | `process-email-queue` | E-mail — `sendLovableEmail(...)` (consome a fila `auth_emails` + `transactional_emails`) | Trocar `sendLovableEmail` por **Resend** (`resend.emails.send` ou `POST /emails`); manter toda a lógica de fila/DLQ/retry/TTL | **Médio** |

**Templates React Email** (`_shared/email-templates/*.tsx`): `signup`, `invite`, `magic-link`, `recovery`, `email-change`, `reauthentication`. Usam `npm:@react-email/components@0.0.22` + `npm:react@18.3.1`. **Portados verbatim** — nenhuma mudança de conteúdo. Só muda quem os renderiza/envia.

---

## 2. IA — padrão atual × Gemini direto

### 2.1 Padrão atual (Lovable AI Gateway)

Todas as 5 functions falam com um endpoint **OpenAI-compatible**:

```ts
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY"); // ← env do lock-in

await fetch(AI_URL, {
  method: "POST",
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",   // 4 functions
    // model: "google/gemini-2.5-flash",       // analyze-feedback
    messages: [{ role: "system", content }, { role: "user", content }],
    // tools: [{ type:"function", function:{ name, parameters } }],
    // tool_choice: { type:"function", function:{ name } },   // JSON forçado
    // stream: true,                                          // generate-adventure
    // temperature: 0.7,                                      // analyze-feedback
  }),
});
```

Características observadas:
- **Modelos:** `google/gemini-3-flash-preview` (`generate-adventure`, `session-prep-check`, `seo-specialist`, `finance-extract-receipt`) e `google/gemini-2.5-flash` (`analyze-feedback`).
- **JSON estruturado:** via **tool-calling** (`tools` + `tool_choice` forçado); resposta lida em `choices[0].message.tool_calls[0].function.arguments` (string JSON → `JSON.parse`).
- **Texto:** `choices[0].message.content` (master overview do `analyze-feedback`).
- **Streaming:** só `generate-adventure` (modo geração) — `stream:true`, repassa `response.body` como `text/event-stream` direto ao front.
- **Multimodal:** `finance-extract-receipt` — `content` array com `{type:"image_url", image_url:{url:"data:<mime>;base64,..."}}`.
- **Erros tratados:** `429` (rate limit), `402` (créditos esgotados — **conceito Lovable, some na migração**).
- **Auditoria:** toda function loga em `ai_usage_logs { user_id, feature, model }`.

### 2.2 Substituto — Gemini direto (REST `generativelanguage.googleapis.com`)

Confirmado via Context7. Diferenças estruturais que **não** são 1:1 com OpenAI:

| Conceito | Lovable/OpenAI | Gemini REST |
|----------|----------------|-------------|
| Endpoint | `POST .../v1/chat/completions` | `POST .../v1beta/models/<model>:generateContent` |
| Auth | `Authorization: Bearer <key>` | header **`x-goog-api-key: <key>`** |
| Env var | `LOVABLE_API_KEY` | **`GOOGLE_GENERATIVE_AI_API_KEY`** |
| System prompt | `messages[role:"system"]` | campo separado **`systemInstruction`** |
| Mensagens | `messages[{role,content}]` | **`contents[{role,parts:[{text}]}]`** (role `user`/`model`; sem `system`) |
| JSON forçado | `tools` + `tool_choice` | **2 opções** (ver abaixo) |
| Temperatura | top-level `temperature` | dentro de **`generationConfig.temperature`** |
| Multimodal | `image_url.url` data-URL | **`parts[{inlineData:{mimeType,data}}]`** (base64 puro, sem prefixo `data:`) |
| Streaming | `stream:true` → SSE OpenAI | endpoint **`:streamGenerateContent?alt=sse`** → SSE Gemini |
| Resposta texto | `choices[0].message.content` | **`candidates[0].content.parts[0].text`** |
| Resposta JSON | `tool_calls[0].function.arguments` (string) | **`candidates[0].content.parts[0].functionCall.args`** (objeto, já parseado) |

**Modelo equivalente:** o gateway expunha `google/gemini-3-flash-preview` e `google/gemini-2.5-flash`. No Gemini direto os nomes são **sem o prefixo `google/`**: `gemini-3-flash-preview` e `gemini-2.5-flash` (confirmados nos snippets do Context7). **Decisão recomendada:** padronizar tudo em `gemini-2.5-flash` (GA, estável) e deixar `gemini-3-flash-preview` opt-in por env, para evitar quebra por descontinuação de preview. Centralizar o nome do modelo numa constante do `_shared/ai.ts`.

#### Duas formas de JSON estruturado no Gemini (escolher por function)

1. **`responseSchema` + `responseMimeType:"application/json"`** (recomendado p/ saída JSON pura — `seo-specialist`, `session-prep-check`, `finance-extract-receipt`, parte tool do `analyze-feedback`). A resposta vem como **texto JSON** em `parts[0].text` → `JSON.parse`. Mais simples que tool-calling.
2. **`tools.functionDeclarations` + `toolConfig.functionCallingConfig.mode:"ANY"`** (equivalente direto ao `tool_choice` forçado). A resposta vem em `parts[0].functionCall.args` (objeto). Útil se quisermos manter os schemas de tool atuais quase intactos.

> Nota: os schemas atuais usam tipos minúsculos (`"object"`, `"string"`) e features JSON-Schema (`additionalProperties:false`, `enum`, `type:["string","null"]`). O Gemini aceita o schema OpenAPI-subset; `additionalProperties` é ignorado e **tipos nullable** (`["integer","null"]` no `finance-extract-receipt`) devem virar `{type:"INTEGER", nullable:true}`. Validar caso a caso.

### 2.3 Helper compartilhado proposto — `_shared/ai.ts`

```ts
// supabase/functions/_shared/ai.ts
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const KEY = () => {
  const k = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!k) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY não configurada");
  return k;
};
export const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
interface GenOpts {
  system?: string;
  parts: Part[];                 // conteúdo do turno do usuário (texto e/ou imagem)
  schema?: Record<string, unknown>; // se presente → JSON mode (responseSchema)
  temperature?: number;
  model?: string;
}

async function callGemini(path: string, payload: unknown) {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "x-goog-api-key": KEY(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // 429 = rate limit (mapear p/ mensagem amigável). 402 NÃO existe mais (era crédito Lovable).
    const status = res.status;
    const detail = await res.text();
    throw Object.assign(new Error(`Gemini ${status}: ${detail.slice(0, 500)}`), { status });
  }
  return res;
}

/** Texto simples (ex.: master overview do analyze-feedback). */
export async function generateText(opts: GenOpts): Promise<string> {
  const model = opts.model ?? GEMINI_MODEL;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: opts.parts }],
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: { ...(opts.temperature != null ? { temperature: opts.temperature } : {}) },
  };
  const res = await callGemini(`${model}:generateContent`, body);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/** JSON estruturado (substitui tool-calling forçado). Retorna objeto já parseado. */
export async function generateJSON<T>(opts: GenOpts & { schema: Record<string, unknown> }): Promise<T> {
  const model = opts.model ?? GEMINI_MODEL;
  const body = {
    contents: [{ role: "user", parts: opts.parts }],
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: opts.schema,
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
    },
  };
  const res = await callGemini(`${model}:generateContent`, body);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return JSON.parse(text) as T;
}

/** Streaming SSE (substitui o stream:true do generate-adventure). */
export async function streamText(opts: GenOpts): Promise<Response> {
  const model = opts.model ?? GEMINI_MODEL;
  const body = {
    contents: [{ role: "user", parts: opts.parts }],
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: { ...(opts.temperature != null ? { temperature: opts.temperature } : {}) },
  };
  // alt=sse → cada evento "data:" traz um chunk JSON com candidates[].content.parts[].text
  return callGemini(`${model}:streamGenerateContent?alt=sse`, body);
}
```

**Exemplo de chamada — JSON estruturado** (`seo-specialist`):
```ts
import { generateJSON } from "../_shared/ai.ts";
const result = await generateJSON<SeoAnalysis>({
  system: SYSTEM_PROMPT,
  parts: [{ text: userPrompt }],
  schema: SEO_SCHEMA, // o `parameters` do tool atual, com tipos ajustados ao OpenAPI-subset do Gemini
});
// result já é o objeto — substitui JSON.parse(toolCall.function.arguments)
```

**Exemplo — multimodal** (`finance-extract-receipt`):
```ts
const base64 = toBase64(buf);          // SEM prefixo "data:" — só os bytes
const extracted = await generateJSON<Receipt>({
  system: systemPrompt,
  parts: [
    { text: "Extraia os dados deste documento." },
    { inlineData: { mimeType: mime, data: base64 } },
  ],
  schema: EXTRACT_RECEIPT_SCHEMA,
});
```

**Parsing da resposta (resumo):**
- **JSON mode:** `JSON.parse(candidates[0].content.parts[0].text)` (helper já faz).
- **Texto:** `candidates[0].content.parts[0].text`.
- **Streaming:** consumir o SSE (`data: {json}\n\n`), extrair `candidates[0].content.parts[0].text` de cada chunk. ⚠️ O front do `generate-adventure` hoje espera o **formato SSE da OpenAI** (`data: {choices:[{delta:{content}}]}`). Duas saídas: (a) reescrever o parser do front p/ o formato Gemini, ou (b) o helper `streamText` re-emitir um `ReadableStream` no formato que o front já entende. **Recomendado (b)** para não mexer no front no cutover (preserva paridade).

---

## 3. E-mail — padrão atual × Resend

### 3.1 Padrão atual (Lovable email)

- **`auth-email-hook`** (webhook de auth, `verify_jwt=false`): usa `verifyWebhookRequest` (de `@lovable.dev/webhooks-js`) com `secret = LOVABLE_API_KEY` e parser `parseEmailWebhookPayload` (de `@lovable.dev/email-js`). Recebe o evento de auth, lê `payload.data.action_type` (`signup`/`recovery`/...), renderiza o template React Email correspondente para **HTML + texto** (`renderAsync(..., {plainText:true})`), grava `email_send_log` (`pending`) e **enfileira** via RPC `enqueue_email` na fila `auth_emails`. Tem rota `/preview` (renderiza com `SAMPLE_DATA`).
- **`process-email-queue`** (cron, `service_role`): drena `auth_emails` + `transactional_emails` (pgmq) e envia cada uma com **`sendLovableEmail(payload, { apiKey: LOVABLE_API_KEY, sendUrl: LOVABLE_SEND_URL })`**. Toda a lógica de **DLQ, retry (MAX_RETRIES=5), TTL, dedupe, cooldown 429** é própria do projeto e **permanece igual** — só muda a linha do envio.

### 3.2 Substituto — Resend

Confirmado via Context7 — duas formas de envio:

**(a) SDK `npm:resend`** (idiomático, suporta prop `react`):
```ts
import { Resend } from "npm:resend";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const { data, error } = await resend.emails.send({
  from: payload.from,          // "nuckturp <noreply@nuckturp.com.br>"
  to: payload.to,
  subject: payload.subject,
  html: payload.html,
  text: payload.text,
});
if (error) throw Object.assign(new Error(error.message), { status: 429 /* se rate limit */ });
```

**(b) REST `POST https://api.resend.com/emails`** (sem SDK, `Authorization: Bearer <RESEND_API_KEY>`) — útil se quisermos evitar a dependência npm no runtime Deno.

> A fila já carrega `html` + `text` prontos (renderizados no `auth-email-hook`). Portanto **o `process-email-queue` continua enviando HTML/texto** — não precisa do prop `react` no dispatcher. O prop `react` do Resend é relevante só se algum dia renderizarmos no momento do envio. Mantemos o render no hook (preserva o desenho atual).

### 3.3 Reaproveitamento dos templates React Email

- Os 6 `.tsx` em `_shared/email-templates/` usam `@react-email/components` — **biblioteca padrão do Resend**. **Portam verbatim**, zero mudança de markup/estilo (identidade Noir Void + Cyber Lime preservada).
- Continuamos renderizando com `renderAsync(React.createElement(Tpl, props))` (HTML) e `{plainText:true}` (texto). O Resend aceita esse HTML/texto direto.
- Imagem do header hoje aponta p/ Storage do projeto Lovable (`nhygqpnhumgxslpoachu.supabase.co`). **Migrar o asset** p/ o Storage novo e atualizar a URL nos templates (1 ocorrência por template).

### 3.4 Mudança no webhook de auth (ponto de maior atenção)

Sem Lovable, o Supabase emite o **"Send Email Hook"** com assinatura **standardwebhooks** (header `webhook-signature`, secret `v1,whsec_...`), não o formato Lovable. Então no `auth-email-hook`:
- Trocar `verifyWebhookRequest`/`parseEmailWebhookPayload` (Lovable) por verificação **`standardwebhooks`** (`npm:standardwebhooks`) com `SEND_EMAIL_HOOK_SECRET`.
- Remapear o payload: o Send Email Hook entrega `{ user, email_data:{ token, token_hash, redirect_to, email_action_type, ... } }`. O `action_type`/`url`/`token` saem de `email_data` (não de `payload.data`). O resto (escolha do template, render, enqueue) permanece.
- Confirmar via Context7 (skill `supabase`/`nextjs-supabase-auth`) o shape exato do Send Email Hook na fase de implementação.

### 3.5 Helper compartilhado proposto — `_shared/email.ts`

```ts
// supabase/functions/_shared/email.ts
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");

export interface SendArgs {
  from: string; to: string; subject: string; html: string; text?: string;
}
/** Envio único. Lança erro com .status (429 = rate limit) p/ a lógica de fila tratar. */
export async function sendEmail(a: SendArgs): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from: a.from, to: a.to, subject: a.subject, html: a.html, text: a.text,
  });
  if (error) {
    // Resend retorna {name,message}; rate limit costuma vir com status 429 na resposta HTTP do SDK.
    throw Object.assign(new Error(error.message), { name: error.name });
  }
  return { id: data!.id };
}
```

No `process-email-queue`, a única troca é:
```ts
// antes: await sendLovableEmail({...payload}, { apiKey, sendUrl });
await sendEmail({ from: payload.from, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
```
O `isRateLimited(error)` / `getRetryAfterSeconds(error)` continuam — adaptar para ler o status/headers que o Resend devolve no 429 (`Retry-After`).

---

## 4. Secrets a configurar no Supabase novo

| Secret | Usado por | Substitui | Observação |
|--------|-----------|-----------|------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | todas as 5 functions de IA | `LOVABLE_API_KEY` (lado IA) | Gerar em Google AI Studio. Header `x-goog-api-key`. |
| `GEMINI_MODEL` *(opcional)* | `_shared/ai.ts` | — | Default `gemini-2.5-flash`; permite trocar sem deploy. |
| `RESEND_API_KEY` | `process-email-queue` (+ `email.ts`) | `LOVABLE_API_KEY` / `LOVABLE_SEND_URL` (lado e-mail) | Gerar em resend.com; verificar domínio `nuckturp.com.br`/`notify.nuckturp.com.br` (SPF/DKIM/DMARC). |
| `SEND_EMAIL_HOOK_SECRET` | `auth-email-hook` | `LOVABLE_API_KEY` (verificação do webhook) | `v1,whsec_...` gerado pelo Supabase ao ativar o Send Email Hook. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | já existentes | — | Não são lock-in; permanecem. |

**Some na migração:** `LOVABLE_API_KEY`, `LOVABLE_SEND_URL`. O conceito de **crédito de IA (HTTP 402)** é exclusivo do gateway Lovable — no Gemini direto o billing é da conta Google; o tratamento de `402` no código pode ser removido (manter só `429`).

---

## 5. Riscos

1. **Streaming (`generate-adventure`) — o maior risco.** O SSE do Gemini (`alt=sse`, chunks `candidates[].content.parts[].text`) **não** é o SSE da OpenAI que o front consome hoje (`choices[].delta.content`). Mitigação: o helper `streamText` re-emite um `ReadableStream` no formato esperado pelo front (transform stream), evitando mexer no cliente no cutover.
2. **Tool-calling × JSON mode.** Trocar `tool_choice` forçado por `responseSchema` muda a forma de parsing (objeto direto vs `JSON.parse(arguments)`) e exige **ajuste dos schemas** ao OpenAPI-subset do Gemini: tipos maiúsculos opcionais, `additionalProperties` ignorado, **nullable** explícito (`{type:"INTEGER", nullable:true}`) no `finance-extract-receipt` (que hoje usa `type:["integer","null"]`). Risco de campo vir faltando se o schema não for fiel. Testar com fixtures reais.
3. **Modelo descontinuado.** `gemini-3-flash-preview` é **preview** — pode mudar/sumir sem aviso. Padronizar em `gemini-2.5-flash` (GA) e isolar o nome numa constante/env (`GEMINI_MODEL`) para troca rápida. Validar paridade de qualidade do output (capitalização sentence-case, tamanho de sinopse, etc.) ao trocar de modelo.
4. **Rate limits diferentes.** Limites/erros do Gemini direto ≠ gateway Lovable; e o Resend tem seu próprio limite (e `Retry-After`). Revisar os thresholds da fila (`batch_size`, `send_delay_ms`, cooldown) e o mapeamento de 429 no `process-email-queue`.
5. **Contrato do webhook de auth.** Migrar de `@lovable.dev/webhooks-js` para o **Send Email Hook** do Supabase (`standardwebhooks`) muda o shape do payload e a verificação de assinatura. É a parte que exige config no painel do Supabase (ativar o hook, gerar secret) + remapeamento de campos. Validar com Context7 (`supabase`) na implementação.
6. **Templates / assets.** A imagem de header dos e-mails aponta para o Storage do projeto Lovable; precisa ser **migrada para o Storage novo** e ter a URL atualizada em cada template, senão o e-mail quebra visualmente. Conteúdo dos templates não muda.
7. **Multimodal (visão).** `finance-extract-receipt` envia base64 — no Gemini é `inlineData.data` **sem** o prefixo `data:<mime>;base64,` (diferente do data-URL atual). Erro fácil de passar despercebido; testar com recibo real (limite 10 MB mantido).
8. **`@react-email/components` no Deno.** Pin de versão (`0.0.22` + `react@18.3.1`) deve ser mantido; checar compatibilidade do `renderAsync` no runtime Deno do Supabase novo antes de assumir paridade.

---

## 6. Esforço total estimado

- **IA:** 1 helper (`_shared/ai.ts`) + adaptar 5 functions. **~1 alto** (`generate-adventure`, por causa do streaming) **+ 4 médios**.
- **E-mail:** 1 helper (`_shared/email.ts`) + 2 functions. **~1 alto** (`auth-email-hook`, novo contrato de webhook) **+ 1 médio** (`process-email-queue`).
- **Templates:** portar verbatim + migrar 1 asset (baixo).

**Total: médio-alto.** Os dois itens de maior atenção são o **streaming do `generate-adventure`** e o **novo webhook de auth do `auth-email-hook`**; o restante é substituição mecânica de endpoint/SDK com ajuste de parsing/schema.
