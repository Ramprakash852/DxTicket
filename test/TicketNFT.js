const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("TicketNFT", function () {
  async function deployTicketNFTFixture() {
    const [deployer, royaltyReceiver, organizer, buyer, secondBuyer] = await ethers.getSigners();
    
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy(
      "TicketNFT",
      "TICKET",
      royaltyReceiver.address,
      500, // 5% royalty
      organizer.address,
      ethers.parseEther("0.1") // 0.1 ETH ticket price
    );

    return { ticketNFT, deployer, royaltyReceiver, organizer, buyer, secondBuyer };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { ticketNFT } = await loadFixture(deployTicketNFTFixture);

      expect(await ticketNFT.name()).to.equal("TicketNFT");
      expect(await ticketNFT.symbol()).to.equal("TICKET");
    });

    it("Should set the right royalty info", async function () {
      const { ticketNFT, royaltyReceiver } = await loadFixture(deployTicketNFTFixture);
      
      const [receiver, royaltyAmount] = await ticketNFT.royaltyInfo(1, ethers.parseEther("1"));
      expect(receiver).to.equal(royaltyReceiver.address);
      expect(royaltyAmount).to.equal(ethers.parseEther("0.05")); // 5% of 1 ETH
    });

    it("Should set the right organizer and ticket price", async function () {
      const { ticketNFT, organizer } = await loadFixture(deployTicketNFTFixture);
      
      expect(await ticketNFT.organizer()).to.equal(organizer.address);
      expect(await ticketNFT.ticketPrice()).to.equal(ethers.parseEther("0.1"));
    });
  });

  describe("Minting", function () {
    it("Should mint a ticket when called by owner", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      expect(await ticketNFT.balanceOf(buyer.address)).to.equal(1);
      expect(await ticketNFT.ownerOf(0)).to.equal(buyer.address);
    });

    it("Should set the correct token URI", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      expect(await ticketNFT.tokenURI(0)).to.equal("test-uri");
    });

    it("Should increment token ID after minting", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri-1");
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri-2");
      
      expect(await ticketNFT.nextTokenId()).to.equal(2);
    });

    it("Should fail when non-owner tries to mint", async function () {
      const { ticketNFT, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await expect(
        ticketNFT.connect(buyer).mint(buyer.address, "test-uri")
      ).to.be.revertedWithCustomError(ticketNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("Ticket Usage", function () {
    it("Should mark a ticket as used", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      await ticketNFT.connect(organizer).markTicketUsed(0);
      
      expect(await ticketNFT.usedTickets(0)).to.equal(true);
    });

    it("Should verify an unused ticket", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      
      expect(await ticketNFT.verifyTicket(0)).to.equal(true);
    });

    it("Should verify a used ticket as invalid", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      await ticketNFT.connect(organizer).markTicketUsed(0);
      
      expect(await ticketNFT.verifyTicket(0)).to.equal(false);
    });

    it("Should fail to mark a ticket as used twice", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      await ticketNFT.connect(organizer).markTicketUsed(0);
      
      await expect(
        ticketNFT.connect(organizer).markTicketUsed(0)
      ).to.be.revertedWith("Ticket already used");
    });

    it("Should fail when non-owner tries to mark ticket as used", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      
      await expect(
        ticketNFT.connect(buyer).markTicketUsed(0)
      ).to.be.revertedWithCustomError(ticketNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("Transfer Restrictions", function () {
    it("Should set an address to the transfer whitelist", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).setTransferWhitelist(buyer.address, true);
      
      expect(await ticketNFT.transferWhitelist(buyer.address)).to.equal(true);
    });

    it("Should remove an address from the transfer whitelist", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).setTransferWhitelist(buyer.address, true);
      await ticketNFT.connect(organizer).setTransferWhitelist(buyer.address, false);
      
      expect(await ticketNFT.transferWhitelist(buyer.address)).to.equal(false);
    });

    it("Should allow whitelisted address to transfer tickets", async function () {
      const { ticketNFT, organizer, buyer, secondBuyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      await ticketNFT.connect(organizer).setTransferWhitelist(buyer.address, true);
      
      await ticketNFT.connect(buyer).transferTicket(buyer.address, secondBuyer.address, 0);
      
      expect(await ticketNFT.ownerOf(0)).to.equal(secondBuyer.address);
    });

    it("Should fail when non-whitelisted address tries to transfer", async function () {
      const { ticketNFT, organizer, buyer, secondBuyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      
      await expect(
        ticketNFT.connect(buyer).transferTicket(buyer.address, secondBuyer.address, 0)
      ).to.be.revertedWith("Transfers restricted to approved platforms");
    });

    it("Should fail when transfer is from incorrect owner", async function () {
      const { ticketNFT, organizer, buyer, secondBuyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      await ticketNFT.connect(organizer).setTransferWhitelist(secondBuyer.address, true);
      
      await expect(
        ticketNFT.connect(secondBuyer).transferTicket(secondBuyer.address, secondBuyer.address, 0)
      ).to.be.revertedWith("Transfer from incorrect owner");
    });
  });

  describe("Burning", function () {
    it("Should burn a ticket", async function () {
      const { ticketNFT, organizer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(organizer.address, "test-uri");
      await ticketNFT.connect(organizer).burnTicket(0);
      
      await expect(
        ticketNFT.ownerOf(0)
      ).to.be.reverted;
    });

    it("Should fail to burn a used ticket", async function () {
      const { ticketNFT, organizer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(organizer.address, "test-uri");
      await ticketNFT.connect(organizer).markTicketUsed(0);
      
      await expect(
        ticketNFT.connect(organizer).burnTicket(0)
      ).to.be.revertedWith("Cannot burn a used ticket");
    });

    it("Should fail when non-owner tries to burn a ticket", async function () {
      const { ticketNFT, organizer, buyer } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(organizer).mint(buyer.address, "test-uri");
      
      await expect(
        ticketNFT.connect(buyer).burnTicket(0)
      ).to.be.revertedWithCustomError(ticketNFT, "OwnableUnauthorizedAccount");
    });
  });
});

describe("TicketFactory", function () {
  async function deployTicketFactoryFixture() {
    const [owner, royaltyReceiver, organizer] = await ethers.getSigners();
    
    const TicketFactory = await ethers.getContractFactory("TicketFactory");
    const ticketFactory = await TicketFactory.deploy();

    return { ticketFactory, owner, royaltyReceiver, organizer };
  }

  describe("Event Creation", function () {
    it("Should create a new ticket event", async function () {
      const { ticketFactory, owner, royaltyReceiver } = await loadFixture(deployTicketFactoryFixture);
      
      await ticketFactory.createEvent(
        "EventTicket",
        "EVENT",
        royaltyReceiver.address,
        500, // 5% royalty
        ethers.parseEther("0.2") // 0.2 ETH ticket price
      );
      
      const events = await ticketFactory.getAllEvents();
      expect(events.length).to.equal(1);
    });

    it("Should emit TicketCreated event", async function () {
      const { ticketFactory, owner, royaltyReceiver } = await loadFixture(deployTicketFactoryFixture);
      
      await expect(
        ticketFactory.createEvent(
          "EventTicket",
          "EVENT",
          royaltyReceiver.address,
          500, // 5% royalty
          ethers.parseEther("0.2") // 0.2 ETH ticket price
        )
      ).to.emit(ticketFactory, "TicketCreated");
    });

    it("Should track multiple created events", async function () {
      const { ticketFactory, owner, royaltyReceiver } = await loadFixture(deployTicketFactoryFixture);
      
      await ticketFactory.createEvent(
        "Event1",
        "EV1",
        royaltyReceiver.address,
        500,
        ethers.parseEther("0.1")
      );
      
      await ticketFactory.createEvent(
        "Event2",
        "EV2",
        royaltyReceiver.address,
        1000,
        ethers.parseEther("0.2")
      );
      
      const events = await ticketFactory.getAllEvents();
      expect(events.length).to.equal(2);
    });
  });
});