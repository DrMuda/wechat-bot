import { SaveData, SaveDataMap } from 'src/utils/type';
import * as fs from 'fs';
import { DefaultMakeMoneyAttribute, saveDataDir } from 'src/config';

const dayjs = require('dayjs');
export const defaultSaveData: Required<SaveData> = {
  money: 0,
  prevSignInTime: dayjs().format('YYYY-MM-DD hh:mm:ss'),
  bargainingPower: DefaultMakeMoneyAttribute,
  battleStrength: DefaultMakeMoneyAttribute,
  luck: DefaultMakeMoneyAttribute,
  thieverySkills: DefaultMakeMoneyAttribute,
  pryTheLock: DefaultMakeMoneyAttribute,
  prevMakeMoneyTime: null,
  releaseFromPrisonTime: null,
  prevEscapeFromPrison: null,
};

const filePath = `${saveDataDir}/saveData.json`;
export const findOrCreateSaveData = (): SaveDataMap => {
  if (!fs.existsSync(saveDataDir)) {
    fs.mkdirSync(saveDataDir);
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}', { encoding: 'utf-8' });
  }
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  try {
    return JSON.parse(fileContent);
  } catch {
    return {};
  }
};

export const saveDataMap = (data: SaveDataMap) => {
  findOrCreateSaveData();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), {
    encoding: 'utf-8',
  });
};

export const getSaveDataMap = (): Record<
  string,
  Required<SaveData> | undefined
> => {
  const originSaveDataMap = findOrCreateSaveData();
  const map: Record<string, Required<SaveData> | undefined> = {};
  Object.entries(originSaveDataMap).forEach(([userName, saveData]) => {
    map[userName] = { ...defaultSaveData, ...saveData! };
  });
  return map;
};

export const saveDataByUser = (data: SaveData, user: string) => {
  const dataMap = getSaveDataMap();

  dataMap[user] = { ...dataMap[user]!, ...data };
  fs.writeFileSync(filePath, JSON.stringify(dataMap, null, 2), {
    encoding: 'utf-8',
  });
};

export const getSaveDataByUser = (user: string): Required<SaveData> => {
  const dataMap = getSaveDataMap();
  return { ...defaultSaveData, ...dataMap[user] };
};
