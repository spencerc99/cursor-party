import * as React from "react";
import { render } from "react-dom";
import PresenceProvider from "./presence/presence-context";
import Cursors from "./presence/Cursors";
import randomcolor from "randomcolor";

declare const PARTYKIT_HOST: string;

const pageId = window?.location.href
  ? btoa(window.location.href.split(/[?#]/)[0])
  : "default";

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

interface Cursors {
  color: string;
  setColor: (color: string) => void;
}

function App() {
  const [color, setColor] = useStickyState("color", randomcolor());

  React.useEffect(() => {
    // @ts-ignore
    window.cursors = {
      color,
      // TODO: add validation?
      setColor,
    } as Cursors;
  }, [color, setColor]);

  return (
    <PresenceProvider
      host={PARTYKIT_HOST}
      room={pageId}
      presence={{
        name: "Anonymous User",
        color,
      }}
    >
      <Cursors />
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
