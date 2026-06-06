// Shared export utilities — CSV, Excel, PDF.
// All three formats use the same (headers, rows) interface so callers stay consistent.

type Cell = string | number | null | undefined

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

function escapeCSV(v: Cell): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

export function downloadCSV(filename: string, headers: string[], rows: Cell[][]) {
  const BOM = '﻿'
  const csv = BOM + [headers, ...rows].map((r) => r.map(escapeCSV).join(',')).join('\n')
  triggerDownload(`${filename}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
}

export async function downloadExcel(filename: string, headers: string[], rows: Cell[][]) {
  const { utils, writeFile } = await import('xlsx')
  const data = [headers, ...rows.map((r) => r.map((c) => c ?? ''))]
  const ws = utils.aoa_to_sheet(data)
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)) + 2,
  }))
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Sheet1')
  writeFile(wb, `${filename}.xlsx`)
}

export async function downloadPDF(
  filename: string,
  title: string,
  meta: string,
  headers: string[],
  rows: Cell[][],
  landscape = false,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Header block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(26, 26, 58)
  doc.text('SecureAssess', 14, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(title, 14, 23)

  doc.setFontSize(7.5)
  doc.setTextColor(130, 130, 155)
  let y = 29
  if (meta) { doc.text(meta, 14, y); y += 5 }
  doc.text(`Exported ${new Date().toLocaleString()}`, 14, y)

  autoTable(doc, {
    startY: y + 6,
    head: [headers],
    body: rows.map((r) => r.map((c) => (c != null && c !== '') ? String(c) : '—')),
    theme: 'striped',
    headStyles: { fillColor: [26, 26, 58], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [247, 247, 252] },
    tableLineColor: [220, 220, 230],
    tableLineWidth: 0.1,
    didDrawPage: (data) => {
      const total = doc.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(170, 170, 185)
      doc.text(
        `Page ${data.pageNumber} of ${total}  ·  SecureAssess`,
        pageW - 14,
        pageH - 8,
        { align: 'right' },
      )
    },
  })

  doc.save(`${filename}.pdf`)
}
