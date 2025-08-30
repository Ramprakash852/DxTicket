// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TicketNFT.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketMarketplace is Ownable, IERC721Receiver {
    // Listing structure
    struct Listing {
        address seller;
        address ticketContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    // Mapping from listing ID to Listing
    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    // Events
    event TicketListed(uint256 indexed listingId, address indexed seller, address indexed ticketContract, uint256 tokenId, uint256 price);
    event TicketSold(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed listingId);

    constructor() Ownable(msg.sender) {}

    // List a ticket for sale
    function listTicket(address ticketContract, uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than zero");
        
        // Get the ticket contract
        TicketNFT ticket = TicketNFT(ticketContract);
        
        // Check if the ticket is used
        require(!ticket.usedTickets(tokenId), "Cannot list a used ticket");
        
        // Check if the sender owns the ticket
        require(ticket.ownerOf(tokenId) == msg.sender, "You don't own this ticket");
        
        // Check if the marketplace is whitelisted for transfers
        require(ticket.transferWhitelist(address(this)), "Marketplace not whitelisted for transfers");
        
        // Transfer the ticket to the marketplace
        ticket.transferTicket(msg.sender, address(this), tokenId);
        
        // Create the listing
        uint256 listingId = nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            ticketContract: ticketContract,
            tokenId: tokenId,
            price: price,
            active: true
        });
        
        emit TicketListed(listingId, msg.sender, ticketContract, tokenId, price);
    }

    // Buy a listed ticket
    function buyTicket(uint256 listingId) external payable {
        Listing storage listing = listings[listingId];
        
        require(listing.active, "Listing is not active");
        require(msg.value >= listing.price, "Insufficient payment");
        
        // Get the ticket contract
        TicketNFT ticket = TicketNFT(listing.ticketContract);
        
        // Check if the ticket is still valid
        require(!ticket.usedTickets(listing.tokenId), "Ticket has been used");
        
        // Mark listing as inactive
        listing.active = false;
        
        // Transfer the ticket to the buyer
        ticket.transferTicket(address(this), msg.sender, listing.tokenId);
        
        // Transfer payment to the seller
        payable(listing.seller).transfer(msg.value);
        
        emit TicketSold(listingId, msg.sender, listing.seller, listing.price);
    }

    // Cancel a listing
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        
        require(listing.active, "Listing is not active");
        require(listing.seller == msg.sender || owner() == msg.sender, "Not authorized");
        
        // Mark listing as inactive
        listing.active = false;
        
        // Get the ticket contract
        TicketNFT ticket = TicketNFT(listing.ticketContract);
        
        // Transfer the ticket back to the seller
        ticket.transferTicket(address(this), listing.seller, listing.tokenId);
        
        emit ListingCancelled(listingId);
    }

    // Get all active listings
    function getActiveListings() external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count active listings
        for (uint256 i = 0; i < nextListingId; i++) {
            if (listings[i].active) {
                count++;
            }
        }
        
        // Create array of active listing IDs
        uint256[] memory activeListings = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nextListingId; i++) {
            if (listings[i].active) {
                activeListings[index] = i;
                index++;
            }
        }
        
        return activeListings;
    }

    // Required for IERC721Receiver
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}