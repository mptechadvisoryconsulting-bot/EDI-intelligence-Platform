import type { CopilotContext } from "@/lib/copilot/context";
import type { ReuseInsight } from "@/lib/copilot/reuse";
import { resolveTransactionPacks } from "@/lib/transaction-packs";
import { describePartnerSupport, resolvePartnerPack } from "@/lib/partner-packs";

function matches(message: string, patterns: string[]) {
  const lower = message.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

function formatList(items: string[], empty = "None.") {
  return items.length ? items.map((i) => `• ${i}`).join("\n") : empty;
}

function respondBlocking(context: CopilotContext): string {
  return [
    `**Setup readiness: ${context.readinessScore}/100** — ${context.readinessLabel}`,
    "",
    "**Blockers**",
    formatList(context.blockers, "No critical blockers detected."),
    "",
    "**Recommended next steps**",
    formatList(context.nextActions, "Continue review and export artifacts when ready."),
  ].join("\n");
}

function respondNextSteps(context: CopilotContext): string {
  return [
    `Here is the recommended workflow for **${context.project.name}**:`,
    "",
    formatList(context.nextActions),
    "",
    `Current status: ${context.project.status.replace(/_/g, " ")} · ${context.documents.parsed}/${context.documents.total} documents parsed · ${context.mappings.approved}/${context.mappings.total} mappings approved`,
  ].join("\n");
}

function respondSummary(context: CopilotContext): string {
  const packLines =
    context.transactionPacks.length > 0
      ? context.transactionPacks.map((p) => `• **${p.code} ${p.name}** (${p.family}) — ${p.fieldCount} standard fields`).join("\n")
      : "No supported transaction packs active.";

  return [
    `**${context.project.name}**`,
    `${context.project.customer} → ${context.project.tradingPartner}`,
    `ERP: ${context.project.erpSystem}${context.project.erpVersion ? ` ${context.project.erpVersion}` : ""} (${context.erpProfile.name})`,
    `Translator: ${context.project.translatorTarget}`,
    `Transactions: ${context.project.transactions}`,
    "",
    "**Transaction family packs**",
    packLines,
    "",
    `Readiness: **${context.readinessScore}/100** (${context.readinessLabel})`,
    `Documents: ${context.documents.parsed} parsed of ${context.documents.total}`,
    `Mappings: ${context.mappings.total} total · ${context.mappings.approved} approved · ${context.mappings.pending} pending · ${context.mappings.lowConfidence} low confidence`,
    `Open questions: ${context.openQuestions.length}`,
    `Assumptions: ${context.assumptions.length}`,
  ].join("\n");
}

function respondTransactionPacks(context: CopilotContext): string {
  if (context.transactionPacks.length === 0) {
    return [
      "No supported transaction family packs are active for this implementation.",
      "",
      "Supported packs: **846** Inventory Advice, **850** Purchase Order, **855** PO Acknowledgment, **856** Ship Notice/ASN, **810** Invoice.",
      "",
      "Tip: use the **Retail bundle** preset (846, 850, 855, 856, 810) when onboarding a standard supplier program.",
    ].join("\n");
  }

  return context.transactionPacks
    .map((pack) => {
      const full = resolveTransactionPacks(pack.code)[0];
      return [
        `**${pack.code} — ${pack.name}** (${pack.family})`,
        full?.description ?? "",
        "",
        "Key segments: " + (full?.commonSegments.join(", ") ?? ""),
        "",
        "Standard fields:",
        ...(full?.fields.slice(0, 6).map((f) => `• ${f.segment}.${f.element}${f.qualifier ? ` (${f.qualifier})` : ""} — ${f.label}`) ?? []),
        "",
        "Test scenarios:",
        ...pack.testScenarios.map((s) => `• ${s}`),
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function respondPartnerRules(context: CopilotContext): string {
  const pack = resolvePartnerPack(context.project.tradingPartner);
  return [
    `**Partner rules: ${pack.name}**`,
    "",
    describePartnerSupport(context.project.tradingPartner),
    pack.notes ? `\n${pack.notes}` : "",
    "",
    "**Certification checklist**",
    ...pack.certificationChecklist.map((c) => `• ${c}`),
    "",
    `Upload sample EDI and run analysis to compare against ${pack.name} rules.`,
  ].join("\n");
}

function respondErp(context: CopilotContext): string {
  const { erpProfile } = context;
  return [
    `**ERP support: ${erpProfile.name}** (${erpProfile.vendor})`,
    "",
    erpProfile.description,
    "",
    erpProfile.id === "custom"
      ? "For any ERP not in the catalog, upload a CSV field list — the platform matches columns to EDI targets using generic + uploaded names."
      : `Field aliases for ${erpProfile.name} are applied during analysis to improve mapping confidence against native column/table names.`,
    "",
    "**Tips**",
    "• Upload your ERP export or schema CSV as **ERP schema / field list**",
    "• Re-run analysis after changing the ERP name in implementation settings",
    "• 20+ named profiles available when creating a new implementation",
  ].join("\n");
}

function respondDraftEmail(context: CopilotContext): string {
  if (context.openQuestions.length === 0) {
    return "There are no open questions to include in a customer clarification email. Run analysis after uploading guide and source files if you expect gaps.";
  }

  const questions = context.openQuestions
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join("\n");

  return [
    "**Draft customer clarification email**",
    "",
    `Subject: EDI ${context.project.transactions} setup clarifications — ${context.project.tradingPartner}`,
    "",
    "Hello,",
    "",
    `We are preparing the EDI ${context.project.transactions} implementation for ${context.project.tradingPartner} in ${context.project.translatorTarget}. Before we configure mappings in the translator environment, we need clarification on the following items:`,
    "",
    questions,
    "",
    "Please confirm these requirements so we can finalize the implementation package and move into build and testing.",
    "",
    "Thank you,",
    "EDI Implementation Team",
  ].join("\n");
}

function respondLowConfidence(context: CopilotContext): string {
  const low = context.mappings.samples.filter((m) => m.confidence < 0.7);
  if (low.length === 0 && context.mappings.lowConfidence === 0) {
    return "No low-confidence mappings detected. Review pending items and proceed toward handoff.";
  }

  return [
    `**${context.mappings.lowConfidence} mapping(s) below 70% confidence**`,
    "",
    ...context.mappings.samples
      .filter((m) => m.confidence < 0.7)
      .map(
        (m) =>
          `• **${m.target}** ← ${m.source ?? "no source"} (${Math.round(m.confidence * 100)}%, ${m.reviewStatus})`
      ),
    "",
    "These should be validated against the guide and ERP source before translator configuration.",
  ].join("\n");
}

function respondReuse(context: CopilotContext, insights: ReuseInsight[]): string {
  return [
    `Searching prior implementations for **${context.project.tradingPartner}**, **${context.project.customer}**, and **${context.project.erpSystem}**:`,
    "",
    ...insights.map((i) => `• **${i.label}** — ${i.detail}`),
  ].join("\n");
}

function respondExplainMapping(message: string, context: CopilotContext): string {
  const targetMatch = message.match(/\b([A-Z]{2,3})[\.*](\d{2,3})\b/i);
  if (!targetMatch) {
    return [
      "Ask about a specific mapping, for example: `Why was BEG.03 mapped to purchase_order_number?`",
      "",
      "Current sample mappings:",
      ...context.mappings.samples.map(
        (m) => `• ${m.target} ← ${m.source ?? "none"} (${Math.round(m.confidence * 100)}%)`
      ),
    ].join("\n");
  }

  const segment = targetMatch[1].toUpperCase();
  const element = targetMatch[2].padStart(2, "0");
  const mapping = context.mappings.samples.find(
    (m) => m.target.startsWith(`${segment}.${element}`)
  );

  if (!mapping) {
    return `I don't see ${segment}.${element} in the current recommendation set. Run analysis after uploading guide and source files.`;
  }

  return [
    `**${mapping.target}**`,
    `Source: ${mapping.source ?? "not assigned"}`,
    `Confidence: ${Math.round(mapping.confidence * 100)}%`,
    `Review status: ${mapping.reviewStatus}`,
    "",
    mapping.confidence >= 0.8
      ? "This is a strong match based on uploaded source field naming patterns."
      : "This mapping needs human validation before build.",
  ].join("\n");
}

export function generateCopilotReply(input: {
  message: string;
  context: CopilotContext;
  reuseInsights: ReuseInsight[];
}): string {
  const { message, context, reuseInsights } = input;

  if (matches(message, ["transaction pack", "transaction family", "846", "850", "855", "856", "810", "what transactions", "retail bundle"])) {
    return respondTransactionPacks(context);
  }

  if (matches(message, ["block", "blocking", "ready", "readiness", "what's left", "whats left"])) {
    return respondBlocking(context);
  }

  if (matches(message, ["next", "what should i do", "workflow", "steps", "speed up", "improve flow"])) {
    return respondNextSteps(context);
  }

  if (matches(message, ["summarize", "summary", "overview", "status"])) {
    return respondSummary(context);
  }

  if (matches(message, ["partner rule", "retailer", "walmart", "target", "amazon", "certification checklist"])) {
    return respondPartnerRules(context);
  }

  if (matches(message, ["edi compare", "sample edi", "compare edi", "edi diff"])) {
    return [
      "**Sample EDI compare**",
      "",
      "Upload partner sample EDI as document type **Sample EDI**, then run analysis.",
      "The compare panel checks segments against your mappings and partner rule pack.",
      "",
      `Active partner: ${resolvePartnerPack(context.project.tradingPartner).name}`,
      "Try the **Sample EDI compare** panel in the implementation for pass/fail details.",
    ].join("\n");
  }

  if (matches(message, ["erp", "source system", "netsuite", "sap", "dynamics", "oracle", "field alias", "which erp"])) {
    return respondErp(context);
  }

  if (matches(message, ["draft", "email", "clarification", "customer"])) {
    return respondDraftEmail(context);
  }

  if (matches(message, ["low confidence", "uncertain", "risky mapping", "explain mapping", "why was"])) {
    if (matches(message, ["why was", "explain"])) {
      return respondExplainMapping(message, context);
    }
    return respondLowConfidence(context);
  }

  if (matches(message, ["seen before", "prior", "reuse", "last time", "similar", "history"])) {
    return respondReuse(context, reuseInsights);
  }

  if (matches(message, ["help", "what can you"])) {
    return [
      "I can help with this transaction implementation:",
      "",
      "• **What's blocking setup?** — readiness score and blockers",
      "• **What should I do next?** — recommended workflow steps",
      "• **Summarize this implementation** — current status overview",
      "• **Draft customer clarification** — email from open questions",
      "• **Explain low-confidence mappings** — review risky items",
      "• **Have we seen this partner before?** — reuse from prior implementations",
      "• **What transaction packs apply?** — 846, 850, 855, 856, 810 field and test guidance",
      "• **Which ERP profile is active?** — field alias support for your source system",
      "",
      "Every approved mapping and resolved question makes future setups faster.",
    ].join("\n");
  }

  return [
    respondSummary(context),
    "",
    "---",
    "",
    "**Suggested focus**",
    formatList(context.nextActions.slice(0, 3)),
    "",
    "Try: *What's blocking setup?* or *Draft customer clarification email*",
  ].join("\n");
}

export async function generateCopilotReplyWithLLM(input: {
  message: string;
  context: CopilotContext;
  reuseInsights: ReuseInsight[];
  history: Array<{ role: string; content: string }>;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = [
    "You are the Implementation Copilot for an AI EDI Implementation Intelligence Platform.",
    "You help EDI analysts prepare translator configuration BEFORE build begins.",
    "You do NOT send live EDI or replace translators/VANs.",
    "Be concise, actionable, and surface missing information early.",
    "Always mention confidence, blockers, and next steps when relevant.",
    "",
    "Implementation context:",
    JSON.stringify({ context: input.context, reuseInsights: input.reuseInsights }, null, 2),
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          ...input.history.slice(-6).map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
          { role: "user", content: input.message },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}

export async function respondToCopilotMessage(input: {
  message: string;
  context: CopilotContext;
  reuseInsights: ReuseInsight[];
  history: Array<{ role: string; content: string }>;
}): Promise<{ reply: string; mode: "llm" | "rules" }> {
  const llmReply = await generateCopilotReplyWithLLM(input);
  if (llmReply) {
    return { reply: llmReply, mode: "llm" };
  }

  return {
    reply: generateCopilotReply(input),
    mode: "rules",
  };
}
