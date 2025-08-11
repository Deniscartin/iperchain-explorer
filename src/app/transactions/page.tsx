'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import web3Service from '@/lib/web3';
import { formatHash, formatTimeAgo, formatNumber, safeBigIntToString, safeStringOrNull } from '@/lib/utils';

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
  transactionIndex: number;
}

const TRANSACTIONS_PER_PAGE = 25;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        const latestBlockNumber = await web3Service.getLatestBlockNumber();
        const allTransactions: Transaction[] = [];
        
        // Calculate which blocks to fetch based on current page
        const blocksToScan = 50; // Scan more blocks to get enough transactions
        const startBlock = latestBlockNumber - ((currentPage - 1) * 10); // Rough estimation
        
        let transactionsFound = 0;
        let blockIndex = 0;
        
        while (transactionsFound < TRANSACTIONS_PER_PAGE && blockIndex < blocksToScan) {
          const blockNumber = Math.max(0, startBlock - blockIndex);
          
          try {
            const block = await web3Service.getBlock(blockNumber, true);
            
            if (block && Array.isArray(block.transactions)) {
              for (const [index, tx] of block.transactions.entries()) {
                if (typeof tx === 'object' && tx.hash) {
                  try {
                    const receipt = await web3Service.getTransactionReceipt(tx.hash);
                    
                    allTransactions.push({
                      hash: tx.hash,
                      blockNumber: Number(block.number),
                      timestamp: Number(block.timestamp),
                      from: tx.from,
                      to: safeStringOrNull(tx.to),
                      value: safeBigIntToString(tx.value),
                      gasUsed: receipt ? Number(receipt.gasUsed) : 0,
                      gasPrice: safeBigIntToString(tx.gasPrice),
                      status: receipt ? Number(receipt.status) : 1,
                      transactionIndex: index,
                    });
                    
                    transactionsFound++;
                    if (transactionsFound >= TRANSACTIONS_PER_PAGE) break;
                  } catch (err) {
                    console.warn('Error processing transaction:', err);
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Error fetching block:', blockNumber, err);
          }
          
          blockIndex++;
        }
        
        // Sort by block number and transaction index (newest first)
        allTransactions.sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) {
            return b.blockNumber - a.blockNumber;
          }
          return b.transactionIndex - a.transactionIndex;
        });
        
        setTransactions(allTransactions);
        
        // Estimate total transactions (rough calculation)
        setTotalTransactions(latestBlockNumber * 10); // Assume average 10 tx per block
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch transactions');
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentPage]);

  const totalPages = Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-2">Browse all transactions on the Iperchain network</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-48"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-2">Browse all transactions on the Iperchain network</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-600 mt-2">
          Browse all transactions on the Iperchain network. 
          Showing {formatNumber(transactions.length)} transactions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Transaction List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Transaction Hash</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Block</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Age</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">From</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">To</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Value</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.hash} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <Link
                        href={`/tx/${tx.hash}`}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                      >
                        {formatHash(tx.hash)}
                      </Link>
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        href={`/block/${tx.blockNumber}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {formatNumber(tx.blockNumber)}
                      </Link>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeAgo(tx.timestamp)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        href={`/address/${tx.from}`}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                      >
                        {formatHash(tx.from)}
                      </Link>
                    </td>
                    <td className="py-4 px-4">
                      {tx.to ? (
                        <Link
                          href={`/address/${tx.to}`}
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                        >
                          {formatHash(tx.to)}
                        </Link>
                      ) : (
                        <span className="text-gray-500 text-sm">Contract Creation</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-900">
                        {parseFloat(web3Service.formatEther(tx.value)).toFixed(6)} ETH
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        tx.status === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.status === 1 ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing page {currentPage} of {Math.min(totalPages, 100)} {/* Limit pages for performance */}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(100, prev + 1))}
                disabled={currentPage >= 100} // Limit for performance
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}