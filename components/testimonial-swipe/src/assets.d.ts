declare module '*.svg' { const value: string | { src: string }; export default value; }
declare module '*.css';

declare module '*.webp' { const url: string | { src: string }; export default url; }
