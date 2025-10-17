
export class BaseError extends Error {
  public readonly name: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(name: string, statusCode: number, description: string, isOperational: boolean) {
    super(description);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this);
  }
}

export class APIError extends BaseError {
  constructor(
    name: string,
    statusCode = 500,
    description = 'Internal Server Error',
    isOperational = true
  ) {
    super(name, statusCode, description, isOperational);
  }
}

export class HTTP400Error extends BaseError {
  constructor(description = 'Bad Request') {
    super('BAD_REQUEST', 400, description, true);
  }
}

export class HTTP401Error extends BaseError {
  constructor(description = 'Unauthorized') {
    super('UNAUTHORIZED', 401, description, true);
  }
}

export class HTTP403Error extends BaseError {
  constructor(description = 'Forbidden') {
    super('FORBIDDEN', 403, description, true);
  }
}

export class HTTP404Error extends BaseError {
  constructor(description = 'Not Found') {
    super('NOT_FOUND', 404, description, true);
  }
}

export class HTTP409Error extends BaseError {
  constructor(description = 'Conflict') {
    super('CONFLICT', 409, description, true);
  }
}
