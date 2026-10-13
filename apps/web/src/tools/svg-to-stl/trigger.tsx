'use client';

import { Button } from '@workspace/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { ChevronDownIcon, XIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import type { ToolTriggerProps } from '../types';
import { DropArea, firstSvg, SvgInput } from './drop-area';
import { loadSample, samples, sampleUrl } from './samples';

/**
 * Opens the tool with a dropped or chosen SVG or a sample, or with the current one (shown as a
 * card)
 */
export function SvgToStlTrigger({ open, reset, input }: ToolTriggerProps<File>) {
  const [dragging, setDragging] = useState(false);
  const inputId = useId();

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const svg = firstSvg(event.dataTransfer.files);
        if (svg) open(svg);
      }}
    >
      <SvgInput id={inputId} onFile={open} />
      <DropArea inputId={inputId} dragging={dragging}>
        {input && <CurrentFile file={input} onOpen={() => open()} onRemove={reset} />}
        <Samples onLoad={open} />
      </DropArea>
    </div>
  );
}

/** The SVG the tool works on, which opens the tool again or is removed (starting over) */
function CurrentFile({
  file,
  onOpen,
  onRemove,
}: {
  file: File;
  onOpen: () => void;
  onRemove: () => void;
}) {
  // Shown as an image, which doesn't run the SVG's scripts
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative w-full max-w-sm">
      <button
        type="button"
        onClick={onOpen}
        className="bg-card text-card-foreground ring-foreground/10 hover:bg-muted flex w-full items-center gap-4 rounded-2xl p-3 text-left shadow-sm ring-1 transition-colors"
      >
        <span className="bg-muted/50 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl p-2">
          {url && (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL
            <img src={url} alt="" className="max-h-full max-w-full object-contain" />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium">{file.name}</span>
          <span className="text-muted-foreground text-sm">Click to continue</span>
        </span>
      </button>
      <Button
        variant="secondary"
        size="icon-xs"
        className="absolute -right-2 -top-2 rounded-full shadow-sm"
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </div>
  );
}

/** A menu of SVGs to try the tool with */
function Samples({ onLoad }: { onLoad: (file: File) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="secondary" size="sm" />}>
        Try a sample
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sample SVGs</DropdownMenuLabel>
          {samples.map((sample) => (
            <DropdownMenuItem
              key={sample.file}
              onClick={() => void loadSample(sample).then(onLoad, () => {})}
            >
              <span className="bg-muted/50 flex size-10 shrink-0 items-center justify-center rounded-lg p-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- a small static SVG */}
                <img src={sampleUrl(sample)} alt="" className="max-h-full max-w-full" />
              </span>
              <span className="flex flex-col">
                <span>{sample.name}</span>
                <span className="text-muted-foreground text-xs">{sample.description}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
