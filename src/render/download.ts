export function downloadCopy(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'takip-safe-copy.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
