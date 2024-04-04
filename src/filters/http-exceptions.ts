import { HttpException, HttpStatus } from '@nestjs/common';

export class ConnectionTimeoutException extends HttpException {
  constructor() {
    super('Custom exception message', HttpStatus.REQUEST_TIMEOUT);
  }
}