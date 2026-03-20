/// <reference types="vite/client" />

interface Window {
  PaystackPop: {
    setup: (options: {
      key: string;
      email: string;
      amount: number;
      currency: string;
      ref: string;
      label?: string;
      metadata?: Record<string, unknown>;
      callback: (response: { reference: string }) => void;
      onClose: () => void;
    }) => { openIframe: () => void };
  };
}
