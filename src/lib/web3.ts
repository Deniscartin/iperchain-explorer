import Web3 from 'web3';

// Configuration for local Besu network
const NETWORK_CONFIG = {
  name: 'Iperchain Network',
  chainId: 19671204,
  rpcUrl: 'https://testnet.iperchain.com:8545',
  blockTime: 5000, // 5 seconds
};

class Web3Service {
  private web3: Web3;

  constructor() {
    this.web3 = new Web3(NETWORK_CONFIG.rpcUrl);
  }

  // Get Web3 instance
  getWeb3() {
    return this.web3;
  }

  // Get network info
  getNetworkConfig() {
    return NETWORK_CONFIG;
  }

  // Get latest block number
  async getLatestBlockNumber(): Promise<number> {
    try {
      const blockNumber = await this.web3.eth.getBlockNumber();
      return Number(blockNumber);
    } catch (error) {
      console.error('Error getting latest block number:', error);
      throw error;
    }
  }

  // Get block by number
  async getBlock(blockNumber: number | 'latest', includeTransactions = true) {
    try {
      const block = await this.web3.eth.getBlock(blockNumber, includeTransactions);
      return block;
    } catch (error) {
      console.error('Error getting block:', error);
      throw error;
    }
  }

  // Get transaction by hash
  async getTransaction(txHash: string) {
    try {
      const tx = await this.web3.eth.getTransaction(txHash);
      return tx;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  // Get transaction receipt
  async getTransactionReceipt(txHash: string) {
    try {
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      throw error;
    }
  }

  // Get account balance
  async getBalance(address: string) {
    try {
      const balance = await this.web3.eth.getBalance(address);
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Get contract code
  async getCode(address: string) {
    try {
      const code = await this.web3.eth.getCode(address);
      return code;
    } catch (error) {
      console.error('Error getting contract code:', error);
      throw error;
    }
  }

  // Check if address is a contract
  async isContract(address: string): Promise<boolean> {
    try {
      const code = await this.getCode(address);
      return code !== '0x';
    } catch (error) {
      console.error('Error checking if address is contract:', error);
      return false;
    }
  }

  // Get network stats
  async getNetworkStats() {
    try {
      const [latestBlock, gasPrice, peerCount] = await Promise.all([
        this.getBlock('latest', false),
        this.web3.eth.getGasPrice(),
        this.web3.eth.net.getPeerCount(),
      ]);

      return {
        latestBlockNumber: Number(latestBlock.number),
        gasPrice: this.web3.utils.fromWei(gasPrice, 'gwei'),
        peerCount: Number(peerCount),
        difficulty: latestBlock.difficulty ? Number(latestBlock.difficulty) : 0,
        totalDifficulty: latestBlock.totalDifficulty ? Number(latestBlock.totalDifficulty) : 0,
      };
    } catch (error) {
      console.error('Error getting network stats:', error);
      throw error;
    }
  }

  // Subscribe to new blocks using polling (since WebSocket is disabled)
  subscribeToNewBlocks(callback: (block: any) => void) {
    let lastBlockNumber = 0;
    
    const pollForNewBlocks = async () => {
      try {
        const currentBlockNumber = await this.getLatestBlockNumber();
        if (currentBlockNumber > lastBlockNumber) {
          const block = await this.getBlock(currentBlockNumber, false);
          lastBlockNumber = currentBlockNumber;
          callback(block);
        }
      } catch (error) {
        console.error('Error polling for new blocks:', error);
      }
    };

    // Poll every 5 seconds (matching blockTime)
    const intervalId = setInterval(pollForNewBlocks, NETWORK_CONFIG.blockTime);
    
    // Return an object with unsubscribe method for compatibility
    return {
      unsubscribe: () => clearInterval(intervalId)
    };
  }

  // Format address (truncate middle)
  formatAddress(address: string, start = 6, end = 4): string {
    if (!address) return '';
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  }

  // Format wei to ether
  formatEther(wei: string | number): string {
    try {
      return this.web3.utils.fromWei(wei.toString(), 'ether');
    } catch (error) {
      return '0';
    }
  }

  // Format timestamp to readable date
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  // Validate address
  isValidAddress(address: string): boolean {
    return this.web3.utils.isAddress(address);
  }

  // Validate transaction hash
  isValidTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }
}

// Export singleton instance
export const web3Service = new Web3Service();
export default web3Service;