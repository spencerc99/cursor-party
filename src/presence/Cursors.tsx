import * as React from "react";
import useCursorTracking from "./use-cursors";
import OtherCursors from "./other-cursors";
import Chat from "./Chat";

const ENABLE_CHAT = false;

export default function Cursors({
  hideCursors = false,
}: {
  hideCursors: boolean;
}) {
  useCursorTracking("document");

  return (
    <>
      {hideCursors ? null : <OtherCursors showChat={ENABLE_CHAT} />}
      {ENABLE_CHAT && <Chat />}
    </>
  );
}
