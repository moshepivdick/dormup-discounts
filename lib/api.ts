import type { NextApiRequest, NextApiResponse } from 'next';
import type { ZodSchema } from 'zod';

export const apiResponse = {
  success<T>(res: NextApiResponse, data: T, status = 200) {
    return res.status(status).json({ success: true, data });
  },
  error(res: NextApiResponse, status: number, message: string, details?: unknown) {
    return res.status(status).json({ success: false, message, details });
  },
};

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<unknown> | unknown;

export const withMethods = (methods: string[], handler: Handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (!methods.includes(req.method ?? '')) {
      res.setHeader('Allow', methods);
      return apiResponse.error(res, 405, 'Method not allowed');
    }
    return handler(req, res);
  };
};

export const withValidation = <T>(
  schema: ZodSchema<T>,
  handler: (req: NextApiRequest & { body: T }, res: NextApiResponse) => Promise<unknown>,
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return apiResponse.error(res, 400, 'Invalid payload', result.error.flatten());
    }
    const nextReq = Object.assign(req, { body: result.data });
    return handler(nextReq, res);
  };
};

