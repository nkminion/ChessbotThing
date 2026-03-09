import chess
import chess.pgn
import torch
import torch.nn as nn
import torch.nn.functional as f
import time
import chess.polyglot

if torch.cuda.is_available():
	print("PyTorch is using the GPU")
	GPUCount = torch.cuda.device_count()
	print(f"Found {GPUCount} GPUs")

	for i in range(GPUCount):
		print(f"GPU {i} found: {torch.cuda.get_device_name(i)}")

	device = torch.device("cuda:0")
	MaxBatchSize = 1024
else:
	print("PyTorch is using the CPU")
	device = torch.device("cpu")
	MaxBatchSize = 64

print(f"Selected Device: {device}")

class SearchAborted(Exception):
	pass

class SEBlock(nn.Module):
	def __init__(self,channels,reduction=16):
		super().__init__()
		self.squeeze = nn.AdaptiveAvgPool2d(1)
		self.excite = nn.Sequential(
			nn.Linear(channels,channels//reduction,bias=False),
			nn.SiLU(inplace=True),
			nn.Linear(channels//reduction,channels,bias=False),
			nn.Sigmoid()
		)

	def forward(self,x):
		b,c,_,_ = x.size()
		y = self.squeeze(x).view(b,c)
		y = self.excite(y).view(b,c,1,1)
		return x * y.expand_as(x)

class ResidualBlock(nn.Module):
	def __init__(self,NumChannels):
		super().__init__()
		self.conv1 = nn.Conv2d(NumChannels,NumChannels,kernel_size=3,padding=1)
		self.bn1 = nn.BatchNorm2d(NumChannels)

		self.conv2 = nn.Conv2d(NumChannels,NumChannels,kernel_size=3,padding=1)
		self.bn2 = nn.BatchNorm2d(NumChannels)

		self.se = SEBlock(NumChannels)

	def forward(self,x):
		residual = x
		
		x = f.silu(self.bn1(self.conv1(x)))

		x = self.bn2(self.conv2(x))

		x = self.se(x)

		x += residual

		return f.silu(x)
	
class ChessNet(nn.Module):
	def __init__(self):
		super().__init__()

		self.ConvInput = nn.Conv2d(in_channels=16,out_channels=256,kernel_size=3,padding=1)
		self.BnInput = nn.BatchNorm2d(256)

		self.ResTower = nn.Sequential(*[ResidualBlock(256) for _ in range(10)])

		self.ConvValue = nn.Conv2d(in_channels=256,out_channels=32,kernel_size=1)
		self.BnValue = nn.BatchNorm2d(32)

		self.flat = nn.Flatten()

		self.fc1 = nn.Linear(32*8*8,256)
		self.fc2 = nn.Linear(256,1)

		self.PST = nn.Parameter(torch.randn(1,16,8,8)*0.01)

	def forward(self,x):
		RawBoard = x
		x = f.silu(self.BnInput(self.ConvInput(x)))

		x = self.ResTower(x)

		x = f.silu(self.BnValue(self.ConvValue(x)))
		x = self.flat(x)
		x = f.silu(self.fc1(x))

		ComplexEval = torch.tanh(self.fc2(x))

		SpatialEval = torch.sum(RawBoard*self.PST,dim=(1,2,3)).view(-1,1)

		return ComplexEval+SpatialEval
	
model = ChessNet()
model.to(device)
model.load_state_dict(torch.load('ChessModel.pth',map_location=device)['ModelState'])
model.eval()

class ChessBot:
	def __init__(self):
		self.ChessBoard = chess.Board()
		self.EvalCache = {}
		self.MVVLVALookup = [[0,0,0,0,0,0,0],
						[0,9,29,29,49,89,0],
						[0,7,27,27,47,87,0],
						[0,7,27,27,47,87,0],
						[0,5,25,25,45,85,0],
						[0,1,21,21,41,81,0],
						[0,1,21,21,41,81,0]
						]
		self.BotTimeLeft = 600
		self.Increment = 5

	def ProcessChessData(self,FENString):
		tensor = torch.zeros((16,8,8), dtype=torch.float32)
		board = chess.Board(FENString)

		PieceToLayer = {
			'P':0,'N':1,'B':2,'R':3,'Q':4,'K':5,
			'p':6,'n':7,'b':8,'r':9,'q':10,'k':11
		}

		for square in chess.SQUARES:
			piece = board.piece_at(square)

			if piece:
				symbol = piece.symbol()
				layer = PieceToLayer[symbol]

				row = 7-(square//8)
				col = square%8

				tensor[layer,row,col] = 1.0

		if board.turn == chess.WHITE:
			tensor[12,:,:] = 1.0

		if board.has_kingside_castling_rights(chess.WHITE):
			tensor[13,7,7] = 1.0
		if board.has_queenside_castling_rights(chess.WHITE):
			tensor[13,7,0] = 1.0
		if board.has_kingside_castling_rights(chess.BLACK):
			tensor[13,0,7] = 1.0
		if board.has_queenside_castling_rights(chess.BLACK):
			tensor[13,0,0] = 1.0

		for i in range(8):
			tensor[14,i,:] = (1.0/7)*(i)
			tensor[15,:,i] = (1.0/7)*(i)

		return tensor

	def MoveSort(self,move,board):
		if move.promotion is not None:
			return 100
		elif board.is_en_passant(move):
			return 9
		elif board.is_capture(move):
			return self.MVVLVALookup[board.piece_at(move.from_square).piece_type][board.piece_at(move.to_square).piece_type]
		else:
			return 0
		
	def EvalNetwork(self,board,depth):
		fen = board.fen().split()
		fen = ' '.join(fen[:4])
		if fen in self.EvalCache:
			return self.EvalCache[fen]
		
		if board.is_checkmate():
			return -(9999.0+depth) if board.turn == chess.WHITE else (9999.0+depth)
		if board.is_game_over():
			return 0.0
		
		tensor = self.ProcessChessData(fen)

		score = yield tensor

		self.EvalCache[fen] = score

		return score

	def QuiscenceSearch(self,board,alpha,beta,MaximisingPlayer,MaxTime):
		StandPat = yield from self.EvalNetwork(board,0)

		if MaximisingPlayer:
			if StandPat > beta:
				return beta
		
			elif StandPat > alpha:
				alpha = StandPat
		else:
			if StandPat < alpha:
				return alpha
			
			elif StandPat < beta:
				beta = StandPat

		ChaoticMoves = []

		for move in board.legal_moves:
			if board.is_en_passant(move) or board.is_capture(move) or move.promotion is not None:
				ChaoticMoves.append(move)

		ChaoticMoves = sorted(ChaoticMoves,key=lambda m: self.MoveSort(m,board),reverse=True)

		if MaximisingPlayer:
			MaxEval = StandPat
			for move in ChaoticMoves:
				self.NodeCount += 1
				if (self.NodeCount % 1024 == 0):
					if (time.time()-self.StartTime) > MaxTime:
						raise SearchAborted
				board.push(move)
				EvalScore = yield from self.QuiscenceSearch(board,alpha,beta,False,MaxTime)
				board.pop()

				MaxEval = max(MaxEval,EvalScore)
				alpha = max(alpha,MaxEval)

				if beta<=alpha:
					break
			return MaxEval
		else:
			MinEval = StandPat
			for move in ChaoticMoves:
				self.NodeCount += 1
				if (self.NodeCount % 1024 == 0):
					if (time.time()-self.StartTime) > MaxTime:
						raise SearchAborted
				board.push(move)
				EvalScore = yield from self.QuiscenceSearch(board,alpha,beta,True,MaxTime)
				board.pop()

				MinEval = min(MinEval,EvalScore)
				beta = min(beta,EvalScore)

				if beta <= alpha:
					break

			return MinEval
		
	def minimax(self,board,depth,alpha,beta,MaximisingPlayer,CurrentPly,MaxTime):
		if board.is_game_over() or board.can_claim_draw():
			return (yield from self.EvalNetwork(board,depth))
		
		if depth == 0:
			return (yield from self.QuiscenceSearch(board,alpha,beta,MaximisingPlayer,MaxTime))
		
		if MaximisingPlayer:
			MaxEval = -float('inf')
			for move in sorted(board.legal_moves,key=lambda m: self.MoveSort(m,board),reverse=True):
				self.NodeCount += 1
				if (self.NodeCount % 1024 == 0):
					if (time.time()-self.StartTime) > MaxTime:
						raise SearchAborted
				board.push(move)
				NextPly = CurrentPly+1 if board.is_check() and CurrentPly <= 15 else CurrentPly
				NextDepth = depth if board.is_check() and CurrentPly <= 15 else depth-1
				EvalScore = yield from self.minimax(board,NextDepth,alpha,beta,False,NextPly,MaxTime)
				board.pop()

				MaxEval = max(MaxEval,EvalScore)
				alpha = max(alpha,EvalScore)

				if beta <= alpha:
					break

			return MaxEval
		
		else:
			MinEval = float('inf')
			for move in sorted(board.legal_moves,key=lambda m: self.MoveSort(m,board),reverse=True):
				self.NodeCount += 1
				if (self.NodeCount % 1024 == 0):
					if (time.time()-self.StartTime) > MaxTime:
						raise SearchAborted
				board.push(move)
				NextPly = CurrentPly+1
				NextDepth = depth if board.is_check() and CurrentPly <= 15 else depth-1
				EvalScore = yield from self.minimax(board,NextDepth,alpha,beta,True,NextPly,MaxTime)
				board.pop()

				MinEval = min(MinEval,EvalScore)
				beta = min(beta,EvalScore)

				if beta <= alpha:
					break

			return MinEval
		
	def BatchedSearchRoot(self,board,depth,MaximisingPlayer,PreviousBestMove,MaxTime):
		ActiveRoster = []
		WaitingTensors = []
		WaitingBranches = []
		FinalScores = {}

		OrderedMoves = sorted(board.legal_moves,key=lambda m: self.MoveSort(m,board),reverse=True)
		
		if PreviousBestMove in OrderedMoves:
			OrderedMoves.remove(PreviousBestMove)
			OrderedMoves.insert(0,PreviousBestMove)

		for move in OrderedMoves:
			board.push(move)

			gen = self.minimax(board.copy(),depth-1,-float('inf'),float('inf'),not MaximisingPlayer,1,MaxTime)
			ActiveRoster.append({'move':move,'gen':gen,'next':None})
			
			board.pop()

		while ActiveRoster or WaitingTensors:
			for branch in ActiveRoster:
				try:
					tensor = branch['gen'].send(branch['next'])

					WaitingTensors.append(tensor)
					WaitingBranches.append(branch)
				except StopIteration as e:
					FinalScores[branch['move']] = e.value
			
			ActiveRoster = []

			if len(WaitingTensors) >= MaxBatchSize or (WaitingTensors and not ActiveRoster):
				BatchedTensor = torch.stack(WaitingTensors,dim=0).to(device)

				with torch.no_grad():
					scores = model(BatchedTensor)

				for i in range(len(WaitingBranches)):
					branch = WaitingBranches[i]
					
					branch['next'] = scores[i].item()

					ActiveRoster.append(branch)

				WaitingTensors = []
				WaitingBranches = []

		if MaximisingPlayer:
			BestMove = max(FinalScores,key=FinalScores.get)
		else:
			BestMove = min(FinalScores,key=FinalScores.get)

		return BestMove,FinalScores[BestMove]

	def IterativeDeepeningSearch(self,board,MaxTime,MaxDepth,MaximisingPlayer):
		self.StartTime = time.time()
		AbsoluteBestMove = list(board.legal_moves)[0]
		self.NodeCount = 0

		for CurrentDepth in range(1,MaxDepth+1):
			try:
				MoveCandidate,Score = self.BatchedSearchRoot(board,CurrentDepth,MaximisingPlayer,AbsoluteBestMove,MaxTime)

				AbsoluteBestMove = MoveCandidate
			except SearchAborted:
				print(f'Time Limit reached! Depth: {CurrentDepth}')
				break

		return AbsoluteBestMove

	def GetBookMove(self,board):
		try:
			with chess.polyglot.open_reader('polyglot.bin') as book:
				entry = book.weighted_choice(board)
				return entry.move
		except IndexError:
			return None
		
	def CalculateMaxTime(self,RemainingTime,Increment):
		MovesToAssume = 40.0

		TargetTime = (RemainingTime/MovesToAssume) + Increment

		AbsoluteMax = (RemainingTime * 0.8) - 0.1
		FinalTime = min(TargetTime,AbsoluteMax)

		return max(FinalTime,0.1)
	

GlobalBot = ChessBot()
def GetBestMove(FenString: str, TimeRem: float, Increment: float) -> str:
	GlobalBot.ChessBoard.set_fen(FenString)
	Move = GlobalBot.GetBookMove(GlobalBot.ChessBoard)
	if Move:
		return Move.uci()
	MaxTime = GlobalBot.CalculateMaxTime(TimeRem,Increment)
	IsWhite = GlobalBot.ChessBoard.turn == chess.WHITE
	Move = GlobalBot.IterativeDeepeningSearch(
		board=GlobalBot.ChessBoard,
		MaxTime=MaxTime,
		MaxDepth=100,
		MaximisingPlayer=IsWhite
	)
	print('Returning move')
	return Move.uci()