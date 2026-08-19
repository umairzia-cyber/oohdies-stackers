// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TestnetPhysicalLiquidityPool
 * @notice TESTNET ONLY / NOT FOR PRODUCTION
 * @dev Simulates a physical two-way liquidity pool / acquisition counterparty on Robinhood Chain Testnet.
 *      Accepts MockRevenueToken (REV) from the revenue simulator and physically disburses pre-funded mock reward assets.
 *      No reward tokens are minted on the fly; all disbursements come strictly from pre-funded reserves.
 */
contract TestnetPhysicalLiquidityPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State Variables ---
    IERC20 public immutable revenueToken;

    struct AssetRate {
        uint256 numerator;
        uint256 denominator;
        uint8 decimals;
        bool isApproved;
    }

    mapping(address => AssetRate) public assetRates;
    mapping(address => uint256) public rewardReserves;
    uint256 public revenueReserves;
    uint256 public totalRevenueSettled;
    uint256 public totalSwapsExecuted;

    // --- Events ---
    event AssetRateConfigured(address indexed asset, uint256 numerator, uint256 denominator, uint8 decimals, bool isApproved);
    event LiquidityDeposited(address indexed asset, address indexed provider, uint256 amount);
    event LiquidityWithdrawn(address indexed asset, address indexed recipient, uint256 amount);
    event RevenueWithdrawn(address indexed recipient, uint256 amount);
    event PhysicalSettlementExecuted(
        address indexed asset,
        address indexed sender,
        address indexed recipient,
        uint256 revAmountSpent,
        uint256 rewardAmountDisbursed
    );

    // --- Custom Errors ---
    error ZeroAddressNotAllowed();
    error ZeroAmountNotAllowed();
    error AssetNotApproved(address asset);
    error InsufficientPoolLiquidity(address asset, uint256 requested, uint256 available);

    constructor(address _revenueToken, address _initialOwner) Ownable(_initialOwner) {
        if (_revenueToken == address(0) || _initialOwner == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        revenueToken = IERC20(_revenueToken);
    }

    // =========================================================================
    // 1. ASSET CONFIGURATION & PRE-FUNDING
    // =========================================================================

    /**
     * @notice Configures or updates the deterministic exchange rate for a reward asset.
     */
    function setAssetRate(
        address asset,
        uint256 numerator,
        uint256 denominator,
        uint8 decimals,
        bool isApproved
    ) external onlyOwner {
        if (asset == address(0)) revert ZeroAddressNotAllowed();
        if (numerator == 0 || denominator == 0) revert ZeroAmountNotAllowed();

        assetRates[asset] = AssetRate({
            numerator: numerator,
            denominator: denominator,
            decimals: decimals,
            isApproved: isApproved
        });

        emit AssetRateConfigured(asset, numerator, denominator, decimals, isApproved);
    }

    /**
     * @notice Pre-funds the pool with physical reward-token inventory.
     */
    function depositRewardLiquidity(address asset, uint256 amount) external nonReentrant {
        if (asset == address(0)) revert ZeroAddressNotAllowed();
        if (amount == 0) revert ZeroAmountNotAllowed();
        if (!assetRates[asset].isApproved) revert AssetNotApproved(asset);

        rewardReserves[asset] += amount;
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        emit LiquidityDeposited(asset, msg.sender, amount);
    }

    // =========================================================================
    // 2. TWO-WAY PHYSICAL SETTLEMENT (SWAP)
    // =========================================================================

    /**
     * @notice Swaps REV for reward asset: pulls REV into pool, pushes pre-funded reward asset to recipient.
     * @param asset Target reward asset
     * @param revAmount Amount of REV spent
     * @param recipient Target destination for acquired reward tokens (e.g. simulator)
     */
    function swapRevenueForReward(
        address asset,
        uint256 revAmount,
        address recipient
    ) external nonReentrant returns (uint256 amountAcquired) {
        if (asset == address(0) || recipient == address(0)) revert ZeroAddressNotAllowed();
        if (revAmount == 0) revert ZeroAmountNotAllowed();

        AssetRate memory rate = assetRates[asset];
        if (!rate.isApproved) revert AssetNotApproved(asset);

        // Compute reward amount with decimal scaling (standard 18-decimal base)
        uint256 baseAmount = (revAmount * rate.numerator) / rate.denominator;
        if (rate.decimals < 18) {
            uint256 scale = 10 ** (18 - rate.decimals);
            amountAcquired = baseAmount / scale;
        } else if (rate.decimals > 18) {
            uint256 scale = 10 ** (rate.decimals - 18);
            amountAcquired = baseAmount * scale;
        } else {
            amountAcquired = baseAmount;
        }

        if (amountAcquired == 0) revert ZeroAmountNotAllowed();

        uint256 available = rewardReserves[asset];
        if (amountAcquired > available) {
            revert InsufficientPoolLiquidity(asset, amountAcquired, available);
        }

        // Update reserves
        rewardReserves[asset] -= amountAcquired;
        revenueReserves += revAmount;
        totalRevenueSettled += revAmount;
        totalSwapsExecuted += 1;

        // Physical two-way token transfers:
        // 1. Pull REV from caller into pool
        revenueToken.safeTransferFrom(msg.sender, address(this), revAmount);

        // 2. Push pre-funded reward asset to recipient
        IERC20(asset).safeTransfer(recipient, amountAcquired);

        emit PhysicalSettlementExecuted(asset, msg.sender, recipient, revAmount, amountAcquired);
    }

    // =========================================================================
    // 3. ADMIN WITHDRAWALS & EMERGENCY CONTROLS
    // =========================================================================

    function withdrawRevenue(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddressNotAllowed();
        if (amount == 0) revert ZeroAmountNotAllowed();
        if (amount > revenueReserves) revert InsufficientPoolLiquidity(address(revenueToken), amount, revenueReserves);

        revenueReserves -= amount;
        revenueToken.safeTransfer(to, amount);

        emit RevenueWithdrawn(to, amount);
    }

    function withdrawRewardLiquidity(address asset, address to, uint256 amount) external onlyOwner nonReentrant {
        if (asset == address(0) || to == address(0)) revert ZeroAddressNotAllowed();
        if (amount == 0) revert ZeroAmountNotAllowed();
        if (amount > rewardReserves[asset]) revert InsufficientPoolLiquidity(asset, amount, rewardReserves[asset]);

        rewardReserves[asset] -= amount;
        IERC20(asset).safeTransfer(to, amount);

        emit LiquidityWithdrawn(asset, to, amount);
    }

    function approveRewardSpender(address asset, address spender, uint256 amount) external onlyOwner {
        if (asset == address(0) || spender == address(0)) revert ZeroAddressNotAllowed();
        IERC20(asset).forceApprove(spender, amount);
    }

    // =========================================================================
    // 4. VIEW GETTERS
    // =========================================================================

    function getReserve(address asset) external view returns (uint256) {
        return rewardReserves[asset];
    }

    function getRate(address asset) external view returns (uint256 numerator, uint256 denominator, uint8 decimals, bool isApproved) {
        AssetRate memory r = assetRates[asset];
        return (r.numerator, r.denominator, r.decimals, r.isApproved);
    }
}
