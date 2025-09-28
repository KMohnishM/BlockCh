// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title VyaaparAI
 * @dev Main contract for the Vyaapar.AI investment platform
 * Handles company registration, investments, and milestone management
 */
contract VyaaparAI is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    // Company structure
    struct Company {
        uint256 tokenId;
        string name;
        string description;
        string industry;
        uint256 valuation;
        uint256 totalInvestment;
        uint256 milestoneCount;
        address owner;
        uint256 createdAt;
        bool isActive;
    }
    
    // Investment structure
    struct Investment {
        uint256 companyTokenId;
        address investor;
        uint256 amount;
        uint256 timestamp;
        uint256 ownershipPercentage;
    }
    
    // Milestone structure
    struct Milestone {
        uint256 companyTokenId;
        string milestoneType;
        string description;
        uint256 timestamp;
        bool verified;
        uint256 valuationImpact;
    }
    
    // Funding Round structure
    struct FundingRound {
        uint256 companyTokenId;
        string roundName;
        uint256 targetAmount;
        uint256 raisedAmount;
        uint256 valuationCap;
        uint256 minimumInvestment;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isCompleted;
    }

    // Mappings
    mapping(uint256 => Company) public companies;
    mapping(uint256 => Investment[]) public companyInvestments;
    mapping(address => uint256[]) public userInvestments;
    mapping(uint256 => Milestone[]) public companyMilestones;
    mapping(uint256 => FundingRound) public fundingRounds;
    mapping(uint256 => uint256) public companyToFundingRound;
    
    // Events
    event CompanyCreated(
        uint256 indexed tokenId,
        string name,
        uint256 valuation,
        address indexed owner,
        uint256 timestamp
    );
    
    event InvestmentReceived(
        uint256 indexed companyTokenId,
        address indexed investor,
        uint256 amount,
        uint256 ownershipPercentage,
        uint256 timestamp
    );
    
    event MilestoneCompleted(
        uint256 indexed companyTokenId,
        string milestoneType,
        uint256 valuationImpact,
        uint256 timestamp
    );
    
    event FundingRoundCreated(
        uint256 indexed companyTokenId,
        uint256 indexed roundId,
        string roundName,
        uint256 targetAmount,
        uint256 valuationCap
    );
    
    event FundingRoundCompleted(
        uint256 indexed roundId,
        uint256 totalRaised,
        uint256 timestamp
    );

    constructor() ERC721("VyaaparAI Company Token", "VYAI") {}

    /**
     * @dev Register a new company and mint NFT token
     */
    function mintCompany(
        string memory name,
        string memory description,
        string memory industry,
        uint256 valuation,
        string memory tokenURI
    ) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        companies[tokenId] = Company({
            tokenId: tokenId,
            name: name,
            description: description,
            industry: industry,
            valuation: valuation,
            totalInvestment: 0,
            milestoneCount: 0,
            owner: msg.sender,
            createdAt: block.timestamp,
            isActive: true
        });
        
        emit CompanyCreated(tokenId, name, valuation, msg.sender, block.timestamp);
        return tokenId;
    }
    
    /**
     * @dev Invest in a company
     */
    function investInCompany(uint256 companyTokenId) public payable nonReentrant {
        require(_exists(companyTokenId), "Company does not exist");
        require(msg.value > 0, "Investment amount must be greater than 0");
        require(companies[companyTokenId].isActive, "Company is not active");
        
        Company storage company = companies[companyTokenId];
        
        // Calculate ownership percentage based on current valuation
        uint256 ownershipPercentage = (msg.value * 10000) / company.valuation; // Using basis points (10000 = 100%)
        
        // Create investment record
        Investment memory newInvestment = Investment({
            companyTokenId: companyTokenId,
            investor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            ownershipPercentage: ownershipPercentage
        });
        
        companyInvestments[companyTokenId].push(newInvestment);
        userInvestments[msg.sender].push(companyTokenId);
        
        // Update company's total investment
        company.totalInvestment += msg.value;
        
        // Transfer investment to company owner
        payable(company.owner).transfer(msg.value);
        
        emit InvestmentReceived(
            companyTokenId,
            msg.sender,
            msg.value,
            ownershipPercentage,
            block.timestamp
        );
    }
    
    /**
     * @dev Complete a milestone for a company
     */
    function completeMilestone(
        uint256 companyTokenId,
        string memory milestoneType,
        string memory description,
        uint256 valuationImpact
    ) public {
        require(_exists(companyTokenId), "Company does not exist");
        require(ownerOf(companyTokenId) == msg.sender, "Only company owner can complete milestones");
        
        Company storage company = companies[companyTokenId];
        
        // Create milestone record
        Milestone memory newMilestone = Milestone({
            companyTokenId: companyTokenId,
            milestoneType: milestoneType,
            description: description,
            timestamp: block.timestamp,
            verified: false, // Will be verified by external process
            valuationImpact: valuationImpact
        });
        
        companyMilestones[companyTokenId].push(newMilestone);
        company.milestoneCount++;
        
        // Apply valuation impact if positive
        if (valuationImpact > 0) {
            company.valuation += valuationImpact;
        }
        
        emit MilestoneCompleted(
            companyTokenId,
            milestoneType,
            valuationImpact,
            block.timestamp
        );
    }
    
    /**
     * @dev Create a funding round for a company
     */
    function createFundingRound(
        uint256 companyTokenId,
        string memory roundName,
        uint256 targetAmount,
        uint256 valuationCap,
        uint256 minimumInvestment,
        uint256 duration
    ) public returns (uint256) {
        require(_exists(companyTokenId), "Company does not exist");
        require(ownerOf(companyTokenId) == msg.sender, "Only company owner can create funding rounds");
        
        uint256 roundId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        fundingRounds[roundId] = FundingRound({
            companyTokenId: companyTokenId,
            roundName: roundName,
            targetAmount: targetAmount,
            raisedAmount: 0,
            valuationCap: valuationCap,
            minimumInvestment: minimumInvestment,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            isActive: true,
            isCompleted: false
        });
        
        companyToFundingRound[companyTokenId] = roundId;
        
        emit FundingRoundCreated(
            companyTokenId,
            roundId,
            roundName,
            targetAmount,
            valuationCap
        );
        
        return roundId;
    }
    
    /**
     * @dev Invest in a funding round
     */
    function investInFundingRound(uint256 roundId) public payable nonReentrant {
        FundingRound storage round = fundingRounds[roundId];
        require(round.isActive, "Funding round is not active");
        require(block.timestamp <= round.endTime, "Funding round has ended");
        require(msg.value >= round.minimumInvestment, "Investment below minimum amount");
        require(round.raisedAmount + msg.value <= round.targetAmount, "Investment exceeds target");
        
        // Process investment similar to direct company investment
        investInCompany(round.companyTokenId);
        
        // Update round totals
        round.raisedAmount += msg.value;
        
        // Check if round is completed
        if (round.raisedAmount >= round.targetAmount) {
            round.isActive = false;
            round.isCompleted = true;
            emit FundingRoundCompleted(roundId, round.raisedAmount, block.timestamp);
        }
    }
    
    /**
     * @dev Get company details
     */
    function getCompany(uint256 tokenId) public view returns (Company memory) {
        require(_exists(tokenId), "Company does not exist");
        return companies[tokenId];
    }
    
    /**
     * @dev Get company investments
     */
    function getCompanyInvestments(uint256 tokenId) public view returns (Investment[] memory) {
        return companyInvestments[tokenId];
    }
    
    /**
     * @dev Get user's investments
     */
    function getUserInvestments(address user) public view returns (uint256[] memory) {
        return userInvestments[user];
    }
    
    /**
     * @dev Get company milestones
     */
    function getCompanyMilestones(uint256 tokenId) public view returns (Milestone[] memory) {
        return companyMilestones[tokenId];
    }
    
    /**
     * @dev Get funding round details
     */
    function getFundingRound(uint256 roundId) public view returns (FundingRound memory) {
        return fundingRounds[roundId];
    }
    
    /**
     * @dev Update company valuation (only owner)
     */
    function updateCompanyValuation(uint256 tokenId, uint256 newValuation) public {
        require(_exists(tokenId), "Company does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only company owner can update valuation");
        
        companies[tokenId].valuation = newValuation;
    }
    
    /**
     * @dev Emergency pause for a company (only owner)
     */
    function pauseCompany(uint256 tokenId) public {
        require(_exists(tokenId), "Company does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only company owner can pause company");
        
        companies[tokenId].isActive = false;
    }
    
    /**
     * @dev Resume a paused company (only owner)
     */
    function resumeCompany(uint256 tokenId) public {
        require(_exists(tokenId), "Company does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only company owner can resume company");
        
        companies[tokenId].isActive = true;
    }
    
    // Required overrides
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}