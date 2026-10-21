/** Names of the `{placeholders}` found in a message template. */
export type Placeholders<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholders<Rest>
  : never;

/** Same tree as `T` with every message widened to `string`; used to force other languages to match English. */
export type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

type SamePlaceholders<A extends string, B extends string> = [Placeholders<A>] extends [Placeholders<B>]
  ? [Placeholders<B>] extends [Placeholders<A>]
    ? true
    : false
  : false;

/** Dotted paths of the messages whose placeholders differ between `A` and `B` (never when they all match). */
export type PlaceholderMismatch<A, B, P extends string = ""> = {
  [K in keyof A & string]: A[K] extends string
    ? B[K & keyof B] extends string
      ? SamePlaceholders<A[K], B[K & keyof B]> extends true
        ? never
        : `${P}${K}`
      : `${P}${K}`
    : PlaceholderMismatch<A[K], B[K & keyof B], `${P}${K}.`>;
}[keyof A & string];

type MessageArgs<S extends string> = [Placeholders<S>] extends [never]
  ? []
  : [vars: Record<Placeholders<S>, string | number>];

/** Callable tree: every message becomes a function that requires exactly the variables its template declares. */
export type Messages<T> = {
  [K in keyof T]: T[K] extends string ? (...args: MessageArgs<T[K]>) => string : Messages<T[K]>;
};
