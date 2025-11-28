let provider, signer, lottery, ticketNFT;
let lotteryAddress = "YOUR_DEPLOYED_LOTTERY_ADDRESS";

const lotteryABI = [
    "function ticketNFT() view returns (address)",
    "function ticketPrice() view returns (uint256)",
    "function currentRound() view returns (uint256)",
    "function roundEndTime() view returns (uint256)",
    "function lastWinner() view returns (address)",
    "function lastWinAmount() view returns (uint256)",
    "function lotteryActive() view returns (bool)",
    "function owner() view returns (address)",
    "function startLottery()",
    "function buyTicket() payable",
    "function drawLottery()",
    "function getRemainingTime() view returns (uint256)",
    "function getCurrentPot() view returns (uint256)",
    "event TicketPurchased(address indexed buyer, uint256 indexed round, uint256 ticketId)",
    "event LotteryDrawn(address indexed winner, uint256 indexed round, uint256 amount)"
];

const ticketNFTABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function getLotteryRound(uint256 tokenId) view returns (uint256)",
    "function tokenURI(uint256 tokenId) view returns (string)"
];

async function connectWallet() {
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            const userAddress = await signer.getAddress();
            
            document.getElementById("connectButton").textContent = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
            
            lottery = new ethers.Contract(lotteryAddress, lotteryABI, signer);
            const ticketNFTAddress = await lottery.ticketNFT();
            ticketNFT = new ethers.Contract(ticketNFTAddress, ticketNFTABI, signer);
            
            // Show UI elements
            document.getElementById("lotteryInfo").classList.remove("d-none");
            document.getElementById("ticketPurchase").classList.remove("d-none");
            document.getElementById("userTickets").classList.remove("d-none");
            document.getElementById("previousWinners").classList.remove("d-none");
            
            // Check if user is owner
            const owner = await lottery.owner();
            if (userAddress.toLowerCase() === owner.toLowerCase()) {
                document.getElementById("adminPanel").classList.remove("d-none");
            }
            
            // Update UI
            updateLotteryInfo();
            updateUserTickets();
            setInterval(updateLotteryInfo, 10000); // Update every 10 seconds
            
            // Listen for events
            setupEventListeners();
            
        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert("Failed to connect wallet. Please try again.");
        }
    } else {
        alert("Please install MetaMask to use this application!");
    }
}

async function updateLotteryInfo() {
    try {
        const currentRound = await lottery.currentRound();
        const ticketPrice = await lottery.ticketPrice();
        const currentPot = await lottery.getCurrentPot();
        const remainingTime = await lottery.getRemainingTime();
        const isActive = await lottery.lotteryActive();
        const lastWinner = await lottery.lastWinner();
        const lastWinAmount = await lottery.lastWinAmount();
        
        document.getElementById("currentRound").textContent = currentRound.toString();
        document.getElementById("ticketPrice").textContent = ethers.utils.formatEther(ticketPrice);
        document.getElementById("currentPot").textContent = ethers.utils.formatEther(currentPot) + " ETH";
        
        if (isActive && remainingTime.gt(0)) {
            const hours = Math.floor(remainingTime / 3600);
            const minutes = Math.floor((remainingTime % 3600) / 60);
            const seconds = remainingTime % 60;
            document.getElementById("remainingTime").textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            document.getElementById("remainingTime").textContent = "Round Ended";
        }
        
        document.getElementById("lastWinner").textContent = lastWinner === ethers.constants.AddressZero ? 
            "No winner yet" : 
            lastWinner.slice(0, 6) + "..." + lastWinner.slice(-4);
            
        document.getElementById("lastWinAmount").textContent = ethers.utils.formatEther(lastWinAmount);
        
        // Update button states
        document.getElementById("buyButton").disabled = !isActive || remainingTime.eq(0);
        document.getElementById("startLotteryButton").disabled = isActive;
        document.getElementById("drawLotteryButton").disabled = !isActive || remainingTime.gt(0);
        
    } catch (error) {
        console.error("Error updating lottery info:", error);
    }
}

async function updateUserTickets() {
    try {
        const userAddress = await signer.getAddress();
        const balance = await ticketNFT.balanceOf(userAddress);
        
        const ticketsList = document.getElementById("ticketsList");
        ticketsList.innerHTML = "";
        
        if (balance.eq(0)) {
            ticketsList.innerHTML = "<p class='text-center w-100'>You don't have any tickets yet.</p>";
            return;
        }
        
        for (let i = 0; i < balance; i++) {
            const tokenId = await ticketNFT.tokenOfOwnerByIndex(userAddress, i);
            const round = await ticketNFT.getLotteryRound(tokenId);
            
            const ticketElement = document.createElement("div");
            ticketElement.className = "col-md-3 mb-3";
            ticketElement.innerHTML = `
                <div class="ticket-item">
                    <h4>Ticket #${tokenId.toString()}</h4>
                    <p>Round: ${round.toString()}</p>
                </div>
            `;
            
            ticketsList.appendChild(ticketElement);
        }
        
    } catch (error) {
        console.error("Error updating user tickets:", error);
    }
}

async function buyTickets() {
    try {
        const amount = parseInt(document.getElementById("ticketAmount").value);
        if (amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        
        const ticketPrice = await lottery.ticketPrice();
        const totalCost = ticketPrice.mul(amount);
        
        // Buy tickets one by one
        for (let i = 0; i < amount; i++) {
            const tx = await lottery.buyTicket({ value: ticketPrice });
            await tx.wait();
        }
        
        alert(`Successfully purchased ${amount} ticket(s)!`);
        updateUserTickets();
        updateLotteryInfo();
        
    } catch (error) {
        console.error("Error buying tickets:", error);
        alert("Failed to buy tickets. Please try again.");
    }
}

async function startLottery() {
    try {
        const tx = await lottery.startLottery();
        await tx.wait();
        alert("Lottery started successfully!");
        updateLotteryInfo();
    } catch (error) {
        console.error("Error starting lottery:", error);
        alert("Failed to start lottery. Please try again.");
    }
}

async function drawLottery() {
    try {
        const tx = await lottery.drawLottery();
        await tx.wait();
        alert("Lottery drawn successfully!");
        updateLotteryInfo();
    } catch (error) {
        console.error("Error drawing lottery:", error);
        alert("Failed to draw lottery. Please try again.");
    }
}

function setupEventListeners() {
    // Lottery events
    lottery.on("TicketPurchased", (buyer, round, ticketId) => {
        updateLotteryInfo();
        if (buyer.toLowerCase() === signer.getAddress().toLowerCase()) {
            updateUserTickets();
        }
    });
    
    lottery.on("LotteryDrawn", (winner, round, amount) => {
        updateLotteryInfo();
        alert(`Lottery Round ${round} has been drawn! Winner: ${winner.slice(0, 6)}...${winner.slice(-4)} won ${ethers.utils.formatEther(amount)} ETH`);
    });
    
    // UI button events
    document.getElementById("connectButton").addEventListener("click", connectWallet);
    document.getElementById("buyButton").addEventListener("click", buyTickets);
    document.getElementById("startLotteryButton").addEventListener("click", startLottery);
    document.getElementById("drawLotteryButton").addEventListener("click", drawLottery);
}

// Initialize the app when the page loads
window.addEventListener("load", () => {
    // Check if MetaMask is installed
    if (window.ethereum) {
        document.getElementById("connectButton").addEventListener("click", connectWallet);
    } else {
        document.getElementById("connectButton").textContent = "Please install MetaMask";
        document.getElementById("connectButton").disabled = true;
    }
});