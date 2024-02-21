// Can be used only inside PresenceContext and handles cursor updates
import * as React from "react";
import { create } from "zustand";
import { useState, useEffect } from "react";
import type { Cursor, User } from "./presence-schema";
import { usePresence } from "./presence-context";
import { getStartingCustomCursorStyle } from "../cursors";

export type PresenceWithCursorsStore = {
  myId: string | null;
  myself: User | null;
  otherUsers: Map<string, User>;
  within: "window" | "document";
};

export const usePresenceWithCursors = create<PresenceWithCursorsStore>(() => ({
  myId: null,
  myself: null,
  otherUsers: new Map(),
  within: "window",
}));

function extractUrlFromCursorStyle(cursorStyle: string) {
  // Regular expression to match the URL inside url(...)
  // const urlPattern = /url\(["']?(.*?)["']?\)/;
  // // Test the cursorStyle against the regular expression
  // const match = cursorStyle.match(urlPattern);

  // // If a match is found, return the URL; otherwise, return null
  // if (match) {
  //   return match[1];
  // } else {
  //   return null;
  // }
  if (!cursorStyle.startsWith('url("')) {
    return;
  }
  cursorStyle = cursorStyle.slice(5);

  if (!cursorStyle.endsWith('"), auto') || cursorStyle.endsWith('")')) {
    return;
  }
  if (cursorStyle.endsWith('"), auto')) {
    cursorStyle = cursorStyle.slice(0, cursorStyle.length - 8);
  } else {
    cursorStyle = cursorStyle.slice(0, cursorStyle.length - 2);
  }

  return cursorStyle;
}

/*
We can track and display cursors relative to one of three reference frames:

- window: the browser window
- document: the entire document
- @TODO a div: a specific div element
*/
export default function useCursorTracking(
  within: "window" | "document" = "window"
) {
  const { myId, myself, otherUsers, updatePresence } = usePresence((state) => {
    return {
      myId: state.myId,
      myself: state.myself,
      otherUsers: state.otherUsers,
      updatePresence: state.updatePresence,
    };
  });

  // Always track window dimensions, and update scroll dimensions if required
  const [windowDimensions, setWindowDimensions] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [scrollDimensions, setScrollDimensions] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const updateScrollDimensions = () => {
    setScrollDimensions({
      x: document.documentElement.scrollWidth,
      y: document.documentElement.scrollHeight,
    });
  };
  useEffect(() => {
    const onResize = () => {
      setWindowDimensions({
        x: window.innerWidth,
        y: window.innerHeight,
      });
      if (within === "document") updateScrollDimensions();
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [within]);

  // Track the absolute cursor position relative to both the window (client) and the document
  const [windowCursor, setWindowCursor] = useState<Cursor | null>(null);
  const [documentCursor, setDocumentCursor] = useState<Cursor | null>(null);
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      let pointer = "mouse";
      const element = document.elementFromPoint(e.clientX, e.clientY);

      if (element) {
        // Get the computed style of the element
        const style = window.getComputedStyle(element);
        const maybeCustomCursor = extractUrlFromCursorStyle(style.cursor);

        if (maybeCustomCursor) {
          if (maybeCustomCursor.startsWith(getStartingCustomCursorStyle())) {
            // dont change if it starts with our custom cursor
          } else {
            pointer = maybeCustomCursor;
          }
        }
      }
      setWindowCursor({
        x: e.clientX,
        y: e.clientY,
        pointer,
      });
      if (within === "document") {
        setDocumentCursor({
          x: e.pageX,
          y: e.pageY,
          pointer,
        });
      }
    };
    window.addEventListener("mousemove", onMouseMove);

    const onTouchMove = (e: TouchEvent) => {
      setWindowCursor({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        pointer: "touch",
      });
      if (within === "document") {
        setDocumentCursor({
          x: e.touches[0].pageX,
          y: e.touches[0].pageY,
          pointer: "touch",
        });
      }
    };
    window.addEventListener("touchmove", onTouchMove);

    const onTouchEnd = () => {
      setWindowCursor(null);
      if (within === "document") {
        setDocumentCursor(null);
      }
    };
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [within]);

  // If there's a scroll, we can update the document cursor by knowing the window cursor
  // and the scroll position (we have to do this because scrolling doesn't send an onMouseMouve event)
  useEffect(() => {
    if (within !== "document") return;
    const onScroll = () => {
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setDocumentCursor(() => {
        if (!windowCursor) return null;
        return {
          ...windowCursor,
          x: windowCursor.x + scrollX,
          y: windowCursor.y + scrollY,
        };
      });
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [within, windowCursor]);

  // Send cursor updates
  useEffect(() => {
    const bounds = within === "window" ? windowDimensions : scrollDimensions;
    const localCursor = within === "window" ? windowCursor : documentCursor;

    if (localCursor === null) {
      updatePresence({ cursor: null });
      return;
    }

    if (!windowDimensions.x || !windowDimensions.y) {
      updatePresence({ cursor: null });
      return;
    }

    const cursor = {
      x: localCursor.x / bounds.x,
      y: localCursor.y / bounds.y,
      pointer: localCursor.pointer,
    } as Cursor;

    updatePresence({ cursor });
  }, [
    windowCursor,
    documentCursor,
    windowDimensions,
    scrollDimensions,
    updatePresence,
    within,
  ]);

  useEffect(() => {
    // 100ms after page load, run updateScrollDimensions
    setTimeout(updateScrollDimensions, 100);
  }, []);

  const transformCursor = (user: User) => {
    const bounds = within === "window" ? windowDimensions : scrollDimensions;
    const cursor = user.presence?.cursor
      ? {
          ...user.presence.cursor,
          x: user.presence.cursor.x * bounds.x,
          y: user.presence.cursor.y * bounds.y,
        }
      : null;
    return { ...user, presence: { ...user.presence, cursor } };
  };

  useEffect(() => {
    const myselfTransformed = myself ? transformCursor(myself) : null;
    const otherUsersTransformed = new Map<string, User>();
    otherUsers.forEach((user, id) => {
      otherUsersTransformed.set(id, transformCursor(user));
    });
    usePresenceWithCursors.setState({
      myId,
      myself: myselfTransformed,
      otherUsers: otherUsersTransformed,
      within,
    });
  });

  return;
}
