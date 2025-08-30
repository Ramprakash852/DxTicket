import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'

function Navbar() {
  const { account, isConnected, connectWallet, disconnectWallet } = useWallet()

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and main navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold">DxTicket</Link>
            
            <div className="hidden md:flex space-x-4">
              <Link to="/" className="hover:text-blue-300 transition-colors">Events</Link>
              {isConnected && (
                <>
                  <Link to="/my-tickets" className="hover:text-blue-300 transition-colors">My Tickets</Link>
                  <Link to="/marketplace" className="hover:text-blue-300 transition-colors">Marketplace</Link>
                  <Link to="/create-event" className="hover:text-blue-300 transition-colors">Create Event</Link>
                  <Link to="/verify-ticket" className="hover:text-blue-300 transition-colors">Verify Ticket</Link>
                </>
              )}
            </div>
          </div>

          {/* Wallet connection */}
          <div>
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <span className="bg-gray-700 text-sm py-1 px-3 rounded-full">
                  {formatAddress(account)}
                </span>
                <button 
                  onClick={disconnectWallet}
                  className="btn btn-secondary text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="btn btn-primary"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar