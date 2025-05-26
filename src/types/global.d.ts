/// <reference types="react" />
/// <reference types="react-dom" />

declare module 'react' {
  export interface JSX {
    IntrinsicElements: {
      [elemName: string]: any;
    };
  }
  export type FC<P = {}> = React.FunctionComponent<P>;
  export type ReactNode = React.ReactNode;
  export const useState: typeof React.useState;
  export const useEffect: typeof React.useEffect;
  export type ChangeEvent<T = Element> = React.ChangeEvent<T>;
}

declare module 'next/navigation' {
  export function useRouter(): {
    push: (path: string) => void;
    replace: (path: string) => void;
    back: () => void;
    forward: () => void;
  };
}

declare module 'react-icons/*' {
  import { FC, SVGProps } from 'react';
  const content: FC<SVGProps<SVGSVGElement>>;
  export default content;
}

declare module 'react-icons/fi' {
  import { IconType } from 'react-icons';
  export const FiFile: IconType;
  export const FiFolder: IconType;
  export const FiChevronRight: IconType;
  export const FiChevronDown: IconType;
  export const FiPlus: IconType;
  export const FiMinus: IconType;
  export const FiTrash: IconType;
  export const FiEdit: IconType;
  export const FiCreditCard: IconType;
  export const FiTrendingUp: IconType;
  export const FiTrendingDown: IconType;
  export const FiInfo: IconType;
  export const FiCalendar: IconType;
  export const FiZap: IconType;
  export const FiShield: IconType;
  export const FiStar: IconType;
  export const FiBarChart2: IconType;
  export const FiArrowUp: IconType;
  export const FiArrowDown: IconType;
}

declare module 'react-hot-toast' {
  import { Toast, ToastOptions } from 'react-hot-toast';
  const toast: {
    (message: string, options?: ToastOptions): Toast;
    error: (message: string, options?: ToastOptions) => Toast;
    success: (message: string, options?: ToastOptions) => Toast;
  };
  export default toast;
}

declare module 'react-markdown' {
  import { ReactElement } from 'react';
  interface ReactMarkdownProps {
    children: string;
    className?: string;
  }
  export default function ReactMarkdown(props: ReactMarkdownProps): ReactElement;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
} 