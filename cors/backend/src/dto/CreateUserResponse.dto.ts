import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserResponseDto {
  @ApiProperty({
    description: "The user's name (must not exceed 10 characters)",
    example: 'John Doe',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10, { message: 'Name must not exceed 10 characters' })
  message: string;
}
