'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Hash, Zap } from 'lucide-react';
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
}

export default function RecentBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentBlocks = async () => {
      try {
        setLoading(true);
        const latestBlockNumber = await web3Service.getLatestBlockNumber();
        
        // Fetch last 10 blocks
        const blockPromises = [];
        for (let i = 0; i < 10; i++) {
          const blockNumber = latestBlockNumber - i;
          if (blockNumber >= 0) {
            blockPromises.push(web3Service.getBlock(blockNumber, true));
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
          }));

        setBlocks(formattedBlocks);
        setError(null);
      } catch (err) {
        setError('Failed to fetch recent blocks');
        console.error('Error fetching recent blocks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentBlocks();
    
    // Update blocks every 15 seconds
    const interval = setInterval(fetchRecentBlocks, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Blocks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
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
          <CardTitle>Recent Blocks</CardTitle>
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
          <Hash className="h-5 w-5" />
          <span>Recent Blocks</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {blocks.map((block) => (
            <div
              key={block.number}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div>
                    <Link
                      href={`/block/${block.number}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      #{formatNumber(block.number)}
                    </Link>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimeAgo(block.timestamp)}
                    </p>
                  </div>
                  
                  <div className="hidden sm:block">
                    <p className="text-sm text-gray-600">
                      Hash: <span className="font-mono">{formatHash(block.hash)}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Miner: <span className="font-mono">{formatHash(block.miner)}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatNumber(block.transactions.length)} txns
                </p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Zap className="h-3 w-3 mr-1" />
                  {((block.gasUsed / block.gasLimit) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
          
          {blocks.length > 0 && (
            <div className="text-center pt-4">
              <Link
                href="/blocks"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all blocks →
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}