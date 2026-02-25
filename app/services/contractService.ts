import { ethers } from "ethers";
import abi from "../../contracts/abi/abi.json";

const CONTRACT_ADDRESS = "0x84040C664ca961e184d0bD8b03E8e4DFbb02360c";

export const getContract = (
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
) => {
  return new ethers.Contract(CONTRACT_ADDRESS, abi, providerOrSigner);
};

export const getLeaderboard = async (provider: ethers.providers.Provider) => {
  try {
    const contract = getContract(provider);
    const top10 = await contract.getTop10();

    const players: string[] = top10[0];
    const scores: ethers.BigNumber[] = top10[1];

    const leaderboard = players
      .map((player, index) => ({
        player,
        score: scores[index].toNumber(),
      }))
      .filter((entry) => entry.score > 0);

    return leaderboard;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};

export const submitScoreToContract = async (
  signer: ethers.Signer,
  score: number,
) => {
  try {
    const contract = getContract(signer);

    // The contract requires a signature from the owner. Since the user requested
    // a pure frontend implementation without a backend private key, we will attempt
    // to pass a dummy signature or let the user sign it themselves if they are the owner.

    // Attempting to sign the payload with the connected wallet (in case the connected wallet IS the owner)
    // payload to sign: msg.sender + score + address(this)
    const playerAddress = await signer.getAddress();

    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "address"],
      [playerAddress, score, CONTRACT_ADDRESS],
    );

    const messageHashBytes = ethers.utils.arrayify(messageHash);
    const signature = await signer.signMessage(messageHashBytes);

    // Call submitScore
    const tx = await contract.submitScore(score, signature);
    await tx.wait();

    return { success: true, tx };
  } catch (error) {
    console.error("Error submitting score:", error);
    return { success: false, error };
  }
};
