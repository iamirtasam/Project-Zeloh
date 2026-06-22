export const generateInviteLink = (inviteCode) => {
  const base = import.meta.env.VITE_APP_URL || window.location.origin
  return `${base}/pages/login/reg?lang=en&id=2&invitecode=${inviteCode}`
}
