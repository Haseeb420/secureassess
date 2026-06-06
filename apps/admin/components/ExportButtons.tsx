'use client'

import { FileText, FileSpreadsheet, FileDown } from 'lucide-react'

interface Props {
  disabled?: boolean
  onCSV:   () => void
  onExcel: () => void
  onPDF:   () => void
}

const BTN = [
  'flex items-center gap-1.5',
  'rounded-lg border border-brand-border bg-white',
  'px-3 py-2 text-xs font-medium text-brand-navy',
  'hover:border-brand-orange hover:text-brand-orange',
  'transition-colors',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ')

export function ExportButtons({ disabled, onCSV, onExcel, onPDF }: Props) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Export options">
      <button type="button" disabled={disabled} onClick={onCSV}   title="Export as CSV"   className={BTN}>
        <FileText       size={13} aria-hidden="true" /> CSV
      </button>
      <button type="button" disabled={disabled} onClick={onExcel} title="Export as Excel" className={BTN}>
        <FileSpreadsheet size={13} aria-hidden="true" /> Excel
      </button>
      <button type="button" disabled={disabled} onClick={onPDF}   title="Export as PDF"   className={BTN}>
        <FileDown        size={13} aria-hidden="true" /> PDF
      </button>
    </div>
  )
}
