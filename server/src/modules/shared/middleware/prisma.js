import prisma from '../../../core/database/client.js';

export const prismaMiddleware = (req, res, next) => {
  req.prisma = prisma;
  next();
};
