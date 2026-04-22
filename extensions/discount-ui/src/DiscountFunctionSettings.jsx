/** @jsxImportSource preact */
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useMemo } from "preact/hooks";

const DEFAULT_CONFIG = {
  customerTag: "member",
  tiers: [
    { threshold: 12999, discount: 300, message: "Spend R12,999, Get R300 OFF" },
    { threshold: 22999, discount: 800, message: "Spend R22,999, Get R800 OFF" },
    { threshold: 42999, discount: 2000, message: "Spend R42,999, Get R2,000 OFF" },
  ],
};

export default async () => {
  render(<App />, document.body);
};

function parseConfig(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      customerTag: parsed.tags?.[0] || DEFAULT_CONFIG.customerTag,
      tiers:
        Array.isArray(parsed.tiers) && parsed.tiers.length > 0
          ? parsed.tiers
          : DEFAULT_CONFIG.tiers,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function App() {
  const { applyMetafieldChange, data } = shopify;

  const initialConfig = useMemo(
    () =>
      parseConfig(
        data?.metafields?.find((mf) => mf.key === "function-configuration")
          ?.value,
      ),
    [data?.metafields],
  );

  const [customerTag, setCustomerTag] = useState(initialConfig.customerTag);
  const [tiers, setTiers] = useState(initialConfig.tiers);

  const handleSubmit = async () => {
    const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);
    await applyMetafieldChange({
      type: "updateMetafield",
      namespace: "$app",
      key: "function-configuration",
      value: JSON.stringify({ tags: [customerTag], tiers: sortedTiers }),
      valueType: "json",
    });
    setTiers(sortedTiers);
  };

  const handleReset = () => {
    setCustomerTag(initialConfig.customerTag);
    setTiers(initialConfig.tiers);
  };

  const updateTier = (index, field, value) => {
    setTiers((prev) =>
      prev.map((tier, i) => {
        if (i !== index) return tier;
        if (field === "threshold" || field === "discount") {
          return { ...tier, [field]: Number(value) || 0 };
        }
        return { ...tier, [field]: value };
      }),
    );
  };

  const addTier = () => {
    setTiers((prev) => [...prev, { threshold: 0, discount: 0, message: "" }]);
  };

  const removeTier = (index) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <s-function-settings
      onSubmit={(e) => e.waitUntil(handleSubmit())}
      onReset={handleReset}
    >
      <s-stack gap="large">
        <s-section heading="Customer Tag">
          <s-stack gap="base">
            <s-text-field
              label="Tag required for discount"
              value={customerTag}
              onInput={(e) => setCustomerTag(e.currentTarget.value)}
            />
            <s-text color="subdued">
              Only customers with this tag receive the tiered discount.
            </s-text>
          </s-stack>
        </s-section>

        <s-section heading="Discount Tiers">
          <s-stack gap="base">
            <s-text color="subdued">
              Configure spend thresholds and fixed discount amounts. Tiers are
              automatically sorted by threshold on save.
            </s-text>
            {tiers.map((tier, index) => (
              <s-section key={index} heading={`Tier ${index + 1}`}>
                <s-stack gap="base">
                  <s-number-field
                    label="Threshold (spend amount)"
                    value={String(tier.threshold)}
                    min={0}
                    step={1}
                    onInput={(e) =>
                      updateTier(index, "threshold", e.currentTarget.value)
                    }
                  />
                  <s-number-field
                    label="Discount (fixed amount off)"
                    value={String(tier.discount)}
                    min={0}
                    step={1}
                    onInput={(e) =>
                      updateTier(index, "discount", e.currentTarget.value)
                    }
                  />
                  <s-text-field
                    label="Message"
                    value={tier.message}
                    onInput={(e) =>
                      updateTier(index, "message", e.currentTarget.value)
                    }
                  />
                  {tiers.length > 1 && (
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      onClick={() => removeTier(index)}
                    >
                      Remove tier
                    </s-button>
                  )}
                </s-stack>
              </s-section>
            ))}
            <s-button variant="secondary" onClick={addTier}>
              Add tier
            </s-button>
          </s-stack>
        </s-section>
      </s-stack>
    </s-function-settings>
  );
}
