/**
 * Functional composition helpers for pure data transformations.
 */

export type UnaryFn<A, B> = (arg: A) => B;

export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, fn1: UnaryFn<A, B>): B;
export function pipe<A, B, C>(value: A, fn1: UnaryFn<A, B>, fn2: UnaryFn<B, C>): C;
export function pipe<A, B, C, D>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>
): D;
export function pipe<A, B, C, D, E>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>
): E;
export function pipe<A, B, C, D, E, F>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>
): F;
export function pipe(value: unknown, ...fns: Array<UnaryFn<any, any>>): unknown {
  return fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Composes functions right-to-left into a single unary function.
 */
export function compose<A, B>(fn1: UnaryFn<A, B>): UnaryFn<A, B>;
export function compose<A, B, C>(fn2: UnaryFn<B, C>, fn1: UnaryFn<A, B>): UnaryFn<A, C>;
export function compose<A, B, C, D>(
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, D>;
export function compose(...fns: Array<UnaryFn<any, any>>): UnaryFn<any, any> {
  return (initial: unknown) => fns.reduceRight((acc, fn) => fn(acc), initial);
}
