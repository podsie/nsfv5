const NEWLINE = 10;

/**
 * Reads a file as a stream and calls onLine with the bytes of each line and
 * the line's byte offset in the file. The bytes exclude the newline.
 */
export const scanLines = async (
  blob: Blob,
  onLine: (bytes: Uint8Array, offset: number) => void,
  onProgress: (fraction: number) => void = () => {},
): Promise<void> => {
  const reader = blob.stream().getReader();
  let carry: Uint8Array | null = null;
  let base = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    let buffer: Uint8Array = value;
    if (carry !== null) {
      buffer = new Uint8Array(carry.length + value.length);
      buffer.set(carry);
      buffer.set(value, carry.length);
    }
    let start = 0;
    for (;;) {
      const end = buffer.indexOf(NEWLINE, start);
      if (end === -1) break;
      onLine(buffer.subarray(start, end), base + start);
      start = end + 1;
    }
    carry = start < buffer.length ? buffer.slice(start) : null;
    base += start;
    onProgress(blob.size === 0 ? 1 : base / blob.size);
  }
  if (carry !== null) onLine(carry, base);
};
