import React from "react";
import { EditorWithState } from "./components/EditorWithState";
import { decodeShareString } from "@/core/utils/shareUtils";

function getCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("code");
  if (!encoded) return "";
  try {
    return decodeShareString(encoded);
  } catch {
    return "";
  }
}

const LiveStory: React.FC = () => {
  const [code, setCode] = React.useState<string>("");
  React.useEffect(() => {
    setCode(getCodeFromUrl());
  }, []);

  return <EditorWithState code={code} debug={false} id={""} />;
};

export default {
  title: "Live",
  component: LiveStory,
  parameters: {
    layout: "fullscreen",
    controls: { hideNoControlsWarning: true },
    showPanel: false
  }
};

export const Link = () => <LiveStory />;
