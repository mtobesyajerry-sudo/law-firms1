import React, { useState } from 'react';

const FAQS = [
  {
    q: "What's included in the 14-day free trial?",
    a: "Full access to the plan you choose — Solo, Small Firm, or Medium Firm. All features unlocked, no card required. After 14 days, you choose whether to pay and continue. If you don't, your data is preserved for 30 days in read-only mode.",
  },
  {
    q: "Do I need a credit card to start the trial?",
    a: "No. Start your trial with just your email. We only ask for payment if you decide to continue after day 14.",
  },
  {
    q: "Can I change plans during my trial?",
    a: "Yes. You can upgrade anytime — your remaining trial days carry over. You can downgrade once during the trial.",
  },
  {
    q: "How does Tanzania VAT work?",
    a: "All prices shown are VAT-inclusive at 18%. Your invoices show the net amount, VAT amount, and gross total separately for your records and TRA compliance.",
  },
  {
    q: "What payment methods do you accept?",
    a: "M-Pesa, Tigo Pesa, Airtel Money, bank transfers from CRDB / NMB / Stanbic, and Visa or Mastercard. Mobile money is the fastest — payments confirm within seconds.",
  },
  {
    q: "Can I get a refund?",
    a: "Annual subscriptions are eligible for a pro-rata refund within the first 60 days of payment if you're not satisfied. Monthly subscriptions can be cancelled at any time and won't auto-renew.",
  },
  {
    q: "Does Iuris Peritis comply with Tanzania AML Act (Cap. 423)?",
    a: "Yes. The system is built specifically for AMLA Cap. 423 and aligned with FATF Recommendations and FIU guidelines. We update the platform whenever regulations change at no additional cost.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use row-level security at the database layer, encrypted document storage, comprehensive audit logging, and optional MFA enforcement. Data is hosted in geographically redundant data centres.",
  },
  {
    q: "What if I outgrow my plan?",
    a: "Upgrade anytime from your billing settings. Your data stays intact and the new limits apply immediately. We'll pro-rate the difference for monthly plans, or apply credit on annual plans.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. Cancel from your billing settings at any time. You'll keep access until the end of your current billing period. Your data is preserved for 30 days after cancellation in case you change your mind.",
  },
  {
    q: "Do you offer training for our staff?",
    a: "Solo and Small Firm plans include onboarding. Medium Firm includes a 2-day training session. We also offer a paid AMLA Cap. 423 staff training session (1 day, up to 20 attendees) as an add-on for TZS 2,500,000.",
  },
  {
    q: "I need a custom plan or have more than 30 advocates. What do I do?",
    a: 'Choose "Contact sales" on the Large Firm plan. We\'ll set up a call to discuss your needs and create a custom quote.',
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
