/**
 * Reading an uploaded image into the document.
 *
 * Files are stored inline as data URLs so a document stays self-contained and
 * needs no upload endpoint or storage — which also means the file's bytes end
 * up in `localStorage` and in every saved `.json`, hence the ceiling.
 */

/** Data URLs live inside the document, so keep uploads small. */
const MAX_IMAGE_BYTES = 1024 * 1024;

export type ImageReadFailure = 'too_large' | 'not_an_image' | 'unreadable';

export type ImageReadResult
  = | { readonly ok: true; readonly src: string }
    | { readonly ok: false; readonly reason: ImageReadFailure };

export async function readImageFile(file: File): Promise<ImageReadResult> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, reason: 'not_an_image' };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'too_large' };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      const src = String(reader.result ?? '');

      resolve(
        src ? { ok: true, src } : { ok: false, reason: 'unreadable' },
      );
    };
    reader.onerror = () => resolve({ ok: false, reason: 'unreadable' });
    reader.readAsDataURL(file);
  });
}

/** The first image among dropped items, ignoring anything else in the payload. */
export function firstImageFile(transfer: DataTransfer): File | null {
  return [...transfer.files].find(file => file.type.startsWith('image/')) ?? null;
}
