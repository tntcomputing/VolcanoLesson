export {};

declare global {
  namespace JSX {
    export interface Element {}
    export interface IntrinsicElements {
      [elementName: string]: any;
    }
  }
}