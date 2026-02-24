import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PublicBrandLayout from "@/components/layout/PublicBrandLayout";
import { BrandName, BRAND_TAGLINE } from "@/components/BrandName";
import { supabase } from "@/lib/supabase";
import type { TemplateField, FormFieldType } from "@/data/mockData";

interface FormTemplateMeta {
  id: string;
  name: string;
  description: string | null;
  share_code: string | null;
}

function rowToTemplateField(r: Record<string, unknown>, displayOrder: number): TemplateField {
  const type = (r.field_type as FormFieldType) ?? "text";
  const options = r.options != null ? (Array.isArray(r.options) ? (r.options as string[]) : []) : undefined;
  return {
    id: String(r.id),
    type,
    label: String(r.name ?? ""),
    placeholder: r.placeholder != null ? String(r.placeholder) : undefined,
    required: Boolean(r.required),
    options: options?.length ? options : undefined,
    termsText: r.terms_text != null ? String(r.terms_text) : undefined,
    displayOrder,
  };
}

export default function FormPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [templateMeta, setTemplateMeta] = useState<FormTemplateMeta | null>(null);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setTemplateMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, description, share_code")
        .eq("share_token", token)
        .eq("is_shareable", true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setTemplateMeta(null);
        setLoading(false);
        return;
      }
      setTemplateMeta(data as FormTemplateMeta);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!codeVerified || !templateMeta?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("template_fields")
        .select("*")
        .eq("template_id", templateMeta.id)
        .order("display_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        setTemplateFields([]);
        return;
      }
      const rows = (data ?? []) as Record<string, unknown>[];
      const fields = rows.map((r, i) => rowToTemplateField(r, typeof r.display_order === "number" ? r.display_order : i));
      setTemplateFields(fields);
    })();
    return () => { cancelled = true; };
  }, [codeVerified, templateMeta?.id]);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 3 || !templateMeta?.share_code) return;
    const entered = codeInput.trim();
    if (entered === templateMeta.share_code) {
      setCodeVerified(true);
      setCodeError("");
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setCodeError("Incorrect code. Please check and try again.");
      if (next >= 3) setCodeError("Too many attempts. Please contact the person who sent you this form.");
    }
  };

  const setValue = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    let valid = true;
    templateFields.forEach((f) => {
      if (f.type === "divider" || f.type === "heading") return;
      if (f.required) {
        const v = values[f.label]?.trim();
        if (v === undefined || v === "") {
          next[f.label] = "This field is required.";
          valid = false;
        }
      }
    });
    setErrors(next);
    return valid;
  }, [templateFields, values]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateMeta?.id || submitted) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fieldValues: Record<string, string> = {};
      templateFields.forEach((f) => {
        if (f.type === "divider" || f.type === "heading") return;
        fieldValues[f.label] = values[f.label] ?? "";
      });
      const { error } = await supabase.from("form_submissions").insert({
        template_id: templateMeta.id,
        field_values: fieldValues,
        status: "pending",
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      setErrors({ _form: "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const clearSignatureFor = useCallback(
    (label: string) => {
      const canvas = signatureCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setValue(label, "");
      }
    },
    [setValue]
  );

  const captureSignatureFor = useCallback(
    (label: string) => {
      const canvas = signatureCanvasRef.current;
      if (!canvas) return;
      setValue(label, canvas.toDataURL("image/png"));
    },
    [setValue]
  );

  if (!token) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground mb-3">This form link is not valid.</h1>
          <p className="text-sm text-muted-foreground mb-6">Please use the full link you were sent.</p>
          <Link to="/" className="text-primary font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </PublicBrandLayout>
    );
  }

  if (loading) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading form…</p>
        </div>
      </PublicBrandLayout>
    );
  }

  if (!templateMeta) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground mb-3">This form link is not valid or has expired.</h1>
          <p className="text-sm text-muted-foreground mb-6">Please contact the business that sent you this link.</p>
          <Link to="/" className="text-primary font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </PublicBrandLayout>
    );
  }

  if (!codeVerified) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="rounded-xl bg-gold h-10 w-10 flex items-center justify-center text-gold-foreground font-bold">
              L
            </div>
            <span className="text-xl font-bold text-foreground">Lunex</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Form: {templateMeta.name}</h1>
          <p className="text-muted-foreground text-sm mb-6 text-center">
            Enter the form code you received to continue.
          </p>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="e.g. FORM-1234"
                disabled={attempts >= 3}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] text-center font-mono text-lg"
              />
              {codeError && <p className="text-sm text-destructive text-center" role="alert">{codeError}</p>}
              <Button type="submit" className="w-full min-h-[48px]" disabled={attempts >= 3}>
                Continue
              </Button>
            </form>
          </div>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            <BrandName /> — {BRAND_TAGLINE}
          </p>
        </div>
      </PublicBrandLayout>
    );
  }

  if (submitted) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md text-center">
          <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Thank you</h1>
          <p className="text-muted-foreground mb-6">
            Your form has been submitted successfully. The business will review your information shortly. Thank you.
          </p>
          <p className="text-xs text-muted-foreground">
            <BrandName /> — {BRAND_TAGLINE}
          </p>
        </div>
      </PublicBrandLayout>
    );
  }

  const dataFields = templateFields.filter((f) => f.type !== "divider" && f.type !== "heading");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-gold h-10 w-10 flex items-center justify-center text-gold-foreground font-bold shrink-0">
              L
            </div>
            <span className="text-xl font-bold text-foreground">Lunex</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{templateMeta.name}</h1>
          {templateMeta.description && (
            <p className="text-muted-foreground text-sm mt-1">{templateMeta.description}</p>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors._form && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{errors._form}</div>
          )}
          {templateFields.map((f) => {
            if (f.type === "divider") {
              return <hr key={f.id} className="border-border my-6" />;
            }
            if (f.type === "heading") {
              return (
                <h2 key={f.id} className="text-lg font-bold text-foreground mt-6">
                  {f.label}
                </h2>
              );
            }
            const hasError = Boolean(errors[f.label]);
            const requiredMark = f.required ? <span className="text-destructive">*</span> : null;
            return (
              <div key={f.id} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  {f.label}
                  {requiredMark}
                </label>
                {f.type === "text" && (
                  <Input
                    value={values[f.label] ?? ""}
                    onChange={(e) => setValue(f.label, e.target.value)}
                    placeholder={f.placeholder}
                    className={hasError ? "border-destructive" : ""}
                  />
                )}
                {f.type === "textarea" && (
                  <textarea
                    value={values[f.label] ?? ""}
                    onChange={(e) => setValue(f.label, e.target.value)}
                    placeholder={f.placeholder}
                    rows={4}
                    className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] ${hasError ? "border-destructive" : "border-input"}`}
                  />
                )}
                {f.type === "number" && (
                  <input
                    type="number"
                    value={values[f.label] ?? ""}
                    onChange={(e) => setValue(f.label, e.target.value)}
                    placeholder={f.placeholder}
                    className={`w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] ${hasError ? "border-destructive" : "border-input"}`}
                  />
                )}
                {f.type === "email" && (
                  <Input
                    type="email"
                    value={values[f.label] ?? ""}
                    onChange={(e) => setValue(f.label, e.target.value)}
                    placeholder={f.placeholder}
                    className={hasError ? "border-destructive" : ""}
                  />
                )}
                {f.type === "phone" && (
                  <Input
                    type="tel"
                    value={values[f.label] ?? ""}
                    onChange={(e) => setValue(f.label, e.target.value)}
                    placeholder={f.placeholder}
                    className={hasError ? "border-destructive" : ""}
                  />
                )}
                {f.type === "date" && (
                  <input
                    type="date"
                    value={values[f.label] ?? ""}
                    onChange={(e) => setValue(f.label, e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] ${hasError ? "border-destructive" : "border-input"}`}
                  />
                )}
                {f.type === "checkbox" && (
                  <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
                    <input
                      type="checkbox"
                      checked={(values[f.label] ?? "") === "yes"}
                      onChange={(e) => setValue(f.label, e.target.checked ? "yes" : "")}
                      className="h-5 w-5 rounded border-input"
                    />
                    <span className="text-sm text-foreground">Yes</span>
                  </label>
                )}
                {f.type === "radio" && (
                  <div className="space-y-2">
                    {(f.options ?? []).filter(Boolean).map((opt, i) => (
                      <label key={i} className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                        <input
                          type="radio"
                          name={f.id}
                          checked={(values[f.label] ?? "") === opt}
                          onChange={() => setValue(f.label, opt)}
                          className="h-4 w-4 border-input"
                        />
                        <span className="text-sm text-foreground">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
                {f.type === "select" && (
                  <select
                    value={values[f.label] ?? ""}
                    onChange={(e) => setValue(f.label, e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] ${hasError ? "border-destructive" : "border-input"}`}
                  >
                    <option value="">— Select —</option>
                    {(f.options ?? []).filter(Boolean).map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                {f.type === "signature" && (
                  <div className="space-y-2">
                    <canvas
                      ref={signatureCanvasRef}
                      width={320}
                      height={160}
                      className="border border-input rounded-lg bg-white touch-none w-full max-w-md"
                      style={{ touchAction: "none" }}
                      onMouseDown={(e) => {
                        const canvas = signatureCanvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;
                        ctx.strokeStyle = "#0f172a";
                        ctx.lineWidth = 2;
                        ctx.lineCap = "round";
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        ctx.beginPath();
                        ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
                        const move = (ev: MouseEvent) => {
                          ctx.lineTo((ev.clientX - rect.left) * scaleX, (ev.clientY - rect.top) * scaleY);
                          ctx.stroke();
                        };
                        const up = () => {
                          window.removeEventListener("mousemove", move);
                          window.removeEventListener("mouseup", up);
                          captureSignatureFor(f.label);
                        };
                        window.addEventListener("mousemove", move);
                        window.addEventListener("mouseup", up);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        const canvas = signatureCanvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;
                        ctx.strokeStyle = "#0f172a";
                        ctx.lineWidth = 2;
                        ctx.lineCap = "round";
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        const t = e.touches[0];
                        ctx.beginPath();
                        ctx.moveTo((t.clientX - rect.left) * scaleX, (t.clientY - rect.top) * scaleY);
                        const move = (ev: TouchEvent) => {
                          if (ev.touches.length === 0) return;
                          const tt = ev.touches[0];
                          ctx.lineTo((tt.clientX - rect.left) * scaleX, (tt.clientY - rect.top) * scaleY);
                          ctx.stroke();
                        };
                        const end = () => {
                          window.removeEventListener("touchmove", move, { capture: true });
                          window.removeEventListener("touchend", end);
                          captureSignatureFor(f.label);
                        };
                        window.addEventListener("touchmove", move, { capture: true });
                        window.addEventListener("touchend", end);
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => clearSignatureFor(f.label)}>
                      Clear
                    </Button>
                  </div>
                )}
                {f.type === "terms" && (
                  <div className="space-y-2">
                    <div className="max-h-40 overflow-y-auto p-3 rounded-lg border border-input bg-muted/20 text-sm text-foreground">
                      {f.termsText || "No terms text."}
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
                      <input
                        type="checkbox"
                        checked={(values[f.label] ?? "") === "agreed"}
                        onChange={(e) => setValue(f.label, e.target.checked ? "agreed" : "")}
                        className="h-5 w-5 rounded border-input"
                      />
                      <span className="text-sm text-foreground">I have read and agree to these terms.</span>
                    </label>
                  </div>
                )}
                {hasError && <p className="text-sm text-destructive">{errors[f.label]}</p>}
              </div>
            );
          })}

          <div className="pt-4">
            <Button type="submit" className="w-full min-h-[48px] text-base" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit form"
              )}
            </Button>
          </div>
        </form>

        <footer className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            <BrandName /> — {BRAND_TAGLINE}
          </p>
        </footer>
      </main>
    </div>
  );
}
