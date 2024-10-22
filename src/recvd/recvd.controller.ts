import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { RecvdService, RecvdRes } from './recvd.service';
import { FileInterceptor } from '@nestjs/platform-express';

export const Keywords = {
  Holiday: '假期倒计时',
  OffWork: '下班倒计时',
  Countdown: '倒计时',
};

@Controller()
export class RecvdController {
  constructor(private readonly appService: RecvdService) {}

  @Post('recvd')
  @UseInterceptors(FileInterceptor('file'))
  async recvd(@Body() body: any): Promise<RecvdRes> {
    const type = body.type;
    const isMentioned = body.isMentioned;
    const content = (body.content as string).replace('@木小博士 ', '').trim();
    if (isMentioned !== '1') return { success: false };
    if (type !== 'text') return { success: false };

    if (content.includes(Keywords.Holiday)) {
      return this.appService.holiday();
    }
    if (content.includes(Keywords.OffWork)) {
      return this.appService.offWork();
    }
    if (content.includes(Keywords.Countdown)) {
      return this.appService.countdown();
    }

    return {
      success: true,
      data: {
        content: [
          '============ 关键字 ============',
          `1. ${Keywords.Countdown}`,
          `2. ${Keywords.OffWork}`,
          `3. ${Keywords.Holiday}`,
        ].join('\n'),
      },
    };
  }
}
