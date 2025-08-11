'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, Search, Plus, ChevronLeft, ChevronRight, Code, Activity } from 'lucide-react';
import web3Service from '@/lib/web3';
import { formatHash, formatTimeAgo, formatNumber } from '@/lib/utils';

interface Contract {
  address: string;
  deploymentTxHash: string;
  deploymentBlock: number;
  deploymentTimestamp: number;
  creator: string;
  transactionCount: number;
  codeSize: number;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        
        // Get recent blocks and scan for contract deployments
        const latestBlockNumber = await web3Service.getLatestBlockNumber();
        const foundContracts: Contract[] = [];
        
        // Scan last 100 blocks for contract deployments
        const blocksToScan = Math.min(100, latestBlockNumber + 1);
        
        for (let i = 0; i < blocksToScan; i++) {
          const blockNumber = latestBlockNumber - i;
          if (blockNumber >= 0) {
            try {
              const block = await web3Service.getBlock(blockNumber, true);
              
              if (block && Array.isArray(block.transactions)) {
                for (const tx of block.transactions) {
                  if (typeof tx === 'object' && tx.to === null && tx.hash) {
                    // This is likely a contract deployment transaction
                    try {
                      const receipt = await web3Service.getTransactionReceipt(tx.hash);
                      if (receipt && receipt.contractAddress) {
                        const code = await web3Service.getCode(receipt.contractAddress);
                        if (code && code !== '0x') {
                          foundContracts.push({
                            address: receipt.contractAddress,
                            deploymentTxHash: tx.hash,
                            deploymentBlock: Number(block.number),
                            deploymentTimestamp: Number(block.timestamp),
                            creator: tx.from,
                            transactionCount: 0, // We'd need to scan all blocks to get this
                            codeSize: (code.length - 2) / 2, // Remove 0x and divide by 2 for bytes
                          });
                        }
                      }
                    } catch (err) {
                      console.warn('Error processing transaction:', err);
                    }
                  }
                }
              }
            } catch (err) {
              console.warn('Error fetching block:', blockNumber, err);
            }
          }
          
          if (foundContracts.length >= 20) break; // Limit to 20 contracts for performance
        }
        
        // Remove duplicates and sort by deployment time
        const uniqueContracts = foundContracts.filter((contract, index, self) => 
          index === self.findIndex(c => c.address === contract.address)
        );
        
        uniqueContracts.sort((a, b) => b.deploymentTimestamp - a.deploymentTimestamp);
        
        setContracts(uniqueContracts);
        setError(null);
      } catch (err) {
        setError('Failed to fetch contracts');
        console.error('Error fetching contracts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const filteredContracts = contracts.filter(contract =>
    contract.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.creator.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Smart Contracts</h1>
          <p className="text-gray-600 mt-2">Explore deployed smart contracts on the Iperchain network</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-32"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Smart Contracts</h1>
          <p className="text-gray-600 mt-2">Explore deployed smart contracts on the Iperchain network</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Smart Contracts</h1>
        <p className="text-gray-600 mt-2">
          Explore deployed smart contracts on the Iperchain network
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by contract address or creator address..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Contracts
            </CardTitle>
            <FileCode className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(contracts.length)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Code Size
            </CardTitle>
            <Code className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(contracts.reduce((sum, c) => sum + c.codeSize, 0))} bytes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Recent Deployments
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {contracts.filter(c => Date.now() - c.deploymentTimestamp * 1000 < 24 * 60 * 60 * 1000).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileCode className="h-5 w-5" />
            <span>Deployed Contracts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="text-center py-8">
              <FileCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {contracts.length === 0 
                  ? 'No contracts found. Deploy a contract to see it here.'
                  : 'No contracts match your search criteria.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Contract Address</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Creator</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Deployed</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Code Size</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => (
                    <tr key={contract.address} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <Link
                          href={`/address/${contract.address}`}
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                        >
                          {formatHash(contract.address)}
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <Link
                          href={`/address/${contract.creator}`}
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                        >
                          {formatHash(contract.creator)}
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {formatTimeAgo(contract.deploymentTimestamp)}
                          </p>
                          <Link
                            href={`/block/${contract.deploymentBlock}`}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Block #{formatNumber(contract.deploymentBlock)}
                          </Link>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">
                          {formatNumber(contract.codeSize)} bytes
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/address/${contract.address}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}