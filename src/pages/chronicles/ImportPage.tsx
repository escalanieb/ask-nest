import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useChroniclesMutations, useTimeline } from "../../hooks/useChronicles";
import { ChroniclesApiError, chroniclesApi, downloadTemplate } from "../../services/chroniclesApi";
import type { ImportPreview } from "../../types/chronicles";
import {
  Field,
  FormError,
  FormSkeleton,
  PageHeader,
  TimelineTabs,
  panelClass,
  selectClass,
} from "../../components/chronicles/parts";

export default function ImportPage() {
  const { id = "" } = useParams();
  const timeline = useTimeline(id);
  const { entriesChanged } = useChroniclesMutations();
  const [file, setFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState("append");
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<ImportPreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mode, setMode] = useState<"preview" | "commit" | "">("");

  async function run(next: "preview" | "commit") {
    if (!file) return;
    setMode(next);
    setBusy(true);
    setError("");
    try {
      const response = await chroniclesApi.importWorkbook(id, {
        file,
        mode: next,
        strategy,
        confirmation,
      });
      setResult(response);
      if (next === "commit") {
        toast.success(`Imported ${response.created ?? response.wouldCreate} entries`);
        void entriesChanged(id);
      }
    } catch (err) {
      // Row-level validation failures come back as a preview with errors to show.
      if (err instanceof ChroniclesApiError && Array.isArray(err.details.errors))
        setResult(err.details as unknown as ImportPreview);
      else {
        setError((err as Error).message);
        setResult(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function template() {
    setDownloading(true);
    try {
      await downloadTemplate(id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  if (timeline.isLoading) return <FormSkeleton label="Preparing Excel import" />;

  return (
    <>
      <PageHeader
        eyebrow={timeline.data?.name}
        title="Import from Excel"
        subtitle="Download this timeline’s template, fill the Entries sheet, and preview every row before importing."
      />
      <TimelineTabs id={id} />
      <section className={cn(panelClass, "flex flex-col gap-5 p-6")}>
        <FormError>{error || (timeline.error ? (timeline.error as Error).message : "")}</FormError>
        <Button
          variant="outline"
          className="self-start"
          disabled={!timeline.data || busy || downloading}
          onClick={() => void template()}
        >
          {downloading && <Spinner aria-label="Downloading template" />} Download Excel template
        </Button>
        <Field label="Workbook (.xlsx)">
          <Input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError("");
            }}
          />
        </Field>
        <Field label="Import strategy" className="sm:max-w-sm">
          <select
            className={selectClass}
            value={strategy}
            onChange={(e) => {
              setStrategy(e.target.value);
              setResult(null);
            }}
          >
            <option value="append">Append to existing entries</option>
            <option value="replace">Replace all existing entries</option>
          </select>
        </Field>
        <Button
          variant="outline"
          className="self-start"
          disabled={!file || busy}
          onClick={() => void run("preview")}
        >
          {busy && mode === "preview" && <Spinner aria-label="Previewing workbook" />} Preview
          workbook
        </Button>

        {result && (
          <div aria-live="polite" className="flex flex-col gap-4 border-t border-slate-200 pt-5">
            <h2 className="text-base font-semibold text-slate-900">
              {result.created !== undefined
                ? `Imported ${result.created} entries`
                : `${result.wouldCreate} valid of ${result.totalRows} rows`}
            </h2>
            {result.errors.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Excel row</TableHead>
                      <TableHead>Column</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.flatMap((r) =>
                      Object.entries(r.columns).map(([column, messages]) => (
                        <TableRow key={`${r.row}-${column}`}>
                          <TableCell>{r.row}</TableCell>
                          <TableCell>{column}</TableCell>
                          <TableCell className="whitespace-normal">{messages.join(" ")}</TableCell>
                        </TableRow>
                      )),
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              result.created === undefined && (
                <>
                  <p className="text-sm text-slate-600">
                    Preview passed. Commit will revalidate the same workbook.
                  </p>
                  {strategy === "replace" && (
                    <Field
                      label={`Replace deletes all current entries. Type ${timeline.data?.slug} to confirm.`}
                      className="text-red-700 sm:max-w-sm"
                    >
                      <Input
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                      />
                    </Field>
                  )}
                  <Button
                    className="self-start"
                    disabled={
                      busy || (strategy === "replace" && confirmation !== timeline.data?.slug)
                    }
                    onClick={() => void run("commit")}
                  >
                    {busy && mode === "commit" && <Spinner aria-label="Importing workbook" />}{" "}
                    Confirm {strategy} import
                  </Button>
                </>
              )
            )}
          </div>
        )}
      </section>
    </>
  );
}
