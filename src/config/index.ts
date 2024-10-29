export const isDev = process.env.NODE_ENV === 'develop';
export const saveDataDir = isDev ? './wechat-bot-data' : '/wechat-bot-data';

export const Keywords = {
  MoneyRanking: '金币排行榜',
  Holiday: '假期倒计时',
  OffWork: '下班倒计时',
  Countdown: '倒计时',
  StartJingZiQi: '开始井字棋',
  StopJingZiQi: '结束井字棋',
};
