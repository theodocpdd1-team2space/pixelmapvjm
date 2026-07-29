"use client";

import { ImagePlus } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/stores/editor-store";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readImageSize(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = dataUrl;
  });
}

export function LogoUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addLogo = useEditorStore((state) => state.addLogo);

  return (
    <>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";

          if (!file) {
            return;
          }

          void readFileAsDataUrl(file)
            .then(async (dataUrl) => {
              const size = await readImageSize(dataUrl);
              addLogo({
                dataUrl,
                fileName: file.name,
                naturalWidth: size.width,
                naturalHeight: size.height
              });
            })
            .catch(() => undefined);
        }}
      />
      <Button type="button" className="h-12 w-full" onClick={() => inputRef.current?.click()}>
        <ImagePlus size={16} />
        ADD LOGO
      </Button>
    </>
  );
}
