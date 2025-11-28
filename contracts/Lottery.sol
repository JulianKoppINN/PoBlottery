// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LotteryTicketNFT.sol";

contract Lottery is Ownable, ReentrancyGuard {
    LotteryTicketNFT public ticketNFT;
    
    uint256 public ticketPrice;
    uint256 public currentRound;
    uint256 public roundEndTime;
    uint256 public roundDuration;
    
    address public lastWinner;
    uint256 public lastWinAmount;
    
    bool public lotteryActive;
    
    mapping(uint256 => mapping(uint256 => address)) public ticketOwners;
    mapping(uint256 => uint256) public ticketCount;
    mapping(uint256 => uint256) public roundPot;
    
    event TicketPurchased(address indexed buyer, uint256 indexed round, uint256 ticketId);
    event LotteryDrawn(address indexed winner, uint256 indexed round, uint256 amount);
    event LotteryStarted(uint256 indexed round, uint256 endTime);
    event LotteryEnded(uint256 indexed round);
    
    constructor(string memory baseURI, uint256 _ticketPrice, uint256 _roundDuration) Ownable(msg.sender) {
        ticketNFT = new LotteryTicketNFT(baseURI);
        ticketPrice = _ticketPrice;
        roundDuration = _roundDuration;
        currentRound = 1;
    }
    
    function startLottery() external onlyOwner {
        require(!lotteryActive, "Lottery is already active");
        
        lotteryActive = true;
        roundEndTime = block.timestamp + roundDuration;
        
        emit LotteryStarted(currentRound, roundEndTime);
    }
    
    function buyTicket() external payable nonReentrant {
        require(lotteryActive, "Lottery is not active");
        require(block.timestamp < roundEndTime, "Current round has ended");
        require(msg.value == ticketPrice, "Incorrect ticket price");
        
        uint256 ticketId = ticketNFT.mint(msg.sender, currentRound);
        
        ticketOwners[currentRound][ticketCount[currentRound]] = msg.sender;
        ticketCount[currentRound]++;
        roundPot[currentRound] += msg.value;
        
        emit TicketPurchased(msg.sender, currentRound, ticketId);
    }
    
    function drawLottery() external onlyOwner {
        require(lotteryActive, "Lottery is not active");
        require(block.timestamp >= roundEndTime, "Round has not ended yet");
        require(ticketCount[currentRound] > 0, "No tickets sold in this round");
        
        uint256 winningTicket = _getRandomNumber() % ticketCount[currentRound];
        address winner = ticketOwners[currentRound][winningTicket];
        uint256 prizeAmount = roundPot[currentRound];
        
        lastWinner = winner;
        lastWinAmount = prizeAmount;
        
        lotteryActive = false;
        
        emit LotteryDrawn(winner, currentRound, prizeAmount);
        emit LotteryEnded(currentRound);
        
        currentRound++;
        
        (bool success, ) = winner.call{value: prizeAmount}("");
        require(success, "Transfer failed");
    }
    
    function _getRandomNumber() internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, blockhash(block.number - 1))));
    }
    
    function setTicketPrice(uint256 _ticketPrice) external onlyOwner {
        require(!lotteryActive, "Cannot change ticket price during active lottery");
        ticketPrice = _ticketPrice;
    }
    
    function setRoundDuration(uint256 _roundDuration) external onlyOwner {
        require(!lotteryActive, "Cannot change round duration during active lottery");
        roundDuration = _roundDuration;
    }
    
    function getRemainingTime() external view returns (uint256) {
        if (!lotteryActive || block.timestamp >= roundEndTime) {
            return 0;
        }
        return roundEndTime - block.timestamp;
    }
    
    function getCurrentPot() external view returns (uint256) {
        return roundPot[currentRound];
    }
}