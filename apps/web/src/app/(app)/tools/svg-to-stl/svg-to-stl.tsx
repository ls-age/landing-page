'use client';

import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
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
import { CircleCheckIcon, DownloadIcon, FileUpIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import {
  type ChangeEvent,
  type DragEvent,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import {
  type BaseKind,
  bounds,
  buildParts,
  defaultColorSettings,
  fileName,
  type ModelSettings,
  type Part,
  printedRegions,
  toMillimeters,
  toStl,
  toZip,
} from './model';
import { ModelPreview } from './model-preview';
import { parseSvg } from './parse-svg';
import { visibleRegions } from './regions';
import { defaultLineWidth, findThinAreas, unprintableWidth } from './thin-areas';

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

const isSvg = (file: File) => file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);

export function SvgToStl() {
  const [files, setFiles] = useState<SvgFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputId = useId();

  async function add(list: FileList | null) {
    const svgs = [...(list ?? [])].filter((file) => isSvg(file));
    const added = await Promise.all(
      svgs.map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        text: await file.text(),
      })),
    );
    setFiles((current) => [...added, ...current]);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void add(event.dataTransfer.files);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    void add(event.target.files);
    event.target.value = '';
  }

  return (
    <div className="flex flex-col gap-8">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-4 py-12 text-center transition-colors',
          dragging && 'border-primary bg-muted/50',
        )}
      >
        <FileUpIcon className="text-muted-foreground size-8" aria-hidden />
        <span className="font-medium">Drop SVG files here, or click to choose them</span>
        <span className="text-muted-foreground text-sm">
          Everything runs in your browser, your files aren&apos;t uploaded anywhere.
        </span>
        <input
          id={inputId}
          type="file"
          accept=".svg,image/svg+xml"
          multiple
          className="sr-only"
          onChange={onChange}
        />
      </label>

      {files.map((file) => (
        <SvgModel
          key={file.id}
          file={file}
          onRemove={() => setFiles((current) => current.filter(({ id }) => id !== file.id))}
        />
      ))}
    </div>
  );
}

const baseItems: { value: BaseKind; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'outline', label: 'Outline' },
  { value: 'rectangle', label: 'Rectangle' },
];

/** A number input that keeps its value while it's being edited and reports valid numbers only */
function NumberField({
  label,
  hideLabel = false,
  hint,
  value,
  onChange,
  min = 0,
  step = 0.1,
}: {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        defaultValue={value}
        onChange={(event) => {
          const number = event.target.valueAsNumber;
          if (Number.isFinite(number) && number >= min) onChange(number);
        }}
      />
      {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
    </div>
  );
}

function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-muted-foreground text-sm">{hint}</span>
      </div>
    </div>
  );
}

const format = (value: number, maximumFractionDigits = 1) =>
  value.toLocaleString('en', { maximumFractionDigits });

const formatShare = (share: number) => (share < 0.001 ? '<0.1' : format(share * 100));

function SvgModel({ file, onRemove }: { file: SvgFile; onRemove: () => void }) {
  const result = useMemo(() => {
    try {
      const { layers, warnings } = parseSvg(file.text);
      return { regions: visibleRegions(layers), warnings };
    } catch {
      return { regions: [], warnings: ['The file could not be read as an SVG.'] };
    }
  }, [file.text]);
  const { regions, warnings } = result;

  const [settings, setSettings] = useState<ModelSettings>({
    width: 100,
    colors: {},
    base: 'none',
    baseHeight: 1,
    baseMargin: 2,
    baseCutout: false,
    baseColor: '#ffffff',
    lineWidth: defaultLineWidth,
    removeUnprintable: false,
    thicken: false,
  });
  const update = (changes: Partial<ModelSettings>) =>
    setSettings((current) => ({ ...current, ...changes }));
  const [showThin, setShowThin] = useState(true);

  // Keeps the inputs responsive while the geometry is computed
  const deferred = useDeferredValue(settings);
  const { width, colors, lineWidth, removeUnprintable, thicken } = deferred;
  const printed = useMemo(
    () =>
      printedRegions(toMillimeters(regions, width), {
        colors,
        lineWidth,
        removeUnprintable,
        thicken,
      }),
    [regions, width, colors, lineWidth, removeUnprintable, thicken],
  );
  const thin = useMemo(() => findThinAreas(printed, lineWidth), [printed, lineWidth]);
  const parts = useMemo(() => buildParts(printed, deferred), [printed, deferred]);
  const highlights = useMemo(
    () =>
      showThin
        ? thin.map(({ color, shape }) => ({
            shape,
            z: (colors[color] ?? defaultColorSettings).height,
          }))
        : [],
    [showThin, thin, colors],
  );
  useEffect(
    () => () => {
      for (const { geometry } of parts) geometry.dispose();
    },
    [parts],
  );

  const box = bounds(regions);
  const height = box.width > 0 ? (box.height / box.width) * settings.width : 0;
  const totalArea = regions.reduce((sum, { area }) => sum + area, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="break-all text-xl">{file.name}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${file.name}`}>
          <XIcon />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {warnings.length > 0 && (
          <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
            {warnings.map((warning) => (
              <li key={warning} className="flex items-center gap-2">
                <TriangleAlertIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
                {warning}
              </li>
            ))}
          </ul>
        )}

        {regions.length === 0 ? (
          <p className="text-muted-foreground">This SVG has no filled shapes to convert.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <ModelPreview parts={parts} highlights={highlights} />

            <div className="flex flex-col gap-6">
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
                  <p className="flex h-9 items-center text-sm">{format(height)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3">
                  <h3 className="font-medium">Colors</h3>
                  <span className="text-muted-foreground w-28 text-sm" aria-hidden>
                    Height (mm)
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
                      <div className="flex min-w-0 flex-1 flex-col text-sm">
                        <span className="font-mono">{color}</span>
                        <span className="text-muted-foreground">
                          {format((area / totalArea) * 100)}% of the area
                        </span>
                      </div>
                      <div className="w-28">
                        <NumberField
                          label={`Height of ${color} (mm)`}
                          hideLabel
                          value={colorSettings.height}
                          min={0.1}
                          onChange={(height) => setColor({ height })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-medium">Thin areas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    label="Line width (mm)"
                    value={settings.lineWidth}
                    min={0.1}
                    step={0.01}
                    onChange={(lineWidth) => update({ lineWidth })}
                  />
                  <p className="text-muted-foreground self-end pb-2 text-sm">
                    PrusaSlicer prints 0.45 mm wide lines with a 0.4 mm nozzle
                  </p>
                </div>
                {thin.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm">
                    <CircleCheckIcon className="size-4 shrink-0 text-green-600" aria-hidden />
                    Everything is at least one line wide.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {thin.map(({ color, share }) => (
                      <li key={color} className="flex items-center gap-2">
                        <TriangleAlertIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
                        <span
                          className="size-3 shrink-0 rounded-full border"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        <span>
                          <span className="font-mono">{color}</span>: {formatShare(share)}% is
                          thinner than {format(lineWidth, 2)} mm
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <SwitchField
                  label="Show thin areas"
                  hint="Marks them in magenta in the preview"
                  checked={showThin}
                  onChange={setShowThin}
                />
                <SwitchField
                  label="Remove unprintable details"
                  hint={`Merges details thinner than ${format(unprintableWidth(settings.lineWidth), 2)} mm, which slicers skip, into the neighboring color`}
                  checked={settings.removeUnprintable}
                  onChange={(removeUnprintable) => update({ removeUnprintable })}
                />
                <SwitchField
                  label="Thicken thin areas"
                  hint="Widens them to one line, taking the space from the neighboring colors. Changes the look."
                  checked={settings.thicken}
                  onChange={(thicken) => update({ thicken })}
                />
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-medium">Base plate</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Shape</Label>
                    <Select
                      items={baseItems}
                      value={settings.base}
                      onValueChange={(base) => base && update({ base })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {baseItems.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {settings.base !== 'none' && (
                    <>
                      <NumberField
                        label="Thickness (mm)"
                        value={settings.baseHeight}
                        min={0.1}
                        onChange={(baseHeight) => update({ baseHeight })}
                      />
                      {settings.base === 'rectangle' && (
                        <NumberField
                          label="Margin (mm)"
                          value={settings.baseMargin}
                          onChange={(baseMargin) => update({ baseMargin })}
                        />
                      )}
                      {settings.base === 'rectangle' && (
                        <div className="col-span-2">
                          <SwitchField
                            label="Cut out the content"
                            hint="The colors fill holes in the plate instead of sitting on top of it"
                            checked={settings.baseCutout}
                            onChange={(baseCutout) => update({ baseCutout })}
                          />
                        </div>
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
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-medium">Download</h3>
                <p className="text-muted-foreground text-sm">
                  One STL per color. Load them together in your slicer as parts of one object and
                  assign a filament to each.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={parts.length === 0}
                    onClick={() =>
                      download(
                        `${file.name.replace(/\.svg$/i, '')}.zip`,
                        toZip(file.name, parts),
                        'application/zip',
                      )
                    }
                  >
                    <DownloadIcon data-icon="inline-start" />
                    All STLs (zip)
                  </Button>
                  {parts.map((part: Part) => (
                    <Button
                      key={part.name}
                      variant="outline"
                      onClick={() => download(fileName(file.name, part), toStl(part), 'model/stl')}
                    >
                      <span
                        className="size-3 rounded-full border"
                        style={{ backgroundColor: part.color }}
                        aria-hidden
                      />
                      {part.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
