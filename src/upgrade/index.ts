import { Keywords, MaxMakeMoneyAttribute, saveDataLabelMap } from 'src/config';
import { getSaveDataByUser, saveDataByUser } from 'src/saveData';
import { RecvdRes, SaveData } from 'src/utils/type';

export const parseText = (text: string, user: string): RecvdRes => {
  if (text.includes(Keywords.Upgrade)) {
    const attributeNameRegExpStr = `${Keywords.Upgrade}((?:${saveDataLabelMap.luck}|${saveDataLabelMap.bargainingPower}|${saveDataLabelMap.battleStrength}|${saveDataLabelMap.thieverySkills}))`;

    const attributeNameWithCountRegExpStr = `${attributeNameRegExpStr}(\\*[1-9][0-9]?)?`;
    const attributeNameWithCountRegExp = new RegExp(
      attributeNameWithCountRegExpStr,
    );
    const matchAttributeNameWithCount = text.match(
      attributeNameWithCountRegExp,
    );

    const saveData = getSaveDataByUser(user);
    if (matchAttributeNameWithCount && matchAttributeNameWithCount?.[1]) {
      const attributeName = matchAttributeNameWithCount[1];
      const count =
        Number(matchAttributeNameWithCount[2]?.replaceAll('*', '')) || 1;
      let fieldName: keyof SaveData = 'luck';
      switch (attributeName) {
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
      if (saveData[fieldName] >= MaxMakeMoneyAttribute) {
        return { success: true, data: { content: `${attributeName}已满级` } };
      }
      let money = 0;
      for (let i = 0; i < count; i++) {
        saveData[fieldName] = saveData[fieldName] + 1;
        money = money + saveData[fieldName] * 10000;
        if (saveData[fieldName] >= MaxMakeMoneyAttribute) break;
      }
      if (saveData.money < money) {
        return {
          success: true,
          data: {
            content: `金币不足， 需要花费${money}升级， 剩余${saveData.money}`,
          },
        };
      }
      saveData.money = saveData.money - money;
      saveDataByUser(saveData, user);
      return {
        success: true,
        data: {
          content: `本次升级${attributeName}*${count}成功， 消耗${money}金币， 当前${attributeName}: ${saveData[fieldName]}`,
        },
      };
    }

    return {
      success: true,
      data: {
        content: `回复示例: 升级${saveDataLabelMap.luck}；升级${saveDataLabelMap.battleStrength}*10`,
      },
    };
  }
  return { success: false };
};
