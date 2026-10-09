export async function canRunSmartSummary(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: ReadonlySet<string> } | null> } }).gpu;
  if (!gpu) return false;
  try { return !!(await gpu.requestAdapter())?.features.has('shader-f16'); }
  catch { return false; }
}

export function validatePhoto(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'].includes(file.type)) {
    return 'Choose a JPEG, PNG, WebP, AVIF or camera photo.';
  }
  if (file.size > 30 * 1024 * 1024) return 'Choose a photo smaller than 30 MB.';
  if (!file.size) return 'This photo is empty. Choose another file.';
  return null;
}
