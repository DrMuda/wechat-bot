import { NestFactory } from '@nestjs/core';
import { AppModule } from './recvd/recvd.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log(process.env.NODE_ENV)
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
