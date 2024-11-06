import { SaveData } from 'src/utils/type';

export const isDev = process.env.NODE_ENV === 'develop';
export const saveDataDir = isDev ? './wechat-bot-data' : '/wechat-bot-data';

export const Keywords = {
  MoneyRanking: '金币排行榜',
  Holiday: '假期倒计时',
  OffWork: '下班倒计时',
  Countdown: '倒计时',
  StartJingZiQi: '开始井字棋',
  StopJingZiQi: '结束井字棋',
  StartTwentyOnePoint: '21点',
  StartTwentyOnePointWithBot: '和机器人玩21点',
  StopTwentyOnePoint: '结束21点',
  MyInfo: '我的数据',
  Adventure: '冒险',
  ItinerantMerchant: '行商',
  Thievery: '盗窃',
};

// 赚钱属性最大值
export const MaxMakeMoneyAttribute = 100;
export const DefaultMakeMoneyAttribute = 5;

export const saveDataLabelMap: Record<keyof SaveData, string> = {
  bargainingPower: '议价能力',
  battleStrength: '战斗力',
  luck: '幸运值',
  money: '金币',
  prevSignInTime: '上次签到时间',
  thieverySkills: '盗窃能力',
  prevMakeMoney: '上次赚钱时间',
};
