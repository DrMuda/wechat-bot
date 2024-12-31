import {
  defaultSaveData,
  getSaveDataByUser,
  getSaveDataMap,
  saveDataMap as saveDataMapFn,
} from 'src/saveData';
import _dayjs, { Dayjs } from 'dayjs';
import axios, { AxiosResponse } from 'axios';
import { configPath, saveDataDir, saveDataLabelMap } from 'src/config';
import { IConfig, SaveData } from 'src/utils/type';
import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';

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
  if (process.env.NODE_ENV === 'develop') return Promise.resolve();
  return axios.post('http://localhost:3001/webhook/msg/v2?token=YpIZOxT77sGR', {
    to,
    data: { content },
    isRoom,
  });
};

interface SendPicToWxParams {
  to: string;
  isRoom: boolean;
  picPath: string;
}
export const sendPicToWx = ({ picPath, isRoom, to }: SendPicToWxParams) => {
  // 读取文件为 Buffer
  const fileBuffer = fs.readFileSync(picPath);
  const fileExtension = path.extname(picPath).toLowerCase();
  const fileName = path.basename(picPath);

  // 识别 MIME 类型
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
  };

  if (fileBuffer.byteLength <= 0) {
    console.error('文件大小为0');
    return Promise.resolve({
      data: { success: false, message: '文件大小为0' },
    } as AxiosResponse);
  }

  const formData = new FormData();
  formData.append('to', to);
  formData.append('isRoom', (isRoom ? 1 : 0).toString());
  formData.append('content', fileBuffer, {
    filename: fileName,
    contentType: mimeTypes[fileExtension],
  });

  if (process.env.NODE_ENV === 'develop') {
    return Promise.resolve({ data: { success: true } } as AxiosResponse);
  }
  return axios.post(
    'http://localhost:3001/webhook/msg?token=YpIZOxT77sGR',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
};

export const sendPicToWxWithRetry = async ({
  maxTry = 10,
  ...params
}: { maxTry?: number } & SendPicToWxParams) => {
  const success = await retryExec(
    async () => {
      const res = await sendPicToWx(params).catch(defaultCatchFetch);
      console.log(res?.data);
      if (res?.data?.success === true) return true;
      return false;
    },
    {
      maxTry: 10,
      waitTimeMs: 500,
      failedLabel: `发送【${params.picPath}】到【${params.to}】失败`,
      successLabel: `发送【${params.picPath}】到【${params.to}】成功`,
    },
  );
  return success;
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

export const defaultCatchFetch = (error: unknown) => {
  console.error(error);
  return null;
};

export const getConfig = () => {
  const defaultConfig: IConfig = {
    refreshToken: '',
    banUserName: [],
    taskTime: { sendDailyTop1: '' },
  };
  if (!fs.existsSync(saveDataDir)) {
    fs.mkdirSync(saveDataDir);
  }
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), {
      encoding: 'utf-8',
    });
  }
  const fileContent = fs.readFileSync(configPath, { encoding: 'utf-8' });
  let config = defaultConfig;
  const backupPath = `${configPath}.${dayjs().format('YYYYMMDDHHmmss')}.backup`;
  try {
    config = JSON.parse(fileContent) as IConfig;
  } catch (error) {
    fs.writeFileSync(backupPath, fileContent, { encoding: 'utf-8' });
    console.error(`配置文件不正确， 已备份到${backupPath} 并重置为默认模板`);
    console.log(error);
    config = defaultConfig;
  }
  config = { ...defaultConfig, ...config };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
  });

  return config;
};

export const retryExec = async (
  task: () => boolean | Promise<boolean>,
  {
    maxTry,
    waitTimeMs,
    failedLabel,
    successLabel,
  }: {
    maxTry: number;
    /** 重试等待时间， 毫秒 */
    waitTimeMs: number;
    failedLabel: string;
    successLabel?: string;
  },
) => {
  for (let i = 0; i < maxTry; i++) {
    const success = await task();
    if (success) {
      successLabel && console.log(successLabel);
      return true;
    }

    console.log(
      `${failedLabel}, ${waitTimeMs}毫秒后重试第${i + 1}次, 还剩${maxTry - i - 1} 次`,
    );
    await waitTime(waitTimeMs);
  }
  return false;
};
