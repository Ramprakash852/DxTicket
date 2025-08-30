// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract TicketNFT is ERC721URIStorage, ERC2981, Ownable {
    uint256 public nextTokenId;
    mapping(uint256 => bool) public usedTickets;

    // Only allow transfers by owner/admin (anti-scalping)
    mapping(address => bool) public transferWhitelist;

    address public organizer;
    uint256 public ticketPrice;

    constructor(
        string memory name,
        string memory symbol,
        address royaltyReceiver,
        uint96 royaltyFeeNumerator,
        address _organizer,
        uint256 _ticketPrice
    ) ERC721(name, symbol) Ownable(_organizer) {
        _setDefaultRoyalty(royaltyReceiver, royaltyFeeNumerator);
        organizer = _organizer;
        ticketPrice = _ticketPrice;
        transferWhitelist[_organizer] = true;
    }

    // Mint ticket
    function mint(address to, string memory uri) external onlyOwner {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // Mark ticket as used
    function markTicketUsed(uint256 tokenId) external onlyOwner {
        require(!usedTickets[tokenId], "Ticket already used");
        usedTickets[tokenId] = true;
    }

    // Verify if ticket is unused
    function verifyTicket(uint256 tokenId) external view returns (bool) {
        return !usedTickets[tokenId];
    }

    // Add/remove transfer whitelist addresses
    function setTransferWhitelist(address account, bool allowed) external onlyOwner {
        transferWhitelist[account] = allowed;
    }

    // Custom transfer function with anti-scalping logic
    function transferTicket(
        address from,
        address to,
        uint256 tokenId
    ) external {
        require(
            transferWhitelist[msg.sender],
            "Transfers restricted to approved platforms"
        );
        require(ownerOf(tokenId) == from, "Transfer from incorrect owner");
        require(to != address(0), "Transfer to zero address");

        _transfer(from, to, tokenId);
    }

    // Custom burn function
    function burnTicket(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) == msg.sender, "Caller is not the owner");
        require(!usedTickets[tokenId], "Cannot burn a used ticket");

        // Clear metadata and ownership
        _burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    // Required for Solidity multiple inheritance
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

contract TicketFactory {
    address[] public allTickets;

    event TicketCreated(address indexed contractAddress, string name, string symbol);

    function createEvent(
        string memory name,
        string memory symbol,
        address royaltyReceiver,
        uint96 royaltyFeeNumerator,
        uint256 ticketPrice
    ) external {
        TicketNFT ticket = new TicketNFT(
            name,
            symbol,
            royaltyReceiver,
            royaltyFeeNumerator,
            msg.sender,
            ticketPrice
        );
        allTickets.push(address(ticket));
        emit TicketCreated(address(ticket), name, symbol);
    }

    function getAllEvents() external view returns (address[] memory) {
        return allTickets;
    }
}



















// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/token/common/ERC2981.sol";

// contract TicketNFT is ERC721URIStorage, ERC2981, Ownable(msg.sender) {
//     uint256 public nextTokenId;
//     mapping(uint256 => bool) public usedTickets;

//     // Only allow transfers by owner/admin (anti-scalping)
//     mapping(address => bool) public transferWhitelist;

//     constructor(
//         string memory name,
//         string memory symbol,
//         address royaltyReceiver,
//         uint96 royaltyFeeNumerator
//     ) ERC721(name, symbol) {
//         _setDefaultRoyalty(royaltyReceiver, royaltyFeeNumerator);
//         transferWhitelist[msg.sender] = true;
//     }

//     // Mint ticket
//     function mint(address to, string memory uri) external onlyOwner {
//         uint256 tokenId = nextTokenId++;
//         _mint(to, tokenId);
//         _setTokenURI(tokenId, uri);
//     }

//     // Mark ticket as used
//     function markTicketUsed(uint256 tokenId) external onlyOwner {
//         require(!usedTickets[tokenId], "Ticket already used");
//         usedTickets[tokenId] = true;
//     }

//     // Verify if ticket is unused
//     function verifyTicket(uint256 tokenId) external view returns (bool) {
//         return !usedTickets[tokenId];
//     }

//     // Add/remove transfer whitelist addresses
//     function setTransferWhitelist(address account, bool allowed) external onlyOwner {
//         transferWhitelist[account] = allowed;
//     }

//     // Custom transfer function with anti-scalping logic
//     function transferTicket(
//         address from,
//         address to,
//         uint256 tokenId
//     ) external {
//         require(
//             transferWhitelist[msg.sender],
//             "Transfers restricted to approved platforms"
//         );
//         require(ownerOf(tokenId) == from, "Transfer from incorrect owner");
//         require(to != address(0), "Transfer to zero address");

//         _transfer(from, to, tokenId);
//     }

//     // Custom burn function
//     function burnTicket(uint256 tokenId) external onlyOwner {
//         require(_ownerOf(tokenId) == msg.sender, "Caller is not the owner");
//         require(!usedTickets[tokenId], "Cannot burn a used ticket");

//         // Clear metadata and ownership
//         _burn(tokenId);
//     }

//     function tokenURI(uint256 tokenId)
//         public
//         view
//         override(ERC721URIStorage)
//         returns (string memory)
//     {
//         return super.tokenURI(tokenId);
//     }

//     // Required for Solidity multiple inheritance
//     function supportsInterface(bytes4 interfaceId)
//         public
//         view
//         override(ERC721URIStorage, ERC2981)
//         returns (bool)
//     {
//         return super.supportsInterface(interfaceId);
//     }
// }