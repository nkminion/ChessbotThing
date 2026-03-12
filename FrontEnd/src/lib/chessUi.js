import { Chess } from 'chess.js'

export function formatTime(totalMilliseconds) {
  const safeMilliseconds = Math.max(0, totalMilliseconds)
  const totalSeconds = safeMilliseconds / 1000

  if (totalSeconds < 10) {
    return totalSeconds.toFixed(1)
  }

  const wholeSeconds = Math.ceil(totalSeconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const seconds = String(wholeSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function isBotMode(mode) {
  return mode !== 'human'
}

export function getPlayerLabel(player) {
  return player.mode === 'human' ? 'Human' : player.engine
}

export function parseFenPieces(fen) {
  const [boardState] = fen.split(' ')
  const rows = boardState.split('/')
  const pieces = []

  rows.forEach((row, rowIndex) => {
    let file = 0
    for (const token of row) {
      if (!Number.isNaN(Number(token))) {
        file += Number(token)
        continue
      }

      const rank = 8 - rowIndex
      const square = `${String.fromCharCode(97 + file)}${rank}`
      pieces.push({
        square,
        color: token === token.toUpperCase() ? 'w' : 'b',
        type: token.toLowerCase(),
      })
      file += 1
    }
  })

  return pieces
}

export function buildSquareStyles({ lastMove, selectedSquare, legalTargets, checkSquare }) {
  const styles = {}

  if (lastMove) {
    styles[lastMove.from] = { background: 'rgba(244, 190, 90, 0.38)' }
    styles[lastMove.to] = { background: 'rgba(244, 190, 90, 0.38)' }
  }

  if (selectedSquare) {
    styles[selectedSquare] = { background: 'rgba(79, 166, 255, 0.55)' }
  }

  legalTargets.forEach((move) => {
    styles[move.to] = {
      background: move.captured
        ? 'radial-gradient(circle, rgba(255,103,103,0.26) 68%, rgba(255,103,103,0.82) 72%, transparent 74%)'
        : 'radial-gradient(circle, rgba(111,255,163,0.44) 0 26%, transparent 28%)',
      borderRadius: '50%',
    }
  })

  if (checkSquare) {
    styles[checkSquare] = {
      background: 'radial-gradient(circle, rgba(255,76,76,0.82) 0 36%, rgba(255,76,76,0.22) 70%, transparent 74%)',
    }
  }

  return styles
}

export function getCheckSquare(fen) {
  const board = new Chess(fen)
  if (!board.inCheck()) {
    return null
  }

  const turn = board.turn()
  const matrix = board.board()
  for (let rank = 0; rank < matrix.length; rank += 1) {
    for (let file = 0; file < matrix[rank].length; file += 1) {
      const piece = matrix[rank][file]
      if (piece?.type === 'k' && piece.color === turn) {
        return `${String.fromCharCode(97 + file)}${8 - rank}`
      }
    }
  }
  return null
}

export function getResultMessage(board, players, timeoutMessage = null) {
  if (timeoutMessage) {
    return timeoutMessage
  }

  if (board.isCheckmate()) {
    const winner = board.turn() === 'w' ? players.black.name : players.white.name
    return `Checkmate. ${winner} wins.`
  }

  if (board.isStalemate?.()) {
    return 'Draw by stalemate.'
  }

  if (board.isThreefoldRepetition?.()) {
    return 'Draw by repetition.'
  }

  if (board.isInsufficientMaterial()) {
    return 'Draw by insufficient material.'
  }

  if (board.isDrawByFiftyMoves?.()) {
    return 'Draw by fifty-move rule.'
  }

  if (board.isDraw()) {
    return 'Game drawn.'
  }

  return 'Game over.'
}

export function downloadPgn({ board, whiteName, blackName, result }) {
  const pgn = board.pgn({
    newline: '\n',
    headers: {
      White: whiteName,
      Black: blackName,
      Date: new Date().toISOString().split('T')[0],
      Result: result,
    },
  })

  const blob = new Blob([pgn], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${whiteName}-vs-${blackName}.pgn`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
