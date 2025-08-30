const currenciesArray = [
  [
    {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      decimals: 2,
      flag: "us",
    },
    {
      code: "EUR",
      name: "Euro",
      symbol: "€",
      decimals: 2,
      flag: "eu",
    },
    {
      code: "GBP",
      name: "British Pound",
      symbol: "£",
      decimals: 2,
      flag: "gb",
    },
    {
      code: "JPY",
      name: "Japanese Yen",
      symbol: "¥",
      decimals: 0,
      flag: "jp",
    },
    {
      code: "CNY",
      name: "Chinese Yuan",
      symbol: "¥",
      decimals: 2,
      flag: "cn",
    },
    {
      code: "BHD",
      name: "Bahraini Dinar",
      symbol: "BD",
      decimals: 3,
      flag: "bh",
    },
    {
      code: "INR",
      name: "Indian Rupee",
      symbol: "₹",
      decimals: 2,
      flag: "in",
    },
    {
      code: "BTC",
      name: "Bitcoin",
      symbol: "₿",
      decimals: 8,
      flag: "btc",
    },
    {
      code: "AED",
      name: "UAE Dirham",
      symbol: "د.إ",
      decimals: 2,
      flag: "ae",
    },
    {
      code: "SAR",
      name: "Saudi Riyal",
      symbol: "﷼",
      decimals: 2,
      flag: "sa",
    },
  ],
];

export const currencies = new Map(
  currenciesArray[0].map((currency) => [currency.code, currency])
);

export const getCurrency = (code: string) => {
  const currency = currencies.get(code);
  if (!currency) {
    return {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      decimals: 2,
      flag: "us",
    };
  }
  return currency;
};
