const DEFAULT_TIERS = [
  { threshold: 12999, discount: 300, message: "Spend R12,999, Get R300 OFF" },
  { threshold: 22999, discount: 800, message: "Spend R22,999, Get R800 OFF" },
  { threshold: 42999, discount: 2000, message: "Spend R42,999, Get R2,000 OFF" },
];

export function cartLinesDiscountsGenerateRun(input) {
  const EMPTY = { operations: [] };

  const isMember = input.cart.buyerIdentity?.customer?.hasAnyTag ?? false;
  if (!isMember) return EMPTY;

  const config = input.discount?.metafield?.jsonValue;
  const tiers = Array.isArray(config?.tiers) && config.tiers.length > 0
    ? [...config.tiers].sort((a, b) => a.threshold - b.threshold)
    : DEFAULT_TIERS;

  const subtotal = parseFloat(input.cart.cost.totalAmount.amount);
  if (subtotal < tiers[0].threshold) return EMPTY;

  const qualified = [...tiers]
    .reverse()
    .find(t => subtotal >= t.threshold);

  if (!qualified) return EMPTY;

  const lines = input.cart.lines;
  if (!lines.length) return EMPTY;

  const totalCost = lines.reduce(
    (sum, line) => sum + parseFloat(line.cost.amountPerQuantity.amount) * line.quantity,
    0,
  );

  if (totalCost <= 0) return EMPTY;

  let remaining = qualified.discount;

  const candidates = lines.map((line, index) => {
    const lineTotal = parseFloat(line.cost.amountPerQuantity.amount) * line.quantity;
    let share;

    if (index === lines.length - 1) {
      share = remaining;
    } else {
      share = Math.round((lineTotal / totalCost) * qualified.discount * 100) / 100;
      remaining -= share;
    }

    return {
      message: qualified.message,
      targets: [{ cartLine: { id: line.id } }],
      value: {
        fixedAmount: {
          amount: share,
          appliesToEachItem: false,
        },
      },
    };
  });

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,
          selectionStrategy: "FIRST",
        },
      },
    ],
  };
}
