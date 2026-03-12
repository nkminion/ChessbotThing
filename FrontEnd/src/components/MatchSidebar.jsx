function buildRows(moveHistory) {
  const rows = []
  for (let index = 0; index < moveHistory.length; index += 2) {
    rows.push({
      moveNumber: Math.floor(index / 2) + 1,
      white: moveHistory[index] ?? null,
      black: moveHistory[index + 1] ?? null,
    })
  }
  return rows
}

export function MatchSidebar({ state, actions }) {
  const rows = buildRows(state.moveHistory)
  const latestIndex = state.moveHistory.length - 1

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-card">
        <div className="history-header">
          <span className="eyebrow">Move History</span>
          <strong>{state.moveHistory.length ? `${rows.length} moves` : 'No moves yet'}</strong>
        </div>
        <div className="history-grid">
          <div className="history-grid__head">#</div>
          <div className="history-grid__head">White</div>
          <div className="history-grid__head">Black</div>
          {rows.map((row, rowIndex) => {
            const whiteIndex = rowIndex * 2
            const blackIndex = whiteIndex + 1
            return (
              <div className="history-grid__row" key={row.moveNumber}>
                <span className="history-grid__cell history-grid__cell--muted">{row.moveNumber}.</span>
                <span className={`history-grid__cell ${whiteIndex === latestIndex ? 'history-grid__cell--latest' : ''}`}>
                  {row.white?.san ?? '...'}
                </span>
                <span className={`history-grid__cell ${blackIndex === latestIndex ? 'history-grid__cell--latest' : ''}`}>
                  {row.black?.san ?? '...'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
