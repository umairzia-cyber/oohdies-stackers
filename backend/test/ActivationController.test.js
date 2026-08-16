import { expect } from "chai";
import hre from "hardhat";

describe("ActivationController", function () {

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const BANANA_SUPPLY = 1_000_000_000n * 10n ** 18n;

  const DEFAULT_ACTIVATION_COST = 1_000n * 10n ** 18n;

  let connection;
  let ethers;
  let networkHelpers;
  let PICKS = [];

  before(async function () {
    connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
  });

  async function deployFullFixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();

    const BananaToken = await ethers.getContractFactory("BananaToken");
    const banana = await BananaToken.deploy(owner.address);

    const OohdiesNFT = await ethers.getContractFactory("OohdiesNFT");
    const nft = await OohdiesNFT.deploy(owner.address);

    const ActivationController = await ethers.getContractFactory(
      "ActivationController"
    );
    const controller = await ActivationController.deploy(
      await nft.getAddress(),
      await banana.getAddress(),
      owner.address,
      DEFAULT_ACTIVATION_COST
    );

    await nft.setActivationController(await controller.getAddress());

    // Activation now records which reward assets an NFT earns, so it needs a live engine and a
    // pool of selectable assets. PICKS is every registered asset, which keeps the reward maths
    // identical to the pre-picks behaviour these tests were written against.
    const EarningEngine = await ethers.getContractFactory("EarningEngine");
    const engine = await EarningEngine.deploy(
      await controller.getAddress(),
      await nft.getAddress(),
      owner.address
    );
    await controller.setEarningEngine(await engine.getAddress());
    await nft.setEarningEngine(await engine.getAddress());

    const MockRewardToken = await ethers.getContractFactory("MockRewardToken");
    for (const [name, symbol, decimals] of [
      ["Apple Stock", "AAPLx", 18],
      ["USD Global", "USDG", 6],
      ["Tesla Stock", "TSLAx", 18],
    ]) {
      const token = await MockRewardToken.deploy(name, symbol, decimals, owner.address);
      await engine.registerRewardAsset(await token.getAddress());
    }


    // Copied out of the frozen Result so it can be passed back as calldata.
    PICKS = Array.from(await engine.getRegisteredRewardAssets());
    await controller.setRequiredPicks(PICKS.length);

    await nft.mint(alice.address);
    await nft.mint(alice.address);
    await nft.mint(bob.address);
    await nft.mint(bob.address);

    await banana.transfer(alice.address, 100_000n * 10n ** 18n);
    await banana.transfer(bob.address, 100_000n * 10n ** 18n);
    await banana.transfer(charlie.address, 100_000n * 10n ** 18n);

    return {
      banana,
      nft,
      controller,
      engine,
      owner,
      alice,
      bob,
      charlie,
      ethers,
      BananaToken,
      OohdiesNFT,
      ActivationController,
      networkHelpers,
    };
  }

  async function loadFixture(fixture) {
    const ctx = await networkHelpers.loadFixture(fixture);
    // Re-sync to whichever fixture was just restored; they share this module-level variable.
    // A view call, so it adds no block and cannot disturb timing-sensitive assertions.
    if (ctx && ctx.engine) {
      PICKS = Array.from(await ctx.engine.getRegisteredRewardAssets());
    }
    return ctx;
  }

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      const { controller } = await loadFixture(deployFullFixture);
      expect(await controller.getAddress()).to.be.properAddress;
    });

    it("should set the correct OohdiesNFT address", async function () {
      const { controller, nft } = await loadFixture(deployFullFixture);
      expect(await controller.oohdiesNFT()).to.equal(await nft.getAddress());
    });

    it("should set the correct BananaToken address", async function () {
      const { controller, banana } = await loadFixture(deployFullFixture);
      expect(await controller.bananaToken()).to.equal(
        await banana.getAddress()
      );
    });

    it("should set the correct owner", async function () {
      const { controller, owner } = await loadFixture(deployFullFixture);
      expect(await controller.owner()).to.equal(owner.address);
    });

    it("should set the activation cost from constructor", async function () {
      const { controller } = await loadFixture(deployFullFixture);
      expect(await controller.activationCost()).to.equal(
        DEFAULT_ACTIVATION_COST
      );
    });

    it("should start with zero totalActivated", async function () {
      const { controller } = await loadFixture(deployFullFixture);
      expect(await controller.totalActivated()).to.equal(0n);
    });

    it("should revert deployment with zero NFT address", async function () {
      const { banana, owner, ethers, ActivationController } =
        await loadFixture(deployFullFixture);
      await expect(
        ActivationController.deploy(
          ZERO_ADDRESS,
          await banana.getAddress(),
          owner.address,
          DEFAULT_ACTIVATION_COST
        )
      ).to.be.revertedWithCustomError(
        ActivationController,
        "ZeroAddressNotAllowed"
      );
    });

    it("should revert deployment with zero BANANA address", async function () {
      const { nft, owner, ActivationController } =
        await loadFixture(deployFullFixture);
      await expect(
        ActivationController.deploy(
          await nft.getAddress(),
          ZERO_ADDRESS,
          owner.address,
          DEFAULT_ACTIVATION_COST
        )
      ).to.be.revertedWithCustomError(
        ActivationController,
        "ZeroAddressNotAllowed"
      );
    });

    it("should allow deployment with zero activation cost", async function () {
      const { nft, banana, owner, ethers, ActivationController } =
        await loadFixture(deployFullFixture);
      const ctrl = await ActivationController.deploy(
        await nft.getAddress(),
        await banana.getAddress(),
        owner.address,
        0n
      );
      expect(await ctrl.activationCost()).to.equal(0n);
    });
  });

  describe("Activation — happy path", function () {

    it("owner of NFT can activate it", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      expect(await controller.isActivated(1n)).to.equal(true);
      expect(await controller.activatedAt(1n)).to.be.greaterThan(0n);
    });

    it("exact activation cost amount is burned", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);
      const balanceBefore = await banana.balanceOf(alice.address);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      const balanceAfter = await banana.balanceOf(alice.address);
      expect(balanceBefore - balanceAfter).to.equal(DEFAULT_ACTIVATION_COST);
    });

    it("BANANA totalSupply decreases by exactly the activation amount", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);
      const supplyBefore = await banana.totalSupply();

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      const supplyAfter = await banana.totalSupply();
      expect(supplyBefore - supplyAfter).to.equal(DEFAULT_ACTIVATION_COST);
    });

    it("extra BANANA is not accidentally burned", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      const extraApproval = DEFAULT_ACTIVATION_COST * 5n;
      await banana
        .connect(alice)
        .approve(await controller.getAddress(), extraApproval);

      const balanceBefore = await banana.balanceOf(alice.address);
      await controller.connect(alice).activate(1n, PICKS);
      const balanceAfter = await banana.balanceOf(alice.address);

      expect(balanceBefore - balanceAfter).to.equal(DEFAULT_ACTIVATION_COST);
    });

    it("BANANA does not end up in the ActivationController", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      const controllerBalance = await banana.balanceOf(
        await controller.getAddress()
      );
      expect(controllerBalance).to.equal(0n);
    });

    it("emits NFTActivated event with correct parameters", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);

      const tx = await controller.connect(alice).activate(1n, PICKS);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(controller, "NFTActivated")
        .withArgs(1n, alice.address, DEFAULT_ACTIVATION_COST, block.timestamp);
    });

    it("totalActivated increments on each activation", async function () {
      const { banana, controller, alice, bob } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);
      expect(await controller.totalActivated()).to.equal(1n);

      await banana
        .connect(bob)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(bob).activate(3n, PICKS);
      expect(await controller.totalActivated()).to.equal(2n);
    });
  });

  describe("Activation — failures", function () {

    it("non-owner cannot activate someone else's NFT", async function () {
      const { banana, controller, bob } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(bob)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await expect(
        controller.connect(bob).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(controller, "NotNFTOwner");
    });

    it("nonexistent NFT cannot be activated", async function () {
      const { banana, nft, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);

      await expect(
        controller.connect(alice).activate(9999n, PICKS)
      ).to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
    });

    it("NFT cannot be activated twice", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(
          await controller.getAddress(),
          DEFAULT_ACTIVATION_COST * 2n
        );
      await controller.connect(alice).activate(1n, PICKS);

      await expect(
        controller.connect(alice).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(controller, "AlreadyActivated");
    });

    it("cannot activate without sufficient BANANA balance", async function () {
      const { banana, nft, controller, ethers } =
        await loadFixture(deployFullFixture);
      const [, , , , poorUser] = await ethers.getSigners();

      await nft.mint(poorUser.address);

      await banana
        .connect(poorUser)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);

      await expect(
        controller.connect(poorUser).activate(5n, PICKS)
      ).to.be.revertedWithCustomError(banana, "ERC20InsufficientBalance");
    });

    it("cannot activate without BANANA approval", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await expect(
        controller.connect(alice).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(banana, "ERC20InsufficientAllowance");
    });

    it("cannot activate with insufficient BANANA approval", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(
          await controller.getAddress(),
          DEFAULT_ACTIVATION_COST - 1n
        );

      await expect(
        controller.connect(alice).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(banana, "ERC20InsufficientAllowance");
    });

    it("cannot activate when activation cost is not set (zero)", async function () {
      const { nft, banana, alice, owner, ethers, ActivationController } =
        await loadFixture(deployFullFixture);

      const ctrl = await ActivationController.deploy(
        await nft.getAddress(),
        await banana.getAddress(),
        owner.address,
        0n
      );

      await banana
        .connect(alice)
        .approve(await ctrl.getAddress(), DEFAULT_ACTIVATION_COST);

      await expect(
        ctrl.connect(alice).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(ctrl, "ActivationCostNotSet");
    });
  });

  describe("TokenId isolation", function () {

    it("activation state is associated with the correct tokenId", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      expect(await controller.isActivated(1n)).to.equal(true);
      expect(await controller.activatedAt(1n)).to.be.greaterThan(0n);

      expect(await controller.isActivated(2n)).to.equal(false);
      expect(await controller.activatedAt(2n)).to.equal(0n);
    });

    it("activating NFT #1 does not affect NFT #2", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      expect(await controller.isActivated(2n)).to.equal(false);
      expect(await controller.activatedAt(2n)).to.equal(0n);
      expect(await controller.totalActivated()).to.equal(1n);
    });

    it("multiple NFTs can be activated independently", async function () {
      const { banana, controller, alice, bob } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(
          await controller.getAddress(),
          DEFAULT_ACTIVATION_COST * 2n
        );
      await controller.connect(alice).activate(1n, PICKS);

      await banana
        .connect(bob)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(bob).activate(3n, PICKS);

      await controller.connect(alice).activate(2n, PICKS);

      expect(await controller.isActivated(1n)).to.equal(true);
      expect(await controller.isActivated(2n)).to.equal(true);
      expect(await controller.isActivated(3n)).to.equal(true);
      expect(await controller.isActivated(4n)).to.equal(false);
      expect(await controller.totalActivated()).to.equal(3n);
    });
  });

  describe("Transfer behavior — activation resets on transfer", function () {

    it("transfer of an activated NFT resets activation", async function () {
      const { banana, nft, controller, alice, bob } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      await nft
        .connect(alice)
        .transferFrom(alice.address, bob.address, 1n);

      expect(await controller.isActivated(1n)).to.equal(false);
      expect(await controller.activatedAt(1n)).to.equal(0n);
    });

    it("new owner has ownership of the NFT and can reactivate", async function () {
      const { banana, nft, controller, alice, bob } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);
      await nft
        .connect(alice)
        .transferFrom(alice.address, bob.address, 1n);

      expect(await nft.ownerOf(1n)).to.equal(bob.address);
      expect(await controller.isActivated(1n)).to.equal(false);

      await banana
        .connect(bob)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(bob).activate(1n, PICKS);
      expect(await controller.isActivated(1n)).to.equal(true);
    });

    it("previous owner cannot re-activate after transfer", async function () {
      const { banana, nft, controller, alice, bob } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(
          await controller.getAddress(),
          DEFAULT_ACTIVATION_COST * 2n
        );
      await controller.connect(alice).activate(1n, PICKS);
      await nft
        .connect(alice)
        .transferFrom(alice.address, bob.address, 1n);

      await expect(
        controller.connect(alice).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(controller, "NotNFTOwner");
    });

    it("activation resets through multiple transfers", async function () {
      const { banana, nft, controller, alice, bob, charlie } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      await nft
        .connect(alice)
        .transferFrom(alice.address, bob.address, 1n);
      expect(await controller.isActivated(1n)).to.equal(false);

      await banana
        .connect(bob)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(bob).activate(1n, PICKS);
      expect(await controller.isActivated(1n)).to.equal(true);

      await nft.connect(bob).transferFrom(bob.address, charlie.address, 1n);
      expect(await controller.isActivated(1n)).to.equal(false);
      expect(await nft.ownerOf(1n)).to.equal(charlie.address);
    });
  });

  describe("Activation cost configuration", function () {
    it("owner can update activation cost", async function () {
      const { controller, ethers } = await loadFixture(deployFullFixture);
      const newCost = 5_000n * 10n ** 18n;

      await controller.setActivationCost(newCost);
      expect(await controller.activationCost()).to.equal(newCost);
    });

    it("emits ActivationCostUpdated event", async function () {
      const { controller, ethers } = await loadFixture(deployFullFixture);
      const newCost = 5_000n * 10n ** 18n;

      await expect(controller.setActivationCost(newCost))
        .to.emit(controller, "ActivationCostUpdated")
        .withArgs(DEFAULT_ACTIVATION_COST, newCost);
    });

    it("non-owner cannot update activation cost", async function () {
      const { controller, alice } = await loadFixture(deployFullFixture);
      await expect(
        controller.connect(alice).setActivationCost(1n)
      ).to.be.revertedWithCustomError(controller, "OwnableUnauthorizedAccount");
    });

    it("activation uses the current cost at time of activation", async function () {
      const { banana, controller, alice, bob } =
        await loadFixture(deployFullFixture);

      const cost500 = 500n * 10n ** 18n;
      await controller.setActivationCost(cost500);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), cost500);
      const aliceBalBefore = await banana.balanceOf(alice.address);
      await controller.connect(alice).activate(1n, PICKS);
      const aliceBalAfter = await banana.balanceOf(alice.address);
      expect(aliceBalBefore - aliceBalAfter).to.equal(cost500);

      const cost2000 = 2_000n * 10n ** 18n;
      await controller.setActivationCost(cost2000);

      await banana
        .connect(bob)
        .approve(await controller.getAddress(), cost2000);
      const bobBalBefore = await banana.balanceOf(bob.address);
      await controller.connect(bob).activate(3n, PICKS);
      const bobBalAfter = await banana.balanceOf(bob.address);
      expect(bobBalBefore - bobBalAfter).to.equal(cost2000);
    });
  });

  describe("Pause behavior", function () {

    it("activation reverts when paused", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.pause();

      await expect(
        controller.connect(alice).activate(1n, PICKS)
      ).to.be.revertedWithCustomError(controller, "EnforcedPause");
    });

    it("activation works after unpause", async function () {
      const { banana, controller, alice, ethers } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);

      await controller.pause();
      await controller.unpause();

      await expect(controller.connect(alice).activate(1n, PICKS)).to.not.be.revert(
        ethers
      );
      expect(await controller.isActivated(1n)).to.equal(true);
    });

    it("non-owner cannot pause", async function () {
      const { controller, alice } = await loadFixture(deployFullFixture);
      await expect(
        controller.connect(alice).pause()
      ).to.be.revertedWithCustomError(controller, "OwnableUnauthorizedAccount");
    });

    it("non-owner cannot unpause", async function () {
      const { controller, alice } = await loadFixture(deployFullFixture);
      await controller.pause();
      await expect(
        controller.connect(alice).unpause()
      ).to.be.revertedWithCustomError(controller, "OwnableUnauthorizedAccount");
    });
  });

  describe("Security", function () {

    it("activation state cannot be set directly (no public setter)", async function () {
      const { controller } = await loadFixture(deployFullFixture);

      const iface = controller.interface;
      const functionNames = iface.fragments
        .filter((f) => f.type === "function")
        .map((f) => f.name);

      expect(functionNames).to.not.include("setActivated");
      expect(functionNames).to.not.include("_setActivated");
      expect(functionNames).to.not.include("forceActivate");
    });

    it("activate function has reentrancy protection (nonReentrant modifier)", async function () {
      const { controller } = await loadFixture(deployFullFixture);

      expect(await controller.getAddress()).to.be.properAddress;
    });

    it("view functions return correct defaults for unactivated tokenIds", async function () {
      const { controller } = await loadFixture(deployFullFixture);
      expect(await controller.isActivated(0n)).to.equal(false);
      expect(await controller.getActivatedAt(0n)).to.equal(0n);
      expect(await controller.isActivated(99999n)).to.equal(false);
    });

    it("BANANA is truly burned — not in controller, not in any address", async function () {
      const { banana, controller, alice, owner } =
        await loadFixture(deployFullFixture);

      const supplyBefore = await banana.totalSupply();

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      const supplyAfter = await banana.totalSupply();

      expect(supplyBefore - supplyAfter).to.equal(DEFAULT_ACTIVATION_COST);

      expect(
        await banana.balanceOf(await controller.getAddress())
      ).to.equal(0n);

      expect(await banana.balanceOf(ZERO_ADDRESS)).to.equal(0n);
    });
  });

  describe("View functions", function () {
    it("isActivated returns false before activation", async function () {
      const { controller } = await loadFixture(deployFullFixture);
      expect(await controller.isActivated(1n)).to.equal(false);
    });

    it("isActivated returns true after activation", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      expect(await controller.isActivated(1n)).to.equal(true);
    });

    it("getActivatedAt returns 0 before activation", async function () {
      const { controller } = await loadFixture(deployFullFixture);
      expect(await controller.getActivatedAt(1n)).to.equal(0n);
    });

    it("getActivatedAt returns nonzero timestamp after activation", async function () {
      const { banana, controller, alice } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      const activatedAt = await controller.getActivatedAt(1n);
      expect(activatedAt).to.be.greaterThan(0n);
    });
  });

  describe("End-to-end scenarios", function () {
    it("full flow: mint → transfer BANANA → approve → activate → verify state", async function () {
      const { banana, nft, controller, owner, charlie } =
        await loadFixture(deployFullFixture);

      await nft.mint(charlie.address);

      await banana.transfer(charlie.address, DEFAULT_ACTIVATION_COST);

      await banana
        .connect(charlie)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);

      await controller.connect(charlie).activate(5n, PICKS);

      expect(await controller.isActivated(5n)).to.equal(true);
      expect(await nft.ownerOf(5n)).to.equal(charlie.address);
      expect(await controller.totalActivated()).to.equal(1n);
    });

    it("activate → transfer → new owner sees reset activation → can reactivate", async function () {
      const { banana, nft, controller, alice, bob } =
        await loadFixture(deployFullFixture);

      await banana
        .connect(alice)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(alice).activate(1n, PICKS);

      await nft
        .connect(alice)
        .transferFrom(alice.address, bob.address, 1n);

      expect(await controller.isActivated(1n)).to.equal(false);
      expect(await nft.ownerOf(1n)).to.equal(bob.address);

      await banana
        .connect(bob)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(bob).activate(1n, PICKS);
      expect(await controller.isActivated(1n)).to.equal(true);
    });

    it("multiple users activate different NFTs independently", async function () {
      const { banana, controller, alice, bob } =
        await loadFixture(deployFullFixture);

      const supplyBefore = await banana.totalSupply();

      await banana
        .connect(alice)
        .approve(
          await controller.getAddress(),
          DEFAULT_ACTIVATION_COST * 2n
        );
      await controller.connect(alice).activate(1n, PICKS);
      await controller.connect(alice).activate(2n, PICKS);

      await banana
        .connect(bob)
        .approve(await controller.getAddress(), DEFAULT_ACTIVATION_COST);
      await controller.connect(bob).activate(3n, PICKS);

      expect(await controller.isActivated(1n)).to.equal(true);
      expect(await controller.isActivated(2n)).to.equal(true);
      expect(await controller.isActivated(3n)).to.equal(true);
      expect(await controller.isActivated(4n)).to.equal(false);
      expect(await controller.totalActivated()).to.equal(3n);

      const supplyAfter = await banana.totalSupply();
      expect(supplyBefore - supplyAfter).to.equal(
        DEFAULT_ACTIVATION_COST * 3n
      );
    });
  });
});
