// Share fully decoded images between upload, the live canvas, and exports.
// In particular, do not publish a newly uploaded URL before it is drawable.
const loaded = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();

export function getEditorImage(src: string) {
  return loaded.get(src);
}

export function loadEditorImage(src: string): Promise<HTMLImageElement> {
  const cached = loaded.get(src);
  if (cached) return Promise.resolve(cached);
  const request = pending.get(src);
  if (request) return request;
  const result = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Gambar tidak dapat dimuat."));
    image.onload = async () => {
      try {
        if (image.decode) await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error("Gambar tidak memiliki ukuran valid.");
        if (loaded.size >= 32) loaded.delete(loaded.keys().next().value!);
        loaded.set(src, image);
        resolve(image);
      } catch (error) { reject(error); }
      finally { image.onload = null; image.onerror = null; }
    };
    image.src = src;
  }).finally(() => pending.delete(src));
  pending.set(src, result);
  return result;
}
