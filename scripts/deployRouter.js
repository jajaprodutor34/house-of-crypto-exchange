// scripts/deployRouter.js
const hre = require("hardhat");

async function main() {
  // Coloque aqui o endereço do AMMFactory que você já deployou e verificou
  const FACTORY_ADDRESS = "0xE56eD3210d527584bAEBE8151BdD84C323819f27";

  // Pegamos o contract factory do AMMRouter
  const Router = await hre.ethers.getContractFactory("contracts/AMMRouter.sol:AMMRouter");

  // Deploy passando apenas o endereço da factory
  const router = await Router.deploy(FACTORY_ADDRESS);

  await router.deployed();

  console.log("AMMRouter deployed to:", router.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
