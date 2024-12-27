interface WodBlock {
  level?: string;
  text?: string;
  duration?: number;
  effort?: string;
  rounds?: {
    count: number;
    labels: string[];
  };
  resistance?: {
    units: string;
    value: string;
  };
  reps?: number;
  meta: {
    line: number;
    startOffset: number;
    endOffset: number;
    columnStart: number;
    columnEnd: number;
    length: number;
  };
  blocks: WodBlock[];
}

export const WodSteps = ({ blocks }: { blocks: WodBlock[] }): HTMLElement => {
  const renderBlock = (block: WodBlock, depth: number = 0, nextBlock?: WodBlock): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'relative';
    container.style.marginLeft = `${depth * 20}px`;
    
    // Calculate the depth of the next block if it exists
    const getNextBlockDepth = (block: WodBlock): number => {
      if (block.blocks && block.blocks.length > 0) {
        return depth + 1; // Next visible block would be a child
      }
      return nextBlock ? depth : depth - 1; // If no children, use next sibling's depth or assume we're returning to parent
    };

    const nextDepth = getNextBlockDepth(block);
    
    // Add padding if we're transitioning to a lower depth
    if (nextDepth < depth) {
      container.style.marginBottom = '1rem';
    }
    
    const renderContent = (): HTMLElement => {
      if (block.level === '#') {
        const h1 = document.createElement('h1');
        h1.className = 'text-2xl font-bold mb-4';
        h1.textContent = block.text || '';
        return h1;
      }

      const parts: string[] = [];
      
      if (block.duration) {
        parts.push(`${Math.abs(block.duration)}s`);
      }
      
      if (block.rounds) {
        parts.push(`${block.rounds.count}x`);
      }
      
      if (block.reps) {
        parts.push(`${block.reps} reps`);
      }
      
      if (block.resistance) {
        parts.push(`${block.resistance.value}${block.resistance.units}`);
      }
      
      if (block.effort) {
        parts.push(block.effort);
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'flex items-center gap-2 py-1';
      
      if (block.text) {
        const textSpan = document.createElement('span');
        textSpan.className = 'text-gray-900';
        textSpan.textContent = block.text;
        wrapper.appendChild(textSpan);
      }

      if (parts.length > 0) {
        const innerDiv = document.createElement('div');
        innerDiv.className = 'flex gap-2 items-center';
        
        parts.forEach((part, index) => {
          const span = document.createElement('span');
          span.className = 'text-gray-700';
          span.textContent = part;
          innerDiv.appendChild(span);
          
          if (index < parts.length - 1) {
            const separator = document.createTextNode(' • ');
            innerDiv.appendChild(separator);
          }
        });
        
        wrapper.appendChild(innerDiv);
      }

      return wrapper;
    };

    container.appendChild(renderContent());

    if (block.blocks && block.blocks.length > 0) {
      const childContainer = document.createElement('div');
      childContainer.className = 'mt-1';
      block.blocks.forEach((child, index) => {
        const nextChild = index < block.blocks.length - 1 ? block.blocks[index + 1] : undefined;
        childContainer.appendChild(renderBlock(child, depth + 1, nextChild));
      });
      container.appendChild(childContainer);
    }

    return container;
  };

  const mainContainer = document.createElement('div');
  mainContainer.className = 'p-4';
  blocks.forEach((block, index) => {
    const nextBlock = index < blocks.length - 1 ? blocks[index + 1] : undefined;
    mainContainer.appendChild(renderBlock(block, 0, nextBlock));
  });
  
  return mainContainer;
};
