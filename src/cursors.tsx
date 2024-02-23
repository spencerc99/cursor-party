import * as React from "react";
import { render } from "react-dom";
import PresenceProvider from "./presence/presence-context";
import Cursors from "./presence/Cursors";
import randomcolor from "randomcolor";

declare const PARTYKIT_HOST: string;

function useStickyState<T = any>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = React.useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  React.useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// from: https://github.com/yoksel/url-encoder/blob/master/src/js/script.js
const symbols = /[\r\n%#()<>?[\\\]^`{|}]/g;
function encodeSVG(svgData: string) {
  // Use single quotes instead of double to avoid encoding.
  svgData = svgData.replace(/"/g, `'`);
  svgData = svgData.replace(/>\s{1,}</g, `><`);
  svgData = svgData.replace(/\s{2,}/g, ` `);

  // Using encodeURIComponent() as replacement function
  // allows to keep result code readable
  return svgData.replace(symbols, encodeURIComponent);
}

function getSvgForCursor(color: string) {
  return `<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="10 9 34 34"
      width="36"
      height="36"
      fill="none"
      fillRule="evenodd"
    >
      <g fill="rgba(0,0,0,.2)" transform="translate(1,1)">
        <path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
        <path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
      </g>
      <g fill="white">
        <path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
        <path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
      </g>
      <g fill="${color}">
        <path d="m19.751 24.4155-1.844.774-3.1-7.374 1.841-.775z" />
        <path d="m13 10.814v11.188l2.969-2.866.428-.139h4.768z" />
      </g>
    </svg>`;
}

export function getCursorStyleForUser(color: string) {
  const userCursorSvgEncoded = encodeSVG(getSvgForCursor(color));
  return `url("data:image/svg+xml,${userCursorSvgEncoded}"), auto`;
}

export function getStartingCustomCursorStyle() {
  return encodeSVG(`data:image/svg+xml,<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="10 9 34 34"
      width="36"
      height="36"
      fill="none"
      fillRule="evenodd"
    >
      <g fill="rgba(0,0,0,.2)" transform="translate(1,1)">
        <path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
        <path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
      </g>
      <g fill="white">
        <path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
        <path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
      </g>`);
}

declare global {
  interface Window {
    cursors: {
      color: string;
      setColor: (color: string) => void;
      count: number;
    };
    cursorParty: {
      room?: string;
      hideCursors?: boolean;
    };
  }
}
if (!window.cursors) {
  window.cursors = {
    color: "",
    setColor: (color: string) => {},
    count: 0,
  };
}
if (!window.cursorParty) {
  window.cursorParty = {};
}

function App() {
  const [color, setColor] = useStickyState("color", randomcolor());
  const room =
    window?.cursorParty?.room ??
    (window?.location.href
      ? btoa(window.location.href.split(/[?#]/)[0])
      : "default");
  const hideCursors = window?.cursorParty?.hideCursors || false;
  React.useEffect(() => {
    document.documentElement.style.cursor = getCursorStyleForUser(color);
    window.cursors.color = color;
    window.cursors.setColor = setColor;
  }, [color, setColor]);

  return (
    <PresenceProvider
      host={PARTYKIT_HOST}
      room={room}
      presence={{
        name: "Anonymous User",
        color,
      }}
    >
      <Cursors hideCursors />
    </PresenceProvider>
  );
}

const cursorsRoot = document.createElement("div");
document.body.appendChild(cursorsRoot);
// cursors display is absolute and needs a top-level relative container
document.documentElement.style.position = "relative";
document.documentElement.style.minHeight = "100dvh";
// add a classname
cursorsRoot.classList.add("cursors-root");

render(<App />, cursorsRoot);
