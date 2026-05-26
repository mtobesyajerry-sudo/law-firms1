import React, { useState } from 'react';

const FAQS = [
  {
    q: "What's included in the 14-day free trial?",
    a: "Full access to the plan you choose — Small Firm or Medium Firm. All features unlocked, no card required. After 14 days you choose whether to subscribe. If you don't, your data is preserved for 30 days in read-only mode. Large Firm plans start with a guided demo instead of a self-serve trial.",
  },
  {
    q: "How does Tanzania VAT work?",
    a: "All prices shown are VAT-inclusive at 18%. Your invoices show the net amount, VAT amount, and gross total separately for your records and TRA compliance.",
  },
  {
    q: "What is Premium Sanctions Screening?",
    a: "Premium screening cross-checks your clients against the global OpenSanctions dataset — covering OFAC, UN, EU, UK, and hundreds of national watchlists, plus PEP databases and adverse media. It is available on Medium Firm and Large Firm plans only, enforced server-side.",
  },
  {
    q: "Can I cancel or change plans?",
    a: "Yes. Cancel or upgrade at any time from your billing settings. Monthly subscriptions won't auto-renew after cancellation. Annual subscriptions are eligible for a pro-rata refund within the first 60 days. Your data is retained for 30 days after cancellation before permanent deletion.",
  },
  {
    q: "What payment methods do you accept?",
    a: "M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, and bank transfer to CRDB Bank. Mobile money payments confirm within seconds.",
  },
];

export default function FAQAccordion({ onTrackEvent }) {
  const [open, setOpen] = useState(null);

  const toggle = (i) => {
    setOpen(prev => prev === i ? null : i);
    if (open !== i && onTrackEvent) {
      onTrackEvent('faq_item_opened', { question: FAQS[i].q });
    }
  };

  return (
    <div>
      {FAQS.map((faq, i) => (
        <div
          key={i}
          style={{
            borderBottom: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => toggle(i)}
            style={{
              width: '100%', textAlign: 'left',
              padding: '20px 0', background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', gap: '16px',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#0a1929', lineHeight: 1.4 }}>
              {faq.q}
            </span>
            <span style={{
              fontSize: '20px', color: '#d4af37', fontWeight: '700',
              flexShrink: 0, transition: 'transform 0.2s',
              transform: open === i ? 'rotate(45deg)' : 'none',
              lineHeight: 1,
            }}>
              +
            </span>
          </button>
          {open === i && (
            <div style={{
              paddingBottom: '20px',
              fontSize: '15px', color: '#4a5568', lineHeight: 1.7,
            }}>
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
