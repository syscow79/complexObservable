export class Address {
  constructor(id?: number) {
    this.id = id ?? -1;
  }
  id = -1;
  street = '';
  suite = "";
  city = "";
  zipcode = "";
  geo = {};
  errors?: [];
}
