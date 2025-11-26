import { logger } from './logger.js';

export const encodeCursor = (data) => {
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

export const decodeCursor = (cursor) => {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch (error) {
    logger.error({ error, cursor }, 'Failed to decode cursor');
    return null;
  }
};

export const buildCursorPagination = (options = {}) => {
  const {
    cursor,
    limit = 50,
    orderBy = { createdAt: 'desc' },
    cursorField = 'id'
  } = options;

  const maxLimit = 100;
  const pageSize = Math.min(parseInt(limit) || 50, maxLimit);

  const queryOptions = {
    take: pageSize + 1,
    orderBy
  };

  if (cursor) {
    const decodedCursor = decodeCursor(cursor);
    if (decodedCursor) {
      queryOptions.cursor = { [cursorField]: decodedCursor[cursorField] };
      queryOptions.skip = 1;
    }
  }

  return queryOptions;
};

export const formatCursorResponse = (items, limit, cursorField = 'id') => {
  const pageSize = parseInt(limit) || 50;
  const hasMore = items.length > pageSize;
  
  const data = hasMore ? items.slice(0, -1) : items;
  
  const nextCursor = hasMore && data.length > 0
    ? encodeCursor({ [cursorField]: data[data.length - 1][cursorField] })
    : null;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore,
      count: data.length
    }
  };
};

export const buildOffsetPagination = (options = {}) => {
  const { page = 1, limit = 50, orderBy = { createdAt: 'desc' } } = options;

  const maxLimit = 100;
  const pageSize = Math.min(parseInt(limit) || 50, maxLimit);
  const pageNumber = Math.max(parseInt(page) || 1, 1);

  return {
    skip: (pageNumber - 1) * pageSize,
    take: pageSize,
    orderBy
  };
};

export const formatOffsetResponse = (items, total, page, limit) => {
  const pageSize = parseInt(limit) || 50;
  const pageNumber = parseInt(page) || 1;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: items,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages,
      hasNext: pageNumber < totalPages,
      hasPrev: pageNumber > 1
    }
  };
};

export const paginationMiddleware = (req, res, next) => {
  const { cursor, page, limit = 50 } = req.query;
  
  req.paginationType = cursor ? 'cursor' : 'offset';
  req.paginationParams = {
    cursor,
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 50, 100)
  };

  next();
};
