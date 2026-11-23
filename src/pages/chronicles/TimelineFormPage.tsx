import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useChroniclesMutations, useTimeline } from "../../hooks/useChronicles";
import { publicUrl } from "../../services/chroniclesApi";
import type { ChroniclesTimeline, TimelineConfig } from "../../types/chronicles";
import {
  Field,
  FormError,
  FormSkeleton,
  PageHeader,
  SectionTitle,
  TimelineTabs,
  panelClass,
  selectClass,
} from "../../components/chronicles/parts";

const defaults: TimelineConfig = {
  categories: [
    { key: "accomplishment", label: "Event / Response", color: "#8a6a1f" },
    { key: "issues", label: "Funding / Investigation", color: "#a43b24" },
    { key: "questionable", label: "Governance / Controversy", color: "#425f88" },
  ],
  statuses: ["confirmed", "developing", "archived"],
  severities: ["critical", "high", "medium", "low"],
  features: { quotes: true },
};

const blank: Partial<ChroniclesTimeline> = {
  name: "",
  slug: "",
  description: "",
  status: "draft",
  theme: {},
  config: defaults,
};

/** Create (`/chronicles/new`) and edit (`/chronicles/timelines/:id/settings`). */
export default function TimelineFormPage() {
  const { id } = useParams();
  const existing = useTimeline(id);
  if (id && existing.isLoading) return <FormSkeleton label="Fetching timeline settings" />;
  if (id && existing.error && !existing.data)
    return <FormError>{(existing.error as Error).message}</FormError>;
  // Remount per timeline so the form starts from the fetched values.
  return (
    <TimelineForm
      key={id ?? "new"}
      id={id}
      initial={existing.data ?? (blank as ChroniclesTimeline)}
    />
  );
}

function TimelineForm({ id, initial }: { id?: string; initial: ChroniclesTimeline }) {
  const navigate = useNavigate();
  const { saveTimeline, deleteTimeline } = useChroniclesMutations();
  const [timeline, setTimeline] = useState<Partial<ChroniclesTimeline>>(initial);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const busy = saveTimeline.isPending || deleteTimeline.isPending;

  function field<K extends keyof ChroniclesTimeline>(key: K, value: ChroniclesTimeline[K]) {
    setTimeline((t) => ({ ...t, [key]: value }));
  }
  function theme(key: string, value: string) {
    setTimeline((t) => ({ ...t, theme: { ...t.theme, [key]: value } }));
  }
  const config = timeline.config!;
  const setConfig = (next: TimelineConfig) => field("config", next);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const saved = await saveTimeline.mutateAsync({ id, data: timeline });
      toast.success(id ? "Timeline settings saved" : `Created "${saved.name}"`);
      navigate(`/chronicles/timelines/${saved.id}/entries`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove() {
    if (!id || confirmation !== timeline.slug) return;
    setError("");
    try {
      await deleteTimeline.mutateAsync({ id, confirmation });
      toast.success(`Deleted "${timeline.name}"`);
      navigate("/chronicles");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      {id ? (
        <>
          <PageHeader
            eyebrow={initial.name}
            title="Settings"
            subtitle="Branding, categories and publishing."
          />
          <TimelineTabs id={id} />
        </>
      ) : (
        <PageHeader
          title="Create a timeline"
          subtitle="Add the basics now; you can change them later."
        />
      )}

      <form onSubmit={save} className={cn(panelClass, "flex flex-col gap-5 p-6")}>
        <FormError>{error}</FormError>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              required
              maxLength={255}
              value={timeline.name}
              onChange={(e) => field("name", e.target.value)}
            />
          </Field>
          <Field label="Subdomain slug" hint={publicUrl(timeline.slug || "your-slug")}>
            <Input
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={timeline.slug}
              onChange={(e) => field("slug", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            value={timeline.description || ""}
            onChange={(e) => field("description", e.target.value)}
          />
        </Field>
        <Field label="Publication status" className="sm:max-w-xs">
          <select
            className={selectClass}
            value={timeline.status}
            onChange={(e) => field("status", e.target.value as ChroniclesTimeline["status"])}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>

        <SectionTitle title="Theme and hero" hint="Colours and text on the public page." />
        <div className="grid gap-4 sm:grid-cols-3">
          {(["primaryColor", "accentColor", "backgroundColor"] as const).map((key, i) => (
            <Field key={key} label={["Primary color", "Accent color", "Background color"][i]}>
              <Input
                type="color"
                className="h-9 w-full cursor-pointer p-1"
                value={timeline.theme?.[key] || ["#0b1628", "#c49428", "#faf8f2"][i]}
                onChange={(e) => theme(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <Field label="Logo URL">
          <Input
            type="url"
            value={timeline.theme?.logoUrl || ""}
            onChange={(e) => theme("logoUrl", e.target.value)}
          />
        </Field>
        <Field label="Hero title">
          <Input
            value={timeline.theme?.heroTitle || ""}
            onChange={(e) => theme("heroTitle", e.target.value)}
          />
        </Field>
        <Field label="Hero description">
          <Textarea
            value={timeline.theme?.heroDescription || ""}
            onChange={(e) => theme("heroDescription", e.target.value)}
          />
        </Field>

        <SectionTitle
          title="Categories"
          hint="Keys are stored in entries. Update entries before removing a key they use."
        />
        <div className="flex flex-col gap-3">
          {config.categories.map((category, index) => (
            <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1.5fr_6rem_auto]">
              {(["key", "label", "color"] as const).map((key) => (
                <Field key={key} label={key[0].toUpperCase() + key.slice(1)}>
                  <Input
                    required
                    type={key === "color" ? "color" : "text"}
                    className={key === "color" ? "cursor-pointer p-1" : undefined}
                    value={category[key]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        categories: config.categories.map((c, i) =>
                          i === index ? { ...c, [key]: e.target.value } : c,
                        ),
                      })
                    }
                  />
                </Field>
              ))}
              <Button
                variant="outline"
                type="button"
                disabled={config.categories.length === 1}
                onClick={() =>
                  setConfig({
                    ...config,
                    categories: config.categories.filter((_, i) => i !== index),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            type="button"
            className="self-start"
            onClick={() =>
              setConfig({
                ...config,
                categories: [...config.categories, { key: "", label: "", color: "#425f88" }],
              })
            }
          >
            + Add category
          </Button>
        </div>

        <SectionTitle title="Statuses and severities" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Statuses (comma-separated)">
            <Input
              required
              value={config.statuses.join(",")}
              onChange={(e) =>
                setConfig({ ...config, statuses: e.target.value.split(",").map((v) => v.trim()) })
              }
            />
          </Field>
          <Field label="Severities (comma-separated)">
            <Input
              required
              value={config.severities.join(",")}
              onChange={(e) =>
                setConfig({ ...config, severities: e.target.value.split(",").map((v) => v.trim()) })
              }
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={config.features.quotes}
            onChange={(e) => setConfig({ ...config, features: { quotes: e.target.checked } })}
          />
          Display quotes publicly
        </label>
        <Button className="self-start" type="submit" disabled={busy}>
          {saveTimeline.isPending && <Spinner aria-label="Saving timeline" />} Save timeline
        </Button>
      </form>

      {id && (
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-red-700">Delete timeline</h2>
          <p className="text-sm text-slate-600">
            This permanently removes the timeline and all its entries. Type{" "}
            <strong>{timeline.slug}</strong> to confirm.
          </p>
          <Field label="Confirmation" className="sm:max-w-xs">
            <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </Field>
          <Button
            variant="destructive"
            className="self-start"
            disabled={busy || confirmation !== timeline.slug}
            onClick={() => void remove()}
          >
            {deleteTimeline.isPending && <Spinner aria-label="Deleting timeline" />} Delete
            permanently
          </Button>
        </section>
      )}
    </>
  );
}
