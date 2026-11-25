import "./playback.css";
import { useLayoutEffect, useRef, type ReactNode } from "react";
export function ScreeningRoom({
  title,
  selector,
  onClose,
  children,
  message,
}: {
  title: string;
  selector: ReactNode;
  onClose: () => void;
  children: ReactNode;
  message: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="screening-room"
      aria-label={title + " · 正在播放"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="screening-controls">
        <button type="button" onClick={onClose}>
          ← 退出播放
        </button>
        <strong>{title}</strong>
        {selector}
      </header>
      {children}
      {message && <small role="status">{message}</small>}
    </dialog>
  );
}
