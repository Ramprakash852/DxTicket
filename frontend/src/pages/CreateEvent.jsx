import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWallet } from '../contexts/WalletContext'

function CreateEvent() {
  const { isConnected, ticketFactory, account } = useWallet()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    royaltyReceiver: '',
    royaltyFee: 500, // Default 5%
    ticketPrice: '0.1' // Default 0.1 ETH
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState('')
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isConnected) {
      setError('Please connect your wallet first')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // Validate inputs
      if (!formData.name || !formData.symbol) {
        throw new Error('Event name and symbol are required')
      }
      
      const royaltyReceiver = formData.royaltyReceiver || account
      const royaltyFee = parseInt(formData.royaltyFee)
      
      if (isNaN(royaltyFee) || royaltyFee < 0 || royaltyFee > 10000) {
        throw new Error('Royalty fee must be between 0 and 10000 (0-100%)')
      }
      
      const ticketPrice = ethers.parseEther(formData.ticketPrice)
      
      // Call the createEvent function on the factory contract
      const tx = await ticketFactory.createEvent(
        formData.name,
        formData.symbol,
        royaltyReceiver,
        royaltyFee,
        ticketPrice
      )
      
      setTxHash(tx.hash)
      
      // Wait for transaction to be mined
      await tx.wait()
      
      setSuccess(true)
      
      // Reset form
      setFormData({
        name: '',
        symbol: '',
        royaltyReceiver: '',
        royaltyFee: 500,
        ticketPrice: '0.1'
      })
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/')
      }, 3000)
      
    } catch (err) {
      console.error('Error creating event:', err)
      setError(err.message || 'Failed to create event. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
        <p className="mb-6">Please connect your wallet to create a new event.</p>
      </div>
    )
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
      
      {success ? (
        <div className="card bg-green-50 border border-green-200">
          <div className="text-center py-6">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <h2 className="text-xl font-bold text-green-800 mb-2">Event Created Successfully!</h2>
            <p className="mb-4">Your event has been created and is now available on the platform.</p>
            <p className="text-sm text-gray-600 mb-4">
              Transaction Hash: <a href={`https://explorer.sei.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{txHash}</a>
            </p>
            <button 
              onClick={() => navigate('/')} 
              className="btn btn-primary"
            >
              View All Events
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="name">
                Event Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Annual Tech Conference 2023"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="symbol">
                Event Symbol *
              </label>
              <input
                type="text"
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className="input"
                placeholder="e.g., TECH23"
                maxLength={8}
                required
              />
              <p className="text-sm text-gray-500 mt-1">Short symbol for your event (max 8 characters)</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="royaltyReceiver">
                Royalty Receiver Address
              </label>
              <input
                type="text"
                id="royaltyReceiver"
                name="royaltyReceiver"
                value={formData.royaltyReceiver}
                onChange={handleChange}
                className="input"
                placeholder={account}
              />
              <p className="text-sm text-gray-500 mt-1">Address that will receive royalties from secondary sales (defaults to your address)</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="royaltyFee">
                Royalty Fee (basis points)
              </label>
              <input
                type="number"
                id="royaltyFee"
                name="royaltyFee"
                value={formData.royaltyFee}
                onChange={handleChange}
                className="input"
                min="0"
                max="10000"
              />
              <p className="text-sm text-gray-500 mt-1">Fee in basis points (100 = 1%, 500 = 5%, 1000 = 10%)</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="ticketPrice">
                Ticket Price (ETH)
              </label>
              <input
                type="text"
                id="ticketPrice"
                name="ticketPrice"
                value={formData.ticketPrice}
                onChange={handleChange}
                className="input"
                placeholder="0.1"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Event...
                  </>
                ) : (
                  'Create Event'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default CreateEvent