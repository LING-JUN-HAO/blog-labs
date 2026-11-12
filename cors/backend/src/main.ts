import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const FRONTEND_ORIGIN = 'http://localhost:5173';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Nest 練習使用')
    .setVersion('1.0')
    .setContact('Antonio', '', 'test123@gmail.com')
    .addServer(BASE_URL, '生產環境')
    .addServer('https://api.example.com', '測試環境')
    .addTag('heartbeat', '心跳檢測')
    .addTag('users', '用戶資訊')
    .addTag('auth', '登入驗證')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    autoTagControllers: false,
  });

  /**
   * 官方 Swagger UI 設定(關閉 Modal 顯示)
   * @see(https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/)
   */
  const options = {
    jsonDocumentUrl: 'swagger/json',
    swaggerOptions: {
      defaultModelsExpandDepth: 1, // 禁用 Models 展開
    },
  };

  SwaggerModule.setup('api', app, document, options);

  app.getHttpAdapter().get('/', (req, res) => {
    res.redirect('/api'); // 重定向到 Swagger UI 路径
  });

  await app.listen(PORT);
}
bootstrap();
