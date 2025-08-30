import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import CreateEvent from './pages/CreateEvent'
import EventDetails from './pages/EventDetails'
import VerifyTicket from './pages/VerifyTicket'
import MyTickets from './pages/MyTickets'
import Marketplace from './pages/Marketplace'
import { useWallet } from './contexts/WalletContext'

function App() {
  const { connectWallet } = useWallet()

  useEffect(() => {
    // Check if wallet was previously connected
    const checkConnection = async () => {
      if (window.localStorage.getItem('walletConnected') === 'true') {
        await connectWallet()
      }
    }
    
    checkConnection()
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/event/:address" element={<EventDetails />} />
          <Route path="/verify-ticket" element={<VerifyTicket />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/marketplace" element={<Marketplace />} />
        </Routes>
      </main>
      <footer className="bg-gray-800 text-white text-center py-4 mt-auto">
        <p>NFT Ticketing © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

export default App