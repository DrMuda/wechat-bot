import { getSaveDataMap, saveDataMap as saveDataMapFn } from 'src/saveData';
import _dayjs, { Dayjs } from 'dayjs';

const dayjs = require('dayjs') as typeof _dayjs;

let prevSignInTime: Dayjs = dayjs('2024-01-01');

export const dailySignIn = (users: string[]) => {
  if (prevSignInTime.unix() === dayjs().startOf('date').unix()) return;
  console.log("dailySignIn")
  const saveDataMap = getSaveDataMap();
  users.forEach((user) => {
    if (!saveDataMap[user]) return;
    if (
      dayjs().startOf('date').unix() !==
      dayjs(saveDataMap[user].prevSignInTime).startOf('date').unix()
    ) {
      saveDataMap[user].money = saveDataMap[user]?.money + 1000;
      saveDataMap[user].prevSignInTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    }
  });
  saveDataMapFn(saveDataMap);
  prevSignInTime = dayjs().startOf("date")
};
