import assert from 'node:assert/strict';
import test from 'node:test';
import { crc32, deflateSync } from 'node:zlib';
import { stripPngMetadata } from '../src/render/png';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type: string, data = Buffer.alloc(0)): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0); typeBytes.copy(result, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])) >>> 0, 8 + data.length);
  return result;
}

function fixture(): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 0;
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('eXIf', Buffer.from('MM\0*\0\0\0\bTAKIP_PRIVATE_EXIF', 'latin1')),
    chunk('tEXt', Buffer.from('Comment\0TAKIP_PRIVATE_TEXT', 'latin1')),
    chunk('tRNS', Buffer.from([0, 255])),
    chunk('IDAT', deflateSync(Buffer.from([0, 0]))),
    chunk('IEND'),
    Buffer.from('TAKIP_PRIVATE_TRAILING', 'latin1'),
  ]);
}

function chunks(png: Buffer): Array<{ type: string; bytes: Buffer }> {
  const result: Array<{ type: string; bytes: Buffer }> = [];
  for (let offset = signature.length; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const end = offset + 12 + length;
    const type = png.toString('ascii', offset + 4, offset + 8);
    result.push({ type, bytes: png.subarray(offset, end) });
    offset = end;
    if (type === 'IEND') break;
  }
  return result;
}

test('removes PNG metadata and trailing data while preserving rendering chunks verbatim', async () => {
  const input = fixture();
  const output = Buffer.from(await (await stripPngMetadata(new Blob([Uint8Array.from(input)]))).arrayBuffer());
  const safeTypes = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS']);
  const expected = chunks(input).filter(item => safeTypes.has(item.type));
  const actual = chunks(output);

  assert.deepEqual(actual.map(item => item.type), ['IHDR', 'tRNS', 'IDAT', 'IEND']);
  assert.deepEqual(actual.map(item => item.bytes), expected.map(item => item.bytes));
  assert.equal(output.includes(Buffer.from('TAKIP_PRIVATE')), false);
  assert.equal(output.length, signature.length + actual.reduce((sum, item) => sum + item.bytes.length, 0));
});

test('rejects a PNG chunk whose declared bounds exceed the file', async () => {
  const malformed = fixture();
  malformed.writeUInt32BE(0x7fffffff, signature.length);
  await assert.rejects(stripPngMetadata(new Blob([Uint8Array.from(malformed)])), /invalid PNG/);
});
