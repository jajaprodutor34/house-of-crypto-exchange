import { useState, useEffect } from "react";
import { ethers } from "ethers";

// 👉 endereço do contrato AMMFactory já implantado
const FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000";

// 👉 ABI simplificada do contrato AMMFactory (adapte se precisar)
const FACTORY_ABI = [
  "function allPairsLength() view returns (uint256)",
  "function allPairs(uint256) view returns (address)",
  "function visible(address) view returns (bool)",
  "event PairCreated(address indexed token0, address indexed token1, address pair, string message)",
  "event VisibilityUpdated(address indexed pair, bool visible, uint256 stableAmount, string message)",
];

export default function App() {
  const [account, setAccount] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [mode, setMode] = useState("simple"); // "simple" ou "pro"

  // 👉 conectar carteira
  async function connectWallet() {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } else {
      alert("MetaMask não encontrada. Instale para continuar!");
    }
  }

  // 👉 carregar pares do contrato
  async function loadPairs() {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    const length = await contract.allPairsLength();
    const loadedPairs = [];

    for (let i = 0; i < length; i++) {
      const addr = await contract.allPairs(i);
      const isVisible = await contract.visible(addr);
      loadedPairs.push({
        id: i,
        address: addr,
        visible: isVisible,
      });
    }

    setPairs(loadedPairs);
  }

  // 👉 ouvir eventos
  async function listenEvents() {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    contract.on("PairCreated", (token0, token1, pair, message) => {
      alert(`⚡ Novo par criado: ${message}`);
      loadPairs();
    });

    contract.on("VisibilityUpdated", (pair, visible, stableAmount, message) => {
      alert(`📢 Atualização: ${message}`);
      loadPairs();
    });
  }

  useEffect(() => {
    connectWallet();
    loadPairs();
    listenEvents();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="p-4 bg-blue-600 text-white flex justify-between items-center">
        <h1 className="text-xl font-bold">House of Crypto Exchange</h1>
        <button
          className="px-4 py-2 bg-white text-blue-600 rounded-lg"
          onClick={connectWallet}
        >
          {account ? `Carteira: ${account.slice(0, 6)}...` : "Conectar Carteira"}
        </button>
      </header>

      <main className="p-6">
        {/* 🔹 Botões de navegação */}
        <div className="mb-4 flex gap-2">
          <button
            className={`px-4 py-2 rounded-lg ${
              mode === "simple" ? "bg-blue-600 text-white" : "bg-gray-300"
            }`}
            onClick={() => setMode("simple")}
          >
            Página 1 - Iniciante
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              mode === "pro" ? "bg-blue-600 text-white" : "bg-gray-300"
            }`}
            onClick={() => setMode("pro")}
          >
            Página 2 - Profissional
          </button>
        </div>

        {/* 🔹 Página 1 (iniciante) */}
        {mode === "simple" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Pares Visíveis (mínimo $200)
            </h2>
            <ul className="space-y-2">
              {pairs.filter((p) => p.visible).map((p) => (
                <li
                  key={p.id}
                  className="p-4 bg-white rounded-lg shadow flex justify-between"
                >
                  <span>Pair: {p.address}</span>
                  <button className="px-3 py-1 bg-green-500 text-white rounded-lg">
                    Trade
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 🔹 Página 2 (profissional) */}
        {mode === "pro" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Todos os Pares da Exchange
            </h2>
            <ul className="space-y-2">
              {pairs.map((p) => (
                <li
                  key={p.id}
                  className={`p-4 rounded-lg shadow flex justify-between ${
                    p.visible ? "bg-white" : "bg-yellow-100"
                  }`}
                >
                  <span>
                    Pair: {p.address}{" "}
                    {!p.visible && "(Oculto - precisa atingir $200)"}
                  </span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-green-500 text-white rounded-lg">
                      Buy
                    </button>
                    <button className="px-3 py-1 bg-red-500 text-white rounded-lg">
                      Sell
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
