import { Keywords, saveDataLabelMap } from 'src/config';
import { getSaveDataByUser, saveDataByUser } from 'src/saveData';
import { RecvdRes, SaveData } from 'src/utils/type';

export const parseText = (text: string, user: string): RecvdRes => {
  if (text.includes(Keywords.Upgrade)) {
    const reg = new RegExp(
      `${Keywords.Upgrade}((?:${saveDataLabelMap.luck}|${saveDataLabelMap.bargainingPower}|${saveDataLabelMap.battleStrength}|${saveDataLabelMap.thieverySkills}))`,
    );
    const match = text.match(reg);

    const saveData = getSaveDataByUser(user);
    if (match && match[1]) {
      const keyword = match[1];
      let fieldName: keyof SaveData = 'luck';
      switch (keyword) {
        case saveDataLabelMap.luck: {
          fieldName = 'luck';
          break;
        }
        case saveDataLabelMap.battleStrength: {
          fieldName = 'battleStrength';
          break;
        }
        case saveDataLabelMap.bargainingPower: {
          fieldName = 'bargainingPower';
          break;
        }
        case saveDataLabelMap.thieverySkills: {
          fieldName = 'thieverySkills';
          break;
        }
      }
      const money = saveData[fieldName] * 20000;
      if (saveData.money < money) {
        return {
          success: true,
          data: {
            content: `金币不足， 需要花费${money}升级， 剩余${saveData.money}`,
          },
        };
      }
      saveData[fieldName] = saveData[fieldName] + 1;
      saveData.money = saveData.money - money;
      saveDataByUser(saveData, user);
      return {
        success: true,
        data: {
          content: `升级成功， 消耗${money}金币， 当前${keyword}: ${saveData[fieldName]}`,
        },
      };
    }

    return {
      success: true,
      data: { content: '回复示例: 升级幸运值；升级战斗力' },
    };
  }
  return { success: false };
};
