import { addMoney } from 'src/money';
import { getSaveDataByUser } from 'src/saveData';
import { sendMsgToWx, waitTime } from 'src/utils';
import { RecvdRes } from 'src/utils/type';
import { Keywords as GlobalKeywords } from 'src/config';

const pokerTypeList = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
] as const;
interface Poker {
  poker: (typeof pokerTypeList)[number];
  point: number;
}
type RunningStep = 'stop' | 'waitUserB' | 'betting' | 'turning';

const Keywords = {
  PalyWithBot: '和机器人玩',
  JoinGame: '加入游戏',
  DealCard: '发牌',
  StopCard: '停牌',
  Bet: '赌注',
  StartDirectly: '直接开始',
};
const botName = '木小博士';
const maxSinglePokerPoint = 10;
const maxBet = 9999999;
export class TwentyOnePoint {
  bet: number = 10;
  pokerList: Poker[] = [];
  userA?: string;
  userB?: string;
  runningStep: RunningStep = 'stop';

  userAPokerList: Poker[] = [];
  userBPokerList: Poker[] = [];

  userAStop: boolean = false;
  userBStop: boolean = false;

  userADealAction?: 'deal' | 'stop' = undefined;
  userBDealAction?: 'deal' | 'stop' = undefined;

  timeOutTimer: NodeJS.Timeout | null = null;

  activeTimeOut(roomName: string) {
    if (this.timeOutTimer) {
      clearTimeout(this.timeOutTimer);
    }
    this.timeOutTimer = setTimeout(
      () => {
        this.resetPokerList();
        this.stopGame();
        sendMsgToWx({
          to: roomName,
          isRoom: true,
          content: '21点游戏已超时结束',
        });
      },
      2 * 60 * 1000,
    );
  }

  async router(
    text: string,
    user?: string,
    roomName?: string,
  ): Promise<RecvdRes> {
    if (!user || !roomName) return { success: false };
    if (
      text.includes(GlobalKeywords.StopTwentyOnePoint) &&
      [this.userA, this.userB].includes(user)
    ) {
      return this.stopGame();
    }
    if (
      text.includes(GlobalKeywords.StartTwentyOnePointWithBot) &&
      this.runningStep === 'stop'
    ) {
      this.userA = botName;
      this.userB = user;
      this.resetPokerList();
      this.runningStep = 'betting';
      this.activeTimeOut(roomName);
      return this.waitBet();
    }
    if (text.includes(GlobalKeywords.StartTwentyOnePoint)) {
      this.activeTimeOut(roomName);
      return this.startGame(user);
    }
    if (this.runningStep === 'waitUserB') {
      if (text.includes(Keywords.PalyWithBot) && user === this.userA) {
        this.userB = this.userA;
        this.userA = botName;
        this.resetPokerList();
        this.activeTimeOut(roomName);
        return this.waitBet();
      } else if (text.includes(Keywords.JoinGame) && user !== this.userA) {
        this.userB = user;
        this.resetPokerList();
        this.activeTimeOut(roomName);
        return this.waitBet();
      }
    }
    if (this.runningStep === 'betting' && user === this.userB) {
      const regExp = new RegExp(`${Keywords.Bet}[1-9][0-9]{0,6}`);
      const match = text.match(regExp);
      if (match) {
        const bet = Number(match[0].replace(Keywords.Bet, ''));
        console.log(bet);
        this.bet = bet;
        await sendMsgToWx({
          content: `已调整赌注为${bet}`,
          isRoom: true,
          to: roomName,
        });

        this.runningStep = 'turning';
        this.resetPokerList();
        this.turn('deal', 'A');
        this.activeTimeOut(roomName);
        return this.turn('deal', 'B');
      } else if (text.includes(Keywords.StartDirectly)) {
        this.runningStep = 'turning';
        this.resetPokerList();

        this.turn('deal', 'A');
        this.activeTimeOut(roomName);
        return this.turn('deal', 'B');
      }
    }
    if (
      this.runningStep === 'turning' &&
      [this.userA, this.userB].includes(user)
    ) {
      let type: 'deal' | 'stop' = 'deal';
      if (text.includes(Keywords.DealCard)) {
        type = 'deal';
      } else if (text.includes(Keywords.StopCard)) {
        type = 'stop';
      } else {
        return { success: false };
      }

      if (user === this.userA && this.userADealAction !== 'stop') {
        this.userADealAction = type;
      }
      if (user === this.userB && this.userBDealAction !== 'stop') {
        this.userBDealAction = type;
      }

      setTimeout(async () => {
        await waitTime(1000);
        if (this.userA !== botName || this.userADealAction === 'stop') return;
        if (!this.userBDealAction) return;
        const botDecision = await this.botDecision();
        await sendMsgToWx({
          content: `机器人选择了${botDecision}`,
          to: roomName,
          isRoom: true,
        }).catch(() => null);
        const { success, data } = await this.router(
          botDecision,
          botName,
          roomName,
        );
        if (success) {
          this.activeTimeOut(roomName);
          sendMsgToWx({
            content: data?.content || '',
            isRoom: true,
            to: roomName,
          });
        }
      }, 0);

      if (this.userADealAction && this.userBDealAction) {
        setTimeout(() => {
          this.userADealAction =
            this.userADealAction === 'stop' ? 'stop' : undefined;
          this.userBDealAction =
            this.userBDealAction === 'stop' ? 'stop' : undefined;
        }, 0);
        this.activeTimeOut(roomName);
        this.turn(this.userADealAction, 'A');
        return this.turn(this.userBDealAction, 'B');
      } else {
        this.activeTimeOut(roomName);
        return { success: true, data: { content: `等待另一方决策...` } };
      }
    }

    return { success: false };
  }

  async botDecision(): Promise<'发牌' | '停牌'> {
    const aPoint = this.getPointNumber(this.userAPokerList);
    const bPoint = this.getPointNumber(this.userBPokerList);
    if (bPoint > 21 || aPoint > 21) {
      this.userADealAction = 'stop';
      return '停牌';
    }
    if (aPoint <= 21 - maxSinglePokerPoint) {
      this.userADealAction = 'deal';
      return '发牌';
    }
    // 发牌概率
    let dealProbability = (21 - aPoint) / maxSinglePokerPoint;
    // 如果玩家的点数比庄家的高， 那就提高20%概率
    if (aPoint < bPoint) dealProbability = dealProbability * 1.2;
    if (Math.random() < dealProbability) {
      this.userADealAction = 'deal';
      return '发牌';
    }

    this.userADealAction = 'stop';
    return '停牌';
  }

  turn(type: 'deal' | 'stop', user: 'A' | 'B'): RecvdRes {
    console.log(type, user);
    switch (type) {
      case 'deal': {
        switch (user) {
          case 'A': {
            const poker = this.pokerList.pop();
            poker && this.userAPokerList.push(poker);
            break;
          }
          case 'B': {
            const poker = this.pokerList.pop();
            poker && this.userBPokerList.push(poker);
            break;
          }
        }
        break;
      }
      case 'stop': {
        switch (user) {
          case 'A': {
            this.userAStop = true;
            break;
          }
          case 'B': {
            this.userBStop = true;
            break;
          }
        }
      }
    }
    console.log(this.userA, this.userAPokerList);
    console.log(this.userB, this.userBPokerList);
    return {
      success: true,
      data: { content: [...this.checkoutAndRenderHandPoker()].join('\n') },
    };
  }

  isBust(pokerList: Poker[]) {
    return this.getPointNumber(pokerList) > 21;
  }

  getPointNumber(pokerList: Poker[]) {
    let pokerACount = 0;
    let point = pokerList.reduce((prev, { point, poker }) => {
      if (poker === 'A') {
        pokerACount++;
        return prev;
      }
      return prev + point;
    }, 0);
    for (let i = 0; i < pokerACount; i++) {
      if (point > 10) {
        point = point + 1;
      } else {
        point = point + 11;
      }
    }
    return point;
  }

  waitBet(): RecvdRes {
    this.runningStep = 'betting';
    return {
      success: true,
      data: {
        content: [
          `庄家${this.userA}， 玩家${this.userB}`,
          `当前赌注 ${this.bet}, 请 ${this.userB} 决定是否调整赌注`,
          `调整赌注回复示例：${Keywords.Bet}100， 上限${maxBet}`,
          `也可"${Keywords.StartDirectly}"`,
        ].join('\n'),
      },
    };
  }

  resetPokerList() {
    this.pokerList = pokerTypeList.map((poker, index) => ({
      poker,
      point: Math.min(index + 1, 10),
    }));
    this.pokerList = [
      ...this.pokerList,
      ...this.pokerList,
      ...this.pokerList,
      ...this.pokerList,
    ];
    this.pokerList = this.pokerList.sort(() => Math.random() - Math.random());
    this.userAPokerList = [];
    this.userBPokerList = [];
    this.userAStop = false;
    this.userBStop = false;
    this.userADealAction = undefined;
    this.userBDealAction = undefined;
  }

  checkoutAndRenderHandPoker() {
    let aIsBust = false;
    let bIsBust = false;
    const aPoint = this.getPointNumber(this.userAPokerList);
    const bPoint = this.getPointNumber(this.userBPokerList);

    const handPokerList = [
      `${this.userA}手牌: [${this.userAPokerList?.map(({ poker }) => poker).join(', ')}], 点数${aPoint}`,
      `${this.userB}手牌: [${this.userBPokerList?.map(({ poker }) => poker).join(', ')}], 点数${bPoint}`,
    ];
    if (aPoint > 21) {
      aIsBust = true;
      this.userAStop = true;
    }
    if (bPoint > 21) {
      bIsBust = true;
      this.userBStop = true;
    }
    if (aIsBust && bIsBust) {
      this.resetPokerList();
      this.runningStep = 'betting';
      return [
        `🤯双方均已爆牌， 平局`,
        ...handPokerList,
        `可选择调整 "${Keywords.Bet}" 或 "${Keywords.StartDirectly}" 下一局`,
      ];
    }

    if (this.userAStop && this.userBStop) {
      this.runningStep = 'betting';
      let bet = this.bet;
      let winner = this.userA;
      let loser = this.userA;
      let winnerPoint = 0;
      let loserPoint = 0;
      if (aPoint === bPoint) {
        return [
          `点数${aPoint}, 相同点数，平局`,
          `可选择调整 "${Keywords.Bet}" 或 "${Keywords.StartDirectly}" 下一局`,
          ...handPokerList,
        ];
      }

      if (aIsBust || bIsBust) {
        winner = aIsBust ? this.userB : this.userA;
        loser = aIsBust ? this.userA : this.userB;
        winnerPoint = aIsBust ? bPoint : aPoint;
        loserPoint = aIsBust ? aPoint : bPoint;
      } else if (aPoint > bPoint) {
        winner = this.userA;
        loser = this.userB;
        winnerPoint = aPoint;
        loserPoint = bPoint;
      } else {
        winner = this.userB;
        loser = this.userA;
        winnerPoint = bPoint;
        loserPoint = aPoint;
      }

      if (winnerPoint === 21) {
        bet = this.bet * 2;
      }

      addMoney(bet, winner!);
      addMoney(-bet, loser!);
      const winnerMoney = getSaveDataByUser(winner!).money;
      const loserMoney = getSaveDataByUser(loser!).money;

      const msgList = [
        `😏${winner}赢了， 点数${winnerPoint}，获得${bet}金币, 余额${winnerMoney}`,
        `😭${loser}输了， 点数${loserPoint}，损失${bet}金币, 余额${loserMoney}`,
        ...handPokerList,
        `可选择调整 "${Keywords.Bet}" 或 "${Keywords.StartDirectly}" 下一局`,
      ];
      if (winnerPoint === 21) {
        msgList.unshift(`🎉完美控牌21点， 赢双倍`);
      }
      return msgList;
    }

    if (aIsBust) {
      this.userADealAction = 'stop';
      return [
        `🤯${this.userA} 爆牌了`,
        ...handPokerList,
        `请 ${this.userB} 决定发牌还是停牌`,
        `💖完美控牌21点赢双倍哦💖`,
      ];
    }
    if (bIsBust) {
      this.userBDealAction = 'stop';
      return [
        `🤯${this.userB} 爆牌了`,
        ...handPokerList,
        `请 ${this.userA} 决定发牌还是停牌`,
        `💖完美控牌21点赢双倍哦💖`,
      ];
    }
    if (this.userAStop) {
      return [
        `${this.userA}已停牌`,
        ...handPokerList,
        `请${this.userB}决定发牌还是停牌`,
      ];
    }
    if (this.userBStop) {
      return [
        `${this.userB}已停牌`,
        ...handPokerList,
        `请${this.userA}决定发牌还是停牌`,
      ];
    }
    return [...handPokerList, `请双方决定发牌还是停牌`];
  }

  startGame(user: string): RecvdRes {
    if (this.runningStep !== 'stop') {
      return { success: true, data: { content: `游戏进行中， 别捣乱` } };
    }

    this.resetPokerList();
    this.userA = user;
    this.runningStep = 'waitUserB';
    return {
      success: true,
      data: {
        content: [
          `游戏已开始, 玩家A:${user}`,
          `PVP: 玩家B回复 "加入游戏"`,
          `PVE: 玩家A回复 "和机器人玩"`,
        ].join('\n'),
      },
    };
  }

  stopGame(): RecvdRes {
    this.runningStep = 'stop';
    this.resetPokerList();
    this.bet = 10;
    this.userA = undefined;
    this.userB = undefined;
    return {
      success: true,
      data: {
        content: `游戏已结束`,
      },
    };
  }
}
