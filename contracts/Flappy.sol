// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract FlappyBirdWeb3 is ERC721, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 public constant BRONZE_THRESHOLD = 10;
    uint256 public constant SILVER_THRESHOLD = 25;
    uint256 public constant GOLD_THRESHOLD   = 50;

    struct LeaderEntry {
        address player;
        uint256 score;
    }

    mapping(address => uint256) public highScores;
    LeaderEntry[10] public top10;

    uint256 public nextTokenId = 1;

    mapping(address => bool) public hasBronze;
    mapping(address => bool) public hasSilver;
    mapping(address => bool) public hasGold;

    mapping(uint256 => uint8) public badgeTier; 

    event NewHighScore(address indexed player, uint256 score);
    event BadgeMinted(address indexed player, uint8 tier, uint256 tokenId);

    constructor()
        ERC721("FlappyBirdBadges", "FLAP")
        Ownable(msg.sender)
    {}

    function submitScore(
        uint256 score,
        bytes calldata signature
    ) external {
        require(score > highScores[msg.sender], "Score not higher");

        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, score, address(this))
        ).toEthSignedMessageHash();

        require(
            messageHash.recover(signature) == owner(),
            "Invalid score proof"
        );

        highScores[msg.sender] = score;
        emit NewHighScore(msg.sender, score);

        _updateLeaderboard(msg.sender, score);
        _mintEligibleBadges(msg.sender, score);
    }

    function _updateLeaderboard(address player, uint256 score) internal {
        for (uint256 i = 0; i < 10; i++) {
            if (top10[i].player == player) {
                for (uint256 j = i; j < 9; j++) {
                    top10[j] = top10[j + 1];
                }
                top10[9] = LeaderEntry(address(0), 0);
                break;
            }
        }

        for (uint256 i = 0; i < 10; i++) {
            if (score > top10[i].score) {
                for (uint256 j = 9; j > i; j--) {
                    top10[j] = top10[j - 1];
                }
                top10[i] = LeaderEntry(player, score);
                break;
            }
        }
    }


    function _mintEligibleBadges(address player, uint256 score) internal {
        if (score >= BRONZE_THRESHOLD && !hasBronze[player]) {
            hasBronze[player] = true;
            _mintBadge(player, 1);
        }
        if (score >= SILVER_THRESHOLD && !hasSilver[player]) {
            hasSilver[player] = true;
            _mintBadge(player, 2);
        }
        if (score >= GOLD_THRESHOLD && !hasGold[player]) {
            hasGold[player] = true;
            _mintBadge(player, 3);
        }
    }

    function _mintBadge(address to, uint8 tier) internal {
        uint256 tokenId = nextTokenId++;
        badgeTier[tokenId] = tier;
        _safeMint(to, tokenId);
        emit BadgeMinted(to, tier, tokenId);
    }


    function getTop10()
        external
        view
        returns (address[10] memory players, uint256[10] memory scores)
    {
        for (uint256 i = 0; i < 10; i++) {
            players[i] = top10[i].player;
            scores[i] = top10[i].score;
        }
    }
}