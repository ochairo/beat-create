const controls = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;

export function hasControlCharacters(value: string): boolean {
  return controls.test(value);
}

export function displayText(value: string): string {
  return Array.from(value, (character) => controls.test(character)
    ? `\\u${character.codePointAt(0)!.toString(16).padStart(4, "0")}`
    : character).join("");
}

export function quotePosixPath(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}
