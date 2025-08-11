'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Copy, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import web3Service from '@/lib/web3';
import { formatHash, formatTimeAgo, formatNumber, copyToClipboard, safeBigIntToString, safeStringOrNull, safeStringOrEmpty } from '@/lib/utils';

interface TransactionDetails {
  hash: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  timestamp: number;
  from: string;
  to: string | null;
  value: string;
  gasLimit: number;
  gasUsed: number;
  gasPrice: string;
  status: number;
  nonce: number;
  input: string;
  logs: any[];
  contractAddress: string | null;
  cumulativeGasUsed: number;
}

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const txHash = params.id as string;
  
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string>('');

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true);
        
        if (!web3Service.isValidTxHash(txHash)) {
          setError('Invalid transaction hash format');
          return;
        }

        const [tx, receipt] = await Promise.all([
          web3Service.getTransaction(txHash),
          web3Service.getTransactionReceipt(txHash)
        ]);
        
        if (!tx) {
          setError('Transaction not found');
          return;
        }

        if (!receipt) {
          setError('Transaction receipt not found');
          return;
        }

        // Get block details for timestamp
        const block = tx.blockNumber ? await web3Service.getBlock(Number(tx.blockNumber), false) : null;
        
        const transactionDetails: TransactionDetails = {
          hash: tx.hash,
          blockNumber: Number(tx.blockNumber || 0),
          blockHash: safeStringOrEmpty(tx.blockHash),
          transactionIndex: Number(tx.transactionIndex),
          timestamp: block ? Number(block.timestamp) : 0,
          from: tx.from,
          to: safeStringOrNull(tx.to),
          value: safeBigIntToString(tx.value),
          gasLimit: Number(tx.gas),
          gasUsed: Number(receipt.gasUsed),
          gasPrice: safeBigIntToString(tx.gasPrice),
          status: Number(receipt.status),
          nonce: Number(tx.nonce),
          input: tx.input || '0x',
          logs: receipt.logs || [],
          contractAddress: safeStringOrNull(receipt.contractAddress),
          cumulativeGasUsed: Number(receipt.cumulativeGasUsed),
        };

        setTransaction(transactionDetails);
        setError(null);
      } catch (err) {
        setError('Failed to fetch transaction details');
        console.error('Error fetching transaction:', err);
      } finally {
        setLoading(false);
      }
    };

    if (txHash) {
      fetchTransaction();
    }
  }, [txHash]);

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

  if (error || !transaction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error || 'Transaction not found'}</p>
        </div>
      </div>
    );
  }

  const gasFeeETH = web3Service.formatEther((BigInt(transaction.gasUsed) * BigInt(transaction.gasPrice)).toString());
  const gasEfficiency = ((transaction.gasUsed / transaction.gasLimit) * 100).toFixed(2);

  const basicInfo = [
    { label: 'Transaction Hash', value: transaction.hash, copyable: true },
    { label: 'Status', value: transaction.status === 1 ? 'Success' : 'Failed', status: true },
    { label: 'Block', value: formatNumber(transaction.blockNumber), link: `/block/${transaction.blockNumber}` },
    { label: 'Block Hash', value: transaction.blockHash, copyable: true, link: `/block/${transaction.blockHash}` },
    { label: 'Transaction Index', value: formatNumber(transaction.transactionIndex) },
    { label: 'Timestamp', value: `${formatTimeAgo(transaction.timestamp)} (${new Date(transaction.timestamp * 1000).toLocaleString()})` },
  ];

  const addressInfo = [
    { label: 'From', value: transaction.from, copyable: true, link: `/address/${transaction.from}` },
    { label: 'To', value: transaction.to || 'Contract Creation', copyable: !!transaction.to, link: transaction.to ? `/address/${transaction.to}` : undefined },
    { label: 'Value', value: `${parseFloat(web3Service.formatEther(transaction.value)).toFixed(6)} ETH` },
  ];

  const gasInfo = [
    { label: 'Gas Limit', value: formatNumber(transaction.gasLimit) },
    { label: 'Gas Used', value: `${formatNumber(transaction.gasUsed)} (${gasEfficiency}%)` },
    { label: 'Gas Price', value: `${parseFloat(web3Service.formatEther(transaction.gasPrice)).toFixed(9)} ETH (${parseFloat(web3Service.getWeb3().utils.fromWei(transaction.gasPrice, 'gwei')).toFixed(2)} Gwei)` },
    { label: 'Transaction Fee', value: `${parseFloat(gasFeeETH).toFixed(9)} ETH` },
    { label: 'Cumulative Gas Used', value: formatNumber(transaction.cumulativeGasUsed) },
  ];

  const otherInfo: Array<{
    label: string;
    value: string;
    copyable?: boolean;
    isData?: boolean;
    link?: string;
  }> = [
    { label: 'Nonce', value: formatNumber(transaction.nonce) },
    { label: 'Input Data', value: transaction.input, copyable: true, isData: true },
  ];

  if (transaction.contractAddress) {
    otherInfo.unshift({
      label: 'Contract Address',
      value: transaction.contractAddress,
      copyable: true,
      link: `/address/${transaction.contractAddress}`
    });
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
        {/* Transaction Status Banner */}
        <div className={`rounded-lg p-4 flex items-center space-x-3 ${
          transaction.status === 1 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {transaction.status === 1 ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600" />
          )}
          <div>
            <h2 className={`text-lg font-semibold ${
              transaction.status === 1 ? 'text-green-800' : 'text-red-800'
            }`}>
              Transaction {transaction.status === 1 ? 'Successful' : 'Failed'}
            </h2>
            <p className={`text-sm ${
              transaction.status === 1 ? 'text-green-700' : 'text-red-700'
            }`}>
              {transaction.status === 1 
                ? 'This transaction was successfully processed.'
                : 'This transaction failed and was reverted.'
              }
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Transaction Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {basicInfo.map((info, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-500">{info.label}</span>
                  <div className="flex items-center space-x-2">
                    {info.status ? (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                        transaction.status === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {info.value}
                      </span>
                    ) : info.link ? (
                      <Link href={info.link} className="text-blue-600 hover:text-blue-800 font-mono text-sm break-all">
                        {typeof info.value === 'string' && info.value.startsWith('0x') && info.value.length > 20 
                          ? formatHash(info.value) 
                          : info.value
                        }
                      </Link>
                    ) : (
                      <span className={`text-sm ${info.copyable ? 'font-mono break-all' : ''}`}>
                        {typeof info.value === 'string' && info.value.startsWith('0x') && info.value.length > 20 
                          ? formatHash(info.value) 
                          : info.value
                        }
                      </span>
                    )}
                    {info.copyable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(info.value, info.label)}
                        className="h-6 w-6 p-0 flex-shrink-0"
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

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {addressInfo.map((info, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-500">{info.label}</span>
                  <div className="flex items-center space-x-2">
                    {info.link ? (
                      <Link href={info.link} className="text-blue-600 hover:text-blue-800 font-mono text-sm break-all">
                        {info.value}
                      </Link>
                    ) : (
                      <span className={`text-sm ${info.copyable ? 'font-mono break-all' : ''}`}>
                        {info.value}
                      </span>
                    )}
                    {info.copyable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(info.value, info.label)}
                        className="h-6 w-6 p-0 flex-shrink-0"
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

        {/* Gas Information */}
        <Card>
          <CardHeader>
            <CardTitle>Gas Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gasInfo.map((info, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-500">{info.label}</span>
                  <span className="text-sm">{info.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Other Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {otherInfo.map((info, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-500">{info.label}</span>
                  <div className="flex items-start space-x-2">
                    {info.link ? (
                      <Link href={info.link} className="text-blue-600 hover:text-blue-800 font-mono text-sm break-all">
                        {info.isData && info.value.length > 100 ? `${info.value.slice(0, 100)}...` : info.value}
                      </Link>
                    ) : (
                      <span className={`text-sm ${info.copyable ? 'font-mono break-all' : ''} ${info.isData ? 'bg-gray-100 p-2 rounded' : ''}`}>
                        {info.isData && info.value.length > 100 ? `${info.value.slice(0, 100)}...` : info.value}
                      </span>
                    )}
                    {info.copyable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(info.value, info.label)}
                        className="h-6 w-6 p-0 flex-shrink-0 mt-1"
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

        {/* Event Logs */}
        {transaction.logs && transaction.logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Logs ({transaction.logs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transaction.logs.map((log, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">Address:</span>
                        <Link
                          href={`/address/${log.address}`}
                          className="text-blue-600 hover:text-blue-800 font-mono ml-2"
                        >
                          {formatHash(log.address)}
                        </Link>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Log Index:</span>
                        <span className="ml-2">{log.logIndex}</span>
                      </div>
                    </div>
                    {log.topics && log.topics.length > 0 && (
                      <div className="mt-2">
                        <span className="font-medium text-gray-500 block mb-1">Topics:</span>
                        {log.topics.map((topic: string, topicIndex: number) => (
                          <div key={topicIndex} className="font-mono text-xs bg-gray-100 p-2 rounded mb-1">
                            [{topicIndex}] {topic}
                          </div>
                        ))}
                      </div>
                    )}
                    {log.data && log.data !== '0x' && (
                      <div className="mt-2">
                        <span className="font-medium text-gray-500 block mb-1">Data:</span>
                        <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                          {log.data}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}