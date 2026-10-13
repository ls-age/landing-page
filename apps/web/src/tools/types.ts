import type { ComponentType } from 'react';

/** What a post shows for a tool, e.g. a drop area; opens the tool with what the user gave it */
export interface ToolTriggerProps<Input> {
  open: (input?: Input) => void;
  /** Starts over: forgets the tool's state and input */
  reset: () => void;
  /** Whether the tool was opened before (it keeps its state while the page is open) */
  opened: boolean;
  /** What the tool is working on, once it's opened */
  input?: Input;
}

/** The tool itself, rendered in a dialog; a new `input` replaces what it's working on */
export interface ToolProps<Input> {
  input?: Input;
  /** Reports what the tool works on when it changes there (e.g. another file chosen in the tool) */
  onInputChange: (input: Input) => void;
}

export interface ToolParts<Input> {
  Trigger: ComponentType<ToolTriggerProps<Input>>;
  Tool: ComponentType<ToolProps<Input>>;
}
