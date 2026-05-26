const { ethers } = require("hardhat");

async function main() {
    const [deployer, user1] = await ethers.getSigners(); // duas contas diferentes

    const factoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // endereço do deploy da Factory
    const FactoryABI = require("../artifacts/contracts/AMMFactory.sol/AMMFactory.json");

    const factory = new ethers.Contract(factoryAddress, FactoryABI.abi, deployer);

    // Criar par de teste com dois endereços diferentes
    const tx = await factory.createPair(deployer.address, user1.address);
    await tx.wait();

    console.log("✅ Par de teste criado com sucesso!");
    console.log("Token A:", deployer.address);
    console.log("Token B:", user1.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

