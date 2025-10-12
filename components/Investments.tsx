
import React, { useState, useEffect } from 'react';
import { Currency } from '../types';
import Card from './ui/Card';
import { USD_KRW_EXCHANGE_RATE } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { api } from '../lib/api';


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
  const [holdings, setHoldings] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHoldingModal, setShowHoldingModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const [holdingFormData, setHoldingFormData] = useState({
    account_id: '',
    symbol: '',
    name: '',
    qty: '',
    avg_price: '',
    current_price: ''
  });

  const [accountFormData, setAccountFormData] = useState({
    name: '',
    broker: ''
  });

  const fetchData = async () => {
    try {
      const [holdingsData, accountsData] = await Promise.all([
        api.getHoldings(),
        api.getInvestmentAccounts()
      ]);
      setHoldings(holdingsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Failed to fetch investment data:', error);
      alert('투자 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Holdings handlers
  const handleOpenHoldingModal = (holding?: any) => {
    if (holding) {
      setEditingHolding(holding);
      setHoldingFormData({
        account_id: holding.account_id.toString(),
        symbol: holding.symbol,
        name: holding.name,
        qty: holding.qty.toString(),
        avg_price: holding.avg_price.toString(),
        current_price: holding.current_price.toString()
      });
    } else {
      setEditingHolding(null);
      setHoldingFormData({
        account_id: '',
        symbol: '',
        name: '',
        qty: '',
        avg_price: '',
        current_price: ''
      });
    }
    setShowHoldingModal(true);
  };

  const handleSubmitHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        account_id: parseInt(holdingFormData.account_id),
        symbol: holdingFormData.symbol,
        name: holdingFormData.name,
        qty: parseFloat(holdingFormData.qty),
        avg_price: parseFloat(holdingFormData.avg_price),
        current_price: parseFloat(holdingFormData.current_price)
      };

      if (editingHolding) {
        await api.updateHolding(editingHolding.id, data);
      } else {
        await api.createHolding(data);
      }

      await fetchData();
      setShowHoldingModal(false);
    } catch (error) {
      console.error('Failed to save holding:', error);
      alert('보유 자산을 저장하는데 실패했습니다.');
    }
  };

  const handleDeleteHolding = async (id: number) => {
    if (!confirm('정말 이 보유 자산을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteHolding(id);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete holding:', error);
      alert('보유 자산을 삭제하는데 실패했습니다.');
    }
  };

  // Account handlers
  const handleOpenAccountModal = (account?: any) => {
    if (account) {
      setEditingAccount(account);
      setAccountFormData({
        name: account.name,
        broker: account.broker
      });
    } else {
      setEditingAccount(null);
      setAccountFormData({
        name: '',
        broker: ''
      });
    }
    setShowAccountModal(true);
  };

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await api.updateInvestmentAccount(editingAccount.id, accountFormData);
      } else {
        await api.createInvestmentAccount(accountFormData);
      }

      await fetchData();
      setShowAccountModal(false);
    } catch (error) {
      console.error('Failed to save account:', error);
      alert('계좌를 저장하는데 실패했습니다.');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('정말 이 투자 계좌를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deleteInvestmentAccount(id);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      if (error.message?.includes('holdings')) {
        alert('보유 자산이 있는 계좌는 삭제할 수 없습니다. 먼저 보유 자산을 삭제해주세요.');
      } else {
        alert('투자 계좌를 삭제하는데 실패했습니다.');
      }
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 p-8">로딩중...</div>;
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.current_price * h.qty, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.avg_price * h.qty, 0);
  const totalProfit = totalValue - totalCost;
  const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const assetAllocationData = holdings.map(h => ({
    name: h.name,
    value: h.current_price * h.qty,
  }));

  const PIE_COLORS = ['#0EA5E9', '#0284C7', '#38BDF8', '#7DD3FC'];

  const getAccountName = (id: number) => accounts.find(a => a.id === id)?.name || 'N/A';

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-gray-400">총 포트폴리오 가치</p>
            <p className="text-3xl font-bold text-sky-400">{formatCurrency(totalValue, currency)}</p>
          </Card>
          <Card>
            <p className="text-gray-400">총 손익</p>
            <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(totalProfit, currency)}
            </p>
          </Card>
          <Card>
            <p className="text-gray-400">총 수익률</p>
            <p className={`text-3xl font-bold ${profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {profitPercentage.toFixed(2)}%
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="보유 자산" className="lg:col-span-2">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => handleOpenHoldingModal()}
                className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
              >
                자산 추가
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="p-3">자산</th>
                    <th className="p-3">계좌</th>
                    <th className="p-3">수량</th>
                    <th className="p-3">평균 단가</th>
                    <th className="p-3">현재 가격</th>
                    <th className="p-3">시장 가치</th>
                    <th className="p-3">손익</th>
                    <th className="p-3">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        보유 자산이 없습니다. "자산 추가"를 클릭하여 생성하세요.
                      </td>
                    </tr>
                  ) : (
                    holdings.map((holding) => {
                      const marketValue = holding.qty * holding.current_price;
                      const profit = (holding.current_price - holding.avg_price) * holding.qty;
                      return (
                        <tr key={holding.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                          <td className="p-3 font-semibold">{holding.name} ({holding.symbol})</td>
                          <td className="p-3">{getAccountName(holding.account_id)}</td>
                          <td className="p-3">{holding.qty}</td>
                          <td className="p-3">{formatCurrency(holding.avg_price, currency)}</td>
                          <td className="p-3">{formatCurrency(holding.current_price, currency)}</td>
                          <td className="p-3">{formatCurrency(marketValue, currency)}</td>
                          <td className={`p-3 font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(profit, currency)}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleOpenHoldingModal(holding)}
                              className="text-sky-400 hover:text-sky-300 mr-2"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteHolding(holding.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="자산 배분" className="h-96">
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

        {/* Investment Accounts Section */}
        <Card title="투자 계좌">
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => handleOpenAccountModal()}
              className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
            >
              계좌 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-3">계좌명</th>
                  <th className="p-3">증권사</th>
                  <th className="p-3">작업</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400">
                      투자 계좌가 없습니다. "계좌 추가"를 클릭하여 생성하세요.
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                      <td className="p-3 font-semibold">{account.name}</td>
                      <td className="p-3">{account.broker}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleOpenAccountModal(account)}
                          className="text-sky-400 hover:text-sky-300 mr-2"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Holding Modal */}
      {showHoldingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingHolding ? '자산 수정' : '자산 추가'}
            </h2>
            <form onSubmit={handleSubmitHolding}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">계좌</label>
                <div className="relative">
                  <select
                    value={holdingFormData.account_id}
                    onChange={(e) => setHoldingFormData({ ...holdingFormData, account_id: e.target.value })}
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                    required
                  >
                    <option value="" className="bg-gray-800">계좌 선택</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id} className="bg-gray-800">{account.name} ({account.broker})</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">티커 심볼</label>
                <input
                  type="text"
                  value={holdingFormData.symbol}
                  onChange={(e) => setHoldingFormData({ ...holdingFormData, symbol: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="예: AAPL, TSLA"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">자산명</label>
                <input
                  type="text"
                  value={holdingFormData.name}
                  onChange={(e) => setHoldingFormData({ ...holdingFormData, name: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="예: Apple Inc."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">수량</label>
                <input
                  type="number"
                  step="0.001"
                  value={holdingFormData.qty}
                  onChange={(e) => setHoldingFormData({ ...holdingFormData, qty: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="0"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">평균 단가 (원)</label>
                <input
                  type="number"
                  step="0.01"
                  value={holdingFormData.avg_price}
                  onChange={(e) => setHoldingFormData({ ...holdingFormData, avg_price: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="0"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">현재 가격 (원)</label>
                <input
                  type="number"
                  step="0.01"
                  value={holdingFormData.current_price}
                  onChange={(e) => setHoldingFormData({ ...holdingFormData, current_price: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="0"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHoldingModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
                >
                  {editingHolding ? '수정' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingAccount ? '계좌 수정' : '계좌 추가'}
            </h2>
            <form onSubmit={handleSubmitAccount}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">계좌명</label>
                <input
                  type="text"
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="예: 주식 계좌"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">증권사</label>
                <input
                  type="text"
                  value={accountFormData.broker}
                  onChange={(e) => setAccountFormData({ ...accountFormData, broker: e.target.value })}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="예: 키움증권"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
                >
                  {editingAccount ? '수정' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Investments;
