export function run(input) {
    const subtotal = parseFloat(input.cart.cost.subtotalAmount.amount);
  
    // ✅ 写死规则（不走后台）
    const tiers = [
      { threshold: 12999, discount: 300, message: "Spend R12,999 Get R300 OFF" },
      { threshold: 22999, discount: 800, message: "Spend R22,999 Get R800 OFF" },
      { threshold: 42999, discount: 2000, message: "Spend R42,999 Get R2,000 OFF" },
    ];
  
    // ✅ 用户标签判断
    const isMember =
      input.cart.buyerIdentity?.customer?.hasAnyTag ?? false;
  
    if (!isMember) return { discounts: [] };
  
    // ⚠️ 单位转换（重点）
    const subtotalCents = subtotal * 100;
  
    // ✅ 找最大 tier
    const qualified = tiers
      .filter(t => subtotalCents >= t.threshold)
      .sort((a, b) => b.threshold - a.threshold)[0];
  
    if (!qualified) return { discounts: [] };
  
    const discountTotal = qualified.discount / 100;
  
    // ✅ 分摊逻辑（替代 Script split）
    const lines = input.cart.lines;
  
    const totalCost = lines.reduce((sum, line) => {
      return sum + parseFloat(line.cost.amountPerQuantity.amount) * line.quantity;
    }, 0);
  
    let remaining = discountTotal;
  
    const targets = lines.map((line, index) => {
      const lineTotal =
        parseFloat(line.cost.amountPerQuantity.amount) * line.quantity;
  
      let share;
  
      if (index === lines.length - 1) {
        share = remaining;
      } else {
        share = (lineTotal / totalCost) * discountTotal;
        remaining -= share;
      }
  
      return {
        cartLine: { id: line.id },
        value: {
          fixedAmount: {
            amount: share.toFixed(2),
          },
        },
      };
    });
  
    return {
      discounts: [
        {
          message: qualified.message,
          targets,
        },
      ],
    };
  }