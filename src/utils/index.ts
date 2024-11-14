import {
  defaultSaveData,
  getSaveDataByUser,
  getSaveDataMap,
  saveDataMap as saveDataMapFn,
} from 'src/saveData';
import _dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';
import { saveDataLabelMap } from 'src/config';
import { SaveData } from 'src/utils/type';

const dayjs = require('dayjs') as typeof _dayjs;

let prevSignInTime: Dayjs = dayjs('2024-01-01');

export const dailySignIn = (users?: string[]) => {
  if (prevSignInTime.unix() === dayjs().startOf('date').unix()) return;
  console.log('dailySignIn', users);
  const saveDataMap = getSaveDataMap();
  users?.forEach((user) => {
    if (!saveDataMap[user]) {
      saveDataMap[user] = defaultSaveData;
    }
    if (
      dayjs().startOf('date').unix() !==
      dayjs(saveDataMap[user].prevSignInTime).startOf('date').unix()
    ) {
      saveDataMap[user].money = (saveDataMap[user]?.money || 0) + 1000;
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
  if (process.env.NODE_ENV === 'develop') return Promise.resolve();
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

export const random = (start: number, end: number, seed?: number) => {
  const random = Number(
    '0.' +
      Math.sin(seed || Date.now())
        .toString()
        .slice(6),
  );

  return random * (end - start) + start;
};

export const getMyInfo = (user: string): string => {
  const saveData = getSaveDataByUser(user);
  let fortuneLabel = '';
  const fortune = getNowFortune(user);
  if (fortune > -0.4) {
    fortuneLabel = '大凶';
  }
  if (fortune > -0.2) {
    fortuneLabel = '小凶';
  }
  if (fortune > 0) {
    fortuneLabel = '平';
  }
  if (fortune > 0.2) {
    fortuneLabel = '小吉';
  }
  if (fortune > 0.4) {
    fortuneLabel = '大吉';
  }
  return [
    `@${user}`,
    ...Object.entries(saveData).map(([fieldName, value]) => {
      return `${saveDataLabelMap[fieldName as keyof SaveData]}: ${value}`;
    }),
    `现在运势：${fortuneLabel}(${Math.round(fortune * 100)}%)`,
  ].join('\n');
};

/** 运势， 每小时都不一样 */
export const getNowFortune = (user: string): number => {
  const seed =
    Array.from(user).reduce((prev, char) => prev + char.charCodeAt(0), 0) +
    dayjs().year() +
    dayjs().month() +
    dayjs().date() +
    dayjs().hour();
  return random(-0.4, 0.6, seed);
};
