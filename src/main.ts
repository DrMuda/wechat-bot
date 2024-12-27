import { NestFactory } from '@nestjs/core';
import { AppModule } from './recvd/recvd.module';
import { runTask } from 'src/scheduler/runTask';
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
  runTask();
}
bootstrap();
