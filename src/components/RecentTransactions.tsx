'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Clock, FileText } from 'lucide-react';
import web3Service from '@/lib/web3';
import { formatHash, formatTimeAgo, formatNumber } from '@/lib/utils';

interface Transaction {
  hash: string;
  blockNumber: number;
  blockTimestamp: number;
  from: string;
  to: string | null;
  value: string;
  gasUsed: number;
  gasPrice: string;
  status: number;
}

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      try {
        setLoading(true);
        const latestBlockNumber = await web3Service.getLatestBlockNumber();
        
        // Fetch transactions from the last few blocks
        const allTransactions: Transaction[] = [];
        let blocksChecked = 0;
        
        for (let i = 0; i < 10 && blocksChecked < 10; i++) {
          const blockNumber = latestBlockNumber - i;
          if (blockNumber >= 0) {
            blocksChecked++;
            const block = await web3Service.getBlock(blockNumber, true);
            
            if (block && Array.isArray(block.transactions)) {
              for (const tx of block.transactions.slice(0, 5)) { // Limit to 5 txs per block
                if (typeof tx === 'object' && tx.hash) {
                  try {
                    const receipt = await web3Service.getTransactionReceipt(tx.hash);
                    allTransactions.push({
                      hash: tx.hash,
                      blockNumber: Number(block.number),
                      blockTimestamp: Number(block.timestamp),
                      from: tx.from,
                      to: tx.to || null,
                      value: typeof tx.value === 'bigint' ? tx.value.toString() : (tx.value || '0'),
                      gasUsed: receipt ? Number(receipt.gasUsed) : 0,
                      gasPrice: typeof tx.gasPrice === 'bigint' ? tx.gasPrice.toString() : (tx.gasPrice || '0'),
                      status: receipt ? Number(receipt.status) : 1,
                    });
                  } catch (err) {
                    console.warn('Error fetching transaction receipt:', err);
                  }
                }
              }
            }
            
            if (allTransactions.length >= 10) break;
          }
        }
        
        setTransactions(allTransactions.slice(0, 10));
        setError(null);
      } catch (err) {
        setError('Failed to fetch recent transactions');
        console.error('Error fetching recent transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTransactions();
    
    // Update transactions every 15 seconds
    const interval = setInterval(fetchRecentTransactions, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Recent Transactions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div
              key={tx.hash}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div>
                    <Link
                      href={`/tx/${tx.hash}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm font-mono"
                    >
                      {formatHash(tx.hash)}
                    </Link>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimeAgo(tx.blockTimestamp)}
                    </p>
                  </div>
                  
                  <div className="hidden sm:flex items-center space-x-2">
                    <div className="text-sm">
                      <span className="text-gray-500">From:</span>
                      <Link
                        href={`/address/${tx.from}`}
                        className="text-blue-600 hover:text-blue-800 font-mono ml-1"
                      >
                        {formatHash(tx.from, 6, 4)}
                      </Link>
                    </div>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <div className="text-sm">
                      <span className="text-gray-500">To:</span>
                      {tx.to ? (
                        <Link
                          href={`/address/${tx.to}`}
                          className="text-blue-600 hover:text-blue-800 font-mono ml-1"
                        >
                          {formatHash(tx.to, 6, 4)}
                        </Link>
                      ) : (
                        <span className="text-gray-500 ml-1">Contract Creation</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {parseFloat(web3Service.formatEther(tx.value)).toFixed(4)} ETH
                </p>
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
          
          {transactions.length > 0 && (
            <div className="text-center pt-4">
              <Link
                href="/transactions"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all transactions →
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}