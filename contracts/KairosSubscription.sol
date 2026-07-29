// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title KairosSubscription
 * @dev Web3 Subscription & AI Token Purchasing Smart Contract for Kairos AI Platform
 * Polygon L2 (USDC / MATIC) Enabled
 */
contract KairosSubscription {
    address public owner;

    enum PlanType { FREE, PRO, TEAM, ENTERPRISE }

    struct Subscription {
        PlanType plan;
        uint256 expiresAt;
        bool isActive;
    }

    mapping(address => Subscription) public subscriptions;
    mapping(address => uint256) public userTokenBalance;

    event SubscriptionPurchased(address indexed user, PlanType plan, uint256 expiresAt);
    event TokensPurchased(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Kairos: Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function subscribe(PlanType _plan) external payable {
        uint256 duration = 30 days;
        uint256 expiresAt = block.timestamp + duration;

        subscriptions[msg.sender] = Subscription({
            plan: _plan,
            expiresAt: expiresAt,
            isActive: true
        });

        emit SubscriptionPurchased(msg.sender, _plan, expiresAt);
    }

    function purchaseAITokens(uint256 tokenAmount) external payable {
        userTokenBalance[msg.sender] += tokenAmount;
        emit TokensPurchased(msg.sender, tokenAmount);
    }

    function getSubscriptionStatus(address user) external view returns (PlanType plan, uint256 expiresAt, bool active) {
        Subscription memory sub = subscriptions[user];
        return (sub.plan, sub.expiresAt, sub.isActive && sub.expiresAt > block.timestamp);
    }

    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
