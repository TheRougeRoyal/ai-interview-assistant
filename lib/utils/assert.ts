/**
 * Assert a condition is true, throwing an error in development if it fails
 * @param cond - Condition to assert
 * @param msg - Error message to throw if condition fails
 */
export function assert(cond: unknown, msg: string): void { 
  if (process.env.NODE_ENV !== 'production' && !cond) { 
    throw new Error(msg) 
  } 
}