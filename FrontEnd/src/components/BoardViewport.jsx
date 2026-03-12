import { Board2D } from './boards/Board2D.jsx'
import { formatTime, getPlayerLabel } from '../lib/chessUi.js'

function PlayerBar({ side, player, time, isActive }) {
  return (
    <div className={`board-player ${isActive ? 'board-player--active' : ''}`}>
      <div className="board-player__identity">
        <div className={`board-player__avatar board-player__avatar--${side}`} />
        <div className="board-player__text">
          <strong>{player.name}</strong>
          <span>{getPlayerLabel(player)}</span>
        </div>
      </div>
      <div className="board-player__clock">{formatTime(time)}</div>
    </div>
  )
}

export function BoardViewport({ state, actions, squareStyles }) {
  const activeSide = state.phase === 'end' ? null : state.positionFen.split(' ')[1] === 'w' ? 'white' : 'black'

  return (
    <section className="viewport-shell">
      <div className="viewport-frame">
        <PlayerBar
          side="black"
          player={state.players.black}
          time={state.blackTime}
          isActive={activeSide === 'black'}
        />
        <Board2D state={state} actions={actions} squareStyles={squareStyles} />
        <PlayerBar
          side="white"
          player={state.players.white}
          time={state.whiteTime}
          isActive={activeSide === 'white'}
        />
      </div>
    </section>
  )
}
