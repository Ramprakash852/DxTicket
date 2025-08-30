import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWallet } from '../contexts/WalletContext.jsx'

function Marketplace() {
  const { isConnected, account, ticketMarketplace, getTicketNFTContract } = useWallet()
  
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [purchaseStatus, setPurchaseStatus] = useState({})
  const [purchaseLoading, setPurchaseLoading] = useState({})
  
  useEffect(() => {
    const fetchListings = async () => {
      if (!isConnected || !ticketMarketplace) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        
        // Get all active listings
        let activeListingIds = [];
        try {
          activeListingIds = await ticketMarketplace.getActiveListings();
        } catch (err) {
          console.error('Error calling getActiveListings:', err);
          // Handle empty result or BAD_DATA error - this happens when there are no listings
          if (err.code === 'BAD_DATA' || 
              (err.value && err.value === '0x') || 
              (err.message && err.message.includes('could not decode result data')) ||
              (err.message && err.message.includes('invalid result'))) {
            console.log('No active listings found or contract not properly initialized');
            // This is an expected condition when there are no listings
            // Just set empty listings and continue without showing an error
            setListings([]);
            setLoading(false);
            return;
          }
          // For any other errors, set a user-friendly error message and stop loading
          setError('Unable to fetch marketplace listings. Please try again later.');
          setLoading(false);
          return;
        }
        
        // If we get an empty array, handle it gracefully
        if (!activeListingIds || activeListingIds.length === 0) {
          setListings([]);
          setLoading(false);
          return;
        }
        
        // Create an array to store listing details
        const listingDetails = []
        
        // Fetch details for each listing
        for (const listingId of activeListingIds) {
          try {
            const listing = await ticketMarketplace.listings(listingId)
            
            // Get event contract
            const eventContract = getTicketNFTContract(listing.ticketContract)
            
            if (!eventContract) continue
            
            // Get basic info about the event
            const name = await eventContract.name()
            const symbol = await eventContract.symbol()
            const isUsed = await eventContract.usedTickets(listing.tokenId)
            
            // Skip used tickets
            if (isUsed) continue
            
            listingDetails.push({
              listingId: listingId.toString(),
              seller: listing.seller,
              eventAddress: listing.ticketContract,
              eventName: name,
              eventSymbol: symbol,
              tokenId: listing.tokenId.toString(),
              price: ethers.formatEther(listing.price),
              active: listing.active
            })
          } catch (err) {
            console.error(`Error fetching details for listing ${listingId}:`, err)
          }
        }
        
        setListings(listingDetails)
      } catch (err) {
        console.error('Error fetching listings:', err)
        setError('Failed to load marketplace listings. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchListings()
  }, [isConnected, ticketMarketplace, getTicketNFTContract])
  
  const purchaseTicket = async (listingId, price) => {
    if (!isConnected || !ticketMarketplace) return
    
    try {
      setPurchaseLoading(prev => ({ ...prev, [listingId]: true }))
      setPurchaseStatus(prev => ({ ...prev, [listingId]: { loading: true } }))
      
      // Purchase the ticket
      const tx = await ticketMarketplace.buyTicket(listingId, {
        value: ethers.parseEther(price)
      })
      
      await tx.wait()
      
      setPurchaseStatus(prev => ({
        ...prev,
        [listingId]: { success: 'Ticket purchased successfully!' }
      }))
      
      // Refresh listings after purchase
      const updatedListings = listings.filter(listing => listing.listingId !== listingId)
      setListings(updatedListings)
    } catch (err) {
      console.error('Error purchasing ticket:', err)
      setPurchaseStatus(prev => ({
        ...prev,
        [listingId]: { error: err.message || 'Failed to purchase ticket' }
      }))
    } finally {
      setPurchaseLoading(prev => ({ ...prev, [listingId]: false }))
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
        <p className="mb-6">Please connect your wallet to view marketplace listings.</p>
      </div>
    )
  }
  
  if (listings.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Ticket Marketplace</h1>
        
        <div className="card text-center py-8">
          <h2 className="text-xl font-semibold mb-2">No Tickets Available</h2>
          <p className="text-gray-600 mb-6">There are no tickets currently listed for resale.</p>
          <Link to="/my-tickets" className="btn btn-primary">
            List Your Tickets
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ticket Marketplace</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <div 
            key={listing.listingId}
            className="card bg-white"
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{listing.eventName}</h2>
                  <p className="text-gray-600">Token ID: {listing.tokenId}</p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Resale
                </span>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-700">
                  <span className="font-medium">Price:</span> {listing.price} ETH
                </p>
                <p className="text-gray-700 text-sm">
                  <span className="font-medium">Seller:</span> {listing.seller.substring(0, 6)}...{listing.seller.substring(listing.seller.length - 4)}
                </p>
              </div>
              
              {purchaseStatus[listing.listingId]?.success ? (
                <div className="bg-green-50 text-green-700 p-3 rounded text-sm mb-3">
                  {purchaseStatus[listing.listingId].success}
                </div>
              ) : (
                <button
                  className={`btn btn-primary w-full ${purchaseLoading[listing.listingId] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => purchaseTicket(listing.listingId, listing.price)}
                  disabled={purchaseLoading[listing.listingId] || listing.seller.toLowerCase() === account.toLowerCase()}
                >
                  {purchaseLoading[listing.listingId] ? 'Processing...' : 
                   listing.seller.toLowerCase() === account.toLowerCase() ? 'Your Listing' : 'Purchase Ticket'}
                </button>
              )}
              
              {purchaseStatus[listing.listingId]?.error && (
                <div className="text-red-600 text-xs mt-2">
                  {purchaseStatus[listing.listingId].error}
                </div>
              )}
              
              <div className="mt-3">
                <Link 
                  to={`/event/${listing.eventAddress}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Event Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Marketplace