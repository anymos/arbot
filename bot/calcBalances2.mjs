'use strict';
import _ from 'lodash';
import diffToDays from './helper/diffToDays';
import calcRefExchanges from './helper/calcRefExchanges';

/**
 * Calculates and print balances in original, BTC, and USD units.
 * Stores them to state for use by other functions.
 */
export default async function calcBalances (st) {
  // delay
  await new Promise(resolve => setTimeout(resolve, 30000));

  let holdings = {};
  let totalBTC = 0;
  let totalUSD = 0;

  let refPrices = await calcRefExchanges(st);

  console.log('jobs in queue:', st.jobs.length);

  console.log('===============================================');
  console.log('                   BALANCES                    ');
  console.log('-----------------------------------------------');

  // collect non-zero balances across all accounts
  for (let exchangeKey in st.exchanges) {
    for (let coinKey in st.exchanges[exchangeKey].balances) {
      let balance = st.exchanges[exchangeKey].balances[coinKey].total;
      if (balance > 0) {
        holdings[coinKey] = { value: balance };
      }
    }
  }

  // convert all balances to BTC and USD if possible
  for (let coinKey in holdings) {
    // get conversion factor to BTC
    let conversionFactorToBTC = (coinKey === 'BTC') // ?
      ? 1 // BTC to BTC is 1
      : refPrices[coinKey + '/' + 'BTC'];

    // calculate BTC value of all coins
    if (conversionFactorToBTC) {
      let btcValue = _.floor(holdings[coinKey].value * conversionFactorToBTC, 8);
      holdings[coinKey].valueInBTC = btcValue;
      totalBTC += btcValue || 0;
    }

    // get conversion factor BTC to USD
    let conversionFactorToUSD = refPrices['BTC/USD'];
    // calculate USD value of all coins
    if (conversionFactorToUSD) {
      let usdValue = _.floor(holdings[coinKey].valueInBTC * conversionFactorToUSD, 8);
      holdings[coinKey].valueInUSD = usdValue;
      totalUSD += usdValue || 0;
    }

    console.log(
      holdings[coinKey].value.toFixed(8), coinKey, '(',
      holdings[coinKey].valueInBTC ? holdings[coinKey].valueInBTC.toFixed(8) : 'n/a', 'BTC,',
      holdings[coinKey].valueInUSD ? holdings[coinKey].valueInUSD.toFixed(2) : 'n/a', 'USD )'
    );

  }

  // record first balances
  // if first data isn't recorded yet, record it
  if (!(st.data.firstBTC && st.data.firstUSD)) { // if even one of initial records don't exist, record this pass as initial
    st.data.firstBTC = _.floor(totalBTC, 8);
    st.data.firstUSD = _.floor(totalUSD, 2);
    st.data.firstTime = new Date().getTime();
  }

  console.log('-----------------------------------------------');
  console.log('Total:', totalBTC.toFixed(8), 'BTC,', totalUSD.toFixed(2), 'USD');
  console.log('-----------------------------------------------');
  console.log(
    'BTC change:',
    st.data.firstBTC ? _.round((totalBTC / st.data.firstBTC - 1.0) * 100.0, 2).toFixed(2) + '%' : 'N/A',
    'USD change:',
    st.data.firstUSD ? _.round((totalUSD / st.data.firstUSD - 1.0) * 100.0, 2).toFixed(2) + '%' : 'N/A'
  );
  console.log('Run time:', st.data.firstTime ? diffToDays(new Date().getTime() - st.data.firstTime) : 'N/A');
  console.log('===============================================');

  calcBalances(st);
}