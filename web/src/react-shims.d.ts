declare module "react" {
  export type ReactNode = any;
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useMemo<T>(factory: () => T, deps?: unknown[]): T;
  export function useState<T>(initialValue: T): [T, (nextValue: T | ((currentValue: T) => T)) => void];
  export function StrictMode(props: { children?: ReactNode }): ReactNode;
}

declare module "react-dom/client" {
  export function createRoot(container: HTMLElement): {
    render(node: unknown): void;
  };
}

declare module "react/jsx-runtime" {
  export const Fragment: unknown;
  export function jsx(type: unknown, props: Record<string, unknown>, key?: string): unknown;
  export function jsxs(type: unknown, props: Record<string, unknown>, key?: string): unknown;
  export namespace JSX {
    export interface Element {}
    export interface IntrinsicElements {
      [elementName: string]: any;
    }
  }
}

declare module "*.css";

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
