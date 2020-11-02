import { HttpService, Injectable, NotFoundException } from '@nestjs/common';
import { DashboardRatePlansRepository } from './dashboard-rate-plans.repository';
import { catchError, concatMap, map, mergeMap, take, tap, toArray } from 'rxjs/operators';
import { from, Observable, of, OperatorFunction, pipe, UnaryFunction } from 'rxjs';
import { User } from './dto/user';
import { ResponseError } from '../../common/dto/response/response-error';
import { Address } from './dto/address';
import { UserResponseDto } from './dto/user-response.dto';
import { TypicodeUser } from './dto/typicode-user';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { AxiosError } from 'axios';

@Injectable()
export class DashboardRatePlansService {
  constructor(
    private dashboardRatePlansRepository: DashboardRatePlansRepository,
    private httpService: HttpService
  ) {
  }

  private generateAddressError<A>(user: User, response: UserResponseDto, userIndex: number) {
    for (let i = 0; i < user.address.length; i++) {
      const address = user.address[i];
      if (address instanceof ResponseError) {
        address.id = response.error.length;
        address.path = [userIndex.toString(), 'user', i.toString(), address.path[0]];
        response.error.push(address);
      }
    }
  }

  private generateUserErrors<A>(user: User, response: UserResponseDto, userIndex: number) {
    if (user.name === '') {
      response.error.push(
        new ResponseError(response.error.length, 'name not found', 'error',
          [userIndex.toString(), 'user'])
      );
    }
  }

  private addIndexToUser() {
    return map<User, { user: User, index: number }>((user, index) => ({ user, index }));
  }

  private removeIndexFromUser() {
    return map<{ user: User, index: number }, User>((user) => user.user);
  }

  private getOrderedUserData(users: User[]) {
    return from(users)
      .pipe(
        toArray(),
        map(addresses => addresses
          .sort(function(a, b) {
            return a.id - b.id;
          })),
        concatMap(users => from(users))
      );
  }

  private repackResponseData(response: UserResponseDto) {
    return map<User[], UserResponseDto>(data => ({ ...response, data: data }));
  }

  list() {
    return this.nested(5)
      .pipe(
        // concatMap((response) =>
        //   this.getOrderedUserData(response.data)
        //     .pipe(
        //       this.addIndexToUser(),
        //       tap(({ user, index: userIndex }) => {
        //           this.generateUserErrors(user, response, userIndex);
        //           this.generateAddressError(user, response, userIndex);
        //         }
        //       ),
        //       this.removeIndexFromUser(),
        //       toArray(),
        //       this.repackResponseData(response)
        //     )
        // )
      );
  }

  private generateRandomError(): OperatorFunction<TypicodeUser, TypicodeUser> {
    return map<TypicodeUser, TypicodeUser>(user => {
      if (user.id % 2 === 0) {
        return { ...user, name: '' };
      } else {
        return user;
      }
    });
  }

  private setAddressIdsAndConvertToUser() {
    return map<TypicodeUser, User>((user) => ({ ...user, address: [13, 1, 2] }));
  }

  private orderAddresses(): UnaryFunction<Observable<Address>, Observable<Address[]>> {
    return pipe(
      toArray<Address>(),
      map<Address[], Address[]>(addresses => addresses
        .sort(function(a, b) {
          return a.id - b.id;
        }))
    );
  }

  private repackAddressToUser(user: TypicodeUser) {
    return map<Address[], User>(addresses => ({ ...user, address: addresses }));
  }

  nested(takes: number): Observable<UserResponseDto> {
    const userResponseDto = new UserResponseDto();
    return this.httpService.get<TypicodeUser[]>('https://jsonplaceholder.typicode.com/users')
      .pipe(
        map(({ data }) => data),
        concatMap(users => from(users))
      ).pipe(
        concatMap((user, userIndex) => this.getUser(user.id)
          .pipe(
            this.setAddressIdsAndConvertToUser(),
            catchError((e) => {
                if (e instanceof NotFoundException) {
                  const responseError = new ResponseError(
                    userResponseDto.error.length,
                    'user not found: ' + user.id,
                    'not found',
                    [userIndex.toString()]
                  );
                  userResponseDto.error.push(responseError);
                  return of(new User());
                } else if (e instanceof HttpException) {
                  const responseError = new ResponseError(
                    userResponseDto.error.length,
                    'user not found: ' + user.id + e.message,
                    'not found',
                    [userIndex.toString()]
                  );
                  userResponseDto.error.push(responseError);
                  return of(new User());
                }
                throw e;
              }
            )
          )
        )
      ).pipe(
        concatMap((user, userIndex) =>
          from(user.address as number[])
            .pipe(
              concatMap((address, addressIndex) => this.getAddress(address as number)
                .pipe(
                  catchError((e) => {
                      if (e instanceof NotFoundException) {
                        const responseError = new ResponseError(
                          userResponseDto.error.length,
                          'user address not found: ' + address,
                          'not found',
                          [userIndex.toString(), 'address', addressIndex.toString()]
                        );
                        userResponseDto.error.push(responseError);
                        return of(new Address());
                      }
                      throw e;
                    }
                  )
                )
              ),
              toArray(),
              this.repackAddressToUser(user)
            )
        ),
        // take(takes),
        toArray(),
        map(users => {
            userResponseDto.data = users;
            return userResponseDto;
          }
        )
      );
  }

  getAddress(id: number): Observable<Address> {
    return this.httpService.get<TypicodeUser>(`https://jsonplaceholder.typicode.com/users/${id}`)
      .pipe(
        catchError((e) => {
          console.log(e.message);
          throw new NotFoundException();
        }),
        map(({ data }) => data),
        map(user => user.address as Address),
        map(address => ({ ...address, id: id }))
      );
  }

  getUser(id: number): Observable<TypicodeUser> {
    try {
      return this.httpService.get<TypicodeUser>(`https://jsonplaceholder.typicode.comm/userss/${id}`)
        .pipe(
          catchError((e: AxiosError) => {
            console.log(e);
            throw new NotFoundException();
          }),
          map(({ data: user }) => ({
            ...user,
            address: []
          })),
          tap(() => {
            if (Math.random() < 0.5) {
              throw new NotFoundException(id);
            }
          })
        );
    } catch (e) {
      throw new HttpException(e.message, e.status)
    }
  }

  getAddresses() {
    return this.httpService.get('https://jsonplaceholder.typicode.com/users')
      .pipe(
        map(({ data }) => data),
        map((data: User[]) => data),
        mergeMap(users => from(users)),
        map(user => user.address),
        take(10),
        toArray()
      );
  }

}
