import { IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: "The user's name (must not exceed 10 characters)",
    example: 'John Doe',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10, { message: 'Name must not exceed 10 characters' })
  name: string;

  @ApiProperty({
    description: "The user's age in years. Must be a positive number.",
    example: 30,
  })
  @IsPositive()
  age: number;
}
