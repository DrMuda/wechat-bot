import { NestFactory } from '@nestjs/core';
import { AppModule } from './recvd/recvd.module';
import { defaultCatchFetch } from 'src/utils';
import Pixiv from 'pixiv.ts';
import * as fs from 'fs';
import * as path from 'path';
import { saveDataDir } from 'src/config';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Shanghai');
console.log('时区', dayjs.tz.guess());

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log(process.env.NODE_ENV);
  await app.listen(process.env.PORT ?? 3000);
  const pixiv = await Pixiv.refreshLogin(
    '3SoGdGWVuMSh4P6Huol_6qu-as5wipOffqty0wGFZ6M',
  ).catch((error) => {
    console.log(error);
    return null;
  });
  if (pixiv) {
    let illusts = await pixiv.search.illusts({
      word: 'gabriel dropout',
      r18: false,
    });
    console.log(illusts[1]);
    const illust = illusts[1];
    if (illust) {
      await pixiv.util.downloadIllust(
        illust,
        `${saveDataDir}/illust`,
        'medium',
      );

      const files = fs
        .readdirSync(path.join(__dirname, '../illust'))
        .map((p) => {
          return path.join(__dirname, '../illust', p);
        });
      console.log(files);
    }
  }
}
bootstrap();
