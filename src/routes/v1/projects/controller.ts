import { Request, Response } from 'express'

import { prisma } from '../../../lib/prisma'
import EntityNotFoundError from '../../../errors/EntityNotFoundError'

export const listProjects = (req: Request, res: Response) => {
  res.status(200).json([])
}

export const getProject = async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: {
      id: req.params.id as string,
    },
  })

  if (!project) {
    throw new EntityNotFoundError({
      message: 'Project not found',
      statusCode: 404,
    })
  }

  res.status(200).json({})
}

export const listProjectTasks = (req: Request, res: Response) => {
  res.status(200).json([])
}
