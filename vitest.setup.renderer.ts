/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import { afterEach, vi } from 'vitest';
import '@testing-library/react';
import './src/apps/main/interface';

// Helper to create deep mock proxies for nested objects
const createDeepMock = (): any => {
  return new Proxy({}, {
    get: (target: any, prop: string) => {
      if (!target[prop]) {
        target[prop] = vi.fn(() => createDeepMock());
      }
      return target[prop];
    },
  });
};

// Setup global window.electron mock using Proxy for automatic mocking
// Any property access will automatically return a mock function or nested mock object
global.window = global.window || {};
global.window.electron = createDeepMock();

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock @headlessui/react components
vi.mock('@headlessui/react', () => {
  const React = require('react');

  const Dialog = function (props: any) {
    return props.children;
  };

  Dialog.Overlay = function (props: any) {
    return React.createElement('div', {
      className: props.className,
      'data-testid': 'dialog-overlay',
    });
  };

  Dialog.Title = function (props: any) {
    return React.createElement('div', props, props.children);
  };

  const Transition = function (props: any) {
    return props.show !== false ? props.children : null;
  };

  Transition.Child = function (props: any) {
    return props.children;
  };

  const Menu = function (props: any) {
    return React.createElement(
      props.as || 'div',
      { className: props.className },
      props.children
    );
  };

  Menu.Button = function (props: any) {
    return React.createElement('div', props, props.children);
  };

  Menu.Items = function (props: any) {
    return React.createElement('div', props, props.children);
  };

  Menu.Item = function (props: any) {
    return props.children({ active: false });
  };

  const Fragment = function (props: any) {
    return props.children;
  };

  return {
    Dialog,
    Transition,
    Menu,
    Fragment,
  };
});

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
