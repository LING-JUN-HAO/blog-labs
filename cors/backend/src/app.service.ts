import { Injectable } from '@nestjs/common';
import { CreateUserDto } from 'src/dto/CreateUser.dto';

@Injectable()
export class AppService {
  CreateMockPromise(createUserDto: CreateUserDto): Promise<{ status: string }> {
    return new Promise((resolve) => {
      resolve({ status: 'Ok' });
    });
  }
}
