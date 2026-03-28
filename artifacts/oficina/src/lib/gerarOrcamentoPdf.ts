import jsPDF from "jspdf";

export interface OrcamentoPdfData {
  numero: string;
  dataEntrada: string;
  dataPrevisao?: string;
  clienteNome: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  veiculoMarca: string;
  veiculoModelo: string;
  veiculoPlaca: string;
  veiculoAno?: number;
  veiculoKm?: number;
  responsavel: string;
  servicos: { nome: string; valor: number }[];
  pecas: { nome: string; quantidade: number; valorUnitario: number }[];
  observacoes?: string;
  totalServicos: number;
  totalPecas: number;
  total: number;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

const COR_PRIMARIA = [37, 99, 235] as const;   // blue-600
const COR_ESCURO   = [15, 23, 42]  as const;   // slate-900
const COR_CINZA    = [100, 116, 139] as const; // slate-500
const COR_CLARO    = [241, 245, 249] as const; // slate-100
const COR_BRANCO   = [255, 255, 255] as const;

export function gerarOrcamentoPdf(data: OrcamentoPdfData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210; // page width
  const ml = 15;  // margin left
  const mr = 15;  // margin right
  const cw = pw - ml - mr; // content width
  let y = 0;

  // ── HEADER BAR ──────────────────────────────────────────────────────────
  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, pw, 38, "F");

  // Logo placeholder (circle)
  doc.setFillColor(...COR_BRANCO);
  doc.circle(ml + 8, 19, 8, "F");
  doc.setFillColor(...COR_PRIMARIA);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_PRIMARIA);
  doc.text("OP", ml + 4.5, 20.5);

  // Workshop name
  doc.setTextColor(...COR_BRANCO);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Oficina Pro", ml + 20, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Gestão Automotiva", ml + 20, 22.5);

  // OS Info (top right)
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`ORÇAMENTO`, pw - mr, 16, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº ${data.numero}`, pw - mr, 23, { align: "right" });
  doc.text(
    `Emitido: ${formatDateBR(data.dataEntrada)}`,
    pw - mr,
    29,
    { align: "right" }
  );
  if (data.dataPrevisao) {
    doc.text(`Prev. entrega: ${formatDateBR(data.dataPrevisao)}`, pw - mr, 35, { align: "right" });
  }

  y = 46;

  // ── INFO SECTION ────────────────────────────────────────────────────────
  const halfW = (cw - 6) / 2;

  // Cliente card
  doc.setFillColor(...COR_CLARO);
  doc.roundedRect(ml, y, halfW, 38, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_PRIMARIA);
  doc.text("CLIENTE", ml + 5, y + 7);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_ESCURO);
  doc.text(data.clienteNome, ml + 5, y + 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COR_CINZA);
  let cy = y + 20;
  if (data.clienteTelefone) { doc.text(`Tel: ${data.clienteTelefone}`, ml + 5, cy); cy += 6; }
  if (data.clienteEmail)    { doc.text(data.clienteEmail, ml + 5, cy); }

  // Veículo card
  const vx = ml + halfW + 6;
  doc.setFillColor(...COR_CLARO);
  doc.roundedRect(vx, y, halfW, 38, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_PRIMARIA);
  doc.text("VEÍCULO", vx + 5, y + 7);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_ESCURO);
  doc.text(`${data.veiculoMarca} ${data.veiculoModelo}`, vx + 5, y + 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COR_CINZA);
  doc.text(`Placa: ${data.veiculoPlaca}`, vx + 5, y + 20);
  if (data.veiculoAno) doc.text(`Ano: ${data.veiculoAno}`, vx + 5, y + 26);
  if (data.veiculoKm)  doc.text(`KM: ${data.veiculoKm.toLocaleString("pt-BR")}`, vx + 5, y + 32);

  y += 45;

  // ── SERVICES TABLE ───────────────────────────────────────────────────────
  function drawSectionHeader(label: string) {
    doc.setFillColor(...COR_PRIMARIA);
    doc.roundedRect(ml, y, cw, 8, 1, 1, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COR_BRANCO);
    doc.text(label, ml + 4, y + 5.5);
    y += 10;
  }

  function drawTableHeader(cols: { label: string; x: number; w: number; align?: "right" | "left" }[]) {
    doc.setFillColor(226, 232, 240); // slate-200
    doc.rect(ml, y, cw, 7, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COR_CINZA);
    for (const col of cols) {
      if (col.align === "right") {
        doc.text(col.label, ml + col.x + col.w, y + 5, { align: "right" });
      } else {
        doc.text(col.label, ml + col.x + 2, y + 5);
      }
    }
    y += 7;
  }

  function drawTableRow(
    cols: { value: string; x: number; w: number; align?: "right" | "left"; bold?: boolean }[],
    shade: boolean
  ) {
    if (shade) {
      doc.setFillColor(248, 250, 252);
      doc.rect(ml, y, cw, 7, "F");
    }
    doc.setFontSize(9);
    doc.setTextColor(...COR_ESCURO);
    for (const col of cols) {
      doc.setFont("helvetica", col.bold ? "bold" : "normal");
      if (col.align === "right") {
        doc.text(col.value, ml + col.x + col.w, y + 5.2, { align: "right" });
      } else {
        doc.text(col.value, ml + col.x + 2, y + 5.2);
      }
    }
    y += 7;
  }

  // Serviços
  if (data.servicos.length > 0) {
    drawSectionHeader("SERVIÇOS");
    drawTableHeader([
      { label: "DESCRIÇÃO", x: 0, w: 128 },
      { label: "VALOR", x: 128, w: 52, align: "right" },
    ]);
    data.servicos.forEach((s, i) => {
      drawTableRow(
        [
          { value: s.nome, x: 0, w: 128 },
          { value: formatBRL(s.valor), x: 128, w: 52, align: "right" },
        ],
        i % 2 === 1
      );
    });
    y += 2;
  }

  // Peças
  if (data.pecas.length > 0) {
    drawSectionHeader("PEÇAS / MATERIAIS");
    drawTableHeader([
      { label: "ITEM", x: 0, w: 90 },
      { label: "QTD", x: 90, w: 20, align: "right" },
      { label: "UNIT.", x: 110, w: 30, align: "right" },
      { label: "TOTAL", x: 140, w: 40, align: "right" },
    ]);
    data.pecas.forEach((p, i) => {
      drawTableRow(
        [
          { value: p.nome, x: 0, w: 90 },
          { value: String(p.quantidade), x: 90, w: 20, align: "right" },
          { value: formatBRL(p.valorUnitario), x: 110, w: 30, align: "right" },
          { value: formatBRL(p.quantidade * p.valorUnitario), x: 140, w: 40, align: "right" },
        ],
        i % 2 === 1
      );
    });
    y += 2;
  }

  // ── TOTALS ───────────────────────────────────────────────────────────────
  const totalsX = ml + cw - 80;
  const totalsW = 80;

  function drawTotalLine(label: string, value: string, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10.5 : 9);
    doc.setTextColor(bold ? COR_ESCURO[0] : COR_CINZA[0], bold ? COR_ESCURO[1] : COR_CINZA[1], bold ? COR_ESCURO[2] : COR_CINZA[2]);
    doc.text(label, totalsX, y + 5);
    doc.text(value, totalsX + totalsW, y + 5, { align: "right" });
    y += 7;
  }

  // divider
  doc.setDrawColor(...COR_CLARO);
  doc.setLineWidth(0.4);
  doc.line(ml, y, ml + cw, y);
  y += 4;

  drawTotalLine("Subtotal Serviços:", formatBRL(data.totalServicos));
  drawTotalLine("Subtotal Peças:", formatBRL(data.totalPecas));

  // Total box
  doc.setFillColor(...COR_PRIMARIA);
  doc.roundedRect(totalsX - 4, y, totalsW + 4, 10, 1.5, 1.5, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_BRANCO);
  doc.text("TOTAL GERAL:", totalsX, y + 7);
  doc.text(formatBRL(data.total), totalsX + totalsW, y + 7, { align: "right" });
  y += 16;

  // ── OBSERVATIONS ─────────────────────────────────────────────────────────
  if (data.observacoes) {
    doc.setFillColor(...COR_CLARO);
    doc.roundedRect(ml, y, cw, 5, 1, 1, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COR_PRIMARIA);
    doc.text("OBSERVAÇÕES", ml + 4, y + 3.5);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COR_ESCURO);
    const lines = doc.splitTextToSize(data.observacoes, cw - 6);
    doc.text(lines, ml + 3, y);
    y += lines.length * 5 + 4;
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────
  const pageH = 297;
  doc.setFillColor(...COR_CLARO);
  doc.rect(0, pageH - 18, pw, 18, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COR_CINZA);
  doc.text(
    "Este orçamento tem validade de 15 dias. Valores sujeitos a alteração após o prazo.",
    pw / 2,
    pageH - 10,
    { align: "center" }
  );
  doc.text(
    `Responsável: ${data.responsavel}  •  Gerado em ${new Date().toLocaleString("pt-BR")}`,
    pw / 2,
    pageH - 4,
    { align: "center" }
  );

  // ── SAVE ─────────────────────────────────────────────────────────────────
  doc.save(`Orcamento-${data.numero}.pdf`);
}
