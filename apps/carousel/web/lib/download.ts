export function triggerDownload(href: string, filename: string, revokeAfter = false) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revokeAfter) window.URL.revokeObjectURL(href);
}
