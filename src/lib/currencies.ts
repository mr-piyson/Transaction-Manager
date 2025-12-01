const currenciesArray = [
  [
    {
      code: "BHD",
      name: "Bahraini Dinar",
      symbol: "BD",
      decimals: 3,
      flag: "bh",
      icon: "icon-[emojione-v1--flag-for-bahrain]",
    },
    {
      code: "SAR",
      name: "Saudi Riyal",
      symbol: "﷼",
      decimals: 2,
      flag: "sa",
      icon: "icon-[emojione-v1--flag-for-saudi-arabia]",
    },
    {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      decimals: 2,
      flag: "us",
      icon: "icon-[emojione-v1--flag-for-united-states]",
    },
    {
      code: "EUR",
      name: "Euro",
      symbol: "€",
      decimals: 2,
      flag: "eu",
      icon: "icon-[twemoji--flag-european-union]",
    },
    {
      code: "GBP",
      name: "British Pound",
      symbol: "£",
      decimals: 2,
      flag: "gb",
      icon: "icon-[emojione-v1--flag-for-united-kingdom]",
    },
    {
      code: "JPY",
      name: "Japanese Yen",
      symbol: "¥",
      decimals: 0,
      flag: "jp",
      icon: "icon-[emojione-v1--flag-for-japan]",
    },
    {
      code: "CNY",
      name: "Chinese Yuan",
      symbol: "¥",
      decimals: 2,
      flag: "cn",
      icon: "icon-[emojione-v1--flag-for-china]",
    },

    {
      code: "INR",
      name: "Indian Rupee",
      symbol: "₹",
      decimals: 2,
      flag: "in",
      icon: "icon-[emojione-v1--flag-for-india]",
    },
    {
      code: "AED",
      name: "UAE Dirham",
      symbol: "د.إ",
      decimals: 2,
      flag: "ae",
      icon: "icon-[emojione-v1--flag-for-united-arab-emirates]",
    },
  ],
];

export const currencies = new Map(currenciesArray[0].map(currency => [currency.code, currency]));

export const getCurrency = (code: string): (typeof currenciesArray)[0][0] => {
  const currency = currencies.get(code);
  if (!currency) {
    return {
      code: "BHD",
      name: "Bahraini Dinar",
      symbol: "BD",
      decimals: 3,
      flag: "bh",
      icon: "icon-[emojione-v1--flag-for-bahrain]",
    };
  }
  return currency;
};
