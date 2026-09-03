import type { Is, IsFalse, IsNot, IsTrue } from '../sdk/types.gen.js'

export function Operator<T extends string, V>(
  o: { operator: Uncapitalize<T> } & V
): { operator: T } & V {
  return o as { operator: T } & V
}

export function isTrue(): IsTrue {
  return Operator({ operator: 'isTrue' })
}

export function isFalse(): IsFalse {
  return Operator({ operator: 'isFalse' })
}

export function isEqualTo<T>(value: T): Is {
  return Operator({ operator: 'is', value: value })
}

export function isNotEqualTo<T>(value: T): IsNot {
  return Operator({ operator: 'isNot', value: value })
}
