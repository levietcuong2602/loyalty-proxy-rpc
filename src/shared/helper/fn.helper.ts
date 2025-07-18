/**
 * Effectively execute the function with the provided variable
 * when the variable is not nullish (not null nor undefined)
 * and safely fallback to the defined fallback value.
 * @param value
 * @param thenAction
 * @param orElse
 */
export function whenNotNullish<T, P, C = null>(
  value: T,
  thenAction: (val: T) => P,
  orElse?: C,
) {
  if (isNotNullish(value)) {
    return thenAction(value);
  }

  if (orElse) {
    return orElse;
  }

  return null as C;
}

/**
 * A function which check the value to be either `null` or `undefined`.
 * It returns TRUE if the value is not nullish.
 * @param value
 */
export function isNotNullish<T>(value: T | null): boolean {
  return value !== undefined && value !== null;
}

/**
 * Adding hostname to the existing field data.
 *
 * This function mutates the provided entity directly,
 * and return the same entity instance back.
 *
 * Format: `${hostName}/${entity[fieldName]}`
 * @param hostName
 * @param fieldName
 * @param entity
 */
export function appendHostDomain<
  T extends object,
  K extends Extract<keyof T, string>,
>(hostName: string, entity: T, fieldName: K) {
  if (typeof entity[fieldName] === 'string') {
    entity[fieldName] =
      `${hostName}/${entity[fieldName]}` as (typeof entity)[K];
  }

  return entity;
}

/**
 * Skip the main thread for ms
 * @param ms
 */
export function sleepFor(ms: number) {
  return new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms));
}

export function omitNullish<T>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => isNotNullish(value)),
  ) as Partial<T>;
}
