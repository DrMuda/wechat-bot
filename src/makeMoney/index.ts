import { Keywords, MaxMakeMoneyAttribute, saveDataLabelMap } from 'src/config';
import { addMoney } from 'src/money';
import {
  getSaveDataByUser,
  getSaveDataMap,
  saveDataByUser,
} from 'src/saveData';
import { getNowFortune, random } from 'src/utils';
import { RecvdRes, SaveData } from 'src/utils/type';

const dayjs = require('dayjs');

enum EMakeMoneyAction {
  Adventure,
  ItinerantMerchant,
  Thievery,
}
interface MakeMoneyResult {
  success: boolean;
  money?: number;
  levelUp?: boolean;
  extra?: string[];
  // cd中
  inCd?: boolean;
  onlyExtra?: boolean;
  otherUser?: {
    user?: string;
    money?: number;
  }[];
}

const { Adventure, ItinerantMerchant, Thievery } = EMakeMoneyAction;

const baseProbability = 0.5;
// 基础保释金， * thieverySkills
const baseBailMoney = 1000;

const getProbability = (user: string, luck: number, mainAttribute: number) => {
  const fortune = getNowFortune(user);
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
  return {
    successProbability,
    luckProbability,
    mainAttributeProbability,
    fortune,
  };
};

const baseMakeMoney = (
  user: string,
  luck: number,
  mainAttribute: number,
): MakeMoneyResult => {
  const { successProbability, luckProbability } = getProbability(
    user,
    luck,
    mainAttribute,
  );
  // 如果赚钱成功， 理应得到的钱
  const shouldGetMoney = Math.round(
    mainAttribute * 1000 * (1 + random(-0.3, 0.3)),
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

const itinerantMerchantMakeMoney = ({
  saveData,
  text,
  user,
}: {
  user: string;
  saveData: Required<SaveData>;
  text: string;
}): MakeMoneyResult => {
  const regExp = new RegExp(`${Keywords.ItinerantMerchant}([1-9][0-9]{0,6})`);
  const match = text.match(regExp);
  if (match?.[1]) {
    const cost = Number(match[1]);
    const { luck, money, bargainingPower } = saveData;
    if (money < cost) {
      return {
        success: false,
        money: 0,
        levelUp: false,
        extra: [`金币不足, 余额${money}`],
      };
    }

    const { successProbability, luckProbability } = getProbability(
      user,
      luck,
      bargainingPower,
    );
    const shouldGetMoney = Math.round(
      cost * (1 + (bargainingPower / 100) * 2 + random(-0.3, 0.3)),
    );
    const levelUp = Math.random() < 1 / bargainingPower;
    if (Math.random() < successProbability) {
      return { success: true, money: shouldGetMoney, levelUp };
    }
    if (Math.random() < luckProbability / 2) {
      return { success: false, money: 0, levelUp };
    }
    return { success: false, money: -shouldGetMoney, levelUp };
  }
  return {
    success: false,
    levelUp: false,
    money: 0,
    extra: [
      `回复示例: ${Keywords.ItinerantMerchant}1000;${Keywords.ItinerantMerchant}{成本}， 成本越高， 回报与损失也越高， 上限9999999`,
    ],
    onlyExtra: true,
  };
};

const thieveryMakeMoney = ({
  text,
  user,
}: {
  user: string;
  text: string;
}): MakeMoneyResult => {
  console.log(text);
  const targetName = text
    .replace(Keywords.Thievery, '')
    .replace('@', '')
    .trim();
  if (!targetName) {
    return {
      success: false,
      extra: [`回复示例: ${Keywords.Thievery}@木小博士`],
      onlyExtra: true,
    };
  }
  const saveDataMap = getSaveDataMap();
  const userSaveData = saveDataMap[user];
  const targetSaveData = saveDataMap[targetName];
  if (!targetSaveData || !userSaveData) {
    return {
      success: false,
      extra: [`${Keywords.Thievery}对象:${targetName} 不存在`],
    };
  }
  const userFortune = getNowFortune(user);
  const targetFortune = getNowFortune(targetName);
  const mainAttributeProbability =
    (userSaveData.thieverySkills / MaxMakeMoneyAttribute) * 0.3;
  const luckProbability =
    ((userSaveData.luck - targetSaveData.luck) / MaxMakeMoneyAttribute) * 0.3 +
    (userFortune - targetFortune) / 2;
  const successProbability = Math.min(
    1,
    1 -
      (1 - baseProbability) *
        (1 - mainAttributeProbability) *
        (1 - luckProbability),
  );
  const shouldGetMoney = Math.min(
    1000000,
    Math.round(
      (targetSaveData.money / 2) *
        Math.min(
          1 +
            random(-0.3, 0.3) +
            userSaveData.thieverySkills / MaxMakeMoneyAttribute,
          2,
        ),
    ),
  );

  const levelUp = Math.random() < 1 / userSaveData.thieverySkills;
  if (targetSaveData.money <= 0) {
    return { success: false, money: 0, levelUp, extra: [`倒霉, 这人是穷鬼`] };
  }
  if (Math.random() < successProbability) {
    return {
      success: true,
      money: shouldGetMoney,
      levelUp,
      otherUser: [{ money: -shouldGetMoney, user: targetName }],
    };
  }
  if (Math.random() < luckProbability * 2) {
    return { success: false, money: 0, levelUp };
  }

  const releaseFromPrisonTime = dayjs()
    .add(1, 'hour')
    .format('YYYY-MM-DD HH:mm:ss');
  saveDataByUser({ releaseFromPrisonTime }, user);
  return {
    success: false,
    money: -shouldGetMoney / 2,
    levelUp,
    extra: [
      `👮‍♀️你被捕了, 释放时间${releaseFromPrisonTime}, 保释金${userSaveData.thieverySkills * baseBailMoney}`,
    ],
  };
};

export const makeMoney = (
  type: EMakeMoneyAction,
  user: string,
  text: string,
): MakeMoneyResult => {
  const saveData = getSaveDataByUser(user);
  if (dayjs().unix() < dayjs(saveData.releaseFromPrisonTime).unix()) {
    return {
      success: false,
      extra: [`你正在蹲大牢呢`],
      onlyExtra: true,
    };
  }
  if (!saveData) return { success: false, money: 0, levelUp: false };
  if (
    process.env.NODE_ENV !== 'develop' &&
    saveData.prevMakeMoneyTime &&
    dayjs().unix() - dayjs(saveData.prevMakeMoneyTime).unix() < 1 * 60
  ) {
    return { success: false, money: 0, levelUp: false, inCd: true };
  }

  const { luck, battleStrength } = saveData;
  switch (type) {
    case Adventure: {
      return baseMakeMoney(user, luck, battleStrength);
    }
    case ItinerantMerchant: {
      return itinerantMerchantMakeMoney({ user, saveData, text });
    }
    case Thievery: {
      return thieveryMakeMoney({ user, text });
    }
  }
};

const escapeFromPrison = (user: string): MakeMoneyResult => {
  const saveData = getSaveDataByUser(user);
  if (dayjs().unix() > dayjs(saveData.releaseFromPrisonTime).unix()) {
    return {
      success: false,
      extra: [`你没在大牢里, 你想进去的话也不是不可以`],
      onlyExtra: true,
    };
  }
  if (dayjs().unix() < dayjs(saveData.prevEscapeFromPrison).unix() + 1 * 60) {
    return {
      success: false,
      extra: [`越狱冷却中`],
      onlyExtra: true,
    };
  }
  const { luckProbability } = getProbability(
    user,
    saveData.luck,
    saveData.thieverySkills,
  );
  const prevEscapeFromPrison = dayjs().format('YYYY-MM-DD HH:mm:ss');
  if (Math.random() < luckProbability / 2) {
    saveDataByUser(
      { releaseFromPrisonTime: prevEscapeFromPrison, prevEscapeFromPrison },
      user,
    );
    return {
      success: false,
      extra: [`越狱成功`],
      onlyExtra: true,
    };
  }
  saveDataByUser({ prevEscapeFromPrison }, user);
  return {
    success: false,
    extra: [`越狱失败了`],
    onlyExtra: true,
  };
};

const bail = (user: string): MakeMoneyResult => {
  const saveData = getSaveDataByUser(user);
  if (!saveData) return { success: false };
  const { money, thieverySkills } = saveData;
  const bailMoney = baseBailMoney * thieverySkills;
  if (saveData.money < bailMoney) {
    return {
      success: false,
      extra: [`保释金${bailMoney}不足， 余额${money}`],
      onlyExtra: true,
    };
  }
  addMoney(-bailMoney, user);
  saveDataByUser(
    { releaseFromPrisonTime: dayjs().format('YYYY-MM-DD HH:mm:ss') },
    user,
  );
  return {
    success: true,
    extra: [`保释成功， 余额${money - bailMoney}`],
    onlyExtra: true,
  };
};

export const parseText = (text: string, user: string): RecvdRes => {
  let makeMoneyResult: MakeMoneyResult | null = null;
  let action = '';
  let mainAttributeFieldName: keyof SaveData = 'bargainingPower';
  if (text.includes(Keywords.Adventure)) {
    makeMoneyResult = makeMoney(Adventure, user, text);
    action = Keywords.Adventure;
    mainAttributeFieldName = 'battleStrength';
  } else if (text.includes(Keywords.ItinerantMerchant)) {
    makeMoneyResult = makeMoney(ItinerantMerchant, user, text);
    action = Keywords.ItinerantMerchant;
    mainAttributeFieldName = 'bargainingPower';
  } else if (text.includes(Keywords.Thievery)) {
    makeMoneyResult = makeMoney(Thievery, user, text);
    action = Keywords.Thievery;
    mainAttributeFieldName = 'thieverySkills';
  } else if (text.includes(Keywords.EscapeFromPrison)) {
    makeMoneyResult = escapeFromPrison(user);
  } else if (text.includes(Keywords.Bail)) {
    makeMoneyResult = bail(user);
  }

  if (makeMoneyResult) {
    const {
      levelUp = false,
      money = 0,
      success,
      extra = [],
      inCd = false,
      onlyExtra = false,
      otherUser,
    } = makeMoneyResult;
    addMoney(Math.round(money), user);
    const saveData = getSaveDataByUser(user);
    const content: string[] = [];

    if (!onlyExtra) {
      if (success) {
        content.push(`${action}成功, 获得${money}金币, 余额${saveData.money}`);
      } else {
        content.push(`${action}失败, 损失${money}金币, 余额${saveData.money}`);
      }
    }

    if (levelUp) {
      saveData[mainAttributeFieldName] = saveData[mainAttributeFieldName] + 1;
      content.push(
        `${saveDataLabelMap[mainAttributeFieldName]}提升, 当前${saveDataLabelMap[mainAttributeFieldName]}: ${saveData[mainAttributeFieldName]}`,
      );
    }

    if (inCd) {
      content.push(`冷却中...`);
    }

    if (otherUser) {
      otherUser.forEach(({ money, user }) => {
        user && addMoney(money || 0, user);
      });
    }

    if (success) {
      saveData.prevMakeMoneyTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    }

    saveDataByUser(saveData, user);
    return {
      success: true,
      data: { content: [...content, ...extra].join('\n') },
    };
  }
  return { success: false };
};
