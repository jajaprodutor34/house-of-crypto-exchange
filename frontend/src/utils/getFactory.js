import { ethers } from "ethers";
import { connectWallet } from "./connectWallet";
import factoryABI from "../abi/AMMFactory.json";

const factoryAddress = "0xSEU_ENDERECO_DA_FACTORY";

export async function getFactory() {
  const { signer } = await connectWallet();
  const factory = new ethers.Contract(factoryAddress, factoryABI, signer);
  console.log("🏭 Factory conectado:", factory);
  return factory;
}
