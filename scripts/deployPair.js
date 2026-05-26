const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying AMMPair with account:", deployer.address);

    // Usando fully qualified name para evitar conflito de nomes
    const Pair = await hre.ethers.getContractFactory("contracts/AMMPair.sol:AMMPair");
    const pair = await Pair.deploy(); // sem argumentos no constructor
    await pair.deployed();

    console.log("AMMPair deployed to:", pair.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
