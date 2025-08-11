'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Hash, Clock, Zap, FileText, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import web3Service from '@/lib/web3';
import { formatHash, formatTimeAgo, formatNumber, copyToClipboard, safeBigIntToString, safeStringOrEmpty } from '@/lib/utils';

interface BlockDetails {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  transactions: any[];
  gasUsed: number;
  gasLimit: number;
  miner: string;
  size: number;
  difficulty: number;
  totalDifficulty: number;
  nonce: string;
  extraData: string;
  logsBloom: string;
  receiptsRoot: string;
  stateRoot: string;
  transactionsRoot: string;
}

export default function BlockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const blockId = params.id as string;
  
  const [block, setBlock] = useState<BlockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string>('');

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        setLoading(true);
        
        // Try to parse as number, otherwise treat as hash
        const blockIdentifier: number | string = /^\d+$/.test(blockId) ? parseInt(blockId) : blockId;
        
        const blockData = await web3Service.getBlock(blockIdentifier as number | "latest", true);
        
        if (!blockData) {
          setError('Block not found');
          return;
        }

        const blockDetails: BlockDetails = {
          number: Number(blockData.number),
          hash: safeStringOrEmpty(blockData.hash),
          parentHash: blockData.parentHash,
          timestamp: Number(blockData.timestamp),
          transactions: Array.isArray(blockData.transactions) ? blockData.transactions : [],
          gasUsed: Number(blockData.gasUsed),
          gasLimit: Number(blockData.gasLimit),
          miner: blockData.miner || '',
          size: Number(blockData.size) || 0,
          difficulty: Number(blockData.difficulty) || 0,
          totalDifficulty: Number(blockData.totalDifficulty) || 0,
          nonce: safeBigIntToString(blockData.nonce),
          extraData: blockData.extraData || '0x',
          logsBloom: blockData.logsBloom || '0x',
          receiptsRoot: blockData.receiptsRoot || '0x',
          stateRoot: blockData.stateRoot || '0x',
          transactionsRoot: blockData.transactionsRoot || '0x',
        };

        setBlock(blockDetails);
        setError(null);
      } catch (err) {
        setError('Failed to fetch block details');
        console.error('Error fetching block:', err);
      } finally {
        setLoading(false);
      }
    };

    if (blockId) {
      fetchBlock();
    }
  }, [blockId]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await copyToClipboard(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(''), 2000);
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
              {[...Array(8)].map((_, i) => (
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

  if (error || !block) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error || 'Block not found'}</p>
        </div>
      </div>
    );
  }

  const blockInfo = [
    { label: 'Block Height', value: formatNumber(block.number) },
    { label: 'Timestamp', value: `${formatTimeAgo(block.timestamp)} (${new Date(block.timestamp * 1000).toLocaleString()})` },
    { label: 'Transactions', value: formatNumber(block.transactions.length) },
    { label: 'Miner', value: block.miner, copyable: true, link: `/address/${block.miner}` },
    { label: 'Size', value: `${formatNumber(block.size)} bytes` },
    { label: 'Gas Used', value: `${formatNumber(block.gasUsed)} (${((block.gasUsed / block.gasLimit) * 100).toFixed(2)}%)` },
    { label: 'Gas Limit', value: formatNumber(block.gasLimit) },
    { label: 'Difficulty', value: formatNumber(block.difficulty) },
    { label: 'Total Difficulty', value: formatNumber(block.totalDifficulty) },
  ];

  const hashInfo = [
    { label: 'Hash', value: block.hash },
    { label: 'Parent Hash', value: block.parentHash, link: `/block/${block.parentHash}` },
    { label: 'State Root', value: block.stateRoot },
    { label: 'Transactions Root', value: block.transactionsRoot },
    { label: 'Receipts Root', value: block.receiptsRoot },
    { label: 'Nonce', value: block.nonce },
    { label: 'Extra Data', value: block.extraData },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex space-x-2">
          {block.number > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/block/${block.number - 1}`}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/block/${block.number + 1}`}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Block Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Hash className="h-5 w-5" />
              <span>Block #{formatNumber(block.number)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {blockInfo.map((info, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-500">{info.label}</span>
                  <div className="flex items-center space-x-2">
                    {info.link ? (
                      <Link href={info.link} className="text-blue-600 hover:text-blue-800 font-mono text-sm">
                        {typeof info.value === 'string' && info.value.startsWith('0x') ? formatHash(info.value) : info.value}
                      </Link>
                    ) : (
                      <span className={`text-sm ${info.copyable ? 'font-mono' : ''}`}>
                        {typeof info.value === 'string' && info.value.startsWith('0x') ? formatHash(info.value) : info.value}
                      </span>
                    )}
                    {info.copyable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(info.value, info.label)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {copySuccess === info.label && (
                    <span className="text-xs text-green-600">Copied!</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hash Details */}
        <Card>
          <CardHeader>
            <CardTitle>Hash Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hashInfo.map((info, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-500">{info.label}</span>
                  <div className="flex items-center space-x-2">
                    {info.link ? (
                      <Link href={info.link} className="text-blue-600 hover:text-blue-800 font-mono text-sm break-all">
                        {info.value}
                      </Link>
                    ) : (
                      <span className="font-mono text-sm break-all">{info.value}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(info.value, info.label)}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {copySuccess === info.label && (
                    <span className="text-xs text-green-600">Copied!</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        {block.transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Transactions ({formatNumber(block.transactions.length)})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {block.transactions.slice(0, 10).map((tx, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <Link
                      href={`/tx/${typeof tx === 'string' ? tx : tx.hash}`}
                      className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                    >
                      {formatHash(typeof tx === 'string' ? tx : tx.hash)}
                    </Link>
                  </div>
                ))}
                {block.transactions.length > 10 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-600">
                      And {formatNumber(block.transactions.length - 10)} more transactions...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}