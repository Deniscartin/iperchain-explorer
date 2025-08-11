'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wallet, FileCode, Copy, Activity, Zap, Clock } from 'lucide-react';
import web3Service from '@/lib/web3';
import { formatHash, formatTimeAgo, formatNumber, copyToClipboard, safeBigIntToString, safeStringOrNull } from '@/lib/utils';

interface AddressDetails {
  address: string;
  balance: string;
  isContract: boolean;
  code?: string;
  transactionCount: number;
}

interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string | null;
  value: string;
  gasUsed: number;
  gasPrice: string;
  status: number;
}

export default function AddressDetailPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.id as string;
  
  const [addressDetails, setAddressDetails] = useState<AddressDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'code'>('transactions');

  useEffect(() => {
    const fetchAddressDetails = async () => {
      try {
        setLoading(true);
        
        if (!web3Service.isValidAddress(address)) {
          setError('Invalid address format');
          return;
        }

        // Fetch address details
        const [balance, isContract, code] = await Promise.all([
          web3Service.getBalance(address),
          web3Service.isContract(address),
          web3Service.getCode(address)
        ]);

        const details: AddressDetails = {
          address,
          balance,
          isContract,
          code: isContract ? code : undefined,
          transactionCount: 0, // We'll calculate this by scanning transactions
        };

        setAddressDetails(details);

        // Fetch recent transactions involving this address
        await fetchTransactions(address);
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch address details');
        console.error('Error fetching address:', err);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchAddressDetails();
    }
  }, [address]);

  const fetchTransactions = async (addr: string) => {
    try {
      const latestBlockNumber = await web3Service.getLatestBlockNumber();
      const foundTransactions: Transaction[] = [];
      
      // Scan recent blocks for transactions involving this address
      const blocksToScan = Math.min(50, latestBlockNumber + 1);
      
      for (let i = 0; i < blocksToScan; i++) {
        const blockNumber = latestBlockNumber - i;
        if (blockNumber >= 0) {
          try {
            const block = await web3Service.getBlock(blockNumber, true);
            
            if (block && Array.isArray(block.transactions)) {
              for (const tx of block.transactions) {
                if (typeof tx === 'object' && tx.hash) {
                  // Check if transaction involves our address
                  if (tx.from.toLowerCase() === addr.toLowerCase() || 
                      (tx.to && tx.to.toLowerCase() === addr.toLowerCase())) {
                    try {
                      const receipt = await web3Service.getTransactionReceipt(tx.hash);
                      foundTransactions.push({
                        hash: tx.hash,
                        blockNumber: Number(block.number),
                        timestamp: Number(block.timestamp),
                        from: tx.from,
                        to: safeStringOrNull(tx.to),
                        value: safeBigIntToString(tx.value),
                        gasUsed: receipt ? Number(receipt.gasUsed) : 0,
                        gasPrice: safeBigIntToString(tx.gasPrice),
                        status: receipt ? Number(receipt.status) : 1,
                      });
                    } catch (err) {
                      console.warn('Error processing transaction:', err);
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Error fetching block:', blockNumber, err);
          }
        }
        
        if (foundTransactions.length >= 20) break; // Limit to 20 transactions for performance
      }
      
      // Sort by timestamp (newest first)
      foundTransactions.sort((a, b) => b.timestamp - a.timestamp);
      
      setTransactions(foundTransactions);
      
      // Update transaction count
      if (addressDetails) {
        setAddressDetails(prev => prev ? { ...prev, transactionCount: foundTransactions.length } : null);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(address);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !addressDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error || 'Address not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="space-y-6">
        {/* Address Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {addressDetails.isContract ? (
                <FileCode className="h-5 w-5" />
              ) : (
                <Wallet className="h-5 w-5" />
              )}
              <span>{addressDetails.isContract ? 'Contract' : 'Address'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Address</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-mono text-sm break-all">{address}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {copySuccess && (
                  <span className="text-xs text-green-600">Copied!</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Balance</span>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    {parseFloat(addressDetails.balance).toFixed(6)} ETH
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-500">Transactions</span>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    {formatNumber(transactions.length)}+
                  </div>
                  <p className="text-xs text-gray-500">Recent only</p>
                </div>

                {addressDetails.isContract && addressDetails.code && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Code Size</span>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {formatNumber((addressDetails.code.length - 2) / 2)} bytes
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="h-4 w-4 inline mr-2" />
              Transactions ({formatNumber(transactions.length)})
            </button>
            {addressDetails.isContract && (
              <button
                onClick={() => setActiveTab('code')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'code'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileCode className="h-4 w-4 inline mr-2" />
                Contract Code
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'transactions' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent transactions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.hash}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <Link
                              href={`/tx/${tx.hash}`}
                              className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                            >
                              {formatHash(tx.hash)}
                            </Link>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTimeAgo(tx.timestamp)}
                              <span className="mx-2">•</span>
                              <Link
                                href={`/block/${tx.blockNumber}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Block #{formatNumber(tx.blockNumber)}
                              </Link>
                            </div>
                          </div>
                          
                          <div className="hidden sm:block">
                            <div className="text-sm">
                              {tx.from.toLowerCase() === address.toLowerCase() ? (
                                <span className="text-red-600">OUT</span>
                              ) : (
                                <span className="text-green-600">IN</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {parseFloat(web3Service.formatEther(tx.value)).toFixed(6)} ETH
                        </div>
                        <div className="flex items-center justify-end space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            tx.status === 1 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tx.status === 1 ? 'Success' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'code' && addressDetails.isContract && addressDetails.code && (
          <Card>
            <CardHeader>
              <CardTitle>Contract Bytecode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {addressDetails.code}
                </pre>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Code Size:</strong> {formatNumber((addressDetails.code.length - 2) / 2)} bytes</p>
                <p className="mt-2">
                  This is the raw bytecode deployed on the blockchain. To interact with this contract,
                  you would need the ABI (Application Binary Interface).
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}