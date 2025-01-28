import React, {  } from "react";
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
