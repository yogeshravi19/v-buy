import React, { useState, useId } from 'react'
import { Clock, ShieldCheck, Flame, Sparkles, CheckCircle2 } from 'lucide-react'

export const FairnessEngineVisualizer: React.FC = () => {
  const [pickupMinutesAhead, setPickupMinutesAhead] = useState(30)
  const [rushLevel, setRushLevel] = useState<'normal' | 'rush'>('rush')
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(1)

  const prepTime = 10 // minutes for prep
  const backlogTime = rushLevel === 'rush' ? 8 : 3 // kitchen queue backlog

  // Formula: startPrep = targetPickup - prepTime - backlogTime
  const leadTimeBeforePickup = prepTime + backlogTime
  const prepStartsInMinutes = Math.max(0, pickupMinutesAhead - leadTimeBeforePickup)

  const slots = [
    { time: '12:15 - 12:30 PM', appBooked: 24, appCap: 25, walkInReserved: 15, status: 'Almost Full' },
    { time: '12:30 - 12:45 PM', appBooked: 18, appCap: 25, walkInReserved: 15, status: 'Available' },
    { time: '12:45 - 01:00 PM', appBooked: 25, appCap: 25, walkInReserved: 15, status: 'Slot Capped' },
    { time: '01:00 - 01:15 PM', appBooked: 12, appCap: 25, walkInReserved: 15, status: 'Available' },
  ]

  const activeSlot = slots[selectedSlotIndex]

  const normalBacklogRadioId = useId()
  const rushBacklogRadioId = useId()

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden">
      {/* Header */}
      <div className="relative z-10 max-w-3xl mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PROPRIETARY FAIR-DISPATCH ENGINE</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
          How V Foods Guarantees Fresh Food Without Overwhelming Kitchens
        </h3>
        <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
          Standard apps flood kitchens by printing orders instantly, leaving food sitting cold on counters.
          V Foods dynamically schedules preparation so dishes finish exactly 90 seconds before you arrive at the counter.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column: Interactive Dispatch Calculation */}
        <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dynamic Dispatch Simulator</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Formula Active
              </span>
            </div>

            {/* User Controls */}
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                  <span>When do you want your food?</span>
                  <span className="text-orange-600 font-bold text-sm">+{pickupMinutesAhead} minutes ahead</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 45].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setPickupMinutesAhead(mins)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        pickupMinutesAhead === mins
                          ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      +{mins} Mins ({mins === 15 ? 'Next Slot' : mins === 30 ? 'Lunch Break' : 'Class End'})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-2">Current Canteen Kitchen Traffic</span>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Kitchen traffic level">
                  <div
                    id={normalBacklogRadioId}
                    role="radio"
                    aria-checked={rushLevel === 'normal'}
                    tabIndex={0}
                    onClick={() => setRushLevel('normal')}
                    onKeyDown={e => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        setRushLevel('normal')
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      rushLevel === 'normal'
                        ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500/20'
                        : 'bg-slate-100/70 border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-900">Normal Flow</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">3 min grill backlog</p>
                  </div>
                  <div
                    id={rushBacklogRadioId}
                    role="radio"
                    aria-checked={rushLevel === 'rush'}
                    tabIndex={0}
                    onClick={() => setRushLevel('rush')}
                    onKeyDown={e => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        setRushLevel('rush')
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      rushLevel === 'rush'
                        ? 'bg-white border-orange-500 shadow-sm ring-1 ring-orange-500/20'
                        : 'bg-slate-100/70 border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold text-slate-900">1:00 PM Rush Hour</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">8 min grill backlog</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formula Visualization Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 font-mono text-xs space-y-2 shadow-xs">
              <div className="text-[11px] text-amber-700 font-semibold tracking-wide uppercase">Engine Calculation</div>
              <div className="text-slate-800 flex flex-wrap items-center gap-1.5 leading-relaxed">
                <span>Start Prep = Target (<span className="text-slate-900 font-bold">+{pickupMinutesAhead}m</span>)</span>
                <span>- PrepTime (<span className="text-orange-600 font-bold">{prepTime}m</span>)</span>
                <span>- Backlog (<span className="text-amber-600 font-bold">{backlogTime}m</span>)</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-sans">
                <span className="text-slate-500">Kitchen ticket fires:</span>
                <span className="text-emerald-700 font-bold">
                  {prepStartsInMinutes === 0
                    ? 'Immediately on Grill'
                    : `In ${prepStartsInMinutes} minutes (Holding in Queue)`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <span>
              <strong>Zero soggy food:</strong> Delaying ticket firing until lead time ensures dosas and rolls are cooked hot on-demand, never sitting under lamps.
            </span>
          </div>
        </div>

        {/* Right Column: Protected Walk-In Capacity Bar */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slot Allocation</span>
              <span className="text-xs font-semibold text-slate-600">15-Minute Windows</span>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Every 15-minute slot has hard limits to ensure counter walk-ins are never starved of food.
            </p>

            {/* Slot selector tabs */}
            <div className="space-y-2 mb-6">
              {slots.map((s, idx) => (
                <button
                  key={s.time}
                  onClick={() => setSelectedSlotIndex(idx)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    selectedSlotIndex === idx
                      ? 'bg-white border-orange-500 shadow-sm ring-1 ring-orange-500/20'
                      : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{s.time}</p>
                    <p className="text-[11px] text-slate-500">{s.appBooked}/{s.appCap} app orders placed</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      s.status === 'Slot Capped'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : s.status === 'Almost Full'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {s.status}
                  </span>
                </button>
              ))}
            </div>

            {/* Visual Capacity Split Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-2">
                <span>Active Slot ({activeSlot.time})</span>
                <span className="text-slate-500">40 Meals Max</span>
              </div>

              {/* Progress Bar with Split */}
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                <div
                  style={{ width: `${(activeSlot.appBooked / 40) * 100}%` }}
                  className="bg-orange-500 transition-all duration-300"
                  title="App Pre-orders"
                />
                <div
                  style={{ width: `${((activeSlot.appCap - activeSlot.appBooked) / 40) * 100}%` }}
                  className="bg-orange-200 transition-all duration-300"
                  title="Remaining App Allowance"
                />
                <div
                  style={{ width: `${(activeSlot.walkInReserved / 40) * 100}%` }}
                  className="bg-emerald-500/70 border-l border-emerald-400"
                  title="Protected Walk-In Quota"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                  <span className="text-slate-700">App Quota ({activeSlot.appBooked}/{activeSlot.appCap})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span className="text-emerald-800 font-semibold">15 Walk-Ins Reserved</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Even when 100% of app slots are booked out, physical counter queues never run out of food.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
