import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const ticketPrice = ethers.utils.parseEther("0.01"); // 0.01 ETH per ticket
  const roundDuration = 60 * 60 * 24; // 1 day in seconds
  const baseURI = "https://api.etherlottery.example/metadata/";

  const Lottery = await ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy(baseURI, ticketPrice, roundDuration);

  await lottery.deployed();

  console.log("Lottery deployed to:", lottery.address);
  console.log("Ticket NFT deployed to:", await lottery.ticketNFT());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });