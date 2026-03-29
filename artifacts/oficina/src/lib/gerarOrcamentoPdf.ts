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

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataBR(iso: string) {
  if (!iso) return "-";
  const d = new Date(String(iso).length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("pt-BR");
}

type RGB = [number, number, number];

const NAVY: RGB   = [13,  36,  98];
const ORANGE: RGB = [245, 166, 35];
const BLUE_H: RGB = [28,  58, 158];
const GRAY_BG: RGB= [232, 235, 244];
const GRAY_ROW: RGB=[246,247,250];
const WHITE: RGB  = [255, 255, 255];
const DARK: RGB   = [20,  20,  40];
const MID: RGB    = [95, 100, 130];
const BORDER: RGB = [205, 210, 228];

export function gerarOrcamentoPdf(data: OrcamentoPdfData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210;
  const ml = 14;
  const cw = pw - ml * 2;
  const gap = 7;
  const colW = (cw - gap) / 2;
  const lx = ml;
  const rx = ml + colW + gap;

  const ROW = 6.5;
  const SEC_H = 8;
  const COL_H = 6.5;

  // ── HEADER ────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pw, 42, "F");

  // Decorative circle/gear top-right
  const gx = pw - 22, gy = 21;
  doc.setFillColor(30, 55, 125);
  doc.circle(gx, gy, 16, "F");
  doc.setFillColor(50, 80, 155);
  doc.circle(gx, gy, 12, "F");
  doc.setFillColor(30, 55, 125);
  doc.circle(gx, gy, 6, "F");
  // Wrench handle (simplified)
  doc.setFillColor(180, 195, 230);
  doc.roundedRect(gx - 1.8, gy - 12, 3.6, 18, 1.5, 1.5, "F");
  doc.circle(gx, gy - 13, 4.5, "F");
  doc.setFillColor(30, 55, 125);
  doc.circle(gx, gy - 13, 2.5, "F");
  // Screwdriver diagonal (two thin rects rotated via line)
  doc.setDrawColor(180, 195, 230);
  doc.setLineWidth(2.2);
  doc.line(gx - 10, gy + 10, gx + 10, gy - 10);
  doc.setLineWidth(0.3);

  // "ORÇAMENTO" in white
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("ORÇAMENTO", ml, 17);

  // "OFICINA MECÂNICA" in orange italic
  doc.setTextColor(...ORANGE);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(16);
  doc.text("OFICINA MECÂNICA", ml, 30);

  // Orange accent stripe
  doc.setFillColor(...ORANGE);
  doc.rect(0, 42, pw, 2, "F");

  let y = 50;

  // ── OS INFO BAR ────────────────────────────────────────────────────────────
  doc.setFillColor(...GRAY_BG);
  doc.rect(ml, y, cw, 10, "F");
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(ml, y, cw, 10, "D");

  const iy = y + 6.8;
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`N° OS:  ${data.numero}`, ml + 5, iy);
  doc.text(`DATA:  ${dataBR(data.dataEntrada)}`, ml + cw / 2, iy, { align: "center" });
  doc.text("VALIDADE:  7 DIAS", ml + cw - 5, iy, { align: "right" });

  // Separators
  doc.setDrawColor(...BORDER);
  doc.line(ml + cw / 3, y + 2, ml + cw / 3, y + 8);
  doc.line(ml + (cw * 2) / 3, y + 2, ml + (cw * 2) / 3, y + 8);

  y += 15;

  // ── CLIENTE / VEÍCULO ─────────────────────────────────────────────────────
  const cvH = 32;

  function drawCard(x: number, label: string, lines: string[]) {
    doc.setFillColor(...GRAY_BG);
    doc.rect(x, y, colW, cvH, "F");
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(x, y, colW, cvH, "D");
    doc.setDrawColor(...BORDER);
    doc.line(x, y + 10, x + colW, y + 10);

    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, x + 4, y + 7);

    lines.forEach((line, i) => {
      if (i === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...MID);
      }
      doc.text(line, x + 4, y + 16 + i * 7);
    });
  }

  const veicLines = [
    `${data.veiculoMarca} ${data.veiculoModelo}`,
    `Placa: ${data.veiculoPlaca}`,
    data.veiculoKm ? `KM: ${data.veiculoKm.toLocaleString("pt-BR")}` : (data.veiculoAno ? `Ano: ${data.veiculoAno}` : ""),
  ].filter(Boolean);

  const cliLines = [
    data.clienteNome,
    data.clienteTelefone ? `Telefone: ${data.clienteTelefone}` : "",
    data.clienteEmail ?? "",
  ].filter(Boolean);

  drawCard(lx, "CLIENTE:", cliLines);
  drawCard(rx, "VEÍCULO:", veicLines);

  y += cvH + 7;

  // ── TWO-COLUMN TABLES ─────────────────────────────────────────────────────
  function sectionHeader(x: number, yy: number, label: string): number {
    doc.setFillColor(...NAVY);
    doc.rect(x, yy, colW, SEC_H, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(label, x + 4, yy + 5.8);
    return yy + SEC_H;
  }

  function colHeader(x: number, yy: number, cols: { label: string; cx: number; cw: number; right?: boolean }[]): number {
    doc.setFillColor(...BLUE_H);
    doc.rect(x, yy, colW, COL_H, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    for (const c of cols) {
      if (c.right) {
        doc.text(c.label, x + c.cx + c.cw - 2, yy + 4.5, { align: "right" });
      } else {
        doc.text(c.label, x + c.cx + 2, yy + 4.5);
      }
    }
    return yy + COL_H;
  }

  function tableRow(
    x: number, yy: number, idx: number,
    cols: { value: string; cx: number; cw: number; right?: boolean; bold?: boolean }[],
    dividers?: number[]
  ): number {
    doc.setFillColor(...(idx % 2 === 1 ? GRAY_ROW : WHITE));
    doc.rect(x, yy, colW, ROW, "F");

    if (dividers) {
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      for (const dx of dividers) {
        doc.line(x + dx, yy, x + dx, yy + ROW);
      }
    }

    for (const c of cols) {
      doc.setFont("helvetica", c.bold ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      if (c.right) {
        doc.text(c.value, x + c.cx + c.cw - 2, yy + 4.5, { align: "right" });
      } else {
        doc.text(c.value, x + c.cx + 2, yy + 4.5);
      }
    }
    return yy + ROW;
  }

  // ── LEFT: SERVIÇOS ────────────────────────────────────────────────────────
  const svcW = colW - 28;
  let yL = sectionHeader(lx, y, "SERVIÇOS:");
  const tableTopL = yL;
  yL = colHeader(lx, yL, [
    { label: "Descrição",  cx: 0,    cw: svcW },
    { label: "Valor (R$)", cx: svcW, cw: 28, right: true },
  ]);

  data.servicos.forEach((s, i) => {
    const nome = s.nome.length > 30 ? s.nome.slice(0, 29) + "…" : s.nome;
    yL = tableRow(lx, yL, i, [
      { value: nome,        cx: 0,    cw: svcW },
      { value: fmt(s.valor), cx: svcW, cw: 28, right: true, bold: true },
    ], [svcW]);
  });

  // Table border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(lx, tableTopL, colW, yL - tableTopL, "D");

  // Subtotal serviços
  yL += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MID);
  doc.text("Subtotal Serviços:", lx + 3, yL + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(fmt(data.totalServicos), lx + colW - 2, yL + 4.5, { align: "right" });
  yL += ROW + 3;

  // ── RIGHT: PEÇAS ──────────────────────────────────────────────────────────
  const pNomW = 34, pQtdW = 12, pUniW = 22, pTotW = colW - pNomW - pQtdW - pUniW;
  let yR = sectionHeader(rx, y, "PEÇAS:");
  const tableTopR = yR;
  yR = colHeader(rx, yR, [
    { label: "Peça",           cx: 0,                         cw: pNomW },
    { label: "Qtde",           cx: pNomW,                     cw: pQtdW, right: true },
    { label: "Valor Unit.(R$)", cx: pNomW + pQtdW,            cw: pUniW, right: true },
    { label: "Total (R$)",     cx: pNomW + pQtdW + pUniW,    cw: pTotW, right: true },
  ]);

  data.pecas.forEach((p, i) => {
    const nome = p.nome.length > 18 ? p.nome.slice(0, 17) + "…" : p.nome;
    yR = tableRow(rx, yR, i, [
      { value: nome,                              cx: 0,                      cw: pNomW },
      { value: String(p.quantidade),              cx: pNomW,                  cw: pQtdW, right: true },
      { value: fmt(p.valorUnitario),              cx: pNomW + pQtdW,          cw: pUniW, right: true },
      { value: fmt(p.quantidade * p.valorUnitario), cx: pNomW + pQtdW + pUniW, cw: pTotW, right: true, bold: true },
    ], [pNomW, pNomW + pQtdW, pNomW + pQtdW + pUniW]);
  });

  // Table border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(rx, tableTopR, colW, yR - tableTopR, "D");

  // Subtotal peças
  yR += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MID);
  doc.text("Subtotal Peças:", rx + 3, yR + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(fmt(data.totalPecas), rx + colW - 2, yR + 4.5, { align: "right" });
  yR += ROW + 3;

  y = Math.max(yL, yR) + 5;

  // ── TOTAL GERAL ───────────────────────────────────────────────────────────
  const tW = 96, tH = 13;
  const tX = ml + cw - tW;
  doc.setFillColor(...NAVY);
  doc.rect(tX, y, tW, tH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL GERAL:", tX + 5, y + 9);

  doc.setFontSize(13.5);
  doc.setTextColor(...ORANGE);
  doc.text(`R$ ${fmt(data.total)}`, tX + tW - 4, y + 9, { align: "right" });

  y += tH + 8;

  // ── NOTAS DE RODAPÉ ───────────────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...MID);
  doc.text("* Garantia dos serviços conforme negociação.", ml, y);
  y += 5;
  doc.text("** A validade deste orçamento é de 7 dias.", ml, y);

  if (data.observacoes) {
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text("Observações:", ml, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID);
    const lines = doc.splitTextToSize(data.observacoes, cw);
    doc.text(lines, ml, y);
  }

  if (data.responsavel) {
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MID);
    doc.text(`Responsável: ${data.responsavel}  •  Emitido em ${new Date().toLocaleString("pt-BR")}`, ml, y);
  }

  doc.save(`Orcamento-${data.numero}.pdf`);
}
