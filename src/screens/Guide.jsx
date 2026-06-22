import { useNavigate } from 'react-router-dom'

const GOLD = '#F5C518'

const SECTIONS = [
  {
    num: 1,
    title: 'What is Zeloh?',
    body: 'Zeloh is a movie investment platform that allows everyday investors to participate in the film industry by purchasing virtual movie tickets. When you invest, your funds are locked for a set duration and returned with profit upon completion. All investments are processed securely and transparently through our platform.',
  },
  {
    num: 2,
    title: 'How to Start',
    body: 'Step 1: Create your account using your email or phone number with a valid invitation code.\n\nStep 2: Recharge your balance using cryptocurrency (TRC20 or ERC20 network).\n\nStep 3: Browse available movies and purchase tickets to start earning.\n\nStep 4: Wait for your investment period to complete and receive your principal plus profit automatically.\n\nStep 5: Withdraw your earnings to your registered crypto wallet.',
  },
  {
    num: 3,
    title: 'Profit System',
    body: 'Every movie ticket earns 3% profit per investment cycle and increases with the VIP level. Cycles range from a few hours to multiple days depending on the movie selected. Your principal and profit are automatically returned to your available balance when the cycle completes. No manual action is required to receive your earnings.',
  },
  {
    num: 4,
    title: 'Membership Levels',
    body: 'Higher membership levels unlock more daily ticket purchases and greater earning potential. Levels are achieved by reaching cumulative deposit milestones and inviting team members:\n\nVIP Level 0 (Starter): 2 tickets/day\nVIP Level 1: Deposit $100 - 100 tickets/day\nVIP Level 2: Deposit $500 + 1 referral of VIP Lvl 1 - 200 tickets/day\nVIP Level 3: Deposit $2,000 + 3 referrals - 500 tickets/day\nVIP Level 4: Deposit $5,000 + 5 referrals - 2,000 tickets/day\nVIP Level 5: Deposit $10,000 + 10 referrals - 5,000 tickets/day',
  },
  {
    num: 5,
    title: 'Referral System',
    body: 'Invite friends using your unique invitation code. When your referrals purchase movie tickets, you earn upto 10% of their ticket value as passive team earnings. Referral bonuses are credited instantly when your referral\'s ticket cycle completes. The more active your team, the more passive income you earn every day.',
  },
  {
    num: 6,
    title: 'Withdrawals',
    body: 'Withdrawals are processed after 7 days of account activation after admin review and approval. A 10% service fee is deducted from the withdrawal amount, with a minimum fee of $1. The minimum withdrawal amount is $10. You must set your crypto wallet address and funding password before submitting a withdrawal request.',
  },
  {
    num: 7,
    title: 'Security Tips',
    body: 'Never share your account password or funding password with anyone, including support agents. Always double-check your wallet address before saving it, as it cannot be changed without contacting support. Zeloh support will never ask for your password or funding password. Enable strong passwords of at least 8 characters mixing letters and numbers.',
  },
]

export default function Guide() {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <button onClick={() => navigate('/my')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Investment Guide</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '16px' }}>
        {SECTIONS.map((s, i) => (
          <div key={s.num}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 900, fontSize: 13, color: '#1a1a1a' }}>{s.num}</span>
              </div>
              <h2 style={{ fontWeight: 800, fontSize: 15, color: '#111', margin: 0 }}>{s.title}</h2>
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.8, marginBottom: 0, whiteSpace: 'pre-wrap', paddingLeft: 38 }}>
              {s.body}
            </p>
            {i < SECTIONS.length - 1 && (
              <div style={{ height: 1, background: '#FEF9E7', margin: '18px 0', borderLeft: `3px solid ${GOLD}` }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
