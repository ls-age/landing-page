'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { ButtonGroup, ButtonGroupSeparator } from '@workspace/ui/components/button-group';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Switch } from '@workspace/ui/components/switch';
import { cn } from '@workspace/ui/lib/utils';
import { CircleCheckIcon, DownloadIcon, MoreHorizontalIcon, TriangleAlertIcon } from 'lucide-react';
import {
  type DragEvent,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ToolActions } from '../tool-actions';
import type { ToolProps } from '../types';
import { DropArea, firstSvg, SvgInput } from './drop-area';
import {
  type BaseKind,
  type BasePlacement,
  bounds,
  buildParts,
  colorTop,
  defaultColorSettings,
  fileName,
  type ModelSettings,
  partLabel,
  printedRegions,
  toMillimeters,
  toStl,
  toZip,
} from './model';
import { ModelPreview } from './model-preview';
import { parseSvg } from './parse-svg';
import { visibleRegions } from './regions';
import { defaultLineWidth, findThinAreas, unprintableWidth } from './thin-areas';
import { threeMfFileName, toThreeMf } from './three-mf';

interface SvgFile {
  id: string;
  name: string;
  text: string;
}

function download(name: string, data: Uint8Array<ArrayBuffer>, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Converts one SVG at a time; a new `input` (or a chosen or dropped file) replaces it */
export function SvgToStl({ input, onInputChange }: ToolProps<File>) {
  const [file, setFile] = useState<SvgFile>();
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  // The file shown, so it isn't loaded again when it comes back as `input`
  const current = useRef<File>(undefined);

  async function choose(svg: File | undefined) {
    if (!svg || svg === current.current) return;
    current.current = svg;
    onInputChange(svg);
    setFile({ id: crypto.randomUUID(), name: svg.name, text: await svg.text() });
  }

  useEffect(() => {
    void choose(input);
    // `choose` only changes with `onInputChange`, which reports to the same place
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void choose(firstSvg(event.dataTransfer.files));
  }

  return (
    // Files can be dropped anywhere on the tool, also when the drop area is hidden
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
      className={cn(
        'flex flex-col gap-8 rounded-3xl transition-shadow',
        dragging && file && 'ring-primary ring-2 ring-offset-8',
      )}
    >
      <SvgInput id={inputId} onFile={(svg) => void choose(svg)} />
      {file ? (
        // A new file starts over with the default settings
        <SvgModel key={file.id} file={file} />
      ) : (
        <DropArea inputId={inputId} dragging={dragging} />
      )}
    </div>
  );
}

const placementItems: { value: BasePlacement; label: string }[] = [
  { value: 'cutout', label: 'Cut out' },
  { value: 'below', label: 'Below' },
];

const baseItems: { value: BaseKind; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'outline', label: 'Outline' },
  { value: 'rectangle', label: 'Rectangle' },
];

/**
 * A number input that keeps its value while it's being edited and reports valid numbers only.
 * With `onClear`, it may also be empty.
 */
function NumberField({
  label,
  hideLabel = false,
  inline = false,
  hint,
  value,
  placeholder,
  onChange,
  onClear,
  min = 0,
  step = 0.1,
}: {
  label: string;
  hideLabel?: boolean;
  /** Puts the label next to the input */
  inline?: boolean;
  hint?: string;
  value: number | undefined;
  placeholder?: string;
  onChange: (value: number) => void;
  onClear?: () => void;
  min?: number;
  step?: number;
}) {
  const id = useId();
  // The input keeps its own value while it's edited
  const [initialValue] = useState(value);

  return (
    <div className={cn('flex gap-2', inline ? 'items-center' : 'flex-col')}>
      <Label htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </Label>
      <Input
        id={id}
        className={cn(inline && 'w-24')}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        defaultValue={initialValue}
        placeholder={placeholder}
        onChange={(event) => {
          const number = event.target.valueAsNumber;
          if (Number.isFinite(number) && number >= min) onChange(number);
          else if (event.target.value === '') onClear?.();
        }}
      />
      {hint && <div className="text-muted-foreground text-sm">{hint}</div>}
    </div>
  );
}

/** An accordion item with a summary in its trigger and optional controls next to it */
function Section({
  value,
  title,
  actions,
  children,
}: {
  value: string;
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={value}>
      <div className="relative">
        <AccordionTrigger className="items-center">{title}</AccordionTrigger>
        {/*
         * Controls can't be inside the trigger (a button), so they're laid over it, between the
         * title and the chevron
         */}
        {actions && (
          <div className="absolute inset-y-0 right-10 flex items-center gap-2">{actions}</div>
        )}
      </div>
      <AccordionContent className="flex flex-col gap-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

function OptionField<T extends string>({
  label,
  inline = false,
  items,
  value,
  onChange,
}: {
  label: string;
  /** Puts the label next to the select */
  inline?: boolean;
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const id = useId();

  return (
    <div className={cn('flex gap-2', inline ? 'items-center' : 'flex-col')}>
      <Label id={id}>{label}</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(selected) => selected && onChange(selected)}
      >
        <SelectTrigger className={inline ? 'w-32' : 'w-full'} aria-labelledby={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SwitchField({
  label,
  hint,
  preview = false,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  /** Marks options that don't always work perfectly yet */
  preview?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Label htmlFor={id}>{label}</Label>
          {preview && <Badge variant="outline">Preview</Badge>}
        </div>
        <span className="text-muted-foreground text-sm">{hint}</span>
      </div>
    </div>
  );
}

const format = (value: number, maximumFractionDigits = 1) =>
  value.toLocaleString('en', { maximumFractionDigits });

const formatShare = (share: number) => (share < 0.001 ? '<0.1' : format(share * 100));

function Warnings({ warnings, className }: { warnings: string[]; className?: string }) {
  if (warnings.length === 0) return;
  return (
    <ul className={cn('text-muted-foreground flex flex-col gap-1 text-sm', className)}>
      {warnings.map((warning) => (
        <li key={warning} className="flex items-center gap-2">
          <TriangleAlertIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
          {warning}
        </li>
      ))}
    </ul>
  );
}

/** The settings and downloads of one SVG (in the dialog's footer) */
function SvgModel({ file }: { file: SvgFile }) {
  const result = useMemo(() => {
    try {
      const { layers, canvas, warnings } = parseSvg(file.text);
      return { regions: visibleRegions(layers), canvas, warnings };
    } catch {
      return {
        regions: [],
        canvas: undefined,
        warnings: ['The file could not be read as an SVG.'],
      };
    }
  }, [file.text]);
  const { regions, canvas, warnings } = result;

  const [settings, setSettings] = useState<ModelSettings>({
    width: 100,
    trim: true,
    height: 1,
    colors: {},
    base: 'rectangle',
    baseMargin: 0,
    basePlacement: 'cutout',
    baseColor: '#ffffff',
    lineWidth: defaultLineWidth,
    removeUnprintable: false,
    thicken: false,
  });
  const update = (changes: Partial<ModelSettings>) =>
    setSettings((current) => ({ ...current, ...changes }));
  const [showThin, setShowThin] = useState(false);
  const [background, setBackground] = useState<string>();

  // Keeps the inputs responsive while the geometry is computed
  const deferred = useDeferredValue(settings);
  const { width, trim, colors, lineWidth, removeUnprintable, thicken } = deferred;
  const frame = useMemo(() => {
    const selected = regions.filter(({ color }) => (colors[color] ?? defaultColorSettings).enabled);
    if (trim || !canvas) return bounds(selected.length > 0 ? selected : regions);
    return canvas;
  }, [regions, canvas, trim, colors]);
  const model = useMemo(() => toMillimeters(regions, width, frame), [regions, width, frame]);
  const printed = useMemo(
    () => printedRegions(model.regions, { colors, lineWidth, removeUnprintable, thicken }),
    [model, colors, lineWidth, removeUnprintable, thicken],
  );
  const thin = useMemo(() => findThinAreas(printed, lineWidth), [printed, lineWidth]);
  const parts = useMemo(
    () => buildParts(printed, deferred, model.frame),
    [printed, deferred, model],
  );
  const highlights = useMemo(
    () =>
      showThin ? thin.map(({ color, shape }) => ({ shape, z: colorTop(deferred, color) })) : [],
    [showThin, thin, deferred],
  );
  useEffect(
    () => () => {
      for (const { geometry } of parts) geometry.dispose();
    },
    [parts],
  );

  const height = frame.width > 0 ? (frame.height / frame.width) * settings.width : 0;
  const totalArea = regions.reduce((sum, { area }) => sum + area, 0);
  const selectedCount = regions.filter(
    ({ color }) => (settings.colors[color] ?? defaultColorSettings).enabled,
  ).length;
  const fixes = [
    settings.removeUnprintable && 'remove unprintable',
    settings.thicken && 'thicken',
  ].filter(Boolean);

  return (
    <section className="grid gap-8 md:grid-cols-2">
      {/* Fills the dialog's height on wider screens, and stays in view while the settings scroll */}
      <div className="relative self-start md:sticky md:top-0">
        {regions.length > 0 ? (
          <>
            <ModelPreview
              parts={parts}
              highlights={highlights}
              background={background}
              className="md:aspect-auto md:h-[100cqh]"
            />
            <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col items-start gap-2 *:pointer-events-auto">
              <span className="bg-background/80 max-w-full truncate rounded-full px-3 py-1 text-sm font-medium backdrop-blur">
                {file.name}
              </span>
              <Warnings
                warnings={warnings}
                className="bg-background/80 rounded-2xl px-3 py-2 backdrop-blur"
              />
            </div>
            {/* Small, at the bottom end of the preview */}
            <div className="bg-background/80 ring-foreground/10 absolute bottom-3 right-3 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs shadow-sm ring-1 backdrop-blur">
              <Input
                id={`${file.id}-background`}
                type="color"
                value={background || '#d4d4d4'}
                onChange={(event) => setBackground(event.target.value)}
                aria-label="Background"
                title="Background"
                className="h-6 w-8 rounded-full p-0.5"
              />
              {background && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setBackground(undefined)}
                  aria-label="Reset the background"
                >
                  Reset
                </Button>
              )}
              <Switch
                id={`${file.id}-show-thin`}
                size="sm"
                checked={showThin}
                onCheckedChange={setShowThin}
              />
              <Label htmlFor={`${file.id}-show-thin`} className="text-xs">
                Show thin areas
              </Label>
            </div>
          </>
        ) : (
          <Card size="sm">
            <CardHeader>
              <CardTitle className="truncate">{file.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Warnings warnings={[...warnings, 'This SVG has no filled shapes to convert.']} />
            </CardContent>
          </Card>
        )}

        {parts.length > 0 && (
          <ToolActions>
            <ButtonGroup>
              <Button
                onClick={() =>
                  download(threeMfFileName(file.name), toThreeMf(file.name, parts), 'model/3mf')
                }
              >
                <DownloadIcon data-icon="inline-start" />
                Download 3MF
              </Button>
              <ButtonGroupSeparator />
              <Button
                variant="outline"
                onClick={() =>
                  download(
                    `${file.name.replace(/\.svg$/i, '')}.zip`,
                    toZip(file.name, parts),
                    'application/zip',
                  )
                }
              >
                Download STLs
              </Button>
              <ButtonGroupSeparator />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="icon" aria-label="Download single STLs" />
                  }
                >
                  <MoreHorizontalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Download individual STLs</DropdownMenuLabel>
                    {parts.map((part) => (
                      <DropdownMenuItem
                        key={part.name}
                        onClick={() =>
                          download(fileName(file.name, part), toStl(part), 'model/stl')
                        }
                      >
                        <span
                          className="size-3 shrink-0 rounded-full border"
                          style={{ backgroundColor: part.color }}
                          aria-hidden
                        />
                        <span className={cn(part.name !== 'base' && 'font-mono')}>
                          {partLabel(part)}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          </ToolActions>
        )}
      </div>

      {regions.length > 0 && (
        <Accordion multiple defaultValue={['colors']} className="self-start">
          <Section
            value="size"
            title={`Size (${format(settings.width)} × ${format(height)}${settings.trim && canvas ? ', trimmed' : ''})`}
          >
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Width (mm)"
                value={settings.width}
                min={1}
                step={1}
                onChange={(width) => update({ width })}
              />
              <div className="flex flex-col gap-2">
                <Label>Height (mm)</Label>
                <div className="flex h-9 items-center">{format(height)}</div>
              </div>
            </div>
            {canvas && (
              <SwitchField
                label="Trim to the content"
                hint="Fits the model and base plate to the selected colors instead of the SVG's canvas"
                checked={settings.trim}
                onChange={(trim) => update({ trim })}
              />
            )}
          </Section>

          <Section
            value="colors"
            title={
              selectedCount === regions.length
                ? `${regions.length} ${regions.length === 1 ? 'color' : 'colors'}`
                : `${selectedCount} of ${regions.length} colors`
            }
            actions={
              <NumberField
                label="Height"
                inline
                value={settings.height}
                min={0.1}
                onChange={(height) => update({ height })}
              />
            }
          >
            <div className="flex items-end justify-between gap-3">
              <div className="text-muted-foreground">
                Heights are in mm. Colors without their own use the one above.
              </div>
              <span className="w-24 shrink-0 font-medium" aria-hidden>
                Height
              </span>
            </div>
            {regions.map(({ color, area }) => {
              const colorSettings = settings.colors[color] ?? defaultColorSettings;
              const setColor = (changes: Partial<typeof colorSettings>) =>
                update({
                  colors: { ...settings.colors, [color]: { ...colorSettings, ...changes } },
                });

              return (
                <div key={color} className="flex items-center gap-3">
                  <Switch
                    checked={colorSettings.enabled}
                    onCheckedChange={(enabled) => setColor({ enabled })}
                    aria-label={`Include ${color}`}
                  />
                  <span
                    className="size-6 shrink-0 rounded-full border"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-mono">{color}</span>
                    <span className="text-muted-foreground">
                      {format((area / totalArea) * 100)}% of the area
                    </span>
                  </div>
                  <div className="w-24">
                    <NumberField
                      label={`Height of ${color} (mm)`}
                      hideLabel
                      value={colorSettings.height}
                      placeholder={format(settings.height, 2)}
                      min={0.1}
                      onChange={(height) => setColor({ height })}
                      onClear={() => setColor({ height: undefined })}
                    />
                  </div>
                </div>
              );
            })}
          </Section>

          <Section
            value="thin-areas"
            title={
              <span className="flex items-center gap-2">
                {thin.length > 0 && (
                  <TriangleAlertIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
                )}
                {fixes.length > 0 ? `Thin areas (${fixes.join(', ')})` : 'Thin areas'}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Line width (mm)"
                value={settings.lineWidth}
                min={0.1}
                step={0.01}
                onChange={(lineWidth) => update({ lineWidth })}
              />
              <div className="text-muted-foreground self-end pb-2">
                PrusaSlicer prints 0.45 mm wide lines with a 0.4 mm nozzle
              </div>
            </div>
            {thin.length === 0 ? (
              <div className="flex items-center gap-2">
                <CircleCheckIcon className="size-4 shrink-0 text-green-600" aria-hidden />
                Everything is at least one line wide.
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {thin.map(({ color, share }) => (
                  <li key={color} className="flex items-center gap-2">
                    <TriangleAlertIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
                    <span
                      className="size-3 shrink-0 rounded-full border"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span>
                      <span className="font-mono">{color}</span>: {formatShare(share)}% is thinner
                      than {format(lineWidth, 2)} mm
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <SwitchField
              label="Remove unprintable details"
              preview
              hint={`Merges details thinner than ${format(unprintableWidth(settings.lineWidth), 2)} mm, which slicers skip, into the neighboring color`}
              checked={settings.removeUnprintable}
              onChange={(removeUnprintable) => update({ removeUnprintable })}
            />
            <SwitchField
              label="Thicken thin areas"
              preview
              hint="Widens them to one line, taking the space from the neighboring colors. Changes the look."
              checked={settings.thicken}
              onChange={(thicken) => update({ thicken })}
            />
          </Section>

          <Section
            value="base-plate"
            title="Base plate"
            actions={
              <OptionField
                label="Shape"
                inline
                items={baseItems}
                value={settings.base}
                onChange={(base) => update({ base })}
              />
            }
          >
            {settings.base === 'none' ? (
              <div className="text-muted-foreground">No base plate, just the colors.</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <NumberField
                  label="Thickness (mm)"
                  value={settings.baseHeight}
                  placeholder={format(settings.height, 2)}
                  min={0.1}
                  onChange={(baseHeight) => update({ baseHeight })}
                  onClear={() => update({ baseHeight: undefined })}
                />
                {settings.base === 'rectangle' && (
                  <NumberField
                    label="Margin (mm)"
                    value={settings.baseMargin}
                    onChange={(baseMargin) => update({ baseMargin })}
                  />
                )}
                {settings.base === 'rectangle' && (
                  <OptionField
                    label="Placement"
                    items={placementItems}
                    value={settings.basePlacement}
                    onChange={(basePlacement) => update({ basePlacement })}
                  />
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${file.id}-base-color`}>Preview color</Label>
                  <Input
                    id={`${file.id}-base-color`}
                    type="color"
                    value={settings.baseColor}
                    onChange={(event) => update({ baseColor: event.target.value })}
                    className="p-1"
                  />
                </div>
              </div>
            )}
          </Section>
        </Accordion>
      )}
    </section>
  );
}
