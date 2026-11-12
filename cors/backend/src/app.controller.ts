import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CreateUserDto } from 'src/dto/CreateUser.dto';
import { CreateUserResponseDto } from 'src/dto/CreateUserResponse.dto';
import { LoginResponseDto } from 'src/dto/LoginResponse.dto';

const SAME_SITE_VALUES = ['strict', 'lax', 'none'] as const;
type SameSite = (typeof SAME_SITE_VALUES)[number];

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // 項目一：GET Method Swagger 無響應範例
  @ApiTags('heartbeat')
  @ApiOperation({
    summary: '檢查服務健康狀態',
    description: '回傳 204 狀態碼，表示服務正常運行。',
  })
  @ApiResponse({
    status: 204,
    description: '服務正常運行，沒有內容返回。',
  })
  @Get('heartbeat')
  @HttpCode(204)
  getHeartbeat(): void {}

  // 項目二：Post Method Swagger DTO 範例
  @Post('users')
  @ApiTags('users')
  @ApiOperation({
    summary: '建立用戶',
    description: '依傳入的名稱與年齡建立一筆用戶資料。',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully.',
    type: CreateUserResponseDto,
  })
  createUserInfoPromise(
    @Body() createUserDto: CreateUserDto,
  ): CreateUserResponseDto {
    console.log('createUserDto', createUserDto);
    return { message: 'User created' };
  }

  // 項目三：模擬登入（寫入 httpOnly Cookie）
  @Post('auth/login')
  @HttpCode(200)
  @ApiTags('auth')
  @ApiOperation({
    summary: '模擬登入',
    description: '不驗證帳密，直接在回應寫入 httpOnly 的 refreshToken Cookie。',
  })
  @ApiResponse({
    status: 200,
    description: '登入成功，回應標頭帶 Set-Cookie: refreshToken。',
    type: LoginResponseDto,
  })
  @ApiQuery({
    name: 'sameSite',
    required: false,
    enum: SAME_SITE_VALUES,
    description: 'Cookie 的 SameSite 設定，預設 lax',
  })
  login(
    @Res({ passthrough: true }) res: Response,
    @Query('sameSite') sameSite: SameSite = 'lax',
  ): LoginResponseDto {
    if (!SAME_SITE_VALUES.includes(sameSite)) {
      throw new BadRequestException(
        `sameSite 只能是 ${SAME_SITE_VALUES.join(' / ')}`,
      );
    }

    // 透過 Express 設定 Cookie
    res.cookie('refreshToken', 'demo-token', {
      httpOnly: true, // 禁止 JavaScript 透過 document.cookie 讀取
      sameSite, // 控制跨站請求能不能攜帶 Cookie
      secure: true, // 僅透過 HTTPS 傳送 Cookie
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天後過期
    });

    // 交給 NestJS 將資料轉成 JSON 並送出
    return {
      message: '登入成功',
    };
  }

  // 項目四：檢查請求有沒有帶上 refreshToken Cookie
  @Get('auth/check')
  @ApiTags('auth')
  @ApiOperation({
    summary: '檢查 Cookie',
    description:
      '回傳這次請求有沒有帶上 refreshToken Cookie，用來觀察 SameSite 的效果。',
  })
  @ApiResponse({ status: 200, description: '請求是否帶有 refreshToken。' })
  checkCookie(@Req() req: Request): { hasRefreshToken: boolean } {
    const cookieHeader = req.headers.cookie ?? '';
    const hasRefreshToken = cookieHeader
      .split(';')
      .some((cookie) => cookie.trim().startsWith('refreshToken='));
    return { hasRefreshToken };
  }
}
