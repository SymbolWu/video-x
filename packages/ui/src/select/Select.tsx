import * as SelectPrimitive from "@radix-ui/react-select";
export type SelectOption = { value: string; label: string; disabled?: boolean };
const EMPTY_SELECT_VALUE = "__video_x_empty__";
/** Shared themed select. Radix owns keyboard navigation, focus and form association. */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  name,
  required,
  disabled,
}: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const encode = (value: string) => value || EMPTY_SELECT_VALUE;
  return (
    <SelectPrimitive.Root
      name={name}
      required={required}
      disabled={disabled}
      value={value === undefined ? undefined : encode(value)}
      defaultValue={
        defaultValue === undefined ? undefined : encode(defaultValue)
      }
      onValueChange={(next) =>
        onValueChange?.(next === EMPTY_SELECT_VALUE ? "" : next)
      }
    >
      <SelectPrimitive.Trigger className="select-trigger" aria-label={label}>
        <SelectPrimitive.Value placeholder="请选择" />
        <SelectPrimitive.Icon className="select-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="select-content"
          position="popper"
          sideOffset={7}
          collisionPadding={12}
        >
          <SelectPrimitive.ScrollUpButton className="select-scroll">
            ⌃
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="select-item"
                key={option.value}
                value={encode(option.value)}
                disabled={option.disabled}
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="select-check">
                  ✓
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="select-scroll">
            ⌄
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
