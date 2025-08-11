'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hash, Clock, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import web3Service from '@/lib/web3';
import { formatHash, formatTimeAgo, formatNumber } from '@/lib/utils';

interface Block {
  number: number;
  hash: string;
  timestamp: number;
  transactions: any[];
  gasUsed: number;
  gasLimit: number;
  miner: string;
  size: number;
}

const BLOCKS_PER_PAGE = 20;

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [latestBlockNumber, setLatestBlockNumber] = useState(0);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        setLoading(true);
        const latest = await web3Service.getLatestBlockNumber();
        setLatestBlockNumber(latest);
        
        const startBlock = latest - ((currentPage - 1) * BLOCKS_PER_PAGE);
        const endBlock = Math.max(0, startBlock - BLOCKS_PER_PAGE + 1);
        
        const blockPromises = [];
        for (let i = startBlock; i >= endBlock; i--) {
          if (i >= 0) {
            blockPromises.push(web3Service.getBlock(i, true));
          }
        }
        
        const fetchedBlocks = await Promise.all(blockPromises);
        const formattedBlocks = fetchedBlocks
          .filter(block => block !== null && block.hash)
          .map(block => ({
            number: Number(block.number),
            hash: block.hash!,
            timestamp: Number(block.timestamp),
            transactions: Array.isArray(block.transactions) ? block.transactions : [],
            gasUsed: Number(block.gasUsed),
            gasLimit: Number(block.gasLimit),
            miner: block.miner || '',
            size: Number(block.size) || 0,
          }));

        setBlocks(formattedBlocks);
        setError(null);
      } catch (err) {
        setError('Failed to fetch blocks');
        console.error('Error fetching blocks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
  }, [currentPage]);

  const totalPages = Math.ceil((latestBlockNumber + 1) / BLOCKS_PER_PAGE);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Blocks</h1>
          <p className="text-gray-600 mt-2">Browse all blocks on the Iperchain network</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-40"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Blocks</h1>
          <p className="text-gray-600 mt-2">Browse all blocks on the Iperchain network</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Blocks</h1>
        <p className="text-gray-600 mt-2">
          Browse all blocks on the Iperchain network. Latest block: #{formatNumber(latestBlockNumber)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Hash className="h-5 w-5" />
            <span>Block List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Block</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Age</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Txns</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Miner</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Gas Used</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Gas Limit</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr key={block.number} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <Link
                          href={`/block/${block.number}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          #{formatNumber(block.number)}
                        </Link>
                        <p className="text-sm text-gray-500 font-mono mt-1">
                          {formatHash(block.hash)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeAgo(block.timestamp)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatNumber(block.transactions.length)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        href={`/address/${block.miner}`}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                      >
                        {formatHash(block.miner)}
                      </Link>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {formatNumber(block.gasUsed)}
                        </span>
                        <div className="flex items-center mt-1">
                          <Zap className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="text-gray-500">
                            {((block.gasUsed / block.gasLimit) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">
                        {formatNumber(block.gasLimit)}
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
              Showing page {currentPage} of {totalPages}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
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