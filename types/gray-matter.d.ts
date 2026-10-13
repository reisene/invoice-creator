declare module 'gray-matter' {
  interface GrayMatterFile<T = Record<string, unknown>> {
    data: T;
    content: string;
    excerpt?: string;
    orig: Buffer | string;
    language: string;
    matter: string;
    stringify(lang: string): string;
    isEmpty: boolean;
  }

  function matter<T = Record<string, unknown>>(
    str: string | Buffer,
    options?: Record<string, unknown>,
  ): GrayMatterFile<T>;

  export default matter;
}
