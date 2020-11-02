import { ResponseError } from '../../../common/dto/response/response-error';
import { Address } from './address';

export class User {
  id = -1;
  name = '';
  username = '';
  email = '';
  // address = {};
  // address: Address = new Address();
  address: (Address | ResponseError | number)[] = [];
  phone = '';
  website = '';
  company = {};
  // company: object | ResponseError = {};
}
