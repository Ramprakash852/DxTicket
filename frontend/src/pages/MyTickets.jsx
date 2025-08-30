import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWallet } from '../contexts/WalletContext.jsx'
import TicketFactoryABI from '../abis/TicketFactory.json'
import TicketMarketplaceABI from '../abis/TicketMarketplace.json'

function MyTickets() {
  const { isConnected, account, ticketFactory, ticketMarketplace, getTicketNFTContract } = useWallet()
  
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [resalePrice, setResalePrice] = useState({})
  const [resaleStatus, setResaleStatus] = useState({})
  const [resaleLoading, setResaleLoading] = useState({})
  
  // Move fetchMyTickets outside of useEffect so it can be called from other functions
  const fetchMyTickets = async () => {
    if (!isConnected || !account || !ticketFactory) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // Get all event addresses from the factory
      const eventAddresses = await ticketFactory.getAllEvents()
      
      // Create an array to store ticket details
      const myTickets = []
      
      // Get active marketplace listings to check if any of user's tickets are listed
      let activeListings = []
      let listingsByTicket = {}
      
      if (ticketMarketplace) {
        try {
          // Get active listings and handle empty array case
          let activeListingIds = []
          try {
            activeListingIds = await ticketMarketplace.getActiveListings()
          } catch (listingErr) {
            console.log('No active listings found or contract not initialized properly')
            // Continue with empty listings array
          }
          
          // Create a map of event address + token ID to listing ID for quick lookup
          for (const listingId of activeListingIds) {
            const listing = await ticketMarketplace.listings(listingId)
            if (listing.seller.toLowerCase() === account.toLowerCase()) {
              const key = `${listing.ticketContract.toLowerCase()}-${listing.tokenId.toString()}`
              listingsByTicket[key] = {
                listingId: listingId.toString(),
                price: ethers.formatEther(listing.price)
              }
              
              // Add to active listings array
              activeListings.push({
                listingId: listingId.toString(),
                eventAddress: listing.ticketContract,
                tokenId: listing.tokenId.toString(),
                price: ethers.formatEther(listing.price)
              })
            }
          }
        } catch (err) {
          console.error('Error processing marketplace listings:', err)
          // Continue without marketplace data if there's an error
        }
      }
      
      // Check each event for tickets owned by the user
      for (const eventAddress of eventAddresses) {
        try {
          // Create contract instance for this event
          const eventContract = getTicketNFTContract(eventAddress)
          
          if (!eventContract) continue
          
          // Get basic info about the event
          const name = await eventContract.name()
          const symbol = await eventContract.symbol()
          const nextTokenId = await eventContract.nextTokenId()
          
          // Check each token ID to see if the user owns it
          for (let tokenId = 0; tokenId < nextTokenId; tokenId++) {
            try {
              const owner = await eventContract.ownerOf(tokenId)
              
              // If the user owns this ticket, add it to the list
              if (owner.toLowerCase() === account.toLowerCase()) {
                // Check if the ticket has been used
                const isUsed = await eventContract.usedTickets(tokenId)
                
                // Get ticket price for reference
                const ticketPrice = await eventContract.ticketPrice()
                
                // Check if this ticket is listed in the marketplace
                const ticketKey = `${eventAddress.toLowerCase()}-${tokenId}`
                const listingInfo = listingsByTicket[ticketKey]
                
                myTickets.push({
                  eventAddress,
                  eventName: name,
                  eventSymbol: symbol,
                  tokenId,
                  isUsed,
                  ticketPrice: ethers.formatEther(ticketPrice),
                  isListed: !!listingInfo,
                  listingId: listingInfo?.listingId,
                  listingPrice: listingInfo?.price
                })
              }
            } catch (err) {
              // Skip this token if there's an error (e.g., token doesn't exist or was burned)
              console.log(`Error checking token ${tokenId} for event ${eventAddress}:`, err)
            }
          }
        } catch (err) {
          console.error(`Error checking tickets for event ${eventAddress}:`, err)
        }
      }
      
      // Also add any tickets that are listed in the marketplace but no longer owned by the user
      for (const listing of activeListings) {
        // Check if we already added this ticket
        const exists = myTickets.some(ticket => 
          ticket.eventAddress.toLowerCase() === listing.eventAddress.toLowerCase() && 
          ticket.tokenId.toString() === listing.tokenId.toString()
        )
        
        if (!exists) {
          try {
            // Get event details
            const eventContract = getTicketNFTContract(listing.eventAddress)
            if (!eventContract) continue
            
            const name = await eventContract.name()
            const symbol = await eventContract.symbol()
            const isUsed = await eventContract.usedTickets(listing.tokenId)
            const ticketPrice = await eventContract.ticketPrice()
            
            // Add the listed ticket
            myTickets.push({
              eventAddress: listing.eventAddress,
              eventName: name,
              eventSymbol: symbol,
              tokenId: listing.tokenId,
              isUsed,
              ticketPrice: ethers.formatEther(ticketPrice),
              isListed: true,
              listingId: listing.listingId,
              listingPrice: listing.price,
              listedInMarketplace: true // Flag to indicate this ticket is in the marketplace
            })
          } catch (err) {
            console.error(`Error fetching details for listed ticket:`, err)
          }
        }
      }
      
      setTickets(myTickets)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Failed to load your tickets. Please try again later.')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchMyTickets()
  }, [isConnected, account, ticketFactory, getTicketNFTContract])
  
  const generateQRCode = (eventAddress, tokenId) => {
    // Create a simple data string that contains the event address and token ID
    // In a real app, you might want to encrypt this or use a more secure format
    const ticketData = JSON.stringify({ eventAddress, tokenId })
    
    // For demo purposes, we'll just return a URL to a QR code generator
    // In a production app, you would generate this on the client side with a library
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketData)}`
  }
  
  // Handle resale price input change
  const handleResalePriceChange = (ticketKey, value) => {
    setResalePrice(prev => ({
      ...prev,
      [ticketKey]: value
    }))
  }
  
  // List ticket for resale
  const listTicketForResale = async (eventAddress, tokenId) => {
    if (!isConnected || !ticketMarketplace) return
    
    const ticketKey = `${eventAddress}-${tokenId}`
    const price = resalePrice[ticketKey]
    
    if (!price || parseFloat(price) <= 0) {
      setResaleStatus(prev => ({
        ...prev,
        [ticketKey]: { error: 'Please enter a valid price' }
      }))
      return
    }
    
    try {
      setResaleLoading(prev => ({ ...prev, [ticketKey]: true }))
      setResaleStatus(prev => ({ ...prev, [ticketKey]: { loading: true } }))
      
      // Get the event contract
      const eventContract = getTicketNFTContract(eventAddress)
      
      // First, check if the marketplace is whitelisted for transfers
      const isWhitelisted = await eventContract.transferWhitelist(ticketMarketplace.target)
      
      if (!isWhitelisted) {
        setResaleStatus(prev => ({
          ...prev,
          [ticketKey]: { 
            error: <>
              Marketplace not authorized for transfers. 
              <Link to={`/event/${eventAddress}`} className="text-blue-600 hover:underline">
                Visit event page
              </Link> to request authorization from the organizer.
            </> 
          }
        }))
        setResaleLoading(prev => ({ ...prev, [ticketKey]: false }))
        return
      }
      
      // Approve the marketplace to transfer the ticket
      const approveTx = await eventContract.approve(ticketMarketplace.target, tokenId)
      await approveTx.wait()
      
      // List the ticket on the marketplace
      const priceInWei = ethers.parseEther(price.toString())
      const listTx = await ticketMarketplace.listTicket(eventAddress, tokenId, priceInWei)
      await listTx.wait()
      
      setResaleStatus(prev => ({
        ...prev,
        [ticketKey]: { success: 'Ticket listed for resale successfully!' }
      }))
      
      // Refresh tickets after listing
      fetchMyTickets()
    } catch (err) {
      console.error('Error listing ticket for resale:', err)
      setResaleStatus(prev => ({
        ...prev,
        [ticketKey]: { error: err.message || 'Failed to list ticket for resale' }
      }))
    } finally {
      setResaleLoading(prev => ({ ...prev, [ticketKey]: false }))
    }
  }
  
  // Cancel a listing
  const cancelListing = async (eventAddress, tokenId, listingId) => {
    if (!isConnected || !ticketMarketplace) return
    
    const ticketKey = `${eventAddress}-${tokenId}`
    
    try {
      setResaleLoading(prev => ({ ...prev, [ticketKey]: true }))
      setResaleStatus(prev => ({ ...prev, [ticketKey]: { loading: 'Cancelling listing...' } }))
      
      // Call the cancelListing function on the marketplace contract
      const tx = await ticketMarketplace.cancelListing(listingId)
      await tx.wait()
      
      setResaleStatus(prev => ({
        ...prev,
        [ticketKey]: { success: 'Listing cancelled successfully!' }
      }))
      
      // Refresh tickets after cancelling
      fetchMyTickets()
    } catch (err) {
      console.error('Error cancelling listing:', err)
      setResaleStatus(prev => ({
        ...prev,
        [ticketKey]: { error: err.message || 'Failed to cancel listing' }
      }))
    } finally {
      setResaleLoading(prev => ({ ...prev, [ticketKey]: false }))
    }
  }
  
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
        <p className="mb-6">Please connect your wallet to view your tickets.</p>
      </div>
    )
  }
  
  if (tickets.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">My Tickets</h1>
        
        <div className="card text-center py-8">
          <h2 className="text-xl font-semibold mb-2">No Tickets Found</h2>
          <p className="text-gray-600 mb-6">You don't have any tickets yet.</p>
          <Link to="/" className="btn btn-primary">
            Browse Events
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Tickets</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tickets.map((ticket) => (
          <div 
            key={`${ticket.eventAddress}-${ticket.tokenId}`}
            className={`card ${ticket.isUsed ? 'bg-gray-100' : 'bg-white'}`}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{ticket.eventName}</h2>
                  <p className="text-gray-600">Token ID: {ticket.tokenId}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${ticket.isUsed ? 'bg-gray-200 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                    {ticket.isUsed ? 'Used' : 'Valid'}
                  </span>
                  {ticket.isListed && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      Listed for Sale
                    </span>
                  )}
                </div>
              </div>
              
              {!ticket.isUsed && (
                <div className="flex flex-col items-center mb-4">
                  <img 
                    src={generateQRCode(ticket.eventAddress, ticket.tokenId)} 
                    alt="Ticket QR Code" 
                    className="w-32 h-32 mb-2"
                  />
                  <p className="text-xs text-gray-600 text-center break-all">
                    <span className="font-medium">Event Address:</span><br/>
                    {ticket.eventAddress}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-center">
                  <Link 
                    to={`/event/${ticket.eventAddress}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Event
                  </Link>
                  
                  {!ticket.isUsed && (
                    <button 
                      className="btn btn-secondary text-sm"
                      onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(JSON.stringify({ eventAddress: ticket.eventAddress, tokenId: ticket.tokenId }))}`, '_blank')}
                    >
                      Show Full QR
                    </button>
                  )}
                </div>
                
                {/* Resale Section */}
                {!ticket.isUsed && (
                  <div className="border-t pt-3 mt-2">
                    <h3 className="text-sm font-medium mb-2">Resell Your Ticket</h3>
                    
                    {ticket.isListed ? (
                      <div className="flex flex-col space-y-2">
                        <div className="bg-blue-50 text-blue-700 p-2 rounded text-sm">
                          <p className="font-medium">Listed for {ticket.listingPrice} ETH</p>
                          <p className="text-xs mt-1">This ticket is currently listed in the marketplace</p>
                          {ticket.listedInMarketplace && (
                            <p className="text-xs mt-1 italic">
                              Note: This ticket is now held by the marketplace contract
                            </p>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <Link 
                            to="/marketplace" 
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View in Marketplace
                          </Link>
                          <button
                            className="text-red-600 hover:underline text-sm"
                            onClick={() => cancelListing(ticket.eventAddress, ticket.tokenId, ticket.listingId)}
                          >
                            Cancel Listing
                          </button>
                        </div>
                      </div>
                    ) : resaleStatus[`${ticket.eventAddress}-${ticket.tokenId}`]?.success ? (
                      <div className="bg-green-50 text-green-700 p-2 rounded text-sm">
                        {resaleStatus[`${ticket.eventAddress}-${ticket.tokenId}`].success}
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            placeholder={`Original price: ${ticket.ticketPrice} ETH`}
                            className="flex-1 p-1 text-sm border rounded"
                            value={resalePrice[`${ticket.eventAddress}-${ticket.tokenId}`] || ''}
                            onChange={(e) => handleResalePriceChange(`${ticket.eventAddress}-${ticket.tokenId}`, e.target.value)}
                            min="0"
                            step="0.01"
                          />
                          <button
                            className={`btn btn-primary text-xs py-1 px-2 ${resaleLoading[`${ticket.eventAddress}-${ticket.tokenId}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => listTicketForResale(ticket.eventAddress, ticket.tokenId)}
                            disabled={resaleLoading[`${ticket.eventAddress}-${ticket.tokenId}`]}
                          >
                            {resaleLoading[`${ticket.eventAddress}-${ticket.tokenId}`] ? 'Listing...' : 'List for Resale'}
                          </button>
                        </div>
                        
                        {resaleStatus[`${ticket.eventAddress}-${ticket.tokenId}`]?.error && (
                          <div className="text-red-600 text-xs">
                            {resaleStatus[`${ticket.eventAddress}-${ticket.tokenId}`].error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyTickets