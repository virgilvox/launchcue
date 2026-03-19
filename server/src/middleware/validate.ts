import type { Request, Response, NextFunction } from 'express'
import { type ZodSchema, ZodError } from 'zod'

/**
 * Express middleware that validates req.body against a Zod schema.
 * Returns 400 with structured error details on validation failure.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: err.issues.map((issue) => ({
            path: String(issue.path.join('.')),
            message: issue.message,
          })),
        })
        return
      }
      next(err)
    }
  }
}
