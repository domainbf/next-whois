import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useTranslation, TranslationKey } from "@/lib/i18n";
import en from "../../locales/en.json";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiArrowLeftLine,
  RiShieldCheckLine,
  RiCheckLine,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiAlertLine,
  RiLoader4Line,
  RiRefreshLine,
  RiTimeLine,
  RiWifiLine,
  RiServerLine,
  RiPencilLine,
  RiFlashlightLine,
  RiGlobalLine,
  RiArrowRightLine,
  RiCloudLine,
  RiDeleteBinLine,
  RiFileTextLine,
  RiLinkLine,
} from "@remixicon/react";
import { toast } from "sonner";

const TAG_STYLES: { id: string; label: string; className: string; glow?: string }[] = [
  { id: "personal", label: "Personal", className: "bg-violet-50 border border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-700/60 dark:text-violet-300" },
  { id: "official", label: "Official", className: "bg-blue-500 text-white border-0", glow: "shadow-blue-500/40" },
  { id: "brand", label: "Brand", className: "bg-violet-500 text-white border-0", glow: "shadow-violet-500/40" },
  { id: "verified", label: "Verified", className: "bg-emerald-500 text-white border-0", glow: "shadow-emerald-500/40" },
  { id: "partner", label: "Partner", className: "bg-orange-500 text-white border-0", glow: "shadow-orange-500/40" },
  { id: "dev", label: "Developer", className: "bg-sky-500 text-white border-0", glow: "shadow-sky-500/40" },
  { id: "warning", label: "Warning", className: "bg-amber-400 text-white border-0", glow: "shadow-amber-400/40" },
  { id: "premium", label: "Premium", className: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0", glow: "shadow-fuchsia-500/40" },
];

function TagBadge({ tagName, tagStyle, live = false }: { tagName: string; tagStyle: string; live?: boolean }) {
  const style = TAG_STYLES.find((s) => s.id === tagStyle) || TAG_STYLES[0];
  const isColored = style.id !== "personal";
  return (
    <span className={cn(
      "relative inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-semibold overflow-hidden select-none",
      style.className,
      live && style.glow && `shadow-md ${style.glow}`,
    )}>
      {live && (
        <motion.span
          className={cn("shrink-0", isColored ? "text-white/80" : "text-violet-500")}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: 0 }}
        >
          <RiFlashlightLine className="w-2.5 h-2.5" />
        </motion.span>
      )}
      <span>{tagName || style.label}</span>
      {live && (
        <motion.span
          className={cn("shrink-0", isColored ? "text-white/80" : "text-violet-500")}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: 0.8 }}
        >
          <RiFlashlightLine className="w-2.5 h-2.5" />
        </motion.span>
      )}
      {live && isColored && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.28) 50%, transparent 80%)" }}
          initial={{ x: "-120%" }}
          animate={{ x: "220%" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.2 }}
        />
      )}
    </span>
  );
}

type Step = "form" | "verify" | "done";

interface StampSession {
  step: Step;
  form: { tagName: string; tagStyle: string; link: string; description: string; nickname: string; email: string };
  submitResult: { id: string; txtRecord: string; txtValue: string } | null;
}

function getSessionKey(domain: string) { return `stamp_session_${domain}`; }

function loadSession(domain: string): StampSession | null {
  if (typeof window === "undefined") return null;
  try { const raw = sessionStorage.getItem(getSessionKey(domain)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function saveSession(domain: string, data: StampSession) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(getSessionKey(domain), JSON.stringify(data)); } catch {}
}

function clearSession(domain: string) {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(getSessionKey(domain)); } catch {}
}

const STEP_LABELS: { key: Step }[] = [
  { key: "form" },
  { key: "verify" },
  { key: "done" },
];

const stepIndex = (step: Step) => STEP_LABELS.findIndex((s) => s.key === step);

const HOW_TO_STEPS = [
  { icon: RiPencilLine, color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: RiServerLine, color: "text-sky-500", bg: "bg-sky-500/10" },
  { icon: RiFlashlightLine, color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32, filter: "blur(3px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32, filter: "blur(3px)" }),
};

const AUTO_POLL_SEC = 15;

type StampKey = keyof (typeof en)["stamp"];

const HOW_STEP_TITLE_KEYS: StampKey[] = ["how_step1_title", "how_step2_title", "how_step3_title"];
const HOW_STEP_DESC_KEYS: StampKey[] = ["how_step1_desc", "how_step2_desc", "how_step3_desc"];
const TAG_ID_KEY_MAP: Record<string, StampKey> = {
  personal: "tag_personal", official: "tag_official", brand: "tag_brand",
  verified: "tag_verified", partner: "tag_partner", dev: "tag_dev",
  warning: "tag_warning", premium: "tag_premium",
};

export default function StampPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isZh = locale.startsWith("zh");
  const s = (key: StampKey, params?: Record<string, string | number>) =>
    t(`stamp.${key}` as TranslationKey, params);

  const domain = String(router.query.domain || "");
  const defaultForm = { tagName: "", tagStyle: "personal", link: "", description: "", nickname: "", email: "" };

  const [hydrated, setHydrated] = React.useState(false);
  const [existingStamps, setExistingStamps] = React.useState<{ id: string; tagName: string; tagStyle: string; nickname: string }[]>([]);
  const [existingExpanded, setExistingExpanded] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");
  const [direction, setDirection] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState(defaultForm);
  const [submitResult, setSubmitResult] = React.useState<{ id: string; txtRecord: string; txtValue: string } | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [verifyState, setVerifyState] = React.useState<"idle" | "loading" | "fail" | "dnsError">("idle");
  const [resolvers, setResolvers] = React.useState<{ name: string; proto?: string; ip?: string; latencyMs: number; found: boolean; error: string | null }[]>([]);
  const [httpCheck, setHttpCheck] = React.useState<{ found: boolean; latencyMs: number; error: string | null; url: string } | null>(null);
  const [verifyTab, setVerifyTab] = React.useState<"dns" | "http">("dns");
  const [quickTxtLoading, setQuickTxtLoading] = React.useState(false);
  const [quickTxtResult, setQuickTxtResult] = React.useState<{ found: boolean; records: string[][]; latencyMs: number; resolvers: { name: string; records: string[][]; latencyMs: number; error?: string }[] } | null>(null);
  const [countdown, setCountdown] = React.useState(0);
  const pollRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  function goToStep(next: Step) {
    setDirection(stepIndex(next) > stepIndex(step) ? 1 : -1);
    setStep(next);
  }

  React.useEffect(() => {
    if (!domain || hydrated) return;
    const saved = loadSession(domain);
    if (saved) {
      const restoredStep = saved.step === "done" ? "form" : saved.step;
      setStep(restoredStep);
      setForm(saved.form || defaultForm);
      setSubmitResult(saved.submitResult || null);
    }
    setHydrated(true);
  }, [domain]);

  React.useEffect(() => {
    if (!domain || !hydrated) return;
    if (step === "done") { clearSession(domain); return; }
    saveSession(domain, { step, form, submitResult });
  }, [step, form, submitResult, domain, hydrated]);

  React.useEffect(() => {
    if (!domain) return;
    fetch(`/api/stamp/check?domain=${encodeURIComponent(domain)}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.stamps)) setExistingStamps(data.stamps); })
      .catch(() => {});
  }, [domain]);

  function goBack() {
    clearSession(domain);
    stopPolling();
    if (window.history.length > 1) router.back();
    else router.push(domain ? `/${domain}` : "/");
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  }

  async function handleSubmit() {
    setFormError(null);
    if (!form.tagName.trim()) {
      setFormError(s("err_tag_name"));
      return;
    }
    if (!form.nickname.trim()) {
      setFormError(s("err_nickname"));
      return;
    }
    if (!form.email.trim()) {
      setFormError(s("err_email_empty"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError(s("err_email_invalid"));
      return;
    }
    let cleanLink = form.link.trim();
    if (cleanLink && !/^https?:\/\//i.test(cleanLink)) {
      cleanLink = `https://${cleanLink}`;
    }
    if (cleanLink && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(cleanLink)) {
      setFormError(s("err_link_invalid"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stamp/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, ...form, link: cleanLink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitResult({ id: data.id, txtRecord: data.txtRecord, txtValue: data.txtValue });
      goToStep("verify");
    } catch (err: any) {
      const msg = err?.message || "";
      const isSafeMsg = /[\u4e00-\u9fa5]/.test(msg);
      setFormError(isSafeMsg ? msg : s("err_submit_failed"));
    } finally {
      setLoading(false);
    }
  }

  function stopPolling() {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(0);
  }

  function startCountdown(sec: number, onDone: () => void) {
    stopPolling();
    setCountdown(sec);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current!); countdownRef.current = null; return 0; }
        return c - 1;
      });
    }, 1000);
    pollRef.current = setTimeout(onDone, sec * 1000);
  }

  async function handleQuickTxt() {
    if (!submitResult) return;
    setQuickTxtLoading(true);
    setQuickTxtResult(null);
    try {
      const res = await fetch(`/api/dns/txt?name=${encodeURIComponent(submitResult.txtRecord)}`);
      const data = await res.json();
      setQuickTxtResult(data);
    } catch {
      setQuickTxtResult({ found: false, records: [], latencyMs: 0, resolvers: [] });
    } finally {
      setQuickTxtLoading(false);
    }
  }

  const handleVerify = React.useCallback(async (silent = false) => {
    if (!submitResult) return;
    setVerifyState("loading");
    stopPolling();
    try {
      const res = await fetch("/api/stamp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: submitResult.id, domain }),
      });
      const data = await res.json();
      if (data.resolvers) setResolvers(data.resolvers);
      if (data.httpCheck) setHttpCheck(data.httpCheck);
      if (data.verified) {
        goToStep("done");
        setVerifyState("idle");
        return;
      } else if (data.dnsError) {
        setVerifyState("dnsError");
      } else {
        setVerifyState("fail");
      }
      startCountdown(AUTO_POLL_SEC, () => handleVerify(true));
    } catch {
      setVerifyState("fail");
      startCountdown(AUTO_POLL_SEC, () => handleVerify(true));
    }
  }, [submitResult, domain]);

  React.useEffect(() => {
    if (step === "verify" && submitResult) handleVerify(true);
    return () => stopPolling();
  }, [step, submitResult?.id]);

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(s("copied")));
  }

  return (
    <>
      <Head>
        <title>{s("title")} · {domain}</title>
      </Head>

      <div className="min-h-[calc(100vh-64px)] bg-background">
        <div className="max-w-lg mx-auto px-4 py-5 pb-20">

          {/* Back nav */}
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <RiArrowLeftLine className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              {s("back")}
            </button>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-sm font-mono text-muted-foreground/80">{domain}</span>
          </div>

          {/* Skeleton while restoring session */}
          {!hydrated && (
            <div className="space-y-3 animate-pulse">
              <div className="h-28 rounded-2xl bg-muted/50" />
              <div className="h-8 rounded-lg bg-muted/30 w-2/3 mx-auto" />
              <div className="h-48 rounded-2xl bg-muted/40" />
              <div className="h-12 rounded-xl bg-muted/35" />
            </div>
          )}

          {hydrated && (
            <>
              {/* Hero banner */}
              <div className="relative rounded-2xl overflow-hidden mb-5 border border-violet-200/40 dark:border-violet-800/30">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-fuchsia-500/5 dark:from-violet-500/15 dark:to-fuchsia-500/8" />
                <div className="relative px-5 py-4 flex items-center gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-300/30 dark:border-violet-700/40 flex items-center justify-center">
                    <RiShieldCheckLine className="w-6 h-6 text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold text-foreground">{s("title")}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {s("subtitle")}
                    </p>
                  </div>
                  {step !== "done" && (
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] font-bold text-violet-500/70 uppercase tracking-widest">
                        {s("step", { current: stepIndex(step) + 1 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step indicator */}
              {step !== "done" && (
                <div className="flex items-center mb-5 px-1">
                  {STEP_LABELS.filter(s => s.key !== "done").map((s, i) => {
                    const cur = stepIndex(step);
                    const isActive = s.key === step;
                    const isDone = i < cur;
                    return (
                      <React.Fragment key={s.key}>
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                            isActive ? "bg-violet-500 text-white shadow-sm shadow-violet-500/30"
                              : isDone ? "bg-emerald-500 text-white"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {isDone ? <RiCheckLine className="w-3 h-3" /> : i + 1}
                          </div>
                              <span className={cn(
                            "text-xs font-medium transition-colors",
                            isActive ? "text-foreground" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                          )}>
                            {t(`stamp.step_${s.key}`)}
                          </span>
                        </div>
                        {i < STEP_LABELS.filter(s => s.key !== "done").length - 1 && (
                          <div className={cn("flex-1 h-px mx-2 transition-colors", isDone ? "bg-emerald-400/60" : "bg-border")} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Animated step content */}
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                >
                  {/* ── STEP 1: FORM ── */}
                  {step === "form" && (
                    <div className="space-y-4">
                      {/* How-to guide */}
                      <div className="glass-panel border border-border rounded-2xl p-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                          <RiGlobalLine className="w-3.5 h-3.5" />
                          {s("how_it_works")}
                        </p>
                        <div className="space-y-3">
                          {HOW_TO_STEPS.map((step, i) => {
                            const Icon = step.icon;
                            return (
                            <div key={i} className="flex gap-3 items-start">
                              <div className={cn("shrink-0 w-7 h-7 rounded-lg flex items-center justify-center", step.bg)}>
                                <Icon className={cn("w-3.5 h-3.5", step.color)} />
                              </div>
                              <div className="min-w-0 pt-0.5">
                                <p className="text-xs font-semibold text-foreground leading-none mb-1">{s(HOW_STEP_TITLE_KEYS[i])}</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">{s(HOW_STEP_DESC_KEYS[i])}</p>
                              </div>
                              {i < HOW_TO_STEPS.length - 1 && (
                                <RiArrowRightLine className="shrink-0 w-3.5 h-3.5 text-muted-foreground/30 mt-1.5" />
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Existing stamps notice */}
                      {existingStamps.length > 0 && (
                        <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
                          <button
                            type="button"
                            onClick={() => setExistingExpanded(!existingExpanded)}
                            className="flex items-center justify-between w-full"
                          >
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                              {s("existing_count", { count: existingStamps.length })}
                            </span>
                            <span className="text-[10px] text-amber-600/70">
                              {existingExpanded ? s("existing_collapse") : s("existing_expand")}
                            </span>
                          </button>
                          {existingExpanded && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {existingStamps.map((st) => (
                                <TagBadge key={st.id} tagName={st.tagName} tagStyle={st.tagStyle} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Form card */}
                      <div className="space-y-4">
                        <div className="glass-panel border border-border rounded-2xl p-5 space-y-5">

                          {/* Domain field */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">{s("domain_label")}</Label>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/60">
                              <RiGlobalLine className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-mono text-foreground">{domain}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1.5">{s("domain_hint")}</p>
                          </div>

                          <div className="h-px bg-border/50" />

                          {/* Tag name */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                              {s("tag_name_label")} <span className="text-red-500 normal-case tracking-normal font-normal">*</span>
                            </Label>
                            <Input
                              value={form.tagName}
                              onChange={(e) => update("tagName", e.target.value)}
                              placeholder={s("tag_name_placeholder")}
                              maxLength={20}
                            />
                          </div>

                          {/* Tag style */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">{s("tag_style_label")}</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {TAG_STYLES.map((ts) => {
                                const tagKey = TAG_ID_KEY_MAP[ts.id];
                                const tagLabel = tagKey ? s(tagKey) : ts.label;
                                return (
                                <button
                                  key={ts.id}
                                  type="button"
                                  onClick={() => update("tagStyle", ts.id)}
                                  className={cn(
                                    "flex items-center justify-center py-2.5 px-3 rounded-xl transition-all border-2",
                                    form.tagStyle === ts.id
                                      ? "border-violet-400 bg-violet-50/50 dark:bg-violet-950/30 ring-2 ring-violet-300/50 dark:ring-violet-700/50"
                                      : "border-border/60 hover:border-border bg-muted/20"
                                  )}
                                >
                                  <TagBadge tagName={tagLabel} tagStyle={ts.id} />
                                </button>
                                );
                              })}
                            </div>
                            {form.tagName && (
                              <div className="mt-3 px-4 py-3 rounded-xl bg-gradient-to-br from-violet-50/60 to-fuchsia-50/40 dark:from-violet-950/30 dark:to-fuchsia-950/20 border border-violet-200/50 dark:border-violet-800/30 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400/70">{s("live_preview")}</span>
                                  <div className="flex-1 h-px bg-violet-200/40 dark:bg-violet-800/30" />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <TagBadge tagName={form.tagName} tagStyle={form.tagStyle} live />
                                </div>
                                {form.description && (
                                  <p className="text-[11px] leading-relaxed" style={{
                                    background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 70%, #f59e0b 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                    fontStyle: "italic",
                                  }}>
                                    &ldquo;{form.description}&rdquo;
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Link (optional) */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                              {s("link_label")} <span className="normal-case tracking-normal font-normal text-muted-foreground/60">{s("optional")}</span>
                            </Label>
                            <Input
                              value={form.link}
                              onChange={(e) => update("link", e.target.value)}
                              placeholder="https://example.com"
                              type="text"
                              inputMode="url"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <div className="flex items-baseline justify-between mb-2">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                {s("desc_label")} <span className="normal-case tracking-normal font-normal text-muted-foreground/60">{s("optional")}</span>
                              </Label>
                              <span className={cn("text-[10px] tabular-nums", form.description.length >= 270 ? "text-red-500 font-semibold" : "text-muted-foreground/50")}>{form.description.length}/300</span>
                            </div>
                            <textarea
                              value={form.description}
                              onChange={(e) => update("description", e.target.value)}
                              placeholder={s("desc_placeholder")}
                              maxLength={300}
                              rows={2}
                              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 transition-shadow placeholder:text-muted-foreground/50"
                            />
                          </div>

                          <div className="h-px bg-border/50" />

                          {/* Contact */}
                          <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">{s("contact_label")}</Label>
                            <div>
                              <Label className="text-xs font-medium mb-1.5 block">
                                {s("name_label")} <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={form.nickname}
                                onChange={(e) => update("nickname", e.target.value)}
                                placeholder={s("name_placeholder")}
                                maxLength={30}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium mb-1.5 block">
                                {s("email_label")} <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={form.email}
                                onChange={(e) => update("email", e.target.value)}
                                placeholder="your@email.com"
                                type="text"
                              />
                              <p className="text-[11px] text-muted-foreground mt-1">{s("email_hint")}</p>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {formError && (
                            <motion.div
                              key="form-error"
                              initial={{ opacity: 0, y: -6, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: "auto" }}
                              exit={{ opacity: 0, y: -4, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-red-600 dark:text-red-400">
                                <RiAlertLine className="w-4 h-4 shrink-0" />
                                <span className="text-sm">{formError}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <Button
                          type="button"
                          onClick={handleSubmit}
                          disabled={loading}
                          className="w-full gap-2 h-12 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white border-0 rounded-xl text-sm font-semibold shadow-md shadow-violet-500/25 transition-all hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-px"
                        >
                          {loading
                            ? <><RiLoader4Line className="w-4 h-4 animate-spin" />{s("btn_submitting")}</>
                            : <><RiFlashlightLine className="w-4 h-4" />{s("btn_submit")}</>
                          }
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: VERIFY ── */}
                  {step === "verify" && submitResult && (
                    <div className="space-y-4">
                      <div className="glass-panel border border-border rounded-2xl p-5 space-y-4">

                        {/* Method tab switcher */}
                        <div className="flex rounded-xl bg-muted/40 border border-border/50 p-1 gap-1">
                          <button
                            type="button"
                            onClick={() => setVerifyTab("dns")}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                              verifyTab === "dns"
                                ? "bg-background shadow-sm text-foreground border border-border/60"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <RiServerLine className="w-3.5 h-3.5" />
                            DNS TXT
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerifyTab("http")}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                              verifyTab === "http"
                                ? "bg-background shadow-sm text-foreground border border-border/60"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <RiFlashlightLine className="w-3.5 h-3.5 text-sky-500" />
                            {isZh ? "文件验证（快速）" : "File Verify (Fast)"}
                          </button>
                        </div>

                        {/* ── DNS tab ── */}
                        {verifyTab === "dns" && (
                          <>
                            <div>
                              <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
                                <RiServerLine className="w-4 h-4 text-sky-500" />
                                {s("verify_dns_title")}
                              </h2>
                              <p className="text-xs text-muted-foreground">
                                {s("verify_dns_desc", { sec: AUTO_POLL_SEC })}
                              </p>
                            </div>

                            {/* DNS record table */}
                            <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/60">
                              {[
                                { label: s("dns_field_type"), value: "TXT", mono: false, copyable: false },
                                { label: s("dns_field_host"), value: submitResult.txtRecord, mono: true, color: "text-violet-600 dark:text-violet-400", copyable: true },
                                { label: s("dns_field_value"), value: submitResult.txtValue, mono: true, color: "text-emerald-600 dark:text-emerald-400", copyable: true },
                                { label: "TTL", value: s("dns_field_ttl_val"), mono: false, copyable: false },
                              ].map((row) => (
                                <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/20">
                                  <div className="shrink-0 w-20">
                                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">{row.label}</p>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs break-all leading-relaxed", row.mono ? "font-mono" : "", row.color || "text-foreground")}>
                                      {row.value}
                                    </p>
                                  </div>
                                  {row.copyable && (
                                    <button
                                      onClick={() => copyText(row.value)}
                                      className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                      <RiFileCopyLine className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Quick TXT check */}
                            <div className="rounded-xl border border-border/60 bg-muted/15 overflow-hidden">
                              <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <RiFlashlightLine className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                  <p className="text-[11px] font-semibold text-foreground">
                                    {isZh ? "快速查询 TXT 记录" : "Quick TXT lookup"}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleQuickTxt}
                                  disabled={quickTxtLoading}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-semibold transition-colors disabled:opacity-60"
                                >
                                  {quickTxtLoading
                                    ? <><RiLoader4Line className="w-3 h-3 animate-spin" />{isZh ? "查询中…" : "Querying…"}</>
                                    : <><RiRefreshLine className="w-3 h-3" />{isZh ? "立即查询" : "Check Now"}</>
                                  }
                                </button>
                              </div>
                              <div className="px-3 py-2.5">
                                {!quickTxtResult && !quickTxtLoading && (
                                  <p className="text-[11px] text-muted-foreground/60 text-center py-1">
                                    {isZh
                                      ? "直接用 Google/Cloudflare DNS 查询 TXT 记录，无需等待页面轮询"
                                      : "Query TXT records directly via Google/Cloudflare DNS — instant result"}
                                  </p>
                                )}
                                {quickTxtLoading && (
                                  <div className="flex items-center gap-2 py-1">
                                    <RiLoader4Line className="w-3.5 h-3.5 animate-spin text-muted-foreground/60" />
                                    <p className="text-[11px] text-muted-foreground">{isZh ? "正在查询…" : "Querying…"}</p>
                                  </div>
                                )}
                                {quickTxtResult && !quickTxtLoading && (
                                  <div className="space-y-2">
                                    {/* Per-resolver results */}
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {quickTxtResult.resolvers.map((r) => (
                                        <div
                                          key={r.name}
                                          className={cn(
                                            "rounded-lg border px-2.5 py-2 flex items-center gap-2",
                                            r.records.length > 0
                                              ? "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/25"
                                              : r.error === "timeout"
                                              ? "border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/15"
                                              : "border-border/50 bg-muted/10"
                                          )}
                                        >
                                          <div className={cn(
                                            "shrink-0 w-5 h-5 rounded-md flex items-center justify-center",
                                            r.records.length > 0 ? "bg-emerald-500/10"
                                              : r.error === "timeout" ? "bg-amber-500/10"
                                              : "bg-muted/30"
                                          )}>
                                            {r.records.length > 0
                                              ? <RiCheckLine className="w-3 h-3 text-emerald-500" />
                                              : r.error === "timeout"
                                              ? <RiTimeLine className="w-3 h-3 text-amber-500" />
                                              : <RiWifiLine className="w-3 h-3 text-muted-foreground/30" />
                                            }
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className={cn(
                                              "text-[10px] font-semibold truncate",
                                              r.records.length > 0 ? "text-emerald-700 dark:text-emerald-300"
                                                : r.error === "timeout" ? "text-amber-600 dark:text-amber-400"
                                                : "text-muted-foreground"
                                            )}>{r.name}</p>
                                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                              {r.records.length > 0
                                                ? `${r.latencyMs}ms ✓`
                                                : r.error === "timeout" ? (isZh ? "超时" : "timeout")
                                                : (isZh ? "未找到" : "not found")}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Found records */}
                                    {quickTxtResult.found && quickTxtResult.records.length > 0 && (
                                      <div className="rounded-lg border border-emerald-300/50 bg-emerald-50/30 dark:bg-emerald-950/20 px-2.5 py-2">
                                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                                          <RiCheckLine className="w-3 h-3" />
                                          {isZh ? "已找到 TXT 记录" : "TXT record found"}
                                        </p>
                                        {quickTxtResult.records.slice(0, 3).map((rr, i) => (
                                          <p key={i} className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 break-all leading-relaxed">
                                            {rr.join(" ")}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                    {!quickTxtResult.found && (
                                      <p className="text-[11px] text-muted-foreground/70 text-center py-0.5">
                                        {isZh ? "TXT 记录尚未传播，请稍后再查" : "TXT record not yet propagated — try again later"}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* DNS status grid */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                  <RiWifiLine className="w-3 h-3" />
                                  {s("parallel_check")}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                                  <span className="flex items-center gap-0.5"><RiServerLine className="w-2.5 h-2.5" />UDP</span>
                                  <span className="flex items-center gap-0.5"><RiCloudLine className="w-2.5 h-2.5" />DoH</span>
                                </div>
                              </div>
                              {(() => {
                                const PLACEHOLDER_RESOLVERS = [
                                  { name: "Google DNS", proto: "udp" },
                                  { name: "Cloudflare", proto: "udp" },
                                  { name: "Quad9", proto: "udp" },
                                  { name: "System DNS", proto: "udp" },
                                  { name: "Google DoH", proto: "doh" },
                                  { name: "Cloudflare DoH", proto: "doh" },
                                ];
                                const isLoading = verifyState === "loading";
                                const displayList = isLoading && resolvers.length === 0
                                  ? PLACEHOLDER_RESOLVERS
                                  : resolvers;
                                return (
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {displayList.map((item, i) => {
                                      const r = resolvers[i];
                                      const isDoh = (item as any).proto === "doh";
                                      return (
                                        <div
                                          key={item.name}
                                          className={cn(
                                            "rounded-lg border px-2.5 py-2 flex items-center gap-2 transition-all",
                                            r?.found
                                              ? "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/25"
                                              : r?.error === "timeout"
                                              ? "border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/15"
                                              : "border-border/50 bg-muted/15"
                                          )}
                                        >
                                          <div className={cn(
                                            "shrink-0 w-6 h-6 rounded-md flex items-center justify-center",
                                            r?.found ? "bg-emerald-500/10"
                                              : r?.error === "timeout" ? "bg-amber-500/10"
                                              : "bg-muted/40"
                                          )}>
                                            {isLoading
                                              ? <RiLoader4Line className="w-3 h-3 animate-spin text-muted-foreground/60" />
                                              : r?.found
                                              ? <RiCheckLine className="w-3 h-3 text-emerald-500" />
                                              : r?.error === "timeout"
                                              ? <RiTimeLine className="w-3 h-3 text-amber-500" />
                                              : isDoh
                                              ? <RiCloudLine className="w-3 h-3 text-muted-foreground/30" />
                                              : <RiWifiLine className="w-3 h-3 text-muted-foreground/30" />
                                            }
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className={cn(
                                              "text-[11px] font-semibold leading-none truncate",
                                              r?.found ? "text-emerald-700 dark:text-emerald-300"
                                                : r?.error === "timeout" ? "text-amber-600 dark:text-amber-400"
                                                : "text-muted-foreground"
                                            )}>{item.name}</p>
                                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                              {isLoading ? s("checking")
                                                : r?.found ? `${r.latencyMs}ms ✓`
                                                : r?.error === "timeout" ? s("timeout")
                                                : r?.error ? s("not_found_dns")
                                                : s("waiting")}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          </>
                        )}

                        {/* ── HTTP File tab ── */}
                        {verifyTab === "http" && (
                          <>
                            <div>
                              <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
                                <RiFileTextLine className="w-4 h-4 text-sky-500" />
                                {isZh ? "文件验证（无需等待 DNS 传播）" : "File Verification (No DNS wait)"}
                              </h2>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {isZh
                                  ? "在你的网站根目录放一个文件，系统立即检测，通常几秒内完成验证。"
                                  : "Place a file on your website's root. Verification completes in seconds — no DNS propagation needed."}
                              </p>
                            </div>

                            {/* Step-by-step instructions */}
                            <div className="space-y-2.5">
                              {/* Step 1: Create file */}
                              <div className="rounded-xl border border-border/60 bg-muted/15 overflow-hidden">
                                <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">1</span>
                                  <p className="text-[11px] font-semibold text-foreground">
                                    {isZh ? "创建验证文件" : "Create verification file"}
                                  </p>
                                </div>
                                <div className="px-3 py-2.5 space-y-2">
                                  <div>
                                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1 flex items-center gap-1">
                                      <RiLinkLine className="w-2.5 h-2.5" />
                                      {isZh ? "文件路径" : "File path"}
                                    </p>
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background border border-border/50">
                                      <code className="text-[11px] font-mono text-violet-600 dark:text-violet-400 flex-1 break-all">
                                        {`/.well-known/next-whois-verify.txt`}
                                      </code>
                                      <button
                                        onClick={() => copyText(`/.well-known/next-whois-verify.txt`)}
                                        className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                      >
                                        <RiFileCopyLine className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1 flex items-center gap-1">
                                      <RiFileTextLine className="w-2.5 h-2.5" />
                                      {isZh ? "文件内容" : "File content"}
                                    </p>
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background border border-border/50">
                                      <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex-1 break-all">
                                        {submitResult.txtValue}
                                      </code>
                                      <button
                                        onClick={() => copyText(submitResult.txtValue)}
                                        className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                      >
                                        <RiFileCopyLine className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Step 2: Verify access URL */}
                              <div className="rounded-xl border border-border/60 bg-muted/15 overflow-hidden">
                                <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">2</span>
                                  <p className="text-[11px] font-semibold text-foreground">
                                    {isZh ? "确认文件可公开访问" : "Confirm the file is publicly accessible"}
                                  </p>
                                </div>
                                <div className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background border border-border/50">
                                    <RiLinkLine className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                    <code className="text-[11px] font-mono text-sky-600 dark:text-sky-400 flex-1 break-all">
                                      {`https://${domain}/.well-known/next-whois-verify.txt`}
                                    </code>
                                    <button
                                      onClick={() => copyText(`https://${domain}/.well-known/next-whois-verify.txt`)}
                                      className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                      <RiFileCopyLine className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* HTTP check result */}
                            {httpCheck && (
                              <div className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all",
                                httpCheck.found
                                  ? "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/25"
                                  : httpCheck.error === "timeout"
                                  ? "border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/15"
                                  : "border-border/50 bg-muted/20"
                              )}>
                                <div className={cn(
                                  "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                  httpCheck.found ? "bg-emerald-500/10"
                                    : httpCheck.error === "timeout" ? "bg-amber-500/10"
                                    : "bg-muted/40"
                                )}>
                                  {verifyState === "loading"
                                    ? <RiLoader4Line className="w-4 h-4 animate-spin text-muted-foreground/60" />
                                    : httpCheck.found
                                    ? <RiCheckLine className="w-4 h-4 text-emerald-500" />
                                    : httpCheck.error === "timeout"
                                    ? <RiTimeLine className="w-4 h-4 text-amber-500" />
                                    : <RiFileTextLine className="w-4 h-4 text-muted-foreground/40" />
                                  }
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={cn(
                                    "text-xs font-semibold",
                                    httpCheck.found ? "text-emerald-700 dark:text-emerald-300"
                                      : httpCheck.error === "timeout" ? "text-amber-600 dark:text-amber-400"
                                      : "text-muted-foreground"
                                  )}>
                                    {httpCheck.found
                                      ? (isZh ? "文件已找到，验证成功！" : "File found — verified!")
                                      : httpCheck.error === "timeout"
                                      ? (isZh ? "请求超时" : "Request timed out")
                                      : httpCheck.error
                                      ? (isZh ? `文件未找到 (${httpCheck.error})` : `File not found (${httpCheck.error})`)
                                      : (isZh ? "文件未找到" : "File not found")}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                    {isZh ? "HTTP 检测" : "HTTP check"} · {httpCheck.latencyMs}ms
                                  </p>
                                </div>
                              </div>
                            )}
                            {!httpCheck && verifyState === "loading" && (
                              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-muted/20">
                                <RiLoader4Line className="w-4 h-4 animate-spin text-muted-foreground/60 shrink-0" />
                                <p className="text-xs text-muted-foreground">{isZh ? "正在检测文件…" : "Checking file…"}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Status messages (shared) */}
                        <AnimatePresence mode="wait">
                          {verifyState === "fail" && resolvers.length > 0 && verifyTab === "dns" && (
                            <motion.div
                              key="fail"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.18 }}
                              className="flex gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50"
                            >
                              <RiAlertLine className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {s("fail_msg")}
                              </p>
                            </motion.div>
                          )}
                          {verifyState === "dnsError" && verifyTab === "dns" && (
                            <motion.div
                              key="dnsError"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.18 }}
                              className="flex gap-2.5 p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/50"
                            >
                              <RiAlertLine className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {s("dns_error_msg")}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Verify button + countdown */}
                        <Button
                          onClick={() => handleVerify(false)}
                          disabled={verifyState === "loading"}
                          className="w-full gap-2 h-11 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white border-0 rounded-xl text-sm font-semibold shadow-sm shadow-violet-500/20 transition-all"
                        >
                          {verifyState === "loading"
                            ? <><RiLoader4Line className="w-4 h-4 animate-spin" />{s("checking")}</>
                            : <><RiRefreshLine className="w-4 h-4" />{s("btn_check")}</>
                          }
                        </Button>
                        {countdown > 0 && verifyState !== "loading" && (
                          <p className="text-[11px] text-muted-foreground/70 text-center flex items-center justify-center gap-1">
                            <RiTimeLine className="w-3 h-3" />
                            {s("auto_check", { sec: countdown })}
                          </p>
                        )}
                      </div>

                      {/* Tips card — only DNS tab */}
                      {verifyTab === "dns" && (
                        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex gap-3">
                          <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center mt-0.5">
                            <RiAlertLine className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-foreground">{s("dns_prop_title")}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {s("dns_prop_prefix")}<strong className="text-foreground">{s("dns_prop_highlight")}</strong>{s("dns_prop_suffix")}
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => { stopPolling(); goToStep("form"); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1"
                      >
                        {s("back_edit")}
                      </button>
                    </div>
                  )}

                  {/* ── STEP 3: DONE ── */}
                  {step === "done" && (
                    <div className="space-y-4">
                      <div className="glass-panel border border-emerald-300/40 dark:border-emerald-700/30 rounded-2xl p-8 text-center">
                        <div className="relative w-16 h-16 mx-auto mb-5">
                          <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" />
                          <div className="relative w-16 h-16 bg-emerald-500/10 border-2 border-emerald-400/40 rounded-full flex items-center justify-center">
                            <RiCheckLine className="w-8 h-8 text-emerald-500" />
                          </div>
                        </div>
                        <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mb-2">{s("done_title")}</h2>
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                          {s("done_claim_body", { domain })}
                        </p>
                        <div className="inline-flex items-center justify-center py-3 px-5 rounded-xl bg-gradient-to-br from-violet-50/60 to-fuchsia-50/40 dark:from-violet-950/30 dark:to-fuchsia-950/20 border border-violet-200/40 dark:border-violet-800/30 mb-6">
                          <TagBadge tagName={form.tagName} tagStyle={form.tagStyle} live />
                        </div>
                        <div className="space-y-2.5">
                          <Button
                            className="w-full gap-2 h-11 bg-violet-500 hover:bg-violet-600 text-white border-0 rounded-xl font-semibold"
                            onClick={goBack}
                          >
                            <RiExternalLinkLine className="w-4 h-4" />
                            {s("done_view")}
                          </Button>
                        </div>
                      </div>

                      {/* Delete verification record reminder */}
                      {submitResult && (
                        <div className="rounded-2xl border border-sky-200/60 dark:border-sky-800/40 bg-sky-50/60 dark:bg-sky-950/20 p-4">
                          <div className="flex gap-3">
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center mt-0.5">
                              <RiDeleteBinLine className="w-4 h-4 text-sky-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 mb-1">{s("done_delete_title")}</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
                                {s("done_delete_body")}
                              </p>
                              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-background/70 border border-sky-200/50 dark:border-sky-800/30">
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase shrink-0">TXT</span>
                                <code className="text-[11px] font-mono text-sky-700 dark:text-sky-300 flex-1 break-all">
                                  {submitResult.txtRecord}
                                </code>
                                <button
                                  onClick={() => copyText(submitResult!.txtRecord)}
                                  className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                  <RiFileCopyLine className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                                ℹ️ {s("done_keep_record")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* What happens next */}
                      <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{s("done_next")}</p>
                        {[
                          { icon: RiGlobalLine, text: s("done_next_all_users") },
                          { icon: RiShieldCheckLine, text: s("done_next_prominent") },
                          { icon: RiCheckLine, text: s("done_next_resubmit") },
                        ].map((item, i) => {
                          const ItemIcon = item.icon;
                          return (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="shrink-0 w-5 h-5 rounded-md bg-violet-500/10 flex items-center justify-center mt-0.5">
                              <ItemIcon className="w-3 h-3 text-violet-500" />
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{item.text}</p>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </>
  );
}
