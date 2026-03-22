import { formatCurrency, formatDate, getCurrencySymbol } from './useInvoice'
import type { InvoiceData } from './useInvoice'

interface InvoicePreviewProps {
  data: InvoiceData
  calculations: {
    subtotal: number
    taxAmount: number
    total: number
  }
  getItemAmount: (item: InvoiceData['items'][0]) => number
}

export default function InvoicePreview({
  data,
  calculations,
  getItemAmount,
}: InvoicePreviewProps) {
  const sym = getCurrencySymbol(data.currency)

  const getPartyBlock = (rawValue: string) => {
    const lines = rawValue
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    return {
      name: lines[0] || '\u2014',
      address: lines.slice(1).join('\n'),
    }
  }

  const companyBlock = getPartyBlock(data.companyDetails)
  const billToBlock = getPartyBlock(data.billTo)

  return (
    <div className="w-full max-w-[640px] bg-white p-10 text-[#070707] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06] sm:p-12 pb-14 print:max-w-none print:p-10 print:pb-14 print:shadow-none print:ring-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {data.logo && (
            <img
              src={data.logo}
              alt="Company logo"
              className="mb-4 h-10 max-h-10 w-auto max-w-[160px] object-contain"
            />
          )}
          <h2 className="mb-0.5 text-[10px] font-normal uppercase tracking-[0.2em] text-[#a3a3a3]">
            Invoice
          </h2>
          {data.invoiceNumber && (
            <p className="text-[16px] font-semibold text-[#070707]">
              #{data.invoiceNumber}
            </p>
          )}
        </div>
        <div className="text-right text-[10px]">
          <div className="mb-0.5 font-normal uppercase tracking-[0.2em] text-[#a3a3a3]">
            Invoice date
          </div>
          <div className="mb-4 font-medium text-[#070707]">
            {formatDate(data.invoiceDate)}
          </div>
          {data.serviceDate && (
            <>
              <div className="mb-0.5 font-normal uppercase tracking-[0.2em] text-[#a3a3a3]">
                Service date
              </div>
              <div className="mb-4 font-medium text-[#070707]">
                {formatDate(data.serviceDate)}
              </div>
            </>
          )}
          <div className="mb-0.5 font-normal uppercase tracking-[0.2em] text-[#a3a3a3]">
            Due date
          </div>
          <div className="font-medium text-[#070707]">
            {formatDate(data.dueDate)}
          </div>
        </div>
      </div>

      {/* From / To */}
      <div className="mt-10 grid grid-cols-2 gap-6">
        <div>
          <div className="mb-1.5 text-[10px] font-normal uppercase tracking-[0.2em] text-[#a3a3a3]">
            From
          </div>
          <p className="break-words whitespace-pre-wrap text-[13px] leading-relaxed text-[#525252]">
            <span className="font-semibold text-[#070707]">
              {companyBlock.name}
            </span>
            {companyBlock.address && (
              <span className="mt-1 block text-[#525252]">
                {companyBlock.address}
              </span>
            )}
          </p>
          {data.senderTaxId && (
            <p className="mt-1.5 text-xs text-[#525252]">
              Tax ID: {data.senderTaxId}
            </p>
          )}
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-normal uppercase tracking-[0.2em] text-[#a3a3a3]">
            Bill to
          </div>
          <p className="break-words whitespace-pre-wrap text-[13px] leading-relaxed text-[#525252]">
            <span className="font-semibold text-[#070707]">
              {billToBlock.name}
            </span>
            {billToBlock.address && (
              <span className="mt-1 block text-[#525252]">
                {billToBlock.address}
              </span>
            )}
          </p>
          {data.clientTaxId && (
            <p className="mt-1.5 text-xs text-[#525252]">
              Tax ID: {data.clientTaxId}
            </p>
          )}
        </div>
      </div>

      {/* Line items table */}
      <div className="mt-10">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e5e5e5]">
              <th
                scope="col"
                className="pb-2.5 pt-1 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#8a8a8a]"
              >
                Description
              </th>
              <th
                scope="col"
                className="pb-2.5 pt-1 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-[#8a8a8a]"
              >
                Unit cost
              </th>
              <th
                scope="col"
                className="pb-2.5 pt-1 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-[#8a8a8a]"
              >
                Qty
              </th>
              <th
                scope="col"
                className="pb-2.5 pt-1 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-[#8a8a8a]"
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items
              .filter(
                (item) => item.description || item.unitCost || item.quantity,
              )
              .map((item) => (
                <tr key={item.id} className="border-b border-[#f0f0f0]">
                  <td className="max-w-[200px] break-words py-3 text-[13px] text-[#070707]">
                    {item.description || '\u2014'}
                  </td>
                  <td className="py-3 text-right text-[13px] tabular-nums text-[#525252]">
                    {item.unitCost
                      ? formatCurrency(parseFloat(item.unitCost), data.currency)
                      : '\u2014'}
                  </td>
                  <td className="py-3 text-right text-[13px] tabular-nums text-[#525252]">
                    {item.quantity || '\u2014'}
                  </td>
                  <td className="py-3 text-right text-[13px] font-medium tabular-nums text-[#070707]">
                    {formatCurrency(getItemAmount(item), data.currency)}
                  </td>
                </tr>
              ))}
            {data.items.every(
              (item) => !item.description && !item.unitCost && !item.quantity,
            ) && (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-[13px] italic text-[#a3a3a3]"
                >
                  Add items to begin
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-10 flex justify-end">
        <div className="w-56 space-y-1.5">
          <div className="flex justify-between text-[13px]">
            <span className="text-[#525252]">Subtotal</span>
            <span className="tabular-nums text-[#070707]">
              {formatCurrency(calculations.subtotal, data.currency)}
            </span>
          </div>
          {calculations.taxAmount > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#525252]">Tax ({data.taxPercent}%)</span>
              <span className="tabular-nums text-[#070707]">
                {formatCurrency(calculations.taxAmount, data.currency)}
              </span>
            </div>
          )}
          <div className="border-t-2 border-[#070707] pt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#070707]">
                Total
              </span>
              <span className="flex items-baseline justify-end gap-2 text-right tabular-nums">
                <span className="text-[24px] font-semibold tracking-[-0.03em] text-[#070707]">
                  {formatCurrency(calculations.total, data.currency)}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#525252]">
                  {data.currency}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Bank details */}
      {(data.notes || data.bankDetails) && (
        <div className="mt-10 grid grid-cols-2 gap-6 border-t border-[#e5e5e5] pt-8">
          {data.notes && (
            <div>
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-[#8a8a8a]">
                Notes
              </div>
              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#525252]">
                {data.notes}
              </p>
            </div>
          )}
          {data.bankDetails && (
            <div>
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-[#8a8a8a]">
                Bank details
              </div>
              <p className="whitespace-pre-wrap break-words text-[12px] font-mono leading-relaxed text-[#525252]">
                {data.bankDetails.replace(/\\n/g, '\n')}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 hidden border-t border-[#e5e5e5] pt-3 text-[10px] text-[#a3a3a3] print:block">
        <span>#{data.invoiceNumber || '\u2014'}</span>
        <span className="mx-1.5 inline-flex translate-y-[-0.03em]">•</span>
        <span>{companyBlock.name}</span>
      </div>
    </div>
  )
}
