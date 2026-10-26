import { useState } from "react";
import { createRoot } from "react-dom/client";
import ImportColumnsStep from "../../src/pages/datasets/imports/ImportColumnsStep";
import { configurationForFile } from "../../src/lib/guidedImport";
import "../../src/index.css";

const inspection = {
  sheet: "Synthetic",
  sheets: ["Synthetic"],
  header_row: 1,
  row_count: 1,
  columns: [
    "Reference",
    "Full Name",
    "Residence",
    ...Array.from({ length: 24 }, (_, i) => `Additional field ${i + 1}`),
  ].map((source) => ({
    source,
    samples: ["Synthetic sample"],
    values: ["Synthetic sample"],
    has_more: false,
  })),
};
function ComponentCheck() {
  const [config, setConfig] = useState(() => configurationForFile(inspection, "synthetic.csv"));
  return (
    <div data-testid="component-scroll" className="h-screen overflow-y-auto bg-slate-50 p-4">
      <h1 className="mb-5 text-xl font-semibold">Import component check</h1>
      <ImportColumnsStep config={config} inspection={inspection} onChange={setConfig} />
      <p className="py-6" data-testid="component-end">
        Component check complete
      </p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<ComponentCheck />);
