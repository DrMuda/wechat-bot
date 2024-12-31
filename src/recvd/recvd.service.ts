import { Injectable } from '@nestjs/common';
import { botName, Keywords } from 'src/config';
import { countdown, holiday, offWork } from 'src/countdown';
import { JingZiQiService } from 'src/jingZiQi/index.service';
import { getMoneyRanking } from 'src/money';
import { TwentyOnePoint } from 'src/twentyOnePoint';
import { getConfig, getMyInfo } from 'src/utils';
import { parseText as makeMoneyParseText } from 'src/makeMoney';
import { parseText as upgradeParseText } from 'src/upgrade';
import { searchPic } from 'src/pixiv';

export interface RecvdRes {
  success: boolean;
  data?: {
    type?: 'text' | 'fileUrl';
    content: string;
    extra?: string;
  };
}

const jingZiQiService = new JingZiQiService();
const twentyOnePoint = new TwentyOnePoint();

@Injectable()
export class RecvdService {
  async router({
    content,
    fromUser,
    isMsgFromSelf,
    isMentioned,
    isRoom,
    type,
    roomUsers,
    roomName,
  }: {
    type: string;
    isMentioned: boolean;
    isMsgFromSelf: boolean;
    content: string;
    isRoom: boolean;
    fromUser?: string;
    roomUsers?: string[];
    roomName?: string;
  }): Promise<RecvdRes> {
    if (isMsgFromSelf) return { success: false };
    if (type !== 'text') return { success: false };
    if (isRoom && !isMentioned) return { success: false };

    const { banUserName } = getConfig();
    if (banUserName.includes(fromUser || '')) {
      return {
        success: true,
        data: { content: '一切邪恶终将被制裁，你被ban了， 去spa😠' },
      };
    }

    if (content.includes(Keywords.Holiday)) return holiday();
    if (content.includes(Keywords.OffWork)) return offWork();
    if (content.includes(Keywords.Countdown)) return countdown();
    if (content.includes(Keywords.MoneyRanking)) return getMoneyRanking();
    if (content.includes(Keywords.MyInfo) && fromUser) {
      return { success: true, data: { content: getMyInfo(fromUser) } };
    }
    if (content.includes(Keywords.BotInfo)) {
      return { success: true, data: { content: getMyInfo(botName) } };
    }
    console.log(Keywords.SearchPic);
    if (content.includes(Keywords.SearchPic)) {
      // console.log('搜图=====', { content });
      searchPic({
        isRoom,
        content: content.replace(Keywords.SearchPic, ''),
        roomName,
        fromUser,
      });
      // 这里不直接响应， 由searchPic主动发送图片
      return { success: false };
    }

    let res = jingZiQiService.parseText(content);
    if (res.success) return res;

    res = await twentyOnePoint.router(content, fromUser, roomName);
    if (res.success) return res;

    if (fromUser) {
      res = upgradeParseText(content, fromUser);
    }
    if (res.success) return res;

    if (fromUser) {
      res = makeMoneyParseText(content, fromUser);
    }
    if (res.success) return res;

    return {
      success: true,
      data: {
        content: [
          '====== 关键字 ======',
          ...Object.values(Keywords).map(
            (keyword, index) => `${index + 1}. ${keyword}`,
          ),
        ].join('\n'),
      },
    };
  }
}
