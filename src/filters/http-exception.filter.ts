import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';

@Catch(HttpException, ValidationError)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor() {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    this.logger.error(exception.message);

    switch (status) {
      case HttpStatus.SERVICE_UNAVAILABLE:
        return response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: 'Service unavailable at the moment',
        });
      case HttpStatus.BAD_REQUEST:
        return response.status(status).json({
          statusCode: HttpStatus.PRECONDITION_FAILED,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      case HttpStatus.NOT_FOUND:
        return response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
        });

      default:
        return response.status(status).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: exception.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
    }
  }
}
