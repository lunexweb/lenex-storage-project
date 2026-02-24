import { useState, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { X, Upload, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { useSettings } from "@/context/SettingsContext";
import { getNextReference } from "@/lib/referenceUtils";
import type { ClientFile, Project, Field } from "@/data/mockData";

type Step = 1 | 2 | 3 | 4 | 5;

interface ImportCSVModalProps {
  onClose: () => void;
}

interface ColumnMapping {
  spreadsheetCol: string;
  fieldName: string;
  skipped: boolean;
}

export default function ImportCSVModal({ onClose }: ImportCSVModalProps) {
  const navigate = useNavigate();
  const { files, templates, addFile, addProject, addField, nextProjectId } = useData();
  const { profile } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [nameColumn, setNameColumn] = useState("");
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [groupByClient, setGroupByClient] = useState(true);
  const [projectNameColumn, setProjectNameColumn] = useState<string>("");
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, clientName: "" });
  const [importDone, setImportDone] = useState(false);
  const [filesCreated, setFilesCreated] = useState(0);
  const [expandedPreview, setExpandedPreview] = useState<number | null>(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const formatExample = profile.referenceFormatExample?.trim() || "REF-001";
  const existingRefs = useMemo(
    () => files.map((f) => f.reference).filter(Boolean) as string[],
    [files]
  );

  const parseFile = async (file: File) => {
    setError("");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          setError("Could not read file");
          return;
        }
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
          raw: false,
        }) as unknown[][];
        if (!json.length) {
          setError("No rows found in the file");
          return;
        }
        const headerRow = (json[0] ?? []).map((c) => String(c ?? "").trim()).filter(Boolean);
        if (headerRow.length === 0) {
          setError("No column headers found");
          return;
        }
        const dataRows = json.slice(1).filter((row) => {
          const cells = (row ?? []) as unknown[];
          return cells.some((c) => String(c ?? "").trim() !== "");
        });
        const rowsAsObjects: Record<string, string>[] = dataRows.map((row) => {
          const arr = (row ?? []) as unknown[];
          const obj: Record<string, string> = {};
          headerRow.forEach((h, i) => {
            const val = arr[i];
            obj[h] = val === null || val === undefined ? "" : String(val).trim();
          });
          return obj;
        });
        setHeaders(headerRow);
        setRows(rowsAsObjects);
        setNameColumn(headerRow[0] ?? "");
        const template = templates.find((t) => t.id === selectedTemplateId);
        const defaultField = template?.fields?.[0] ?? "";
        setColumnMappings(
          headerRow.map((col) => ({
            spreadsheetCol: col,
            fieldName: defaultField,
            skipped: false,
          }))
        );
        setProjectNameColumn("");
        setStep(3);
      } catch (err) {
        if (
          err &&
          typeof (err as { code?: string }).code === "string" &&
          (err as { code: string }).code === "MODULE_NOT_FOUND"
        ) {
          setError("CSV import requires the xlsx package. Run: npm install xlsx");
        } else {
          setError("Invalid file. Please use a valid CSV or Excel file.");
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const file = fileList[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (![".csv", ".xlsx", ".xls"].some((e) => file.name.toLowerCase().endsWith(e))) {
      setError("Please select a .csv, .xlsx, or .xls file.");
      return;
    }
    setSelectedFile(file);
    parseFile(file);
  };

  const updateFieldName = (spreadsheetCol: string, fieldName: string) => {
    setColumnMappings((prev) =>
      prev.map((m) => (m.spreadsheetCol === spreadsheetCol ? { ...m, fieldName } : m))
    );
  };

  const toggleSkip = (spreadsheetCol: string) => {
    setColumnMappings((prev) =>
      prev.map((m) =>
        m.spreadsheetCol === spreadsheetCol ? { ...m, skipped: !m.skipped } : m
      )
    );
  };

  const fieldColumns = useMemo(() => {
    return columnMappings.filter(
      (m) => !m.skipped && m.spreadsheetCol !== nameColumn && m.fieldName.trim() !== ""
    );
  }, [columnMappings, nameColumn]);

  const previewData = useMemo(() => {
    if (!nameColumn || rows.length === 0) return [];
    if (groupByClient) {
      const byName = new Map<string, Record<string, string>[]>();
      for (const row of rows) {
        const name = row[nameColumn]?.trim() ?? "";
        if (!name) continue;
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name)!.push(row);
      }
      return Array.from(byName.entries()).map(([clientName, projectRows]) => ({
        clientName,
        projects: projectRows.map((row, i) => ({
          rowIndex: i,
          row,
          projectName: projectNameColumn
            ? (row[projectNameColumn]?.trim() ? `Row imported ${row[projectNameColumn].trim()}` : `Imported Record ${i + 1}`)
            : `Imported Record ${i + 1}`,
          fields: fieldColumns.map((m) => ({
            name: m.fieldName,
            value: row[m.spreadsheetCol] ?? "",
          })),
        })),
      }));
    }
    return rows
      .filter((row) => (row[nameColumn]?.trim() ?? "") !== "")
      .map((row, i) => ({
        clientName: row[nameColumn]?.trim() ?? "",
        projects: [
          {
            rowIndex: i,
            row,
            projectName: projectNameColumn
              ? (row[projectNameColumn]?.trim() ? `Row imported ${row[projectNameColumn].trim()}` : `Imported Record ${i + 1}`)
              : `Imported Record ${i + 1}`,
            fields: fieldColumns.map((m) => ({
              name: m.fieldName,
              value: row[m.spreadsheetCol] ?? "",
            })),
          },
        ],
      }));
  }, [nameColumn, rows, groupByClient, fieldColumns, projectNameColumn]);

  const totalFiles = previewData.length;
  const totalProjects = previewData.reduce((sum, f) => sum + f.projects.length, 0);

  const runImport = async () => {
    if (!selectedTemplate) return;
    setStep(5);
    setImportDone(false);
    setError("");
    const refsAccum = [...existingRefs];
    let fileCount = 0;
    const total = previewData.length;

    for (let i = 0; i < previewData.length; i++) {
      const { clientName, projects: projectRows } = previewData[i];
      setImportProgress({ current: i + 1, total, clientName });

      const reference = getNextReference(refsAccum, formatExample);
      refsAccum.push(reference);

      const newFile: ClientFile = {
        id: "", // DB will assign; we use the returned id
        name: clientName,
        type: "Individual",
        reference,
        dateCreated: new Date().toLocaleDateString("en-ZA", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        lastUpdated: "Just now",
        projects: [],
      };
      const insertedFileId = await addFile(newFile);
      if (!insertedFileId) {
        setError(`Failed to create file "${clientName}". Import stopped.`);
        setImportDone(true);
        return;
      }
      fileCount++;

      for (let p = 0; p < projectRows.length; p++) {
        const proj = projectRows[p];
        const projectId = nextProjectId();
        const newProject: Project = {
          id: projectId,
          projectNumber: projectId,
          name: proj.projectName,
          status: "Live",
          dateCreated: new Date().toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          fields: [],
          folders: selectedTemplate.folders.map((fo, fi) => ({
            id: `fo-${Date.now()}-${i}-${p}-${fi}`,
            name: fo.name,
            type: fo.type,
            files: [],
          })),
          notes: "",
          noteEntries: [],
        };
        await addProject(insertedFileId, newProject);

        for (const f of proj.fields) {
          const field: Field = {
            id: "",
            name: f.name,
            value: f.value ?? "",
          };
          await addField(insertedFileId, projectId, field);
        }
      }
    }

    setFilesCreated(fileCount);
    setImportDone(true);
  };

  const handleViewFiles = () => {
    onClose();
    navigate("/files");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-foreground text-lg">Import CSV / Excel</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {step} of 5 — {step === 1 && "Choose template"}
              {step === 2 && "Upload file"}
              {step === 3 && "Map columns"}
              {step === 4 && "Preview & import"}
              {step === 5 && "Done"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 hover:bg-muted rounded"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Step 1 — Choose template (required) */}
          {step === 1 && (
            <>
              {templates.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-6 text-center">
                  <p className="font-semibold text-foreground mb-2">You need a template before you can import</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    A template defines which fields your imported data will have (e.g. ID Number, Tax Ref, Address). Create your first template, then come back here to connect your CSV or Excel file to it.
                  </p>
                  <Button asChild variant="default" size="lg" className="bg-primary text-primary-foreground">
                    <Link to="/templates" onClick={onClose}>
                      Create a template
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your CSV or Excel file will be <strong className="text-foreground">connected to</strong> the template you choose. In the next step you’ll map each spreadsheet column to one of the template’s fields.
                  </p>
                  <label className="text-sm font-medium text-foreground block mb-2">Choose a template</label>
                  <select
                    value={selectedTemplateId ?? ""}
                    onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                    className="w-full max-w-md px-4 py-3 rounded-lg border border-input bg-background text-foreground text-sm"
                  >
                    <option value="">— Select a template —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.fields?.length ? ` (${t.fields.length} fields)` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Fields in this template: {selectedTemplate.fields?.length ? selectedTemplate.fields.join(", ") : "None"}
                    </p>
                  )}
                  <Button
                    className="mt-6 w-full max-w-md bg-primary text-primary-foreground hover:bg-primary/90"
                    size="lg"
                    onClick={() => setStep(2)}
                    disabled={!selectedTemplateId}
                  >
                    Next: Upload your file
                  </Button>
                </>
              )}
            </>
          )}

          {/* Step 2 — Upload file */}
          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Upload the CSV or Excel file you want to import. It will be connected to <strong className="text-foreground">{selectedTemplate?.name ?? "your chosen template"}</strong>.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  handleFileSelect(e.target.files);
                  e.target.value = "";
                }}
              />
              <div
                className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileSelect(e.dataTransfer.files);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-foreground font-medium mb-1">
                  Drop your CSV or Excel file here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">Accept .csv, .xlsx, .xls only</p>
              </div>
              {error && <p className="text-sm text-destructive mt-4 text-center">{error}</p>}
              <Button variant="outline" className="mt-4" onClick={() => setStep(1)}>
                Back to template
              </Button>
            </>
          )}

          {/* Step 3 — Map columns to template fields */}
          {step === 3 && selectedTemplate && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Map each column from your file to a field in <strong className="text-foreground">{selectedTemplate.name}</strong>. Choose “Don’t import” to skip a column.
              </p>
              <div className="border border-border rounded-lg overflow-x-auto mb-4">
                <table className="w-full text-sm min-w-[280px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left px-4 py-3 font-semibold text-foreground">
                        Your spreadsheet column
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">
                        Template field (in {selectedTemplate.name})
                      </th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-muted/20 border-b border-border">
                      <td className="px-4 py-3 text-foreground font-medium">
                        Which column contains the client name?
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={nameColumn}
                          onChange={(e) => setNameColumn(e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
                        >
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td />
                    </tr>
                    {columnMappings.map((m) => (
                      <tr
                        key={m.spreadsheetCol}
                        className={`border-b border-border last:border-0 ${m.skipped ? "opacity-50 bg-muted/20" : ""}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {m.spreadsheetCol}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={m.skipped ? "" : m.fieldName}
                            onChange={(e) => {
                              const v = e.target.value;
                              setColumnMappings((prev) =>
                                prev.map((x) =>
                                  x.spreadsheetCol === m.spreadsheetCol
                                    ? { ...x, fieldName: v, skipped: v === "" }
                                    : x
                                )
                              );
                            }}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm disabled:opacity-60"
                          >
                            <option value="">— Don’t import</option>
                            {selectedTemplate.fields.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleSkip(m.spreadsheetCol)}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                          >
                            {m.skipped ? "Include" : "Skip"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByClient}
                    onChange={(e) => setGroupByClient(e.target.checked)}
                    className="rounded border-input"
                  />
                  <span className="text-sm text-foreground">
                    One client file per client name (separate projects)
                  </span>
                </label>
              </div>

              <div className="mb-4">
                <label className="text-sm text-muted-foreground block mb-1">
                  Project name column (optional)
                </label>
                <select
                  value={projectNameColumn}
                  onChange={(e) => setProjectNameColumn(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
                >
                  <option value="">Automatic: Imported Record 1, 2, 3…</option>
                  {headers.filter((h) => h !== nameColumn).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                This will create {totalFiles} client file(s) and {totalProjects} project(s).
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back to file
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                  onClick={() => setStep(4)}
                  disabled={totalFiles === 0}
                >
                  Preview import
                </Button>
              </div>
            </>
          )}

          {/* Step 4 — Preview */}
          {step === 4 && (
            <>
              <div className="space-y-3 mb-4">
                {previewData.slice(0, 3).map((filePreview, idx) => (
                  <div
                    key={idx}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 text-left"
                      onClick={() =>
                        setExpandedPreview(expandedPreview === idx ? null : idx)
                      }
                    >
                      {expandedPreview === idx ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-foreground">
                        File: {filePreview.clientName} — Individual
                      </span>
                    </button>
                    {expandedPreview === idx && (
                      <div className="px-4 pb-4 pt-0 space-y-4">
                        {filePreview.projects.map((proj, pidx) => (
                          <div key={pidx} className="pl-4 border-l-2 border-border">
                            <p className="font-medium text-foreground text-sm mb-2">
                              Project {pidx + 1}: {proj.projectName}
                            </p>
                            <div className="space-y-1 text-sm">
                              {proj.fields.map((f, fidx) => (
                                <div key={fidx} className="text-muted-foreground">
                                  <span className="text-foreground">{f.name}:</span> {f.value || "—"}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Showing {Math.min(3, previewData.length)} of {totalFiles} files. All {totalFiles}{" "}
                file(s) will be created on import.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Back to mapping
                </Button>
                <Button variant="gold" onClick={runImport}>
                  Confirm import
                </Button>
              </div>
            </>
          )}

          {/* Step 5 — Import progress / success */}
          {step === 5 && (
            <>
              {!importDone ? (
                <div className="py-8 text-center">
                  <div className="w-full max-w-md mx-auto mb-6 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-foreground font-medium">
                    Creating file {importProgress.current} of {importProgress.total} —{" "}
                    {importProgress.clientName}
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {filesCreated} client file(s) created successfully
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Each file contains all their projects and fields exactly as previewed. You can
                    rename any field by clicking the edit icon on the field row in the project
                    page.
                  </p>
                  <Button variant="gold" size="lg" onClick={handleViewFiles}>
                    View Your Files
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
