import { ApiProperty } from '@nestjs/swagger';
import { ResponseDto } from '../../../common/dto/response/response.dto';
import { User } from './user';

export class UserResponseDto extends ResponseDto<User> {
  @ApiProperty({
    type: User,
    isArray: true,
  })
  data: User[] = [];

  constructor(data?: User[]) {
    super();
    this.data = data ?? [];
  }

}
