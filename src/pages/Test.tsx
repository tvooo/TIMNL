// Calibration screen: the panel's grey levels and how text lands on them
// at different sizes, weights, colours and fractional pixel offsets.

const LEVELS = [0, 85, 170, 255]
// Written out in full so Tailwind finds the classes
const GRAYS = [
  { name: '900', bg: 'bg-gray-900', text: 'text-gray-900' },
  { name: '700', bg: 'bg-gray-700', text: 'text-gray-700' },
  { name: '600', bg: 'bg-gray-600', text: 'text-gray-600' },
  { name: '500', bg: 'bg-gray-500', text: 'text-gray-500' },
  { name: '400', bg: 'bg-gray-400', text: 'text-gray-400' },
  { name: '300', bg: 'bg-gray-300', text: 'text-gray-300' },
]
const SIZES = [10, 12, 13, 14, 16, 18, 20]
const WEIGHTS = [300, 400, 500, 600, 700]
const OFFSETS = [0, 0.25, 0.5, 0.75]
const SAMPLE = 'Ag 21:00 Bü'

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] leading-3 text-black whitespace-nowrap">{children}</div>
)

export function Test() {
  return (
    <div className="h-full p-2 flex flex-col gap-2 text-black">
      {/* Panel levels, a full ramp and the Tailwind greys the pages use */}
      <div className="flex gap-2 items-end">
        {LEVELS.map(v => (
          <div key={v}>
            <div className="w-10 h-10 border border-black" style={{ background: `rgb(${v},${v},${v})` }} />
            <Label>{v}</Label>
          </div>
        ))}
        <div>
          <div className="flex h-10 border border-black">
            {Array.from({ length: 48 }, (_, i) => {
              const v = Math.round((i / 47) * 255)
              return <div key={i} className="w-1" style={{ background: `rgb(${v},${v},${v})` }} />
            })}
          </div>
          <Label>0 → 255</Label>
        </div>
        {GRAYS.map(g => (
          <div key={g.name}>
            <div className={`w-8 h-10 border border-black ${g.bg}`} />
            <Label>{g.name}</Label>
          </div>
        ))}
      </div>

      {/* Sizes × weights */}
      <div className="grid grid-cols-[32px_repeat(5,1fr)] items-baseline gap-x-2">
        <span />
        {WEIGHTS.map(w => <Label key={w}>{w}</Label>)}
        {SIZES.map(size => (
          <div key={size} className="contents">
            <Label>{size}px</Label>
            {WEIGHTS.map(w => (
              <div key={w} className="whitespace-nowrap overflow-hidden" style={{ fontSize: size, fontWeight: w }}>
                {SAMPLE}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Text colours */}
      <div className="flex gap-4 text-sm items-baseline">
        <Label>14px</Label>
        <span className="text-black">black</span>
        {GRAYS.map(g => <span key={g.name} className={g.text}>gray-{g.name}</span>)}
      </div>

      {/* Fractional offsets: text and 1px lines shifted by quarter pixels */}
      <div className="grid grid-cols-[32px_repeat(4,1fr)] gap-x-2 gap-y-1 items-center">
        <span />
        {OFFSETS.map(o => <Label key={o}>+{o}px</Label>)}
        {[12, 14, 16].map(size => (
          <div key={size} className="contents">
            <Label>{size}px x</Label>
            {OFFSETS.map(o => (
              <div key={o} className="relative whitespace-nowrap" style={{ fontSize: size, left: o }}>
                until 22:00 lll
              </div>
            ))}
          </div>
        ))}
        <Label>14px y</Label>
        {OFFSETS.map(o => (
          <div key={o} className="relative whitespace-nowrap text-sm" style={{ top: o }}>
            until 22:00 lll
          </div>
        ))}
        <Label>lines</Label>
        {OFFSETS.map(o => (
          <div key={o} className="relative h-5 flex gap-1" style={{ left: o }}>
            {[0.5, 1, 1.5, 2].map(w => <div key={w} className="bg-black" style={{ width: w }} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
