import { WodWikiTokenHint } from "./WodWikiTokenHint";


export interface WodWikiToken {
  token: string;
  foreground: string;
  fontStyle?: string;
  hints?: WodWikiTokenHint[];
}
