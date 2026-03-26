export function extractPropertyFromStringyfiedJson(message: string, property: string): unknown | undefined {
  try {
    const json = JSON.parse(message);
    return json[property];
  } catch (error) {
    return undefined;
  }
}
