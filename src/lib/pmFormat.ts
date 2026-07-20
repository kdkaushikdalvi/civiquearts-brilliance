export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-IN").format(n);
