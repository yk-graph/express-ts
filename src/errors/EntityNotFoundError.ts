import CustomError from './CustomError'

class EntityNotFoundError extends CustomError<ErrorCode> {
  constructor({ message, statusCode, code = 'ERR_NOT_FOUND' }: { message: string; statusCode: number; code?: ErrorCode }) {
    super({
      message,
      statusCode,
      code,
    })
  }
}

export default EntityNotFoundError
