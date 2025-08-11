import NetworkStats from '@/components/NetworkStats';
import RecentBlocks from '@/components/RecentBlocks';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Iperchain Block Explorer
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Explore blocks, transactions, addresses, and smart contracts on the Iperchain network.
          Real-time blockchain data and analytics.
        </p>
      </div>

      {/* Network Statistics */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Network Overview</h2>
        <NetworkStats />
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Blocks</h2>
        <RecentBlocks />
      </section>
    </div>
  );
}