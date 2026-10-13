'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { tools, type ToolSlug } from '@/lib/tools';
import { SvgToStlTrigger } from '@/tools/svg-to-stl/trigger';
import { ToolFooterProvider } from '@/tools/tool-actions';
import type { ToolParts } from '@/tools/types';

const define = <Input,>(parts: ToolParts<Input>) => parts as unknown as ToolParts<unknown>;

// The tools are loaded when they're first opened, their triggers right away
const parts: Record<ToolSlug, ToolParts<unknown>> = {
  'svg-to-stl': define<File>({
    Trigger: SvgToStlTrigger,
    Tool: dynamic(() => import('@/tools/svg-to-stl/svg-to-stl').then((tool) => tool.SvgToStl)),
  }),
};

/**
 * A tool embedded in a post (a `Tool` block): its trigger, which opens the tool in a dialog that
 * fills the screen. Only the close button and Escape close it, so a stray click keeps the work.
 */
export function PostTool({ tool }: { tool: ToolSlug }) {
  const { Trigger, Tool } = parts[tool];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<unknown>();
  // The tool renders into this element, which moves into the dialog while it's open: so the tool
  // keeps its state when the dialog closes (it's created when the tool is first opened)
  const [container, setContainer] = useState<HTMLDivElement>();
  // Where the tool's `ToolActions` go
  const [footer, setFooter] = useState<HTMLDivElement>();
  const body = useCallback(
    (element: HTMLDivElement | null) => {
      if (element && container) element.append(container);
    },
    [container],
  );

  return (
    <>
      <Trigger
        opened={container !== undefined}
        input={input}
        open={(next) => {
          if (next !== undefined) setInput(next);
          setContainer((current) => current ?? document.createElement('div'));
          setOpen(true);
        }}
        reset={() => {
          setInput(undefined);
          setContainer(undefined);
        }}
      />
      {container &&
        createPortal(
          <ToolFooterProvider value={footer}>
            <Tool input={input} onInputChange={setInput} />
          </ToolFooterProvider>,
          container,
        )}
      <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
        <DialogContent className="sm:rounded-4xl inset-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-4 rounded-none p-4 sm:inset-6 sm:mx-auto sm:h-auto sm:w-auto sm:max-w-7xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">{tools[tool]}</DialogTitle>
          </DialogHeader>
          {/* A size container, so tools can fill its height (`100cqh`); positioned, so absolutely
              positioned parts of the tool (e.g. hidden inputs) scroll with it */}
          <div
            ref={body}
            className="relative -mx-1 min-h-0 flex-1 overflow-y-auto px-1 [container-type:size]"
          />
          {/* Hidden until the tool puts actions in it */}
          <DialogFooter
            ref={(element) => setFooter(element ?? undefined)}
            className="bg-muted/50 sm:rounded-b-4xl -mx-4 -mb-4 items-end border-t p-4 empty:hidden sm:-mx-6 sm:-mb-6 sm:px-6"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
