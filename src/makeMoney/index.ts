import dayjs from 'dayjs';
import { Keywords, MaxMakeMoneyAttribute, saveDataLabelMap } from 'src/config';
import { addMoney } from 'src/money';
import { getSaveDataByUser, saveDataByUser } from 'src/saveData';
import { getNowFortune, random } from 'src/utils';
import { RecvdRes, SaveData } from 'src/utils/type';

enum EMakeMoneyAction {
  Adventure,
  ItinerantMerchant,
  Thievery,
}
interface MakeMoneyResult {
  success: boolean;
  money: number;
  levelUp: boolean;
  extra?: string[];
  // cd中
  inCd?: boolean;
}

const MaxMakeMoneyAmount = 100000;

const { Adventure, ItinerantMerchant, Thievery } = EMakeMoneyAction;
const baseMakeMoney = (
  user: string,
  luck: number,
  mainAttribute: number,
): MakeMoneyResult => {
  const fortune = getNowFortune(user);
  const baseProbability = 0.5;
  const mainAttributeProbability =
    (mainAttribute / MaxMakeMoneyAttribute) * 0.3;
  const luckProbability = (luck / MaxMakeMoneyAttribute) * 0.3 + fortune;
  const successProbability = Math.min(
    1,
    1 -
      (1 - baseProbability) *
        (1 - mainAttributeProbability) *
        (1 - luckProbability),
  );
  // 如果赚钱成功， 理应得到的钱
  const shouldGetMoney = Math.round(
    mainAttributeProbability * MaxMakeMoneyAmount * (1 + random(-0.3, 0.3)),
  );
  const levelUp = Math.random() < 1 / mainAttribute;

  if (Math.random() < successProbability) {
    return { success: true, money: shouldGetMoney, levelUp };
  }
  if (Math.random() < luckProbability / 2) {
    return { success: false, money: 0, levelUp };
  }
  return { success: false, money: -shouldGetMoney, levelUp };
};

export const makeMoney = (
  type: EMakeMoneyAction,
  user: string,
): MakeMoneyResult => {
  const saveData = getSaveDataByUser(user);
  if (!saveData) return { success: false, money: 0, levelUp: false };
  if (
    saveData.prevMakeMoney &&
    dayjs().unix() - dayjs(saveData.prevMakeMoney).unix() < 1 * 60
  ) {
    return { success: false, money: 0, levelUp: false, inCd: true };
  }

  const noMoneyRes = {
    levelUp: false,
    money: 0,
    success: false,
    extra: [`你没钱了`],
  };
  const { luck, thieverySkills, battleStrength, bargainingPower } = saveData;
  switch (type) {
    case Adventure: {
      if (saveData.money <= 0) return noMoneyRes;
      return baseMakeMoney(user, luck, battleStrength);
    }
    case ItinerantMerchant: {
      if (saveData.money <= 0) return noMoneyRes;
      return baseMakeMoney(user, luck, bargainingPower);
    }
    case Thievery: {
      return baseMakeMoney(user, luck, thieverySkills);
    }
  }
};

export const parseText = (text: string, user: string): RecvdRes => {
  let makeMoneyResult: MakeMoneyResult | null = null;
  let action = '';
  let mainAttributeFieldName: keyof SaveData = 'bargainingPower';
  if (text.includes(Keywords.Adventure)) {
    makeMoneyResult = makeMoney(Adventure, user);
    action = Keywords.Adventure;
    mainAttributeFieldName = 'battleStrength';
  } else if (text.includes(Keywords.ItinerantMerchant)) {
    makeMoneyResult = makeMoney(ItinerantMerchant, user);
    action = Keywords.ItinerantMerchant;
    mainAttributeFieldName = 'bargainingPower';
  } else if (text.includes(Keywords.Thievery)) {
    makeMoneyResult = makeMoney(Thievery, user);
    action = Keywords.Thievery;
    mainAttributeFieldName = 'thieverySkills';
  }
  if (makeMoneyResult) {
    const {
      levelUp,
      money,
      success,
      extra = [],
      inCd = false,
    } = makeMoneyResult;
    addMoney(money, user);
    const saveData = getSaveDataByUser(user);
    const content: string[] = [];

    if (success) {
      content.push(`${action}成功, 获得${money}金币, 余额${saveData.money}`);
    } else {
      content.push(`${action}失败, 损失${money}金币, 余额${saveData.money}`);
    }

    if (levelUp) {
      saveData[mainAttributeFieldName] = saveData[mainAttributeFieldName] + 1;
      content.push(
        `${saveDataLabelMap[mainAttributeFieldName]}提升, 当前${saveDataLabelMap[mainAttributeFieldName]}: ${saveData[mainAttributeFieldName]}`,
      );
    }

    if (inCd) {
      content.push(`冷却中...`);
    } else {
      saveData.prevMakeMoney = dayjs().format('YYYY-MM-DD HH:mm:ss');
    }

    saveDataByUser(saveData, user);
    return {
      success: true,
      data: { content: [...content, ...extra].join('\n') },
    };
  }
  return { success: false };
};
