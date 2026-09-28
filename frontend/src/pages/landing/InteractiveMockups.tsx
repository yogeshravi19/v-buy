import React, { useState } from 'react'
import {
  Smartphone, Tablet, CheckCircle2, QrCode, ShoppingBag,
  ArrowRight, ShieldCheck, Check, DollarSign
} from 'lucide-react'

export const InteractiveMockups: React.FC = () => {
  // Student Phone interactive state
  const [phoneStep, setPhoneStep] = useState<'menu' | 'slot' | 'pay' | 'pass'>('menu')
  const [cartCount, setCartCount] = useState(2)
  const [vegOnly, setVegOnly] = useState(false)

  // Canteen Tablet interactive state
  const [tabletTab, setTabletTab] = useState<'kds' | 'menu' | 'slots'>('kds')
  const [kdsOrders, setKdsOrders] = useState([
    { id: '#0428', item: '1x Masala Dosa, 1x Filter Coffee', slot: '12:30 PM', status: 'ready', time: 'Ready for pickup' },
    { id: '#0429', item: '2x Paneer Kathi Roll', slot: '12:45 PM', status: 'prep', time: 'Cooking (3m left)' },
    { id: '#0430', item: '1x Cold Coffee, 1x Veg Puff', slot: '12:45 PM', status: 'queue', time: 'Scheduled (fires 12:35)' },
  ])
  const [menuItems, setMenuItems] = useState([
    { name: 'Paneer Kathi Roll', price: 90, inStock: true, veg: true },
    { name: 'Butter Chicken Rice Bowl', price: 140, inStock: true, veg: false },
    { name: 'Filter Kaapi', price: 25, inStock: true, veg: true },
    { name: 'Peri Peri French Fries', price: 70, inStock: false, veg: true },
  ])

  const toggleStock = (idx: number) => {
    setMenuItems(prev => prev.map((item, i) => i === idx ? { ...item, inStock: !item.inStock } : item))
  }

  const markOrderReady = (id: string) => {
    setKdsOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'ready', time: 'Ready for pickup' } : o))
  }

  return (
    <div className="space-y-12">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 mb-3">
          <Smartphone className="w-3.5 h-3.5" />
          <span>TRY THE LIVE INTERFACES</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Two Unified Apps. Zero Friction.
        </h3>
        <p className="text-slate-600 text-sm sm:text-base mt-2">
          Click around below to experience the student ordering flow and the canteen staff kitchen display screen in real time.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Student Phone Simulator (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">User Mobile Experience</span>
            </div>
            {/* Step indicators */}
            <div className="flex gap-1">
              {(['menu', 'slot', 'pay', 'pass'] as const).map(step => (
                <button
                  key={step}
                  onClick={() => setPhoneStep(step)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    phoneStep === step ? 'bg-orange-600 w-4' : 'bg-slate-300'
                  }`}
                  title={`Jump to ${step}`}
                />
              ))}
            </div>
          </div>

          {/* Interactive Phone Frame */}
          <div className="w-full max-w-[280px] bg-slate-50 rounded-[36px] border-4 border-slate-300 p-3.5 shadow-xl relative text-left">
            {/* Notch */}
            <div className="w-24 h-4 bg-slate-200 rounded-full mx-auto mb-3 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            </div>

            {/* SCREEN 1: BROWSE MENU */}
            {phoneStep === 'menu' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold">CANTEEN</p>
                    <p className="text-xs font-bold text-slate-900">Gazebo C1</p>
                  </div>
                  <button
                    onClick={() => setVegOnly(!vegOnly)}
                    className={`text-[9px] font-bold px-2 py-1 rounded-full border transition-all cursor-pointer ${
                      vegOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {vegOnly ? 'Pure Veg' : 'Veg Filter'}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-xs">
                    <div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">VEG</span>
                      <p className="text-xs font-bold text-slate-900 mt-1">Paneer Kathi Roll</p>
                      <p className="text-[11px] text-orange-600 font-semibold">₹90</p>
                    </div>
                    <button
                      onClick={() => setCartCount(c => c + 1)}
                      className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>

                  {!vegOnly && (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-xs">
                      <div>
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">NON-VEG</span>
                        <p className="text-xs font-bold text-slate-900 mt-1">Chicken Rice Bowl</p>
                        <p className="text-[11px] text-orange-600 font-semibold">₹140</p>
                      </div>
                      <button
                        onClick={() => setCartCount(c => c + 1)}
                        className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-xs">
                    <div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">VEG</span>
                      <p className="text-xs font-bold text-slate-900 mt-1">Filter Kaapi</p>
                      <p className="text-[11px] text-orange-600 font-semibold">₹25</p>
                    </div>
                    <button
                      onClick={() => setCartCount(c => c + 1)}
                      className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setPhoneStep('slot')}
                  className="w-full mt-3 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Cart ({cartCount} items) • Pick Slot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* SCREEN 2: PICKUP SLOT */}
            {phoneStep === 'slot' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">Select Pickup Slot</span>
                  <button onClick={() => setPhoneStep('menu')} className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer">Back</button>
                </div>
                <p className="text-[10px] text-slate-500">Guaranteed fresh pickup window:</p>
                <div className="space-y-2">
                  {[
                    { slot: '12:30 - 12:45 PM', rem: '2 slots left', cap: 'High demand' },
                    { slot: '12:45 - 01:00 PM', rem: '7 slots left', cap: 'Recommended' },
                    { slot: '01:00 - 01:15 PM', rem: '14 slots left', cap: 'Normal' },
                  ].map((s, idx) => (
                    <div
                      key={s.slot}
                      onClick={() => setPhoneStep('pay')}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        idx === 1
                          ? 'bg-orange-50 border-orange-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-900">{s.slot}</span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{s.rem}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 block">{s.cap}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setPhoneStep('pay')}
                  className="w-full mt-3 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Confirm Slot: 12:45 PM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* SCREEN 3: FAST CHECKOUT */}
            {phoneStep === 'pay' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">Payment Method</span>
                  <button onClick={() => setPhoneStep('slot')} className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer">Back</button>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>Order Total:</span>
                    <span className="font-bold text-slate-900">₹115.00</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>Slot:</span>
                    <span className="text-orange-700 font-medium">12:45 - 01:00 PM</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-white border border-orange-400 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center text-white">
                        <DollarSign className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Campus Wallet</p>
                        <p className="text-[10px] text-slate-500">Balance: ₹450.00 (Instant)</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-orange-600" />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-purple-600 flex items-center justify-center text-white font-bold text-[9px]">
                        UPI
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">PhonePe / Google Pay</p>
                        <p className="text-[10px] text-slate-500">UPI App Gateway</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setPhoneStep('pass')}
                  className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pay ₹115 & Generate Pass</span>
                </button>
              </div>
            )}

            {/* SCREEN 4: LIVE QR PASS */}
            {phoneStep === 'pass' && (
              <div className="space-y-3 text-center animate-in fade-in duration-200">
                <div className="p-3 bg-white rounded-2xl mx-auto w-32 h-32 flex flex-col items-center justify-center shadow-md border border-slate-200">
                  <QrCode className="w-24 h-24 text-slate-900" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-orange-600 tracking-wider">ORDER TOKEN</span>
                  <p className="text-2xl font-black text-slate-900 tracking-widest mt-0.5">#0429</p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Kitchen Preparing • Ready in 3m
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Pickup Counter: Gazebo C1 (Bay 2)</p>
                </div>
                <button
                  onClick={() => setPhoneStep('menu')}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline mt-2 cursor-pointer"
                >
                  Restart Demo Flow
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-4 text-center">
            Tap anywhere inside the phone screen to experience the ordering steps.
          </p>
        </div>

        {/* RIGHT: Canteen Kitchen Display Tablet (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
              <div className="flex items-center gap-2">
                <Tablet className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Canteen Tablet & KDS System</h4>
                  <p className="text-[11px] text-slate-500">Gazebo C1 Kitchen Terminal (Touchscreen Optimized)</p>
                </div>
              </div>

              {/* Tablet Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                <button
                  onClick={() => setTabletTab('kds')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    tabletTab === 'kds' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live KDS ({kdsOrders.length})
                </button>
                <button
                  onClick={() => setTabletTab('menu')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    tabletTab === 'menu' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  86 Stock Toggle
                </button>
                <button
                  onClick={() => setTabletTab('slots')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    tabletTab === 'slots' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Slot Capacity
                </button>
              </div>
            </div>

            {/* TAB 1: KDS ORDERS QUEUE */}
            {tabletTab === 'kds' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                  <span>Current Kitchen Preparation Queue</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    WebSocket Connected
                  </span>
                </div>

                <div className="space-y-2.5">
                  {kdsOrders.map(order => (
                    <div
                      key={order.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        order.status === 'ready'
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : order.status === 'prep'
                          ? 'bg-orange-50/70 border-orange-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-900 font-mono shadow-xs">
                          {order.id}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{order.item}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                            <span className="text-orange-700 font-semibold">Slot: {order.slot}</span>
                            <span>•</span>
                            <span className={order.status === 'ready' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-medium'}>
                              {order.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {order.status !== 'ready' ? (
                          <button
                            onClick={() => markOrderReady(order.id)}
                            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Ready</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>At Counter Bay</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: MENU STOCK 86 TOGGLE */}
            {tabletTab === 'menu' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Tap to instantly toggle dishes "In Stock" or "86 Sold Out". Changes reflect across all student mobile devices in under 200ms.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {menuItems.map((item, idx) => (
                    <div
                      key={item.name}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.name}</p>
                        <p className="text-[11px] text-slate-500">₹{item.price} • {item.veg ? 'Veg' : 'Non-Veg'}</p>
                      </div>
                      <button
                        onClick={() => toggleStock(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          item.inStock
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                      >
                        {item.inStock ? 'Available' : 'Sold Out'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SLOT CAPACITY */}
            {tabletTab === 'slots' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Kitchen load management allows owners to throttle or pause app orders during extreme in-person surges with 1 tap.
                </p>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="font-bold text-slate-900">12:30 - 12:45 PM Peak Window</span>
                      <span className="text-orange-700 font-bold">18 / 25 App Slots Used</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div className="w-[72%] h-full bg-orange-500 rounded-full" />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="font-bold text-slate-900">12:45 - 01:00 PM Peak Window</span>
                      <span className="text-rose-700 font-bold">25 / 25 App Slots (Capped)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-rose-500 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Runs on standard ₹7,999 Android 10" countertop tablets.</span>
            <span className="text-orange-700 font-semibold">Zero POS rental fees</span>
          </div>
        </div>
      </div>
    </div>
  )
}
