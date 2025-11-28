// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LotteryTicketNFT is ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;
    mapping(uint256 => uint256) private _lotteryRound;
    string private _baseTokenURI;

    constructor(string memory baseURI) ERC721("Lottery Ticket", "TICKET") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    function mint(address to, uint256 lotteryRound) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _lotteryRound[tokenId] = lotteryRound;
        _safeMint(to, tokenId);
        return tokenId;
    }

    function getLotteryRound(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Token does not exist");
        return _lotteryRound[tokenId];
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}