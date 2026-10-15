import React, { useState } from 'react'
import { Printer, X, Receipt, UtensilsCrossed } from 'lucide-react'
import { formatOrderNumber } from '../../utils/orderNumber'

export interface PosPrintOrder {
  order_id: number
  order_number: string
  token?: string
  outlet_name: string
  outlet_fssai?: string | null
  created_at: string
  customer_name?: string
  payment_mode: string
  items: Array<{
    name: string
    qty: number
    price?: number
    notes?: string
  }>
  total: number
}

interface PosPrintReceiptProps {
  order: PosPrintOrder | null
  isOpen: boolean
  onClose: () => void
}

export function PosPrintReceipt({ order, isOpen, onClose }: PosPrintReceiptProps) {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm')
  const [printType, setPrintType] = useState<'bill' | 'kot'>('bill')

  if (!isOpen || !order) return null

  const formattedTime = new Date(order.created_at).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  const handlePrint = () => {
    window.print()
  }

  const orderNumDisplay = formatOrderNumber({ order_number: order.order_number, token: order.token })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[min(480px,calc(100vw-24px))] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[min(90vh,90dvh)] flex flex-col overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Controls (Hidden during print) */}
        <div className="print:hidden flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">Receipt / KOT Print</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Print Configuration (Hidden during print) */}
        <div className="print:hidden px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3 text-xs bg-white">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${printType === 'bill' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
              onClick={() => setPrintType('bill')}
            >
              Customer Bill
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${printType === 'kot' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
              onClick={() => setPrintType('kot')}
            >
              Kitchen KOT
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Paper:</span>
            <select
              value={paperWidth}
              onChange={(e) => setPaperWidth(e.target.value as any)}
              className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:outline-none"
            >
              <option value="80mm">80mm Thermal</option>
              <option value="58mm">58mm Thermal</option>
            </select>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/50 flex justify-center">
          <div
            id="thermal-receipt-container"
            style={{
              width: paperWidth === '58mm' ? '56mm' : '76mm',
              minHeight: '100px',
              fontFamily: 'monospace',
              fontSize: paperWidth === '58mm' ? '11px' : '12px',
              lineHeight: 1.25,
              color: '#000000',
              backgroundColor: '#FFFFFF',
              padding: paperWidth === '58mm' ? '8px 4px' : '12px 8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            className="border border-slate-200 rounded-sm"
          >
            {/* KOT View */}
            {printType === 'kot' ? (
              <div className="text-center space-y-1.5">
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>KITCHEN ORDER TICKET (KOT)</div>
                <div style={{ fontSize: '11px' }}>{order.outlet_name}</div>
                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>TOKEN:</span>
                  <strong style={{ fontSize: '16px' }}>{orderNumDisplay}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span>Time:</span>
                  <span>{formattedTime}</span>
                </div>
                {order.customer_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span>Customer:</span>
                    <span>{order.customer_name}</span>
                  </div>
                )}
                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

                {/* Items (NO prices in KOT) */}
                <div style={{ textAlign: 'left' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '13px' }}>{item.qty} × {item.name}</strong>
                      </div>
                      {item.notes && (
                        <div style={{ fontSize: '10px', fontStyle: 'italic', paddingLeft: '8px' }}>
                          * {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
                <div style={{ fontSize: '10px' }}>Kitchen Counter Dispatch</div>
              </div>
            ) : (
              /* Customer Bill View */
              <div className="text-center space-y-1">
                <div style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>V FOODS</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{order.outlet_name}</div>
                {order.outlet_fssai && (
                  <div style={{ fontSize: '10px' }}>FSSAI: {order.outlet_fssai}</div>
                )}
                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>Order / Token:</span>
                  <strong style={{ fontSize: '15px' }}>{orderNumDisplay}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span>Date & Time:</span>
                  <span>{formattedTime}</span>
                </div>
                {order.customer_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span>Customer:</span>
                    <span>{order.customer_name}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span>Payment:</span>
                  <strong>{order.payment_mode.replace('_', ' ')}</strong>
                </div>
                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

                {/* Bill Items with Prices */}
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={{ padding: '2px 0' }}>Item</th>
                      <th style={{ padding: '2px 0', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '2px 0', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '2px 0', textAlign: 'right' }}>Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => {
                      const price = item.price || 0
                      const amt = price * item.qty
                      return (
                        <tr key={idx}>
                          <td style={{ padding: '3px 0', maxWidth: '35mm' }}>{item.name}</td>
                          <td style={{ padding: '3px 0', textAlign: 'center' }}>{item.qty}</td>
                          <td style={{ padding: '3px 0', textAlign: 'right' }}>₹{price}</td>
                          <td style={{ padding: '3px 0', textAlign: 'right' }}>₹{amt}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
                  <span>TOTAL PAID:</span>
                  <span>₹{order.total}</span>
                </div>
                <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
                <div style={{ fontSize: '9px', color: '#333' }}>
                  Counter Sales Receipt · Not a GST Tax Invoice<br />
                  Thank you for dining at V Foods!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Print Action Buttons (Hidden during print) */}
        <div className="print:hidden px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer size={14} />
            Print ({paperWidth})
          </button>
        </div>
      </div>
    </div>
  )
}
