
import React from 'react';
import { Currency } from '../types';
import Card from './ui/Card';
import { HOLDINGS, INVESTMENT_ACCOUNTS, USD_KRW_EXCHANGE_RATE } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';


interface InvestmentsProps {
  currency: Currency;
}

const formatCurrency = (value: number, currency: Currency) => {
  const amount = currency === 'USD' ? value / USD_KRW_EXCHANGE_RATE : value;
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
};

const Investments: React.FC<InvestmentsProps> = ({ currency }) => {
  
  const totalValue = HOLDINGS.reduce((sum, h) => sum + h.currentPrice * h.qty, 0);
  const totalCost = HOLDINGS.reduce((sum, h) => sum + h.avgPrice * h.qty, 0);
  const totalProfit = totalValue - totalCost;
  const profitPercentage = totalValue > 0 ? (totalProfit / totalCost) * 100 : 0;
  
  const assetAllocationData = HOLDINGS.map(h => ({
    name: h.name,
    value: h.currentPrice * h.qty,
  }));

  const PIE_COLORS = ['#0EA5E9', '#0284C7', '#38BDF8', '#7DD3FC'];

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <p className="text-gray-400">Total Portfolio Value</p>
          <p className="text-3xl font-bold text-sky-400">{formatCurrency(totalValue, currency)}</p>
        </Card>
        <Card>
          <p className="text-gray-400">Total Profit / Loss</p>
          <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(totalProfit, currency)}
          </p>
        </Card>
        <Card>
          <p className="text-gray-400">Total Return</p>
           <p className={`text-3xl font-bold ${profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {profitPercentage.toFixed(2)}%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Holdings" className="lg:col-span-2">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead className="bg-gray-700">
                    <tr>
                    <th className="p-3">Asset</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Avg Price</th>
                    <th className="p-3">Current Price</th>
                    <th className="p-3">Market Value</th>
                    <th className="p-3">P/L</th>
                    </tr>
                </thead>
                <tbody>
                    {HOLDINGS.map((holding) => {
                        const marketValue = holding.qty * holding.currentPrice;
                        const profit = (holding.currentPrice - holding.avgPrice) * holding.qty;
                        return (
                            <tr key={holding.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                            <td className="p-3 font-semibold">{holding.name} ({holding.symbol})</td>
                            <td className="p-3">{holding.qty}</td>
                            <td className="p-3">{formatCurrency(holding.avgPrice, currency)}</td>
                            <td className="p-3">{formatCurrency(holding.currentPrice, currency)}</td>
                            <td className="p-3">{formatCurrency(marketValue, currency)}</td>
                            <td className={`p-3 font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(profit, currency)}</td>
                            </tr>
                        );
                    })}
                </tbody>
                </table>
            </div>
        </Card>
        <Card title="Asset Allocation" className="h-96">
            <ResponsiveContainer>
            <PieChart>
                <Pie data={assetAllocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8">
                {assetAllocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} formatter={(value) => formatCurrency(value as number, currency)}/>
                <Legend />
            </PieChart>
            </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Investments;
