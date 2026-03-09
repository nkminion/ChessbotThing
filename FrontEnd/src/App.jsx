import { useState,useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard';
import './App.css'



function App() {
  const ChessGameRef = useRef(new Chess());
  const ChessGame = ChessGameRef.current;
  const [ChessPosition,SetChessPosition] = useState(ChessGame.fen());
  const [MoveFrom,SetMoveFrom] = useState('');
  const [OptionSquares,SetOptionSquares] = useState({});
  const [PromotionSquare, SetPromotionSquare] = useState(null);
  const [PendingMove, SetPendingMove] = useState(null);
  function OnPromotionPieceSelect(piece)
  {
    try
    {
      if (!piece)
      {
        SetPendingMove({});
        SetPromotionSquare('');
        SetMoveFrom('');
        console.log('Returning');
        return false;
      }
      const PromotedPiece = piece[1].toLowerCase()
      console.log('Parsed piece');
      ChessGame.move({
        from: PendingMove['from'],
        to: PendingMove['to'],
        promotion: PromotedPiece
      });
      console.log('Move Done');
      SetChessPosition(ChessGame.fen());
      SetPromotionSquare(null);
      SetPendingMove(null);
      SetMoveFrom('');
      SetOptionSquares({});
      return true;
    }
    catch
    {
      console.log('Error!');
    }
  }
  function GetMoveOptions(square)
  {
    const moves = ChessGame.moves({
      square: square,
      verbose: true
    });
    
    if (moves.length == 0)
    {
      SetOptionSquares({});
      return false;
    }

    const NewSquares = {};

    for (const move of moves)
    {
      NewSquares[move.to] = {
        background: ChessGame.get(move.to) && ChessGame.get(move.to)?.color !== ChessGame.get(square)?.color ? 'radial-gradient(circle, rgba(0,0,0,0.1) 85%, transparent 85%)' : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    }

    NewSquares[square] = {
      background: 'rgba(0,0,255,0.4)'
    };

    SetOptionSquares(NewSquares);

    return true;
  }
  function OnSquareClick({square})
  {
    if (PromotionSquare)
    {
      return;
    }
    if (!MoveFrom)
    {
      const HasMoveOptions = GetMoveOptions(square);
      if (HasMoveOptions)
      {
        SetMoveFrom(square);
      }
      return;
    }
    const moves = ChessGame.moves({
      square: MoveFrom,
      verbose: true
    });
    const FoundMove = moves.find(m => m.from === MoveFrom && m.to === square);

    if (!FoundMove)
    {
      const HasMoveOptions = GetMoveOptions(square);
      SetMoveFrom(HasMoveOptions ? square : '');
      return;
    }
    try
    {
      const piece = ChessGame.get(MoveFrom)
      console.log('Piece: ',piece.type);
      console.log('Square: ',square[1]);
      if (piece && piece.type === 'p' && (square[1] === '1' || square[1] === '8'))
      {
        SetPendingMove({
          from: MoveFrom,
          to: square
        });
        SetPromotionSquare(square);
        return;
      }
      ChessGame.move({
        from: MoveFrom,
        to: square,
      });
    }
    catch
    {
      const HasMoveOptions = GetMoveOptions(square);
      if (HasMoveOptions)
      {
        SetMoveFrom(square);
      }
      return;
    }
    SetChessPosition(ChessGame.fen());
    SetMoveFrom('');
    SetOptionSquares({});
  }
  const ChessBoardOptions = {
    boardStyle: {
      width: '75%',
      height: '75%',
    },
    darkSquareStyle: {
      backgroundColor: '#5A5A5A'
    },
    darkSquareNotationStyle: {
      color: '#CDCDCD'
    },
    lightSquareStyle: {
      backgroundColor: '#CDCDCD'
    },
    lightSquareNotationStyle: {
      color: '#5A5A5A'
    },
    allowDragging: false,
    onSquareClick: OnSquareClick,
    position: ChessPosition,
    squareStyles: OptionSquares,
    onPromotionPieceSelect: OnPromotionPieceSelect,
    promotionToSquare: PromotionSquare,
    showPromotionDialog: Boolean(PromotionSquare)
  };
  return (
    <>
      <Chessboard options={ChessBoardOptions}/>
    </>
  );
}

export default App