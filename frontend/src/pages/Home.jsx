import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWallet } from '../contexts/WalletContext.jsx'
import TicketFactoryABI from '../abis/TicketFactory.json'
import TicketNFTABI from '../abis/TicketNFT.json'

function Home() {
  const { isConnected, ticketFactory } = useWallet()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchEvents = async () => {
      if (!isConnected || !ticketFactory) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Get all event addresses from the factory
        const eventAddresses = await ticketFactory.getAllEvents()
        
        // Create an array to store event details
        const eventDetails = []
        
        // Fetch details for each event
        for (const address of eventAddresses) {
          try {
            // Create contract instance for this event
            const eventContract = new ethers.Contract(
              address,
              TicketNFTABI.abi,
              ticketFactory.runner.provider
            )
            
            // Get basic info about the event
            const name = await eventContract.name()
            const symbol = await eventContract.symbol()
            const ticketPrice = await eventContract.ticketPrice()
            
            eventDetails.push({
              address,
              name,
              symbol,
              ticketPrice: ethers.formatEther(ticketPrice),
            })
          } catch (err) {
            console.error(`Error fetching details for event at ${address}:`, err)
          }
        }
        
        setEvents(eventDetails)
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to load events. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [isConnected, ticketFactory])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-red-50 border border-red-200 text-red-700 p-4">
        <p>{error}</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
        <p className="mb-6">Please connect your wallet to view available events.</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">All Events</h1>
          <Link to="/create-event" className="btn btn-primary">
            Create Event
          </Link>
        </div>
        
        <div className="card text-center py-8">
          <h2 className="text-xl font-semibold mb-2">No Events Found</h2>
          <p className="text-gray-600 mb-6">Be the first to create an event!</p>
          <Link to="/create-event" className="btn btn-primary">
            Create New Event
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">All Events</h1>
        <Link to="/create-event" className="btn btn-primary">
          Create Event
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Link 
            key={event.address} 
            to={`/event/${event.address}`}
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{event.name}</h2>
              <p className="text-gray-600 mb-4">Symbol: {event.symbol}</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">{event.ticketPrice} ETH</span>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">NFT Ticket</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Home