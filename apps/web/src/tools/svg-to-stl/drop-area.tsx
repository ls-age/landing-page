import { cn } from '@workspace/ui/lib/utils';
import { FileUpIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const isSvg = (file: File) => file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);

export const firstSvg = (list: FileList | null) =>
  [...(list ?? [])].find((candidate) => isSvg(candidate));

/** The SVG file input, hidden behind labels pointing to `id` */
export function SvgInput({ id, onFile }: { id: string; onFile: (file: File) => void }) {
  return (
    <input
      id={id}
      type="file"
      accept=".svg,image/svg+xml"
      className="sr-only"
      onChange={(event) => {
        const svg = firstSvg(event.target.files);
        if (svg) onFile(svg);
        event.target.value = '';
      }}
    />
  );
}

/**
 * Asks for an SVG file, for the input `inputId`, with `children` (e.g. the current file) below;
 * dropping is handled by the surrounding element
 */
export function DropArea({
  inputId,
  dragging,
  children,
}: {
  inputId: string;
  dragging: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'hover:bg-muted/50 relative flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-4 py-12 text-center transition-colors',
        dragging && 'border-primary bg-muted/50',
      )}
    >
      {/* Covers the whole area, behind the children (which can't be inside a label) */}
      <label htmlFor={inputId} className="absolute inset-0 cursor-pointer rounded-3xl">
        <span className="sr-only">Choose an SVG file</span>
      </label>
      <FileUpIcon className="text-muted-foreground pointer-events-none size-8" aria-hidden />
      <span className="pointer-events-none font-medium" aria-hidden>
        Drop an SVG file here, or click to choose one
      </span>
      <span className="text-muted-foreground pointer-events-none text-sm">
        Everything runs in your browser, <strong>your files aren&apos;t uploaded anywhere</strong>.
      </span>
      {children && (
        // Clicks next to the children go to the label below
        <div className="pointer-events-none relative mt-4 flex w-full flex-col items-center gap-4 *:pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
}
