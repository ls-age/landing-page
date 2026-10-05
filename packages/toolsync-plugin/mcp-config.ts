/**
 * Expands `${VAR}`, `${VAR:-default}` and nested `${VAR:-${OTHER}}` in a parsed JSON value from
 * the given environment. Variables that are unset (or empty) and have no default are kept as-is
 * and collected in `missing`, so generating the config never fails.
 */
export function expandEnv(
  value: unknown,
  env: Record<string, string | undefined> = process.env,
): { value: unknown; missing: string[] } {
  const missing = new Set<string>();

  function expandString(input: string): string {
    let result = '';
    for (let i = 0; i < input.length; i++) {
      if (input[i] !== '$' || input[i + 1] !== '{') {
        result += input[i];
        continue;
      }

      // Find the matching closing brace, accounting for nested `${...}`.
      let depth = 1;
      let end = i + 2;
      while (end < input.length && depth > 0) {
        if (input[end] === '{') depth++;
        else if (input[end] === '}') depth--;
        end++;
      }
      if (depth > 0) {
        result += input.slice(i);
        break;
      }

      const body = input.slice(i + 2, end - 1);
      const separator = body.indexOf(':-');
      const name = separator === -1 ? body : body.slice(0, separator);
      const fallback = separator === -1 ? undefined : body.slice(separator + 2);

      if (env[name]) result += env[name];
      else if (fallback !== undefined) result += expandString(fallback);
      else {
        missing.add(name);
        result += `\${${name}}`;
      }
      i = end - 1;
    }
    return result;
  }

  function expand(item: unknown): unknown {
    if (typeof item === 'string') return expandString(item);
    if (Array.isArray(item)) return item.map(expand);
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, expand(entry)]));
    }
    return item;
  }

  return { value: expand(value), missing: [...missing] };
}
