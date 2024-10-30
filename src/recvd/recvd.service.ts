import { Injectable } from '@nestjs/common';
import { Keywords } from 'src/config';
import { countdown, holiday, offWork } from 'src/countdown';
import { JingZiQiService } from 'src/jingZiQi/index.service';
import { getMoneyRanking } from 'src/money';
import { TwentyOnePoint } from 'src/twentyOnePoint';

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
    roomName
  }: {
    type: string;
    isMentioned: boolean;
    isMsgFromSelf: boolean;
    content: string;
    isRoom: boolean;
    fromUser?: string;
    roomUsers?: string[]
    roomName?: string
  }): Promise<RecvdRes> {
    if (isMsgFromSelf) return { success: false };
    if (type !== 'text') return { success: false };
    if (isRoom && !isMentioned) return { success: false };

    if (content.includes(Keywords.Holiday)) return holiday();
    if (content.includes(Keywords.OffWork)) return offWork();
    if (content.includes(Keywords.Countdown)) return countdown();
    if(content.includes(Keywords.MoneyRanking)) return getMoneyRanking()

    let res = jingZiQiService.parseText(content);
    if (res.success) return res;
    res = await twentyOnePoint.router(content, fromUser, roomName)
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
