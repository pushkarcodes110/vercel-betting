export function LoaderOverlay({ active, text = 'Loading...' }: { active: boolean; text?: string }) {
  return (
    <div className={`loader-overlay ${active ? 'active' : ''}`}>
      <div className="flex flex-col items-center gap-5">
        <div className="loader">
          <div className="box1" />
          <div className="box2" />
          <div className="box3" />
        </div>
        <div className="text-white text-base font-medium">{text}</div>
      </div>
    </div>
  )
}
