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

/** Long edge of a rasterised SVG. Enough to stay sharp on a printed label. */
const SVG_RASTER_EDGE = 1600;

/**
 * Redraws an SVG as a PNG.
 *
 * `@react-pdf/renderer` draws PNG and JPEG and silently ignores an SVG image —
 * the export completes, the file looks fine, and the logo is simply not on it.
 * Verified against the content stream: the same artwork produces no image
 * XObject as an SVG and two as a PNG. So the conversion happens here, on the
 * way in, and every renderer afterwards sees one format they all agree on.
 */
function rasterizeSvg(dataUrl: string): Promise<ImageReadResult> {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const longEdge = Math.max(image.naturalWidth, image.naturalHeight) || 1;
      const scale = SVG_RASTER_EDGE / longEdge;
      const canvas = document.createElement('canvas');

      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

      const context = canvas.getContext('2d');

      if (!context) {
        resolve({ ok: false, reason: 'unreadable' });

        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve({ ok: true, src: canvas.toDataURL('image/png') });
    };
    image.onerror = () => resolve({ ok: false, reason: 'unreadable' });
    image.src = dataUrl;
  });
}

export async function readImageFile(file: File): Promise<ImageReadResult> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, reason: 'not_an_image' };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'too_large' };
  }

  const read = await new Promise<ImageReadResult>((resolve) => {
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

  if (read.ok && file.type === 'image/svg+xml') {
    return rasterizeSvg(read.src);
  }

  return read;
}

/** The first image among dropped items, ignoring anything else in the payload. */
export function firstImageFile(transfer: DataTransfer): File | null {
  return [...transfer.files].find(file => file.type.startsWith('image/')) ?? null;
}
