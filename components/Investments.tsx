import React, { useEffect, useMemo, useState } from 'react';
import { Currency, InvestmentTransactionType } from '../types';
import Card from './ui/Card';
import { DEFAULT_USD_KRW_EXCHANGE_RATE } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { api } from '../lib/api';

interface InvestmentsProps {
  currency: Currency;
  exchangeRate: number;
}

const formatCurrency = (value: number, currency: Currency, exchangeRate: number) => {
  const rate = exchangeRate > 0 ? exchangeRate : DEFAULT_USD_KRW_EXCHANGE_RATE;
  const amount = currency === 'USD' ? value / rate : value;
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ko-KR');
};

const calculateTransactionAmount = (transaction: any) => {
  const fees = transaction.fees ?? 0;
  const gross = (transaction.quantity ?? 0) * (transaction.price ?? 0);
  return transaction.type === 'BUY' ? -(gross + fees) : gross - fees;
};

const Investments: React.FC<InvestmentsProps> = ({ currency, exchangeRate }) => {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [showHoldingModal, setShowHoldingModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const [holdingFormData, setHoldingFormData] = useState({
    account_id: '',
    symbol: '',
    name: '',
    qty: '',
    avg_price: '',
    current_price: '',
  });

  const [accountFormData, setAccountFormData] = useState({
    name: '',
    broker: '',
  });

  const [transactionFormData, setTransactionFormData] = useState({
    account_id: '',
    symbol: '',
    name: '',
    type: 'BUY' as InvestmentTransactionType,
    trade_date: new Date().toISOString().split('T')[0],
    quantity: '',
    price: '',
    fees: '0',
    memo: '',
  });

  const [transactionFilters, setTransactionFilters] = useState({
    fromDate: '',
    toDate: '',
    accountId: '',
    type: '',
  });

  const fetchPortfolioData = async () => {
    try {
      setPortfolioLoading(true);
      const [holdingsData, accountsData] = await Promise.all([
        api.getHoldings(),
        api.getInvestmentAccounts(),
      ]);
      setHoldings(Array.isArray(holdingsData) ? holdingsData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
      alert('투자 계좌 또는 보유 자산을 불러오는 중 문제가 발생했습니다.');
    } finally {
      setPortfolioLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      const params: Record<string, any> = {};
      if (transactionFilters.accountId) {
        params.account_id = parseInt(transactionFilters.accountId, 10);
      }
      if (transactionFilters.type) {
        params.type = transactionFilters.type;
      }
      if (transactionFilters.fromDate) {
        params.start_date = transactionFilters.fromDate;
      }
      if (transactionFilters.toDate) {
        params.end_date = transactionFilters.toDate;
      }
      const data = await api.getInvestmentTransactions(params);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      alert('투자 거래 내역을 불러오는 중 문제가 발생했습니다.');
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [transactionFilters]);

  useEffect(() => {
    if (accounts.length > 0) {
      setTransactionFormData((prev) => ({
        ...prev,
        account_id: prev.account_id || accounts[0].id.toString(),
      }));

      if (
        transactionFilters.accountId &&
        !accounts.some((account) => account.id.toString() === transactionFilters.accountId)
      ) {
        setTransactionFilters((prev) => ({ ...prev, accountId: '' }));
      }
    } else {
      setTransactionFormData((prev) => ({ ...prev, account_id: '' }));
    }
  }, [accounts]);

  const handleOpenHoldingModal = (holding?: any) => {
    if (holding) {
      setEditingHolding(holding);
      setHoldingFormData({
        account_id: holding.account_id?.toString() ?? '',
        symbol: holding.symbol ?? '',
        name: holding.name ?? '',
        qty: holding.qty?.toString() ?? '',
        avg_price: holding.avg_price?.toString() ?? '',
        current_price: holding.current_price?.toString() ?? '',
      });
    } else {
      setEditingHolding(null);
      setHoldingFormData({
        account_id: accounts[0]?.id?.toString() ?? '',
        symbol: '',
        name: '',
        qty: '',
        avg_price: '',
        current_price: '',
      });
    }
    setShowHoldingModal(true);
  };

  const handleSubmitHolding = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        account_id: parseInt(holdingFormData.account_id, 10),
        symbol: holdingFormData.symbol,
        name: holdingFormData.name,
        qty: parseFloat(holdingFormData.qty),
        avg_price: parseFloat(holdingFormData.avg_price),
        current_price: parseFloat(holdingFormData.current_price),
      };

      if (editingHolding) {
        await api.updateHolding(editingHolding.id, payload);
      } else {
        await api.createHolding(payload);
      }

      await fetchPortfolioData();
      setShowHoldingModal(false);
    } catch (error) {
      console.error('Failed to save holding:', error);
      alert('보유 자산을 저장하는 중 문제가 발생했습니다.');
    }
  };

  const handleDeleteHolding = async (id: number) => {
    if (!confirm('정말 이 보유 자산을 삭제하시겠습니까?')) {
      return;
    }
    try {
      await api.deleteHolding(id);
      await fetchPortfolioData();
    } catch (error) {
      console.error('Failed to delete holding:', error);
      alert('보유 자산을 삭제하는 중 문제가 발생했습니다.');
    }
  };

  const handleOpenAccountModal = (account?: any) => {
    if (account) {
      setEditingAccount(account);
      setAccountFormData({
        name: account.name ?? '',
        broker: account.broker ?? '',
      });
    } else {
      setEditingAccount(null);
      setAccountFormData({
        name: '',
        broker: '',
      });
    }
    setShowAccountModal(true);
  };

  const handleSubmitAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingAccount) {
        await api.updateInvestmentAccount(editingAccount.id, accountFormData);
      } else {
        await api.createInvestmentAccount(accountFormData);
      }

      await fetchPortfolioData();
      setShowAccountModal(false);
    } catch (error) {
      console.error('Failed to save account:', error);
      alert('투자 계좌를 저장하는 중 문제가 발생했습니다.');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('정말 이 투자 계좌를 삭제하시겠습니까?')) {
      return;
    }
    try {
      await api.deleteInvestmentAccount(id);
      await fetchPortfolioData();
      await fetchTransactions();
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      if (error?.message?.includes('holdings')) {
        alert('보유 자산이 있는 계좌는 삭제할 수 없습니다. 먼저 해당 자산을 정리해주세요.');
      } else {
        alert('투자 계좌를 삭제하는 중 문제가 발생했습니다.');
      }
    }
  };

  const handleOpenTransactionModal = (transaction?: any) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setTransactionFormData({
        account_id: transaction.account_id?.toString() ?? '',
        symbol: transaction.symbol ?? '',
        name: transaction.name ?? '',
        type: transaction.type ?? 'BUY',
        trade_date: transaction.trade_date ?? new Date().toISOString().split('T')[0],
        quantity: transaction.quantity?.toString() ?? '',
        price: transaction.price?.toString() ?? '',
        fees: (transaction.fees ?? 0).toString(),
        memo: transaction.memo ?? '',
      });
    } else {
      setEditingTransaction(null);
      setTransactionFormData({
        account_id: accounts[0]?.id?.toString() ?? '',
        symbol: '',
        name: '',
        type: transactionFilters.type
          ? (transactionFilters.type as InvestmentTransactionType)
          : 'BUY',
        trade_date: new Date().toISOString().split('T')[0],
        quantity: '',
        price: '',
        fees: '0',
        memo: '',
      });
    }
    setShowTransactionModal(true);
  };

  const handleSubmitTransaction = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        account_id: parseInt(transactionFormData.account_id, 10),
        symbol: transactionFormData.symbol,
        name: transactionFormData.name || undefined,
        type: transactionFormData.type,
        trade_date: transactionFormData.trade_date,
        quantity: parseFloat(transactionFormData.quantity),
        price: parseFloat(transactionFormData.price),
        fees: parseFloat(transactionFormData.fees || '0'),
        memo: transactionFormData.memo || undefined,
      };

      if (!Number.isFinite(payload.account_id)) {
        alert('계좌를 선택해주세요.');
        return;
      }
      if (!payload.symbol) {
        alert('티커 심볼을 입력해주세요.');
        return;
      }
      if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
        alert('수량은 0보다 커야 합니다.');
        return;
      }
      if (!Number.isFinite(payload.price) || payload.price <= 0) {
        alert('거래 단가는 0보다 커야 합니다.');
        return;
      }
      if (!Number.isFinite(payload.fees) || payload.fees < 0) {
        alert('수수료는 0 이상이어야 합니다.');
        return;
      }

      if (editingTransaction) {
        await api.updateInvestmentTransaction(editingTransaction.id, payload);
      } else {
        await api.createInvestmentTransaction(payload);
      }

      await fetchTransactions();
      setShowTransactionModal(false);
    } catch (error) {
      console.error('Failed to save transaction:', error);
      alert('투자 거래를 저장하는 중 문제가 발생했습니다.');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('정말 이 거래를 삭제하시겠습니까?')) {
      return;
    }
    try {
      await api.deleteInvestmentTransaction(id);
      await fetchTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('투자 거래를 삭제하는 중 문제가 발생했습니다.');
    }
  };

  const handleTransactionFilterReset = () => {
    setTransactionFilters({
      fromDate: '',
      toDate: '',
      accountId: '',
      type: '',
    });
  };

  const totalValue = holdings.reduce(
    (sum, holding) => sum + (holding.current_price ?? 0) * (holding.qty ?? 0),
    0,
  );
  const totalCost = holdings.reduce(
    (sum, holding) => sum + (holding.avg_price ?? 0) * (holding.qty ?? 0),
    0,
  );
  const totalProfit = totalValue - totalCost;
  const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const assetAllocationData = holdings.map((holding) => ({
    name: holding.name ?? holding.symbol,
    value: (holding.current_price ?? 0) * (holding.qty ?? 0),
  }));

  const PIE_COLORS = ['#0EA5E9', '#0284C7', '#38BDF8', '#7DD3FC', '#1D4ED8', '#0369A1'];

  const getAccountName = (id: number) =>
    accounts.find((account) => account.id === id)?.name || 'N/A';

  const transactionSummary = useMemo(() => {
    let buyAmount = 0;
    let sellAmount = 0;
    let buyCount = 0;
    let sellCount = 0;

    transactions.forEach((transaction) => {
      const fees = transaction.fees ?? 0;
      const gross = (transaction.quantity ?? 0) * (transaction.price ?? 0);
      if (transaction.type === 'BUY') {
        buyAmount += gross + fees;
        buyCount += 1;
      } else if (transaction.type === 'SELL') {
        sellAmount += gross - fees;
        sellCount += 1;
      }
    });

    return {
      buyAmount,
      sellAmount,
      netCashFlow: sellAmount - buyAmount,
      buyCount,
      sellCount,
    };
  }, [transactions]);

  if (portfolioLoading) {
    return <div className="text-center text-gray-400 p-8">로딩중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <p className="text-gray-400">총 포트폴리오 가치</p>
          <p className="text-3xl font-bold text-sky-400">
            {formatCurrency(totalValue, currency, exchangeRate)}
          </p>
        </Card>
        <Card>
          <p className="text-gray-400">총 손익</p>
          <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(totalProfit, currency, exchangeRate)}
          </p>
        </Card>
        <Card>
          <p className="text-gray-400">총 수익률</p>
          <p className={`text-3xl font-bold ${profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {profitPercentage.toFixed(2)}%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="총 매수금액 (필터 적용)">
          <div className="text-2xl font-bold text-red-400">
            {formatCurrency(transactionSummary.buyAmount, currency, exchangeRate)}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {transactionSummary.buyCount}건 · 수수료 포함
          </p>
        </Card>
        <Card title="총 매도금액 (필터 적용)">
          <div className="text-2xl font-bold text-green-400">
            {formatCurrency(transactionSummary.sellAmount, currency, exchangeRate)}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {transactionSummary.sellCount}건 · 수수료 차감
          </p>
        </Card>
        <Card title="순현금 흐름">
          <div
            className={`text-2xl font-bold ${
              transactionSummary.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {transactionSummary.netCashFlow >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(transactionSummary.netCashFlow), currency, exchangeRate)}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            매도 금액 - 매수 금액 (필터 조건 적용)
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
                      보유 자산이 없습니다. &quot;자산 추가&quot;를 클릭하여 생성하세요.
                    </td>
                  </tr>
                ) : (
                  holdings.map((holding) => {
                    const marketValue = (holding.qty ?? 0) * (holding.current_price ?? 0);
                    const profit = (holding.current_price ?? 0 - (holding.avg_price ?? 0)) * (holding.qty ?? 0);
                    return (
                      <tr key={holding.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                        <td className="p-3 font-semibold">
                          {holding.name ?? holding.symbol} ({holding.symbol})
                        </td>
                        <td className="p-3">{getAccountName(holding.account_id)}</td>
                        <td className="p-3">{holding.qty}</td>
                        <td className="p-3">
                          {formatCurrency(holding.avg_price ?? 0, currency, exchangeRate)}
                        </td>
                        <td className="p-3">
                          {formatCurrency(holding.current_price ?? 0, currency, exchangeRate)}
                        </td>
                        <td className="p-3">
                          {formatCurrency(marketValue, currency, exchangeRate)}
                        </td>
                        <td
                          className={`p-3 font-semibold ${
                            profit >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(profit, currency, exchangeRate)}
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
          {assetAllocationData.length === 0 || totalValue === 0 ? (
            <p className="text-center text-gray-400 py-6">자산 배분을 표시할 데이터가 없습니다.</p>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={assetAllocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                >
                  {assetAllocationData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  formatter={(value) => formatCurrency(value as number, currency, exchangeRate)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="투자 거래 내역">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-400">시작일</label>
              <input
                type="date"
                value={transactionFilters.fromDate}
                onChange={(event) =>
                  setTransactionFilters((prev) => ({ ...prev, fromDate: event.target.value }))
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-400">종료일</label>
              <input
                type="date"
                value={transactionFilters.toDate}
                onChange={(event) =>
                  setTransactionFilters((prev) => ({ ...prev, toDate: event.target.value }))
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-400">계좌</label>
              <select
                value={transactionFilters.accountId}
                onChange={(event) =>
                  setTransactionFilters((prev) => ({ ...prev, accountId: event.target.value }))
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              >
                <option value="">전체</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-400">유형</label>
              <select
                value={transactionFilters.type}
                onChange={(event) =>
                  setTransactionFilters((prev) => ({ ...prev, type: event.target.value }))
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              >
                <option value="">전체</option>
                <option value="BUY">매수</option>
                <option value="SELL">매도</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleTransactionFilterReset}
                className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
              >
                필터 초기화
              </button>
            </div>
          </div>
          <button
            onClick={() => handleOpenTransactionModal()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
          >
            거래 추가
          </button>
        </div>

        {transactionsLoading ? (
          <div className="text-center text-gray-400 py-6">거래 내역을 불러오는 중입니다...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center text-gray-400 py-6">
            조건에 해당하는 거래가 없습니다. 거래를 추가하거나 필터를 조정해보세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-3">거래일</th>
                  <th className="p-3">유형</th>
                  <th className="p-3">계좌</th>
                  <th className="p-3">티커</th>
                  <th className="p-3">종목명</th>
                  <th className="p-3">수량</th>
                  <th className="p-3">단가</th>
                  <th className="p-3">수수료</th>
                  <th className="p-3">금액</th>
                  <th className="p-3">메모</th>
                  <th className="p-3">작업</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const amount = calculateTransactionAmount(transaction);
                  const amountClass =
                    amount >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold';

                  return (
                    <tr key={transaction.id} className="border-b border-gray-700 hover:bg-gray-600/20">
                      <td className="p-3">{formatDate(transaction.trade_date)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            transaction.type === 'BUY'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {transaction.type === 'BUY' ? '매수' : '매도'}
                        </span>
                      </td>
                      <td className="p-3">{getAccountName(transaction.account_id)}</td>
                      <td className="p-3 font-semibold">{transaction.symbol}</td>
                      <td className="p-3">{transaction.name || '-'}</td>
                      <td className="p-3">{transaction.quantity}</td>
                      <td className="p-3">
                        {formatCurrency(transaction.price ?? 0, currency, exchangeRate)}
                      </td>
                      <td className="p-3 text-gray-300">
                        {formatCurrency(transaction.fees ?? 0, currency, exchangeRate)}
                      </td>
                      <td className={`p-3 ${amountClass}`}>
                        {amount >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(amount), currency, exchangeRate)}
                      </td>
                      <td className="p-3 text-gray-300 whitespace-nowrap max-w-xs truncate">
                        {transaction.memo || '-'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenTransactionModal(transaction)}
                          className="text-sky-400 hover:text-sky-300 mr-2"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
                    투자 계좌가 없습니다. &quot;계좌 추가&quot;를 클릭하여 생성하세요.
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

      {showHoldingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingHolding ? '자산 수정' : '자산 추가'}</h2>
            <form onSubmit={handleSubmitHolding} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">계좌</label>
                <div className="relative">
                  <select
                    value={holdingFormData.account_id}
                    onChange={(event) =>
                      setHoldingFormData((prev) => ({ ...prev, account_id: event.target.value }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                    required
                  >
                    <option value="">계좌 선택</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.broker})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">티커 심볼</label>
                <input
                  type="text"
                  value={holdingFormData.symbol}
                  onChange={(event) =>
                    setHoldingFormData((prev) => ({ ...prev, symbol: event.target.value }))
                  }
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="예: AAPL"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">종목명</label>
                <input
                  type="text"
                  value={holdingFormData.name}
                  onChange={(event) =>
                    setHoldingFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="예: Apple Inc."
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">수량</label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={holdingFormData.qty}
                    onChange={(event) =>
                      setHoldingFormData((prev) => ({ ...prev, qty: event.target.value }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">평균 단가</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={holdingFormData.avg_price}
                    onChange={(event) =>
                      setHoldingFormData((prev) => ({ ...prev, avg_price: event.target.value }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">현재 가격</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={holdingFormData.current_price}
                    onChange={(event) =>
                      setHoldingFormData((prev) => ({ ...prev, current_price: event.target.value }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHoldingModal(false)}
                  className="px-4 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 rounded-lg text-white hover:bg-sky-700 transition"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingAccount ? '계좌 수정' : '계좌 추가'}</h2>
            <form onSubmit={handleSubmitAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">계좌명</label>
                <input
                  type="text"
                  value={accountFormData.name}
                  onChange={(event) =>
                    setAccountFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="예: 국내 주식"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">증권사</label>
                <input
                  type="text"
                  value={accountFormData.broker}
                  onChange={(event) =>
                    setAccountFormData((prev) => ({ ...prev, broker: event.target.value }))
                  }
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
                  placeholder="예: 키움증권"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 rounded-lg text-white hover:bg-sky-700 transition"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTransaction ? '거래 수정' : '거래 추가'}
            </h2>
            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">계좌</label>
                  <div className="relative">
                    <select
                      value={transactionFormData.account_id}
                      onChange={(event) =>
                        setTransactionFormData((prev) => ({
                          ...prev,
                          account_id: event.target.value,
                        }))
                      }
                      className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                      required
                    >
                      <option value="">계좌 선택</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.broker})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">거래일</label>
                  <input
                    type="date"
                    value={transactionFormData.trade_date}
                    onChange={(event) =>
                      setTransactionFormData((prev) => ({ ...prev, trade_date: event.target.value }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">거래 유형</label>
                  <select
                    value={transactionFormData.type}
                    onChange={(event) =>
                      setTransactionFormData((prev) => ({
                        ...prev,
                        type: event.target.value as InvestmentTransactionType,
                      }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    required
                  >
                    <option value="BUY">매수</option>
                    <option value="SELL">매도</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">티커 심볼</label>
                  <input
                    type="text"
                    value={transactionFormData.symbol}
                    onChange={(event) =>
                      setTransactionFormData((prev) => ({ ...prev, symbol: event.target.value }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    placeholder="예: TSLA"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">종목명 (선택)</label>
                <input
                  type="text"
                  value={transactionFormData.name}
                  onChange={(event) =>
                    setTransactionFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  placeholder="예: Tesla Inc."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">수량</label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={transactionFormData.quantity}
                    onChange={(event) =>
                      setTransactionFormData((prev) => ({ ...prev, quantity: event.target.value }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">거래 단가</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transactionFormData.price}
                    onChange={(event) =>
                      setTransactionFormData((prev) => ({ ...prev, price: event.target.value }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">수수료 (선택)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transactionFormData.fees}
                    onChange={(event) =>
                      setTransactionFormData((prev) => ({ ...prev, fees: event.target.value }))
                    }
                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">메모 (선택)</label>
                <textarea
                  value={transactionFormData.memo}
                  onChange={(event) =>
                    setTransactionFormData((prev) => ({ ...prev, memo: event.target.value }))
                  }
                  rows={3}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2.5 text-white hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  placeholder="거래에 대한 메모를 입력하세요."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 rounded-lg text-white hover:bg-emerald-700 transition"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;

