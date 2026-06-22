import BottomNav from '../components/BottomNav'

export default function Invest() {
  return (
    <div className="flex flex-col min-h-screen bg-white" style={{ paddingBottom: 72 }}>
      <div className="flex items-center justify-center flex-1">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">Film & Product Investment</p>
          <p className="text-sm text-gray-400 mt-1">Coming soon</p>
        </div>
      </div>
      <BottomNav active="home" />
    </div>
  )
}
