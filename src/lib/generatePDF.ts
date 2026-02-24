import type { ClientFile, Project } from "@/data/mockData";

const NAVY = [15, 25, 45] as [number, number, number];
const GRAY_LABEL = [80, 80, 80] as [number, number, number];
const GRAY_FOOTER = [100, 100, 100] as [number, number, number];
const FOOTER_HEIGHT = 28;
const MARGIN = 44;
const LINE_HEIGHT = 14;
const SECTION_GAP = 20;

export type GenerateFilePDFOptions = {
  projectIds?: string[];
  businessName?: string;
};

export async function generateFilePDF(
  file: ClientFile,
  options?: GenerateFilePDFOptions
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ format: "a4", unit: "pt" });
  const pageWidth = doc.getPageWidth(1);
  const pageHeight = doc.getPageHeight(1);
  let y = MARGIN;

  const businessName = options?.businessName?.trim() || "Lunex.com";
  const today = new Date().toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const projectsToInclude: Project[] = options?.projectIds?.length
    ? file.projects.filter((p) => options.projectIds!.includes(p.id))
    : file.projects;

  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, pageHeight - FOOTER_HEIGHT, pageWidth - MARGIN, pageHeight - FOOTER_HEIGHT);
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_FOOTER);
    doc.setFont("helvetica", "normal");
    doc.text("Shared securely via Lunex — lunexweb.com", MARGIN, pageHeight - 14);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - MARGIN - 50, pageHeight - 14);
    doc.setTextColor(0, 0, 0);
  };

  // Brand header bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated on ${today}`, pageWidth - MARGIN - doc.getTextWidth(`Generated on ${today}`), 24);
  y = 36 + SECTION_GAP;

  // Client / file section – professional card style (height known in advance)
  const fileRows = 1 + (file.reference ? 1 : 0) + (file.phone ? 1 : 0) + (file.email ? 1 : 0); // Type + optional
  const fileBlockH = 28 + fileRows * LINE_HEIGHT + 16;
  const fileBlockStart = y;
  doc.setFillColor(248, 248, 250);
  doc.rect(MARGIN, fileBlockStart, pageWidth - 2 * MARGIN, fileBlockH, "F");
  doc.setDrawColor(230, 230, 232);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, fileBlockStart, pageWidth - 2 * MARGIN, fileBlockH, "S");

  y = fileBlockStart + 20;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(file.name, MARGIN + 10, y);
  y += 28;

  const labelValue = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_LABEL);
    doc.text(`${label}`, MARGIN + 10, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(value, MARGIN + 86, y + 4);
    y += LINE_HEIGHT;
  };

  labelValue("Type", file.type);
  if (file.reference) labelValue("Reference", file.reference);
  if (file.phone) labelValue("Phone", file.phone);
  if (file.email) labelValue("Email", file.email);

  y = fileBlockStart + fileBlockH + SECTION_GAP;

  let pageNum = 1;

  for (const project of projectsToInclude) {
    if (y > pageHeight - MARGIN - FOOTER_HEIGHT - 80) {
      doc.addPage();
      pageNum++;
      y = MARGIN;
    }

    // Project section heading with underline
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(project.name, MARGIN, y + 4);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_LABEL);
    doc.text(`${project.projectNumber || project.id}  ·  ${project.status}`, MARGIN, y + 4);
    y += 22;

    if (project.fields.length > 0) {
      const tableData = project.fields.map((f) => [f.name, f.value || "—"]);
      autoTable(doc, {
        startY: y,
        head: [["Field", "Value"]],
        body: tableData,
        margin: { left: MARGIN, right: MARGIN },
        theme: "striped",
        styles: {
          fontSize: 10,
          cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
        },
        headStyles: {
          fillColor: NAVY,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          cellPadding: { top: 10, right: 10, bottom: 10, left: 10 },
        },
        columnStyles: {
          0: { cellWidth: "auto", textColor: GRAY_LABEL },
          1: { cellWidth: "auto", fontStyle: "normal" },
        },
        alternateRowStyles: { fillColor: [252, 252, 253] },
      });
      y = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + SECTION_GAP;
    }

    if (project.folders.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Folders", MARGIN, y + 4);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      for (const folder of project.folders) {
        doc.text(`  •  ${folder.name}  —  ${folder.files.length} file${folder.files.length !== 1 ? "s" : ""}`, MARGIN, y + 4);
        y += LINE_HEIGHT;
      }
      y += 10;
    }

    const notesText =
      project.noteEntries?.length &&
      project.noteEntries.some((e) => (e.content || "").replace(/<[^>]+>/g, "").trim())
        ? project.noteEntries
            .map((e) => (e.content || "").replace(/<[^>]+>/g, " ").trim())
            .filter(Boolean)
            .join(" ")
        : project.notes?.trim();
    if (notesText) {
      if (y > pageHeight - MARGIN - FOOTER_HEIGHT - 60) {
        doc.addPage();
        pageNum++;
        y = MARGIN;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Notes", MARGIN, y + 4);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(notesText, pageWidth - 2 * MARGIN - 8);
      doc.text(splitNotes, MARGIN + 4, y);
      y += splitNotes.length * (LINE_HEIGHT - 2) + SECTION_GAP;
    } else {
      y += 8;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(p, totalPages);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`lunex-${safeName}-${dateStr}.pdf`);
}
