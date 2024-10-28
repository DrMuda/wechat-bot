import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { RecvdService, RecvdRes } from './recvd.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class RecvdController {
  constructor(private readonly appService: RecvdService) {}

  @Post('recvd')
  @UseInterceptors(FileInterceptor('file'))
  async recvd(@Body() body: any): Promise<RecvdRes> {
    const type = body.type;
    const isMentioned = body.isMentioned;
    const content = (body.content as string).replace('@木小博士 ', '').trim();
    console.log(body.source)
    if (isMentioned !== '1') return { success: false };
    if (type !== 'text') return { success: false };

    return this.appService.router(content)
  }
}
