import { getSaveDataByUser, saveDataByUser } from 'src/saveData';

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
