export function EndScreen({ state, actions }) {
  return (
    <div className="result-overlay">
      <div className="result-card">
        <span className="eyebrow">Match Complete</span>
        <h2>{state.resultMessage}</h2>
        <p>
          Review the final position in 3D or 2D, then restart the game or head
          back to setup to configure a fresh matchup.
        </p>
        <div className="result-actions">
          <button type="button" className="button button--hero" onClick={actions.restartGame}>
            Play Again
          </button>
          <button type="button" className="button" onClick={actions.returnToSetup}>
            Back to Setup
          </button>
          <button type="button" className="button button--ghost" onClick={actions.exportPgn}>
            Save PGN
          </button>
        </div>
      </div>
    </div>
  )
}
