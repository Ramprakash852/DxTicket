const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    // Compile the contracts
    await hre.run('compile');

    // Deploy the TicketNFT contract
    const TicketNFT = await hre.ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy(
        "EventName", // Replace with your event name
        "EVT", // Replace with your event symbol
        "0x0d72dfaB139CdbF4b29fe9aB2D4e2299CbcAc2DD", // Replace with the royalty receiver address
        500, // Replace with the royalty fee numerator
        "0x3E506F2b200Fef4c46811A894015Fd0D388185EB", // Replace with the organizer address
        hre.ethers.parseEther("0.1") // Replace with the ticket price
    );

    await ticketNFT.waitForDeployment();
    console.log("TicketNFT deployed to:", await ticketNFT.getAddress());

    // Deploy the TicketFactory contract
    const TicketFactory = await hre.ethers.getContractFactory("TicketFactory");
    const ticketFactory = await TicketFactory.deploy();

    await ticketFactory.waitForDeployment();
    console.log("TicketFactory deployed to:", await ticketFactory.getAddress());
    
    // Deploy the TicketMarketplace contract
    const TicketMarketplace = await hre.ethers.getContractFactory("TicketMarketplace");
    const ticketMarketplace = await TicketMarketplace.deploy();

    await ticketMarketplace.waitForDeployment();
    const marketplaceAddress = await ticketMarketplace.getAddress();
    console.log("TicketMarketplace deployed to:", marketplaceAddress);
    
    // Whitelist the marketplace in the ticket contract for transfers
    const ticketNFTAddress = await ticketNFT.getAddress();
    await ticketNFT.setTransferWhitelist(marketplaceAddress, true);
    console.log("Marketplace whitelisted for transfers in TicketNFT");
}

// Execute the main function
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });











// const hre = require("hardhat");

// async function main() {
//   const [deployer] = await hre.ethers.getSigners();
//   console.log("Deploying contracts with the account:", deployer.address);

//   // Get the contract factory
//   const TicketNFT = await hre.ethers.getContractFactory("TicketNFT");
  
//   // Deploy the contract with constructor parameters
//   const ticketNFT = await TicketNFT.deploy(
//     "TicketNFT",
//     "TICKET",
//     "0x3E506F2b200Fef4c46811A894015Fd0D388185EB", // royaltyReceiver
//     500, // 5% royalty
//     deployer.address, // organizer
//     hre.ethers.parseEther("0.1") // ticketPrice (0.1 ETH)
//   );

//   await ticketNFT.waitForDeployment();

//   console.log("TicketNFT deployed to:", await ticketNFT.getAddress());
// }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });