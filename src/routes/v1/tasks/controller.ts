import { NextFunction, Request, Response } from 'express'

import EntityNOtFoundError from '../../../errors/EntityNotFoundError'

export const listTasks = (req: Request, res: Response) => {
  res.status(200).json([])
}

export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  throw new EntityNOtFoundError({
    message: 'Task not found',
    statusCode: 404,
    code: 'ERR_NOT_FOUND',
  })
  res.status(200).json({ id: 1, name: 'Sample Task' })
}
