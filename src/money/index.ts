import {
  getSaveDataByUser,
  getSaveDataMap,
  saveDataByUser,
} from 'src/saveData';
import { RecvdRes } from 'src/utils/type';

export const addMoney = (amount: number, user: string) => {
  const saveData = getSaveDataByUser(user);
  saveData.money = saveData.money + amount;
  saveDataByUser(saveData, user);
};

export const setMoney = (money: number, user: string) => {
  const saveData = getSaveDataByUser(user);
  saveData.money = money;
  saveDataByUser(saveData, user);
};

export const getMoneyRanking = (): RecvdRes => {
  const saveDataMap = getSaveDataMap();
  return {
    success: true,
    data: {
      content: [
        `==== 金币排行榜 ====`,
        ...Object.entries(saveDataMap)
          .map(([user, data]) => [user, data?.money || 0] as const)
          .sort((a, b) => b[1] - a[1])
          .map(([user, money]) => `${user}: ${money}`),
      ].join('\n'),
    },
  };
};
