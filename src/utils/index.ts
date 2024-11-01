import { getSaveDataMap, saveDataMap as saveDataMapFn } from 'src/saveData';
import _dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';

const dayjs = require('dayjs') as typeof _dayjs;

let prevSignInTime: Dayjs = dayjs('2024-01-01');

export const dailySignIn = (users?: string[]) => {
  if (prevSignInTime.unix() === dayjs().startOf('date').unix()) return;
  console.log('dailySignIn', users);
  const saveDataMap = getSaveDataMap();
  users?.forEach((user) => {
    if (!saveDataMap[user]) {
      saveDataMap[user] = { money: 0, prevSignInTime: '2024-01-01 00:00:00' };
    }
    if (
      dayjs().startOf('date').unix() !==
      dayjs(saveDataMap[user].prevSignInTime).startOf('date').unix()
    ) {
      saveDataMap[user].money = saveDataMap[user]?.money + 1000;
      saveDataMap[user].prevSignInTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    }
  });
  saveDataMapFn(saveDataMap);
  prevSignInTime = dayjs().startOf('date');
};

export const sendMsgToWx = ({
  content,
  isRoom,
  to,
}: {
  to: string;
  isRoom: boolean;
  content: string;
}) => {
  console.log(content);
  return axios.post(
    'http://wxBotWebhook:3001/webhook/msg/v2?token=YpIZOxT77sGR',
    {
      to,
      data: { content },
      isRoom,
    },
  );
};

export const waitTime = async (timeout: number) => {
  return new Promise((r) => setTimeout(r, timeout));
};
