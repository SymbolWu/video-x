import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { StudioIcon } from "../../shared/StudioIcon";
import {
  earliestReleaseYear,
  latestReleaseYear,
  normalizeReleaseDate,
  releaseDateValue,
  validReleaseDate,
} from "./releaseDate";
import "./release-date.css";

const monthNames = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const start = Date.UTC(earliestReleaseYear, 0, 1);
const end = Date.UTC(latestReleaseYear, 11, 31);

function atDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function inMonth(focus: Date, year: number, month: number) {
  const first = atDate(year, month, 1);
  const lastDay = atDate(
    first.getUTCFullYear(),
    first.getUTCMonth() + 1,
    0,
  ).getUTCDate();
  return atDate(
    first.getUTCFullYear(),
    first.getUTCMonth(),
    Math.min(focus.getUTCDate(), lastDay),
  );
}

function todayAsDate() {
  const today = new Date();
  return atDate(today.getFullYear(), today.getMonth(), today.getDate());
}

export function ReleaseDateField({
  value,
  legacyYear,
  error,
  onChange,
}: {
  value: string;
  legacyYear?: number | null;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(todayAsDate);
  const [align, setAlign] = useState({ up: false, end: false, maxHeight: 336 });
  const root = useRef<HTMLDivElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusDay = useRef(false);
  const selected = normalizeReleaseDate(value);
  const cursorValue = releaseDateValue(cursor);
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const first = atDate(year, month, 1);
  const offset = (first.getUTCDay() + 6) % 7;
  const today = releaseDateValue(todayAsDate());

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  function show() {
    if (open) return close();
    const current = todayAsDate();
    const year =
      legacyYear &&
      legacyYear >= earliestReleaseYear &&
      legacyYear <= latestReleaseYear
        ? legacyYear
        : current.getUTCFullYear();
    setCursor(
      validReleaseDate(selected)
        ? new Date(selected)
        : atDate(year, current.getUTCMonth(), 1),
    );
    focusDay.current = true;
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    function positionCalendar() {
      const anchor = calendar.current?.parentElement?.getBoundingClientRect();
      if (!anchor) return;
      if (anchor.bottom < 0 || anchor.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const above = anchor.top - 15;
      const below = window.innerHeight - anchor.bottom - 15;
      const up = below < 336 && above > below;
      const calendarWidth = Math.min(302, window.innerWidth - 44);
      setAlign({
        up,
        end: anchor.left + calendarWidth > window.innerWidth - 12,
        maxHeight: Math.max(1, up ? above : below),
      });
    }
    positionCalendar();
    window.addEventListener("resize", positionCalendar);
    window.addEventListener("scroll", positionCalendar, { passive: true });
    return () => {
      window.removeEventListener("resize", positionCalendar);
      window.removeEventListener("scroll", positionCalendar);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const popup = calendar.current;
    const button = popup?.querySelector<HTMLButtonElement>(
      '[data-date="' + cursorValue + '"]',
    );
    if (popup && button) {
      if (focusDay.current) {
        focusDay.current = false;
        button.focus({ preventScroll: true });
      }
      if (document.activeElement !== button) return;
      const area = popup.getBoundingClientRect();
      const day = button.getBoundingClientRect();
      if (day.bottom > area.bottom)
        popup.scrollTop += day.bottom - area.bottom + 6;
      else if (day.top < area.top) popup.scrollTop -= area.top - day.top + 6;
    }
  }, [open, cursorValue, align.maxHeight, align.up]);

  useEffect(() => {
    if (!open) return;
    function outside(event: Event) {
      if (
        !(event.target instanceof Node) ||
        !root.current?.contains(event.target)
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open]);

  function move(next: Date, focus = false) {
    if (+next < start || +next > end) return;
    if (+next === +cursor) {
      if (focus)
        calendar.current
          ?.querySelector<HTMLButtonElement>(
            '[data-date="' + cursorValue + '"]',
          )
          ?.focus();
      return;
    }
    focusDay.current = focus;
    setCursor(next);
  }

  function handleGridKey(
    event: KeyboardEvent<HTMLButtonElement>,
    active: Date,
  ) {
    const year = active.getUTCFullYear();
    const month = active.getUTCMonth();
    const key = event.key;
    const day = active.getUTCDate();
    const weekday = (active.getUTCDay() + 6) % 7;
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    };
    let next: Date;
    if (Object.hasOwn(offsets, key))
      next = atDate(year, month, day + offsets[key]!);
    else if (key === "PageUp" || key === "PageDown") {
      const delta = key === "PageUp" ? -1 : 1;
      next = event.shiftKey
        ? inMonth(active, year + delta, month)
        : inMonth(active, year, month + delta);
    } else return;
    event.preventDefault();
    move(next, true);
  }

  function select(value: string) {
    onChange(value);
    close(true);
  }

  return (
    <div
      className="editor-field release-date"
      ref={root}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.stopPropagation();
          event.preventDefault();
          close(true);
        }
      }}
    >
      <label htmlFor={id + "-value"}>
        <span>
          发行日期{" "}
          <span className="editor-required" aria-hidden="true">
            *
          </span>
        </span>
      </label>
      <div className="release-date-control">
        <input
          id={id + "-value"}
          data-editor-field="releaseDate"
          aria-label="发行日期（必填）"
          required
          placeholder="YYYY-MM-DD"
          autoComplete="off"
          maxLength={14}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={id + (error ? "-error" : "-help")}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (selected !== value) onChange(selected);
          }}
          onKeyDown={(event) => {
            if (event.altKey && event.key === "ArrowDown") {
              event.preventDefault();
              show();
            }
          }}
        />
        <button
          ref={trigger}
          className="release-date-trigger"
          type="button"
          aria-label="选择发行日期"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id + "-calendar" : undefined}
          onClick={show}
        >
          <StudioIcon name="calendar" />
        </button>
        {open && (
          <div
            className="release-calendar"
            id={id + "-calendar"}
            role="dialog"
            aria-label="选择发行日期"
            ref={calendar}
            style={{ maxHeight: align.maxHeight }}
            data-up={align.up || undefined}
            data-align-end={align.end || undefined}
          >
            <div className="release-calendar-header">
              <button
                type="button"
                aria-label="上个月"
                disabled={year === earliestReleaseYear && month === 0}
                onClick={() => move(inMonth(cursor, year, month - 1))}
              >
                <StudioIcon name="chevronLeft" />
              </button>
              <input
                key={year}
                type="number"
                aria-label="年份"
                min={earliestReleaseYear}
                max={latestReleaseYear}
                defaultValue={year}
                onFocus={(event) => event.currentTarget.select()}
                onBlur={(event) => {
                  const target = event.currentTarget;
                  const next = target.valueAsNumber;
                  if (
                    !Number.isInteger(next) ||
                    next < earliestReleaseYear ||
                    next > latestReleaseYear
                  )
                    target.value = String(year);
                  else move(inMonth(cursor, next, month));
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  const next = event.currentTarget.valueAsNumber;
                  if (
                    Number.isInteger(next) &&
                    next >= earliestReleaseYear &&
                    next <= latestReleaseYear
                  ) {
                    if (next === year)
                      calendar.current
                        ?.querySelector<HTMLButtonElement>(
                          '[data-date="' + cursorValue + '"]',
                        )
                        ?.focus();
                    else move(inMonth(cursor, next, month), true);
                  }
                }}
              />
              <select
                aria-label="月份"
                value={month}
                onChange={(event) =>
                  move(inMonth(cursor, year, Number(event.target.value)))
                }
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="下个月"
                disabled={year === latestReleaseYear && month === 11}
                onClick={() => move(inMonth(cursor, year, month + 1))}
              >
                <StudioIcon name="chevronRight" />
              </button>
            </div>
            <div
              className="release-calendar-grid"
              role="grid"
              aria-label={year + "年" + monthNames[month]}
            >
              <div role="row" className="release-calendar-weekdays">
                {weekdays.map((day) => (
                  <span key={day} role="columnheader" aria-label={"星期" + day}>
                    {day}
                  </span>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, week) => (
                <div key={week} role="row">
                  {Array.from({ length: 7 }, (_, position) => {
                    const date = atDate(
                      year,
                      month,
                      week * 7 + position - offset + 1,
                    );
                    const day = releaseDateValue(date);
                    return (
                      <div
                        key={day}
                        role="gridcell"
                        aria-selected={day === selected}
                      >
                        <button
                          type="button"
                          aria-label={day}
                          aria-current={day === today ? "date" : undefined}
                          data-date={day}
                          data-adjacent={
                            date.getUTCMonth() !== month || undefined
                          }
                          tabIndex={day === cursorValue ? 0 : -1}
                          disabled={+date < start || +date > end}
                          onKeyDown={(event) => handleGridKey(event, date)}
                          onClick={() => select(day)}
                        >
                          {date.getUTCDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <footer>
              <button
                type="button"
                onClick={() => select("")}
                disabled={!value}
              >
                清空
              </button>
              <button type="button" onClick={() => move(todayAsDate(), true)}>
                定位今天
              </button>
            </footer>
          </div>
        )}
      </div>
      {error ? (
        <small className="editor-field-error" id={id + "-error"}>
          {error}
        </small>
      ) : (
        <small id={id + "-help"}>
          {legacyYear && !value
            ? "原记录仅有 " + legacyYear + " 年，保存时需填完整年月日。"
            : "可输入完整年月日，或打开日历选择。"}
        </small>
      )}
    </div>
  );
}
