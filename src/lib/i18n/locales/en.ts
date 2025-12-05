// ============================================
// FILE: src/lib/i18n/locales/en.ts
// ============================================
export const en = {
  common: {
    welcome: "Welcome to our application",
    description: "This is a multi-language app with RTL/LTR support",
    selectLanguage: "Select Language",
    greeting: "Hello, World!",
    changeLanguage: "Change Language",
    loading: "Loading...",
    error: "An error occurred",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
  },
  auth: {
    login: "Login",
    logout: "Logout",
    register: "Register",
    email: "Email",
    password: "Password",
    forgotPassword: "Forgot Password?",
  },
  navigation: {
    home: "Home",
    about: "About",
    contact: "Contact",
    settings: "Settings",
  },
  languages: {
    english: "English",
    arabic: "Arabic",
  },
  routes: {
    customers: "Customers",
    settings: "Settings",
    "settings.departments": "Departments",
    "settings.profile": "Profile",
    "settings.account": "User Accounts",
    "settings.security": "Security",
    "settings.appearance": "Appearance",
  },
} as const;
