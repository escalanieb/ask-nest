import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { chroniclesApi } from "../../services/chroniclesApi";
import { useChroniclesMutations } from "../../hooks/useChronicles";
import type { ChroniclesEntry, ChroniclesTimeline } from "../../types/chronicles";
import { Field, FormError, SectionTitle, selectClass } from "./parts";

type TextKey = "date" | "dateLabel" | "time" | "title";

export default function EntryForm({
  timeline,
  entry,
  onSaved,
  onCancel,
}: {
  timeline: ChroniclesTimeline;
  entry: ChroniclesEntry | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { saveEntry } = useChroniclesMutations();
  const [data, setData] = useState<ChroniclesEntry>(
    entry || {
      id: "",
      date: "",
      dateLabel: "",
      title: "",
      shortSummary: "",
      whatHappened: "",
      peopleInvolved: [{ name: "", role: "" }],
      sourceUsed: [{ label: "", url: "" }],
      quotes: [],
      issueCategory: timeline.config.categories[0].key,
      impact: "",
      status: timeline.config.statuses[0],
      tags: [],
      isFeatured: false,
    },
  );
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const busy = saveEntry.isPending || uploading;

  function field(key: string, value: unknown) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await saveEntry.mutateAsync({ timelineId: timeline.id, entryId: entry?.id, data });
      toast.success(entry ? "Entry saved" : "Entry created");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const result = await chroniclesApi.uploadImage(timeline.id, file);
      field("imageUrl", result.path);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const textLabels: Record<TextKey, string> = {
    date: "Date",
    dateLabel: "Date label (optional)",
    time: "Time (optional)",
    title: "Title",
  };

  return (
    <form id="entry-form" className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
        <FormError>{error}</FormError>

        <SectionTitle title="Basics" hint="When it happened and what it is called." />
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(textLabels) as TextKey[]).map((key) => (
            <Field key={key} label={textLabels[key]}>
              <Input
                required={key === "date" || key === "title"}
                type={key === "date" ? "date" : "text"}
                value={data[key] || ""}
                onChange={(e) => field(key, e.target.value)}
              />
            </Field>
          ))}
        </div>

        <SectionTitle title="Content" hint="Keep it factual and neutral." />
        {(["shortSummary", "whatHappened", "impact"] as const).map((key) => (
          <Field
            key={key}
            label={
              { shortSummary: "Short summary", whatHappened: "What happened", impact: "Impact" }[
                key
              ]
            }
          >
            <Textarea
              required
              rows={key === "whatHappened" ? 6 : 3}
              value={data[key]}
              onChange={(e) => field(key, e.target.value)}
            />
          </Field>
        ))}

        <SectionTitle
          title="Classification"
          hint="Controls colours and filters on the public timeline."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category">
            <select
              className={selectClass}
              value={data.issueCategory}
              onChange={(e) => field("issueCategory", e.target.value)}
            >
              {timeline.config.categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className={selectClass}
              value={data.status || ""}
              onChange={(e) => field("status", e.target.value)}
            >
              {timeline.config.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Severity">
            <select
              className={selectClass}
              value={data.severity || ""}
              onChange={(e) => field("severity", e.target.value || null)}
            >
              <option value="">None</option>
              {timeline.config.severities.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <SectionTitle
          title="People and sources"
          hint="Who was involved and where the facts come from."
        />
        <ObjectRows
          title="People involved"
          fields={["name", "role", "affiliation"]}
          rows={data.peopleInvolved}
          onChange={(rows) => field("peopleInvolved", rows)}
        />
        <ObjectRows
          title="Sources"
          fields={["label", "url", "publisher", "publishedAt"]}
          rows={data.sourceUsed}
          onChange={(rows) => field("sourceUsed", rows)}
        />
        <ObjectRows
          title="Quotes"
          fields={["speaker", "text"]}
          rows={data.quotes || []}
          onChange={(rows) => field("quotes", rows)}
        />

        <SectionTitle
          title="Media and extras"
          hint="Optional image, video, tags and highlighting."
        />
        <Field label="Image URL or uploaded path">
          <Input value={data.imageUrl || ""} onChange={(e) => field("imageUrl", e.target.value)} />
        </Field>
        <Field label="Upload image (JPEG, PNG, GIF, WebP; 10 MB maximum)">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.[0]) void upload(e.target.files[0]);
            }}
          />
        </Field>
        {uploading && <Spinner aria-label="Uploading image" />}
        <Field label="YouTube URL">
          <Input
            type="url"
            value={data.youtubeUrl || ""}
            onChange={(e) => field("youtubeUrl", e.target.value)}
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <Input
            defaultValue={data.tags?.join(", ") || ""}
            onChange={(e) =>
              field(
                "tags",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={!!data.isFeatured}
            onChange={(e) => field("isFeatured", e.target.checked)}
          />
          Featured entry
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Spinner aria-label={uploading ? "Uploading image" : "Saving entry"} />} Save
          entry
        </Button>
      </div>
    </form>
  );
}

function ObjectRows({
  title,
  fields,
  rows,
  onChange,
}: {
  title: string;
  fields: string[];
  rows: object[];
  onChange: (rows: Record<string, string>[]) => void;
}) {
  const values = rows as Record<string, string>[];
  const update = (index: number, key: string, value: string) =>
    onChange(values.map((r, j) => (index === j ? { ...r, [key]: value } : r)));
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-700">{title}</legend>
      {values.map((row, index) => (
        <div
          key={index}
          className="grid items-end gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))_auto]"
        >
          {fields.map((name, i) => (
            <Field key={name} label={`${name}${i > 1 ? " (optional)" : ""}`}>
              {name === "text" ? (
                <Textarea
                  required
                  value={row[name] || ""}
                  onChange={(e) => update(index, name, e.target.value)}
                />
              ) : (
                <Input
                  required={i < 2 && name !== "url"}
                  value={row[name] || ""}
                  onChange={(e) => update(index, name, e.target.value)}
                />
              )}
            </Field>
          ))}
          <Button
            variant="outline"
            type="button"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        type="button"
        className="self-start"
        onClick={() => onChange([...values, Object.fromEntries(fields.map((f) => [f, ""]))])}
      >
        + Add {title.toLowerCase()}
      </Button>
    </fieldset>
  );
}
