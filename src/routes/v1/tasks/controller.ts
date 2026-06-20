import { Request, Response } from 'express'

import EntityNotFoundError from '../../../errors/EntityNotFoundError'
import { prisma } from '../../../lib/prisma'

export const listTasks = (req: Request, res: Response) => {
  res.status(200).json([])
}

export const getTask = async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({
    where: {
      id: req.params.id as string,
    },
  })
  if (!task) {
    throw new EntityNotFoundError({
      message: 'Task not found',
      statusCode: 404,
    })
  }

  res.status(200).json({ task })
}
