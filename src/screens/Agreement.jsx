import { useNavigate } from 'react-router-dom'

const GOLD = '#F5C518'

const CLAUSES = [
  { num: 1, title: 'Acceptance of Terms', body: 'By registering for and using the Zeloh platform, you agree to be bound by these Terms and Conditions. If you do not agree to all terms set forth herein, you must not access or use the platform. Zeloh reserves the right to update these terms at any time, with notice provided through the platform.' },
  { num: 2, title: 'Eligibility', body: 'You must be at least 18 years of age to register and use Zeloh. By creating an account, you represent and warrant that you meet this age requirement. A valid invitation code issued by an existing Zeloh member is required to complete registration. Each individual may hold only one account.' },
  { num: 3, title: 'Account Responsibilities', body: 'You are responsible for maintaining the confidentiality of your account credentials, including your password and funding password. You agree to notify Zeloh immediately of any unauthorized access to your account. Zeloh is not liable for any losses resulting from unauthorized use of your account due to your failure to protect your credentials.' },
  { num: 4, title: 'Investment Risks', body: 'Investments made on the Zeloh platform are subject to market and operational risks. While the platform displays projected profit rates, these are estimates and past performance does not guarantee future results. You acknowledge that investment returns may vary and you should only invest funds you can afford to lose.' },
  { num: 5, title: 'Deposits and Withdrawals', body: 'Recharge requests are reviewed and credited within 30 minutes to 24 hours. Withdrawal requests are processed within 2 to 72 hours after admin approval ( 7 Days for new account & First Withdrawal). A 10% service fee applies to all withdrawals with a minimum fee of $1. The minimum withdrawal amount is $10. Zeloh is not responsible for delays caused by blockchain network congestion.' },
  { num: 6, title: 'Referral Program Rules', body: 'Referral bonuses are earned when users you invite make qualifying ticket purchases. Bonuses are credited automatically upon completion of a referred user\'s ticket cycle. Any attempt to abuse the referral system, including the creation of fake accounts or self-referrals, will result in immediate account suspension and forfeiture of all bonuses.' },
  { num: 7, title: 'Prohibited Activities', body: 'Users are strictly prohibited from: creating multiple accounts, submitting fraudulent deposit proofs, manipulating platform data, using automated tools to exploit the platform, or engaging in any activity that disrupts platform operations or other users. Violations will result in permanent account suspension without refund.' },
  { num: 8, title: 'Platform Rights', body: 'Zeloh reserves the right to suspend, restrict, or terminate any user account at its sole discretion if terms are violated or suspicious activity is detected. Zeloh may modify platform features, fee structures, and terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms.' },
  { num: 9, title: 'Privacy Policy', body: 'Zeloh collects personal information including email addresses and phone numbers for account verification and communication purposes. This data is stored securely and is not sold to third parties. Usage data may be analyzed in aggregate to improve platform services. By using Zeloh, you consent to this data collection and usage.' },
  { num: 10, title: 'Limitation of Liability', body: 'Zeloh shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to loss of profits, data, or business opportunities. The platform\'s total liability to any user shall not exceed the amount deposited by that user in the 30 days preceding the claim.' },
  { num: 11, title: 'Contact Us', body: 'For support, disputes, or inquiries, please contact Zeloh through the customer service channels available on the Service page. Our support team is available 24 hours a day. For wallet address changes or funding password recovery, please contact support with valid identity verification.' },
]

export default function Agreement() {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <button onClick={() => navigate('/my')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>User Agreement</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 18 }}>Last updated: April 2026</p>
        {CLAUSES.map((s, i) => (
          <div key={s.num}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 900, fontSize: 12, color: '#1a1a1a' }}>{s.num}</span>
              </div>
              <h2 style={{ fontWeight: 800, fontSize: 14, color: '#111', margin: 0 }}>{s.title}</h2>
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.8, marginBottom: 0, paddingLeft: 38 }}>
              {s.body}
            </p>
            {i < CLAUSES.length - 1 && (
              <div style={{ height: 1, background: '#F9FAFB', margin: '16px 0' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
