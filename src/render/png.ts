const signature = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const retainedChunks = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS']);
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

const invalidPng = () => new Error('The photo renderer returned an invalid PNG.');

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export async function stripPngMetadata(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < signature.length || !signature.every((value, index) => bytes[index] === value)) throw invalidPng();

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: Uint8Array[] = [bytes.subarray(0, signature.length)];
  let outputLength = signature.length;
  let offset = signature.length;
  let chunkCount = 0;
  let colorType = -1;
  let paletteEntries = 0;
  let sawHeader = false;
  let sawTransparency = false;
  let sawImageData = false;
  let imageDataEnded = false;
  let sawEnd = false;

  while (offset < bytes.length && !sawEnd) {
    if (++chunkCount > 10_000 || bytes.length - offset < 12) throw invalidPng();
    const length = view.getUint32(offset);
    if (length > 0x7fffffff || length > bytes.length - offset - 12) throw invalidPng();
    const dataStart = offset + 8;
    const crcOffset = dataStart + length;
    const end = crcOffset + 4;
    const typeBytes = bytes.subarray(offset + 4, dataStart);
    if (!typeBytes.every(value => value >= 65 && value <= 90 || value >= 97 && value <= 122)) throw invalidPng();
    const type = String.fromCharCode(...typeBytes);
    if (crc32(bytes, offset + 4, crcOffset) !== view.getUint32(crcOffset)) throw invalidPng();

    if (!sawHeader && (type !== 'IHDR' || length !== 13)) throw invalidPng();
    if (type === 'IHDR') {
      if (sawHeader || offset !== signature.length || length !== 13) throw invalidPng();
      sawHeader = true;
      colorType = bytes[dataStart + 9];
    } else if (type === 'PLTE') {
      if (!sawHeader || sawImageData || paletteEntries || length < 3 || length > 768 || length % 3) throw invalidPng();
      paletteEntries = length / 3;
    } else if (type === 'tRNS') {
      const validLength = colorType === 0 ? length === 2 : colorType === 2 ? length === 6
        : colorType === 3 ? length > 0 && length <= paletteEntries : false;
      if (!sawHeader || sawImageData || sawTransparency || !validLength) throw invalidPng();
      sawTransparency = true;
    } else if (type === 'IDAT') {
      if (!sawHeader || imageDataEnded || (colorType === 3 && !paletteEntries)) throw invalidPng();
      sawImageData = true;
    } else if (type === 'IEND') {
      if (!sawImageData || length !== 0) throw invalidPng();
      sawEnd = true;
    } else {
      if (sawImageData) imageDataEnded = true;
      // Unknown critical chunks cannot be removed without changing rendering.
      if (typeBytes[0] >= 65 && typeBytes[0] <= 90) throw invalidPng();
    }

    if (retainedChunks.has(type)) {
      const chunk = bytes.subarray(offset, end);
      chunks.push(chunk); outputLength += chunk.length;
    }
    offset = end;
  }
  if (!sawHeader || !sawImageData || !sawEnd) throw invalidPng();

  const output = new Uint8Array(outputLength);
  let outputOffset = 0;
  for (const chunk of chunks) { output.set(chunk, outputOffset); outputOffset += chunk.length; }
  return new Blob([output], { type: 'image/png' });
}
