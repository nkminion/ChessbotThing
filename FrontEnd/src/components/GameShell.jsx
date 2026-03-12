import { BoardViewport } from './BoardViewport.jsx'
import { EndScreen } from './EndScreen.jsx'
import { GameHUD } from './GameHUD.jsx'
import { MatchSidebar } from './MatchSidebar.jsx'
import { PromotionModal } from './PromotionModal.jsx'
import { SetupScreen } from './SetupScreen.jsx'
import { useChessGame } from '../hooks/useChessGame.js'

export function GameShell() {
  const { state, derived, actions } = useChessGame()

  if (state.phase === 'setup') {
    return <SetupScreen state={state} actions={actions} canStart={derived.canStart} />
  }

  return (
    <div className="game-shell">
      <div className="match-layout">
        <GameHUD state={state} actions={actions} />
        <BoardViewport state={state} actions={actions} squareStyles={derived.squareStyles} />
        <MatchSidebar state={state} actions={actions} />
      </div>
      <PromotionModal pendingPromotion={state.pendingPromotion} onSelect={actions.handlePromotion} />
      {state.phase === 'end' ? <EndScreen state={state} actions={actions} /> : null}
    </div>
  )
}
