import { Injectable } from '@nestjs/common';
import { Keywords } from 'src/config';
import { countdown, holiday, offWork } from 'src/countdown';
import { JingZiQiService } from 'src/jingZiQi/index.service';

export interface RecvdRes {
  success: boolean;
  data?: {
    type?: 'text' | 'fileUrl';
    content: string;
    extra?: string;
  };
}

const jingZiQiService = new JingZiQiService();

@Injectable()
export class RecvdService {
  router({
    content,
    fromUser,
    isMentioned,
    isRoom,
    type,
  }: {
    type: string;
    isMentioned: boolean;
    content: string;
    isRoom: boolean;
    fromUser: string;
  }): RecvdRes {
    if (type !== 'text') return { success: false };
    if (isRoom && !isMentioned) return { success: false };

    if (content.includes(Keywords.Holiday)) return holiday();
    if (content.includes(Keywords.OffWork)) return offWork();
    if (content.includes(Keywords.Countdown)) return countdown();

    const res = jingZiQiService.parseText(content);
    if (res.success) return res;

    return {
      success: true,
      data: {
        content: [
          '============ 关键字 ============',
          ...Object.values(Keywords).map(
            (keyword, index) => `${index + 1}. ${keyword}`,
          ),
        ].join('\n'),
      },
    };
  }
}
