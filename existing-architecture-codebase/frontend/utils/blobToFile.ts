// Utility function to convert a Blob to a File
export function blobToFile(
  blob: Blob,
  fileName: string,
  mimeType?: string
): File {
  return new File([blob], fileName, {
    type: mimeType || blob.type || "application/octet-stream",
  });
}
