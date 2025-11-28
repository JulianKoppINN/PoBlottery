import { expect } from "chai";
import { ethers } from "hardhat";
import { Lottery, LotteryTicketNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Lottery", function () {
  let lottery: Lottery;
  let ticketNFT: LotteryTicketNFT;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  const ticketPrice = ethers.utils.parseEther("0.01");
  const roundDuration = 60 * 60 * 24; // 1 day

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const Lottery = await ethers.getContractFactory("Lottery");
    lottery = await Lottery.deploy("https://lottery.example/", ticketPrice, roundDuration);
    await lottery.deployed();

    const ticketNFTAddress = await lottery.ticketNFT();
    ticketNFT = await ethers.getContractAt("LotteryTicketNFT", ticketNFTAddress);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await lottery.owner()).to.equal(owner.address);
    });

    it("Should set the correct ticket price", async function () {
      expect(await lottery.ticketPrice()).to.equal(ticketPrice);
    });

    it("Should set the correct round duration", async function () {
      expect(await lottery.roundDuration()).to.equal(roundDuration);
    });
  });

  describe("Lottery Operations", function () {
    it("Should start a lottery", async function () {
      await lottery.startLottery();
      expect(await lottery.lotteryActive()).to.be.true;
    });

    it("Should allow users to buy tickets", async function () {
      await lottery.startLottery();
      await lottery.connect(addr1).buyTicket({ value: ticketPrice });
      
      expect(await ticketNFT.balanceOf(addr1.address)).to.equal(1);
      expect(await lottery.getCurrentPot()).to.equal(ticketPrice);
    });

    it("Should revert if ticket price is incorrect", async function () {
      await lottery.startLottery();
      await expect(
        lottery.connect(addr1).buyTicket({ value: ethers.utils.parseEther("0.005") })
      ).to.be.revertedWith("Incorrect ticket price");
    });

    it("Should not allow to draw before round end", async function () {
      await lottery.startLottery();
      await lottery.connect(addr1).buyTicket({ value: ticketPrice });
      
      await expect(lottery.drawLottery()).to.be.revertedWith("Round has not ended yet");
    });
  });
});