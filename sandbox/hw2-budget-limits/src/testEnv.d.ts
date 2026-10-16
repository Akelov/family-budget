// В песочнице нет доступа к npm-реестру, поэтому @types/node не установлен.
// Здесь объявлено только используемое в тестах подмножество node:test и node:assert/strict.
// Когда модуль переедет в основной проект на Vitest, файл нужно удалить.

declare module 'node:test' {
  type TestFn = () => void | Promise<void>;
  export function describe(name: string, fn: TestFn): void;
  export function test(name: string, fn: TestFn): void;
}

declare module 'node:assert/strict' {
  type ErrorConstructorLike = new (...args: never[]) => Error;

  interface StrictAssert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): asserts value;
    throws(fn: () => unknown, error?: ErrorConstructorLike | RegExp, message?: string): void;
    doesNotThrow(fn: () => unknown, message?: string): void;
  }

  const assert: StrictAssert;
  export default assert;
}
