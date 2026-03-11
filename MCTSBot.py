import time
import random
import math
import chess

# =========================
# Config (inlined from Chess_MCTS_AI)
# =========================

UCT_C = 1.41421356237
MAX_MCTS_ITER = 100_000
MAX_ROLLOUT_DEPTH = 40

PIECE_VALUES = {
    chess.PAWN: 1.0,
    chess.KNIGHT: 3.0,
    chess.BISHOP: 3.2,
    chess.ROOK: 5.0,
    chess.QUEEN: 9.0,
    chess.KING: 0.0,
}

PAWN_TABLE = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
]
KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
]
BISHOP_TABLE = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
]
ROOK_TABLE = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
]
QUEEN_TABLE = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
]
KING_MIDDLE_TABLE = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
]

PIECE_TABLES = {
    chess.PAWN: PAWN_TABLE,
    chess.KNIGHT: KNIGHT_TABLE,
    chess.BISHOP: BISHOP_TABLE,
    chess.ROOK: ROOK_TABLE,
    chess.QUEEN: QUEEN_TABLE,
    chess.KING: KING_MIDDLE_TABLE,
}

_CENTER_SQUARES = frozenset({
    chess.D4, chess.D5, chess.E4, chess.E5,
    chess.C3, chess.C4, chess.C5, chess.C6,
    chess.D3, chess.D6, chess.E3, chess.E6,
    chess.F3, chess.F4, chess.F5, chess.F6,
})

# =========================
# Evaluation
# =========================

def terminal_score(board: chess.Board, maximising_color: chess.Color):
    outcome = board.outcome(claim_draw=True)
    if outcome is None:
        return None
    if outcome.winner is None:
        return 0.0
    return 1.0 if outcome.winner == maximising_color else -1.0


def _piece_positional_value(board: chess.Board, color: chess.Color) -> float:
    score = 0.0
    for piece_type in chess.PIECE_TYPES:
        table = PIECE_TABLES.get(piece_type, [])
        mat = PIECE_VALUES.get(piece_type, 0.0)
        for sq in board.pieces(piece_type, color):
            score += mat * 10
            if table:
                tbl_idx = sq if color == chess.WHITE else chess.square_mirror(sq)
                score += table[tbl_idx] * 0.1
    return score


def static_eval(board: chess.Board, maximising_color: chess.Color) -> float:
    ts = terminal_score(board, maximising_color)
    if ts is not None:
        return ts

    own_score = _piece_positional_value(board, maximising_color)
    opp_score = _piece_positional_value(board, not maximising_color)
    mat_score = own_score - opp_score

    own_turn = board.turn == maximising_color
    own_moves = board.legal_moves.count() if own_turn else 0
    board.push(chess.Move.null())
    opp_moves = board.legal_moves.count()
    board.pop()
    mob_score = (own_moves - opp_moves) * 0.05

    check_bonus = 0.0
    if board.is_check():
        check_bonus = 0.5 if board.turn != maximising_color else -0.5

    raw = mat_score + mob_score + check_bonus
    return float(math.tanh(raw / 40.0))


def score_move(board: chess.Board, move: chess.Move) -> float:
    s = 0.0
    piece = board.piece_at(move.from_square)
    if piece is None:
        return s

    victim = board.piece_at(move.to_square)
    if victim is not None:
        attacker_val = PIECE_VALUES.get(piece.piece_type, 0.0)
        victim_val = PIECE_VALUES.get(victim.piece_type, 0.0)
        s += victim_val * 10 - attacker_val

    if move.promotion is not None:
        s += PIECE_VALUES.get(move.promotion, 0.0) * 5

    board.push(move)
    if board.is_check():
        s += 3.0
    board.pop()

    if move.to_square in _CENTER_SQUARES:
        s += 0.5

    return s


def order_moves(board: chess.Board):
    moves = list(board.legal_moves)
    if not moves:
        return []
    scores = [score_move(board, m) for m in moves]
    paired = sorted(zip(scores, moves), key=lambda x: -x[0])
    return [m for _, m in paired]

# =========================
# Rollout policy
# =========================

def _weighted_choice(board: chess.Board) -> chess.Move:
    moves = list(board.legal_moves)
    if not moves:
        raise ValueError("No legal moves")
    if len(moves) == 1:
        return moves[0]

    weights = [max(0.1, score_move(board, m) + 1.0) for m in moves]
    total = sum(weights)
    r = random.random() * total
    cumul = 0.0
    for move, w in zip(moves, weights):
        cumul += w
        if r <= cumul:
            return move
    return moves[-1]


def rollout(board: chess.Board, maximising_color: chess.Color) -> float:
    sim_board = board.copy(stack=False)
    move_count = 0
    seen_fens = set()

    while move_count < MAX_ROLLOUT_DEPTH:
        ts = terminal_score(sim_board, maximising_color)
        if ts is not None:
            return ts

        fen_key = sim_board.fen(en_passant="fen")
        if fen_key in seen_fens:
            return 0.0
        if move_count % 4 == 0:
            seen_fens.add(fen_key)

        try:
            move = _weighted_choice(sim_board)
        except ValueError:
            break

        sim_board.push(move)
        move_count += 1

    return static_eval(sim_board, maximising_color)

# =========================
# MCTS core
# =========================

class Node:
    __slots__ = ("board", "move", "parent", "children", "untried_moves", "visits", "value")

    def __init__(self, board: chess.Board, move=None, parent=None, untried_moves=None):
        self.board = board
        self.move = move
        self.parent = parent
        self.children = []
        self.visits = 0
        self.value = 0.0
        self.untried_moves = untried_moves if untried_moves is not None else order_moves(board)

    @property
    def is_fully_expanded(self):
        return len(self.untried_moves) == 0

    @property
    def is_terminal(self):
        return self.board.is_game_over(claim_draw=True)

    def uct_score(self, parent_visits: int, c: float = UCT_C) -> float:
        if self.visits == 0:
            return float("inf")
        exploitation = self.value / self.visits
        exploration = c * math.sqrt(math.log(parent_visits) / self.visits)
        return exploitation + exploration

    def best_child(self, c: float = UCT_C):
        return max(self.children, key=lambda n: n.uct_score(self.visits, c))

    def most_visited_child(self):
        return max(self.children, key=lambda n: n.visits)

    def expand(self):
        move = self.untried_moves.pop(0)
        child_board = self.board.copy(stack=False)
        child_board.push(move)
        child = Node(board=child_board, move=move, parent=self)
        self.children.append(child)
        return child


def _select(node: Node) -> Node:
    while not node.is_terminal and node.is_fully_expanded:
        node = node.best_child(UCT_C)
    return node


def _expand(node: Node) -> Node:
    if node.is_terminal or node.is_fully_expanded:
        return node
    return node.expand()


def _simulate(node: Node, maximising_color: chess.Color) -> float:
    ts = terminal_score(node.board, maximising_color)
    if ts is not None:
        return ts
    return rollout(node.board, maximising_color)


def _backpropagate(node: Node, result: float, maximising_color: chess.Color) -> None:
    current = node
    while current is not None:
        current.visits += 1
        if current.board.turn == maximising_color:
            current.value += result
        else:
            current.value += (1.0 - result) if result >= 0 else -result
        current = current.parent


def run_mcts(root: Node, think_time: float, maximising_color: chess.Color) -> int:
    deadline = time.time() + think_time
    iteration = 0
    while time.time() < deadline and iteration < MAX_MCTS_ITER:
        leaf = _select(root)
        leaf = _expand(leaf)
        result = _simulate(leaf, maximising_color)
        _backpropagate(leaf, result, maximising_color)
        iteration += 1
    return iteration


def choose_best_move(board: chess.Board, think_time: float):
    legal = list(board.legal_moves)
    if not legal:
        return None
    if len(legal) == 1:
        return legal[0]

    root = Node(board=board.copy(stack=False))
    run_mcts(root, think_time, board.turn)

    if not root.children:
        ordered = order_moves(board)
        return ordered[0] if ordered else None

    return root.most_visited_child().move

# =========================
# Bot wrapper (same interface as ChessBot.py)
# =========================

class MCTSBot:
    def calculate_max_time(self, remaining_time: float, increment: float) -> float:
        moves_to_assume = 40.0
        target = (remaining_time / moves_to_assume) + increment
        absolute_max = (remaining_time * 0.8) - 0.1
        final_time = min(target, absolute_max)
        return max(final_time, 0.1)

    def get_best_move(self, fen: str, time_rem: float, increment: float) -> str:
        board = chess.Board(fen)
        if board.is_game_over(claim_draw=True):
            return "0000"
        think_time = self.calculate_max_time(float(time_rem), float(increment))
        move = choose_best_move(board, think_time)
        return move.uci() if move else "0000"


GlobalBot = MCTSBot()


def GetBestMove(FenString: str, TimeRem: float, Increment: float) -> str:
    return GlobalBot.get_best_move(FenString, TimeRem, Increment)
