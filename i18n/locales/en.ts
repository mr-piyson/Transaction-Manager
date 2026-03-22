// ============================================
// FILE: src/lib/i18n/locales/en.ts
// ============================================
export const en = {
  common: {
    selectLanguage: 'Select Language',
    greeting: 'Hello, World!',
    changeLanguage: 'Change Language',
    loading: 'Loading...',
    error: 'An error occurred',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    create: 'Create',
    customers: 'Customers',
    assets: 'Assets',
    invoices: 'Invoices',
    settings: 'Settings',
    departments: 'Departments',
    profile: 'Profile',
    security: 'Security',
    appearance: 'Appearance',
    inventory: 'Inventory',
    inventoryItems: 'Inventory Items',
    contracts: 'Contracts',
    navigation: 'Navigation',
  },
  auth: {
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
  },
  navigation: {
    home: 'Home',
    about: 'About',
    contact: 'Contact',
    settings: 'Settings',
  },
  languages: {
    english: 'English',
    arabic: 'Arabic',
  },
  customers: {
    new: 'Create new Customer',
    empty_title: 'No Customers Found',
  },
  inventory: {
    new: 'Create new inventory',
    empty_title: 'No inventory item Found',
  },
  invoices: {
    new: 'Create new invoice',
    empty_title: 'No invoices Found',
  },
} as const;
