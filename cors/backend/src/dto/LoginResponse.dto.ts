import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: '登入結果訊息',
    example: '登入成功',
  })
  message: string;
}
