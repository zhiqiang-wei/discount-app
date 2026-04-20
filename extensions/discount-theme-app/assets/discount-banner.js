/**
 * Discount banner - displays discount information on the storefront
 */
class DiscountBanner extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const discountCode = this.getAttribute('data-discount-code') || '';
    const discountAmount = this.getAttribute('data-discount-amount') || '';
    const discountType = this.getAttribute('data-discount-type') || 'percentage';

    if (!discountCode) return;

    this.innerHTML = `
      <div class="discount-banner">
        <div class="discount-banner__content">
          <span class="discount-banner__code">${discountCode}</span>
          <span class="discount-banner__amount">
            ${discountType === 'percentage' ? discountAmount + '%' : discountAmount}
          </span>
          <span class="discount-banner__label">off</span>
        </div>
      </div>
    `;
  }
}

customElements.define('discount-banner', DiscountBanner);