import { ethers } from "ethers";
import { connectWallet } from "./connectWallet";
import contractABI from "../abi/Exchange.json"; // você vai ajustar esse caminho

const contractAddress = "0xSEU_ENDERECO_DO_CONTRATO"; // substitui pelo endereço real

export async function getContract() {
  const { signer } = await connectWallet();
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  console.log("Contrato conectado com sucesso:", contract);
  return contract;
}
