import { Keywords } from 'src/config';
import { RecvdRes } from 'src/recvd/recvd.service';

enum QiZi {
  O = '〇',
  X = 'X ',
  Null = '    ',
}

const { O, X, Null } = QiZi;

export class JingZiQiService {
  running: boolean = false;
  currentPlayer: QiZi;
  gameBoard: QiZi[][];

  parseText(text: string): RecvdRes {
    if (text.includes(Keywords.StartJingZiQi)) {
      return this.startGame();
    }
    if (text.includes(Keywords.StopJingZiQi)) {
      return this.stopGame();
    }
    const coordinate = text.match(/[a-cA-C1-3]{2}/)?.[0];
    if (coordinate) {
      if (this.running) return this.turn(coordinate.toLowerCase());
    }
    return { success: false };
  }

  render() {
    const b = this.gameBoard;
    const turn = `轮到 ${this.currentPlayer} 方下棋`;
    const gameBoard = [
      `# # 1 # 2 # 3 #`,
      `# ╔═╦═╦═╗`,
      `A ║${b[0][0]}║${b[0][1]}║${b[0][2]}║`,
      `# ╠═╬═╬═╣`,
      `B ║${b[1][0]}║${b[1][1]}║${b[1][2]}║`,
      `# ╠═╬═╬═╣`,
      `C ║${b[2][0]}║${b[2][1]}║${b[2][2]}║`,
      `# ╚═╩═╩═╝`,
    ].join('\n');
    return {
      turn,
      gameBoard,
      full: [turn, gameBoard].join('\n'),
    };
  }

  startGame(): RecvdRes {
    this.clearBoard();
    if (this.running === true) {
      return {
        success: true,
        data: {
          content: ['井字棋游戏进行中', this.render().full].join('\n'),
        },
      };
    }
    this.running = true;
    return {
      success: true,
      data: {
        content: ['开始井字棋游戏', this.render().full].join('\n'),
      },
    };
  }

  stopGame(): RecvdRes {
    this.clearBoard()
    if (this.running === false) {
      return { success: true, data: { content: '没有进行中的游戏' } };
    }
    this.running = false;
    return {
      success: true,
      data: { content: '已结束井字棋游戏' },
    };
  }

  clearBoard() {
    this.currentPlayer = O;
    this.gameBoard = [
      [Null, Null, Null],
      [Null, Null, Null],
      [Null, Null, Null],
    ];
  }

  turn(coordinate: string): RecvdRes {
    const x = coordinate.replace(/[1-3]/, '').charCodeAt(0) - 'a'.charCodeAt(0);
    const y = Number(coordinate.replace(/[a-z]/, '')) - 1;
    if (this.gameBoard[x][y] !== Null)
      return {
        success: true,
        data: {
          content: [`该位置已有棋子， 请重下棋子`, this.render().full].join(
            '\n',
          ),
        },
      };
    this.gameBoard[x][y] = this.currentPlayer;
    if (this.currentPlayer === O) {
      this.currentPlayer = X;
    } else {
      this.currentPlayer = O;
    }
    const { success, player } = this.checkSuccess();
    if (success) {
      this.clearBoard();
      return {
        success: true,
        data: {
          content: [`棋局结束， ${player} 获胜`, this.render().gameBoard].join(
            '\n',
          ),
        },
      };
    }
    if (this.checkFullBoard()) {
      this.clearBoard();
      return {
        success: true,
        data: {
          content: [`棋盘已满， 平局`, this.render().gameBoard].join('\n'),
        },
      };
    }

    return {
      success: true,
      data: {
        content: this.render().full,
      },
    };
  }

  checkSuccess(): { success: boolean; player?: QiZi } {
    const board = this.gameBoard;
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        const item = board[i][j];
        if (item === Null) continue;

        let top = board[i]?.[j - 1];
        let bottom = board[i]?.[j + 1];
        let left = board[i - 1]?.[j];
        let right = board[i + 1]?.[j];
        let topLeft = board[i - 1]?.[j - 1];
        let topRight = board[i + 1]?.[j - 1];
        let bottomLeft = board[i - 1]?.[j + 1];
        let bottomRight = board[i + 1]?.[j + 1];

        if (new Set([item, top, bottom]).size === 1)
          return { success: true, player: item };
        if (new Set([item, left, right]).size === 1)
          return { success: true, player: item };
        if (new Set([item, topLeft, bottomRight]).size === 1)
          return { success: true, player: item };
        if (new Set([item, topRight, bottomLeft]).size === 1)
          return { success: true, player: item };
      }
    }
    return { success: false };
  }

  checkFullBoard(): boolean {
    const qiZiSet = new Set();
    this.gameBoard.forEach((row) => {
      row.forEach((qiZi) => {
        qiZiSet.add(qiZi);
      });
    });
    return !qiZiSet.has(Null);
  }
}
