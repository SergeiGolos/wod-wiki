import { WodBlock } from "./timer.types";

export class WodRowClassifier {
  static isNotification(block: WodBlock): boolean {
    return block.type === 'notification';
  }

  static isHeader(block: WodBlock): boolean {
    return block.level === '#' || block.type === 'header';
  }

  static isParagraph(block: WodBlock): boolean {
    return block.type === 'paragraph';
  }

  static getExerciseParts(block: WodBlock): string[] {
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

    return parts;
  }
}
