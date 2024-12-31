import React, { useState, useEffect, createContext } from "react";
import { WodWiki } from "./editor/WodWiki";
import { WodRunner } from "./runtime/WodRunner";
import { DisplayBlock } from "../lib/timer.types";
import { WodRuntimeScript } from "../lib/md-timer";
import { WodCompiler } from "../lib/WodCompiler";
import * as monaco from 'monaco-editor';
import { WodContainer } from "./WodContainer";

interface WodContainerProps {
  children?: React.ReactNode;
}

export const DemoWodContainer: React.FC<WodContainerProps> = ({
  children,
}) => {    
  const textContent = React.Children.toArray(children);
  const code = textContent    
    .map((child : any) =>{
        return child?.props?.children || "";
    } )
    .join(""); // Combines all text children into a single string


  return (    
    <WodContainer code={code}></WodContainer>
  );
};
