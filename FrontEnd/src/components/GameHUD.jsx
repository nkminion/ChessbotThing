export function GameHUD({ state, actions }) {
  const activeSide = state.phase === 'end' ? null : state.positionFen.split(' ')[1] === 'w' ? 'white' : 'black'
  const activePlayer = activeSide ? state.players[activeSide] : null

  let statusLabel = 'Match Status'
  let statusPrimary = 'Awaiting move'
  let statusSecondary = 'Choose an action or make the next move.'

  if (state.engineError) {
    statusLabel = 'Engine Error'
    statusPrimary = 'Move request failed'
    statusSecondary = state.engineError
  } else if (state.resultMessage) {
    statusLabel = 'Game Complete'
    statusPrimary = state.resultMessage
    statusSecondary = 'Review the game, save the PGN, or start a new match.'
  } else if (state.isEngineThinking && activePlayer) {
    statusLabel = 'Engine Turn'
    statusPrimary = `${activePlayer.name} is thinking`
    statusSecondary = `${activePlayer.engine} is calculating the next move.`
  } else if (activePlayer) {
    statusLabel = 'Turn'
    statusPrimary = `${activePlayer.name} to move`
    statusSecondary =
      activePlayer.mode === 'human'
        ? 'Drag a piece or click a destination square.'
        : `${activePlayer.engine} will move automatically.`
  }

  return (
    <aside className="hud-shell">
      <div className="hud-center">
        <div className="hud-title">
          <span className="eyebrow">AI Chess Arena</span>
          <h1>Match Desk</h1>
        </div>

        <div className="status-banner">
          <span className="eyebrow">{statusLabel}</span>
          <strong>{statusPrimary}</strong>
          <p className={state.engineError ? 'status-banner__detail status-banner__detail--error' : 'status-banner__detail'}>
            {statusSecondary}
          </p>
        </div>

        <div className="control-row">
          <button type="button" className="button" onClick={actions.toggleOrientation}>
            Orient: {state.orientation === 'white' ? 'White' : 'Black'}
          </button>
          <button type="button" className="button" onClick={actions.restartGame}>
            Restart
          </button>
          <button type="button" className="button" onClick={actions.returnToSetup}>
            Setup
          </button>
          <button type="button" className="button" onClick={actions.exportPgn}>
            Save PGN
          </button>
        </div>
      </div>
    </aside>
  )
}
