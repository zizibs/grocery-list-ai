import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
    }
  }
}

declare module '@testing-library/jest-dom' {
  export * from '@testing-library/jest-dom';
}
