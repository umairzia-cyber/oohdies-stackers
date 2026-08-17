import { expect } from "chai";
import hre from "hardhat";

describe("BananaToken", function () {

  async function deployBananaFixture(connection) {
    const { ethers } = connection;
    const [owner, alice, bob, charlie] = await ethers.getSigners();
    const BananaToken = await ethers.getContractFactory("BananaToken");
    const banana = await BananaToken.deploy(owner.address);
    return { banana, owner, alice, bob, charlie, ethers };
  }

  const INITIAL_SUPPLY = 1_000_000_000n * 10n ** 18n;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  async function loadFixture(fixture) {
    const { networkHelpers } = await hre.network.create();
    return networkHelpers.loadFixture(fixture);
  }

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      expect(await banana.getAddress()).to.be.properAddress;
    });

    it("should set the correct name", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      expect(await banana.name()).to.equal("BANANA");
    });

    it("should set the correct symbol", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      expect(await banana.symbol()).to.equal("BANANA");
    });

    it("should use 18 decimals", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      expect(await banana.decimals()).to.equal(18n);
    });

    it("should set the INITIAL_SUPPLY constant to exactly 1 billion tokens", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      expect(await banana.INITIAL_SUPPLY()).to.equal(INITIAL_SUPPLY);
    });

    it("should mint the entire supply to the initial owner", async function () {
      const { banana, owner } = await loadFixture(deployBananaFixture);
      expect(await banana.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("should set totalSupply to exactly 1 billion tokens", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      expect(await banana.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("should set the deployer as owner", async function () {
      const { banana, owner } = await loadFixture(deployBananaFixture);
      expect(await banana.owner()).to.equal(owner.address);
    });

    it("should revert deployment with zero address as owner", async function () {
      const { ethers } = await loadFixture(deployBananaFixture);
      const BananaToken = await ethers.getContractFactory("BananaToken");
      await expect(
        BananaToken.deploy(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(BananaToken, "OwnableInvalidOwner");
    });
  });

  describe("Transfers", function () {
    it("should transfer tokens between accounts", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);
      const amount = ethers.parseEther("1000");

      await banana.transfer(alice.address, amount);
      expect(await banana.balanceOf(alice.address)).to.equal(amount);
      expect(await banana.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amount);
    });

    it("should emit Transfer event on transfer", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);
      const amount = ethers.parseEther("500");

      await expect(banana.transfer(alice.address, amount))
        .to.emit(banana, "Transfer")
        .withArgs(owner.address, alice.address, amount);
    });

    it("should not change totalSupply after a transfer", async function () {
      const { banana, alice, ethers } = await loadFixture(deployBananaFixture);
      await banana.transfer(alice.address, ethers.parseEther("1000"));
      expect(await banana.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("should revert transfer to zero address", async function () {
      const { banana, ethers } = await loadFixture(deployBananaFixture);
      await expect(
        banana.transfer(ZERO_ADDRESS, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(banana, "ERC20InvalidReceiver");
    });

    it("should revert when sender has insufficient balance", async function () {
      const { banana, alice, bob, ethers } = await loadFixture(deployBananaFixture);

      await expect(
        banana.connect(alice).transfer(bob.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(banana, "ERC20InsufficientBalance");
    });

    it("should allow transferring zero tokens", async function () {
      const { banana, alice, ethers } = await loadFixture(deployBananaFixture);
      const tx = banana.transfer(alice.address, 0n);
      await expect(tx).to.not.be.revert(ethers);
    });
  });

  describe("Approvals & transferFrom", function () {
    it("should set allowance via approve", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);
      const amount = ethers.parseEther("5000");

      await banana.approve(alice.address, amount);
      expect(await banana.allowance(owner.address, alice.address)).to.equal(amount);
    });

    it("should emit Approval event", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);
      const amount = ethers.parseEther("5000");

      await expect(banana.approve(alice.address, amount))
        .to.emit(banana, "Approval")
        .withArgs(owner.address, alice.address, amount);
    });

    it("should allow transferFrom with sufficient allowance", async function () {
      const { banana, owner, alice, bob, ethers } = await loadFixture(deployBananaFixture);
      const amount = ethers.parseEther("2000");

      await banana.approve(alice.address, amount);
      await banana.connect(alice).transferFrom(owner.address, bob.address, amount);

      expect(await banana.balanceOf(bob.address)).to.equal(amount);
    });

    it("should decrease allowance after transferFrom", async function () {
      const { banana, owner, alice, bob, ethers } = await loadFixture(deployBananaFixture);
      const approveAmount = ethers.parseEther("5000");
      const transferAmount = ethers.parseEther("2000");

      await banana.approve(alice.address, approveAmount);
      await banana.connect(alice).transferFrom(owner.address, bob.address, transferAmount);

      expect(await banana.allowance(owner.address, alice.address)).to.equal(
        approveAmount - transferAmount
      );
    });

    it("should revert transferFrom with insufficient allowance", async function () {
      const { banana, owner, alice, bob, ethers } = await loadFixture(deployBananaFixture);
      await banana.approve(alice.address, ethers.parseEther("100"));

      await expect(
        banana.connect(alice).transferFrom(owner.address, bob.address, ethers.parseEther("101"))
      ).to.be.revertedWithCustomError(banana, "ERC20InsufficientAllowance");
    });

    it("should revert transferFrom to zero address", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);
      await banana.approve(alice.address, ethers.parseEther("100"));

      await expect(
        banana.connect(alice).transferFrom(owner.address, ZERO_ADDRESS, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(banana, "ERC20InvalidReceiver");
    });
  });

  describe("Burning", function () {
    it("should allow a holder to burn their own tokens", async function () {
      const { banana, owner, ethers } = await loadFixture(deployBananaFixture);
      const burnAmount = ethers.parseEther("1000");

      await banana.burn(burnAmount);
      expect(await banana.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it("should decrease totalSupply after burning", async function () {
      const { banana, ethers } = await loadFixture(deployBananaFixture);
      const burnAmount = ethers.parseEther("500000");

      await banana.burn(burnAmount);
      expect(await banana.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it("should emit Transfer event to zero address on burn", async function () {
      const { banana, owner, ethers } = await loadFixture(deployBananaFixture);
      const burnAmount = ethers.parseEther("100");

      await expect(banana.burn(burnAmount))
        .to.emit(banana, "Transfer")
        .withArgs(owner.address, ZERO_ADDRESS, burnAmount);
    });

    it("should allow burnFrom with approval", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);
      const burnAmount = ethers.parseEther("2000");

      await banana.approve(alice.address, burnAmount);
      await banana.connect(alice).burnFrom(owner.address, burnAmount);

      expect(await banana.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - burnAmount);
      expect(await banana.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it("should decrease allowance after burnFrom", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);
      const approveAmount = ethers.parseEther("5000");
      const burnAmount = ethers.parseEther("2000");

      await banana.approve(alice.address, approveAmount);
      await banana.connect(alice).burnFrom(owner.address, burnAmount);

      expect(await banana.allowance(owner.address, alice.address)).to.equal(
        approveAmount - burnAmount
      );
    });

    it("should revert burn when amount exceeds balance", async function () {
      const { banana, alice, ethers } = await loadFixture(deployBananaFixture);

      await expect(
        banana.connect(alice).burn(ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(banana, "ERC20InsufficientBalance");
    });

    it("should revert burnFrom without sufficient allowance", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);

      await expect(
        banana.connect(alice).burnFrom(owner.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(banana, "ERC20InsufficientAllowance");
    });

    it("should allow burning the entire balance", async function () {
      const { banana, owner } = await loadFixture(deployBananaFixture);
      await banana.burn(INITIAL_SUPPLY);

      expect(await banana.balanceOf(owner.address)).to.equal(0n);
      expect(await banana.totalSupply()).to.equal(0n);
    });

    it("should allow burning zero tokens", async function () {
      const { banana, ethers } = await loadFixture(deployBananaFixture);
      await expect(banana.burn(0n)).to.not.be.revert(ethers);
      expect(await banana.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("burning is irreversible — burned tokens cannot be recovered", async function () {
      const { banana, owner, ethers } = await loadFixture(deployBananaFixture);
      const burnAmount = ethers.parseEther("50000");

      await banana.burn(burnAmount);
      const supplyAfterBurn = await banana.totalSupply();

      await banana.transfer(owner.address, 0n);
      expect(await banana.totalSupply()).to.equal(supplyAfterBurn);
    });

    it("should allow multiple sequential burns", async function () {
      const { banana, owner, ethers } = await loadFixture(deployBananaFixture);
      const burn1 = ethers.parseEther("1000");
      const burn2 = ethers.parseEther("2000");
      const burn3 = ethers.parseEther("3000");

      await banana.burn(burn1);
      await banana.burn(burn2);
      await banana.burn(burn3);

      const totalBurned = burn1 + burn2 + burn3;
      expect(await banana.totalSupply()).to.equal(INITIAL_SUPPLY - totalBurned);
      expect(await banana.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - totalBurned);
    });
  });

  describe("No unauthorized minting / No supply increase", function () {
    it("contract should not expose a public mint function", async function () {
      const { banana } = await loadFixture(deployBananaFixture);

      expect(banana.mint).to.be.undefined;
    });

    it("contract should not expose a public _mint function", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      expect(banana._mint).to.be.undefined;
    });

    it("total supply should never increase after deployment", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);

      await banana.transfer(alice.address, ethers.parseEther("10000"));
      expect(await banana.totalSupply()).to.equal(INITIAL_SUPPLY);

      await banana.connect(alice).transfer(owner.address, ethers.parseEther("5000"));
      expect(await banana.totalSupply()).to.equal(INITIAL_SUPPLY);

      await banana.burn(ethers.parseEther("100"));
      expect(await banana.totalSupply()).to.be.lessThan(INITIAL_SUPPLY);

      await banana.transfer(alice.address, ethers.parseEther("1000"));
      expect(await banana.totalSupply()).to.be.lessThan(INITIAL_SUPPLY);
    });

    it("owner cannot mint additional tokens", async function () {
      const { banana } = await loadFixture(deployBananaFixture);

      const contractInterface = banana.interface;
      const functionNames = contractInterface.fragments
        .filter((f) => f.type === "function")
        .map((f) => f.name);

      expect(functionNames).to.not.include("mint");
      expect(functionNames).to.not.include("_mint");
      expect(functionNames).to.not.include("adminMint");
      expect(functionNames).to.not.include("ownerMint");
    });

    it("non-owner cannot mint tokens", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      const contractInterface = banana.interface;
      const functionNames = contractInterface.fragments
        .filter((f) => f.type === "function")
        .map((f) => f.name);

      expect(functionNames).to.not.include("mint");
    });
  });

  describe("Pause / Unpause", function () {
    it("owner can pause the contract", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      await banana.pause();
      expect(await banana.paused()).to.equal(true);
    });

    it("owner can unpause the contract", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      await banana.pause();
      await banana.unpause();
      expect(await banana.paused()).to.equal(false);
    });

    it("non-owner cannot pause", async function () {
      const { banana, alice } = await loadFixture(deployBananaFixture);
      await expect(
        banana.connect(alice).pause()
      ).to.be.revertedWithCustomError(banana, "OwnableUnauthorizedAccount");
    });

    it("non-owner cannot unpause", async function () {
      const { banana, alice } = await loadFixture(deployBananaFixture);
      await banana.pause();
      await expect(
        banana.connect(alice).unpause()
      ).to.be.revertedWithCustomError(banana, "OwnableUnauthorizedAccount");
    });

    it("transfers should revert when paused", async function () {
      const { banana, alice, ethers } = await loadFixture(deployBananaFixture);
      await banana.pause();

      await expect(
        banana.transfer(alice.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(banana, "EnforcedPause");
    });

    it("burning should revert when paused", async function () {
      const { banana, ethers } = await loadFixture(deployBananaFixture);
      await banana.pause();

      await expect(
        banana.burn(ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(banana, "EnforcedPause");
    });

    it("approve should still work when paused", async function () {
      const { banana, alice, ethers } = await loadFixture(deployBananaFixture);
      await banana.pause();

      await expect(banana.approve(alice.address, ethers.parseEther("100"))).to.not.be.revert(ethers);
    });

    it("transfers should resume after unpause", async function () {
      const { banana, alice, ethers } = await loadFixture(deployBananaFixture);
      await banana.pause();
      await banana.unpause();

      await expect(banana.transfer(alice.address, ethers.parseEther("100"))).to.not.be.revert(ethers);
    });
  });

  describe("Ownership", function () {
    it("should allow owner to transfer ownership", async function () {
      const { banana, alice } = await loadFixture(deployBananaFixture);
      await banana.transferOwnership(alice.address);
      expect(await banana.owner()).to.equal(alice.address);
    });

    it("should allow owner to renounce ownership", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      await banana.renounceOwnership();
      expect(await banana.owner()).to.equal(ZERO_ADDRESS);
    });

    it("non-owner cannot transfer ownership", async function () {
      const { banana, alice, bob } = await loadFixture(deployBananaFixture);
      await expect(
        banana.connect(alice).transferOwnership(bob.address)
      ).to.be.revertedWithCustomError(banana, "OwnableUnauthorizedAccount");
    });
  });

  describe("Zero-address edge cases", function () {
    it("should revert transfer to zero address", async function () {
      const { banana, ethers } = await loadFixture(deployBananaFixture);
      await expect(
        banana.transfer(ZERO_ADDRESS, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(banana, "ERC20InvalidReceiver");
    });

    it("should revert transferFrom to zero address", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);
      await banana.approve(alice.address, ethers.parseEther("1000"));
      await expect(
        banana.connect(alice).transferFrom(owner.address, ZERO_ADDRESS, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(banana, "ERC20InvalidReceiver");
    });

    it("should revert approve to zero address as spender", async function () {
      const { banana, ethers } = await loadFixture(deployBananaFixture);
      await expect(
        banana.approve(ZERO_ADDRESS, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(banana, "ERC20InvalidSpender");
    });

    it("balance of zero address should be zero", async function () {
      const { banana } = await loadFixture(deployBananaFixture);
      expect(await banana.balanceOf(ZERO_ADDRESS)).to.equal(0n);
    });
  });

  describe("Supply integrity", function () {
    it("sum of all balances should equal totalSupply after transfers", async function () {
      const { banana, owner, alice, bob, ethers } = await loadFixture(deployBananaFixture);

      await banana.transfer(alice.address, ethers.parseEther("100000"));
      await banana.transfer(bob.address, ethers.parseEther("200000"));

      const ownerBal = await banana.balanceOf(owner.address);
      const aliceBal = await banana.balanceOf(alice.address);
      const bobBal = await banana.balanceOf(bob.address);

      expect(ownerBal + aliceBal + bobBal).to.equal(await banana.totalSupply());
    });

    it("sum of all balances should equal totalSupply after burns", async function () {
      const { banana, owner, alice, bob, ethers } = await loadFixture(deployBananaFixture);

      await banana.transfer(alice.address, ethers.parseEther("100000"));
      await banana.transfer(bob.address, ethers.parseEther("200000"));
      await banana.connect(alice).burn(ethers.parseEther("50000"));
      await banana.burn(ethers.parseEther("10000"));

      const ownerBal = await banana.balanceOf(owner.address);
      const aliceBal = await banana.balanceOf(alice.address);
      const bobBal = await banana.balanceOf(bob.address);

      expect(ownerBal + aliceBal + bobBal).to.equal(await banana.totalSupply());
    });

    it("totalSupply should monotonically decrease or stay the same — never increase", async function () {
      const { banana, owner, alice, ethers } = await loadFixture(deployBananaFixture);

      let prevSupply = await banana.totalSupply();

      await banana.transfer(alice.address, ethers.parseEther("5000"));
      let currentSupply = await banana.totalSupply();
      expect(currentSupply).to.be.lte(prevSupply);
      prevSupply = currentSupply;

      await banana.burn(ethers.parseEther("1000"));
      currentSupply = await banana.totalSupply();
      expect(currentSupply).to.be.lt(prevSupply);
      prevSupply = currentSupply;

      await banana.connect(alice).transfer(owner.address, ethers.parseEther("1000"));
      currentSupply = await banana.totalSupply();
      expect(currentSupply).to.be.lte(prevSupply);
    });
  });
});
