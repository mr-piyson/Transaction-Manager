import en from './messages/en.json';

type Messages = typeof en & {
  purchaseOrders: {
    statuses: Record<string, string>;
  };
  warehouses: {
    movementTypes: Record<string, string>;
  };
};

declare module 'use-intl' {
  interface AppConfig {
    Messages: Messages;
  }
}
